import { NextRequest, NextResponse } from "next/server";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { AuditLogModel } from "@/lib/models/AuditLog";

export const dynamic = "force-dynamic";

// GET: View tenant immutable audit logs (guarded by audit:view)
export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "audit:view");
  if (!guard.success) return guard.response;

  try {
    const orgId = guard.context.organizationId;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const logs = await AuditLogModel.find({
      organizationId: orgId, // Tenant scoped query
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      logs: logs.map((log: any) => ({
        id: log._id.toString(),
        actorEmail: log.actorEmail,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      })),
      organizationName: guard.context.organization.name,
    });
  } catch (error) {
    console.error("Fetch Audit Logs Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
