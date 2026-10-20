import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { EventModel } from "@/lib/models/Event";
import { TaskModel } from "@/lib/models/Task";
import { isValidStatusTransition, getAvailableNextStatuses, EventStatus } from "@/lib/events/lifecycle";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Single event details with its tasks and valid state transitions (FR-10, FR-13, FR-14)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const guard = await requireTenantGuard(req, "event:view");
  if (!guard.success) return guard.response;

  try {
    const { id } = await params;
    const orgId = guard.context.organizationId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "INVALID_ID", message: "Invalid event ID format." }, { status: 400 });
    }

    const event = await EventModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: orgId, // Strictly tenant isolated
      deletedAt: null,
    }).lean();

    if (!event) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Event not found." }, { status: 404 });
    }

    // Fetch all tasks for this event
    const tasks = await TaskModel.find({
      eventId: event._id,
      organizationId: orgId,
    })
      .sort({ dueDate: 1, createdAt: 1 })
      .lean();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
    const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const availableNextStatuses = getAvailableNextStatuses(event.status as EventStatus);

    return NextResponse.json({
      success: true,
      event: {
        id: event._id.toString(),
        name: event.name,
        category: event.category,
        description: event.description,
        venue: event.venue,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status,
        capacity: event.capacity,
        budget: event.budget,
        readinessScore: taskCompletionPercentage,
        templateSlug: event.templateSlug,
        imageUrl: event.imageUrl,
        cancellationReason: event.cancellationReason,
        clientId: (event as any).clientId?.toString(),
        clientName: (event as any).clientName,
        readinessChecklist: (event as any).readinessChecklist || [],
        runSheet: (event as any).runSheet || [],
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
      tasks: tasks.map((t: any) => ({
        id: t._id.toString(),
        eventId: t.eventId.toString(),
        title: t.title,
        description: t.description,
        category: t.category,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        assignedToName: t.assignedToName,
        completedAt: t.completedAt,
      })),
      statistics: {
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        taskCompletionPercentage,
      },
      lifecycle: {
        currentStatus: event.status,
        availableNextStatuses,
      },
    });
  } catch (error) {
    console.error("Get Event Details Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// PATCH: Update event or transition status (FR-10, FR-13)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const guard = await requireTenantGuard(req, "event:edit");
  if (!guard.success) return guard.response;

  try {
    const { id } = await params;
    const orgId = guard.context.organizationId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    }

    const event = await EventModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: orgId, // Tenant isolated
      deletedAt: null,
    });

    if (!event) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Event not found." }, { status: 404 });
    }

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
      status: targetStatus,
      cancellationReason,
    } = body;

    // Handle Status Transition with State Machine validation (FR-13)
    if (targetStatus && targetStatus !== event.status) {
      const transitionCheck = isValidStatusTransition(event.status as EventStatus, targetStatus as EventStatus);
      if (!transitionCheck.valid) {
        return NextResponse.json(
          {
            error: "INVALID_STATUS_TRANSITION",
            message: transitionCheck.reason,
            currentStatus: event.status,
            attemptedStatus: targetStatus,
            allowedNextStatuses: getAvailableNextStatuses(event.status as EventStatus),
          },
          { status: 400 }
        );
      }

      const previousStatus = event.status;
      event.status = targetStatus;

      if (targetStatus === "Cancelled" && cancellationReason) {
        event.cancellationReason = cancellationReason;
      }

      await logAuditEvent({
        organizationId: orgId,
        actorUserId: guard.context.user._id,
        actorEmail: guard.context.user.email,
        action: "event.status_transition",
        targetType: "Event",
        targetId: event._id.toString(),
        details: {
          eventName: event.name,
          fromStatus: previousStatus,
          toStatus: targetStatus,
          reason: cancellationReason || "Normal lifecycle transition",
        },
      });
    }

    // Update standard fields
    let fieldsUpdated = false;
    const updatedFields: string[] = [];

    if (name !== undefined && name.trim() !== event.name) {
      event.name = name.trim();
      fieldsUpdated = true;
      updatedFields.push("name");
    }
    if (category !== undefined && category !== event.category) {
      event.category = category;
      fieldsUpdated = true;
      updatedFields.push("category");
    }
    if (venue !== undefined && venue.trim() !== event.venue) {
      event.venue = venue.trim();
      fieldsUpdated = true;
      updatedFields.push("venue");
    }
    if (startDate !== undefined) {
      const newStart = new Date(startDate);
      if (newStart.getTime() !== new Date(event.startDate).getTime()) {
        event.startDate = newStart;
        fieldsUpdated = true;
        updatedFields.push("startDate");
      }
    }
    if (endDate !== undefined) {
      const newEnd = endDate ? new Date(endDate) : undefined;
      event.endDate = newEnd;
      fieldsUpdated = true;
      updatedFields.push("endDate");
    }
    if (description !== undefined && description !== event.description) {
      event.description = description;
      fieldsUpdated = true;
      updatedFields.push("description");
    }
    if (budget !== undefined) {
      const parsedBudget = parseFloat(budget);
      if (!isNaN(parsedBudget) && parsedBudget !== event.budget) {
        event.budget = parsedBudget;
        fieldsUpdated = true;
        updatedFields.push("budget");
      }
    }
    if (capacity !== undefined) {
      const parsedCap = parseInt(capacity, 10);
      if (!isNaN(parsedCap) && parsedCap !== event.capacity) {
        event.capacity = parsedCap;
        fieldsUpdated = true;
        updatedFields.push("capacity");
      }
    }
    if (imageUrl !== undefined) event.imageUrl = imageUrl;
    if (cancellationReason !== undefined) event.cancellationReason = cancellationReason;

    await event.save();

    if (fieldsUpdated) {
      await logAuditEvent({
        organizationId: orgId,
        actorUserId: guard.context.user._id,
        actorEmail: guard.context.user.email,
        action: "event.update",
        targetType: "Event",
        targetId: event._id.toString(),
        details: {
          eventName: event.name,
          updatedFields,
        },
      });
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event._id.toString(),
        name: event.name,
        category: event.category,
        venue: event.venue,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status,
        budget: event.budget,
        capacity: event.capacity,
        description: event.description,
        cancellationReason: event.cancellationReason,
      },
    });
  } catch (error) {
    console.error("Update Event Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE: Soft delete / archive event (FR-10: Prefer archiving/cancellation over hard delete)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const guard = await requireTenantGuard(req, "event:delete");
  if (!guard.success) return guard.response;

  try {
    const { id } = await params;
    const orgId = guard.context.organizationId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    }

    const event = await EventModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: orgId,
      deletedAt: null,
    });

    if (!event) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Event not found." }, { status: 404 });
    }

    // Soft delete / archive
    event.deletedAt = new Date();
    event.status = "Cancelled";
    await event.save();

    await logAuditEvent({
      organizationId: orgId,
      actorUserId: guard.context.user._id,
      actorEmail: guard.context.user.email,
      action: "event.archived",
      targetType: "Event",
      targetId: id,
      details: { name: event.name },
    });

    return NextResponse.json({
      success: true,
      message: "Event has been safely archived/cancelled.",
    });
  } catch (error) {
    console.error("Delete/Archive Event Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
