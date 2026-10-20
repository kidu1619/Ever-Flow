import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { EventModel } from "@/lib/models/Event";
import { TaskModel } from "@/lib/models/Task";
import { VendorBookingModel } from "@/lib/models/VendorBooking";
import { VendorModel } from "@/lib/models/Vendor";
import { ClientModel } from "@/lib/models/Client";
import { InvoiceModel } from "@/lib/models/Invoice";

export const dynamic = "force-dynamic";

export interface CalendarEntry {
  id: string;
  type: "event" | "task" | "vendor_booking" | "payment_due";
  title: string;
  date: string;
  endDate?: string;
  eventId?: string;
  eventName?: string;
  status?: string;
  assigneeOrVendor?: string;
  hasConflict?: boolean;
}

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "event:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const person = searchParams.get("person");

    const eventFilter: Record<string, unknown> = {
      organizationId: context.organizationId,
      deletedAt: null,
    };
    const scopedFilter: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      const eventObjectId = new mongoose.Types.ObjectId(eventId);
      eventFilter._id = eventObjectId;
      scopedFilter.eventId = eventObjectId;
    }

    let eventsQuery: any = { ...eventFilter };
    let tasksQuery: any = scopedFilter;
    let bookingsQuery: any = { ...scopedFilter, status: { $ne: "cancelled" } };
    let invoicesQuery: any = scopedFilter;

    // Role-based isolation for Vendor: Only events they service & their bookings; no internal tasks or invoices
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
        bookingsQuery.vendorId = myVendor._id;
        const bookedEventIds = await VendorBookingModel.find({
          organizationId: context.organizationId,
          vendorId: myVendor._id,
          deletedAt: null,
        }).distinct("eventId");
        eventsQuery._id = { $in: bookedEventIds };
      } else {
        bookingsQuery._id = { $in: [] };
        eventsQuery._id = { $in: [] };
      }
      tasksQuery = null;
      invoicesQuery = null;
    } else if (context.role === "Client") {
      // Role-based isolation for Client: Only their event & invoices; no internal tasks or other vendor bookings
      const user = context.user;
      const userEmail = (user?.email || "").toLowerCase().trim();
      const userName = (user?.name || "").trim();

      const clientDocs = await ClientModel.find({
        organizationId: context.organizationId,
        deletedAt: null,
        $or: [
          { email: userEmail },
          { primaryContact: { $regex: userName, $options: "i" } },
          { name: { $regex: userName.split(" ")[0], $options: "i" } },
        ],
      }).lean();

      const clientIds = clientDocs.map((c) => c._id);
      const linkedEventIds = clientDocs.flatMap((c) => c.linkedEventIds || []);

      eventsQuery.$or = [
        { clientId: { $in: clientIds } },
        { _id: { $in: linkedEventIds } },
        { ownerUserId: user._id },
        { clientName: { $regex: userName.split(" ")[0], $options: "i" } },
      ];
      tasksQuery = null;
      bookingsQuery = null;
      invoicesQuery = {
        ...scopedFilter,
        $or: [
          { clientEmail: userEmail },
          { clientId: { $in: clientIds } },
        ],
      };
    }

    const [events, tasks, bookings, invoices] = await Promise.all([
      EventModel.find(eventsQuery).sort({ startDate: 1 }).lean(),
      tasksQuery ? TaskModel.find(tasksQuery).lean() : Promise.resolve([]),
      bookingsQuery
        ? VendorBookingModel.find(bookingsQuery)
            .populate("vendorId", "name category")
            .populate("eventId", "name")
            .lean()
        : Promise.resolve([]),
      invoicesQuery ? InvoiceModel.find(invoicesQuery).populate("eventId", "name").lean() : Promise.resolve([]),
    ]);

    const entries: CalendarEntry[] = [];

    // 1. Events
    for (const ev of events) {
      if (ev.startDate) {
        entries.push({
          id: `ev-${ev._id.toString()}`,
          type: "event",
          title: ev.name,
          date: new Date(ev.startDate).toISOString(),
          endDate: ev.endDate ? new Date(ev.endDate).toISOString() : undefined,
          eventId: ev._id.toString(),
          eventName: ev.name,
          status: ev.status,
        });
      }
    }

    // 2. Task Deadlines
    for (const t of tasks) {
      if (t.dueDate) {
        if (person && t.assignedToName?.toLowerCase() !== person.toLowerCase()) {
          continue;
        }
        entries.push({
          id: `task-${t._id.toString()}`,
          type: "task",
          title: `Task Due: ${t.title}`,
          date: new Date(t.dueDate).toISOString(),
          eventId: t.eventId?.toString(),
          status: t.status,
          assigneeOrVendor: t.assignedToName,
          hasConflict: t.isBlocked,
        });
      }
    }

    // 3. Vendor Bookings & Vendor Payments
    for (const b of bookings) {
      const bEventId = (b.eventId as any)?._id
        ? (b.eventId as any)._id.toString()
        : b.eventId?.toString();
      const bEventName = (b.eventId as any)?.name || "";
      const vendorName = (b.vendorId as any)?.name || "Vendor";

      // 3a. Service execution booking
      if (b.startDate) {
        entries.push({
          id: `bk-${b._id.toString()}`,
          type: "vendor_booking",
          title: `Vendor Booking: ${vendorName} (${b.service})`,
          date: new Date(b.startDate).toISOString(),
          endDate: b.endDate ? new Date(b.endDate).toISOString() : undefined,
          eventId: bEventId,
          eventName: bEventName,
          status: b.status,
          assigneeOrVendor: vendorName,
          hasConflict: b.hasConflict,
        });
      }

      // 3b. Vendor contracted payment obligation (FR-42/FR-50)
      if (b.agreedAmount && b.agreedAmount > 0 && b.startDate) {
        entries.push({
          id: `bkpay-${b._id.toString()}`,
          type: "payment_due",
          title: `Vendor Payment Due: ${vendorName} (${b.service}) (${context.organization.currency || "USD"} ${b.agreedAmount.toLocaleString()})`,
          date: new Date(b.startDate).toISOString(),
          eventId: bEventId,
          eventName: bEventName,
          status: b.status === "confirmed" ? "Contracted" : "Tentative",
          assigneeOrVendor: vendorName,
        });
      }
    }

    // 4. Payment Milestones (Invoices)
    for (const inv of invoices) {
      if (inv.dueDate) {
        const invEventId = (inv.eventId as any)?._id
          ? (inv.eventId as any)._id.toString()
          : inv.eventId?.toString();
        const invEventName = (inv.eventId as any)?.name || inv.clientName || "";
        entries.push({
          id: `inv-${inv._id.toString()}`,
          type: "payment_due",
          title: `Client Payment Due: ${inv.title} (${context.organization.currency || "USD"} ${inv.totalAmount.toLocaleString()})`,
          date: new Date(inv.dueDate).toISOString(),
          eventId: invEventId,
          eventName: invEventName,
          status: inv.status,
          assigneeOrVendor: inv.clientName,
        });
      }
    }

    // Sort chronologically
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Staff schedule conflict detection (FR-43)
    const staffConflicts: { staffName: string; details: string; date: string }[] = [];
    const staffTaskMap: Record<string, { dateStr: string; taskTitle: string }[]> = {};

    for (const t of tasks) {
      if (t.dueDate && t.assignedToName && t.assignedToName !== "Unassigned") {
        const dStr = new Date(t.dueDate).toISOString().slice(0, 10);
        if (!staffTaskMap[t.assignedToName]) staffTaskMap[t.assignedToName] = [];
        staffTaskMap[t.assignedToName].push({ dateStr: dStr, taskTitle: t.title });
      }
    }

    for (const [staffName, tList] of Object.entries(staffTaskMap)) {
      const dates = tList.map((x) => x.dateStr);
      const unique = new Set(dates);
      if (unique.size < dates.length) {
        staffConflicts.push({
          staffName,
          details: `${staffName} has multiple concurrent deadlines assigned on the same day.`,
          date: dates[0],
        });
      }
    }

    return NextResponse.json({
      success: true,
      entries,
      staffConflicts,
    });
  } catch (error) {
    console.error("Calendar Aggregation Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to aggregate calendar" }, { status: 500 });
  }
}
