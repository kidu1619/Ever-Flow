import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { getCurrentSession, ACTIVE_ORG_COOKIE_NAME } from "@/lib/auth/session";
import { UserModel } from "@/lib/models/User";
import { OrganizationModel } from "@/lib/models/Organization";
import { OrganizationMembershipModel } from "@/lib/models/OrganizationMembership";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

// FR-05: Organization switching for multi-tenant users
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getCurrentSession();

    let userId = session?.userId || req.headers.get("x-user-id");
    if (!userId) {
      // Demo fallback to Olivia if unauthenticated
      const defaultUser = await UserModel.findOne({ email: "olivia@aureliaevents.com" });
      if (defaultUser) userId = defaultUser._id.toString();
    }

    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Login required" }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "User not found" }, { status: 401 });
    }

    const body = await req.json();
    const { organizationId } = body;

    // Platform Admin returning to Yenege Master Console
    if (user.isPlatformAdmin && organizationId === "platform-master-yenege") {
      const res = NextResponse.json({
        success: true,
        activeOrganization: {
          id: "platform-master-yenege",
          name: "Yenege Academy Platform Operations",
          slug: "yenege-academy",
          brandColor: "#D97706",
          role: "SaaS Super Admin",
          isPlatformRoot: true,
        },
      });

      res.cookies.set(ACTIVE_ORG_COOKIE_NAME, "platform-master-yenege", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Valid organization ID required" },
        { status: 400 }
      );
    }

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);

    // Verify organization exists and is active
    const organization = await OrganizationModel.findOne({
      _id: orgObjectId,
      deletedAt: null,
    });

    if (!organization) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Organization not found" },
        { status: 404 }
      );
    }

    // Verify user membership in this organization (FR-05) or Platform Admin oversight
    const membership = await OrganizationMembershipModel.findOne({
      organizationId: orgObjectId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!membership && !user.isPlatformAdmin) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You do not hold membership in this workspace." },
        { status: 403 }
      );
    }

    if (membership && membership.status === "suspended") {
      return NextResponse.json(
        { error: "MEMBERSHIP_SUSPENDED", message: "Your membership in this organization is suspended." },
        { status: 403 }
      );
    }

    const effectiveRole = membership ? membership.role : (user.isPlatformAdmin ? "SaaS Super Admin" : "Staff");

    // Audit the switch
    await logAuditEvent({
      organizationId: orgObjectId,
      actorUserId: user._id,
      actorEmail: user.email,
      action: user.isPlatformAdmin ? "platform.inspect_tenant" : "organization.switched",
      targetType: "Organization",
      targetId: organizationId,
      details: { targetOrgName: organization.name, roleInOrg: effectiveRole },
    });

    const res = NextResponse.json({
      success: true,
      activeOrganization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        brandColor: organization.brandColor,
        role: effectiveRole,
      },
    });

    res.cookies.set(ACTIVE_ORG_COOKIE_NAME, organizationId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("Switch Org Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to switch organization" }, { status: 500 });
  }
}
