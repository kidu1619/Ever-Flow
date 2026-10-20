"use client";

import { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Printer,
  Plus,
  CheckCircle2,
  MapPin,
  Briefcase,
  DollarSign,
  ChevronRight,
  User,
  X,
  FileSpreadsheet,
} from "lucide-react";

interface CalendarEntry {
  id: string;
  type: "event" | "task" | "vendor_booking" | "payment_due";
  title: string;
  date: string;
  endDate?: string;
  eventId?: string;
  eventName?: string;
  status?: string;
  assigneeOrVendor?: string;
  hasConflict?: boolean;
}

interface RunSheetItem {
  id: string;
  time: string;
  activity: string;
  location: string;
  responsible: string;
  vendor: string;
  notes: string;
}

interface CalendarViewProps {
  events: { id: string; name: string; startDate: string; venue: string }[];
  notify: (text: string, type?: "success" | "error") => void;
  canManage: boolean;
  onNavigateTab?: (tab: string) => void;
}

export default function CalendarView({ events, notify, canManage, onNavigateTab }: CalendarViewProps) {
  const [activeTab, setActiveTab] = useState<"calendar" | "runsheet">("calendar");
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [staffConflicts, setStaffConflicts] = useState<{ staffName: string; details: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedEventId, setSelectedEventId] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  // Payment Recording Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState<CalendarEntry | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payRef, setPayRef] = useState("");
  const [recordingPay, setRecordingPay] = useState(false);

  // Quick Invoice / Milestone Creation State
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [newInvEventId, setNewInvEventId] = useState(events[0]?.id || "");
  const [newInvClientName, setNewInvClientName] = useState("");
  const [newInvTitle, setNewInvTitle] = useState("");
  const [newInvAmount, setNewInvAmount] = useState("");
  const [newInvDueDate, setNewInvDueDate] = useState("");
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Run Sheet State
  const [runSheetEventId, setRunSheetEventId] = useState<string>(events[0]?.id || "");
  const [runSheetItems, setRunSheetItems] = useState<RunSheetItem[]>([]);
  const [runSheetEventName, setRunSheetEventName] = useState("");
  const [showAddRunSheetModal, setShowAddRunSheetModal] = useState(false);

  // New run sheet item form
  const [rsTime, setRsTime] = useState("");
  const [rsActivity, setRsActivity] = useState("");
  const [rsLocation, setRsLocation] = useState("");
  const [rsResponsible, setRsResponsible] = useState("");
  const [rsVendor, setRsVendor] = useState("");
  const [rsNotes, setRsNotes] = useState("");

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const url = selectedEventId !== "All" ? `/api/calendar?eventId=${selectedEventId}` : "/api/calendar";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setStaffConflicts(data.staffConflicts || []);
      }
    } catch (err) {
      console.error("Failed to load calendar", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRunSheet = async (eventId: string) => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/run-sheets?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setRunSheetItems(data.runSheet || []);
        setRunSheetEventName(data.eventName || "");
      }
    } catch (err) {
      console.error("Failed to load run sheet", err);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [selectedEventId]);

  useEffect(() => {
    if (runSheetEventId) {
      loadRunSheet(runSheetEventId);
    } else if (events.length > 0) {
      setRunSheetEventId(events[0].id);
      loadRunSheet(events[0].id);
    }
  }, [runSheetEventId, events]);

  const handleAddRunSheetItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runSheetEventId) return;
    try {
      const res = await fetch("/api/run-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: runSheetEventId,
          time: rsTime,
          activity: rsActivity,
          location: rsLocation,
          responsible: rsResponsible,
          vendor: rsVendor,
          notes: rsNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Run sheet item added!`);
      setShowAddRunSheetModal(false);
      setRsTime("");
      setRsActivity("");
      setRsLocation("");
      setRsResponsible("");
      setRsVendor("");
      setRsNotes("");
      loadRunSheet(runSheetEventId);
    } catch (err: any) {
      notify(err.message || "Failed to add run sheet item", "error");
    }
  };

  const handleRecordCalendarPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentItem) return;
    try {
      setRecordingPay(true);
      if (selectedPaymentItem.id.startsWith("bkpay-")) {
        // Record vendor payment obligation as an expense
        const res = await fetch("/api/finances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_expense",
            eventId: selectedPaymentItem.eventId,
            title: selectedPaymentItem.title,
            amount: Number(payAmount),
            paidTo: selectedPaymentItem.assigneeOrVendor || "Vendor",
            paymentMethod: payMethod,
            receiptRef: payRef,
            category: "Vendor Payment",
            notes: `Recorded from Unified Calendar for ${selectedPaymentItem.title}`,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error);

        notify(`Vendor payment of $${Number(payAmount).toLocaleString()} recorded successfully!`);
      } else {
        // Record client invoice milestone payment
        const invoiceId = selectedPaymentItem.id.replace("inv-", "");
        const res = await fetch("/api/finances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "record_payment",
            invoiceId,
            amount: Number(payAmount),
            paymentMethod: payMethod,
            reference: payRef,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error);

        notify(`Invoice payment of $${Number(payAmount).toLocaleString()} recorded successfully!`);
      }

      setShowPaymentModal(false);
      setSelectedPaymentItem(null);
      setPayAmount("");
      setPayRef("");
      loadCalendar();
    } catch (err: any) {
      notify(err.message || "Failed to record payment", "error");
    } finally {
      setRecordingPay(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEventId =
      (selectedEventId !== "All" ? selectedEventId : newInvEventId) || events[0]?.id;
    if (!targetEventId) {
      notify("Please select an event for the invoice", "error");
      return;
    }
    if (!newInvClientName.trim() || !newInvAmount || !newInvDueDate) {
      notify("Please fill all required invoice fields", "error");
      return;
    }

    try {
      setCreatingInvoice(true);
      const res = await fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_invoice",
          eventId: targetEventId,
          clientName: newInvClientName.trim(),
          title: newInvTitle.trim() || "Event Payment Milestone",
          totalAmount: Number(newInvAmount),
          dueDate: newInvDueDate,
          isSharedWithClient: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Invoice payment milestone created successfully!`);
      setShowAddInvoiceModal(false);
      setNewInvClientName("");
      setNewInvTitle("");
      setNewInvAmount("");
      setNewInvDueDate("");
      loadCalendar();
    } catch (err: any) {
      notify(err.message || "Failed to create invoice", "error");
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredEntries = entries.filter((item) => {
    if (typeFilter !== "All" && item.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 font-serif">Calendar, Scheduling & Run Sheets</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#E06B53]/15 text-[#E06B53]">
              Calendar & Run Sheet Schedule
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Organization-wide timeline, staff conflict alerts, and event-day execution run sheets.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-stone-200/70 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === "calendar" ? "bg-white text-slate-900 shadow-xs" : "text-stone-600 hover:text-slate-900"
              }`}
            >
              Unified Calendar ({filteredEntries.length})
            </button>
            <button
              onClick={() => setActiveTab("runsheet")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === "runsheet" ? "bg-white text-slate-900 shadow-xs" : "text-stone-600 hover:text-slate-900"
              }`}
            >
              Event Run Sheets
            </button>
          </div>
        </div>
      </div>

      {/* Staff Conflict Warning Banner */}
      {staffConflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-950 space-y-1.5">
          <div className="flex items-center space-x-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Staff Resource Allocation Warning</span>
          </div>
          {staffConflicts.map((c, i) => (
            <div key={i} className="text-[11px] text-amber-800">
              • <strong>{c.staffName}:</strong> {c.details}
            </div>
          ))}
        </div>
      )}

      {/* UNIFIED CALENDAR VIEW */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-slate-800 focus:outline-none"
              >
                <option value="All">All Workspace Events</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>

              <div className="flex items-center space-x-1 text-xs">
                {["All", "event", "task", "vendor_booking", "payment_due"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg font-medium capitalize transition ${
                      typeFilter === t
                        ? "bg-slate-900 text-white"
                        : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => {
                  if (selectedEventId !== "All") {
                    setNewInvEventId(selectedEventId);
                  }
                  setShowAddInvoiceModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
                title="Create a new payment milestone or invoice"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Invoice / Milestone</span>
              </button>
            )}
          </div>

          {/* Timeline List View */}
          <div className="space-y-2.5">
            {loading ? (
              <div className="p-12 text-center text-xs text-stone-400">Loading schedule...</div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-3xl border border-stone-200/80 shadow-2xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                  {typeFilter === "payment_due" ? (
                    <DollarSign className="w-6 h-6 text-stone-400" />
                  ) : typeFilter === "task" ? (
                    <Clock className="w-6 h-6 text-stone-400" />
                  ) : typeFilter === "vendor_booking" ? (
                    <Briefcase className="w-6 h-6 text-stone-400" />
                  ) : (
                    <CalendarIcon className="w-6 h-6 text-stone-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {typeFilter === "payment_due"
                      ? "No payment milestones found for this filter"
                      : "No schedule items found for this filter"}
                  </div>
                  <p className="text-[11px] text-stone-500 max-w-sm mx-auto mt-1">
                    {typeFilter === "payment_due"
                      ? "You can create an invoice milestone or book vendors with contracted fees to display payment dues here."
                      : "Try selecting another category or view all workspace items."}
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 pt-1">
                  {typeFilter === "payment_due" && canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedEventId !== "All") {
                          setNewInvEventId(selectedEventId);
                        }
                        setShowAddInvoiceModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#E06B53] text-white text-xs font-semibold hover:bg-[#c95841] transition shadow-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Payment Milestone</span>
                    </button>
                  )}
                  {typeFilter !== "All" && (
                    <button
                      type="button"
                      onClick={() => setTypeFilter("All")}
                      className="px-3.5 py-1.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition cursor-pointer"
                    >
                      Show All Schedule Items
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredEntries.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-300 transition flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center space-x-3.5 truncate pr-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === "event"
                          ? "bg-[#E06B53]/15 text-[#E06B53]"
                          : item.type === "task"
                          ? "bg-blue-50 text-blue-600"
                          : item.type === "vendor_booking"
                          ? "bg-purple-50 text-purple-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {item.type === "event" && <CalendarIcon className="w-4 h-4" />}
                      {item.type === "task" && <Clock className="w-4 h-4" />}
                      {item.type === "vendor_booking" && <Briefcase className="w-4 h-4" />}
                      {item.type === "payment_due" && <DollarSign className="w-4 h-4" />}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 truncate">{item.title}</span>
                        {item.hasConflict && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">
                            Conflict
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-stone-500 mt-0.5">
                        {item.eventName && <span>Event: {item.eventName}</span>}
                        {item.assigneeOrVendor && <span>• Assigned: {item.assigneeOrVendor}</span>}
                        {item.status && <span className="capitalize">• {item.status}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {item.type === "payment_due" && (
                      <div className="flex items-center space-x-1.5">
                        {item.status?.toLowerCase() === "paid" ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Paid</span>
                          </span>
                        ) : (
                          canManage && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPaymentItem(item);
                                setShowPaymentModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center space-x-1 cursor-pointer"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>{item.id.startsWith("bkpay-") ? "Record Vendor Pay" : "Record Payment"}</span>
                            </button>
                          )
                        )}
                        {onNavigateTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab("finances")}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
                            title="Go to Finances & Invoices"
                          >
                            <span>Finances</span>
                            <ChevronRight className="w-3 h-3 text-stone-400" />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-800">
                        {new Date(item.date).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* EVENT RUN SHEET VIEW (FR-44) */}
      {activeTab === "runsheet" && (
        <div className="space-y-4">
          {/* Event Selector & Print Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700">Select Event:</label>
              <select
                value={runSheetEventId}
                onChange={(e) => setRunSheetEventId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-slate-800 focus:outline-none"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Run Sheet</span>
              </button>

              {canManage && (
                <button
                  onClick={() => setShowAddRunSheetModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Timed Item</span>
                </button>
              )}
            </div>
          </div>

          {/* Printable Run Sheet Sheet */}
          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
            <div className="border-b border-stone-200 pb-3 flex justify-between items-end">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#E06B53]">
                  Event-Day Production Run Sheet
                </span>
                <h3 className="text-lg font-bold text-slate-900 font-serif">{runSheetEventName}</h3>
              </div>
              <span className="text-xs font-mono text-stone-400">EverFlow Operations</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-20">Time</th>
                  <th className="py-2.5 px-3">Activity & Agenda</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Responsible Party</th>
                  <th className="py-2.5 px-3">Vendor / Tech</th>
                  <th className="py-2.5 px-3">Operational Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-slate-700">
                {runSheetItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      No run sheet items created for this event yet.
                    </td>
                  </tr>
                ) : (
                  runSheetItems.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{item.time}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{item.activity}</td>
                      <td className="py-3 px-3 text-stone-500">{item.location || "—"}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{item.responsible || "—"}</td>
                      <td className="py-3 px-3 text-stone-600">{item.vendor || "—"}</td>
                      <td className="py-3 px-3 text-[11px] text-stone-500 italic">{item.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD RUN SHEET ITEM */}
      {showAddRunSheetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">Add Timed Run Sheet Item</h3>
              <button onClick={() => setShowAddRunSheetModal(false)} className="text-stone-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRunSheetItem} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Time *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="18:30"
                    value={rsTime}
                    onChange={(e) => setRsTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Activity / Milestone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cocktail Hour & Photo Reception"
                    value={rsActivity}
                    onChange={(e) => setRsActivity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Location / Zone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Glass Terrace"
                    value={rsLocation}
                    onChange={(e) => setRsLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Responsible Staff
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sophia Chen"
                    value={rsResponsible}
                    onChange={(e) => setRsResponsible(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Vendor Associated
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grand Cru Catering"
                  value={rsVendor}
                  onChange={(e) => setRsVendor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Operational Details & Cue Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Cue ambient background playlist; dim terrace lighting 50%..."
                  value={rsNotes}
                  onChange={(e) => setRsNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRunSheetModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E06B53] text-white font-semibold hover:bg-[#c95841]"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL (FR-50 from Payment Due Timeline) */}
      {showPaymentModal && selectedPaymentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {selectedPaymentItem.id.startsWith("bkpay-") ? "Record Vendor Payment" : "Record Payment for Milestone"}
                  </h3>
                  <p className="text-[11px] text-stone-500 truncate max-w-[280px]">
                    {selectedPaymentItem.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPaymentItem(null);
                }}
                className="text-stone-400 hover:text-slate-600 transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60 text-xs text-stone-600 space-y-1">
              <div><span className="font-semibold text-slate-700">Due Date:</span> {new Date(selectedPaymentItem.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</div>
              {selectedPaymentItem.eventName && (
                <div><span className="font-semibold text-slate-700">Client / Event:</span> {selectedPaymentItem.eventName}</div>
              )}
            </div>

            <form onSubmit={handleRecordCalendarPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Payment Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 50000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                >
                  <option value="Bank Transfer">Bank Transfer (Wire / ACH)</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Stripe">Stripe</option>
                  <option value="Check">Check</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. WIRE-892301 or TXN-449"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPaymentItem(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPay}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {recordingPay ? <span>Recording...</span> : <span>Confirm Payment</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ADD INVOICE / PAYMENT MILESTONE MODAL (FR-42/FR-50) */}
      {showAddInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[#E06B53]/15 text-[#E06B53] flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Create Payment Milestone / Invoice</h3>
                  <p className="text-[11px] text-stone-500">Record an invoice milestone to track payment due dates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddInvoiceModal(false)}
                className="text-stone-400 hover:text-slate-600 transition p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Event *
                </label>
                <select
                  value={newInvEventId || (selectedEventId !== "All" ? selectedEventId : events[0]?.id || "")}
                  onChange={(e) => setNewInvEventId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/20 text-slate-900"
                  required
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Client / Payee Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fenu & Ken (Host Client)"
                  value={newInvClientName}
                  onChange={(e) => setNewInvClientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/20 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50% Contract Deposit or Final Reception Balance"
                  value={newInvTitle}
                  onChange={(e) => setNewInvTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/20 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 35000"
                    value={newInvAmount}
                    onChange={(e) => setNewInvAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/20 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newInvDueDate}
                    onChange={(e) => setNewInvDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/20 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingInvoice}
                  className="px-5 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white font-semibold transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {creatingInvoice ? <span>Creating...</span> : <span>Save Milestone</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
