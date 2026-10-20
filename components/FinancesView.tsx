"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Plus,
  Receipt,
  TrendingUp,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Building2,
  X,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface BudgetItem {
  id: string;
  event: { id: string; name: string; category: string };
  category: string;
  title: string;
  estimatedCost: number;
  contractedCost: number;
  actualCost: number;
  vendorName?: string;
  notes?: string;
}

interface ExpenseItem {
  id: string;
  event: { id: string; name: string };
  title: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  paidTo: string;
  paymentMethod: string;
  receiptRef?: string;
  status: string;
  recordedByUserName: string;
}

interface InvoiceItem {
  id: string;
  event: { id: string; name: string };
  invoiceNumber: string;
  clientName: string;
  title: string;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: "Draft" | "Issued" | "Partially Paid" | "Paid" | "Overdue";
  isSharedWithClient: boolean;
  payments: { date: string; amount: number; paymentMethod: string; reference: string }[];
}

interface FinancialSummary {
  totalEstimated: number;
  totalContracted: number;
  totalActualExpenses: number;
  totalInvoiced: number;
  totalPaymentsReceived: number;
  outstandingClientBalance: number;
  variance: number;
  utilizationPercent: number;
}

interface FinancesViewProps {
  events: { id: string; name: string; startDate: string; venue: string }[];
  notify: (text: string, type?: "success" | "error") => void;
  canManage: boolean;
}

