import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { AnnouncementModel } from "@/lib/models/Announcement";
import { NotificationModel } from "@/lib/models/Notification";
import { OrganizationMembershipModel } from "@/lib/models/OrganizationMembership";

export const dynamic = "force-dynamic";

function roleMatchesTarget(userRole?: string, targetRole?: string): boolean {
  if (!targetRole || targetRole.toLowerCase() === "all") return true;
  const u = (userRole || "").toLowerCase().replace(/[\s_-]/g, "");
  const t = (targetRole || "").toLowerCase().replace(/[\s_-]/g, "");
  if (u === t) return true;
  if (t === "eventmanager" && (u === "eventmanager" || u === "eventproducer" || u === "productionmanager")) return true;
  if (t === "vendor" && (u === "vendor" || u === "vendorcoordinator" || u === "partner")) return true;
  if (t === "financemanager" && (u === "financemanager" || u === "finance" || u === "billing")) return true;
  if (t === "owner" && (u === "owner" || u === "admin" || u === "superadmin")) return true;
  if (t === "staff" && (u === "staff" || u === "crew" || u === "coordinator")) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req);
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    let announcements = await AnnouncementModel.find({
      organizationId: context.organizationId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    // If no active announcement exists, seed a realistic default operational instruction
    // so every role can immediately experience the instruction broadcast bar
    if (announcements.length === 0) {
      const defaultAnnouncement = await AnnouncementModel.create({
        organizationId: context.organizationId,
        title: "Operational Briefing: Soundcheck & Loading Bay Protocol",
        message:
          "Attention all teams, vendors, and coordinators: Stage 1 acoustic soundcheck is rescheduled to 14:00 at Grand Ballroom West. Catering, AV crews, and floor staff please report to West Dispatch. Invoices must be submitted by 18:00 today.",
        priority: "warning",
        targetRole: "all",
        postedByName: "Marcus Vance",
        postedByRole: "Event Manager",
        postedByUserId: context.user._id,
        isActive: true,
        acknowledgedByUserIds: [],
      });
      announcements = [defaultAnnouncement.toObject() as any];
    }

    const currentUserIdStr = context.user._id.toString();
    const isExecutiveOrPlatform =
      ["Owner", "Admin"].includes(context.role) || Boolean(context.user.isPlatformAdmin);

    // Filter announcements:
    // 1. Broadcast to Everyone ("all") -> Visible to all
    // 2. Broadcast to specific role -> Visible to that role
    // 3. Sender who posted it -> Always visible to author
    // 4. Executive Owners & Platform Admins -> Visible for supervisory oversight
    const filtered = announcements.filter((a) => {
      if (!a.targetRole || a.targetRole.toLowerCase() === "all") return true;
      if (roleMatchesTarget(context.role, a.targetRole)) return true;
      if (a.postedByUserId && a.postedByUserId.toString() === currentUserIdStr) return true;
      if (isExecutiveOrPlatform) return true;
      return false;
    });

    const results = filtered.map((a) => {
      const ackList = (a.acknowledgedByUserIds || []).map((id: any) => id.toString());
      const isDirectTarget = !a.targetRole || a.targetRole.toLowerCase() === "all" || roleMatchesTarget(context.role, a.targetRole);
      return {
        id: a._id.toString(),
        title: a.title,
        message: a.message,
        priority: a.priority,
        targetRole: a.targetRole,
        postedByName: a.postedByName,
        postedByRole: a.postedByRole,
        createdAt: a.createdAt,
        isActive: a.isActive,
        hasAcknowledged: ackList.includes(currentUserIdStr),
        acknowledgedCount: ackList.length,
        isDirectTarget,
        isSender: a.postedByUserId && a.postedByUserId.toString() === currentUserIdStr,
      };
    });

    return NextResponse.json({
      success: true,
      role: context.role,
      userName: context.user.name,
      announcements: results,
      activeCount: results.length,
    });
  } catch (error) {
    console.error("Fetch Announcements Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req);
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const body = await req.json();
    const {
      title,
      message,
      priority = "warning",
      targetRole = "all",
      fromRole,
      fromName,
      deactivatePrevious = false,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Instruction title and message are required" },
        { status: 400 }
      );
    }

    if (deactivatePrevious) {
      await AnnouncementModel.updateMany(
        { organizationId: context.organizationId, isActive: true },
        { $set: { isActive: false } }
      );
    }

    const effectiveFromRole = fromRole?.trim() || context.role || "Operations Lead";
    const effectiveFromName = fromName?.trim() || context.user.name || "Team Member";

    const newAnnouncement = await AnnouncementModel.create({
      organizationId: context.organizationId,
      title: title.trim(),
      message: message.trim(),
      priority: ["urgent", "warning", "info"].includes(priority) ? priority : "warning",
      targetRole: targetRole || "all",
      postedByName: effectiveFromName,
      postedByRole: effectiveFromRole,
      postedByUserId: context.user._id,
      isActive: true,
      acknowledgedByUserIds: [context.user._id],
    });

    // Notify targeted members in the tenant
    try {
      const activeMembers = await OrganizationMembershipModel.find({
        organizationId: context.organizationId,
        status: "active",
      }).lean();

      const targetedMembers = activeMembers.filter((m) => {
        if (!targetRole || targetRole === "all") return true;
        return roleMatchesTarget(m.role, targetRole) || m.role === "Owner" || m.role === "Admin";
      });

      if (targetedMembers.length > 0) {
        const notifDocs = targetedMembers.map((m) => ({
          organizationId: context.organizationId,
          userId: m.userId,
          title: `[${effectiveFromRole} ➔ ${targetRole === "all" ? "Everyone" : targetRole}] ${title.trim()}`,
          message: message.trim(),
          type: priority === "urgent" ? "conflict" : "system",
          isRead: m.userId.toString() === context.user._id.toString(),
          actionUrl: "/?tab=overview",
        }));
        await NotificationModel.insertMany(notifDocs);
      }
    } catch (notifErr) {
      console.warn("Failed to propagate announcement to NotificationModel:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Instruction from ${effectiveFromRole} to ${targetRole === "all" ? "everyone" : targetRole} broadcast successfully!`,
      announcement: {
        id: newAnnouncement._id.toString(),
        title: newAnnouncement.title,
        message: newAnnouncement.message,
        priority: newAnnouncement.priority,
        targetRole: newAnnouncement.targetRole,
        postedByName: newAnnouncement.postedByName,
        postedByRole: newAnnouncement.postedByRole,
        createdAt: newAnnouncement.createdAt,
        isActive: newAnnouncement.isActive,
        hasAcknowledged: true,
      },
    });
  } catch (error) {
    console.error("Create Announcement Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to broadcast instruction" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireTenantGuard(req);
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Valid instruction ID is required" },
        { status: 400 }
      );
    }

    const announcement = await AnnouncementModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: context.organizationId,
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Announcement not found in this organization" },
        { status: 404 }
      );
    }

    if (action === "acknowledge") {
      // Add current user to acknowledged list if not already present
      const userId = context.user._id;
      const alreadyAcked = announcement.acknowledgedByUserIds.some(
        (uId) => uId.toString() === userId.toString()
      );

      if (!alreadyAcked) {
        announcement.acknowledgedByUserIds.push(userId);
        await announcement.save();
      }

      return NextResponse.json({
        success: true,
        message: "Instruction marked as acknowledged",
        hasAcknowledged: true,
      });
    }

    if (action === "archive" || action === "deactivate") {
      const isAuthorized =
        ["Owner", "Admin", "EventManager", "Event Manager"].includes(context.role) ||
        Boolean(context.user.isPlatformAdmin);

      if (!isAuthorized) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Only managers can archive instructions" },
          { status: 403 }
        );
      }

      announcement.isActive = false;
      await announcement.save();

      return NextResponse.json({
        success: true,
        message: "Instruction archived and removed from notification bar",
      });
    }

    return NextResponse.json(
      { error: "INVALID_ACTION", message: "Action must be 'acknowledge' or 'archive'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Update Announcement Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to update instruction" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireTenantGuard(req);
  if (!guard.success) return guard.response;
  const { context } = guard;

  const isAuthorized =
    ["Owner", "Admin", "EventManager", "Event Manager"].includes(context.role) ||
    Boolean(context.user.isPlatformAdmin);

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Only managers can delete broadcast instructions" },
      { status: 403 }
    );
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", message: "Valid instruction ID is required" },
        { status: 400 }
      );
    }

    await AnnouncementModel.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: context.organizationId,
    });

    return NextResponse.json({ success: true, message: "Instruction deleted successfully" });
  } catch (error) {
    console.error("Delete Announcement Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to delete instruction" },
      { status: 500 }
    );
  }
}
