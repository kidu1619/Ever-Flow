import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBudgetItem extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  category: "Venue" | "Catering" | "Production" | "Design & Florals" | "Entertainment" | "Staffing" | "Logistics" | "Marketing" | "Contingency" | "Other";
  title: string;
  estimatedCost: number;
  contractedCost: number;
  actualCost: number; // calculated from recorded expenses (BR-11)
  vendorBookingId?: mongoose.Types.ObjectId;
  vendorName?: string;
  notes?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetItemSchema = new Schema<IBudgetItem>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    category: {
      type: String,
      enum: ["Venue", "Catering", "Production", "Design & Florals", "Entertainment", "Staffing", "Logistics", "Marketing", "Contingency", "Other"],
      default: "Other",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    estimatedCost: { type: Number, default: 0, min: 0 },
    contractedCost: { type: Number, default: 0, min: 0 },
    actualCost: { type: Number, default: 0, min: 0 },
    vendorBookingId: { type: Schema.Types.ObjectId, ref: "VendorBooking" },
    vendorName: { type: String, default: "" },
    notes: { type: String, default: "" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

BudgetItemSchema.index({ organizationId: 1, eventId: 1, category: 1 });

export const BudgetItemModel: Model<IBudgetItem> =
  mongoose.models.BudgetItem || mongoose.model<IBudgetItem>("BudgetItem", BudgetItemSchema);
