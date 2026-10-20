import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { AttendeeModel } from "@/lib/models/Attendee";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireTenantGuard(req, "attendee:manage");
  if (!guard.success) return guard.response;
  const { context } = guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "INVALID_ID", message: "Invalid attendee ID" }, { status: 400 });
  }

  const attendee = await AttendeeModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    organizationId: context.organizationId,
  });

  if (!attendee) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Attendee not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    if (body.rsvpStatus !== undefined) attendee.rsvpStatus = body.rsvpStatus;
    if (body.dietaryRequirements !== undefined) attendee.dietaryRequirements = body.dietaryRequirements.trim();
    if (body.tableOrGroup !== undefined) attendee.tableOrGroup = body.tableOrGroup.trim();
    if (body.vipStatus !== undefined) attendee.vipStatus = Boolean(body.vipStatus);
    if (body.notes !== undefined) attendee.notes = body.notes;

    await attendee.save();
    return NextResponse.json({ success: true, attendee });
  } catch (error) {
    console.error("Update Attendee Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to update attendee" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireTenantGuard(req, "attendee:manage");
  if (!guard.success) return guard.response;
  const { context } = guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "INVALID_ID", message: "Invalid attendee ID" }, { status: 400 });
  }

  await AttendeeModel.deleteOne({
    _id: new mongoose.Types.ObjectId(id),
    organizationId: context.organizationId,
  });

  return NextResponse.json({ success: true, message: "Attendee removed" });
}
