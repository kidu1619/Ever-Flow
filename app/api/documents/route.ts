import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { DocumentRecordModel } from "@/lib/models/Document";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "document:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const category = searchParams.get("category");

    const filter: Record<string, unknown> = {
      organizationId: context.organizationId,
      deletedAt: null,
    };

    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      filter.eventId = new mongoose.Types.ObjectId(eventId);
    }
    if (category && category !== "All") {
      filter.category = category;
    }

    // Role-based visibility enforcement (FR-32, BR-4)
    if (context.role === "Client") {
      filter.visibility = "shared_with_client";
    } else if (context.role === "Vendor" || context.role === "External Vendor") {
      filter.visibility = "shared_with_vendor";
    }

    const docs = await DocumentRecordModel.find(filter)
      .populate("eventId", "name category startDate venue")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      documents: docs.map((d) => ({
        id: d._id.toString(),
        event: d.eventId,
        eventName: d.eventName,
        title: d.title,
        category: d.category,
        tags: d.tags || [],
        visibility: d.visibility,
        currentVersion: d.currentVersion,
        fileUrl: d.fileUrl,
        storageKey: d.storageKey,
        fileSizeKB: d.fileSizeKB,
        fileType: d.fileType,
        versions: d.versions || [],
        approval: d.approval,
        uploadedByName: d.uploadedByName,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    console.error("Fetch Documents Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req, "document:manage");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "upload") {
      const { eventId, eventName, title, category, tags, visibility, fileUrl, fileType, fileSizeKB } = body;
      if (!title || !category) {
        return NextResponse.json({ error: "VALIDATION_FAILED", message: "Title and category are required" }, { status: 400 });
      }

      const storageKey = `org/${context.organizationId.toString()}/docs/${Date.now()}-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.${(fileType || "pdf").toLowerCase()}`;
      const doc = await DocumentRecordModel.create({
        organizationId: context.organizationId,
        eventId: eventId && mongoose.Types.ObjectId.isValid(eventId) ? new mongoose.Types.ObjectId(eventId) : undefined,
        eventName: eventName || "",
        title: title.trim(),
        category,
        tags: Array.isArray(tags) ? tags : [],
        visibility: visibility || "internal",
        currentVersion: 1,
        fileUrl: fileUrl || "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
        storageKey,
        fileSizeKB: Number(fileSizeKB) || 240,
        fileType: (fileType || "PDF").toUpperCase(),
        uploadedByName: context.user.name,
        versions: [
          {
            versionNumber: 1,
            fileUrl: fileUrl || "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
            storageKey,
            fileSizeKB: Number(fileSizeKB) || 240,
            uploadedByName: context.user.name,
            uploadedAt: new Date(),
            notes: "Initial version",
          },
        ],
      });

      await logAuditEvent({
        organizationId: context.organizationId,
        actorUserId: context.user._id,
        actorEmail: context.user.email,
        action: "document.uploaded",
        targetType: "Document",
        targetId: doc._id.toString(),
        details: { title: doc.title, category: doc.category, visibility: doc.visibility },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({ success: true, document: doc });
    }

    if (action === "new_version") {
      const { documentId, fileUrl, notes, fileSizeKB } = body;
      if (!documentId) return NextResponse.json({ error: "VALIDATION_FAILED", message: "Document ID required" }, { status: 400 });

      const doc = await DocumentRecordModel.findOne({
        _id: new mongoose.Types.ObjectId(documentId),
        organizationId: context.organizationId,
      });
      if (!doc) return NextResponse.json({ error: "NOT_FOUND", message: "Document not found" }, { status: 404 });

      const nextVer = doc.currentVersion + 1;
      const storageKey = `org/${context.organizationId.toString()}/docs/v${nextVer}-${doc.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.${doc.fileType.toLowerCase()}`;

      doc.currentVersion = nextVer;
      doc.fileUrl = fileUrl || doc.fileUrl;
      doc.storageKey = storageKey;
      doc.versions.push({
        versionNumber: nextVer,
        fileUrl: fileUrl || doc.fileUrl,
        storageKey,
        fileSizeKB: Number(fileSizeKB) || doc.fileSizeKB,
        uploadedByName: context.user.name,
        uploadedAt: new Date(),
        notes: notes || `Version ${nextVer}`,
      });

      await doc.save();

      return NextResponse.json({ success: true, document: doc });
    }

    if (action === "request_approval") {
      const { documentId, requestedToName } = body;
      const doc = await DocumentRecordModel.findOne({
        _id: new mongoose.Types.ObjectId(documentId),
        organizationId: context.organizationId,
      });
      if (!doc) return NextResponse.json({ error: "NOT_FOUND", message: "Document not found" }, { status: 404 });

      doc.approval = {
        requestedToName: requestedToName || "Client Stakeholder",
        requestedAt: new Date(),
        status: "pending",
        disclaimer: "Recorded approval in EverFlow; does not constitute a legally binding electronic signature (BR-8).",
      };

      await doc.save();
      return NextResponse.json({ success: true, document: doc });
    }

    if (action === "decide_approval") {
      const { documentId, decision, comment } = body;
      const doc = await DocumentRecordModel.findOne({
        _id: new mongoose.Types.ObjectId(documentId),
        organizationId: context.organizationId,
      });
      if (!doc || !doc.approval) {
        return NextResponse.json({ error: "NOT_FOUND", message: "Document or approval request not found" }, { status: 404 });
      }

      doc.approval.status = decision === "approved" ? "approved" : "rejected";
      doc.approval.decidedByName = context.user.name;
      doc.approval.decidedAt = new Date();
      doc.approval.decisionComment = comment || "";

      await doc.save();

      await logAuditEvent({
        organizationId: context.organizationId,
        actorUserId: context.user._id,
        actorEmail: context.user.email,
        action: `document.approval_${doc.approval.status}`,
        targetType: "Document",
        targetId: doc._id.toString(),
        details: { documentTitle: doc.title, decision: doc.approval.status, comment },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({ success: true, document: doc });
    }

    return NextResponse.json({ error: "UNKNOWN_ACTION", message: "Valid action required" }, { status: 400 });
  } catch (error) {
    console.error("Document Action Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to process document request" }, { status: 500 });
  }
}
