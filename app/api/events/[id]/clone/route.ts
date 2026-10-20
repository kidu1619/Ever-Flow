import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { EventModel } from "@/lib/models/Event";
import { TaskModel } from "@/lib/models/Task";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Clone / duplicate event and its task checklist (FR-12)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const guard = await requireTenantGuard(req, "event:create");
  if (!guard.success) return guard.response;

  try {
    const { id } = await params;
    const orgId = guard.context.organizationId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    }

    const sourceEvent = await EventModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: orgId, // Tenant scoped
      deletedAt: null,
    });

    if (!sourceEvent) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Source event not found." }, { status: 404 });
    }

    // Check plan limits
    const activeEventsCount = await EventModel.countDocuments({
      organizationId: orgId,
      status: { $in: ["Draft", "Planning", "Preparation", "Execution"] },
      deletedAt: null,
    });

    if (activeEventsCount >= guard.context.organization.limits.maxActiveEvents) {
      return NextResponse.json(
        {
          error: "PLAN_LIMIT_REACHED",
          message: `Active event limit of ${guard.context.organization.limits.maxActiveEvents} reached. Please upgrade to clone more events.`,
        },
        { status: 403 }
      );
    }

    // Create cloned event in Draft status
    const clonedEvent = await EventModel.create({
      organizationId: orgId,
      name: `${sourceEvent.name} (Copy)`,
      category: sourceEvent.category,
      venue: sourceEvent.venue,
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days from today
      endDate: sourceEvent.endDate
        ? new Date(Date.now() + 31 * 24 * 60 * 60 * 1000)
        : undefined,
      description: sourceEvent.description,
      budget: sourceEvent.budget,
      capacity: sourceEvent.capacity,
      status: "Draft",
      readinessScore: 0,
      templateSlug: sourceEvent.templateSlug,
      imageUrl: sourceEvent.imageUrl,
      ownerUserId: guard.context.user._id,
    });

    // Copy tasks from source event
    const sourceTasks = await TaskModel.find({
      eventId: sourceEvent._id,
      organizationId: orgId,
    }).lean();

    let clonedTasksCount = 0;
    if (sourceTasks.length > 0) {
      const newTasks = sourceTasks.map((t: any) => ({
        organizationId: orgId,
        eventId: clonedEvent._id,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: "todo",
        dueDate: t.dueDate,
        assignedToName: t.assignedToName,
      }));

      await TaskModel.insertMany(newTasks);
      clonedTasksCount = newTasks.length;
    }

    await logAuditEvent({
      organizationId: orgId,
      actorUserId: guard.context.user._id,
      actorEmail: guard.context.user.email,
      action: "event.cloned",
      targetType: "Event",
      targetId: clonedEvent._id.toString(),
      details: {
        sourceEventId: sourceEvent._id.toString(),
        sourceEventName: sourceEvent.name,
        clonedEventName: clonedEvent.name,
        clonedTasksCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Event duplicated successfully as "${clonedEvent.name}".`,
      event: {
        id: clonedEvent._id.toString(),
        name: clonedEvent.name,
        status: clonedEvent.status,
        tasksCount: clonedTasksCount,
      },
    });
  } catch (error) {
    console.error("Clone Event Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
