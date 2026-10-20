"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Building2,
  Heart,
  User,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Calendar,
  MessageSquare,
  Lock,
  Eye,
  X,
  Clock,
  Sparkles,
} from "lucide-react";

interface CommunicationLog {
  id: string;
  date: string;
  type: "call" | "email" | "meeting" | "note";
  summary: string;
  authorName: string;
}

interface ClientItem {
  id: string;
  name: string;
  type: "Individual" | "Couple" | "Company" | "Institution" | "Community Group";
  primaryContact: string;
  email: string;
  phone: string;
  address?: string;
  preferences: string;
  requirements: string;
  linkedEvents: { id: string; name: string; category: string; startDate: string; venue: string }[];
  communicationsCount: number;
  communications: CommunicationLog[];
  status: string;
}

interface ClientsViewProps {
  events: { id: string; name: string; startDate: string; venue: string }[];
  notify: (text: string, type?: "success" | "error") => void;
  canManage: boolean;
}

export default function ClientsView({ events, notify, canManage }: ClientsViewProps) {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  // Modals
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedClientForLog, setSelectedClientForLog] = useState<ClientItem | null>(null);

  // Form State
  const [newClientName, setNewClientName] = useState("");
  const [newClientType, setNewClientType] = useState<ClientItem["type"]>("Couple");
  const [newClientContact, setNewClientContact] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientPreferences, setNewClientPreferences] = useState("");
  const [newClientRequirements, setNewClientRequirements] = useState("");
  const [newClientLinkedEvents, setNewClientLinkedEvents] = useState<string[]>([]);

  // Comm Form
  const [commType, setCommType] = useState<"meeting" | "call" | "email" | "note">("meeting");
  const [commSummary, setCommSummary] = useState("");
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [expandedClientLogs, setExpandedClientLogs] = useState<Record<string, boolean>>({});

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients?type=${selectedType}&search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("Failed to load clients", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [selectedType, searchQuery]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName,
          type: newClientType,
          primaryContact: newClientContact,
          email: newClientEmail,
          phone: newClientPhone,
          address: newClientAddress,
          preferences: newClientPreferences,
          requirements: newClientRequirements,
          linkedEventIds: newClientLinkedEvents,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Client "${data.client.name}" created successfully!`);
      setShowAddClientModal(false);
      setNewClientName("");
      setNewClientContact("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNewClientPreferences("");
      setNewClientRequirements("");
      setNewClientLinkedEvents([]);
      loadClients();
    } catch (err: any) {
      notify(err.message || "Failed to create client", "error");
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForLog || isSavingLog) return;
    const clientToUpdate = selectedClientForLog;
    const summaryText = commSummary.trim();
    const typeVal = commType;

    try {
      setIsSavingLog(true);
      const res = await fetch(`/api/clients/${clientToUpdate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCommunication: {
            type: typeVal,
            summary: summaryText,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Communication log recorded for "${clientToUpdate.name}"!`);
      setShowLogModal(false);
      setCommSummary("");

      const newLog = data.newEntry || {
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString(),
        type: typeVal,
        summary: summaryText,
        authorName: "Staff",
      };

      setClients((prev) =>
        prev.map((c) =>
          c.id === clientToUpdate.id
            ? {
                ...c,
                communicationsCount: (c.communicationsCount || 0) + 1,
                communications: [newLog, ...(c.communications || [])],
              }
            : c
        )
      );
    } catch (err: any) {
      notify(err.message || "Failed to record log", "error");
    } finally {
      setIsSavingLog(false);
    }
  };

  const getTypeIcon = (type: ClientItem["type"]) => {
    switch (type) {
      case "Couple":
        return <Heart className="w-3.5 h-3.5 text-rose-500" />;
      case "Company":
        return <Building2 className="w-3.5 h-3.5 text-blue-500" />;
      case "Institution":
        return <Briefcase className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <User className="w-3.5 h-3.5 text-stone-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-serif">Client & Stakeholder Management</h2>
          <p className="text-xs text-stone-500 mt-1">
            Accounts, aesthetic preferences, requirements, linked events, and consultation logs.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowAddClientModal(true)}
            className="px-4 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Client Account</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by client name, primary contact, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-stone-200 text-xs text-slate-800 placeholder-stone-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          {["All", "Individual", "Couple", "Company", "Institution", "Community Group"].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
                selectedType === t
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-stone-400">Loading client directory...</div>
      ) : clients.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-stone-200/80 space-y-2">
          <Users className="w-8 h-8 text-stone-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">No client records found</p>
          <p className="text-xs text-stone-400">Create client profiles to attach to events, invoices, and proposals.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-300 hover:shadow-md transition space-y-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
                    <div className="flex items-center space-x-1 mt-1 text-[11px] font-semibold text-stone-500">
                      {getTypeIcon(c.type)}
                      <span>{c.type}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                    {c.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-stone-500 border-t border-stone-100 pt-3">
                  <div className="font-medium text-slate-700 truncate">Contact: {c.primaryContact}</div>
                  <div className="truncate">{c.email}</div>
                  {c.phone && <div>{c.phone}</div>}
                </div>

                {c.preferences && (
                  <div className="mt-2.5 p-2 rounded-xl bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed">
                    <strong>Aesthetic / Preferences:</strong> {c.preferences}
                  </div>
                )}

                {/* Linked Events */}
                {c.linkedEvents.length > 0 && (
                  <div className="mt-3 text-[11px] text-stone-600">
                    <span className="font-semibold text-slate-800">Linked Events:</span>{" "}
                    {c.linkedEvents.map((ev) => ev.name).join(", ")}
                  </div>
                )}

                {/* Recent Communications */}
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1.5">
                    <span className="font-semibold text-slate-700">Communication History</span>
                    <span>{c.communicationsCount} logs</span>
                  </div>
                  {c.communications.length > 0 ? (
                    <div className="space-y-1.5">
                      {(() => {
                        const sorted = [...c.communications].sort(
                          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                        );
                        const isExpanded = expandedClientLogs[c.id];
                        const displayList = isExpanded ? sorted : sorted.slice(0, 2);
                        return (
                          <>
                            {displayList.map((comm) => (
                              <div key={comm.id} className="p-2 rounded-lg bg-stone-50 text-[11px] text-stone-700 space-y-0.5">
                                <div className="flex justify-between items-center text-[10px] text-stone-400 font-medium">
                                  <span className="uppercase font-semibold text-stone-500">{comm.type}</span>
                                  <span>{new Date(comm.date).toLocaleDateString()}</span>
                                </div>
                                <p className="line-clamp-2 italic">{comm.summary}</p>
                              </div>
                            ))}
                            {sorted.length > 2 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedClientLogs((prev) => ({ ...prev, [c.id]: !prev[c.id] }));
                                }}
                                className="text-[10px] text-[#E06B53] hover:underline font-semibold pt-0.5 block"
                              >
                                {isExpanded ? "Show fewer logs" : `View all ${sorted.length} logs`}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <span className="text-[10px] text-stone-400 italic">No meeting notes logged yet.</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-end">
                {canManage && (
                  <button
                    onClick={() => {
                      setSelectedClientForLog(c);
                      setShowLogModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-slate-900 hover:text-white text-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Log Consultation</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD CLIENT ACCOUNT */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">Create Client Account</h3>
              <button onClick={() => setShowAddClientModal(false)} className="text-stone-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Client / Entity Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Julian & Claire Montgomery"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Client Type *
                  </label>
                  <select
                    value={newClientType}
                    onChange={(e) => setNewClientType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none bg-white"
                  >
                    <option value="Individual">Individual</option>
                    <option value="Couple">Couple</option>
                    <option value="Company">Company</option>
                    <option value="Institution">Institution</option>
                    <option value="Community Group">Community Group</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Primary Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Claire Bennett"
                    value={newClientContact}
                    onChange={(e) => setNewClientContact(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="client@domain.com"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Aesthetic Styles & Preferences
                </label>
                <textarea
                  rows={2}
                  placeholder="Atmospheric lighting, specific flower varieties, preferred catering style..."
                  value={newClientPreferences}
                  onChange={(e) => setNewClientPreferences(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Contractual Mandates & Requirements
                </label>
                <textarea
                  rows={2}
                  placeholder="NDA requirements, insurance certificate deadlines, VIP security rules..."
                  value={newClientRequirements}
                  onChange={(e) => setNewClientRequirements(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E06B53] text-white font-semibold hover:bg-[#c95841]"
                >
                  Save Client Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG MEETING OR COMMUNICATION (FR-31) */}
      {showLogModal && selectedClientForLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Log Communication: {selectedClientForLog.name}
              </h3>
              <button onClick={() => setShowLogModal(false)} className="text-stone-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLog} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Interaction Type
                </label>
                <select
                  value={commType}
                  onChange={(e) => setCommType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white"
                >
                  <option value="meeting">On-site Walkthrough / In-Person Meeting</option>
                  <option value="call">Phone / Conference Call</option>
                  <option value="email">Email Thread Summary</option>
                  <option value="note">Internal Consultation Note</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Discussion Summary & Agreed Action Items *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Record summary of discussion, approvals granted, modifications requested..."
                  value={commSummary}
                  onChange={(e) => setCommSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLog || !commSummary.trim()}
                  className="px-5 py-2 rounded-xl bg-[#E06B53] text-white font-semibold hover:bg-[#c95841] disabled:opacity-50 flex items-center space-x-1.5 transition"
                >
                  {isSavingLog ? (
                    <>
                      <span className="inline-block animate-spin">⟳</span>
                      <span>Saving Log...</span>
                    </>
                  ) : (
                    <span>Save Log Entry</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
