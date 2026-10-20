"use client";

import { useState } from "react";
import { X, Sparkles, Calendar, MapPin, DollarSign, Users, Layers, CheckCircle2 } from "lucide-react";
import { PREDEFINED_TEMPLATES } from "@/lib/templates/predefined";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  notify: (text: string, type?: "success" | "error") => void;
  initialTemplateSlug?: string;
  initialCategory?: string;
  initialBudget?: number;
  initialCapacity?: number;
}

export default function CreateEventModal({
  isOpen,
  onClose,
  onEventCreated,
  notify,
  initialTemplateSlug = "",
  initialCategory = "Wedding",
  initialBudget = 45000,
  initialCapacity = 200,
}: CreateEventModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState(initialBudget.toString());
  const [capacity, setCapacity] = useState(initialCapacity.toString());
  const [templateSlug, setTemplateSlug] = useState(initialTemplateSlug);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const selectedTemplate = PREDEFINED_TEMPLATES.find((t) => t.slug === templateSlug);

  const handleTemplateChange = (slug: string) => {
    setTemplateSlug(slug);
    const tmpl = PREDEFINED_TEMPLATES.find((t) => t.slug === slug);
    if (tmpl) {
      setCategory(tmpl.category);
      setBudget(tmpl.defaultBudget.toString());
      setCapacity(tmpl.defaultCapacity.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !venue.trim() || !startDate) return;

    try {
      setLoading(true);
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          venue: venue.trim(),
          startDate,
          endDate: endDate || undefined,
          budget: parseFloat(budget) || 25000,
          capacity: parseInt(capacity, 10) || 200,
          templateSlug: templateSlug || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(
        `Event "${data.event.name}" created successfully${
          data.event.tasksGenerated ? ` with ${data.event.tasksGenerated} template tasks!` : "!"
        }`
      );
      onEventCreated();
      onClose();
    } catch (err: any) {
      notify(err.message || "Failed to create event", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FBF9F5] border border-stone-200/90 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden text-slate-800 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-stone-200/80 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold font-serif text-slate-900">Define New Event</h3>
            <p className="text-xs text-stone-500">
              Initialize event details, dates, and optional predefined task checklist.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Template Selection Pill Selector */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between mb-2">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E06B53]" />
                <span>Predefined Template</span>
              </span>
              <span className="text-[10px] text-stone-400 font-normal">Optional auto-generated tasks</span>
            </label>

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTemplateSlug("")}
                className={`p-3 rounded-2xl border text-center transition ${
                  templateSlug === ""
                    ? "bg-[#E06B53]/15 border-[#E06B53] text-[#E06B53] font-bold"
                    : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                }`}
              >
                <div className="text-xs font-semibold">Blank Event</div>
                <div className="text-[10px] text-stone-400 mt-0.5">Custom Tasks</div>
              </button>

              {PREDEFINED_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.slug}
                  type="button"
                  onClick={() => handleTemplateChange(tmpl.slug)}
                  className={`p-3 rounded-2xl border text-center transition ${
                    templateSlug === tmpl.slug
                      ? "bg-[#E06B53]/15 border-[#E06B53] text-[#E06B53] font-bold"
                      : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  <div className="text-xs font-semibold">{tmpl.category}</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">{tmpl.tasks.length} Tasks</div>
                </button>
              ))}
            </div>

            {/* Template Preview Card */}
            {selectedTemplate && (
              <div className="mt-3 p-3 bg-white rounded-2xl border border-stone-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Applying {selectedTemplate.name}
                  </span>
                  <span className="text-[10px] font-semibold text-[#E06B53]">
                    {selectedTemplate.tasks.length} Checkpoints
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">{selectedTemplate.description}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedTemplate.tasks.slice(0, 4).map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] truncate max-w-[200px]"
                    >
                      ✓ {t.title}
                    </span>
                  ))}
                  {selectedTemplate.tasks.length > 4 && (
                    <span className="text-[10px] text-stone-400 py-0.5">
                      +{selectedTemplate.tasks.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Event Name */}
          <div>
            <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Montecito Cliffside Gala 2026"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
            />
          </div>

          {/* Category & Venue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
              >
                <option value="Wedding">Wedding</option>
                <option value="Conference">Conference</option>
                <option value="Graduation">Graduation</option>
                <option value="Gala">Gala</option>
                <option value="Festival">Festival</option>
                <option value="Corporate Summit">Corporate Summit</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Venue Location *
              </label>
              <input
                type="text"
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. The Glasshouse, Manhattan NY"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Budget & Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Target Budget ($ USD)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Expected Attendees
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
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
              {loading ? "Creating Event..." : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
