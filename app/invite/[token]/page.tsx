"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck, UserCheck, AlertCircle, Sparkles, ArrowRight, Lock, CheckCircle2 } from "lucide-react";

function InviteAcceptContent() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/invitations/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.message || data.error);
        } else {
          setInvitation(data.invitation);
          setName(data.invitation.email.split("@")[0]);
        }
      })
      .catch((err) => {
        setError("Failed to load invitation. Please verify the URL.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password: password || "password123" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to accept invitation");
      }

      setAccepted(true);
      setTimeout(() => {
        router.push("/?tab=welcome");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-slate-800 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-stone-200/40 p-8 space-y-6 relative overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#E06B53] to-[#F2994A]" />

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#E06B53] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-stone-500">Verifying secure invitation token...</p>
          </div>
        ) : error ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Invitation Unavailable</h2>
            <p className="text-sm text-slate-500">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
            >
              Return to EverFlow
            </button>
          </div>
        ) : accepted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Welcome to {invitation?.organization?.name}!</h2>
            <p className="text-sm text-slate-500">Your membership is now active. Redirecting to workspace...</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#E06B53]/10 text-[#E06B53] flex items-center justify-center font-bold text-lg">
                ✦
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-[#E06B53]">EverFlow SaaS</span>
                <h1 className="text-xl font-bold text-slate-900">Workspace Invitation</h1>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60 mb-6 space-y-2">
              <div className="flex justify-between items-center text-xs text-stone-500">
                <span>Organization</span>
                <span className="font-semibold text-slate-800 text-sm">{invitation?.organization?.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-stone-500">
                <span>Assigned Role</span>
                <span className="px-2 py-0.5 rounded-full bg-[#E06B53]/15 text-[#E06B53] font-semibold text-xs">
                  {invitation?.role}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-stone-500">
                <span>Invited Email</span>
                <span className="font-medium text-slate-700">{invitation?.email}</span>
              </div>
            </div>

            <form onSubmit={handleAccept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E06B53] bg-white"
                  placeholder="e.g. David Wright"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Set Account Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E06B53] bg-white"
                    placeholder="Enter safe password"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute right-3.5 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white font-medium text-sm transition shadow-md shadow-[#E06B53]/25 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{submitting ? "Joining Workspace..." : "Accept & Join Workspace"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-stone-400">
              Protected by EverFlow Multi-Tenant Isolation & Role Guard
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-[#E06B53] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  );
}

