import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  actorUserId?: mongoose.Types.ObjectId;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: "127.0.0.1" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Append-only immutable log
  }
);

export const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
