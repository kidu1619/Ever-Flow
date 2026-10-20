import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { TaskModel } from "@/lib/models/Task";
import { EventModel } from "@/lib/models/Event";
import { ClientModel } from "@/lib/models/Client";
import { MessageModel } from "@/lib/models/Message";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

// GET: List tasks for the organization or a specific event (FR-11, Tasks)
export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "event:view");
  if (!guard.success) return guard.response;

  try {
    const orgId = guard.context.organizationId;
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");

    const query: Record<string, unknown> = {
      organizationId: orgId, // Strictly tenant isolated!
    };

    // External Vendor Privacy (Vendors are external service providers and do not access internal company crew tasks)
    if (guard.context.role === "Vendor") {
      return NextResponse.json({
        success: true,
        tasks: [],
        message: "Vendor access restricted from internal operations tasks.",
      });
    }

    // Client Privacy & Isolation (Client must ONLY see tasks for their own events)
    if (guard.context.role === "Client") {
      const user = guard.context.user;
      const userEmail = (user.email || "").toLowerCase().trim();
      const userName = (user.name || "").trim();

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
      const messageEventIds = await MessageModel.find({
        organizationId: orgId,
        senderUserId: user._id,
      }).distinct("eventId");

      // Find events matching client
      const clientEvents = await EventModel.find({
        organizationId: orgId,
        deletedAt: null,
        $or: [
          { clientId: { $in: clientIds } },
          { _id: { $in: [...linkedEventIds, ...messageEventIds] } },
          { ownerUserId: user._id },
          { clientName: { $regex: userName.split(" ")[0], $options: "i" } },
        ],
      }).distinct("_id");

      query.eventId = { $in: clientEvents };
    }

    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      query.eventId = new mongoose.Types.ObjectId(eventId);
    }

    if (status && status !== "All") {
      query.status = status;
    }

    const tasks = await TaskModel.find(query)
      .populate("eventId", "name category venue startDate status")
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.status === "completed").length;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return NextResponse.json({
      success: true,
      tasks: tasks.map((t: any) => {
        const ev = t.eventId && typeof t.eventId === "object" ? t.eventId : null;
        return {
          id: t._id.toString(),
          eventId: ev ? ev._id.toString() : t.eventId ? t.eventId.toString() : "",
          eventName: ev?.name || "Unassigned Event",
          eventCategory: ev?.category || "Event",
          eventVenue: ev?.venue || "",
          eventStatus: ev?.status || "",
          title: t.title,
          description: t.description,
          category: t.category,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          assignedToName: t.assignedToName,
          isBlocked: t.isBlocked,
          blockedReason: t.blockedReason,
          completedAt: t.completedAt,
          createdAt: t.createdAt,
        };
      }),
      statistics: {
        total,
        completed,
        pending: total - completed,
        completionPercentage,
      },
    });
  } catch (error) {
    console.error("List Tasks Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST: Create a task for an event (guarded by task:manage)
export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req, "task:manage");
  if (!guard.success) return guard.response;

  try {
    const orgId = guard.context.organizationId;
    const body = await req.json();
    const { eventId, title, description, category, priority, dueDate, assignedToName } = body;

    if (!eventId || !title || !title.trim()) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Event ID and task title are required." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid event ID provided." },
        { status: 400 }
      );
    }

    // Verify event exists and belongs to the caller's organization (FR-04)
    const event = await EventModel.findOne({
      _id: new mongoose.Types.ObjectId(eventId),
      organizationId: orgId,
      deletedAt: null,
    });

    if (!event) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Event not found in this organization." },
        { status: 404 }
      );
    }

    const task = await TaskModel.create({
      organizationId: orgId,
      eventId: event._id,
      title: title.trim(),
      description: description?.trim() || "",
      category: category || "General",
      priority: priority || "medium",
      status: "todo",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignedToName: (assignedToName && assignedToName.trim()) ? assignedToName.trim() : "Unassigned",
    });

    // Update event readiness score based on task completion
    const allEventTasks = await TaskModel.find({ eventId: event._id });
    const completedCount = allEventTasks.filter((t) => t.status === "completed").length;
    const readiness = allEventTasks.length > 0 ? Math.round((completedCount / allEventTasks.length) * 100) : 50;
    event.readinessScore = readiness;
    await event.save();

    await logAuditEvent({
      organizationId: orgId,
      actorUserId: guard.context.user._id,
      actorEmail: guard.context.user.email,
      action: "task.created",
      targetType: "Task",
      targetId: task._id.toString(),
      details: { title: task.title, eventName: event.name },
    });

    return NextResponse.json({
      success: true,
      task: {
        id: task._id.toString(),
        eventId: task.eventId.toString(),
        title: task.title,
        description: task.description,
        category: task.category,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assignedToName: task.assignedToName,
      },
    });
  } catch (error) {
    console.error("Create Task Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