export default function FinancesView({ events, notify, canManage }: FinancesViewProps) {
  const [activeTab, setActiveTab] = useState<"budget" | "expenses" | "invoices">("budget");
  const [selectedEventId, setSelectedEventId] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalEstimated: 0,
    totalContracted: 0,
    totalActualExpenses: 0,
    totalInvoiced: 0,
    totalPaymentsReceived: 0,
    outstandingClientBalance: 0,
    variance: 0,
    utilizationPercent: 0,
  });

  // Modals
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<InvoiceItem | null>(null);

  // Forms
  const [bEventId, setBEventId] = useState("");
  const [bCategory, setBCategory] = useState("Venue");
  const [bTitle, setBTitle] = useState("");
  const [bEstCost, setBEstCost] = useState("");
  const [bContCost, setBContCost] = useState("");
  const [bVendor, setBVendor] = useState("");

  const [eEventId, setEEventId] = useState("");
  const [eTitle, setETitle] = useState("");
  const [eCategory, setECategory] = useState("General");
  const [eAmount, setEAmount] = useState("");
  const [ePaidTo, setEPaidTo] = useState("");
  const [eMethod, setEMethod] = useState("Bank Transfer");
  const [eReceipt, setEReceipt] = useState("");

  const [iEventId, setIEventId] = useState("");
  const [iClientName, setIClientName] = useState("");
  const [iTitle, setITitle] = useState("");
  const [iAmount, setIAmount] = useState("");
  const [iDueDate, setIDueDate] = useState("");
  const [iShared, setIShared] = useState(true);

  const [pAmount, setPAmount] = useState("");
  const [pMethod, setPMethod] = useState("Bank Transfer");
  const [pRef, setPRef] = useState("");

  const loadFinances = async () => {
    try {
      setLoading(true);
      const url = selectedEventId !== "All" ? `/api/finances?eventId=${selectedEventId}` : "/api/finances";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBudgetItems(data.budgetItems || []);
        setExpenses(data.expenses || []);
        setInvoices(data.invoices || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to load finances", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinances();
  }, [selectedEventId]);

  const handleCreateBudgetItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_budget_item",
          eventId: bEventId,
          category: bCategory,
          title: bTitle,
          estimatedCost: Number(bEstCost) || 0,
          contractedCost: Number(bContCost) || 0,
          vendorName: bVendor,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Budget item "${bTitle}" added!`);
      setShowAddBudgetModal(false);
      setBTitle("");
      setBEstCost("");
      setBContCost("");
      setBVendor("");
      loadFinances();
    } catch (err: any) {
      notify(err.message || "Failed to create budget item", "error");
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_expense",
          eventId: eEventId,
          title: eTitle,
          category: eCategory,
          amount: Number(eAmount),
          paidTo: ePaidTo,
          paymentMethod: eMethod,
          receiptRef: eReceipt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Expense of $${Number(eAmount).toLocaleString()} recorded!`);
      setShowAddExpenseModal(false);
      setETitle("");
      setEAmount("");
      setEPaidTo("");
      setEReceipt("");
      loadFinances();
    } catch (err: any) {
      notify(err.message || "Failed to record expense", "error");
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_invoice",
          eventId: iEventId,
          clientName: iClientName,
          title: iTitle,
          totalAmount: Number(iAmount),
          dueDate: iDueDate,
          isSharedWithClient: iShared,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Invoice created for $${Number(iAmount).toLocaleString()}!`);
      setShowAddInvoiceModal(false);
      setIClientName("");
      setITitle("");
      setIAmount("");
      setIDueDate("");
      loadFinances();
    } catch (err: any) {
      notify(err.message || "Failed to create invoice", "error");
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPay) return;
    try {
      const res = await fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_payment",
          invoiceId: selectedInvoiceForPay.id,
          amount: Number(pAmount),
          paymentMethod: pMethod,
          reference: pRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Payment of $${Number(pAmount).toLocaleString()} recorded on invoice!`);
      setShowPaymentModal(false);
      setPAmount("");
      setPRef("");
      loadFinances();
    } catch (err: any) {
      notify(err.message || "Failed to record payment", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 font-serif">Budget & Financial Tracking</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#E06B53]/15 text-[#E06B53]">
              Budget & Financial Management
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Categorized line items, expense receipts, client invoices, payment milestones, and variance analysis.
          </p>
        </div>

        {/* Event Filter & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-slate-800 focus:outline-none"
          >
            <option value="All">All Workspace Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>

          {canManage && (
            <>
              <button
                onClick={() => setShowAddBudgetModal(true)}
                className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Budget Item</span>
              </button>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1"
              >
                <Receipt className="w-3.5 h-3.5 text-[#E06B53]" />
                <span>Record Expense</span>
              </button>
              <button
                onClick={() => setShowAddInvoiceModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Invoice</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Estimated Budget</span>
          <div className="text-xl font-bold text-slate-900 font-mono">
            ${summary.totalEstimated.toLocaleString()}
          </div>
          <span className="text-[10px] text-stone-500">Contracted: ${summary.totalContracted.toLocaleString()}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Actual Spent</span>
          <div className="text-xl font-bold text-[#E06B53] font-mono">
            ${summary.totalActualExpenses.toLocaleString()}
          </div>
          <span className="text-[10px] text-stone-500">Utilization: {summary.utilizationPercent}%</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Budget Variance</span>
          <div
            className={`text-xl font-bold font-mono flex items-center space-x-1 ${
              summary.variance >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {summary.variance >= 0 ? (
              <ArrowDownRight className="w-5 h-5 text-emerald-500" />
            ) : (
              <ArrowUpRight className="w-5 h-5 text-rose-500" />
            )}
            <span>${Math.abs(summary.variance).toLocaleString()}</span>
          </div>
          <span className="text-[10px] text-stone-500">
            {summary.variance >= 0 ? "Under allocated budget" : "Over allocated budget"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Client Receivables</span>
          <div className="text-xl font-bold text-blue-600 font-mono">
            ${summary.outstandingClientBalance.toLocaleString()}
          </div>
          <span className="text-[10px] text-stone-500">
            Collected: ${summary.totalPaymentsReceived.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-stone-200 space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("budget")}
          className={`pb-3 transition flex items-center space-x-2 ${
            activeTab === "budget"
              ? "border-b-2 border-[#E06B53] text-slate-900"
              : "text-stone-500 hover:text-slate-800"
          }`}
        >
          <span>Budget Allocations</span>
          <span className="px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 text-[10px] font-mono">
            {budgetItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("expenses")}
          className={`pb-3 transition flex items-center space-x-2 ${
            activeTab === "expenses"
              ? "border-b-2 border-[#E06B53] text-slate-900"
              : "text-stone-500 hover:text-slate-800"
          }`}
        >
          <span>Expense Receipts</span>
          <span className="px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 text-[10px] font-mono">
            {expenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`pb-3 transition flex items-center space-x-2 ${
            activeTab === "invoices"
              ? "border-b-2 border-[#E06B53] text-slate-900"
              : "text-stone-500 hover:text-slate-800"
          }`}
        >
          <span>Client Invoices & Milestones</span>
          <span className="px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 text-[10px] font-mono">
            {invoices.length}
          </span>
        </button>
      </div>

      {/* SUB-VIEW 1: BUDGET LINES */}
      {activeTab === "budget" && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200/80 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Line Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Estimated</th>
                <th className="py-3 px-4">Contracted</th>
                <th className="py-3 px-4">Actual Spent</th>
                <th className="py-3 px-4">Supplier / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-slate-700">
              {budgetItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    No budget lines defined yet.
                  </td>
                </tr>
              ) : (
                budgetItems.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/50 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{b.title}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-medium">
                        {b.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600 font-medium">{b.event?.name}</td>
                    <td className="py-3.5 px-4 font-mono font-medium">${b.estimatedCost.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-mono font-medium">${b.contractedCost.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#E06B53]">
                      ${b.actualCost.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-stone-500 text-[11px]">
                      {b.vendorName || b.notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-VIEW 2: EXPENSES */}
      {activeTab === "expenses" && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200/80 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Expense Title</th>
                <th className="py-3 px-4">Paid To</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Receipt Ref</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-slate-700">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-stone-50/50 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{e.title}</div>
                      <div className="text-[10px] text-stone-400">{e.event?.name}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{e.paidTo}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ${e.amount.toLocaleString()} {e.currency}
                    </td>
                    <td className="py-3.5 px-4 text-stone-500">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">{e.paymentMethod}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500">
                      {e.receiptRef || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-VIEW 3: INVOICES & MILESTONES */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200/80 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice # & Title</th>
                <th className="py-3 px-4">Client Stakeholder</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Paid Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-slate-700">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    No client invoices issued.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50/50 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="font-mono text-xs text-stone-800">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-stone-500 font-normal">{inv.title}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{inv.clientName}</td>
                    <td className="py-3.5 px-4 text-stone-600">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ${inv.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                      ${inv.paidAmount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          inv.status === "Paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : inv.status === "Partially Paid"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {inv.status !== "Paid" && canManage && (
                        <button
                          onClick={() => {
                            setSelectedInvoiceForPay(inv);
                            setShowPaymentModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-slate-900 hover:text-white text-slate-800 text-[11px] font-semibold transition"
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: ADD BUDGET LINE ITEM */}
      {showAddBudgetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">Add Budget Line Item</h3>
              <button onClick={() => setShowAddBudgetModal(false)} className="text-stone-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBudgetItem} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Event *
                </label>
                <select
                  required
                  value={bEventId}
                  onChange={(e) => setBEventId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white"
                >
                  <option value="">-- Choose an event --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Category *
                  </label>
                  <select
                    value={bCategory}
                    onChange={(e) => setBCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white"
                  >
                    <option value="Venue">Venue</option>
                    <option value="Catering">Catering</option>
                    <option value="Production">Production</option>
                    <option value="Design & Florals">Design & Florals</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Staffing">Staffing</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Contingency">Contingency</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grand Cru"
                    value={bVendor}
                    onChange={(e) => setBVendor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Line Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grand Ballroom Rental & Clean-up"
                  value={bTitle}
                  onChange={(e) => setBTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Estimated Cost ($) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="25000"
                    value={bEstCost}
                    onChange={(e) => setBEstCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Contracted Cost ($)
                  </label>
                  <input
                    type="number"
                    placeholder="23500"
                    value={bContCost}
                    onChange={(e) => setBContCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBudgetModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E06B53] text-white font-semibold hover:bg-[#c95841]"
                >
                  Save Budget Line
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD EXPENSE (FR-51) */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">Record Actual Expense</h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="text-stone-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Event *
                </label>
                <select
                  required
                  value={eEventId}
                  onChange={(e) => setEEventId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white"
                >
                  <option value="">-- Choose an event --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Venue Load-in Deposit"
                  value={eTitle}
                  onChange={(e) => setETitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Paid To / Vendor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Sound LLC"
                    value={ePaidTo}
                    onChange={(e) => setEPaidTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="12000"
                    value={eAmount}
                    onChange={(e) => setEAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={eMethod}
                    onChange={(e) => setEMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white"
                  >
                    <option value="Bank Transfer">Bank Transfer / Wire</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Check">Check</option>
                    <option value="Cash">Cash</option>
                    <option value="ACH">ACH</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Receipt / Invoice Ref
                  </label>
                  <input
                    type="text"
                    placeholder="REC-89211"
                    value={eReceipt}
                    onChange={(e) => setEReceipt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E06B53] text-white font-semibold hover:bg-[#c95841]"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE INVOICE (FR-51, FR-53) */}
      {showAddInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">Create Client Invoice</h3>
              <button onClick={() => setShowAddInvoiceModal(false)} className="text-stone-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Event *
                </label>
                <select
                  required
                  value={iEventId}
                  onChange={(e) => setIEventId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white"
                >
                  <option value="">-- Choose an event --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Client Stakeholder / Entity *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aura Endowment Board"
                  value={iClientName}
                  onChange={(e) => setIClientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Invoice Title / Milestone *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Final Event Balance & Wine Surcharge"
                  value={iTitle}
                  onChange={(e) => setITitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Invoice Amount ($) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="95000"
                    value={iAmount}
                    onChange={(e) => setIAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={iDueDate}
                    onChange={(e) => setIDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <input
                  type="checkbox"
                  id="sharedWithClient"
                  checked={iShared}
                  onChange={(e) => setIShared(e.target.checked)}
                  className="rounded text-[#E06B53] focus:ring-[#E06B53]"
                />
                <label htmlFor="sharedWithClient" className="text-xs text-slate-700 cursor-pointer">
                  Mark as <strong>Shared With Client</strong> (Client Portal Visibility)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E06B53] text-white font-semibold hover:bg-[#c95841]"
                >
                  Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD CLIENT PAYMENT */}
      {showPaymentModal && selectedInvoiceForPay && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">Record Payment Received</h3>
                <span className="text-[10px] font-mono text-stone-500">
                  {selectedInvoiceForPay.invoiceNumber} • {selectedInvoiceForPay.clientName}
                </span>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-stone-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 pt-4 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <div className="flex justify-between text-stone-500">
                  <span>Total Invoiced</span>
                  <span className="font-mono font-bold text-slate-800">
                    ${selectedInvoiceForPay.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Already Paid</span>
                  <span className="font-mono font-bold text-emerald-600">
                    ${selectedInvoiceForPay.paidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-stone-800 font-bold border-t border-stone-200 pt-1">
                  <span>Remaining Due</span>
                  <span className="font-mono text-[#E06B53]">
                    ${Math.max(0, selectedInvoiceForPay.totalAmount - selectedInvoiceForPay.paidAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Payment Amount ($) *
                </label>
                <input
                  type="number"
                  required
                  placeholder={String(selectedInvoiceForPay.totalAmount - selectedInvoiceForPay.paidAmount)}
                  value={pAmount}
                  onChange={(e) => setPAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Method *
                  </label>
                  <select
                    value={pMethod}
                    onChange={(e) => setPMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white"
                  >
                    <option value="Bank Transfer">Bank Transfer / Wire</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Check">Check</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Reference / Confirmation
                  </label>
                  <input
                    type="text"
                    placeholder="WIRE-99212"
                    value={pRef}
                    onChange={(e) => setPRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
