import { NextRequest, NextResponse } from "next/server";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { SupportAccessGrantModel } from "@/lib/models/SupportAccessGrant";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "org:settings:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const grants = await SupportAccessGrantModel.find({
      organizationId: context.organizationId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const activeGrant = grants.find((g) => g.isActive && new Date(g.expiresAt).getTime() > Date.now());

    return NextResponse.json({
      success: true,
      activeGrant: activeGrant
        ? {
            id: activeGrant._id.toString(),
            grantedByEmail: activeGrant.grantedByEmail,
            supportAdminEmail: activeGrant.supportAdminEmail,
            reason: activeGrant.reason,
            expiresAt: activeGrant.expiresAt,
            isActive: activeGrant.isActive,
          }
        : null,
      history: grants.map((g) => ({
        id: g._id.toString(),
        grantedByEmail: g.grantedByEmail,
        supportAdminEmail: g.supportAdminEmail,
        reason: g.reason,
        expiresAt: g.expiresAt,
        isActive: g.isActive && new Date(g.expiresAt).getTime() > Date.now(),
        revokedAt: g.revokedAt,
        createdAt: g.createdAt,
      })),
    });
  } catch (error) {
    console.error("Fetch Support Grants Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to fetch grants" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req, "org:settings:edit");
  if (!guard.success) return guard.response;
  const { context } = guard;

  // Only Organization Owner can grant support access (BR-9)
  if (context.role !== "Owner") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Only the Organization Owner can grant support access to tenant business data." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { action, supportAdminEmail, reason, durationHours } = body;

    if (action === "revoke") {
      const grant = await SupportAccessGrantModel.findOne({
        organizationId: context.organizationId,
        isActive: true,
      });

      if (grant) {
        grant.isActive = false;
        grant.revokedAt = new Date();
        await grant.save();

        await logAuditEvent({
          organizationId: context.organizationId,
          actorUserId: context.user._id,
          actorEmail: context.user.email,
          action: "support_access.revoked",
          targetType: "SupportAccessGrant",
          targetId: grant._id.toString(),
          details: { supportAdminEmail: grant.supportAdminEmail },
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        });
      }

      return NextResponse.json({ success: true, message: "Support access revoked" });
    }

    // Default: Grant support access
    const hours = Number(durationHours) || 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Deactivate previous active grants
    await SupportAccessGrantModel.updateMany(
      { organizationId: context.organizationId, isActive: true },
      { $set: { isActive: false, revokedAt: new Date() } }
    );

    const grant = await SupportAccessGrantModel.create({
      organizationId: context.organizationId,
      grantedByUserId: context.user._id,
      grantedByEmail: context.user.email,
      supportAdminEmail: supportAdminEmail || "support@everflow.io",
      reason: reason || "Investigation of vendor calendar synchronization and budget calculations",
      expiresAt,
      isActive: true,
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorUserId: context.user._id,
      actorEmail: context.user.email,
      action: "support_access.granted",
      targetType: "SupportAccessGrant",
      targetId: grant._id.toString(),
      details: {
        supportAdminEmail: grant.supportAdminEmail,
        reason: grant.reason,
        expiresAt: grant.expiresAt,
        durationHours: hours,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Support access granted to ${grant.supportAdminEmail} until ${expiresAt.toLocaleString()}`,
      grant: {
        id: grant._id.toString(),
        supportAdminEmail: grant.supportAdminEmail,
        expiresAt: grant.expiresAt,
        isActive: grant.isActive,
      },
    });
  } catch (error) {
    console.error("Grant Support Access Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to manage support access" }, { status: 500 });
  }
}
