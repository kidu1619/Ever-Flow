import { NextRequest, NextResponse } from "next/server";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { ClientModel } from "@/lib/models/Client";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "client:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const filter: Record<string, unknown> = {
      organizationId: context.organizationId,
      deletedAt: null,
    };

    if (type && type !== "All") {
      filter.type = type;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { primaryContact: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const clients = await ClientModel.find(filter)
      .populate("linkedEventIds", "name category startDate venue status")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      clients: clients.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        type: c.type,
        primaryContact: c.primaryContact,
        email: c.email,
        phone: c.phone,
        address: c.address,
        preferences: c.preferences,
        requirements: c.requirements,
        linkedEvents: c.linkedEventIds || [],
        communicationsCount: c.communications?.length || 0,
        communications: c.communications || [],
        status: c.status,
      })),
    });
  } catch (error) {
    console.error("Fetch Clients Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req, "client:manage");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const body = await req.json();
    const { name, type, primaryContact, email, phone, address, preferences, requirements, linkedEventIds } = body;

    if (!name || !primaryContact || !email) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Client name, primary contact person, and email are required." },
        { status: 400 }
      );
    }

    const client = await ClientModel.create({
      organizationId: context.organizationId,
      name: name.trim(),
      type: type || "Individual",
      primaryContact: primaryContact.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || "",
      address: address?.trim() || "",
      preferences: preferences?.trim() || "",
      requirements: requirements?.trim() || "",
      linkedEventIds: Array.isArray(linkedEventIds) ? linkedEventIds : [],
      communications: [],
      status: "active",
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorUserId: context.user._id,
      actorEmail: context.user.email,
      action: "client.created",
      targetType: "Client",
      targetId: client._id.toString(),
      details: { name: client.name, type: client.type },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      client: {
        id: client._id.toString(),
        name: client.name,
        type: client.type,
        primaryContact: client.primaryContact,
        email: client.email,
      },
    });
  } catch (error) {
    console.error("Create Client Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to create client" }, { status: 500 });
  }
}
