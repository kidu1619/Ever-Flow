import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISupportAccessGrant extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  grantedByUserId: mongoose.Types.ObjectId;
  grantedByEmail: string;
  supportAdminEmail: string;
  reason: string;
  expiresAt: Date;
  isActive: boolean;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportAccessGrantSchema = new Schema<ISupportAccessGrant>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    grantedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    grantedByEmail: { type: String, required: true },
    supportAdminEmail: { type: String, required: true },
    reason: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

SupportAccessGrantSchema.index({ organizationId: 1, isActive: 1, expiresAt: 1 });

export const SupportAccessGrantModel: Model<ISupportAccessGrant> =
  mongoose.models.SupportAccessGrant ||
  mongoose.model<ISupportAccessGrant>("SupportAccessGrant", SupportAccessGrantSchema);
