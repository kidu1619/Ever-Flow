import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { VendorModel } from "@/lib/models/Vendor";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireTenantGuard(req, "vendor:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "INVALID_ID", message: "Invalid vendor ID" }, { status: 400 });
  }

  const vendor = await VendorModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    organizationId: context.organizationId,
    deletedAt: null,
  }).lean();

  if (!vendor) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Vendor not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    vendor: {
      id: vendor._id.toString(),
      name: vendor.name,
      category: vendor.category,
      contactName: vendor.contactName,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      website: vendor.website,
      description: vendor.description,
      isVerified: vendor.isVerified,
      rating: vendor.rating,
      reviews: vendor.reviews || [],
      packages: vendor.packages || [],
      status: vendor.status,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireTenantGuard(req, "vendor:manage");
  if (!guard.success) return guard.response;
  const { context } = guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "INVALID_ID", message: "Invalid vendor ID" }, { status: 400 });
  }

  const vendor = await VendorModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    organizationId: context.organizationId,
    deletedAt: null,
  });

  if (!vendor) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Vendor not found" }, { status: 404 });
  }

  try {
    const body = await req.json();

    // Support adding feedback/rating (FR-23)
    if (body.newReview) {
      const { rating, feedback, eventId, eventName } = body.newReview;
      vendor.reviews.push({
        id: Math.random().toString(36).substring(2, 9),
        eventId: eventId ? new mongoose.Types.ObjectId(eventId) : undefined,
        eventName: eventName || "General Engagement",
        rating: Number(rating) || 5,
        feedback: feedback || "",
        authorName: context.user.name,
        createdAt: new Date(),
      });

      // Recalculate average rating
      const sum = vendor.reviews.reduce((acc, r) => acc + r.rating, 0);
      vendor.rating = Math.round((sum / vendor.reviews.length) * 10) / 10;
    }

    if (body.name !== undefined) vendor.name = body.name.trim();
    if (body.category !== undefined) vendor.category = body.category.trim();
    if (body.contactName !== undefined) vendor.contactName = body.contactName.trim();
    if (body.email !== undefined) vendor.email = body.email.trim().toLowerCase();
    if (body.phone !== undefined) vendor.phone = body.phone.trim();
    if (body.address !== undefined) vendor.address = body.address.trim();
    if (body.description !== undefined) vendor.description = body.description.trim();
    if (body.isVerified !== undefined) vendor.isVerified = Boolean(body.isVerified);
    if (body.status !== undefined) vendor.status = body.status;
    if (body.packages !== undefined) vendor.packages = body.packages;

    await vendor.save();

    await logAuditEvent({
      organizationId: context.organizationId,
      actorUserId: context.user._id,
      actorEmail: context.user.email,
      action: "vendor.updated",
      targetType: "Vendor",
      targetId: vendor._id.toString(),
      details: { name: vendor.name, updatedFields: Object.keys(body) },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, vendor });
  } catch (error) {
    console.error("Update Vendor Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to update vendor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireTenantGuard(req, "vendor:manage");
  if (!guard.success) return guard.response;
  const { context } = guard;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "INVALID_ID", message: "Invalid vendor ID" }, { status: 400 });
  }

  const vendor = await VendorModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    organizationId: context.organizationId,
  });

  if (!vendor) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Vendor not found" }, { status: 404 });
  }

  vendor.deletedAt = new Date();
  await vendor.save();

  await logAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.user._id,
    actorEmail: context.user.email,
    action: "vendor.deleted",
    targetType: "Vendor",
    targetId: vendor._id.toString(),
    details: { name: vendor.name },
    ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
  });

  return NextResponse.json({ success: true, message: "Vendor archived successfully" });
}
