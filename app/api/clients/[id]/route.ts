import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { ClientModel } from "@/lib/models/Client";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireTenantGuard(req, "client:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "INVALID_ID", message: "Invalid client ID" }, { status: 400 });
  }

  const client = await ClientModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    organizationId: context.organizationId,
    deletedAt: null,
  })
    .populate("linkedEventIds", "name category startDate venue status")
    .lean();

  if (!client) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    client: {
      id: client._id.toString(),
      name: client.name,
      type: client.type,
      primaryContact: client.primaryContact,
      email: client.email,
      phone: client.phone,
      address: client.address,
      preferences: client.preferences,
      requirements: client.requirements,
      linkedEvents: client.linkedEventIds || [],
      communications: client.communications || [],
      status: client.status,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireTenantGuard(req, "client:manage");
  if (!guard.success) return guard.response;
  const { context } = guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "INVALID_ID", message: "Invalid client ID" }, { status: 400 });
  }

  try {
    const body = await req.json();

    // Fast atomic path for logging meetings & communications (FR-31)
    if (body.newCommunication) {
      const { type, summary } = body.newCommunication;
      const newEntry = {
        id: Math.random().toString(36).substring(2, 9),
        date: new Date(),
        type: type || "meeting",
        summary: (summary || "").trim(),
        authorName: context.user.name,
      };

      const updated = await ClientModel.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          organizationId: context.organizationId,
          deletedAt: null,
        },
        { $push: { communications: newEntry } },
        { new: true }
      ).lean();

      if (!updated) {
        return NextResponse.json({ error: "NOT_FOUND", message: "Client not found" }, { status: 404 });
      }

      // Non-blocking audit log so client receives immediate response
      void logAuditEvent({
        organizationId: context.organizationId,
        actorUserId: context.user._id,
        actorEmail: context.user.email,
        action: "client.updated",
        targetType: "Client",
        targetId: id,
        details: { name: updated.name, action: "log_communication", summary: newEntry.summary },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({ success: true, client: updated, newEntry });
    }

    const client = await ClientModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: context.organizationId,
      deletedAt: null,
    });

    if (!client) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Client not found" }, { status: 404 });
    }

    if (body.name !== undefined) client.name = body.name.trim();
    if (body.type !== undefined) client.type = body.type;
    if (body.primaryContact !== undefined) client.primaryContact = body.primaryContact.trim();
    if (body.email !== undefined) client.email = body.email.trim().toLowerCase();
    if (body.phone !== undefined) client.phone = body.phone.trim();
    if (body.address !== undefined) client.address = body.address.trim();
    if (body.preferences !== undefined) client.preferences = body.preferences.trim();
    if (body.requirements !== undefined) client.requirements = body.requirements.trim();
    if (body.linkedEventIds !== undefined) client.linkedEventIds = body.linkedEventIds;
    if (body.status !== undefined) client.status = body.status;

    await client.save();

    void logAuditEvent({
      organizationId: context.organizationId,
      actorUserId: context.user._id,
      actorEmail: context.user.email,
      action: "client.updated",
      targetType: "Client",
      targetId: client._id.toString(),
      details: { name: client.name, fields: Object.keys(body) },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, client });
  } catch (error) {
    console.error("Update Client Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireTenantGuard(req, "client:manage");
  if (!guard.success) return guard.response;
  const { context } = guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "INVALID_ID", message: "Invalid client ID" }, { status: 400 });
  }

  const client = await ClientModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    organizationId: context.organizationId,
  });

  if (!client) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Client not found" }, { status: 404 });
  }

  client.deletedAt = new Date();
  await client.save();

  await logAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.user._id,
    actorEmail: context.user.email,
    action: "client.deleted",
    targetType: "Client",
    targetId: client._id.toString(),
    details: { name: client.name },
    ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
  });

  return NextResponse.json({ success: true, message: "Client deleted successfully" });
}
