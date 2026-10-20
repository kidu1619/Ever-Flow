"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Building2,
  Calendar,
  DollarSign,
  Users,
  Clock,
  Briefcase,
  Lock,
  LogIn,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  LogOut,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import LiquidEther from "@/components/LiquidEther";

interface DemoAccount {
  role: string;
  badge: string;
  badgeColor: string;
  title: string;
  email: string;
  name: string;
  desc: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  accentBorder: string;
}

const DEMO_ROLE_ACCOUNTS: DemoAccount[] = [
  {
    role: "Owner",
    badge: "Executive",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    title: "Organization Owner",
    email: "olivia@aureliaevents.com",
    name: "Olivia Sterling",
    desc: "Full administrative authority, multi-tenant governance, billing subscriptions, and overall confidential workspace management.",
    icon: Building2,
    iconBg: "bg-[#E06B53]/15",
    iconColor: "text-[#E06B53]",
    accentBorder: "hover:border-[#E06B53]",
  },
  {
    role: "EventManager",
    badge: "Production",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    title: "Event & Production Manager",
    email: "marcus@aureliaevents.com",
    name: "Marcus Vance",
    desc: "Orchestrate event timelines, minute-by-minute run sheets, stage cues, crew task checklists, and vendor bookings.",
    icon: Calendar,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600",
    accentBorder: "hover:border-amber-400",
  },
  {
    role: "FinanceManager",
    badge: "Finances",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    title: "Finance & Billing Director",
    email: "sophia@aureliaevents.com",
    name: "Sophia Chen",
    desc: "Manage confidential client invoices, record milestone payments, review expense receipts, and audit budget variances.",
    icon: DollarSign,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600",
    accentBorder: "hover:border-emerald-400",
  },
  {
    role: "Client",
    badge: "Stakeholder",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    title: "Client Stakeholder",
    email: "client@aureliaguest.com",
    name: "Victoria Sterling",
    desc: "Review shared milestone schedules, contract sign-offs, and approved invoice dues. Internal operational notes remain hidden.",
    icon: Users,
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-600",
    accentBorder: "hover:border-indigo-400",
  },
  {
    role: "Vendor",
    badge: "Contractor",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    title: "Vendor & Service Partner",
    email: "vendor@grandcrucatering.com",
    name: "Alex Rivera",
    desc: "Access contracted deliverables, load-in timings, catering orders, and AV rigging slots without viewing private organization financials.",
    icon: Briefcase,
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-600",
    accentBorder: "hover:border-blue-400",
  },
  {
    role: "Staff",
    badge: "Operations",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    title: "Operations & Crew Staff",
    email: "claire@aureliaevents.com",
    name: "Claire Bennett",
    desc: "Execute event-day run sheets, toggle real-time task completion, scan attendee QR passes, and manage door entry.",
    icon: Clock,
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-600",
    accentBorder: "hover:border-purple-400",
  },
];

