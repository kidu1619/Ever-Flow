import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVendorReview {
  id: string;
  eventId?: mongoose.Types.ObjectId;
  eventName: string;
  rating: number; // 1-5
  feedback: string;
  authorName: string;
  createdAt: Date;
}

export interface IVendorPackage {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface IVendor extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  category: string; // Catering, Venue, Photography, Florals, Sound & Lighting, Decor, Entertainment, Security, Transport, Rentals
  contactName: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  description: string;
  isVerified: boolean; // Internal verification flag (FR-20)
  rating: number; // Average rating 1-5 (FR-23)
  reviews: IVendorReview[];
  packages: IVendorPackage[];
  status: "active" | "archived";
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    website: { type: String, default: "" },
    description: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    rating: { type: Number, default: 5 },
    reviews: [
      {
        id: { type: String, default: () => Math.random().toString(36).substring(2, 9) },
        eventId: { type: Schema.Types.ObjectId, ref: "Event" },
        eventName: { type: String, default: "" },
        rating: { type: Number, required: true, min: 1, max: 5 },
        feedback: { type: String, default: "" },
        authorName: { type: String, default: "Event Coordinator" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    packages: [
      {
        id: { type: String, default: () => Math.random().toString(36).substring(2, 9) },
        name: { type: String, required: true },
        description: { type: String, default: "" },
        price: { type: Number, required: true },
      },
    ],
    status: { type: String, enum: ["active", "archived"], default: "active", index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

VendorSchema.index({ organizationId: 1, category: 1, status: 1 });

export const VendorModel: Model<IVendor> =
  mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", VendorSchema);
