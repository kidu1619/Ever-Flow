import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { getCurrentSession, ACTIVE_ORG_COOKIE_NAME, createSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { UserModel } from "@/lib/models/User";
import { OrganizationMembershipModel } from "@/lib/models/OrganizationMembership";
import { OrganizationModel, IOrganization } from "@/lib/models/Organization";
import { ROLE_PERMISSIONS, Role } from "@/lib/auth/permissions";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    let session = await getCurrentSession();

    // If no session cookie, check test header; if neither, return unauthenticated
    let userId = session?.userId || req.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const user = await UserModel.findById(userId).select("-passwordHash");
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    // Get all user memberships with populated organization info
    const memberships = await OrganizationMembershipModel.find({
      userId: user._id,
      status: "active",
    }).populate("organizationId");

    const validMemberships = memberships.filter(
      (m) => m.organizationId && !(m.organizationId as unknown as IOrganization).deletedAt
    );

    const cookieStore = await cookies();
    let activeOrgId =
      cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value ||
      session?.activeOrgId;

    const isPlatformAdmin = Boolean(user.isPlatformAdmin);

    let activeOrganization: any = null;
    let currentRole: Role | null = null;
    let permissions: string[] = [];
    let organizationsList: any[] = [];

    if (isPlatformAdmin) {
      currentRole = "SaaS Super Admin";
      permissions = [
        "platform:manage",
        "audit:view",
        "org:settings:view",
        "org:settings:edit",
        "member:view",
        "event:view",
      ];

      // Fetch all tenant organizations in the system for Yenege to supervise
      const allOrgs = await OrganizationModel.find({ deletedAt: null }).lean();
      organizationsList = allOrgs.map((org) => ({
        id: org._id.toString(),
        name: org.name,
        slug: org.slug,
        brandColor: org.brandColor,
        status: org.status,
        plan: org.plan,
        role: "SaaS Super Admin" as Role,
        membershipStatus: "active",
      }));

      // Check if Yenege explicitly selected a specific tenant organization to inspect
      let inspectedOrg = null;
      if (activeOrgId && activeOrgId !== "platform-master-yenege" && mongoose.Types.ObjectId.isValid(activeOrgId)) {
        inspectedOrg = allOrgs.find((o) => o._id.toString() === activeOrgId);
      }

      if (inspectedOrg) {
        activeOrganization = {
          id: inspectedOrg._id.toString(),
          name: inspectedOrg.name,
          slug: inspectedOrg.slug,
          brandColor: inspectedOrg.brandColor,
          currency: inspectedOrg.currency,
          timeZone: inspectedOrg.timeZone,
          status: inspectedOrg.status,
          plan: inspectedOrg.plan,
          trialEndsAt: inspectedOrg.trialEndsAt,
          limits: inspectedOrg.limits,
          isInspecting: true,
        };
      } else {
        // Master Console representation
        activeOrganization = {
          id: "platform-master-yenege",
          name: "Yenege Academy Platform Operations",
          slug: "yenege-academy",
          brandColor: "#D97706",
          currency: "USD",
          timeZone: "UTC",
          status: "active",
          plan: "SaaS Platform Owner",
          isPlatformRoot: true,
          isInspecting: false,
        };
      }
    } else {
      // Normal tenant user (Olivia, Marcus, Sophia, Claire, Vendor, Client)
      if (!activeOrgId || !validMemberships.some((m) => (m.organizationId as any)._id.toString() === activeOrgId)) {
        const ownerMembership = validMemberships.find((m) => m.role === "Owner");
        if (ownerMembership) {
          activeOrgId = (ownerMembership.organizationId as any)._id.toString();
        } else if (validMemberships.length > 0) {
          activeOrgId = (validMemberships[0].organizationId as any)._id.toString();
        }
      }

      const currentMembership = validMemberships.find(
        (m) => (m.organizationId as any)._id.toString() === activeOrgId
      );

      activeOrganization = currentMembership ? (currentMembership.organizationId as unknown as IOrganization) : null;
      currentRole = currentMembership ? currentMembership.role : null;
      permissions = currentRole ? [...(ROLE_PERMISSIONS[currentRole as Role] || [])] : [];

      organizationsList = validMemberships.map((m) => {
        const org = m.organizationId as unknown as IOrganization;
        return {
          id: org._id.toString(),
          name: org.name,
          slug: org.slug,
          brandColor: org.brandColor,
          status: org.status,
          plan: org.plan,
          role: m.role,
          membershipStatus: m.status,
        };
      });
    }

    const res = NextResponse.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        status: user.status,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      activeOrganization: activeOrganization
        ? {
            id: activeOrganization.id || activeOrganization._id,
            name: activeOrganization.name,
            slug: activeOrganization.slug,
            brandColor: activeOrganization.brandColor,
            currency: activeOrganization.currency,
            timeZone: activeOrganization.timeZone,
            status: activeOrganization.status,
            plan: activeOrganization.plan,
            trialEndsAt: activeOrganization.trialEndsAt,
            limits: activeOrganization.limits,
            isInspecting: Boolean(activeOrganization.isInspecting),
            isPlatformRoot: Boolean(activeOrganization.isPlatformRoot),
          }
        : null,
      currentRole,
      permissions,
      organizations: organizationsList,
    });

    if (!session && activeOrgId) {
      const cookieVal = createSessionCookieValue({
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        activeOrgId,
      });
      res.cookies.set(SESSION_COOKIE_NAME, cookieVal, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
      res.cookies.set(ACTIVE_ORG_COOKIE_NAME, activeOrgId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
    }

    return res;
  } catch (error) {
    console.error("Auth Me Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to fetch user state." }, { status: 500 });
  }
}
