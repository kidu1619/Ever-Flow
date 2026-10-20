import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrganizationLimits {
  maxActiveEvents: number;
  maxTeamMembers: number;
  maxStorageMB: number;
}

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  logoUrl?: string;
  brandColor?: string;
  country?: string;
  starterTemplates?: string[];
  currency: string;
  timeZone: string;
  status: "trialing" | "active" | "past_due" | "read_only" | "suspended" | "cancelled" | "expired";
  plan: "Trial / Starter" | "Basic" | "Professional" | "Business";
  trialEndsAt: Date;
  limits: IOrganizationLimits;
  ownerUserId: mongoose.Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logoUrl: { type: String, default: "" },
    brandColor: { type: String, default: "#E06B53" },
    country: { type: String, default: "United States" },
    starterTemplates: { type: [String], default: ["wedding", "conference", "graduation"] },
    currency: { type: String, default: "USD" },
    timeZone: { type: String, default: "UTC" },
    status: {
      type: String,
      enum: ["trialing", "active", "past_due", "read_only", "suspended", "cancelled", "expired"],
      default: "trialing",
    },
    plan: {
      type: String,
      enum: ["Trial / Starter", "Basic", "Professional", "Business"],
      default: "Trial / Starter",
    },
    trialEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day default trial
    },
    limits: {
      maxActiveEvents: { type: Number, default: 5 },
      maxTeamMembers: { type: Number, default: 5 },
      maxStorageMB: { type: Number, default: 500 },
    },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const OrganizationModel: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>("Organization", OrganizationSchema);
