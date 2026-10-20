import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { OrganizationMembershipModel } from "@/lib/models/OrganizationMembership";
import { InvitationModel } from "@/lib/models/Invitation";
import { UserModel } from "@/lib/models/User";
import { Role } from "@/lib/auth/permissions";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

// GET: List all members and pending invitations for current organization (guarded by member:view)
export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "member:view");
  if (!guard.success) return guard.response;

  try {
    const orgId = guard.context.organizationId;

    // Fetch members with user details
    const memberships = await OrganizationMembershipModel.find({
      organizationId: orgId,
    })
      .populate("userId", "name email avatar status")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch pending invitations
    const invitations = await InvitationModel.find({
      organizationId: orgId,
      status: "pending",
    })
      .populate("invitedByUserId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const members = memberships.map((m: any) => ({
      membershipId: m._id.toString(),
      userId: m.userId?._id?.toString() || m.userId,
      name: m.userId?.name || "Former Member",
      email: m.userId?.email || "Unknown",
      avatar: m.userId?.avatar || "",
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      isOwner: m.role === "Owner",
    }));

    return NextResponse.json({
      members,
      invitations: invitations.map((inv: any) => ({
        id: inv._id.toString(),
        email: inv.email,
        role: inv.role,
        status: inv.status,
        token: inv.token,
        expiresAt: inv.expiresAt,
        invitedBy: inv.invitedByUserId?.name || "Team Member",
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${inv.token}`,
      })),
      limits: {
        current: members.filter((m) => m.status === "active").length,
        max: guard.context.organization.limits.maxTeamMembers,
      },
    });
  } catch (error) {
    console.error("List Members Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST: FR-03 Invite a team member by email with an assigned role
export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req, "member:invite");
  if (!guard.success) return guard.response;

  try {
    const orgId = guard.context.organizationId;
    const body = await req.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Email and role are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Enforce Plan Limits (FR-101 / Section 9.2)
    const currentMemberCount = await OrganizationMembershipModel.countDocuments({
      organizationId: orgId,
      status: "active",
    });

    if (currentMemberCount >= guard.context.organization.limits.maxTeamMembers) {
      return NextResponse.json(
        {
          error: "PLAN_LIMIT_REACHED",
          message: `Your current plan limit of ${guard.context.organization.limits.maxTeamMembers} team members has been reached. Please upgrade to invite more members.`,
        },
        { status: 403 }
      );
    }

    // 2. Check if user already has active membership in this org
    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      const existingMembership = await OrganizationMembershipModel.findOne({
        organizationId: orgId,
        userId: existingUser._id,
      });

      if (existingMembership) {
        return NextResponse.json(
          {
            error: "ALREADY_MEMBER",
            message: `User ${normalizedEmail} is already a member with role '${existingMembership.role}'.`,
          },
          { status: 409 }
        );
      }
    }

    // 3. Generate expiring invitation token (7 days)
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await InvitationModel.create({
      organizationId: orgId,
      email: normalizedEmail,
      role: role as Role,
      token,
      status: "pending",
      expiresAt,
      invitedByUserId: guard.context.user._id,
    });

    // 4. Log immutable audit trail
    await logAuditEvent({
      organizationId: orgId,
      actorUserId: guard.context.user._id,
      actorEmail: guard.context.user.email,
      action: "member.invited",
      targetType: "Invitation",
      targetId: invitation._id.toString(),
      details: { email: normalizedEmail, role, expiresAt },
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;

    return NextResponse.json({
      success: true,
      message: `Invitation generated for ${normalizedEmail}`,
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        token,
        inviteUrl,
      },
    });
  } catch (error) {
    console.error("Invite Member Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// PATCH: FR-06 Update role or suspend/reactivate member
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { membershipId, newRole, status } = body;

  const requiredPermission = status !== undefined ? "member:suspend" : "member:update_role";
  const guard = await requireTenantGuard(req, requiredPermission);
  if (!guard.success) return guard.response;

  try {
    const orgId = guard.context.organizationId;
    const membership = await OrganizationMembershipModel.findOne({
      _id: new mongoose.Types.ObjectId(membershipId),
      organizationId: orgId, // Tenant scoped!
    }).populate("userId");

    if (!membership) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Membership not found in this organization." }, { status: 404 });
    }

    // BR-3: Cannot demote or suspend the Owner
    if (membership.role === "Owner") {
      return NextResponse.json(
        { error: "OWNER_IMMUTABLE", message: "Cannot modify or suspend the Organization Owner." },
        { status: 400 }
      );
    }

    const previousRole = membership.role;
    const previousStatus = membership.status;

    if (newRole) membership.role = newRole as Role;
    if (status) membership.status = status;

    await membership.save();

    await logAuditEvent({
      organizationId: orgId,
      actorUserId: guard.context.user._id,
      actorEmail: guard.context.user.email,
      action: status ? `member.${status}` : "member.role_updated",
      targetType: "OrganizationMembership",
      targetId: membership._id.toString(),
      details: {
        targetUserEmail: (membership.userId as any)?.email,
        fromRole: previousRole,
        toRole: membership.role,
        fromStatus: previousStatus,
        toStatus: membership.status,
      },
    });

    return NextResponse.json({
      success: true,
      membership: {
        id: membership._id,
        role: membership.role,
        status: membership.status,
      },
    });
  } catch (error) {
    console.error("Update Member Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE: FR-06 Remove member (immediate loss of access) or revoke invitation
export async function DELETE(req: NextRequest) {
  const guard = await requireTenantGuard(req, "member:remove");
  if (!guard.success) return guard.response;

  try {
    const { searchParams } = new URL(req.url);
    const membershipId = searchParams.get("membershipId");
    const invitationId = searchParams.get("invitationId");
    const orgId = guard.context.organizationId;

    if (invitationId) {
      const inv = await InvitationModel.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(invitationId),
        organizationId: orgId,
      });

      if (!inv) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

      await logAuditEvent({
        organizationId: orgId,
        actorUserId: guard.context.user._id,
        actorEmail: guard.context.user.email,
        action: "invitation.revoked",
        targetType: "Invitation",
        targetId: invitationId,
        details: { email: inv.email },
      });

      return NextResponse.json({ success: true, message: "Invitation revoked" });
    }

    if (membershipId) {
      const membership = await OrganizationMembershipModel.findOne({
        _id: new mongoose.Types.ObjectId(membershipId),
        organizationId: orgId,
      }).populate("userId");

      if (!membership) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

      // BR-3: The organization must have at least one active Owner
      if (membership.role === "Owner") {
        return NextResponse.json(
          { error: "OWNER_REMOVAL_FORBIDDEN", message: "The Workspace Owner cannot be removed." },
          { status: 400 }
        );
      }

      await OrganizationMembershipModel.deleteOne({ _id: membership._id });

      // FR-06: Member loses access immediately!
      await logAuditEvent({
        organizationId: orgId,
        actorUserId: guard.context.user._id,
        actorEmail: guard.context.user.email,
        action: "member.removed",
        targetType: "OrganizationMembership",
        targetId: membershipId,
        details: { targetEmail: (membership.userId as any)?.email, role: membership.role },
      });

      return NextResponse.json({ success: true, message: "Member removed from organization." });
    }

    return NextResponse.json({ error: "MISSING_IDENTIFIER" }, { status: 400 });
  } catch (error) {
    console.error("Remove Member Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