export default function RolesGatewayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active Session state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeOrg, setActiveOrg] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Direct login state
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);
  const [authFeedback, setAuthFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Custom Sign In / Sign Up form state
  const [activeTab, setActiveTab] = useState<"roles" | "custom-login" | "custom-register">("roles");
  const [email, setEmail] = useState("olivia@aureliaevents.com");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [selectedRole, setSelectedRole] = useState("Owner");
  const [submittingCustom, setSubmittingCustom] = useState(false);

  // Check current session
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
            setActiveOrg(data.activeOrganization);
            setCurrentRole(data.currentRole);
          }
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setLoadingSession(false);
      }
    }
    checkSession();
  }, []);

  // Check URL query parameters (e.g. ?role=Vendor or ?mode=register)
  useEffect(() => {
    const roleParam = searchParams.get("role");
    const modeParam = searchParams.get("mode");
    if (modeParam === "register") {
      setActiveTab("custom-register");
    } else if (modeParam === "login") {
      setActiveTab("custom-login");
    }
    if (roleParam) {
      setSelectedRole(roleParam);
      const acc = DEMO_ROLE_ACCOUNTS.find((a) => a.role === roleParam);
      if (acc) {
        setEmail(acc.email);
      }
    }
  }, [searchParams]);

  // 1-Click Direct Role Login
  const handleDirectRoleLogin = async (role: string) => {
    setAuthFeedback(null);
    let targetEmail = "olivia@aureliaevents.com";
    let targetName = "Olivia Sterling";

    if (role === "PlatformAdmin" || role === "SaaS Super Admin") {
      targetEmail = "superadmin@yenegeacademy.com";
      targetName = "Yenege Academy Operations";
    } else {
      const account = DEMO_ROLE_ACCOUNTS.find((a) => a.role === role);
      if (account) {
        targetEmail = account.email;
        targetName = account.name;
      }
    }

    try {
      setLoggingInRole(role);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: "password123" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to sign in");

      setAuthFeedback({
        text: `Authenticated as ${targetName}! Redirecting to workspace...`,
        type: "success",
      });

      setTimeout(() => {
        if (role === "PlatformAdmin" || role === "SaaS Super Admin") {
          window.location.href = "/?tab=platform";
        } else if (role === "FinanceManager" || role === "Finance Manager") {
          window.location.href = "/?tab=finances";
        } else if (role === "Vendor") {
          window.location.href = "/?tab=vendors";
        } else {
          window.location.href = "/?tab=overview";
        }
      }, 500);
    } catch (err: any) {
      setAuthFeedback({
        text: err.message || "Failed to sign in. Please verify credentials.",
        type: "error",
      });
      setLoggingInRole(null);
    }
  };

  // Custom Form Login
  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCustom(true);
    setAuthFeedback(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Login failed");

      setAuthFeedback({
        text: `Welcome back, ${data.user?.name || "User"}! Redirecting to workspace...`,
        type: "success",
      });

      setTimeout(() => {
        if (data.user?.isPlatformAdmin) {
          window.location.href = "/?tab=platform";
        } else {
          window.location.href = "/?tab=overview";
        }
      }, 500);
    } catch (err: any) {
      setAuthFeedback({
        text: err.message || "Failed to sign in. Please check credentials.",
        type: "error",
      });
      setSubmittingCustom(false);
    }
  };

  // Custom Form Register
  const handleCustomRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCustom(true);
    setAuthFeedback(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          organizationName: orgName || `${name}'s Organization`,
          role: selectedRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Registration failed");

      setAuthFeedback({
        text: "Account registered successfully! Redirecting to workspace...",
        type: "success",
      });

      setTimeout(() => {
        window.location.href = "/?tab=overview";
      }, 500);
    } catch (err: any) {
      setAuthFeedback({
        text: err.message || "Failed to register account.",
        type: "error",
      });
      setSubmittingCustom(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setActiveOrg(null);
      setCurrentRole(null);
      setAuthFeedback({
        text: "Logged out successfully. All workspace data locked.",
        type: "success",
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans selection:bg-[#E06B53]/20 relative overflow-x-hidden">
      {/* Ambient background */}
      <LiquidEther opacity={0.28} />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#FAF8F5]/85 backdrop-blur-xl border-b border-stone-200/70 transition-all duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Identity & Back Link */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-stone-300 bg-white hover:bg-stone-50 text-xs font-bold text-slate-700 transition shadow-2xs hover:border-stone-400"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-stone-500" />
              <span>Back to Home</span>
            </Link>

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E06B53] to-[#B34531] flex items-center justify-center text-white shadow-md shadow-[#E06B53]/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <div className="flex items-center gap-1 leading-none">
                  <span className="font-serif font-black tracking-tight text-xl text-slate-900">
                    EverFlow
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E06B53]" />
                </div>
                <span className="text-[9px] font-mono tracking-widest uppercase text-stone-400">
                  Role Gateway
                </span>
              </div>
            </Link>
          </div>

          {/* Right Header Status / Actions */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-stone-200 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-[#E06B53] text-white flex items-center justify-center text-xs font-bold">
                    {currentUser.name?.charAt(0) || "U"}
                  </div>
                  <div className="text-left text-xs leading-none">
                    <span className="font-bold text-slate-800">{currentUser.name}</span>
                    <span className="text-[10px] text-[#E06B53] font-mono block">
                      {currentRole || "Member"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (currentUser.isPlatformAdmin) {
                      window.location.href = "/?tab=platform";
                    } else {
                      window.location.href = "/?tab=overview";
                    }
                  }}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
                >
                  <span>Enter Workspace</span>
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-full border border-stone-300 bg-white hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-stone-600 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-[11px] font-mono text-stone-600">
                <Lock className="w-3 h-3 text-[#E06B53]" />
                <span>Authorized Entry Required</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container with generous, balanced padding */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Page Title & Breadcrumb Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-stone-200 shadow-2xs mb-4">
            <KeyRound className="w-3.5 h-3.5 text-[#E06B53]" />
            <span className="text-xs font-mono font-bold tracking-wide uppercase text-stone-700">
              Role-Based Authentication Gateway
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-serif tracking-tight leading-tight">
            Select Your Operational Role to Enter
          </h1>
          <p className="mt-3 text-sm sm:text-base text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Every production schedule, financial contract, budget ledger, and VIP attendee list is
            partition-scoped. Click your operational role below for instant 1-click access, or sign in with custom credentials.
          </p>
        </div>

        {/* Global Feedback Banner */}
        {authFeedback && (
          <div
            className={`max-w-2xl mx-auto mb-8 p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
              authFeedback.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-rose-50 border-rose-300 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {authFeedback.type === "success" ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{authFeedback.text}</span>
            </div>
            {authFeedback.type === "success" && (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
            )}
          </div>
        )}

        {/* View Switcher Tabs: 1-Click Roles vs Custom Credentials */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1 rounded-2xl bg-stone-200/70 border border-stone-300/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "roles"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-stone-600 hover:text-slate-900"
              }`}
            >
              Verified Role Accounts (1-Click)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom-login")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "custom-login"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-stone-600 hover:text-slate-900"
              }`}
            >
              Custom Email Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom-register")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "custom-register"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-stone-600 hover:text-slate-900"
              }`}
            >
              Register New Organization
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: 1-CLICK VERIFIED ROLE CARDS                                        */}
        {/* ========================================================================= */}
        {activeTab === "roles" && (
          <div className="space-y-8">
            {/* Active User Notification if already logged in */}
            {currentUser && (
              <div className="p-5 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Currently Authenticated: <span className="underline">{currentUser.name}</span>
                    </div>
                    <div className="text-[11px] text-stone-600 mt-0.5">
                      Role: <strong>{currentRole}</strong> • Workspace: <strong>{activeOrg?.name || "Event Workspace"}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentUser.isPlatformAdmin) {
                        window.location.href = "/?tab=platform";
                      } else {
                        window.location.href = "/?tab=overview";
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <span>Enter Active Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Tier 1: SaaS Platform Operator Authority (Yenege Academy) */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-stone-900 via-stone-900 to-slate-950 text-white shadow-xl border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono">
                      Tier 1 • SaaS Platform Operator
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white font-serif">
                    Yenege Academy Platform Operations
                  </h3>
                  <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
                    Licenses EventFlow to event organizer companies. Confirms subscription payment & grants workspace access. Platform admins have zero visibility into tenant private business records.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={loggingInRole !== null}
                  onClick={() => handleDirectRoleLogin("PlatformAdmin")}
                  className="py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-60"
                >
                  {loggingInRole === "PlatformAdmin" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Entering Console...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Enter Platform Console (Yenege)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tier 2: Subscribed Event Organizer Workspace Section Heading */}
            <div className="pt-4">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#E06B53]">
                Tier 2 • Subscribed Event Organizer Workspace
              </div>
              <h2 className="text-xl font-bold font-serif text-slate-900 mt-0.5">
                Aurelia Events & Galas (Organizing Company Team)
              </h2>
              <p className="text-xs text-stone-500 mt-1 max-w-2xl">
                Once granted workspace permission by Yenege Academy upon payment, the Event Organizer (Owner) invites and manages their Event Manager, Finance, Staff, Vendors, and Clients.
              </p>
            </div>

            {/* 6 Confidential Role Cards Grid with balanced spacing & padding */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DEMO_ROLE_ACCOUNTS.map((acc) => {
                const IconComponent = acc.icon;
                const isLoggingIn = loggingInRole === acc.role;

                return (
                  <div
                    key={acc.role}
                    className={`p-6 rounded-2xl bg-white border border-stone-200/90 ${acc.accentBorder} transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between group`}
                  >
                    <div>
                      {/* Top icon and badge */}
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-11 h-11 rounded-xl ${acc.iconBg} ${acc.iconColor} flex items-center justify-center`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${acc.badgeColor}`}>
                          {acc.badge}
                        </span>
                      </div>

                      {/* Role title and description */}
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-800 transition">
                        {acc.title}
                      </h3>
                      <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                        {acc.desc}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-stone-100">
                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={loggingInRole !== null}
                          onClick={() => handleDirectRoleLogin(acc.role)}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs text-center flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          {isLoggingIn ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Entering...</span>
                            </>
                          ) : (
                            <>
                              <LogIn className="w-3.5 h-3.5 text-stone-300" />
                              <span>Sign In (1-Click)</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRole(acc.role);
                            setEmail(acc.email);
                            setActiveTab("custom-register");
                          }}
                          className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
                        >
                          Sign Up
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CUSTOM EMAIL & PASSWORD SIGN IN                                    */}
        {/* ========================================================================= */}
        {activeTab === "custom-login" && (
          <div className="max-w-md mx-auto bg-white rounded-3xl border border-stone-200/90 shadow-md p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#E06B53]/15 text-[#E06B53] flex items-center justify-center mx-auto mb-3">
                <LogIn className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold font-serif text-slate-900">
                Sign In to Workspace
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Enter your verified organization credentials below.
              </p>
            </div>

            <form onSubmit={handleCustomLogin} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                  Work Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900 text-sm"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submittingCustom}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {submittingCustom ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In to Workspace</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 text-center text-xs text-stone-500">
                Want to register a new tenant?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("custom-register")}
                  className="text-[#E06B53] font-bold hover:underline"
                >
                  Create Organization
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: REGISTER NEW ORGANIZATION & ROLE ACCOUNT                           */}
        {/* ========================================================================= */}
        {activeTab === "custom-register" && (
          <div className="max-w-lg mx-auto bg-white rounded-3xl border border-stone-200/90 shadow-md p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#E06B53]/15 text-[#E06B53] flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold font-serif text-slate-900">
                Register Workspace & Role Account
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Provision a partition-scoped organization tenant and invite your team.
              </p>
            </div>

            <form onSubmit={handleCustomRegister} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                  Work Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="eleanor@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900 text-sm"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                  Organization / Company Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Royal Sovereign Events"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] block mb-1">
                  Operational Role Authority *
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/30 text-slate-900 bg-white text-sm"
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

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submittingCustom}
                  className="w-full py-3 px-4 rounded-xl bg-[#E06B53] hover:bg-[#d05c45] text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-[#E06B53]/25 disabled:opacity-50"
                >
                  {submittingCustom ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Tenant Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account & Enter Workspace</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 text-center text-xs text-stone-500">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("custom-login")}
                  className="text-[#E06B53] font-bold hover:underline"
                >
                  Sign in here
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-stone-200/80 bg-white/60 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© 2026 EVERFLOW · Confidential Event OS · Role-Authenticated Portal</div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-900 transition">
              Home
            </Link>
            <span>·</span>
            <Link href="/?tab=welcome#ecosystem" className="hover:text-slate-900 transition">
              Architecture
            </Link>
            <span>·</span>
            <Link href="/?tab=welcome#faq" className="hover:text-slate-900 transition">
              FAQ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
