"use client";

import { useState, useEffect } from "react";
import {
  Megaphone,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Radio,
  Plus,
  Send,
  Users,
  ShieldAlert,
  Clock,
  Sparkles,
  Archive,
  ArrowRight,
  Target,
  UserCheck,
  Building2,
  Layers,
  BellRing,
} from "lucide-react";

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  priority: "urgent" | "warning" | "info";
  targetRole: string;
  postedByName: string;
  postedByRole: string;
  createdAt: string;
  isActive: boolean;
  hasAcknowledged: boolean;
  acknowledgedCount?: number;
  isDirectTarget?: boolean;
  isSender?: boolean;
}

interface InstructionBannerProps {
  userRole?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  isPlatformAdmin?: boolean;
  currentTab?: string;
  onNotificationSent?: () => void;
}

const ROLE_OPTIONS = [
  { value: "EventManager", label: "Event & Production Manager", shortLabel: "Event Manager", icon: "📋" },
  { value: "Owner", label: "Organization Owner / Executive", shortLabel: "Organization Owner", icon: "🏢" },
  { value: "FinanceManager", label: "Finance & Billing Director", shortLabel: "Finance Director", icon: "💳" },
  { value: "VendorCoordinator", label: "Vendor Coordinator", shortLabel: "Vendor Coordinator", icon: "📦" },
  { value: "Staff", label: "Operations Staff & Floor Crew", shortLabel: "Staff Lead", icon: "👷" },
  { value: "Vendor", label: "Vendor & Service Partner", shortLabel: "Vendor Partner", icon: "🚚" },
  { value: "Client", label: "Client Stakeholder", shortLabel: "Client Stakeholder", icon: "👑" },
  { value: "PlatformAdmin", label: "SaaS Platform Owner (Tier 1)", shortLabel: "Platform Owner", icon: "✦" },
];

const TARGET_ROLE_OPTIONS = [
  { value: "all", label: "Everyone (All Teams & Roles)", badge: "🌐 Everyone", desc: "Broadcast globally to all workspace members, vendors, staff, and clients" },
  { value: "Vendor", label: "Vendors & Service Partners Only", badge: "🚚 Vendors Only", desc: "Private briefing strictly for caterers, AV leads, florists, and external contractors" },
  { value: "Staff", label: "Operations Staff & Floor Crew Only", badge: "👷 Staff Only", desc: "Direct tactical instructions for door crew, ushers, check-in leads, and runners" },
  { value: "FinanceManager", label: "Finance & Billing Team Only", badge: "💳 Finance Only", desc: "Restricted financial reminders, payment approvals, and invoice submissions" },
  { value: "EventManager", label: "Event & Production Managers Only", badge: "📋 Event Managers Only", desc: "Cueing, schedule shifts, and logistical updates for event managers" },
  { value: "Client", label: "Client Stakeholders Only", badge: "👑 Clients Only", desc: "VIP summaries, milestone previews, and formal sign-offs for client representatives" },
  { value: "Owner", label: "Organization Owners Only", badge: "🏢 Owners Only", desc: "Executive governance announcements and leadership advisories" },
];

