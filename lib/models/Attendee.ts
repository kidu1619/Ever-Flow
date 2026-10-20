import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendee extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phone?: string;
  rsvpStatus: "attending" | "declined" | "tentative" | "invited";
  dietaryRequirements?: string;
  tableOrGroup?: string;
  vipStatus: boolean;
  notes?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AttendeeSchema = new Schema<IAttendee>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    rsvpStatus: {
      type: String,
      enum: ["attending", "declined", "tentative", "invited"],
      default: "invited",
      index: true,
    },
    dietaryRequirements: { type: String, default: "None" },
    tableOrGroup: { type: String, default: "General Seating" },
    vipStatus: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AttendeeSchema.index({ organizationId: 1, eventId: 1, rsvpStatus: 1 });

export const AttendeeModel: Model<IAttendee> =
  mongoose.models.Attendee || mongoose.model<IAttendee>("Attendee", AttendeeSchema);
