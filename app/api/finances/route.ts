import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { BudgetItemModel } from "@/lib/models/BudgetItem";
import { ExpenseModel } from "@/lib/models/Expense";
import { InvoiceModel } from "@/lib/models/Invoice";
import { EventModel } from "@/lib/models/Event";
import { logAuditEvent } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "finance:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const filter: Record<string, unknown> = {
      organizationId: context.organizationId,
      deletedAt: null,
    };

    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      filter.eventId = new mongoose.Types.ObjectId(eventId);
    }

    const [budgetItems, expenses, invoices] = await Promise.all([
      BudgetItemModel.find(filter).populate("eventId", "name category venue startDate").sort({ category: 1 }).lean(),
      ExpenseModel.find(filter).populate("eventId", "name category").sort({ date: -1 }).lean(),
      InvoiceModel.find(filter).populate("eventId", "name category").sort({ dueDate: 1 }).lean(),
    ]);

    // Financial calculations (FR-52, BR-11)
    const totalEstimated = budgetItems.reduce((acc, b) => acc + (b.estimatedCost || 0), 0);
    const totalContracted = budgetItems.reduce((acc, b) => acc + (b.contractedCost || 0), 0);
    const totalActualExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
    const totalPaymentsReceived = invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
    const outstandingClientBalance = Math.max(0, totalInvoiced - totalPaymentsReceived);
    const variance = totalEstimated - totalActualExpenses;
    const utilizationPercent =
      totalEstimated > 0 ? Math.round((totalActualExpenses / totalEstimated) * 100) : 0;

    return NextResponse.json({
      success: true,
      budgetItems: budgetItems.map((b) => ({
        id: b._id.toString(),
        event: b.eventId,
        category: b.category,
        title: b.title,
        estimatedCost: b.estimatedCost,
        contractedCost: b.contractedCost,
        actualCost: b.actualCost,
        vendorName: b.vendorName,
        notes: b.notes,
      })),
      expenses: expenses.map((e) => ({
        id: e._id.toString(),
        event: e.eventId,
        title: e.title,
        category: e.category,
        amount: e.amount,
        currency: e.currency,
        date: e.date,
        paidTo: e.paidTo,
        paymentMethod: e.paymentMethod,
        receiptRef: e.receiptRef,
        status: e.status,
        recordedByUserName: e.recordedByUserName,
      })),
      invoices: invoices.map((inv) => ({
        id: inv._id.toString(),
        event: inv.eventId,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        title: inv.title,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        currency: inv.currency,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        status: inv.status,
        isSharedWithClient: inv.isSharedWithClient,
        payments: inv.payments || [],
      })),
      summary: {
        totalEstimated,
        totalContracted,
        totalActualExpenses,
        totalInvoiced,
        totalPaymentsReceived,
        outstandingClientBalance,
        variance,
        utilizationPercent,
      },
    });
  } catch (error) {
    console.error("Fetch Finances Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to fetch finances" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireTenantGuard(req, "finance:manage");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "add_budget_item") {
      const { eventId, category, title, estimatedCost, contractedCost, vendorName, notes } = body;
      if (!eventId || !title) {
        return NextResponse.json({ error: "VALIDATION_FAILED", message: "Event and title are required" }, { status: 400 });
      }

      const item = await BudgetItemModel.create({
        organizationId: context.organizationId,
        eventId: new mongoose.Types.ObjectId(eventId),
        category: category || "Other",
        title: title.trim(),
        estimatedCost: Number(estimatedCost) || 0,
        contractedCost: Number(contractedCost) || 0,
        actualCost: 0,
        vendorName: vendorName || "",
        notes: notes || "",
      });

      return NextResponse.json({ success: true, item });
    }

    if (action === "add_expense") {
      const { eventId, budgetItemId, title, amount, category, paidTo, paymentMethod, receiptRef, notes } = body;
      if (!eventId || !title || !amount || !paidTo) {
        return NextResponse.json(
          { error: "VALIDATION_FAILED", message: "Event, title, amount, and recipient are required" },
          { status: 400 }
        );
      }

      const expense = await ExpenseModel.create({
        organizationId: context.organizationId,
        eventId: new mongoose.Types.ObjectId(eventId),
        budgetItemId: budgetItemId ? new mongoose.Types.ObjectId(budgetItemId) : undefined,
        title: title.trim(),
        amount: Number(amount),
        category: category || "General",
        currency: context.organization.currency || "USD",
        date: new Date(),
        paidTo: paidTo.trim(),
        paymentMethod: paymentMethod || "Bank Transfer",
        receiptRef: receiptRef || "",
        status: "cleared",
        notes: notes || "",
        recordedByUserName: context.user.name,
      });

      // Update actual cost on linked BudgetItem (BR-11)
      if (budgetItemId && mongoose.Types.ObjectId.isValid(budgetItemId)) {
        await BudgetItemModel.updateOne(
          { _id: new mongoose.Types.ObjectId(budgetItemId), organizationId: context.organizationId },
          { $inc: { actualCost: Number(amount) } }
        );
      }

      await logAuditEvent({
        organizationId: context.organizationId,
        actorUserId: context.user._id,
        actorEmail: context.user.email,
        action: "finance.expense_recorded",
        targetType: "Expense",
        targetId: expense._id.toString(),
        details: { title: expense.title, amount: expense.amount, paidTo: expense.paidTo },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({ success: true, expense });
    }

    if (action === "add_invoice") {
      const { eventId, clientId, clientName, invoiceNumber, title, totalAmount, dueDate, isSharedWithClient } = body;
      if (!eventId || !clientName || !totalAmount || !dueDate) {
        return NextResponse.json(
          { error: "VALIDATION_FAILED", message: "Event, client name, amount, and due date are required" },
          { status: 400 }
        );
      }

      const invNum = invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
      const invoice = await InvoiceModel.create({
        organizationId: context.organizationId,
        eventId: new mongoose.Types.ObjectId(eventId),
        clientId: clientId ? new mongoose.Types.ObjectId(clientId) : undefined,
        clientName: clientName.trim(),
        invoiceNumber: invNum,
        title: title || `Invoice for Event Milestone`,
        totalAmount: Number(totalAmount),
        paidAmount: 0,
        currency: context.organization.currency || "USD",
        issueDate: new Date(),
        dueDate: new Date(dueDate),
        status: "Issued",
        isSharedWithClient: Boolean(isSharedWithClient),
        payments: [],
      });

      return NextResponse.json({ success: true, invoice });
    }

    if (action === "record_payment") {
      const { invoiceId, amount, paymentMethod, reference, notes } = body;
      if (!invoiceId || !amount) {
        return NextResponse.json({ error: "VALIDATION_FAILED", message: "Invoice ID and payment amount required" }, { status: 400 });
      }

      const invoice = await InvoiceModel.findOne({
        _id: new mongoose.Types.ObjectId(invoiceId),
        organizationId: context.organizationId,
      });

      if (!invoice) return NextResponse.json({ error: "NOT_FOUND", message: "Invoice not found" }, { status: 404 });

      const payAmt = Number(amount);
      invoice.payments.push({
        id: Math.random().toString(36).substring(2, 9),
        date: new Date(),
        amount: payAmt,
        currency: invoice.currency,
        paymentMethod: paymentMethod || "Bank Transfer",
        reference: reference || "",
        notes: notes || "",
        recordedBy: context.user.name,
      });

      invoice.paidAmount += payAmt;
      if (invoice.paidAmount >= invoice.totalAmount) {
        invoice.status = "Paid";
      } else if (invoice.paidAmount > 0) {
        invoice.status = "Partially Paid";
      }

      await invoice.save();

      await logAuditEvent({
        organizationId: context.organizationId,
        actorUserId: context.user._id,
        actorEmail: context.user.email,
        action: "finance.payment_recorded",
        targetType: "Invoice",
        targetId: invoice._id.toString(),
        details: { invoiceNumber: invoice.invoiceNumber, paymentAmount: payAmt, totalPaid: invoice.paidAmount },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({ success: true, invoice });
    }

    return NextResponse.json({ error: "UNKNOWN_ACTION", message: "Valid action required" }, { status: 400 });
  } catch (error) {
    console.error("Finance Operation Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to process finance request" }, { status: 500 });
  }
}
