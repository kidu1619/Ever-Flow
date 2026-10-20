import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClientCommunication {
  id: string;
  date: Date;
  type: "call" | "email" | "meeting" | "note";
  summary: string;
  authorName: string;
}

export interface IClient extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string; // e.g. "Sophia & Liam Taylor" or "TechCorp Inc"
  type: "Individual" | "Couple" | "Company" | "Institution" | "Community Group";
  primaryContact: string;
  email: string;
  phone: string;
  address?: string;
  preferences: string; // aesthetic styles, VIP requests, dietary
  requirements: string; // SLA expectations, contractual mandates
  linkedEventIds: mongoose.Types.ObjectId[];
  communications: IClientCommunication[];
  status: "lead" | "active" | "past";
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["Individual", "Couple", "Company", "Institution", "Community Group"],
      default: "Individual",
    },
    primaryContact: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    preferences: { type: String, default: "" },
    requirements: { type: String, default: "" },
    linkedEventIds: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    communications: [
      {
        id: { type: String, default: () => Math.random().toString(36).substring(2, 9) },
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ["call", "email", "meeting", "note"], default: "meeting" },
        summary: { type: String, required: true },
        authorName: { type: String, default: "Event Coordinator" },
      },
    ],
    status: { type: String, enum: ["lead", "active", "past"], default: "active", index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ClientSchema.index({ organizationId: 1, name: 1 });

export const ClientModel: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
