"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Download,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  FileSpreadsheet,
} from "lucide-react";

interface EventReportRow {
  id: string;
  name: string;
  category: string;
  status: string;
  venue: string;
  startDate: string;
  estimatedBudget: number;
  actualSpent: number;
  variance: number;
  invoiced: number;
  collected: number;
  outstanding: number;
  tasksCompleted: string;
  readinessScore: number;
}

interface ReportData {
  organizationName: string;
  currency: string;
  metrics: {
    totalEvents: number;
    categoryBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
    totalEstimated: number;
    totalContracted: number;
    totalActual: number;
    variance: number;
    totalInvoiced: number;
    totalCollected: number;
    outstandingClientBalance: number;
    totalTasks: number;
    completedTasks: number;
    blockedTasks: number;
    overdueTasks: number;
    taskCompletionRate: number;
    vendorBookingsCount: number;
  };
  eventReports: EventReportRow[];
}

export default function ReportsView() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 font-serif">Organization Analytics & Reports</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#E06B53]/15 text-[#E06B53]">
              Executive Analytics & Exports
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Performance analytics across events, financial variance, client receivables, and team execution velocity.
          </p>
        </div>

        <a
          href="/api/reports?format=csv"
          download
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-2 transition shadow-xs self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#E06B53]" />
          <span>Export CSV Report</span>
        </a>
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-xs text-stone-400">Computing analytics...</div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Events Managed</span>
              <div className="text-2xl font-bold text-slate-900 font-mono">{data.metrics.totalEvents}</div>
              <div className="text-[10px] text-stone-500">
                {Object.entries(data.metrics.statusBreakdown)
                  .map(([s, c]) => `${c} ${s}`)
                  .join(" • ")}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Financial Variance</span>
              <div
                className={`text-2xl font-bold font-mono flex items-center space-x-1 ${
                  data.metrics.variance >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {data.metrics.variance >= 0 ? (
                  <ArrowDownRight className="w-5 h-5 text-emerald-500" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-rose-500" />
                )}
                <span>${Math.abs(data.metrics.variance).toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-stone-500">
                Estimated ${data.metrics.totalEstimated.toLocaleString()} vs Actual ${data.metrics.totalActual.toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Client Receivables</span>
              <div className="text-2xl font-bold text-blue-600 font-mono">
                ${data.metrics.outstandingClientBalance.toLocaleString()}
              </div>
              <div className="text-[10px] text-stone-500">
                Collected ${data.metrics.totalCollected.toLocaleString()} of ${data.metrics.totalInvoiced.toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Task Completion Rate</span>
              <div className="text-2xl font-bold text-[#E06B53] font-mono">
                {data.metrics.taskCompletionRate}%
              </div>
              <div className="text-[10px] text-stone-500">
                {data.metrics.completedTasks}/{data.metrics.totalTasks} Done • {data.metrics.blockedTasks} Blocked
              </div>
            </div>
          </div>

          {/* Category & Status Breakdown Visuals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#E06B53]" />
                <span>Events by Category</span>
              </h3>
              <div className="space-y-2">
                {Object.entries(data.metrics.categoryBreakdown).map(([cat, count]) => {
                  const pct = Math.round((count / data.metrics.totalEvents) * 100);
                  return (
                    <div key={cat} className="space-y-1 text-xs">
                      <div className="flex justify-between text-stone-700">
                        <span className="font-semibold">{cat}</span>
                        <span className="font-mono text-stone-500">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#E06B53] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-slate-800" />
                <span>Lifecycle Status Distribution</span>
              </h3>
              <div className="space-y-2">
                {Object.entries(data.metrics.statusBreakdown).map(([st, count]) => {
                  const pct = Math.round((count / data.metrics.totalEvents) * 100);
                  return (
                    <div key={st} className="space-y-1 text-xs">
                      <div className="flex justify-between text-stone-700">
                        <span className="font-semibold">{st}</span>
                        <span className="font-mono text-stone-500">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-900 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Granular Event Report Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 font-serif">Comprehensive Event Project Ledger</h3>
            <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Event Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Estimated Budget</th>
                    <th className="py-3 px-4">Actual Cost</th>
                    <th className="py-3 px-4">Variance</th>
                    <th className="py-3 px-4">Invoiced / Bal</th>
                    <th className="py-3 px-4">Tasks</th>
                    <th className="py-3 px-4">Readiness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-slate-700">
                  {data.eventReports.map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{r.name}</div>
                        <div className="text-[10px] text-stone-400 font-normal">{r.venue}</div>
                      </td>
                      <td className="py-3 px-4">{r.category}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-semibold">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">${r.estimatedBudget.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#E06B53]">
                        ${r.actualSpent.toLocaleString()}
                      </td>
                      <td
                        className={`py-3 px-4 font-mono font-bold ${
                          r.variance >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        ${r.variance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-600">
                        <div>${r.invoiced.toLocaleString()}</div>
                        {r.outstanding > 0 ? (
                          <div className="text-[10px] text-blue-600 font-bold">
                            Bal: ${r.outstanding.toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-600 font-bold">Paid</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-500">{r.tasksCompleted}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 font-mono">{r.readinessScore}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
