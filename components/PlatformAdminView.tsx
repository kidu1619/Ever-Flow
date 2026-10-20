"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Building2,
  Users,
  Calendar,
  HardDrive,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  KeyRound,
  RotateCcw,
  Sparkles,
  CreditCard,
  X,
  Check,
} from "lucide-react";

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  brandColor?: string;
  country?: string;
  currency: string;
  status: "trialing" | "active" | "past_due" | "read_only" | "suspended" | "cancelled" | "expired";
  plan: string;
  trialEndsAt: string;
  trialDaysLeft: number;
  limits: {
    maxActiveEvents: number;
    maxTeamMembers: number;
    maxStorageMB: number;
  };
  usage: {
    activeEvents: number;
    members: number;
    storageMB: number;
  };
  supportAccessActive: boolean;
  supportAccessExpiresAt?: string;
  createdAt: string;
}

interface PlatformAdminViewProps {
  notify: (text: string, type?: "success" | "error") => void;
}

export default function PlatformAdminView({ notify }: PlatformAdminViewProps) {
  const [organizations, setOrganizations] = useState<TenantSummary[]>([]);
  const [metrics, setMetrics] = useState({ totalTenants: 0, activeTenants: 0, trialingTenants: 0, suspendedTenants: 0 });
  const [loading, setLoading] = useState(true);

  // Grant Access / Payment Modal State
  const [grantModalOrg, setGrantModalOrg] = useState<TenantSummary | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"Basic" | "Professional" | "Business">("Professional");
  const [paymentReference, setPaymentReference] = useState("");
  const [submittingGrant, setSubmittingGrant] = useState(false);

  const loadPlatformData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/platform");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations || []);
        if (data.platformMetrics) setMetrics(data.platformMetrics);
      }
    } catch (err) {
      console.error("Failed to load platform admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformData();
  }, []);

  const handleAction = async (orgId: string, action: string, extra?: Record<string, any>) => {
    try {
      const res = await fetch("/api/platform", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          action,
          ...extra,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(data.message || "Tenant updated successfully!");
      loadPlatformData();
    } catch (err: any) {
      notify(err.message || "Failed to perform platform action", "error");
    }
  };

  const handleConfirmPaidGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantModalOrg) return;

    try {
      setSubmittingGrant(true);
      await handleAction(grantModalOrg.id, "activate_paid", {
        newPlan: selectedPlan,
        paymentReference: paymentReference.trim() || "Manual Payment Verified by Yenege Academy",
      });
      setGrantModalOrg(null);
      setPaymentReference("");
    } finally {
      setSubmittingGrant(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 font-serif">
              Yenege Academy — SaaS Platform Operations Console
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-600 text-white">
              Platform Owner • Tenant Operations
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Global governance: verify subscriber payments, grant workspace access to event organizer companies, and manage multi-tenant quotas.
          </p>
        </div>
      </div>

      {/* Tenant Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-stone-400">Total Subscribing Companies</span>
          <div className="text-2xl font-bold text-slate-900 font-mono">{metrics.totalTenants}</div>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-700">Active Workspaces (Paid/Active)</span>
          <div className="text-2xl font-bold text-emerald-900 font-mono">{metrics.activeTenants}</div>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-blue-700">Trialing Workspaces</span>
          <div className="text-2xl font-bold text-blue-900 font-mono">{metrics.trialingTenants}</div>
        </div>
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-rose-700">Suspended Workspaces</span>
          <div className="text-2xl font-bold text-rose-900 font-mono">{metrics.suspendedTenants}</div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Event Organizer Workspaces ({organizations.length})</h3>
            <p className="text-[11px] text-stone-400">
              Review event companies, confirm subscription payments, and configure workspace limits.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Event Company & Slug</th>
                <th className="py-3 px-4">Subscription Plan & Status</th>
                <th className="py-3 px-4">Trial / Expiry</th>
                <th className="py-3 px-4">Usage vs Quota</th>
                <th className="py-3 px-4">Support Access</th>
                <th className="py-3 px-4 text-right">Access & Subscription Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    Loading subscribing event companies...
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-stone-50/50 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: org.brandColor || "#E06B53" }}
                        />
                        <span>{org.name}</span>
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono mt-0.5">/{org.slug}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{org.plan}</div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          org.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : org.status === "trialing"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {org.status === "active" ? "Active (Paid)" : org.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-600">
                      {org.status === "active" ? (
                        <div className="text-emerald-700 font-semibold text-[11px]">Subscription Active</div>
                      ) : (
                        <div>{org.trialDaysLeft} days remaining</div>
                      )}
                      <div className="text-[10px] text-stone-400">
                        {org.status === "active" ? "Renews" : "Ends"} {new Date(org.trialEndsAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="space-y-0.5 font-mono text-[11px]">
                        <div>
                          Events: <strong>{org.usage.activeEvents}</strong> / {org.limits.maxActiveEvents}
                        </div>
                        <div>
                          Members: <strong>{org.usage.members}</strong> / {org.limits.maxTeamMembers}
                        </div>
                        <div className="text-stone-400">
                          Storage: {org.usage.storageMB} MB / {org.limits.maxStorageMB} MB
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {org.supportAccessActive ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center space-x-1 w-max">
                          <KeyRound className="w-3 h-3 text-emerald-600" />
                          <span>Granted Active</span>
                        </span>
                      ) : (
                        <span className="text-stone-400 text-[11px] flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>Zero Visibility</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Grant / Activate Workspace upon payment */}
                      {org.status !== "active" ? (
                        <button
                          onClick={() => {
                            setGrantModalOrg(org);
                            setSelectedPlan(
                              org.plan === "Business"
                                ? "Business"
                                : org.plan === "Basic"
                                ? "Basic"
                                : "Professional"
                            );
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition inline-flex items-center space-x-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Grant Access (Confirm Payment)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setGrantModalOrg(org);
                            setSelectedPlan(org.plan as any);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-[11px] font-semibold transition"
                          title="Change Plan Tier and Quotas"
                        >
                          Modify Plan
                        </button>
                      )}

                      {org.status === "suspended" ? (
                        <button
                          onClick={() => handleAction(org.id, "reactivate")}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-semibold transition"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(org.id, "suspend")}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold border border-rose-200 transition"
                          title="Suspend workspace for non-payment"
                        >
                          Suspend
                        </button>
                      )}

                      <button
                        onClick={() => handleAction(org.id, "extend_trial", { extendDays: 14 })}
                        className="px-2 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 text-[11px] font-medium transition"
                        title="Add 14-day grace period"
                      >
                        +14d Trial
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant Access & Confirm Payment Modal (Release 1 SaaS Governance) */}
      {grantModalOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FBF9F5] border border-stone-200/90 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-white border-b border-stone-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-slate-900">
                    Grant Workspace Access (Release 1)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Confirm subscription payment & activate tenant workspace
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGrantModalOrg(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmPaidGrant} className="p-6 space-y-4">
              <div className="p-3.5 bg-stone-100 rounded-2xl text-xs space-y-1">
                <div className="font-semibold text-slate-800">
                  Target Company: <strong>{grantModalOrg.name}</strong>
                </div>
                <div className="text-[11px] text-stone-500">
                  Slug: <code>/{grantModalOrg.slug}</code> • Current Status:{" "}
                  <span className="font-bold uppercase text-stone-700">{grantModalOrg.status}</span>
                </div>
              </div>

              {/* Plan Tier Selection */}
              <div>
                <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-2">
                  Select Subscribed Plan Tier
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Basic", "Professional", "Business"] as const).map((planKey) => (
                    <button
                      key={planKey}
                      type="button"
                      onClick={() => setSelectedPlan(planKey)}
                      className={`p-3 rounded-2xl border text-left transition ${
                        selectedPlan === planKey
                          ? "bg-white border-[#E06B53] shadow-xs ring-2 ring-[#E06B53]/20"
                          : "bg-white/60 border-stone-200 hover:bg-white"
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{planKey}</div>
                      <div className="text-[10px] text-stone-500 mt-1">
                        {planKey === "Basic"
                          ? "5 Events • 5 Seats"
                          : planKey === "Professional"
                          ? "15 Events • 12 Seats"
                          : "50 Events • 30 Seats"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Verification Note */}
              <div>
                <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  Payment Reference / Audit Note (Release 1 Manual Verification)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. Bank Wire Ref #8934, Monthly Retainer Paid, Receipt #1042"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  In Release 1 (MVP), Yenege Academy confirms payment received externally before activating the workspace.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-stone-200">
                <button
                  type="button"
                  disabled={submittingGrant}
                  onClick={() => setGrantModalOrg(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGrant}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
                >
                  {submittingGrant ? (
                    <span>Activating...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Payment & Grant Access</span>
                    </>
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
