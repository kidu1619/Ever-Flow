"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  Sparkles,
  Utensils,
  X,
  UserCheck,
} from "lucide-react";

interface AttendeeItem {
  id: string;
  event?: { id: string; name: string };
  fullName: string;
  email: string;
  phone?: string;
  rsvpStatus: "attending" | "declined" | "tentative" | "invited";
  dietaryRequirements?: string;
  tableOrGroup?: string;
  vipStatus: boolean;
  notes?: string;
}

interface AttendeesViewProps {
  events: { id: string; name: string }[];
  notify: (text: string, type?: "success" | "error") => void;
  canManage: boolean;
}

export default function AttendeesView({ events, notify, canManage }: AttendeesViewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>("All");
  const [rsvpFilter, setRsvpFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendees, setAttendees] = useState<AttendeeItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, attending: 0, declined: 0, tentative: 0, invited: 0 });
  const [loading, setLoading] = useState(true);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [aEventId, setAEventId] = useState("");
  const [aName, setAName] = useState("");
  const [aEmail, setAEmail] = useState("");
  const [aPhone, setAPhone] = useState("");
  const [aStatus, setAStatus] = useState<AttendeeItem["rsvpStatus"]>("invited");
  const [aDietary, setADietary] = useState("None");
  const [aTable, setATable] = useState("General Seating");
  const [aVip, setAVip] = useState(false);
  const [aNotes, setANotes] = useState("");

  const loadAttendees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedEventId !== "All") params.append("eventId", selectedEventId);
      if (rsvpFilter !== "All") params.append("rsvpStatus", rsvpFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/attendees?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAttendees(data.attendees || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to load attendees", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendees();
  }, [selectedEventId, rsvpFilter, searchQuery]);

  const handleCreateAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: aEventId,
          fullName: aName,
          email: aEmail,
          phone: aPhone,
          rsvpStatus: aStatus,
          dietaryRequirements: aDietary,
          tableOrGroup: aTable,
          vipStatus: aVip,
          notes: aNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Guest "${aName}" added to attendee list!`);
      setShowAddModal(false);
      setAName("");
      setAEmail("");
      setAPhone("");
      setADietary("None");
      setATable("General Seating");
      setAVip(false);
      setANotes("");
      loadAttendees();
    } catch (err: any) {
      notify(err.message || "Failed to add attendee", "error");
    }
  };

  const handleUpdateStatus = async (attendeeId: string, status: AttendeeItem["rsvpStatus"]) => {
    try {
      const res = await fetch(`/api/attendees/${attendeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpStatus: status }),
      });
      if (res.ok) {
        notify("Guest RSVP status updated!");
        loadAttendees();
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 font-serif">Event Guest & Attendee Lists</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#E06B53]/15 text-[#E06B53]">
              Guest List & Attendance Management
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Private organizer guest list tracking, dietary requirements, VIP table allocations, and RSVP statuses.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Guest</span>
          </button>
        )}
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-2xl bg-white border border-stone-200/80 text-center space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-stone-400">Total Guests</span>
          <div className="text-lg font-bold text-slate-900 font-mono">{counts.total}</div>
        </div>
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-emerald-700">Attending</span>
          <div className="text-lg font-bold text-emerald-800 font-mono">{counts.attending}</div>
        </div>
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-amber-700">Tentative</span>
          <div className="text-lg font-bold text-amber-800 font-mono">{counts.tentative}</div>
        </div>
        <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-blue-700">Invited / Pending</span>
          <div className="text-lg font-bold text-blue-800 font-mono">{counts.invited}</div>
        </div>
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-rose-700">Declined</span>
          <div className="text-lg font-bold text-rose-800 font-mono">{counts.declined}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            {["All", "attending", "tentative", "invited", "declined"].map((s) => (
              <button
                key={s}
                onClick={() => setRsvpFilter(s)}
                className={`px-2.5 py-1 rounded-lg font-medium capitalize transition ${
                  rsvpFilter === s
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search guests or table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-slate-800 placeholder-stone-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Attendees Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Guest Name</th>
              <th className="py-3 px-4">Event</th>
              <th className="py-3 px-4">Table / Seating Group</th>
              <th className="py-3 px-4">Dietary Notes</th>
              <th className="py-3 px-4">RSVP Status</th>
              <th className="py-3 px-4 text-right">Quick Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-stone-400">Loading guests...</td>
              </tr>
            ) : attendees.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-stone-400">No guests found.</td>
              </tr>
            ) : (
              attendees.map((a) => (
                <tr key={a.id} className="hover:bg-stone-50/50 transition">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div className="flex items-center space-x-1.5">
                      <span>{a.fullName}</span>
                      {a.vipStatus && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-400 font-normal">{a.email}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">{a.event?.name || "General"}</td>
                  <td className="py-3 px-4 font-medium text-stone-700">{a.tableOrGroup}</td>
                  <td className="py-3 px-4 text-stone-600">
                    {a.dietaryRequirements !== "None" ? (
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 text-[10px] font-medium">
                        {a.dietaryRequirements}
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        a.rsvpStatus === "attending"
                          ? "bg-emerald-100 text-emerald-800"
                          : a.rsvpStatus === "tentative"
                          ? "bg-amber-100 text-amber-800"
                          : a.rsvpStatus === "declined"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {a.rsvpStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    {canManage && (
                      <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5 text-[10px]">
                        <button
                          onClick={() => handleUpdateStatus(a.id, "attending")}
                          className={`px-2 py-0.5 rounded font-bold transition ${
                            a.rsvpStatus === "attending" ? "bg-emerald-600 text-white" : "text-stone-500 hover:text-slate-900"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(a.id, "declined")}
                          className={`px-2 py-0.5 rounded font-bold transition ${
                            a.rsvpStatus === "declined" ? "bg-rose-600 text-white" : "text-stone-500 hover:text-slate-900"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: ADD GUEST */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">Add Guest to Attendee List</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAttendee} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Event *
                </label>
                <select
                  required
                  value={aEventId}
                  onChange={(e) => setAEventId(e.target.value)}
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
                  Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Alistair Finch"
                  value={aName}
                  onChange={(e) => setAName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="guest@organization.org"
                    value={aEmail}
                    onChange={(e) => setAEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={aPhone}
                    onChange={(e) => setAPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Table / Seating Group
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Patron Table 1"
                    value={aTable}
                    onChange={(e) => setATable(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Initial RSVP Status
                  </label>
                  <select
                    value={aStatus}
                    onChange={(e) => setAStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white"
                  >
                    <option value="attending">Attending</option>
                    <option value="tentative">Tentative</option>
                    <option value="invited">Invited / Pending</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Dietary Requirements & Allergies
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pescatarian, Gluten-Free, Nut Allergy"
                  value={aDietary}
                  onChange={(e) => setADietary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <input
                  type="checkbox"
                  id="vip"
                  checked={aVip}
                  onChange={(e) => setAVip(e.target.checked)}
                  className="rounded text-[#E06B53] focus:ring-[#E06B53]"
                />
                <label htmlFor="vip" className="text-xs text-slate-700 cursor-pointer">
                  Mark as <strong>VIP Guest</strong> (priority check-in & host reception)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E06B53] text-white font-semibold hover:bg-[#c95841]"
                >
                  Save Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