export default function InstructionBanner({
  userRole,
  userName,
  userEmail,
  isPlatformAdmin = false,
  currentTab,
  onNotificationSent,
}: InstructionBannerProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  // Pop-Up Modal State for targeted role announcements (e.g. Vendor announcement pops up on Vendor page)
  const [activePopupAnnouncement, setActivePopupAnnouncement] = useState<AnnouncementItem | null>(null);
  const [dismissedPopupIds, setDismissedPopupIds] = useState<string[]>([]);

  // Composer Form State
  const [composeTitle, setComposeTitle] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composePriority, setComposePriority] = useState<"urgent" | "warning" | "info">("warning");
  const [composeFromRole, setComposeFromRole] = useState(userRole || "EventManager");
  const [composeFromName, setComposeFromName] = useState(userName || "Operations Lead");
  const [composeTargetRole, setComposeTargetRole] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Any authenticated user can broadcast instructions to their peers or teams
  const canBroadcast = Boolean(userRole) || isPlatformAdmin;

  // Sync composer defaults when props or tab change
  useEffect(() => {
    if (userRole) setComposeFromRole(userRole);
    if (userName) setComposeFromName(userName);

    // Auto-set composer target based on current tab
    if (currentTab === "vendors") setComposeTargetRole("Vendor");
    else if (currentTab === "clients") setComposeTargetRole("Client");
    else if (currentTab === "finances") setComposeTargetRole("FinanceManager");
    else if (currentTab === "tasks") setComposeTargetRole("Staff");
    else if (currentTab === "events") setComposeTargetRole("EventManager");
  }, [userRole, userName, currentTab]);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/announcements");
      if (res.ok) {
        const data = await res.json();
        const items: AnnouncementItem[] = data.announcements || [];
        setAnnouncements(items);
        if (activeIndex >= items.length) {
          setActiveIndex(0);
        }
      }
    } catch (err) {
      console.warn("Failed to load announcements:", err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 12000); // 12s polling for real-time instruction delivery
    return () => clearInterval(interval);
  }, []);

  // Filter announcements relevant to the CURRENT TAB and current role:
  // - Vendors tab: only Vendor-targeted and global announcements
  // - Clients tab: only Client-targeted and global announcements
  // - Finances tab: only Finance-targeted and global announcements
  // - Tasks tab: only Staff-targeted and global announcements
  // - Events tab: only EventManager-targeted and global announcements
  // - Overview / Other tabs: only announcements matching the logged in user's role OR global "all"
  const relevantAnnouncements = announcements.filter((a) => {
    const target = (a.targetRole || "all").toLowerCase().replace(/[\s_-]/g, "");
    const uRole = (userRole || "").toLowerCase().replace(/[\s_-]/g, "");

    // 1. Specific module tabs
    if (currentTab === "vendors") {
      return target === "vendor" || target === "vendorcoordinator" || target === "all";
    }
    if (currentTab === "clients") {
      return target === "client" || target === "all";
    }
    if (currentTab === "finances") {
      return target === "financemanager" || target === "finance" || target === "all";
    }
    if (currentTab === "tasks") {
      return target === "staff" || target === "all";
    }
    if (currentTab === "events") {
      return target === "eventmanager" || target === "all";
    }

    // 2. Direct role match on overview / general tabs:
    if (uRole && uRole === target) return true;

    // 3. Global announcements broadcast to "all"
    if (target === "all") return true;

    // 4. Executive supervisor or author
    if (a.isSender && currentTab === "overview") return true;

    return false;
  });

  // Targeted Pop-Up Trigger:
  // When a user enters the Vendor page (or Client, Finance, etc.), if there is an unacknowledged
  // announcement targeted to that page, automatically POP IT UP!
  useEffect(() => {
    if (!currentTab || currentTab === "welcome") {
      setActivePopupAnnouncement(null);
      return;
    }

    const targeted = relevantAnnouncements.find((a) => {
      const target = (a.targetRole || "").toLowerCase().replace(/[\s_-]/g, "");
      if (target === "all") return false; // Global notices stay in the banner; targeted ones trigger the popup
      if (dismissedPopupIds.includes(a.id)) return false;
      if (a.hasAcknowledged) return false;

      if (currentTab === "vendors" && (target === "vendor" || target === "vendorcoordinator")) return true;
      if (currentTab === "clients" && target === "client") return true;
      if (currentTab === "finances" && (target === "financemanager" || target === "finance")) return true;
      if (currentTab === "tasks" && target === "staff") return true;
      if (currentTab === "events" && target === "eventmanager") return true;

      // Also trigger if the logged-in user's role directly matches and they haven't dismissed it
      const uRole = (userRole || "").toLowerCase().replace(/[\s_-]/g, "");
      if (uRole && uRole === target) return true;

      return false;
    });

    if (targeted) {
      setActivePopupAnnouncement(targeted);
    }
  }, [currentTab, relevantAnnouncements, dismissedPopupIds, userRole]);

  const handleAcknowledge = async (id: string) => {
    try {
      const res = await fetch("/api/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "acknowledge" }),
      });
      if (res.ok) {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === id ? { ...a, hasAcknowledged: true } : a))
        );
        setActionNotice("Instruction acknowledged. Confirmation logged in audit record.");
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch (err) {
      console.error("Failed to acknowledge announcement:", err);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await fetch("/api/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "archive" }),
      });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        if (activeIndex > 0) setActiveIndex((prev) => prev - 1);
        setActionNotice("Instruction archived.");
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch (err) {
      console.error("Failed to archive announcement:", err);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTitle.trim() || !composeMessage.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: composeTitle.trim(),
          message: composeMessage.trim(),
          priority: composePriority,
          fromRole: composeFromRole,
          fromName: composeFromName.trim() || userName || "Operations Lead",
          targetRole: composeTargetRole,
          deactivatePrevious: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComposeTitle("");
        setComposeMessage("");
        setShowComposer(false);
        await fetchAnnouncements();
        setActiveIndex(0);
        setActionNotice(data.message || "Instruction broadcast successfully!");
        setTimeout(() => setActionNotice(null), 4000);
        if (onNotificationSent) onNotificationSent();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to broadcast instruction");
      }
    } catch (err) {
      console.error("Error broadcasting instruction:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const applyTemplate = (preset: {
    title: string;
    message: string;
    priority: "urgent" | "warning" | "info";
    fromRole: string;
    fromName: string;
    targetRole: string;
  }) => {
    setComposeTitle(preset.title);
    setComposeMessage(preset.message);
    setComposePriority(preset.priority);
    setComposeFromRole(preset.fromRole);
    setComposeFromName(preset.fromName);
    setComposeTargetRole(preset.targetRole);
  };

  // Preset role-to-role and role-to-everyone examples
  const presets = [
    {
      title: "Audio & Stage West Acoustic Soundcheck Shift",
      message: "Attention all teams, vendors, and audio leads: Stage 1 acoustic soundcheck is shifted to 14:00 at Grand Ballroom West. Catering, AV crews, and floor staff please clear main aisle.",
      priority: "urgent" as const,
      fromRole: "EventManager",
      fromName: "Marcus Vance",
      targetRole: "all",
      label: "Event Manager ➔ Everyone (Soundcheck Shift)",
    },
    {
      title: "Gate 4 Loading Dock Inbound Logistics & QR Clearance",
      message: "Loading dock Gate 4 is reserved strictly for floral and AV logistics from 11:00 to 13:30. Inbound delivery personnel must present digital QR credentials at West Security.",
      priority: "warning" as const,
      fromRole: "VendorCoordinator",
      fromName: "Julian Drake",
      targetRole: "Vendor",
      label: "Vendor Coordinator ➔ Vendors (Gate 4 Protocol)",
    },
    {
      title: "18:00 Fiscal Cut-Off: Milestone Invoices & Receipts",
      message: "Finance directive: All vendor purchase orders, overtime labor slips, and equipment deposits must be finalized and submitted to Sophia Chen before 18:00 today.",
      priority: "info" as const,
      fromRole: "FinanceManager",
      fromName: "Sophia Chen",
      targetRole: "Vendor",
      label: "Finance ➔ Vendors (Invoice Cut-Off)",
    },
    {
      title: "Multi-Tenant Platform Infrastructure Maintenance Notice",
      message: "Yenege Academy Platform Operations: Global database replication and tenant isolation audit scheduled for 02:00 UTC. Zero downtime expected.",
      priority: "info" as const,
      fromRole: "PlatformAdmin",
      fromName: "Yenege Academy Operations",
      targetRole: "all",
      label: "Platform Owner ➔ Everyone (Maintenance)",
    },
  ];

  // Helper to format target role badge
  const getTargetBadge = (targetRole: string) => {
    const match = TARGET_ROLE_OPTIONS.find((t) => t.value.toLowerCase() === targetRole.toLowerCase());
    return match ? match.badge : `Target: ${targetRole}`;
  };

  // Helper to format sender role badge
  const getFromRoleLabel = (roleStr: string) => {
    const match = ROLE_OPTIONS.find((r) => r.value.toLowerCase() === roleStr.toLowerCase() || r.label.toLowerCase() === roleStr.toLowerCase());
    return match ? match.shortLabel : roleStr;
  };

  // Colors & styles based on priority
  const getBannerStyles = (priority: "urgent" | "warning" | "info") => {
    switch (priority) {
      case "urgent":
        return {
          wrapper: "bg-gradient-to-r from-rose-950/95 via-red-900/90 to-rose-950/95 text-white border-b-2 border-rose-500/80 shadow-md shadow-rose-950/20",
          badge: "bg-rose-500 text-white animate-pulse",
          tag: "bg-rose-900/80 text-rose-200 border border-rose-700/60",
          fromTag: "bg-rose-950/80 text-rose-100 border border-rose-600/60",
          icon: <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />,
          label: "URGENT OPERATIONAL INSTRUCTION",
          ackBtn: "bg-white text-rose-900 hover:bg-rose-50 border border-rose-200",
        };
      case "warning":
        return {
          wrapper: "bg-gradient-to-r from-amber-950/95 via-stone-900/95 to-amber-950/90 text-stone-100 border-b-2 border-amber-500/80 shadow-md shadow-amber-950/20",
          badge: "bg-amber-500 text-stone-950 font-bold",
          tag: "bg-amber-900/70 text-amber-200 border border-amber-700/60",
          fromTag: "bg-amber-950/80 text-amber-100 border border-amber-600/60",
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          label: "OPERATIONAL NOTICE & BRIEFING",
          ackBtn: "bg-amber-400 text-stone-950 hover:bg-amber-300 font-semibold",
        };
      case "info":
      default:
        return {
          wrapper: "bg-gradient-to-r from-slate-900 via-indigo-950/90 to-slate-900 text-white border-b-2 border-indigo-500/70 shadow-md",
          badge: "bg-indigo-500 text-white",
          tag: "bg-indigo-900/70 text-indigo-200 border border-indigo-700/60",
          fromTag: "bg-indigo-950/80 text-indigo-100 border border-indigo-600/60",
          icon: <Megaphone className="w-4 h-4 text-indigo-400 shrink-0" />,
          label: "ORGANIZATION INSTRUCTION BROADCAST",
          ackBtn: "bg-indigo-400 text-slate-950 hover:bg-indigo-300 font-semibold",
        };
    }
  };

  const activeAnnouncement = relevantAnnouncements[activeIndex] || relevantAnnouncements[0];
  const style = activeAnnouncement ? getBannerStyles(activeAnnouncement.priority) : getBannerStyles("info");

  return (
    <>
      {/* Toast Notification */}
      {actionNotice && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl border border-emerald-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TARGETED POP-UP MODAL (Pops up when entering Vendor, Client, Finance page) */}
      {/* ========================================================================= */}
      {activePopupAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-stone-900 border-2 border-amber-500/80 rounded-3xl shadow-2xl overflow-hidden text-stone-100 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Header with animated icon */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-500/30">
                  <BellRing className="w-5 h-5 animate-bounce text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {activePopupAnnouncement.targetRole === "Vendor"
                        ? "🚚 Vendor Operational Briefing"
                        : activePopupAnnouncement.targetRole === "Client"
                        ? "👑 Client Stakeholder Notice"
                        : activePopupAnnouncement.targetRole === "FinanceManager"
                        ? "💳 Finance Directive"
                        : activePopupAnnouncement.targetRole === "Staff"
                        ? "👷 Staff Operational Alert"
                        : "📋 Event Manager Directive"}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                      {activePopupAnnouncement.priority}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1 font-serif leading-snug">
                    {activePopupAnnouncement.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setDismissedPopupIds((prev) => [...prev, activePopupAnnouncement.id]);
                  setActivePopupAnnouncement(null);
                }}
                className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition"
                title="Dismiss popup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* From / To chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-stone-800 border border-stone-700 text-stone-300">
                <strong className="text-amber-400">FROM:</strong> {getFromRoleLabel(activePopupAnnouncement.postedByRole)} ({activePopupAnnouncement.postedByName})
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-800/80 text-amber-300 font-semibold">
                <strong className="text-emerald-400">TO:</strong> {getTargetBadge(activePopupAnnouncement.targetRole)}
              </span>
              <span className="text-stone-400 text-[11px] font-mono ml-auto">
                {new Date(activePopupAnnouncement.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Message content */}
            <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 text-sm text-stone-200 leading-relaxed font-sans max-h-52 overflow-y-auto">
              {activePopupAnnouncement.message}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-800">
              <span className="text-[11px] text-stone-400">
                Notice logged in tenant operational audit.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setDismissedPopupIds((prev) => [...prev, activePopupAnnouncement.id]);
                    setActivePopupAnnouncement(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleAcknowledge(activePopupAnnouncement.id);
                    setDismissedPopupIds((prev) => [...prev, activePopupAnnouncement.id]);
                    setActivePopupAnnouncement(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-amber-500/25 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Acknowledge Instruction</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE NOTIFICATION BAR (Visible for relevant announcements) */}
      {activeAnnouncement && (
        <div className={`${style.wrapper} transition-all duration-200 select-none`}>
          <div className="w-full px-6 lg:px-8 py-2.5">
            {/* Top Row: Meta, Target Audience, and Controls */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {/* Priority Indicator Pill */}
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 shrink-0 ${style.badge}`}>
                  <Radio className="w-3 h-3 animate-ping" />
                  {style.label}
                </span>

                {/* SENDER ROLE BADGE ("From Specific Role") */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${style.fromTag}`}>
                  <span className="text-amber-400 font-bold uppercase tracking-wider text-[9px]">FROM:</span>
                  <strong className="text-white">{getFromRoleLabel(activeAnnouncement.postedByRole)}</strong>
                  <span className="text-stone-300 font-normal">({activeAnnouncement.postedByName})</span>
                </span>

                {/* TARGET AUDIENCE BADGE ("To Everyone OR Specific Role") */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${style.tag}`}>
                  <span className="text-emerald-300 font-bold uppercase tracking-wider text-[9px]">TO:</span>
                  <strong>{getTargetBadge(activeAnnouncement.targetRole)}</strong>
                </span>

                {/* Target Scope Clarification */}
                {activeAnnouncement.targetRole !== "all" && !activeAnnouncement.isDirectTarget && (
                  <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-stone-900/80 text-stone-300 border border-stone-700">
                    <span>Oversight View</span>
                  </span>
                )}
              </div>

              {/* Action Buttons & Carousel Navigation */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Carousel Navigation when multiple relevant instructions exist */}
                {relevantAnnouncements.length > 1 && (
                  <div className="flex items-center gap-1 bg-black/30 rounded-lg px-2 py-0.5 border border-white/10 text-xs text-stone-300 font-mono">
                    <button
                      onClick={() => setActiveIndex((prev) => (prev > 0 ? prev - 1 : relevantAnnouncements.length - 1))}
                      className="hover:text-white p-0.5 transition"
                      title="Previous Instruction"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] px-1">
                      {activeIndex + 1}/{relevantAnnouncements.length}
                    </span>
                    <button
                      onClick={() => setActiveIndex((prev) => (prev < relevantAnnouncements.length - 1 ? prev + 1 : 0))}
                      className="hover:text-white p-0.5 transition"
                      title="Next Instruction"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Acknowledge Button for Targeted Roles */}
                {activeAnnouncement.hasAcknowledged ? (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-medium flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Acknowledged</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleAcknowledge(activeAnnouncement.id)}
                    className={`px-3 py-1 rounded-lg text-xs transition flex items-center gap-1.5 shadow-xs font-semibold ${style.ackBtn}`}
                    title="Confirm you have read and understood this instruction"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Acknowledge Instruction</span>
                  </button>
                )}

                {/* Broadcast / Announce Action */}
                {canBroadcast && (
                  <button
                    onClick={() => setShowComposer(true)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition flex items-center gap-1 border border-white/20"
                    title="Broadcast a new instruction from your role"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    <span className="hidden sm:inline">Announce</span>
                  </button>
                )}

                {/* Archive / Clear (Author or Admin/Owner) */}
                {(activeAnnouncement.isSender || ["Owner", "Admin"].includes(userRole || "") || isPlatformAdmin) && (
                  <button
                    onClick={() => handleArchive(activeAnnouncement.id)}
                    className="p-1 rounded-lg bg-white/10 hover:bg-rose-500/30 text-stone-300 hover:text-white text-xs transition border border-white/10"
                    title="Archive this instruction"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Collapse / Expand Toggle */}
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition"
                  title={isCollapsed ? "Expand instruction body" : "Collapse to single line"}
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bottom Row: Instruction Content (if not collapsed) */}
            {!isCollapsed && (
              <div className="mt-2 pt-2 border-t border-white/10 flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{style.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm tracking-tight text-white flex items-center gap-2">
                    <span>{activeAnnouncement.title}</span>
                  </h4>
                  <p className="text-xs text-stone-200 mt-1 leading-relaxed font-sans font-normal opacity-95">
                    {activeAnnouncement.message}
                  </p>
                </div>

                <div className="text-[10px] text-stone-400 font-mono shrink-0 hidden sm:block self-end">
                  {activeAnnouncement.acknowledgedCount ? `${activeAnnouncement.acknowledgedCount} role acknowledged • ` : ""}
                  {new Date(activeAnnouncement.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Composer Modal for Broadcasting Role-to-Role or Role-to-Everyone Announcements */}
      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-700 rounded-3xl shadow-2xl overflow-hidden text-stone-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-[#E06B53]/20 text-[#E06B53] flex items-center justify-center font-bold">
                  <Megaphone className="w-5 h-5 text-[#E06B53]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-serif">
                    Role-to-Role Operational Instruction Broadcast
                  </h3>
                  <p className="text-xs text-stone-400">
                    Broadcast an announcement from your role to everyone or a specific target role.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowComposer(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleBroadcast} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Quick Template Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Quick Role-to-Role Presets:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {presets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyTemplate(p)}
                      className="text-left p-2.5 rounded-xl bg-stone-800/70 border border-stone-700/60 hover:border-[#E06B53]/60 hover:bg-stone-800 transition text-xs group"
                    >
                      <div className="font-semibold text-stone-200 group-hover:text-white truncate">
                        {p.label}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate mt-0.5">
                        {p.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sender & Target Roles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-800">
                {/* 1. FROM ROLE */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300 flex items-center space-x-1.5">
                    <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">Step 1:</span>
                    <span>Announcing From Role</span>
                  </label>
                  <select
                    value={composeFromRole}
                    onChange={(e) => setComposeFromRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs text-stone-100 focus:outline-none focus:border-[#E06B53]"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.icon} {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. TARGET ROLE */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300 flex items-center space-x-1.5">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Step 2:</span>
                    <span>Target Audience (To Whom)</span>
                  </label>
                  <select
                    value={composeTargetRole}
                    onChange={(e) => setComposeTargetRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs text-stone-100 focus:outline-none focus:border-[#E06B53]"
                  >
                    {TARGET_ROLE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.badge} — {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Announcer Name & Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300">Announcer Name / Title</label>
                  <input
                    type="text"
                    required
                    value={composeFromName}
                    onChange={(e) => setComposeFromName(e.target.value)}
                    placeholder="e.g. Marcus Vance (Event Lead)"
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs text-stone-100 focus:outline-none focus:border-[#E06B53]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300">Priority Level</label>
                  <select
                    value={composePriority}
                    onChange={(e) => setComposePriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs text-stone-100 focus:outline-none focus:border-[#E06B53]"
                  >
                    <option value="urgent">🔴 Urgent (Immediate Action Required)</option>
                    <option value="warning">🟡 Warning / Operational Notice</option>
                    <option value="info">🔵 Info / Schedule Update</option>
                  </select>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Instruction Title / Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Soundcheck Rescheduled to 14:00 at Stage 1"
                  value={composeTitle}
                  onChange={(e) => setComposeTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#E06B53]"
                />
              </div>

              {/* Message Content Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">
                  Instruction Details & Specific Guidance
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail exact operational requirements, deadlines, dock access, shift instructions, or expectations..."
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#E06B53]"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
                <div className="text-[11px] text-stone-400">
                  Delivery: Targeted role members will receive this instruction in their workspace bar and targeted module popup.
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowComposer(false)}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !composeTitle.trim() || !composeMessage.trim()}
                    className="px-5 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-[#E06B53]/25 transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? "Broadcasting..." : "Broadcast Instruction"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
