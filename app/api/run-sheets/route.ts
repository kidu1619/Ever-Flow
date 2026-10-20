import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { EventModel } from "@/lib/models/Event";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "event:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json({ error: "VALIDATION_FAILED", message: "Valid eventId required" }, { status: 400 });
    }

    const event = await EventModel.findOne({
      _id: new mongoose.Types.ObjectId(eventId),
      organizationId: context.organizationId,
      deletedAt: null,
    }).lean();

    if (!event) return NextResponse.json({ error: "NOT_FOUND", message: "Event not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      eventName: event.name,
      venue: event.venue,
      startDate: event.startDate,
      runSheet: event.runSheet || [],
    });
  } catch (error) {
    console.error("Fetch Run Sheet Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to fetch run sheet" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req, "event:edit");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const body = await req.json();
    const { eventId, time, activity, location, responsible, vendor, notes } = body;

    if (!eventId || !time || !activity) {
      return NextResponse.json({ error: "VALIDATION_FAILED", message: "Event, time, and activity required" }, { status: 400 });
    }

    const event = await EventModel.findOne({
      _id: new mongoose.Types.ObjectId(eventId),
      organizationId: context.organizationId,
      deletedAt: null,
    });

    if (!event) return NextResponse.json({ error: "NOT_FOUND", message: "Event not found" }, { status: 404 });

    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      time: time.trim(),
      activity: activity.trim(),
      location: location?.trim() || "",
      responsible: responsible?.trim() || "",
      vendor: vendor?.trim() || "",
      notes: notes?.trim() || "",
    };

    if (!event.runSheet) event.runSheet = [];
    event.runSheet.push(newItem);
    await event.save();

    return NextResponse.json({ success: true, item: newItem, runSheet: event.runSheet });
  } catch (error) {
    console.error("Add Run Sheet Item Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to add run sheet item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireTenantGuard(req, "event:edit");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const itemId = searchParams.get("itemId");

    if (!eventId || !itemId) {
      return NextResponse.json({ error: "VALIDATION_FAILED", message: "EventId and itemId required" }, { status: 400 });
    }

    const event = await EventModel.findOne({
      _id: new mongoose.Types.ObjectId(eventId),
      organizationId: context.organizationId,
      deletedAt: null,
    });

    if (!event || !event.runSheet) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Event or run sheet not found" }, { status: 404 });
    }

    event.runSheet = event.runSheet.filter((i) => i.id !== itemId);
    await event.save();

    return NextResponse.json({ success: true, runSheet: event.runSheet });
  } catch (error) {
    console.error("Delete Run Sheet Item Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to delete item" }, { status: 500 });
  }
}
