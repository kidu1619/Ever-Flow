import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPaymentRecord {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  paymentMethod: "Bank Transfer" | "Credit Card" | "Check" | "Cash" | "Wire";
  reference: string;
  notes?: string;
  recordedBy: string;
}

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  clientName: string;
  invoiceNumber: string;
  title: string;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  status: "Draft" | "Issued" | "Partially Paid" | "Paid" | "Overdue" | "Cancelled";
  isSharedWithClient: boolean; // FR-32: Explicit staff sharing control
  payments: IPaymentRecord[];
  notes?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    clientName: { type: String, required: true, trim: true },
    invoiceNumber: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD" },
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Draft", "Issued", "Partially Paid", "Paid", "Overdue", "Cancelled"],
      default: "Issued",
      index: true,
    },
    isSharedWithClient: { type: Boolean, default: false },
    payments: [
      {
        id: { type: String, default: () => Math.random().toString(36).substring(2, 9) },
        date: { type: Date, default: Date.now },
        amount: { type: Number, required: true },
        currency: { type: String, default: "USD" },
        paymentMethod: { type: String, default: "Bank Transfer" },
        reference: { type: String, default: "" },
        notes: { type: String, default: "" },
        recordedBy: { type: String, default: "Finance Manager" },
      },
    ],
    notes: { type: String, default: "" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InvoiceSchema.index({ organizationId: 1, eventId: 1, dueDate: 1 });

export const InvoiceModel: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
