import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDocumentVersion {
  versionNumber: number;
  fileUrl: string;
  storageKey: string;
  fileSizeKB: number;
  uploadedByName: string;
  uploadedAt: Date;
  notes?: string;
}

export interface IRecordedApproval {
  requestedToName: string;
  requestedAt: Date;
  status: "pending" | "approved" | "rejected";
  decidedByName?: string;
  decidedAt?: Date;
  decisionComment?: string;
  disclaimer: string; // BR-8: "Recorded approval, not a legally binding signature"
}

export interface IDocumentRecord extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  eventName?: string;
  title: string;
  category: "Contract" | "Proposal" | "Quotation" | "Invoice" | "RunSheet" | "Brief" | "Compliance" | "Floorplan" | "General";
  tags: string[];
  visibility: "internal" | "shared_with_client" | "shared_with_vendor"; // FR-60, BR-4
  currentVersion: number;
  fileUrl: string;
  storageKey: string; // org/{id}/... (Section 13.1)
  fileSizeKB: number;
  fileType: string;
  versions: IDocumentVersion[];
  approval?: IRecordedApproval;
  uploadedByName: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentRecordSchema = new Schema<IDocumentRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", index: true },
    eventName: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Contract", "Proposal", "Quotation", "Invoice", "RunSheet", "Brief", "Compliance", "Floorplan", "General"],
      default: "General",
    },
    tags: { type: [String], default: [] },
    visibility: {
      type: String,
      enum: ["internal", "shared_with_client", "shared_with_vendor"],
      default: "internal",
      index: true,
    },
    currentVersion: { type: Number, default: 1 },
    fileUrl: { type: String, required: true },
    storageKey: { type: String, required: true },
    fileSizeKB: { type: Number, default: 150 },
    fileType: { type: String, default: "PDF" },
    versions: [
      {
        versionNumber: { type: Number, required: true },
        fileUrl: { type: String, required: true },
        storageKey: { type: String, required: true },
        fileSizeKB: { type: Number, default: 150 },
        uploadedByName: { type: String, default: "Team Member" },
        uploadedAt: { type: Date, default: Date.now },
        notes: { type: String, default: "" },
      },
    ],
    approval: {
      requestedToName: { type: String },
      requestedAt: { type: Date },
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
      decidedByName: { type: String },
      decidedAt: { type: Date },
      decisionComment: { type: String },
      disclaimer: {
        type: String,
        default: "Recorded approval in EverFlow; does not constitute a legally binding electronic signature (BR-8).",
      },
    },
    uploadedByName: { type: String, default: "Staff" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

DocumentRecordSchema.index({ organizationId: 1, eventId: 1, visibility: 1 });

export const DocumentRecordModel: Model<IDocumentRecord> =
  mongoose.models.DocumentRecord || mongoose.model<IDocumentRecord>("DocumentRecord", DocumentRecordSchema);
