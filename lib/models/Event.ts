import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  category: string;
  description?: string;
  venue: string;
  startDate: Date;
  endDate?: Date;
  status: "Draft" | "Planning" | "Preparation" | "Execution" | "Completed" | "Closed" | "Cancelled";
  capacity?: number;
  budget?: number;
  readinessScore?: number;
  ownerUserId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  clientName?: string;
  readinessChecklist?: {
    id: string;
    title: string;
    category: string;
    isCompleted: boolean;
    isRequired: boolean;
  }[];
  runSheet?: {
    id: string;
    time: string;
    activity: string;
    location: string;
    responsible: string;
    vendor: string;
    notes: string;
  }[];
  cancellationReason?: string;
  templateSlug?: string;
  imageUrl?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, default: "Gala" },
    description: { type: String, default: "" },
    venue: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ["Draft", "Planning", "Preparation", "Execution", "Completed", "Closed", "Cancelled"],
      default: "Planning",
      index: true,
    },
    capacity: { type: Number, default: 250 },
    budget: { type: Number, default: 45000 },
    readinessScore: { type: Number, default: 78 },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    clientName: { type: String, default: "" },
    readinessChecklist: [
      {
        id: { type: String, default: () => Math.random().toString(36).substring(2, 9) },
        title: { type: String, required: true },
        category: { type: String, default: "Operations" },
        isCompleted: { type: Boolean, default: false },
        isRequired: { type: Boolean, default: true },
      },
    ],
    runSheet: [
      {
        id: { type: String, default: () => Math.random().toString(36).substring(2, 9) },
        time: { type: String, required: true },
        activity: { type: String, required: true },
        location: { type: String, default: "" },
        responsible: { type: String, default: "" },
        vendor: { type: String, default: "" },
        notes: { type: String, default: "" },
      },
    ],
    cancellationReason: { type: String },
    templateSlug: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for tenant-scoped query performance
EventSchema.index({ organizationId: 1, status: 1, startDate: -1 });

export const EventModel: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);
