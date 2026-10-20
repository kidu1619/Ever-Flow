import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { TaskModel } from "@/lib/models/Task";
import { EventModel } from "@/lib/models/Event";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: Update task status or properties (guarded by task:manage)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const guard = await requireTenantGuard(req, "task:manage");
  if (!guard.success) return guard.response;

  try {
    const { id } = await params;
    const orgId = guard.context.organizationId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "INVALID_ID", message: "Invalid task ID." }, { status: 400 });
    }

    const task = await TaskModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: orgId, // Tenant scoped
    });

    if (!task) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Task not found." }, { status: 404 });
    }

    const body = await req.json();
    const { status, title, description, category, priority, dueDate, assignedToName } = body;

    const previousStatus = task.status;
    if (status !== undefined) {
      task.status = status;
      if (status === "completed") {
        task.completedAt = new Date();
      } else {
        task.completedAt = null;
      }
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (category !== undefined) task.category = category;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (assignedToName !== undefined) task.assignedToName = assignedToName;

    await task.save();

    // Recalculate event readiness score based on actual DB records
    const event = await EventModel.findOne({ _id: task.eventId, organizationId: orgId });
    if (event) {
      const allTasks = await TaskModel.find({ eventId: event._id });
      const completedCount = allTasks.filter((t) => t.status === "completed").length;
      const readiness = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 50;
      event.readinessScore = readiness;
      await event.save();
    }

    if (status !== undefined && status !== previousStatus) {
      await logAuditEvent({
        organizationId: orgId,
        actorUserId: guard.context.user._id,
        actorEmail: guard.context.user.email,
        action: `task.status_${status}`,
        targetType: "Task",
        targetId: task._id.toString(),
        details: { title: task.title, from: previousStatus, to: status },
      });
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task._id.toString(),
        eventId: task.eventId.toString(),
        title: task.title,
        status: task.status,
        priority: task.priority,
        completedAt: task.completedAt,
      },
    });
  } catch (error) {
    console.error("Update Task Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE: Remove task
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const guard = await requireTenantGuard(req, "task:manage");
  if (!guard.success) return guard.response;

  try {
    const { id } = await params;
    const orgId = guard.context.organizationId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    }

    const task = await TaskModel.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: orgId,
    });

    if (!task) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // Recalculate event readiness score
    const event = await EventModel.findOne({ _id: task.eventId, organizationId: orgId });
    if (event) {
      const allTasks = await TaskModel.find({ eventId: event._id });
      const completedCount = allTasks.filter((t) => t.status === "completed").length;
      const readiness = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 50;
      event.readinessScore = readiness;
      await event.save();
    }

    await logAuditEvent({
      organizationId: orgId,
      actorUserId: guard.context.user._id,
      actorEmail: guard.context.user.email,
      action: "task.deleted",
      targetType: "Task",
      targetId: id,
      details: { title: task.title },
    });

    return NextResponse.json({ success: true, message: "Task deleted successfully." });
  } catch (error) {
    console.error("Delete Task Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
