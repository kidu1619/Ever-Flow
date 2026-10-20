"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Send,
  Lock,
  Users,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Info,
  Radio,
} from "lucide-react";
import { Role } from "@/lib/auth/permissions";

interface MessageItem {
  id: string;
  channel: "internal" | "client" | "vendor";
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  content: string;
  attachments: { name: string; url: string; sizeKB?: number }[];
  createdAt: string;
}

interface CollaborationViewProps {
  events: {
    id: string;
    name: string;
    category: string;
    clientName?: string;
    clientEmail?: string;
  }[];
  currentRole: Role | null;
  notify: (text: string, type?: "success" | "error") => void;
}

export default function CollaborationView({ events, currentRole, notify }: CollaborationViewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || "");
  const [selectedChannel, setSelectedChannel] = useState<"internal" | "client" | "vendor">("internal");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [sending, setSending] = useState(false);

  // If user is Client, automatically select client channel
  useEffect(() => {
    if (currentRole === "Client") {
      setSelectedChannel("client");
    } else if (currentRole === "Vendor" || currentRole === "External Vendor") {
      setSelectedChannel("vendor");
    }
  }, [currentRole]);

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    } else if (selectedEventId && !events.some((e) => e.id === selectedEventId) && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const loadMessages = async () => {
    if (!selectedEventId) {
      setLoading(false);
      setMessages([]);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/messages?eventId=${selectedEventId}&channel=${selectedChannel}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to load messages", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadMessages();
    } else {
      setLoading(false);
      setMessages([]);
    }
    const interval = setInterval(() => {
      if (selectedEventId) {
        loadMessages();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedEventId, selectedChannel]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !selectedEventId) return;

    const msgContent = newContent.trim();
    try {
      setSending(true);
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          channel: selectedChannel,
          content: msgContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      setNewContent("");
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      } else {
        await loadMessages();
      }
    } catch (err: any) {
      notify(err.message || "Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const isClient = currentRole === "Client";
  const isVendor = currentRole === "Vendor" || currentRole === "External Vendor";

  // Selected event title
  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "Client":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "Owner":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "EventManager":
      case "Event Manager":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "FinanceManager":
      case "Finance Manager":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "VendorCoordinator":
      case "Vendor Coordinator":
        return "bg-cyan-100 text-cyan-700 border-cyan-200";
      case "Vendor":
      case "External Vendor":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Staff":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 font-serif">Communication & Collaboration Hub</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#E06B53]/15 text-[#E06B53]">
              Communication Hub
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Event-scoped discussions with strictly segregated internal, client, and vendor channels.
          </p>
        </div>

        {/* Event Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold text-slate-700">Event:</label>
          {events.length === 0 ? (
            <span className="text-xs text-stone-400 italic">No events accessible</span>
          ) : (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/20"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.category})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>


      {/* Main Messaging Layout */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[520px]">
        {/* Channel Selector Sidebar */}
        <div className="w-full md:w-64 bg-stone-50/70 border-r border-stone-200/80 p-4 space-y-2 shrink-0">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
            Channel Privacy Boundaries
          </span>

          {/* Channel 1: Internal Staff */}
          {!isClient && !isVendor ? (
            <button
              onClick={() => setSelectedChannel("internal")}
              className={`w-full text-left p-3 rounded-2xl text-xs transition flex items-center justify-between ${
                selectedChannel === "internal"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "hover:bg-stone-100 text-stone-700"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold">Internal Staff</div>
                  <div className={`text-[10px] ${selectedChannel === "internal" ? "text-stone-300" : "text-stone-400"}`}>
                    Staff & Management only
                  </div>
                </div>
              </div>
            </button>
          ) : (
            <div className="p-3 rounded-2xl bg-stone-200/50 text-[11px] text-stone-400 flex items-center space-x-2 opacity-60">
              <Lock className="w-3.5 h-3.5" />
              <span>Internal Staff (Restricted)</span>
            </div>
          )}

          {/* Channel 2: Client Channel */}
          {!isVendor ? (
            <button
              onClick={() => setSelectedChannel("client")}
              className={`w-full text-left p-3 rounded-2xl text-xs transition flex items-center justify-between ${
                selectedChannel === "client"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "hover:bg-stone-100 text-stone-700"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="font-semibold">Client Channel</div>
                  <div className={`text-[10px] ${selectedChannel === "client" ? "text-stone-300" : "text-stone-400"}`}>
                    Client Stakeholders & Staff
                  </div>
                </div>
              </div>
            </button>
          ) : (
            <div className="p-3 rounded-2xl bg-stone-200/50 text-[11px] text-stone-400 flex items-center space-x-2 opacity-60">
              <Lock className="w-3.5 h-3.5" />
              <span>Client Channel (Restricted)</span>
            </div>
          )}

          {/* Channel 3: Vendor Channel */}
          {!isClient ? (
            <button
              onClick={() => setSelectedChannel("vendor")}
              className={`w-full text-left p-3 rounded-2xl text-xs transition flex items-center justify-between ${
                selectedChannel === "vendor"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "hover:bg-stone-100 text-stone-700"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold">Vendor Coordination</div>
                  <div className={`text-[10px] ${selectedChannel === "vendor" ? "text-stone-300" : "text-stone-400"}`}>
                    External Suppliers & Staff
                  </div>
                </div>
              </div>
            </button>
          ) : (
            <div className="p-3 rounded-2xl bg-stone-200/50 text-[11px] text-stone-400 flex items-center space-x-2 opacity-60">
              <Lock className="w-3.5 h-3.5" />
              <span>Vendor Channel (Restricted)</span>
            </div>
          )}
        </div>

        {/* Message Thread Display */}
        <div className="flex-1 flex flex-col justify-between">
          {/* Thread Header */}
          <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-50/40">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800 capitalize">
                  #{selectedChannel} discussion
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    selectedChannel === "client"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : selectedChannel === "internal"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {selectedChannel === "client"
                    ? "Client ⟷ Organizer Dialogue"
                    : selectedChannel === "internal"
                    ? "Confidential Operations Crew"
                    : "Vendors ⟷ Production Lead"}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 block mt-0.5">
                {selectedChannel === "internal"
                  ? "Staff only • Hidden from external client & vendors"
                  : selectedChannel === "client"
                  ? "Shared with client • Proposals, approvals, timelines, and status updates"
                  : "Supplier load-in, catering delivery, and audio logistics"}
              </span>

              {selectedChannel === "client" && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-indigo-900 bg-indigo-50/90 border border-indigo-200/80 px-2.5 py-1 rounded-xl">
                  <span className="font-bold text-indigo-950">Delivered to Client Member:</span>
                  <span className="font-semibold text-indigo-700">
                    {currentEvent?.clientName || "Victoria Sterling (Host / Client)"}
                  </span>
                  <span className="text-stone-400 text-[10px]">
                    ({currentEvent?.clientEmail || "client@aureliaevents.com"})
                  </span>
                  <span className="text-[10px] text-indigo-500 font-medium">
                    • Event: {currentEvent?.name}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono font-medium flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>EverFlow Live Polling</span>
              </span>
            </div>
          </div>

          {/* Messages Body */}
          <div className="p-5 flex-1 overflow-y-auto space-y-4 max-h-[380px]">
            {loading ? (
              <div className="text-center text-xs text-stone-400 py-12 flex flex-col items-center justify-center space-y-2">
                <div className="w-5 h-5 border-2 border-stone-300 border-t-[#E06B53] rounded-full animate-spin"></div>
                <span>Syncing #{selectedChannel} messages...</span>
              </div>
            ) : !selectedEventId ? (
              <div className="text-center py-12 text-xs text-stone-400 space-y-1">
                <MessageSquare className="w-7 h-7 text-stone-300 mx-auto" />
                <p>No event selected.</p>
                <p className="text-[10px]">Please select an event from the top dropdown to view channel discussions.</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-xs text-stone-400 space-y-1">
                <MessageSquare className="w-7 h-7 text-stone-300 mx-auto" />
                <p>No messages in #{selectedChannel} yet for {currentEvent?.name || "this event"}.</p>
                <p className="text-[10px]">
                  {selectedChannel === "client"
                    ? "Post a message to communicate with the client or event manager."
                    : selectedChannel === "internal"
                    ? "Post operational updates for your team."
                    : "Post logistics updates for external suppliers."}
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="flex items-start space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full font-bold flex items-center justify-center shrink-0 text-xs shadow-xs text-white ${
                      m.senderRole === "Client"
                        ? "bg-indigo-600"
                        : m.senderRole === "Owner"
                        ? "bg-rose-600"
                        : m.senderRole === "Vendor"
                        ? "bg-blue-600"
                        : "bg-slate-900"
                    }`}
                  >
                    {m.senderName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xs font-bold text-slate-900">{m.senderName}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${getRoleBadgeStyle(m.senderRole)}`}>
                        {m.senderRole}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="mt-1 p-3 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-slate-800 leading-relaxed max-w-xl">
                      {m.content}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick preset chips for rapid communication */}
          <div className="px-4 py-1.5 bg-stone-50/70 border-t border-stone-100 flex items-center space-x-1.5 overflow-x-auto text-[11px]">
            <span className="text-stone-400 shrink-0 font-medium">Quick draft:</span>
            {selectedChannel === "client" ? (
              <>
                <button
                  type="button"
                  onClick={() => setNewContent("Hi! Could we please get a status update on the event setup and catering timeline?")}
                  className="px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300 transition shrink-0"
                >
                  Status check
                </button>
                <button
                  type="button"
                  onClick={() => setNewContent("The proposed timeline and floor plan are approved! Thank you.")}
                  className="px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300 transition shrink-0"
                >
                  Approve proposal
                </button>
                <button
                  type="button"
                  onClick={() => setNewContent("Please update our estimated guest RSVP count to 215 attendees.")}
                  className="px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300 transition shrink-0"
                >
                  Update guest count
                </button>
              </>
            ) : selectedChannel === "internal" ? (
              <>
                <button
                  type="button"
                  onClick={() => setNewContent("Stage 1 soundcheck is shifted 30 minutes earlier. Floor crew please clear aisle.")}
                  className="px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300 transition shrink-0"
                >
                  Floor schedule shift
                </button>
                <button
                  type="button"
                  onClick={() => setNewContent("VIP security detail has arrived on site at East Gate entrance.")}
                  className="px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300 transition shrink-0"
                >
                  Security notice
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setNewContent("Loading dock 3 is cleared and open for equipment load-in.")}
                  className="px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300 transition shrink-0"
                >
                  Dock clear
                </button>
                <button
                  type="button"
                  onClick={() => setNewContent("Catering prep power outlets confirmed active on the mezzanine.")}
                  className="px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300 transition shrink-0"
                >
                  Power confirmed
                </button>
              </>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendMessage} className="p-3.5 border-t border-stone-200 bg-white flex items-center space-x-2">
            <input
              type="text"
              required
              placeholder={`Post in #${selectedChannel} channel...`}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/20"
            />
            <button
              type="submit"
              disabled={sending || !newContent.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50 shadow-xs"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
