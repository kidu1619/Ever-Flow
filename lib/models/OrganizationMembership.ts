import mongoose, { Schema, Document, Model } from "mongoose";
import { Role } from "@/lib/auth/permissions";

export interface IOrganizationMembership extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: Role;
  status: "active" | "suspended";
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationMembershipSchema = new Schema<IOrganizationMembership>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
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
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Unique user membership per organization
OrganizationMembershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export const OrganizationMembershipModel: Model<IOrganizationMembership> =
  mongoose.models.OrganizationMembership ||
  mongoose.model<IOrganizationMembership>("OrganizationMembership", OrganizationMembershipSchema);
