import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { MessageModel } from "@/lib/models/Message";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "message:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const rawChannel = searchParams.get("channel") || "internal";
    const channel = (["internal", "client", "vendor"].includes(rawChannel)
      ? rawChannel
      : "internal") as "internal" | "client" | "vendor";

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json({ error: "VALIDATION_FAILED", message: "Valid eventId required" }, { status: 400 });
    }

    // Channel Boundary Enforcement (FR-71)
    if (context.role === "Client" && channel !== "client") {
      return NextResponse.json(
        { error: "FORBIDDEN_CHANNEL", message: "Clients can only access the Client Collaboration channel." },
        { status: 403 }
      );
    }
    if ((context.role === "Vendor" || context.role === "External Vendor") && channel !== "vendor") {
      return NextResponse.json(
        { error: "FORBIDDEN_CHANNEL", message: "Vendors can only access the Vendor Coordination channel." },
        { status: 403 }
      );
    }

    const messages = await MessageModel.find({
      organizationId: context.organizationId,
      eventId: new mongoose.Types.ObjectId(eventId),
      channel,
      deletedAt: null,
    })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      messages: (messages as any[]).map((m: any) => ({
        id: m._id.toString(),
        channel: m.channel,
        senderName: m.senderName,
        senderRole: m.senderRole,
        senderAvatar: m.senderAvatar,
        content: m.content,
        attachments: m.attachments || [],
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error("Fetch Messages Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req, "message:post");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const body = await req.json();
    const { eventId, channel, content, attachments } = body;

    if (!eventId || !channel || !content?.trim()) {
      return NextResponse.json({ error: "VALIDATION_FAILED", message: "Event, channel, and content required" }, { status: 400 });
    }

    // Channel Boundary Check (FR-71)
    if (context.role === "Client" && channel !== "client") {
      return NextResponse.json({ error: "FORBIDDEN_CHANNEL", message: "Clients may only post in Client channel." }, { status: 403 });
    }
    if ((context.role === "Vendor" || context.role === "External Vendor") && channel !== "vendor") {
      return NextResponse.json({ error: "FORBIDDEN_CHANNEL", message: "Vendors may only post in Vendor channel." }, { status: 403 });
    }

    const message = await MessageModel.create({
      organizationId: context.organizationId,
      eventId: new mongoose.Types.ObjectId(eventId),
      channel,
      senderUserId: context.user._id,
      senderName: context.user.name,
      senderRole: context.role,
      senderAvatar: context.user.avatar || "",
      content: content.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    return NextResponse.json({
      success: true,
      message: {
        id: message._id.toString(),
        channel: message.channel,
        senderName: message.senderName,
        senderRole: message.senderRole,
        senderAvatar: message.senderAvatar,
        content: message.content,
        attachments: message.attachments,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error("Post Message Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to post message" }, { status: 500 });
  }
}
