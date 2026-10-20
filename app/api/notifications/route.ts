import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { NotificationModel } from "@/lib/models/Notification";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req);
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const notifications = await NotificationModel.find({
      organizationId: context.organizationId,
      userId: context.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        actionUrl: n.actionUrl,
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    console.error("Fetch Notifications Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireTenantGuard(req);
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const body = await req.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await NotificationModel.updateMany(
        { organizationId: context.organizationId, userId: context.user._id },
        { $set: { isRead: true } }
      );
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (notificationId && mongoose.Types.ObjectId.isValid(notificationId)) {
      await NotificationModel.updateOne(
        {
          _id: new mongoose.Types.ObjectId(notificationId),
          organizationId: context.organizationId,
          userId: context.user._id,
        },
        { $set: { isRead: true } }
      );
      return NextResponse.json({ success: true, message: "Notification marked as read" });
    }

    return NextResponse.json({ error: "VALIDATION_FAILED", message: "Notification ID or markAll flag required" }, { status: 400 });
  } catch (error) {
    console.error("Update Notification Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to update notification" }, { status: 500 });
  }
}
