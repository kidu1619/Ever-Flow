import mongoose, { Schema, Document, Model } from "mongoose";
import { Role } from "@/lib/auth/permissions";

export interface IInvitation extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  email: string;
  role: Role;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: Date;
  invitedByUserId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: {
      type: String,
      enum: [
        "Owner",
        "Admin",
        "EventManager",
        "Event Manager",
        "FinanceManager",
        "Finance Manager",
        "VendorCoordinator",
        "Vendor Coordinator",
        "Staff",
        "Client",
        "Vendor",
        "External Vendor",
      ],
      required: true,
      default: "Staff",
    },
    token: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "revoked", "expired"],
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day expiration
    },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const InvitationModel: Model<IInvitation> =
  mongoose.models.Invitation || mongoose.model<IInvitation>("Invitation", InvitationSchema);
