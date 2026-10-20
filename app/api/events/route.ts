import { NextRequest, NextResponse } from "next/server";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import * as EventModule from "@/lib/models/Event";
import { TaskModel } from "@/lib/models/Task";
import { ClientModel } from "@/lib/models/Client";
import { MessageModel } from "@/lib/models/Message";
import { PREDEFINED_TEMPLATES } from "@/lib/templates/predefined";
import { logAuditEvent } from "@/lib/auth/audit";

import { VendorModel } from "@/lib/models/Vendor";
import { VendorBookingModel } from "@/lib/models/VendorBooking";

const EventModel = (EventModule as any).EventModel ?? (EventModule as any).default ?? (EventModule as any).Event;

export const dynamic = "force-dynamic";

// GET: Tenant-scoped events list with real task counts and filters (FR-10, FR-15)
export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "event:view");
  if (!guard.success) return guard.response;

  try {
    const orgId = guard.context.organizationId;
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Strictly tenant-scoped filter (FR-04, FR-05)
    const query: Record<string, unknown> = {
      organizationId: orgId,
      deletedAt: null,
    };

    // External Vendor Privacy & Isolation (Vendors only see events they are booked for)
    if (guard.context.role === "Vendor") {
      const user = guard.context.user;
      const userEmail = (user.email || "").toLowerCase().trim();
      const userName = (user.name || "").trim();

      const vendorDoc = await VendorModel.findOne({
        organizationId: orgId,
        deletedAt: null,
        $or: [
          { email: userEmail },
          { contactName: { $regex: userName, $options: "i" } },
        ],
      }).lean();

      if (vendorDoc) {
        const bookedEventIds = await VendorBookingModel.find({
          organizationId: orgId,
          vendorId: vendorDoc._id,
          deletedAt: null,
        }).distinct("eventId");
        query._id = { $in: bookedEventIds };
      } else {
        query._id = { $in: [] };
      }
    }

    // Client Privacy & Isolation (Client must ONLY see their own event status, never others)
    if (guard.context.role === "Client") {
      const user = guard.context.user;
      const userEmail = (user.email || "").toLowerCase().trim();
      const userName = (user.name || "").trim();

      // Find client entities matching this user's email or name
      const clientDocs = await ClientModel.find({
        organizationId: orgId,
        deletedAt: null,
        $or: [
          { email: userEmail },
          { primaryContact: { $regex: userName, $options: "i" } },
          { name: { $regex: userName.split(" ")[0], $options: "i" } },
        ],
      }).lean();

      const clientIds = clientDocs.map((c) => c._id);
      const linkedEventIds = clientDocs.flatMap((c) => c.linkedEventIds || []);

      // Find events where this client participated in messaging
      const messageEventIds = await MessageModel.find({
        organizationId: orgId,
        senderUserId: user._id,
      }).distinct("eventId");

      query.$or = [
        { clientId: { $in: clientIds } },
        { _id: { $in: [...linkedEventIds, ...messageEventIds] } },
        { ownerUserId: user._id },
        { clientName: { $regex: userName.split(" ")[0], $options: "i" } },
      ];
    }

    if (category && category !== "All") query.category = category;
    if (status && status !== "All") query.status = status;
    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    const events = await EventModel.find(query).sort({ startDate: 1 }).lean();

    // Fetch all tasks for this organization to calculate real completion statistics
    const allOrgTasks = await TaskModel.find({ organizationId: orgId }).lean();
    const allOrgClients = await ClientModel.find({ organizationId: orgId, deletedAt: null }).lean();

    // Map events with computed task stats and client metadata
    const eventsWithStats = events.map((ev: any) => {
      const eventTasks = allOrgTasks.filter(
        (t) => t.eventId.toString() === ev._id.toString()
      );
      const totalTasks = eventTasks.length;
      const completedTasks = eventTasks.filter((t) => t.status === "completed").length;
      const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (ev.readinessScore || 0);

      const matchedClient = allOrgClients.find(
        (c: any) =>
          (ev.clientId && c._id.toString() === ev.clientId.toString()) ||
          (c.linkedEventIds && c.linkedEventIds.some((lid: any) => lid.toString() === ev._id.toString()))
      );
      const clientName = matchedClient?.name || ev.clientName || "Victoria Sterling (Host / Client)";
      const clientEmail = matchedClient?.email || "client@aureliaevents.com";

      return {
        id: ev._id.toString(),
        name: ev.name,
        category: ev.category,
        description: ev.description,
        venue: ev.venue,
        startDate: ev.startDate,
        endDate: ev.endDate,
        status: ev.status,
        capacity: ev.capacity,
        budget: ev.budget,
        readinessScore: taskCompletionPercentage,
        templateSlug: ev.templateSlug,
        imageUrl: ev.imageUrl,
        organizationId: ev.organizationId.toString(),
        clientId: matchedClient?._id?.toString() || (ev.clientId ? ev.clientId.toString() : undefined),
        clientName,
        clientEmail,
        tasksCount: {
          total: totalTasks,
          completed: completedTasks,
          percentage: taskCompletionPercentage,
        },
      };
    });

    // Compute organization-wide summary
    const totalEvents = events.length;
    const activeEvents = events.filter((e: any) => ["Draft", "Planning", "Preparation", "Execution"].includes(e.status)).length;
    const completedEvents = events.filter((e: any) => e.status === "Completed").length;
    const totalTasksCount = allOrgTasks.length;
    const totalCompletedTasksCount = allOrgTasks.filter((t) => t.status === "completed").length;
    const overallTaskPercentage = totalTasksCount > 0 ? Math.round((totalCompletedTasksCount / totalTasksCount) * 100) : 0;

    return NextResponse.json({
      events: eventsWithStats,
      organizationName: guard.context.organization.name,
      summary: {
        totalEvents,
        activeEvents,
        completedEvents,
        totalTasksCount,
        totalCompletedTasksCount,
        overallTaskPercentage,
      },
    });
  } catch (error) {
    console.error("List Events Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST: Create event with optional template and auto-task generation (FR-10, FR-11)
export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req, "event:create");
  if (!guard.success) return guard.response;

  try {
    const orgId = guard.context.organizationId;
    const body = await req.json();
    const {
      name,
      category,
      venue,
      startDate,
      endDate,
      description,
      budget,
      capacity,
      imageUrl,
      templateSlug,
    } = body;

    if (!name || !venue || !startDate) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Event title, venue location, and start date are required." },
        { status: 400 }
      );
    }

    // 1. Plan Limit Enforcement (FR-101 / Section 9.2)
    const activeEventsCount = await EventModel.countDocuments({
      organizationId: orgId,
      status: { $in: ["Draft", "Planning", "Preparation", "Execution"] },
      deletedAt: null,
    });

    if (activeEventsCount >= guard.context.organization.limits.maxActiveEvents) {
      return NextResponse.json(
        {
          error: "PLAN_LIMIT_REACHED",
          message: `Active event limit of ${guard.context.organization.limits.maxActiveEvents} reached for your plan. Please upgrade to create more events.`,
        },
        { status: 403 }
      );
    }

    // 2. Insert Event with non-null organizationId
    const event = await EventModel.create({
      organizationId: orgId,
      name: name.trim(),
      category: category || "Gala",
      venue: venue.trim(),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      description: description?.trim() || "",
      budget: budget ? parseFloat(budget) : 25000,
      capacity: capacity ? parseInt(capacity, 10) : 200,
      status: "Planning",
      readinessScore: 0,
      templateSlug: templateSlug || "",
      imageUrl: imageUrl || "",
      ownerUserId: guard.context.user._id,
    });

    // 3. Predefined Template Tasks Generation (FR-11: Wedding, Conference, Graduation)
    let generatedTasksCount = 0;
    if (templateSlug) {
      const template = PREDEFINED_TEMPLATES.find((t) => t.slug === templateSlug.toLowerCase());
      if (template && template.tasks && template.tasks.length > 0) {
        const eventDateMs = new Date(startDate).getTime();
        const tasksToInsert = template.tasks.map((task) => {
          const taskDueDate = new Date(eventDateMs - task.daysBeforeEvent * 24 * 60 * 60 * 1000);
          return {
            organizationId: orgId,
            eventId: event._id,
            title: task.title,
            category: task.category,
            priority: task.priority,
            status: "todo",
            dueDate: taskDueDate,
            assignedToName: guard.context.user.name || "Event Team",
          };
        });

        await TaskModel.insertMany(tasksToInsert);
        generatedTasksCount = tasksToInsert.length;
      }
    }

    // 4. Immutable Audit Log
    await logAuditEvent({
      organizationId: orgId,
      actorUserId: guard.context.user._id,
      actorEmail: guard.context.user.email,
      action: "event.created",
      targetType: "Event",
      targetId: event._id.toString(),
      details: {
        name: event.name,
        category: event.category,
        venue: event.venue,
        templateApplied: templateSlug || "None",
        tasksGenerated: generatedTasksCount,
      },
    });

    return NextResponse.json({
      success: true,
      event: {
        id: event._id.toString(),
        name: event.name,
        category: event.category,
        venue: event.venue,
        startDate: event.startDate,
        status: event.status,
        templateSlug: event.templateSlug,
        tasksGenerated: generatedTasksCount,
      },
    });
  } catch (error) {
    console.error("Create Event Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
