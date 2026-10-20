"use client";

import { useEffect, useState } from "react";
import { Sparkles, Calendar, DollarSign, Users, CheckCircle2, ArrowRight, Layers } from "lucide-react";

interface TemplateTask {
  title: string;
  category: string;
  priority: string;
  daysBeforeEvent: number;
}

interface TemplateItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  badge: string;
  defaultBudget: number;
  defaultCapacity: number;
  taskCount: number;
  tasks: TemplateTask[];
}

interface TemplatesViewProps {
  onSelectTemplate: (templateSlug: string, category: string, budget: number, capacity: number) => void;
  canCreateEvent?: boolean;
}

export default function TemplatesView({ onSelectTemplate, canCreateEvent = true }: TemplatesViewProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState<string | null>("wedding");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/templates");
        const data = await res.json();
        setTemplates(data.templates || []);
      } catch (err) {
        console.error("Failed to load templates", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#E06B53] uppercase tracking-wider">
            PREDEFINED EVENT BLUEPRINTS
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Event Templates & Checklists</h2>
          <p className="text-xs text-stone-500">
            Standardized operational blueprints for luxury weddings, corporate conferences, and university graduations.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#E06B53] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-stone-400">Loading predefined templates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.map((tmpl) => {
            const isExpanded = expandedSlug === tmpl.slug;
            return (
              <div
                key={tmpl.slug}
                className="bg-white rounded-3xl border border-stone-200/80 p-6 flex flex-col justify-between space-y-5 shadow-xs hover:border-stone-300 transition"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E06B53]/15 text-[#E06B53]">
                      {tmpl.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">
                      {tmpl.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold font-serif text-slate-900">{tmpl.name}</h3>
                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">{tmpl.description}</p>
                  </div>

                  {/* Benchmark Specs */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                    <div className="p-2.5 rounded-xl bg-stone-50 text-xs">
                      <span className="text-[10px] text-stone-400 block">Baseline Budget</span>
                      <span className="font-bold text-slate-800">${tmpl.defaultBudget.toLocaleString()}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-stone-50 text-xs">
                      <span className="text-[10px] text-stone-400 block">Guest Scale</span>
                      <span className="font-bold text-slate-800">{tmpl.defaultCapacity} attendees</span>
                    </div>
                  </div>

                  {/* Tasks Preview */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center space-x-1">
                        <Layers className="w-3.5 h-3.5 text-[#E06B53]" />
                        <span>Included Tasks ({tmpl.tasks?.length || 0})</span>
                      </span>
                      <button
                        onClick={() => setExpandedSlug(isExpanded ? null : tmpl.slug)}
                        className="text-[11px] text-[#E06B53] font-semibold hover:underline"
                      >
                        {isExpanded ? "Collapse" : "View All"}
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {(isExpanded ? tmpl.tasks : tmpl.tasks.slice(0, 3)).map((task, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-xl bg-stone-50/80 border border-stone-100 flex items-start space-x-2 text-[11px] text-stone-700"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {canCreateEvent ? (
                  <button
                    onClick={() =>
                      onSelectTemplate(tmpl.slug, tmpl.category, tmpl.defaultBudget, tmpl.defaultCapacity)
                    }
                    className="w-full py-2.5 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Event from Blueprint</span>
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-stone-100 text-stone-500 text-xs font-medium flex items-center justify-center space-x-1.5 cursor-default">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Operational Blueprint Reference</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
