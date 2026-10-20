import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVendorBooking extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  service: string;
  startDate: Date;
  endDate: Date;
  agreedAmount: number;
  status: "tentative" | "confirmed" | "cancelled";
  hasConflict: boolean;
  conflictDetails?: string;
  conflictOverrideReason?: string;
  conflictOverriddenBy?: string;
  notes?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const VendorBookingSchema = new Schema<IVendorBooking>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    service: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    agreedAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["tentative", "confirmed", "cancelled"],
      default: "tentative",
      index: true,
    },
    hasConflict: { type: Boolean, default: false },
    conflictDetails: { type: String, default: "" },
    conflictOverrideReason: { type: String, default: "" },
    conflictOverriddenBy: { type: String, default: "" },
    notes: { type: String, default: "" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

VendorBookingSchema.index({ organizationId: 1, vendorId: 1, startDate: 1, endDate: 1 });
VendorBookingSchema.index({ organizationId: 1, eventId: 1 });

export const VendorBookingModel: Model<IVendorBooking> =
  mongoose.models.VendorBooking || mongoose.model<IVendorBooking>("VendorBooking", VendorBookingSchema);
