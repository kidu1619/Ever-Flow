"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Calendar,
  MapPin,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Plus,
  CheckCircle2,
  Users,
  ShieldCheck,
  QrCode,
  Briefcase,
  Layers,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Building2,
  Check,
  Star,
  Clock,
  Ticket,
  ArrowUpRight,
  Compass,
  DollarSign,
  Zap,
  TrendingUp,
  BarChart3,
  CalendarDays,
  FileCheck2,
  Radio,
  X,
  Lock,
  LogOut,
  LogIn,
  UserPlus,
  KeyRound,
  ShieldAlert,
  UserCheck,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { Role, getRoleDisplayName } from "@/lib/auth/permissions";
import EventDetailModal from "@/components/EventDetailModal";
import LiquidEther from "@/components/LiquidEther";

interface TaskItem {
  id: string;
  _id?: string;
  eventId?: any;
  eventName?: string;
  eventCategory?: string;
  title: string;
  description?: string;
  category: string;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  assignedToName?: string;
  isBlocked?: boolean;
  blockedReason?: string;
  completedAt?: string;
}

interface EventItem {
  id: string;
  name: string;
  category: string;
  venue: string;
  startDate: string;
  endDate?: string;
  status: string;
  budget?: number;
  capacity?: number;
  readinessScore?: number;
  imageUrl?: string;
  description?: string;
  tasksCount?: {
    total: number;
    completed: number;
    percentage: number;
  };
}

interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  brandColor?: string;
  status: string;
  plan: string;
  role: Role;
  membershipStatus: string;
}

interface FrontWelcomePageProps {
  organizationName: string;
  organizationSlug: string;
  organizationPlan?: string;
  brandColor?: string;
  userRole: Role | null;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  organizations: OrganizationSummary[];
  activeOrgId?: string;
  events: EventItem[];
  tasks: TaskItem[];
  isLoggedIn?: boolean;
  onLogout?: () => Promise<void>;
  onRefreshSession?: () => Promise<void>;
  onSwitchOrg: (orgId: string) => void;
  onEnterWorkspace: () => void;
  onToggleTaskStatus?: (taskId: string, newStatus: "todo" | "in_progress" | "completed") => Promise<void>;
  onAddTask?: (taskData: any) => Promise<void>;
  notify: (text: string, type?: "success" | "error") => void;
  onOpenCreateEvent?: () => void;
  onOpenEventDetail?: (eventId: string) => void;
}

// Preset demo accounts for quick role-based authentication testing
const DEMO_ROLE_ACCOUNTS = [
  {
    role: "PlatformAdmin",
    title: "SaaS Platform Owner",
    email: "superadmin@yenegeacademy.com",
    name: "Yenege Academy Operations",
    desc: "Administers tenant subscriptions, verifies payments, and grants workspace access.",
    color: "#D97706",
  },
  {
    role: "Owner",
    title: "Organization Owner",
    email: "olivia@aureliaevents.com",
    name: "Olivia Sterling",
    desc: "Unconditional operational, governance & billing authority.",
    color: "#E06B53",
  },
  {
    role: "EventManager",
    title: "Event & Production Manager",
    email: "marcus@aureliaevents.com",
    name: "Marcus Vance",
    desc: "Schedules, run sheets, cueing, crew coordination & tasks.",
    color: "#D97706",
  },
  {
    role: "FinanceManager",
    title: "Finance & Billing Director",
    email: "sophia@aureliaevents.com",
    name: "Sophia Chen",
    desc: "Milestone invoices, payment dues, deposit tracking & budgets.",
    color: "#059669",
  },
  {
    role: "Vendor",
    title: "Vendor & Service Partner",
    email: "vendor@grandcrucatering.com",
    name: "Alex Rivera",
    desc: "Contracted deliverables, quotes, logistics & load-in schedules.",
    color: "#2563EB",
  },
  {
    role: "VendorCoordinator",
    title: "Vendor Coordinator",
    email: "julian@aureliaevents.com",
    name: "Julian Drake",
    desc: "Vendor CRM directory, quotations & double-booking checks.",
    color: "#0284C7",
  },
  {
    role: "Staff",
    title: "Operations & On-Site Staff",
    email: "claire@aureliaevents.com",
    name: "Claire Bennett",
    desc: "Real-time task execution, attendee check-in & door flow.",
    color: "#7C3AED",
  },
  {
    role: "Client",
    title: "Client Stakeholder",
    email: "client@aureliaguest.com",
    name: "Victoria Sterling",
    desc: "Shared event milestones, contract sign-offs & invoice dues.",
    color: "#4F46E5",
  },
];

