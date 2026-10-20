import { NextRequest, NextResponse } from "next/server";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { OrganizationModel } from "@/lib/models/Organization";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

// GET: View active organization details (protected by org:settings:view)
export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "org:settings:view");
  if (!guard.success) return guard.response;

  const org = guard.context.organization;
  return NextResponse.json({
    organization: {
      id: org._id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      brandColor: org.brandColor,
      currency: org.currency,
      timeZone: org.timeZone,
      status: org.status,
      plan: org.plan,
      trialEndsAt: org.trialEndsAt,
      limits: org.limits,
    },
    userRole: guard.context.role,
  });
}

// PATCH: Update organization settings and branding (protected by org:settings:edit)
export async function PATCH(req: NextRequest) {
  const guard = await requireTenantGuard(req, "org:settings:edit");
  if (!guard.success) return guard.response;

  try {
    const body = await req.json();
    const { name, brandColor, currency, timeZone, logoUrl } = body;

    const org = await OrganizationModel.findById(guard.context.organizationId);
    if (!org) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (name) org.name = name.trim();
    if (brandColor) org.brandColor = brandColor;
    if (currency) org.currency = currency;
    if (timeZone) org.timeZone = timeZone;
    if (logoUrl !== undefined) org.logoUrl = logoUrl;

    await org.save();

    await logAuditEvent({
      organizationId: org._id,
      actorUserId: guard.context.user._id,
      actorEmail: guard.context.user.email,
      action: "organization.settings_updated",
      targetType: "Organization",
      targetId: org._id.toString(),
      details: { name: org.name, brandColor: org.brandColor, currency: org.currency },
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: org._id,
        name: org.name,
        slug: org.slug,
        brandColor: org.brandColor,
        currency: org.currency,
        timeZone: org.timeZone,
        status: org.status,
      },
    });
  } catch (error) {
    console.error("Update Org Settings Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
