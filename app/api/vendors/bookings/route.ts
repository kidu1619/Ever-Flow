import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { VendorBookingModel } from "@/lib/models/VendorBooking";
import { VendorModel } from "@/lib/models/Vendor";
import { EventModel } from "@/lib/models/Event";
import { NotificationModel } from "@/lib/models/Notification";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "vendor:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const vendorId = searchParams.get("vendorId");

    const filter: Record<string, unknown> = {
      organizationId: context.organizationId,
      deletedAt: null,
    };

    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      filter.eventId = new mongoose.Types.ObjectId(eventId);
    }
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    // Role-based privacy: Vendor role can ONLY view their own bookings and contracted deliverables
    if (context.role === "Vendor") {
      const user = context.user;
      const userEmail = (user?.email || "").toLowerCase().trim();
      const userName = (user?.name || "").trim();
      const domain = userEmail.includes("@") ? userEmail.split("@")[1] : "";
      const baseName = userName.replace(/\s*\(.*?\)\s*/g, "").trim();

      const myVendor = await VendorModel.findOne({
        organizationId: context.organizationId,
        deletedAt: null,
        $or: [
          { email: userEmail },
          ...(domain ? [{ email: { $regex: `@${domain}$`, $options: "i" } }] : []),
          ...(baseName ? [{ contactName: { $regex: baseName, $options: "i" } }] : []),
        ],
      }).select("_id");

      if (myVendor) {
        filter.vendorId = myVendor._id;
      } else {
        return NextResponse.json({ success: true, bookings: [] });
      }
    }

    const bookings = await VendorBookingModel.find(filter)
      .populate("vendorId", "name category contactName phone email isVerified")
      .populate("eventId", "name startDate venue status")
      .sort({ startDate: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      bookings: bookings.map((b) => ({
        id: b._id.toString(),
        vendor: b.vendorId,
        event: b.eventId,
        service: b.service,
        startDate: b.startDate,
        endDate: b.endDate,
        agreedAmount: b.agreedAmount,
        status: b.status,
        hasConflict: b.hasConflict,
        conflictDetails: b.conflictDetails,
        conflictOverrideReason: b.conflictOverrideReason,
        conflictOverriddenBy: b.conflictOverriddenBy,
        notes: b.notes,
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    console.error("Fetch Vendor Bookings Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req, "vendor:manage");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const body = await req.json();
    const { vendorId, eventId, service, startDate, endDate, agreedAmount, status, overrideReason } = body;

    if (!vendorId || !eventId || !service || !startDate || !endDate || agreedAmount === undefined) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Vendor, event, service, dates, and agreed amount are required." },
        { status: 400 }
      );
    }

    const vObjectId = new mongoose.Types.ObjectId(vendorId);
    const eObjectId = new mongoose.Types.ObjectId(eventId);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return NextResponse.json({ error: "INVALID_DATES", message: "End time must be after start time." }, { status: 400 });
    }

    // Verify vendor and event exist in this tenant
    const [vendor, event] = await Promise.all([
      VendorModel.findOne({ _id: vObjectId, organizationId: context.organizationId }),
      EventModel.findOne({ _id: eObjectId, organizationId: context.organizationId }),
    ]);

    if (!vendor) return NextResponse.json({ error: "VENDOR_NOT_FOUND", message: "Vendor not found." }, { status: 404 });
    if (!event) return NextResponse.json({ error: "EVENT_NOT_FOUND", message: "Event not found." }, { status: 404 });

    // Double-Booking Detection Rule (FR-22 & BR-7)
    // Overlapping condition: booking.startDate < end AND booking.endDate > start
    const conflictingBookings = await VendorBookingModel.find({
      organizationId: context.organizationId,
      vendorId: vObjectId,
      status: { $in: ["tentative", "confirmed"] },
      deletedAt: null,
      startDate: { $lt: end },
      endDate: { $gt: start },
    }).populate("eventId", "name startDate venue");

    let hasConflict = false;
    let conflictDetails = "";

    if (conflictingBookings.length > 0) {
      hasConflict = true;
      const conflictNames = conflictingBookings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((cb) => `${(cb.eventId as any)?.name || "Another Event"} (${new Date(cb.startDate).toLocaleDateString()})`)
        .join(", ");
      conflictDetails = `Schedule overlap with existing booking: ${conflictNames}`;

      // If user hasn't supplied an explicit override reason, require one (FR-22)
      if (!overrideReason || !overrideReason.trim()) {
        return NextResponse.json(
          {
            conflict: true,
            message: `Double-booking conflict detected! ${vendor.name} is already booked for: ${conflictDetails}. An auditable reason is required to override.`,
            conflictingBookings: conflictingBookings.map((cb) => ({
              id: cb._id.toString(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              eventName: (cb.eventId as any)?.name,
              startDate: cb.startDate,
              endDate: cb.endDate,
              service: cb.service,
            })),
          },
          { status: 409 }
        );
      }
    }

    const booking = await VendorBookingModel.create({
      organizationId: context.organizationId,
      vendorId: vObjectId,
      eventId: eObjectId,
      service: service.trim(),
      startDate: start,
      endDate: end,
      agreedAmount: Number(agreedAmount),
      status: status || "tentative",
      hasConflict,
      conflictDetails: hasConflict ? conflictDetails : "",
      conflictOverrideReason: hasConflict ? overrideReason.trim() : "",
      conflictOverriddenBy: hasConflict ? context.user.name : "",
    });

    // Audited override logging (BR-7)
    if (hasConflict) {
      await logAuditEvent({
        organizationId: context.organizationId,
        actorUserId: context.user._id,
        actorEmail: context.user.email,
        action: "vendor.booking_conflict_override",
        targetType: "VendorBooking",
        targetId: booking._id.toString(),
        details: {
          vendorName: vendor.name,
          eventName: event.name,
          overrideReason: overrideReason.trim(),
          conflictDetails,
        },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      // Send in-app notification to event manager
      await NotificationModel.create({
        organizationId: context.organizationId,
        userId: event.ownerUserId,
        title: "Vendor Double-Booking Override",
        message: `${context.user.name} confirmed ${vendor.name} for "${event.name}" despite scheduling conflict. Reason: "${overrideReason}"`,
        type: "conflict",
        actionUrl: `/?tab=vendors`,
      });
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking._id.toString(),
        vendorName: vendor.name,
        eventName: event.name,
        service: booking.service,
        agreedAmount: booking.agreedAmount,
        hasConflict: booking.hasConflict,
        conflictOverrideReason: booking.conflictOverrideReason,
      },
    });
  } catch (error) {
    console.error("Create Vendor Booking Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to create booking" }, { status: 500 });
  }
}
