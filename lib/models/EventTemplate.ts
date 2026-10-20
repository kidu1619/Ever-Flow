import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITemplateTaskItem {
  title: string;
  category: "Logistics" | "Vendors" | "Program" | "Marketing" | "Design" | "Production" | "General";
  priority: "low" | "medium" | "high";
  daysBeforeEvent: number;
}

export interface IEventTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  slug: "wedding" | "conference" | "graduation" | string;
  name: string;
  category: string;
  description: string;
  badge: string;
  defaultBudget: number;
  defaultCapacity: number;
  tasks: ITemplateTaskItem[];
  createdAt: Date;
  updatedAt: Date;
}

const TemplateTaskItemSchema = new Schema<ITemplateTaskItem>(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["Logistics", "Vendors", "Program", "Marketing", "Design", "Production", "General"],
      default: "General",
    },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    daysBeforeEvent: { type: Number, default: 7 },
  },
  { _id: false }
);

const EventTemplateSchema = new Schema<IEventTemplate>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    badge: { type: String, default: "Standard" },
    defaultBudget: { type: Number, default: 25000 },
    defaultCapacity: { type: Number, default: 150 },
    tasks: [TemplateTaskItemSchema],
  },
  { timestamps: true }
);

export const EventTemplateModel: Model<IEventTemplate> =
  mongoose.models.EventTemplate ||
  mongoose.model<IEventTemplate>("EventTemplate", EventTemplateSchema);
