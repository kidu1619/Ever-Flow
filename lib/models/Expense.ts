import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  budgetItemId?: mongoose.Types.ObjectId;
  title: string;
  category: string;
  amount: number;
  currency: string;
  date: Date;
  paidTo: string;
  paymentMethod: "Bank Transfer" | "Credit Card" | "Check" | "Cash" | "ACH";
  receiptRef?: string;
  status: "pending" | "cleared" | "reconciled";
  notes?: string;
  recordedByUserName: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    budgetItemId: { type: Schema.Types.ObjectId, ref: "BudgetItem" },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    date: { type: Date, required: true, default: Date.now },
    paidTo: { type: String, required: true, trim: true },
    paymentMethod: {
      type: String,
      enum: ["Bank Transfer", "Credit Card", "Check", "Cash", "ACH"],
      default: "Bank Transfer",
    },
    receiptRef: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "cleared", "reconciled"],
      default: "cleared",
    },
    notes: { type: String, default: "" },
    recordedByUserName: { type: String, default: "Finance Manager" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ExpenseSchema.index({ organizationId: 1, eventId: 1, date: -1 });

export const ExpenseModel: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
