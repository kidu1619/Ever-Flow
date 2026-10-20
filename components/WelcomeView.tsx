"use client";

import { useState } from "react";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  MessageSquare,
  FileText,
  ArrowRight,
  ShieldCheck,
  Lock,
  ListTodo,
  CheckSquare2,
  MapPin,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { Role } from "@/lib/auth/permissions";

interface TaskItem {
  id: string;
  eventId: string;
  eventName: string;
  eventCategory?: string;
  title: string;
  description?: string;
  category: string;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  assignedToName?: string;
}

interface EventItem {
  id: string;
  name: string;
  category: string;
  venue: string;
  startDate: string;
  status: string;
  readinessScore?: number;
  tasksCount?: {
    total: number;
    completed: number;
    percentage: number;
  };
}

interface WelcomeViewProps {
  organizationName: string;
  organizationSlug: string;
  userRole: Role | null;
  userName?: string;
  userEmail?: string;
  events: EventItem[];
  tasks: TaskItem[];
  onNavigateTab: (tab: string) => void;
  onOpenEventDetail: (eventId: string) => void;
  onToggleTaskStatus?: (taskId: string, newStatus: "todo" | "in_progress" | "completed") => Promise<void>;
  notify: (text: string, type?: "success" | "error") => void;
}

export default function WelcomeView({
  organizationName,
  organizationSlug,
  userRole,
  userName = "Team Member",
  events,
  tasks,
  onNavigateTab,
  onOpenEventDetail,
  onToggleTaskStatus,
  notify,
}: WelcomeViewProps) {
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const handleTaskCheck = async (task: TaskItem) => {
    if (!onToggleTaskStatus) return;
    try {
      setTogglingTaskId(task.id);
      const nextStatus = task.status === "completed" ? "todo" : "completed";
      await onToggleTaskStatus(task.id, nextStatus);
      notify(`Task "${task.title}" marked as ${nextStatus === "completed" ? "completed ✓" : "to do"}`);
    } catch (err: any) {
      notify(err.message || "Failed to update task", "error");
    } finally {
      setTogglingTaskId(null);
    }
  };

  const isStaff = userRole === "Staff";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-stone-900 to-slate-950 text-white p-8 md:p-10 border border-stone-800 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E06B53]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#E06B53] text-white flex items-center space-x-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Workspace Welcome Portal</span>
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-stone-200 backdrop-blur-xs border border-white/10">
              Role: <strong className="text-white">{userRole || "Staff"}</strong>
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Tenant Isolation Active</span>
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-white">
            Welcome to {organizationName}, {userName.split(" ")[0]}!
          </h1>

          <p className="text-sm md:text-base text-stone-300 leading-relaxed font-light">
            {isStaff
              ? "You have been invited to collaborate with the event organizing team. As a Staff member, you have full operational access to track event timelines, execute checklist tasks, communicate in team channels, and manage guest check-ins."
              : `You are operating in ${organizationName} with ${userRole} authority. Review created events, monitor task progress, and coordinate your team.`}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigateTab("tasks")}
              className="px-5 py-2.5 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-[#E06B53]/25"
            >
              <CheckSquare2 className="w-4 h-4" />
              <span>View All Event Tasks ({tasks.length})</span>
            </button>
            <button
              onClick={() => onNavigateTab("events")}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center space-x-2 transition border border-white/15"
            >
              <Calendar className="w-4 h-4" />
              <span>Browse Created Events ({events.length})</span>
            </button>
            <button
              onClick={() => onNavigateTab("calendar")}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center space-x-2 transition border border-white/15"
            >
              <Clock className="w-4 h-4" />
              <span>Day-of-Event Run Sheets</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Staff Role Capabilities & Confidentiality Policy Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <CheckSquare2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Task & Checklist Execution</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Execute actionable checkpoints, mark logistics and program tasks as completed, and ensure milestone readiness for upcoming events.
          </p>
          <div className="pt-2 text-[11px] font-semibold text-emerald-700 flex items-center space-x-1">
            <span>{completedTasks.length} of {tasks.length} tasks completed</span>
            <span>({completionRate}%)</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Run Sheets & Schedules</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Inspect live chronological run sheets, track load-in times, ceremony cues, vendor deliveries, and stage speeches with 5-minute precision.
          </p>
          <div className="pt-2 text-[11px] font-semibold text-blue-700 flex items-center space-x-1">
            <span>{events.length} active events in calendar</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Confidential Admin Protection</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Organization budgets, invoices, contracts, and platform settings are confidential and isolated to Owners & Admins, keeping your workspace clean and focused.
          </p>
          <div className="pt-2 text-[11px] font-semibold text-amber-700 flex items-center space-x-1">
            <span>Role-Based Access Control Enforced</span>
          </div>
        </div>
      </div>

      {/* 3. Created Events in this Organization */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#E06B53]">
              ORGANIZATION DIRECTORY
            </div>
            <h2 className="text-xl font-serif font-bold text-slate-900">Created Events in {organizationName}</h2>
          </div>
          <button
            onClick={() => onNavigateTab("events")}
            className="text-xs font-semibold text-[#E06B53] hover:underline flex items-center space-x-1"
          >
            <span>View All Events</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-stone-200/80 text-stone-400 text-xs">
            No events created yet in this organization. Your event organizer or admin will create events shortly.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onOpenEventDetail(ev.id)}
                className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-[#E06B53]/40 transition group cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E06B53]/15 text-[#E06B53]">
                      {ev.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                      {ev.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#E06B53] transition line-clamp-1">
                    {ev.name}
                  </h3>

                  <div className="space-y-1 text-xs text-stone-500">
                    <div className="flex items-center space-x-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{ev.venue}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{new Date(ev.startDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-400">
                        {ev.tasksCount?.completed ?? 0} / {ev.tasksCount?.total ?? 0} Tasks Done
                      </span>
                      <span className="font-bold text-[#E06B53]">
                        {ev.tasksCount?.percentage ?? ev.readinessScore ?? 0}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E06B53] rounded-full"
                        style={{ width: `${ev.tasksCount?.percentage ?? ev.readinessScore ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-stone-400 text-[11px]">Click to inspect checklist</span>
                  <span className="text-[#E06B53] font-semibold flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Event Tasks</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Live Event Tasks & Checkpoints Widget */}
      <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#E06B53]">
              LIVE OPERATIONAL CHECKLIST
            </div>
            <h2 className="text-xl font-serif font-bold text-slate-900">
              Active Event Tasks ({pendingTasks.length} Pending)
            </h2>
          </div>

          <button
            onClick={() => onNavigateTab("tasks")}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1.5 transition self-start sm:self-auto shadow-xs"
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Open Tasks Dashboard</span>
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs">
            No tasks created yet. As events are created, their task checklists will appear here.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {tasks.slice(0, 6).map((task) => {
              const isDone = task.status === "completed";
              const isInProgress = task.status === "in_progress";
              return (
                <div
                  key={task.id}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-stone-50/60 px-2 rounded-xl transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <button
                      disabled={togglingTaskId === task.id}
                      onClick={() => handleTaskCheck(task)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                        isDone
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-stone-300 hover:border-[#E06B53] bg-white"
                      }`}
                      title={isDone ? "Mark as to-do" : "Mark as completed"}
                    >
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs font-semibold truncate ${
                            isDone ? "line-through text-stone-400" : "text-slate-800"
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E06B53]/10 text-[#E06B53] shrink-0">
                          {task.eventName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-stone-400 mt-0.5">
                        <span>Category: {task.category}</span>
                        {task.dueDate && (
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                        <span>Assigned: {task.assignedToName || "Team"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isDone
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isInProgress
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-stone-100 text-stone-600 border border-stone-200"
                      }`}
                    >
                      {task.status === "in_progress" ? "In Progress" : task.status}
                    </span>
                    <button
                      onClick={() => onOpenEventDetail(task.eventId)}
                      className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                      title="View Event Details"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Quick Links Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigateTab("calendar")}
          className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-[#E06B53]/50 transition text-left space-y-2 group shadow-2xs"
        >
          <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 group-hover:bg-[#E06B53]/15 group-hover:text-[#E06B53] flex items-center justify-center transition">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-800">Event Run Sheets</div>
          <div className="text-[11px] text-stone-400">Timelines & day-of cues</div>
        </button>

        <button
          onClick={() => onNavigateTab("collaboration")}
          className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-[#E06B53]/50 transition text-left space-y-2 group shadow-2xs"
        >
          <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 group-hover:bg-[#E06B53]/15 group-hover:text-[#E06B53] flex items-center justify-center transition">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-800">Team Hub Channels</div>
          <div className="text-[11px] text-stone-400">Internal operational chat</div>
        </button>

        <button
          onClick={() => onNavigateTab("documents")}
          className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-[#E06B53]/50 transition text-left space-y-2 group shadow-2xs"
        >
          <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 group-hover:bg-[#E06B53]/15 group-hover:text-[#E06B53] flex items-center justify-center transition">
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-800">Event Documents</div>
          <div className="text-[11px] text-stone-400">Floorplans, briefs & files</div>
        </button>

        <button
          onClick={() => onNavigateTab("attendees")}
          className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-[#E06B53]/50 transition text-left space-y-2 group shadow-2xs"
        >
          <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 group-hover:bg-[#E06B53]/15 group-hover:text-[#E06B53] flex items-center justify-center transition">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-800">Guest Check-In</div>
          <div className="text-[11px] text-stone-400">Arrival check-ins & badges</div>
        </button>
      </div>
    </div>
  );
}
