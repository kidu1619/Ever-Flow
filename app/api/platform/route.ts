import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { getCurrentSession } from "@/lib/auth/session";
import { UserModel } from "@/lib/models/User";
import { OrganizationModel } from "@/lib/models/Organization";
import { OrganizationMembershipModel } from "@/lib/models/OrganizationMembership";
import { EventModel } from "@/lib/models/Event";
import { SupportAccessGrantModel } from "@/lib/models/SupportAccessGrant";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = await UserModel.findById(session.userId);
    if (
      !user ||
      (!user.isPlatformAdmin &&
        user.email !== "superadmin@everflow.io" &&
        user.email !== "superadmin@yenegeacademy.com")
    ) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Only SaaS Platform Administrators have access to SaaS operations console." },
        { status: 403 }
      );
    }

    const organizations = await OrganizationModel.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();

    const orgSummaries = await Promise.all(
      organizations.map(async (org) => {
        const [eventCount, memberCount, activeGrant] = await Promise.all([
          EventModel.countDocuments({ organizationId: org._id, deletedAt: null }),
          OrganizationMembershipModel.countDocuments({ organizationId: org._id }),
          SupportAccessGrantModel.findOne({
            organizationId: org._id,
            isActive: true,
            expiresAt: { $gt: new Date() },
          }).lean(),
        ]);

        const trialDaysLeft = Math.max(
          0,
          Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        );

        return {
          id: org._id.toString(),
          name: org.name,
          slug: org.slug,
          brandColor: org.brandColor,
          country: org.country,
          currency: org.currency,
          status: org.status,
          plan: org.plan,
          trialEndsAt: org.trialEndsAt,
          trialDaysLeft,
          limits: org.limits,
          usage: {
            activeEvents: eventCount,
            members: memberCount,
            storageMB: Math.round(eventCount * 45 + memberCount * 12),
          },
          supportAccessActive: Boolean(activeGrant),
          supportAccessExpiresAt: activeGrant?.expiresAt,
          createdAt: org.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      organizations: orgSummaries,
      platformMetrics: {
        totalTenants: orgSummaries.length,
        activeTenants: orgSummaries.filter((o) => o.status === "active" || o.status === "trialing").length,
        trialingTenants: orgSummaries.filter((o) => o.status === "trialing").length,
        suspendedTenants: orgSummaries.filter((o) => o.status === "suspended").length,
      },
    });
  } catch (error) {
    console.error("Platform Admin API Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to load platform data" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = await UserModel.findById(session.userId);
    if (
      !user ||
      (!user.isPlatformAdmin &&
        user.email !== "superadmin@everflow.io" &&
        user.email !== "superadmin@yenegeacademy.com")
    ) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const { organizationId, action, extendDays, newPlan, newStatus } = body;

    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json({ error: "INVALID_ID", message: "Valid organizationId required" }, { status: 400 });
    }

    const org = await OrganizationModel.findById(organizationId);
    if (!org) return NextResponse.json({ error: "NOT_FOUND", message: "Organization not found" }, { status: 404 });

    if (action === "suspend") {
      org.status = "suspended";
    } else if (action === "reactivate" || action === "activate_paid" || action === "grant_access") {
      org.status = "active";
      if (newPlan) {
        org.plan = newPlan;
      }
      // Configure plan limits upon paid activation
      if (org.plan === "Basic") {
        org.limits = { maxActiveEvents: 5, maxTeamMembers: 5, maxStorageMB: 1000 };
      } else if (org.plan === "Professional") {
        org.limits = { maxActiveEvents: 15, maxTeamMembers: 12, maxStorageMB: 3000 };
      } else if (org.plan === "Business") {
        org.limits = { maxActiveEvents: 50, maxTeamMembers: 30, maxStorageMB: 10000 };
      }
    } else if (action === "extend_trial") {
      const days = Number(extendDays) || 14;
      const currentExpiry = new Date(org.trialEndsAt).getTime() > Date.now() ? new Date(org.trialEndsAt) : new Date();
      org.trialEndsAt = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
      if (org.status === "expired" || org.status === "read_only") {
        org.status = "trialing";
      }
    } else if (action === "change_plan" && newPlan) {
      org.plan = newPlan;
      if (newPlan === "Basic") {
        org.limits = { maxActiveEvents: 5, maxTeamMembers: 5, maxStorageMB: 1000 };
      } else if (newPlan === "Professional") {
        org.limits = { maxActiveEvents: 15, maxTeamMembers: 12, maxStorageMB: 3000 };
      } else if (newPlan === "Business") {
        org.limits = { maxActiveEvents: 50, maxTeamMembers: 30, maxStorageMB: 10000 };
      }
    } else if (action === "set_status" && newStatus) {
      org.status = newStatus;
    }

    await org.save();

    await logAuditEvent({
      organizationId: org._id,
      actorUserId: user._id,
      actorEmail: user.email,
      action: `platform.tenant_${action || "updated"}`,
      targetType: "Organization",
      targetId: org._id.toString(),
      details: { organizationName: org.name, newStatus: org.status, trialEndsAt: org.trialEndsAt },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Tenant "${org.name}" successfully updated (${action})`,
      organization: {
        id: org._id.toString(),
        name: org.name,
        status: org.status,
        plan: org.plan,
        trialEndsAt: org.trialEndsAt,
      },
    });
  } catch (error) {
    console.error("Platform Admin Action Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to update tenant" }, { status: 500 });
  }
}
