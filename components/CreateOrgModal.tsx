"use client";

import { useState } from "react";
import { X, Building2, Globe, Clock, DollarSign, Check, Layers, ArrowRight } from "lucide-react";

interface CreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrgCreated: () => void;
  notify: (text: string, type?: "success" | "error") => void;
}

export default function CreateOrgModal({
  isOpen,
  onClose,
  onOrgCreated,
  notify,
}: CreateOrgModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [country, setCountry] = useState("United States");
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [currency, setCurrency] = useState("USD");
  const [brandColor, setBrandColor] = useState("#E06B53");
  const [starterTemplates, setStarterTemplates] = useState<string[]>([
    "wedding",
    "conference",
    "graduation",
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const toggleTemplate = (templateKey: string) => {
    if (starterTemplates.includes(templateKey)) {
      setStarterTemplates(starterTemplates.filter((t) => t !== templateKey));
    } else {
      setStarterTemplates([...starterTemplates, templateKey]);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          country,
          timeZone,
          currency,
          brandColor,
          starterTemplates,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Organization "${data.organization.name}" created! You are the Workspace Owner on a 14-day trial.`);
      setName("");
      setSlug("");
      onOrgCreated();
      onClose();
    } catch (err: any) {
      notify(err.message || "Failed to create organization", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FBF9F5] border border-stone-200/90 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden text-slate-800 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-stone-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E06B53]/15 text-[#E06B53] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif text-slate-900">Create Organization</h3>
              <p className="text-xs text-stone-500">
                Define organization parameters, geographic locale, and starter templates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Org Name */}
          <div>
            <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              Organization / Company Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Elysian Event Producers"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              Workspace URL Slug
            </label>
            <div className="flex rounded-xl bg-white border border-stone-300 overflow-hidden text-xs">
              <span className="px-3 py-2 bg-stone-100 text-stone-500 border-r border-stone-200">
                everflow.io/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="elysian-events"
                className="flex-1 px-3 py-2 text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Country & Time Zone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
              >
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
                <option value="Sweden">Sweden</option>
                <option value="Switzerland">Switzerland</option>
                <option value="Japan">Japan</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Time Zone
              </label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
              >
                <option value="America/New_York">Eastern Time (US & Canada)</option>
                <option value="America/Chicago">Central Time (US & Canada)</option>
                <option value="America/Denver">Mountain Time (US & Canada)</option>
                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                <option value="Europe/London">London (GMT / BST)</option>
                <option value="Europe/Paris">Paris, Berlin, Rome (CET)</option>
                <option value="Europe/Stockholm">Stockholm (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>
          </div>

          {/* Currency & Brand Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
              >
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="CAD">CAD — Canadian Dollar ($)</option>
                <option value="AUD">AUD — Australian Dollar ($)</option>
                <option value="SEK">SEK — Swedish Krona (kr)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Workspace Accent Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-9 h-9 rounded-xl border border-stone-300 p-0.5 cursor-pointer bg-white"
                />
                <span className="text-xs font-mono text-stone-600">{brandColor}</span>
              </div>
            </div>
          </div>

          {/* Starter Templates */}
          <div>
            <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1.5">
              Starter Templates
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "wedding", label: "Wedding", desc: "8 luxury milestones" },
                { key: "conference", label: "Conference", desc: "8 corporate AV tasks" },
                { key: "graduation", label: "Graduation", desc: "8 ceremony tasks" },
              ].map((tmpl) => {
                const isChecked = starterTemplates.includes(tmpl.key);
                return (
                  <button
                    key={tmpl.key}
                    type="button"
                    onClick={() => toggleTemplate(tmpl.key)}
                    className={`p-2.5 rounded-2xl border text-left transition ${
                      isChecked
                        ? "bg-[#E06B53]/10 border-[#E06B53] text-slate-900"
                        : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{tmpl.label}</span>
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                          isChecked ? "bg-[#E06B53] text-white" : "border border-stone-300"
                        }`}
                      >
                        {isChecked && "✓"}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{tmpl.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trial Notice */}
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
            ★ You will automatically become the <strong>Organization Owner</strong> on a 14-day trial plan with 5 active events and 5 team seats.
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-200 text-stone-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold shadow-xs"
            >
              {loading ? "Creating Organization..." : "Create Organization & Launch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
