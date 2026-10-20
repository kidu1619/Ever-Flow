import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { AttendeeModel } from "@/lib/models/Attendee";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "event:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const rsvpStatus = searchParams.get("rsvpStatus");
    const search = searchParams.get("search");

    const filter: Record<string, unknown> = {
      organizationId: context.organizationId,
      deletedAt: null,
    };

    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      filter.eventId = new mongoose.Types.ObjectId(eventId);
    }
    if (rsvpStatus && rsvpStatus !== "All") {
      filter.rsvpStatus = rsvpStatus;
    }
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { tableOrGroup: { $regex: search, $options: "i" } },
      ];
    }

    const attendees = await AttendeeModel.find(filter)
      .populate("eventId", "name category venue startDate")
      .sort({ fullName: 1 })
      .lean();

    const counts = {
      total: attendees.length,
      attending: attendees.filter((a) => a.rsvpStatus === "attending").length,
      declined: attendees.filter((a) => a.rsvpStatus === "declined").length,
      tentative: attendees.filter((a) => a.rsvpStatus === "tentative").length,
      invited: attendees.filter((a) => a.rsvpStatus === "invited").length,
    };

    return NextResponse.json({
      success: true,
      attendees: attendees.map((a) => ({
        id: a._id.toString(),
        event: a.eventId,
        fullName: a.fullName,
        email: a.email,
        phone: a.phone,
        rsvpStatus: a.rsvpStatus,
        dietaryRequirements: a.dietaryRequirements,
        tableOrGroup: a.tableOrGroup,
        vipStatus: a.vipStatus,
        notes: a.notes,
      })),
      counts,
    });
  } catch (error) {
    console.error("Fetch Attendees Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to fetch attendees" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req, "attendee:manage");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const body = await req.json();
    const { eventId, fullName, email, phone, rsvpStatus, dietaryRequirements, tableOrGroup, vipStatus, notes } = body;

    if (!eventId || !fullName || !email) {
      return NextResponse.json({ error: "VALIDATION_FAILED", message: "Event, name, and email required" }, { status: 400 });
    }

    const attendee = await AttendeeModel.create({
      organizationId: context.organizationId,
      eventId: new mongoose.Types.ObjectId(eventId),
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || "",
      rsvpStatus: rsvpStatus || "invited",
      dietaryRequirements: dietaryRequirements?.trim() || "None",
      tableOrGroup: tableOrGroup?.trim() || "General Seating",
      vipStatus: Boolean(vipStatus),
      notes: notes || "",
    });

    return NextResponse.json({ success: true, attendee });
  } catch (error) {
    console.error("Create Attendee Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to create attendee" }, { status: 500 });
  }
}
