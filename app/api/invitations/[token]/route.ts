import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/connect";
import { InvitationModel } from "@/lib/models/Invitation";
import { OrganizationModel } from "@/lib/models/Organization";
import { UserModel } from "@/lib/models/User";
import { OrganizationMembershipModel } from "@/lib/models/OrganizationMembership";
import { getCurrentSession, createSessionCookieValue, SESSION_COOKIE_NAME, ACTIVE_ORG_COOKIE_NAME } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET: Inspect invitation details
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { token } = await params;

    const invitation = await InvitationModel.findOne({ token }).populate("organizationId", "name slug brandColor");
    if (!invitation) {
      return NextResponse.json({ error: "INVITATION_NOT_FOUND", message: "Invalid or expired link" }, { status: 404 });
    }

    const isExpired = new Date() > invitation.expiresAt || invitation.status !== "pending";

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        status: isExpired && invitation.status === "pending" ? "expired" : invitation.status,
        expiresAt: invitation.expiresAt,
        organization: invitation.organizationId,
      },
    });
  } catch (error) {
    console.error("Inspect Invitation Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST: Accept invitation
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { token } = await params;
    const body = await req.json().catch(() => ({}));
    const { password, name } = body;

    const invitation = await InvitationModel.findOne({ token }).populate("organizationId");
    if (!invitation || invitation.status !== "pending") {
      return NextResponse.json(
        { error: "INVALID_INVITATION", message: "This invitation is no longer active." },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = "expired";
      await invitation.save();
      return NextResponse.json(
        { error: "INVITATION_EXPIRED", message: "This invitation link has expired." },
        { status: 400 }
      );
    }

    // Check if user already exists
    let user = await UserModel.findOne({ email: invitation.email });

    if (!user) {
      // Create user if new
      if (!password) {
        return NextResponse.json(
          { error: "PASSWORD_REQUIRED", message: "A password is required for new accounts." },
          { status: 400 }
        );
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      user = await UserModel.create({
        email: invitation.email,
        passwordHash,
        name: name || invitation.email.split("@")[0],
        emailVerified: true,
        status: "active",
      });
    }

    // Check if membership already exists
    let membership = await OrganizationMembershipModel.findOne({
      organizationId: invitation.organizationId._id,
      userId: user._id,
    });

    if (!membership) {
      membership = await OrganizationMembershipModel.create({
        organizationId: invitation.organizationId._id,
        userId: user._id,
        role: invitation.role,
        status: "active",
        joinedAt: new Date(),
      });
    } else {
      membership.role = invitation.role;
      membership.status = "active";
      await membership.save();
    }

    invitation.status = "accepted";
    await invitation.save();

    await logAuditEvent({
      organizationId: invitation.organizationId._id,
      actorUserId: user._id,
      actorEmail: user.email,
      action: "invitation.accepted",
      targetType: "OrganizationMembership",
      targetId: membership._id.toString(),
      details: { email: user.email, assignedRole: invitation.role },
    });

    const sessionPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      activeOrgId: invitation.organizationId._id.toString(),
    };

    const cookieVal = createSessionCookieValue(sessionPayload);
    const res = NextResponse.json({
      success: true,
      message: "Successfully joined workspace!",
      organization: invitation.organizationId,
    });

    res.cookies.set(SESSION_COOKIE_NAME, cookieVal, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set(ACTIVE_ORG_COOKIE_NAME, invitation.organizationId._id.toString(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("Accept Invitation Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
