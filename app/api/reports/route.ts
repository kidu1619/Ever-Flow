import { NextRequest, NextResponse } from "next/server";
import { requireTenantGuard } from "@/lib/auth/tenantGuard";
import { EventModel } from "@/lib/models/Event";
import { TaskModel } from "@/lib/models/Task";
import { BudgetItemModel } from "@/lib/models/BudgetItem";
import { ExpenseModel } from "@/lib/models/Expense";
import { InvoiceModel } from "@/lib/models/Invoice";
import { VendorBookingModel } from "@/lib/models/VendorBooking";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireTenantGuard(req, "org:settings:view");
  if (!guard.success) return guard.response;
  const { context } = guard;

  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    const [events, tasks, budgetItems, expenses, invoices, bookings] = await Promise.all([
      EventModel.find({ organizationId: context.organizationId, deletedAt: null }).sort({ startDate: 1 }).lean(),
      TaskModel.find({ organizationId: context.organizationId }).lean(),
      BudgetItemModel.find({ organizationId: context.organizationId, deletedAt: null }).lean(),
      ExpenseModel.find({ organizationId: context.organizationId, deletedAt: null }).lean(),
      InvoiceModel.find({ organizationId: context.organizationId, deletedAt: null }).lean(),
      VendorBookingModel.find({ organizationId: context.organizationId, deletedAt: null }).populate("vendorId", "name").lean(),
    ]);

    // 1. Events by Category & Status breakdown
    const categoryBreakdown: Record<string, number> = {};
    const statusBreakdown: Record<string, number> = {};
    for (const ev of events) {
      categoryBreakdown[ev.category] = (categoryBreakdown[ev.category] || 0) + 1;
      statusBreakdown[ev.status] = (statusBreakdown[ev.status] || 0) + 1;
    }

    // 2. Budget vs Actual Variance
    const totalEstimated = budgetItems.reduce((acc, b) => acc + (b.estimatedCost || 0), 0);
    const totalContracted = budgetItems.reduce((acc, b) => acc + (b.contractedCost || 0), 0);
    const totalActual = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const variance = totalEstimated - totalActual;

    // 3. Client Payment Health
    const totalInvoiced = invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
    const totalCollected = invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
    const outstandingClientBalance = Math.max(0, totalInvoiced - totalCollected);

    // 4. Staff Task Completion
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const blockedTasks = tasks.filter((t) => t.isBlocked).length;
    const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== "completed").length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Per-event tabular summary
    const eventReports = events.map((ev) => {
      const evBudget = budgetItems.filter((b) => b.eventId?.toString() === ev._id.toString());
      const evExpenses = expenses.filter((e) => e.eventId?.toString() === ev._id.toString());
      const evTasks = tasks.filter((t) => t.eventId?.toString() === ev._id.toString());
      const evInvoices = invoices.filter((i) => i.eventId?.toString() === ev._id.toString());

      const est = evBudget.reduce((a, b) => a + (b.estimatedCost || 0), 0) || ev.budget || 0;
      const act = evExpenses.reduce((a, e) => a + (e.amount || 0), 0);
      const invAmt = evInvoices.reduce((a, i) => a + (i.totalAmount || 0), 0);
      const paidAmt = evInvoices.reduce((a, i) => a + (i.paidAmount || 0), 0);
      const tDone = evTasks.filter((t) => t.status === "completed").length;

      return {
        id: ev._id.toString(),
        name: ev.name,
        category: ev.category,
        status: ev.status,
        venue: ev.venue,
        startDate: new Date(ev.startDate).toISOString().slice(0, 10),
        estimatedBudget: est,
        actualSpent: act,
        variance: est - act,
        invoiced: invAmt,
        collected: paidAmt,
        outstanding: Math.max(0, invAmt - paidAmt),
        tasksCompleted: `${tDone} / ${evTasks.length}`,
        readinessScore: ev.readinessScore || 0,
      };
    });

    if (format === "csv") {
      const headers = "Event Name,Category,Status,Venue,Start Date,Estimated Budget,Actual Spent,Variance,Invoiced,Collected,Outstanding,Tasks Completed,Readiness";
      const rows = eventReports.map((r) =>
        `"${r.name}","${r.category}","${r.status}","${r.venue}","${r.startDate}",${r.estimatedBudget},${r.actualSpent},${r.variance},${r.invoiced},${r.collected},${r.outstanding},"${r.tasksCompleted}",${r.readinessScore}%`
      );
      const csvContent = [headers, ...rows].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="everflow-${context.organization.slug}-report-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      organizationName: context.organization.name,
      currency: context.organization.currency || "USD",
      metrics: {
        totalEvents: events.length,
        categoryBreakdown,
        statusBreakdown,
        totalEstimated,
        totalContracted,
        totalActual,
        variance,
        totalInvoiced,
        totalCollected,
        outstandingClientBalance,
        totalTasks,
        completedTasks,
        blockedTasks,
        overdueTasks,
        taskCompletionRate,
        vendorBookingsCount: bookings.length,
      },
      eventReports,
    });
  } catch (error) {
    console.error("Generate Reports Error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to generate organization reports" }, { status: 500 });
  }
}
