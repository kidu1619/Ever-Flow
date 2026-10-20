import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: "Logistics" | "Vendors" | "Program" | "Marketing" | "Design" | "Production" | "General";
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: Date;
  assignedToName?: string;
  isBlocked?: boolean;
  blockedReason?: string;
  checklist?: { id: string; text: string; completed: boolean }[];
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["Logistics", "Vendors", "Program", "Marketing", "Design", "Production", "General"],
      default: "General",
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "completed"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueDate: { type: Date },
    assignedToName: { type: String, default: "Unassigned" },
    isBlocked: { type: Boolean, default: false },
    blockedReason: { type: String, default: "" },
    checklist: [
      {
        id: { type: String, default: () => Math.random().toString(36).substring(2, 9) },
        text: { type: String, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for fast tenant-scoped and event-scoped queries
TaskSchema.index({ organizationId: 1, eventId: 1, status: 1 });

export const TaskModel: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
