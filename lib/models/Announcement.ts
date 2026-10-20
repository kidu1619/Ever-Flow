import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnnouncement extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  priority: "urgent" | "warning" | "info";
  targetRole: string; // "all" | "Staff" | "Vendor" | "Client" | "FinanceManager" | "EventManager" | "Admin"
  postedByName: string;
  postedByRole: string;
  postedByUserId: mongoose.Types.ObjectId;
  isActive: boolean;
  acknowledgedByUserIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ["urgent", "warning", "info"],
      default: "warning",
      index: true,
    },
    targetRole: {
      type: String,
      default: "all",
      index: true,
    },
    postedByName: { type: String, required: true, trim: true },
    postedByRole: { type: String, required: true, trim: true },
    postedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true, index: true },
    acknowledgedByUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

AnnouncementSchema.index({ organizationId: 1, isActive: 1, createdAt: -1 });

export const AnnouncementModel: Model<IAnnouncement> =
  mongoose.models.Announcement || mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);
