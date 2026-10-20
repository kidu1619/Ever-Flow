import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { AuditLogModel } from "@/lib/models/AuditLog";

export interface LogAuditParams {
  organizationId: string | mongoose.Types.ObjectId;
  actorUserId?: string | mongoose.Types.ObjectId;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Appends an immutable audit log entry for the specified tenant.
 */
export async function logAuditEvent(params: LogAuditParams) {
  try {
    await connectToDatabase();
    await AuditLogModel.create({
      organizationId: new mongoose.Types.ObjectId(params.organizationId.toString()),
      actorUserId: params.actorUserId
        ? new mongoose.Types.ObjectId(params.actorUserId.toString())
        : undefined,
      actorEmail: params.actorEmail,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details || {},
      ipAddress: params.ipAddress || "127.0.0.1",
    });
  } catch (error) {
    console.error("Failed to write append-only audit log:", error);
  }
}
