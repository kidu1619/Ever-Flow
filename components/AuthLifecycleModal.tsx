"use client";

import { useState } from "react";
import {
  X,
  KeyRound,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ArrowRight,
  UserPlus,
  Building2,
  Lock,
  Clock,
} from "lucide-react";

interface AuthLifecycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  isEmailVerified?: boolean;
  notify: (text: string, type?: "success" | "error") => void;
  onRefreshSession: () => void;
}

export default function AuthLifecycleModal({
  isOpen,
  onClose,
  currentUserEmail = "olivia@aureliaevents.com",
  isEmailVerified = true,
  notify,
  onRefreshSession,
}: AuthLifecycleModalProps) {
  const [activeTab, setActiveTab] = useState<"register" | "forgot" | "reset" | "verify">("forgot");

  // Registration form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regOrgName, setRegOrgName] = useState("");
  const [loadingRegister, setLoadingRegister] = useState(false);

  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState(currentUserEmail || "olivia@aureliaevents.com");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [loadingForgot, setLoadingForgot] = useState(false);
  const [accountNotFoundError, setAccountNotFoundError] = useState<string | null>(null);

  // Reset password form
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);

  // Verify email form
  const [verifyEmail, setVerifyEmail] = useState(currentUserEmail);
  const [loadingVerify, setLoadingVerify] = useState(false);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Handle registration (FR-01, FR-02)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingRegister(true);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          organizationName: regOrgName || `${regName}'s Events`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Account created successfully for ${regEmail}!`);
      setForgotEmail(regEmail);
      setVerifyEmail(regEmail);
      setActiveTab("forgot");
      setAccountNotFoundError(null);
      onRefreshSession();
    } catch (err: any) {
      notify(err.message || "Failed to register account", "error");
    } finally {
      setLoadingRegister(false);
    }
  };

  // Handle forgot password request (FR-01)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountNotFoundError(null);
    setGeneratedToken(null);
    try {
      setLoadingForgot(true);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404 || data.error === "USER_NOT_FOUND") {
          setAccountNotFoundError(data.message || `No registered account found with email "${forgotEmail}".`);
          return;
        }
        throw new Error(data.message || data.error);
      }

      if (!data.token) {
        setAccountNotFoundError(`No account exists for "${forgotEmail}". Password reset is only available for registered accounts.`);
        return;
      }

      setGeneratedToken(data.token);
      setTokenExpiresAt(data.expiresAt || new Date(Date.now() + 3600000).toISOString());
      setResetUrl(data.resetUrl || "");
      setResetToken(data.token);
      notify(`Expiring reset token generated for ${forgotEmail}!`);
    } catch (err: any) {
      notify(err.message || "Failed to initiate password reset", "error");
    } finally {
      setLoadingForgot(false);
    }
  };

  // Handle confirming password reset (FR-01)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || resetToken.trim() === "token_simulated") {
      notify("Please generate a valid 64-character reset token from Step 1 first.", "error");
      return;
    }

    try {
      setLoadingReset(true);
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken.trim(), newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify("Password updated successfully! You can now log in with your new password.");
      setNewPassword("");
      setGeneratedToken(null);
      setResetToken("");
      onRefreshSession();
    } catch (err: any) {
      notify(err.message || "Failed to reset password", "error");
    } finally {
      setLoadingReset(false);
    }
  };

  // Handle email verification (FR-01, FR-02)
  const handleVerifyEmail = async () => {
    try {
      setLoadingVerify(true);
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify("Email verified successfully!");
      onRefreshSession();
    } catch (err: any) {
      notify(err.message || "Failed to verify email", "error");
    } finally {
      setLoadingVerify(false);
    }
  };

  const copyToken = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FBF9F5] border border-stone-200/90 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-stone-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E06B53]/15 text-[#E06B53] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Authentication & Security Lifecycle</h3>
              <p className="text-[10px] text-stone-400">Account registration, expiring password resets & verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200/80 bg-white px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("forgot")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === "forgot"
                ? "border-[#E06B53] text-[#E06B53]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            1. Request Reset
          </button>
          <button
            onClick={() => setActiveTab("reset")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === "reset"
                ? "border-[#E06B53] text-[#E06B53]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            2. Apply New Password
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === "register"
                ? "border-[#E06B53] text-[#E06B53]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => setActiveTab("verify")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === "verify"
                ? "border-[#E06B53] text-[#E06B53]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            3. Verify Status
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: FORGOT PASSWORD */}
          {activeTab === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-stone-600">
                Initiate a time-limited password reset. The generated reset token expires securely after 1 hour.
              </p>

              <div>
                <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  Target Account Email
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    setAccountNotFoundError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                  placeholder="name@company.com"
                />
              </div>

              {/* Quick Fill Pills */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                  Select Registered Demo Account:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "kidistfeyissa045@gmail.com",
                    "olivia@aureliaevents.com",
                    "marcus@aureliaevents.com",
                    "sophia@aureliaevents.com",
                  ].map((email) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setAccountNotFoundError(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition ${
                        forgotEmail === email
                          ? "bg-[#E06B53]/10 text-[#E06B53] border-[#E06B53]/30 font-bold"
                          : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      {email}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingForgot}
                className="w-full py-2.5 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-xs disabled:opacity-50"
              >
                <span>{loadingForgot ? "Generating..." : "Generate Expiring Reset Token"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Account Not Found Alert */}
              {accountNotFoundError && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-900 animate-in fade-in">
                  <div className="flex items-center space-x-2 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Account Not Registered</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    {accountNotFoundError}
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRegEmail(forgotEmail);
                        setRegName(forgotEmail.split("@")[0]);
                        setActiveTab("register");
                      }}
                      className="px-3 py-1.5 bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Register &ldquo;{forgotEmail}&rdquo; Now →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Display genuine generated token */}
              {generatedToken && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                    <span className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Cryptographic Token Dispatched</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Valid for 60 mins</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-emerald-800">
                    A secure 64-character token was generated in database for <strong>{forgotEmail}</strong>:
                  </p>

                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-[11px] font-mono text-slate-800 break-all flex items-center justify-between shadow-2xs">
                    <span className="truncate pr-2 font-semibold">{generatedToken}</span>
                    <button
                      type="button"
                      onClick={() => copyToken(generatedToken)}
                      className="p-1 text-stone-500 hover:text-stone-800 shrink-0"
                      title="Copy Token"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setResetToken(generatedToken);
                      setActiveTab("reset");
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-xs"
                  >
                    <span>Proceed to Step 2: Apply New Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: RESET PASSWORD */}
          {activeTab === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs text-stone-600">
                Confirm new credentials using the valid time-limited token. Passwords must be at least 6 characters.
              </p>

              {!resetToken && (
                <div className="p-3 bg-stone-100 rounded-xl text-[11px] text-stone-600 flex items-start space-x-2">
                  <KeyRound className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                  <span>
                    No token loaded yet. You can{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("forgot")}
                      className="text-[#E06B53] font-semibold hover:underline"
                    >
                      generate a token in Step 1
                    </button>{" "}
                    or paste one below.
                  </span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  Reset Token (64-character hex)
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste 64-character cryptographic token..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#E06B53]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new secure password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                />
              </div>

              <button
                type="submit"
                disabled={loadingReset || !resetToken}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs disabled:opacity-50"
              >
                {loadingReset ? "Updating..." : "Update Password & Redeem Token"}
              </button>
            </form>
          )}

          {/* TAB 3: CREATE / REGISTER ACCOUNT */}
          {activeTab === "register" && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <p className="text-xs text-stone-600">
                Register a new user account with initial workspace ownership.
              </p>

              <div>
                <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Kidist Feyissa"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="kidistfeyissa045@gmail.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  Password (min 6 characters) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  Workspace / Organization Name (Optional)
                </label>
                <input
                  type="text"
                  value={regOrgName}
                  onChange={(e) => setRegOrgName(e.target.value)}
                  placeholder="Kidist Events & Galas"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                />
              </div>

              <button
                type="submit"
                disabled={loadingRegister}
                className="w-full py-2.5 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-xs disabled:opacity-50"
              >
                <span>{loadingRegister ? "Creating Account..." : "Create Account & Workspace"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* TAB 4: EMAIL VERIFICATION */}
          {activeTab === "verify" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-stone-200/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{verifyEmail}</div>
                  <div className="text-[11px] text-stone-400">Account status verification</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isEmailVerified
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {isEmailVerified ? "Verified (Active)" : "Pending Verification"}
                </span>
              </div>

              <p className="text-xs text-stone-600">
                Only verified accounts can initiate new organizations and become Organization Owners.
              </p>

              <button
                onClick={handleVerifyEmail}
                disabled={loadingVerify || isEmailVerified}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs disabled:opacity-50"
              >
                {loadingVerify ? "Verifying..." : isEmailVerified ? "Email is Verified ✓" : "Mark Email as Verified"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