export default function FrontWelcomePage({
  organizationName,
  organizationSlug,
  organizationPlan = "Professional",
  brandColor = "#E06B53",
  userRole,
  userName = "Team Member",
  userEmail,
  userAvatar,
  organizations,
  activeOrgId,
  events,
  tasks,
  isLoggedIn = true,
  onLogout,
  onRefreshSession,
  onSwitchOrg,
  onEnterWorkspace,
  notify,
  onOpenCreateEvent,
  onOpenEventDetail,
}: FrontWelcomePageProps) {
  // Navigation & Dropdown states
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [perspectiveTab, setPerspectiveTab] = useState<"organizers" | "finance" | "vendors" | "clients" | "staff">("organizers");

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [targetRole, setTargetRole] = useState<string>("Owner");

  // Form State
  const [loginEmail, setLoginEmail] = useState("olivia@aureliaevents.com");
  const [loginPassword, setLoginPassword] = useState("password123");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regOrgName, setRegOrgName] = useState("");
  const [regRole, setRegRole] = useState("Owner");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Modals
  const [internalCreateModal, setInternalCreateModal] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Open Auth Modal with specific initial role and mode
  const openAuthWithRole = (role: string, mode: "login" | "register" = "login") => {
    setAuthMode(mode);
    setTargetRole(role);
    setAuthError(null);

    const demoAccount = DEMO_ROLE_ACCOUNTS.find((a) => a.role === role);
    if (demoAccount) {
      setLoginEmail(demoAccount.email);
      setLoginPassword("password123");
    }
    setRegRole(role);
    setShowAuthModal(true);
  };

  // 1-Click Direct Role Login & Direct Workspace Entry
  const handleDirectRoleLogin = async (role: string) => {
    let email = "olivia@aureliaevents.com";
    let name = "Olivia Sterling";
    let title = "Organization Owner";

    if (role === "PlatformAdmin" || role === "SaaS Super Admin") {
      email = "superadmin@yenegeacademy.com";
      name = "Yenege Academy Operations";
      title = "SaaS Platform Owner";
    } else {
      const account = DEMO_ROLE_ACCOUNTS.find((a) => a.role === role);
      if (account) {
        email = account.email;
        name = account.name;
        title = account.title;
      }
    }

    try {
      setLoggingInRole(role);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Authenticated as ${name} (${title})!`);
      if (onRefreshSession) await onRefreshSession();
      if (role === "PlatformAdmin" || role === "SaaS Super Admin") {
        window.location.search = "?tab=platform";
      } else {
        onEnterWorkspace();
      }
    } catch (err: any) {
      notify(err.message || "Failed to sign in. Please verify credentials.", "error");
    } finally {
      setLoggingInRole(null);
    }
  };

  // Sign In Handler
  const handleSignIn = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    const emailToUse = customEmail || loginEmail;
    const passwordToUse = customPassword || loginPassword;

    try {
      setLoadingAuth(true);
      setAuthError(null);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse, password: passwordToUse }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Welcome back, ${data.user?.name || "User"}! Authenticated successfully.`);
      setShowAuthModal(false);
      if (onRefreshSession) await onRefreshSession();
      if (data.user?.isPlatformAdmin) {
        window.location.search = "?tab=platform";
      } else {
        onEnterWorkspace();
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign in. Please verify credentials.");
    } finally {
      setLoadingAuth(false);
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingAuth(true);
      setAuthError(null);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          organizationName: regOrgName || `${regName}'s Organization`,
          role: regRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Account created successfully! Welcome to EverFlow.`);
      setShowAuthModal(false);
      if (onRefreshSession) await onRefreshSession();
      onEnterWorkspace();
    } catch (err: any) {
      setAuthError(err.message || "Failed to create account.");
    } finally {
      setLoadingAuth(false);
    }
  };

  // Log Out Handler
  const handleLogoutClick = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      await fetch("/api/auth/logout", { method: "POST" });
      notify("Logged out successfully. All confidential workspace data locked.");
      if (onRefreshSession) await onRefreshSession();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans selection:bg-[#E06B53]/20 relative overflow-x-hidden">
      {/* React Bits LiquidEther Ambient Background */}
      <LiquidEther opacity={0.35} />

      {/* ========================================================================= */}
      {/* 1. FLOATING GLASS TOP NAVIGATION BAR                                      */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 w-full bg-[#FAF8F5]/85 backdrop-blur-xl border-b border-stone-200/70 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* EverFlow Distinctive Brand Identity */}
          <div className="flex items-center gap-8 min-w-0">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-3 shrink-0 group focus:outline-none"
            >
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E06B53] via-[#D05C45] to-[#B34531] flex items-center justify-center shadow-lg shadow-[#E06B53]/25 group-hover:scale-105 transition-transform duration-300">
                <Sparkles className="w-5 h-5 text-white" />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-white/30" />
              </div>

              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-serif font-black tracking-tight text-2xl text-slate-900">
                    EverFlow
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E06B53]" />
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400 mt-0.5">
                  Confidential Event OS
                </span>
              </div>
            </a>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1.5 text-sm font-medium text-stone-600">
              <a
                href="#hero"
                className="px-3.5 py-1.5 rounded-full bg-stone-200/60 text-slate-900 font-semibold transition"
              >
                Home
              </a>
              <Link
                href="/roles"
                className="px-3.5 py-1.5 rounded-full hover:bg-stone-200/40 text-slate-800 hover:text-slate-900 transition flex items-center gap-1.5 font-semibold"
              >
                <Lock className="w-3.5 h-3.5 text-[#E06B53]" />
                <span>Role Gateway</span>
              </Link>
              <a
                href="#ecosystem"
                className="px-3.5 py-1.5 rounded-full hover:bg-stone-200/40 hover:text-slate-900 transition"
              >
                Architecture
              </a>
              <a
                href="#perspectives"
                className="px-3.5 py-1.5 rounded-full hover:bg-stone-200/40 hover:text-slate-900 transition"
              >
                Role Solutions
              </a>
              <a
                href="#faq"
                className="px-3.5 py-1.5 rounded-full hover:bg-stone-200/40 hover:text-slate-900 transition"
              >
                FAQ
              </a>
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Logged In Status vs Guest State */}
            {isLoggedIn && userRole ? (
              <>
                {/* Active Role & User Pill */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-stone-200/90 shadow-2xs">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ backgroundColor: brandColor }}
                  >
                    {userName?.charAt(0) || "U"}
                  </div>
                  <div className="text-left text-xs leading-none">
                    <span className="font-bold text-slate-800">{userName}</span>
                    <span className="text-[10px] text-[#E06B53] font-mono block">
                      {userRole}
                    </span>
                  </div>
                </div>

                {/* Enter Workspace Console Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (userRole === "SaaS Super Admin" || userName?.includes("Yenege")) {
                      window.location.search = "?tab=platform";
                    } else {
                      onEnterWorkspace();
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold transition shadow-sm ${
                    userRole === "SaaS Super Admin" || userName?.includes("Yenege")
                      ? "bg-amber-500 hover:bg-amber-400 text-stone-950 font-black"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {userRole === "SaaS Super Admin" || userName?.includes("Yenege") ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Enter Master Console</span>
                      <ArrowRight className="w-3 h-3 text-stone-900" />
                    </>
                  ) : (
                    <>
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Enter Workspace</span>
                      <ArrowRight className="w-3 h-3 text-stone-400" />
                    </>
                  )}
                </button>

                {/* Switch Role Gateway Link */}
                <Link
                  href="/roles"
                  className="hidden md:inline-flex items-center gap-1.5 h-10 px-3 rounded-full border border-stone-300 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 transition shadow-2xs"
                  title="Switch Role or Account"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#E06B53]" />
                  <span>Roles</span>
                </Link>

                {/* Log Out Button */}
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border border-stone-300 bg-white hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-xs font-bold text-stone-700 transition shadow-2xs"
                  title="Sign out of current workspace"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              </>
            ) : (
              <>
                {/* Role Gateway Link */}
                <Link
                  href="/roles"
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-stone-300 bg-white hover:bg-stone-50 text-xs font-bold text-slate-800 transition shadow-2xs hover:border-stone-400"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#E06B53]" />
                  <span>Role Gateway</span>
                </Link>

                {/* Sign In Button */}
                <Link
                  href="/roles"
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 sm:px-5 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs sm:text-sm font-semibold tracking-tight shadow-md transition-all duration-200"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. BESPOKE HERO SECTION: CONFIDENTIAL ENTERPRISE PORTAL                   */}
      {/* ========================================================================= */}
      <section id="hero" className="relative pt-16 sm:pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient Gradient Mesh Lighting */}
        <div
          aria-hidden="true"
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] pointer-events-none -z-10 rounded-full blur-3xl opacity-75"
          style={{
            background:
              "radial-gradient(circle at 45% 45%, rgba(224, 107, 83, 0.22) 0%, rgba(245, 158, 11, 0.12) 35%, rgba(250, 248, 245, 0) 70%)",
          }}
        />

        <div className="max-w-5xl mx-auto text-center">
          {/* Master Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.07] max-w-4xl mx-auto font-serif">
            Confidential event orchestration for{" "}
            <span className="italic font-normal text-[#E06B53] underline decoration-[#E06B53]/30 underline-offset-8">
              high-stakes
            </span>{" "}
            productions.
          </h1>

          <p className="mt-7 text-base sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Every production schedule, financial contract, budget ledger, and VIP attendee list is
            strictly confidential. Access is partitioned across isolated tenant spaces and guarded by
            verified operational roles.
          </p>

          {/* Hero Action Buttons: Enter Console / Role Gateway */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {isLoggedIn && userRole ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (userRole === "SaaS Super Admin" || userName?.includes("Yenege")) {
                      window.location.search = "?tab=platform";
                    } else {
                      onEnterWorkspace();
                    }
                  }}
                  className={`inline-flex items-center justify-center gap-2 h-13 px-8 rounded-full font-bold text-sm shadow-xl transition-all duration-200 ${
                    userRole === "SaaS Super Admin" || userName?.includes("Yenege")
                      ? "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20"
                      : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/15"
                  }`}
                >
                  {userRole === "SaaS Super Admin" || userName?.includes("Yenege") ? (
                    <>
                      <Sparkles className="w-4 h-4 text-stone-950" />
                      <span>Enter Yenege Master Console (Tier 1)</span>
                      <ArrowRight className="w-4 h-4 text-stone-900" />
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      <span>Enter Workspace ({organizationName})</span>
                      <ArrowRight className="w-4 h-4 text-stone-400" />
                    </>
                  )}
                </button>

                <Link
                  href="/roles"
                  className="inline-flex items-center justify-center gap-2 h-13 px-6 rounded-full bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-sm transition shadow-sm"
                >
                  <KeyRound className="w-4 h-4 text-[#E06B53]" />
                  <span>Switch Role / Account</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="inline-flex items-center justify-center gap-2 h-13 px-5 rounded-full bg-white border border-stone-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-stone-700 font-semibold text-sm transition shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/roles"
                  className="inline-flex items-center justify-center gap-2.5 h-13 px-8 rounded-full bg-[#E06B53] hover:bg-[#d05c45] text-white font-bold text-sm shadow-xl shadow-[#E06B53]/25 transition-all duration-200 hover:scale-102 active:scale-98"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Select Role & Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#ecosystem"
                  className="inline-flex items-center justify-center gap-2 h-13 px-8 rounded-full bg-white border border-stone-300 hover:bg-stone-50 text-slate-800 font-bold text-sm shadow-sm transition-all duration-200"
                >
                  <span>Explore Architecture</span>
                  <ArrowRight className="w-4 h-4 text-stone-400" />
                </a>
              </>
            )}
          </div>

          {/* Security & Confidentiality Proof Strip */}
          <div className="mt-14 pt-8 border-t border-stone-200/80 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                Tenant-Isolated
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 font-mono mt-0.5">
                Zero Data Cross-Talk
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-black font-mono text-[#E06B53]">
                Role Gated
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 font-mono mt-0.5">
                6 Verified Tiers
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600">
                100% Shielded
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 font-mono mt-0.5">
                Ledgers & Budgets
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600">
                Real-Time
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 font-mono mt-0.5">
                Role Coordination
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CONFIDENTIALITY GATEWAY: ROLE-BASED ACCESS PORTAL                      */}
      {/* ========================================================================= */}
      <section id="confidential-gateway" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-8 sm:p-12 relative overflow-hidden">
          {/* Subtle gradient accent */}
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#E06B53]/10 to-transparent rounded-full blur-2xl pointer-events-none"
          />

          <div className="max-w-3xl mb-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#E06B53]/10 text-[#E06B53] mb-3 border border-[#E06B53]/20">
              <Lock className="w-3.5 h-3.5" />
              <span>Strict Role-Based Confidentiality</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-serif tracking-tight">
              Enterprise Role Gateway & Authentication
            </h2>
            <p className="text-sm text-stone-500 mt-2 leading-relaxed">
              To protect client privacy, internal production budgets, run sheets, and vendor contracts,
              access is strictly compartmentalized across 6 operational roles. Click below to enter the dedicated role gateway and sign in to your workspace.
            </p>
          </div>

          {/* Role preview pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 relative z-10">
            {[
              { role: "Executive", title: "Organization Owner", color: "bg-rose-50 text-rose-800 border-rose-200" },
              { role: "Production", title: "Event Manager", color: "bg-amber-50 text-amber-800 border-amber-200" },
              { role: "Finances", title: "Finance Director", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
              { role: "Stakeholder", title: "Client Partner", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
              { role: "Contractor", title: "Vendor Partner", color: "bg-blue-50 text-blue-800 border-blue-200" },
              { role: "Operations", title: "Crew Staff", color: "bg-purple-50 text-purple-800 border-purple-200" },
            ].map((r, idx) => (
              <div key={idx} className={`p-3 rounded-xl border text-center ${r.color}`}>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-75">{r.role}</div>
                <div className="text-xs font-bold mt-0.5 truncate">{r.title}</div>
              </div>
            ))}
          </div>

          {/* Action Callouts */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-stone-100 relative z-10">
            <div className="text-xs text-stone-500 text-center sm:text-left">
              Includes 1-click test credentials for Olivia Sterling, Marcus Vance, Sophia Chen, Victoria Sterling, Alex Rivera & Claire Bennett.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
              <Link
                href="/roles"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-md group"
              >
                <KeyRound className="w-4 h-4 text-[#E06B53]" />
                <span>Go to Role Gateway & Sign In</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. THE EVERFLOW ECOSYSTEM: SECURITY & ARCHITECTURE                        */}
      {/* ========================================================================= */}
      <section id="ecosystem" className="py-20 bg-stone-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#E06B53]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-mono bg-white/10 text-stone-300 mb-3 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-[#E06B53]" />
              <span>Strict Confidentiality Engineering</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-serif tracking-tight text-white leading-tight">
              An architecture engineered for confidential, high-stakes productions.
            </h2>
            <p className="mt-4 text-stone-400 text-sm sm:text-base leading-relaxed">
              Every stage of your event is synchronized in real time across four mission-critical
              pillars without ever risking data leakages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: Run-Sheet Synchronization */}
            <div className="md:col-span-2 bg-gradient-to-br from-stone-800/90 to-stone-900/90 p-8 rounded-3xl border border-stone-700/80 shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#E06B53]/20 text-[#E06B53] flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                  Minute-by-Minute Run-Sheets & Day-of Cueing
                </h3>
                <p className="text-sm text-stone-400 leading-relaxed max-w-xl">
                  Eliminate radio chaos and missed entrances. EverFlow provides synchronized,
                  collaborative run-sheets where every cue, lighting transition, speaker call, and
                  caterer arrival is timed down to the second.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-stone-700/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50">
                  <div className="text-[11px] font-mono text-[#E06B53]">18:00 · Load-in</div>
                  <div className="text-xs font-bold text-white mt-1">Staging & AV Rigging</div>
                </div>
                <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50">
                  <div className="text-[11px] font-mono text-amber-400">19:30 · Arrival</div>
                  <div className="text-xs font-bold text-white mt-1">Red Carpet & VIP Check-In</div>
                </div>
                <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50">
                  <div className="text-[11px] font-mono text-emerald-400">20:15 · Keynote</div>
                  <div className="text-xs font-bold text-white mt-1">Main Stage Showcase</div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Vendor Conflict Guard */}
            <div className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 p-8 rounded-3xl border border-stone-700/80 shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Vendor Conflict Detection & CRM
                </h3>
                <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                  Avoid double-booking errors. EverFlow continuously audits vendor availability,
                  verifies certifications, and requires authorized sign-offs before contractual
                  lock-in.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-mono text-amber-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Zero Double-Booking Guarantee</span>
              </div>
            </div>

            {/* Bento Card 3: Instant QR Attendance */}
            <div className="bg-gradient-to-br from-stone-800/90 to-stone-900/90 p-8 rounded-3xl border border-stone-700/80 shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Fast QR Gate Validation
                </h3>
                <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                  Attendees present cryptographic QR passes from their mobile devices for millisecond
                  scans at the door, keeping VIP guest lines moving smoothly.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-mono text-emerald-400">
                <Zap className="w-4 h-4 shrink-0" />
                <span>Sub-Second Scan Speed</span>
              </div>
            </div>

            {/* Bento Card 4: Multi-Tenant RBAC & Security */}
            <div className="md:col-span-2 bg-gradient-to-br from-stone-800/90 to-stone-900/90 p-8 rounded-3xl border border-stone-700/80 shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                  Strict Tenant Isolation & Role Boundaries
                </h3>
                <p className="text-sm text-stone-400 leading-relaxed max-w-xl">
                  Enterprise-grade data separation. Your events, contracts, financial ledger, and
                  attendee manifests are isolated by tenant boundaries with strict role gating (Owner,
                  Admin, Event Manager, Staff, Client).
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-700/80 flex flex-wrap gap-2">
                {["Owner", "Admin", "EventManager", "FinanceManager", "Staff", "Client"].map((r) => (
                  <span
                    key={r}
                    className="px-3 py-1 rounded-full bg-stone-800 text-[11px] font-mono text-stone-300 border border-stone-700"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SOLUTIONS BY ROLE PERSPECTIVE                                          */}
      {/* ========================================================================= */}
      <section id="perspectives" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#E06B53] font-mono mb-2">
            ✦ Role-Specific Solutions
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif tracking-tight">
            Tailored consoles for every participant in the production
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-2">
            Each role accesses only what is necessary, preserving privacy and precision.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-10">
          <div className="flex bg-stone-200/70 p-1.5 rounded-2xl gap-1 text-xs font-bold flex-wrap justify-center">
            <button
              onClick={() => setPerspectiveTab("organizers")}
              className={`px-4 py-2 rounded-xl transition ${
                perspectiveTab === "organizers"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-stone-600 hover:text-slate-900"
              }`}
            >
              Organizers
            </button>
            <button
              onClick={() => setPerspectiveTab("finance")}
              className={`px-4 py-2 rounded-xl transition ${
                perspectiveTab === "finance"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-stone-600 hover:text-slate-900"
              }`}
            >
              Finance & Billing
            </button>
            <button
              onClick={() => setPerspectiveTab("vendors")}
              className={`px-4 py-2 rounded-xl transition ${
                perspectiveTab === "vendors"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-stone-600 hover:text-slate-900"
              }`}
            >
              Vendors
            </button>
            <button
              onClick={() => setPerspectiveTab("clients")}
              className={`px-4 py-2 rounded-xl transition ${
                perspectiveTab === "clients"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-stone-600 hover:text-slate-900"
              }`}
            >
              Clients
            </button>
            <button
              onClick={() => setPerspectiveTab("staff")}
              className={`px-4 py-2 rounded-xl transition ${
                perspectiveTab === "staff"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-stone-600 hover:text-slate-900"
              }`}
            >
              Operations Staff
            </button>
          </div>
        </div>

        {/* Tab Content Cards */}
        <div className="bg-white rounded-3xl border border-stone-200/90 p-8 sm:p-12 shadow-sm">
          {perspectiveTab === "organizers" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[11px] font-mono uppercase text-[#E06B53] font-bold">
                  For Event Directors & Planners
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 mb-4 font-serif">
                  Master Command Over Every Timeline & Resource
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-6">
                  Build and clone complex events with ready-made blueprints. Assign granular tasks,
                  monitor crew progress, and maintain live run sheets with zero double-booking
                  guarantees.
                </p>
                <Link
                  href="/roles?role=EventManager"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  Sign In as Organizer →
                </Link>
              </div>
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Real-time Readiness Score tracking</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Conflict alerts for overlapping crew assignments</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Pre-built templates for Weddings, Galas & Summits</span>
                </div>
              </div>
            </div>
          )}

          {perspectiveTab === "finance" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[11px] font-mono uppercase text-emerald-600 font-bold">
                  For Finance & Billing Directors
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 mb-4 font-serif">
                  Milestone Invoices & Protected Financial Ledgers
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-6">
                  Issue client deposit invoices, track contracted milestone dates, record wire payments,
                  and reconcile real-time budget variances in full confidentiality.
                </p>
                <Link
                  href="/roles?role=FinanceManager"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition"
                >
                  Sign In as Finance Manager →
                </Link>
              </div>
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Milestone payment tracking with instant status changes</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Strict RBAC: Only finance managers view profit margins</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Exportable financial ledgers and variance audits</span>
                </div>
              </div>
            </div>
          )}

          {perspectiveTab === "vendors" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[11px] font-mono uppercase text-blue-600 font-bold">
                  For Caterers, AV, Florists & Riggers
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 mb-4 font-serif">
                  Crystal-Clear Deliverables & Timed Load-Ins
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-6">
                  View assigned event dates, load-in windows, and agreed service deliverables in one
                  clean portal, avoiding logistical friction and communication breakdown.
                </p>
                <Link
                  href="/roles?role=Vendor"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                >
                  Sign In as Vendor Partner →
                </Link>
              </div>
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Real-time booking confirmations & date reservation</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Clear load-in & tear-down schedules</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Confidentiality: Internal margins hidden on server</span>
                </div>
              </div>
            </div>
          )}

          {perspectiveTab === "clients" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[11px] font-mono uppercase text-indigo-600 font-bold">
                  For Couples, Executives & Hosts
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 mb-4 font-serif">
                  Transparent Visibility Without Operational Clutter
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-6">
                  Clients get an elegant, curated view of approved schedules, milestone invoices, and
                  shared documents without getting overwhelmed by internal operational tasks.
                </p>
                <Link
                  href="/roles?role=Client"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
                >
                  Sign In as Client Stakeholder →
                </Link>
              </div>
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Review & approve shared contracts</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Track invoice milestones and receipts</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Live countdown to production day</span>
                </div>
              </div>
            </div>
          )}

          {perspectiveTab === "staff" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[11px] font-mono uppercase text-purple-600 font-bold">
                  For Stage Hands, Ushers & Floor Crew
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 mb-4 font-serif">
                  Mobile-Ready Cues & Lightning QR Scanning
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-6">
                  On-site crew members access simple, mobile-optimized checklists, real-time stage cues,
                  and sub-second QR code attendance scanning at entrance gates.
                </p>
                <Link
                  href="/roles?role=Staff"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition"
                >
                  Sign In as Operations Staff →
                </Link>
              </div>
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>One-tap task completion checklist</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Fast QR guest check-in at doors</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Timed cue-sheet alerts on mobile</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CONFIDENTIALITY & FAQ ACCORDION                                        */}
      {/* ========================================================================= */}
      <section id="faq" className="py-20 bg-stone-100/60 border-t border-stone-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#E06B53] font-mono mb-2">
              ✦ Data Security & Confidentiality
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 font-serif">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-2">
              Everything you need to know about our strict multi-tenant isolation and role-based access.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Why are event schedules, budgets, and tasks hidden until signing in?",
                a: "EverFlow is an enterprise event operating system hosting sensitive galas, corporate acquisitions, and high-profile private ceremonies. Production budgets, vendor costs, and attendee manifests are confidential trade secrets. Unauthenticated visitors are strictly barred from browsing internal data.",
              },
              {
                q: "How does EverFlow ensure multi-tenant isolation?",
                a: "Every organization operates in a strictly isolated tenant space. User accounts, events, contracts, financial invoices, and guest lists are partition-scoped on the server. No organization can ever view or modify data outside its authorized membership.",
              },
              {
                q: "Can clients see internal vendor cost margins or staff notes?",
                a: "Never. EverFlow enforces strict privacy boundaries. Clients only access documents and invoices explicitly tagged as 'Shared with Client'. Profit margins, internal ratings, and coordinator notes are filtered out on the server before reaching the client view.",
              },
              {
                q: "How does the role-based sign in work?",
                a: "When you sign in or register, you enter with a specific operational role (Owner, Event Manager, Finance Manager, Vendor, Client, or Staff). The platform automatically tailors your permissions, ensuring you only have authority over your designated domain.",
              },
              {
                q: "Can I log out and lock my session immediately?",
                a: "Yes. Clicking the Log Out button immediately destroys your active session cookies, clears all tenant tokens, and redirects you back to this confidential entry portal.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-slate-900 text-sm flex items-center justify-between transition hover:bg-stone-50"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                      openFaqIndex === idx ? "rotate-180 text-[#E06B53]" : ""
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 text-xs text-stone-600 leading-relaxed border-t border-stone-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. LUXURY FOOTER                                                          */}
      {/* ========================================================================= */}
      <footer className="bg-stone-950 text-stone-400 py-16 border-t border-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 pb-12 border-b border-stone-900">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-[#E06B53] flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-serif font-black text-xl text-white">EverFlow</span>
              </div>
              <p className="text-xs text-stone-500 max-w-sm leading-relaxed">
                Confidential event management platform for luxury galas, executive conferences, and
                high-profile private celebrations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isLoggedIn && userRole ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (userRole === "SaaS Super Admin" || userName?.includes("Yenege")) {
                        window.location.search = "?tab=platform";
                      } else {
                        onEnterWorkspace();
                      }
                    }}
                    className="px-5 py-2.5 rounded-full bg-white text-slate-900 text-xs font-bold hover:bg-stone-100 transition shadow-xs"
                  >
                    Enter {userRole === "SaaS Super Admin" || userName?.includes("Yenege") ? "Master Console" : "Workspace"}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="px-4 py-2.5 rounded-full bg-stone-900 text-stone-300 hover:text-white border border-stone-800 text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/roles"
                    className="px-5 py-2.5 rounded-full bg-stone-900 text-stone-200 border border-stone-800 text-xs font-bold hover:bg-stone-800 transition"
                  >
                    Role Gateway & Sign In
                  </Link>
                  <Link
                    href="/roles?mode=register"
                    className="px-5 py-2.5 rounded-full bg-[#E06B53] text-white text-xs font-bold hover:bg-[#d05c45] transition"
                  >
                    Register Workspace
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-600">
            <div>© 2026 EVERFLOW · Confidential Enterprise Platform · Release 1</div>
            <div className="flex items-center gap-4">
              <span className="hover:text-stone-400 transition cursor-pointer">Privacy Policy</span>
              <span>·</span>
              <span className="hover:text-stone-400 transition cursor-pointer">Security Guarantee</span>
              <span>·</span>
              <span className="hover:text-stone-400 transition cursor-pointer">RBAC Terms</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 8. INTERACTIVE ROLE-BASED AUTH MODAL (SIGN IN / SIGN UP)                  */}
      {/* ========================================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E06B53]/15 text-[#E06B53] flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base font-serif">
                    {authMode === "login" ? "Confidential Workspace Sign In" : "Register Role Account"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Target Role: <strong className="text-[#E06B53]">{targetRole}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs: Sign In vs Sign Up */}
            <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                }}
                className={`flex-1 py-2 rounded-lg transition ${
                  authMode === "login"
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                    : "text-stone-600 hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                className={`flex-1 py-2 rounded-lg transition ${
                  authMode === "register"
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                    : "text-stone-600 hover:text-slate-900"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Quick Demo Accounts Selection (For Instant Testing) */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                Quick Demo Role Login (1-Click)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {DEMO_ROLE_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => {
                      setLoginEmail(acc.email);
                      setLoginPassword("password123");
                      setTargetRole(acc.role);
                      handleSignIn(undefined, acc.email, "password123");
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border text-left text-[11px] font-medium transition ${
                      targetRole === acc.role
                        ? "bg-[#E06B53]/10 border-[#E06B53] text-[#E06B53] font-bold"
                        : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <div className="truncate font-semibold">{acc.title}</div>
                    <div className="text-[9px] text-stone-400 truncate">{acc.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* SIGN IN FORM */}
            {authMode === "login" ? (
              <form onSubmit={handleSignIn} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>Enterprise Gated Access</span>
                  </span>
                  <button
                    type="submit"
                    disabled={loadingAuth}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {loadingAuth ? <span>Signing In...</span> : <span>Sign In to Workspace</span>}
                  </button>
                </div>
              </form>
            ) : (
              /* SIGN UP FORM */
              <form onSubmit={handleSignUp} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="eleanor@company.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                    Password (min 6 characters) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                    Organization / Workspace Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Royal Sovereign Events"
                    value={regOrgName}
                    onChange={(e) => setRegOrgName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                    Select Your Operational Role *
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900 bg-white"
                  >
                    <option value="Owner">Organization Owner (Executive & Billing)</option>
                    <option value="EventManager">Event & Production Manager</option>
                    <option value="FinanceManager">Finance & Billing Manager</option>
                    <option value="Vendor">Vendor & Service Partner</option>
                    <option value="VendorCoordinator">Vendor & Logistics Coordinator</option>
                    <option value="Staff">Operations & Door Crew Staff</option>
                    <option value="Client">Client Stakeholder</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                    <span>Tenant-Isolated Access</span>
                  </span>
                  <button
                    type="submit"
                    disabled={loadingAuth}
                    className="px-6 py-2.5 rounded-xl bg-[#E06B53] hover:bg-[#d05c45] text-white font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {loadingAuth ? <span>Creating Account...</span> : <span>Sign Up with Role</span>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
