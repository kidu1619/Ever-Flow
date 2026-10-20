"use client";

import { useState } from "react";
import {
  CheckSquare2,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Trash2,
  UserCheck,
  Tag,
  AlertTriangle,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

export interface TaskItem {
  id: string;
  eventId: string;
  eventName: string;
  eventCategory?: string;
  eventVenue?: string;
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

interface EventOption {
  id: string;
  name: string;
  category: string;
}

interface TasksViewProps {
  tasks: TaskItem[];
  events: EventOption[];
  teamMembers?: { name: string; role: string; email?: string }[];
  onToggleTaskStatus: (taskId: string, newStatus: "todo" | "in_progress" | "completed") => Promise<void>;
  onAddTask: (taskData: {
    eventId: string;
    title: string;
    description?: string;
    category: string;
    priority: "low" | "medium" | "high";
    dueDate?: string;
    assignedToName?: string;
  }) => Promise<void>;
  onUpdateTask?: (taskId: string, updates: Partial<TaskItem>) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
  onOpenEventDetail: (eventId: string) => void;
  canManageTasks: boolean;
  notify: (text: string, type?: "success" | "error") => void;
}

export default function TasksView({
  tasks,
  events,
  teamMembers,
  onToggleTaskStatus,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onOpenEventDetail,
  canManageTasks,
  notify,
}: TasksViewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // New Task Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEventId, setNewEventId] = useState(events[0]?.id || "");
  const [newCategory, setNewCategory] = useState("Logistics");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [customAssignee, setCustomAssignee] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fallbackMembers = [
    { name: "Olivia Sterling", role: "Owner" },
    { name: "Marcus Vance", role: "EventManager" },
    { name: "Sophia Chen", role: "EventManager" },
    { name: "Julian Drake", role: "Staff" },
    { name: "Claire Bennett", role: "Staff" },
  ];
  const membersList = teamMembers && teamMembers.length > 0 ? teamMembers : fallbackMembers;

  // In-app task delete confirmation
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Statistics
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedEventId !== "All" && t.eventId !== selectedEventId) return false;
    if (selectedStatus !== "All" && t.status !== selectedStatus) return false;
    if (selectedPriority !== "All" && t.priority !== selectedPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchEvent = t.eventName.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchEvent && !matchDesc) return false;
    }
    return true;
  });

  const handleToggle = async (task: TaskItem) => {
    try {
      setTogglingId(task.id);
      const nextStatus = task.status === "completed" ? "todo" : "completed";
      await onToggleTaskStatus(task.id, nextStatus);
      notify(`Task "${task.title}" updated.`);
    } catch (err: any) {
      notify(err.message || "Failed to update task", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: "todo" | "in_progress" | "completed") => {
    try {
      setTogglingId(taskId);
      await onToggleTaskStatus(taskId, newStatus);
      notify(`Task status moved to ${newStatus}.`);
    } catch (err: any) {
      notify(err.message || "Failed to update status", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      notify("Task title is required", "error");
      return;
    }
    if (!newEventId && events.length > 0) {
      notify("Please select an event for this task", "error");
      return;
    }
    if (!newAssignee) {
      notify("Please select who to assign this task to (or choose 'Unassigned')", "error");
      return;
    }

    const finalAssignee =
      newAssignee === "__custom__"
        ? (customAssignee.trim() || "Unassigned")
        : newAssignee;

    try {
      setSubmitting(true);
      await onAddTask({
        eventId: newEventId || events[0]?.id,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory,
        priority: newPriority,
        dueDate: newDueDate || undefined,
        assignedToName: finalAssignee,
      });

      notify(`Task "${newTitle}" created and assigned to ${finalAssignee}!`);
      setShowAddModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      setNewAssignee("");
      setCustomAssignee("");
    } catch (err: any) {
      notify(err.message || "Failed to create task", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#E06B53] uppercase tracking-wider">
            OPERATIONAL TASK MANAGEMENT
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Event Tasks & Checklists</h2>
          <p className="text-xs text-stone-500">
            Real-time checklist management, milestone checkpoints, and task assignment across all organization events.
          </p>
        </div>

        {canManageTasks && (
          <button
            onClick={() => {
              if (events.length > 0 && !newEventId) setNewEventId(events[0].id);
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-2 transition shadow-xs self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event Task</span>
          </button>
        )}
      </div>

      {/* 2. KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
          <div className="text-[11px] text-stone-400 font-medium">Total Tasks</div>
          <div className="text-xl font-bold font-serif text-slate-900 mt-1">{total}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
          <div className="text-[11px] text-stone-400 font-medium">To Do</div>
          <div className="text-xl font-bold font-serif text-slate-700 mt-1">{todo}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
          <div className="text-[11px] text-amber-600 font-medium">In Progress</div>
          <div className="text-xl font-bold font-serif text-amber-700 mt-1">{inProgress}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
          <div className="text-[11px] text-emerald-600 font-medium">Completed</div>
          <div className="text-xl font-bold font-serif text-emerald-700 mt-1">{completed}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] text-[#E06B53] font-medium">Completion Rate</div>
          <div className="text-xl font-bold font-serif text-[#E06B53] mt-1">{completionPercentage}%</div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tasks, descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-slate-800 placeholder-stone-400 focus:outline-none focus:border-[#E06B53]"
          />
        </div>

        {/* Event Selector */}
        <div className="flex items-center space-x-1.5 text-xs">
          <span className="text-stone-400 text-[11px]">Event:</span>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-slate-800 focus:outline-none"
          >
            <option value="All">All Events ({events.length})</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1.5 text-xs">
          <span className="text-stone-400 text-[11px]">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-slate-800 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center space-x-1.5 text-xs">
          <span className="text-stone-400 text-[11px]">Priority:</span>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-slate-800 focus:outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* 4. Tasks List */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckSquare2 className="w-8 h-8 text-stone-300 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-800">No matching tasks found</h4>
            <p className="text-xs text-stone-400">
              {tasks.length === 0
                ? "No tasks have been created in this organization yet. Click 'Add Event Task' above to create one."
                : "Try adjusting your search or filters to see more tasks."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredTasks.map((task) => {
              const isDone = task.status === "completed";
              const isInProgress = task.status === "in_progress";

              return (
                <div
                  key={task.id}
                  className={`p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-stone-50/50 ${
                    isDone ? "bg-stone-50/30" : ""
                  }`}
                >
                  {/* Left: Checkbox & Title */}
                  <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                    <button
                      disabled={togglingId === task.id || !canManageTasks}
                      onClick={() => handleToggle(task)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 mt-0.5 ${
                        isDone
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-stone-300 hover:border-[#E06B53] bg-white cursor-pointer"
                      }`}
                      title={isDone ? "Mark as to-do" : "Mark as completed"}
                    >
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            isDone ? "line-through text-stone-400" : "text-slate-900"
                          }`}
                        >
                          {task.title}
                        </span>

                        {/* Event Link Chip */}
                        <button
                          onClick={() => onOpenEventDetail(task.eventId)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E06B53]/10 text-[#E06B53] hover:bg-[#E06B53]/20 transition flex items-center space-x-1"
                          title="Open Event Details"
                        >
                          <span>{task.eventName}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>

                        {/* Priority Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            task.priority === "high"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : task.priority === "medium"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {task.priority}
                        </span>

                        {/* Category */}
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600">
                          {task.category}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-stone-500 line-clamp-1">{task.description}</p>
                      )}

                      {task.isBlocked && task.blockedReason && (
                        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 flex items-start space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Blocked:</strong> {task.blockedReason}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 pt-0.5">
                        {task.dueDate && (
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-stone-400" />
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          </span>
                        )}
                        <div className="flex items-center space-x-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="text-stone-500 font-medium">Assignee:</span>
                          <select
                            value={task.assignedToName || "Unassigned"}
                            disabled={!canManageTasks}
                            onChange={async (e) => {
                              const nextAssignee = e.target.value;
                              try {
                                if (onUpdateTask) {
                                  await onUpdateTask(task.id, { assignedToName: nextAssignee });
                                } else {
                                  const res = await fetch(`/api/tasks/${task.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ assignedToName: nextAssignee }),
                                  });
                                  if (!res.ok) throw new Error("Failed to reassign task");
                                  task.assignedToName = nextAssignee;
                                }
                                notify(`Task "${task.title}" assigned to ${nextAssignee}`);
                              } catch (err: any) {
                                notify(err.message || "Failed to update assignee", "error");
                              }
                            }}
                            className="bg-stone-50 hover:bg-stone-100 border border-stone-200/90 text-stone-700 text-[11px] rounded-lg px-2 py-0.5 font-medium cursor-pointer focus:outline-none focus:border-[#E06B53] transition"
                            title="Click to reassign this task"
                          >
                            <option value="Unassigned">Unassigned</option>
                            {membersList.map((m) => (
                              <option key={m.name} value={m.name}>
                                {m.name} ({m.role})
                              </option>
                            ))}
                            {task.assignedToName &&
                              task.assignedToName !== "Unassigned" &&
                              !membersList.some((m) => m.name === task.assignedToName) && (
                                <option value={task.assignedToName}>{task.assignedToName}</option>
                              )}
                          </select>
                        </div>
                        {task.completedAt && (
                          <span className="text-emerald-600 font-medium">
                            Completed on {new Date(task.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Dropdown & Actions */}
                  <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                    <select
                      value={task.status}
                      disabled={!canManageTasks || togglingId === task.id}
                      onChange={(e) =>
                        handleStatusChange(task.id, e.target.value as "todo" | "in_progress" | "completed")
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        isDone
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : isInProgress
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-stone-100 text-stone-700 border-stone-200"
                      }`}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed ✓</option>
                    </select>

                    {onDeleteTask && canManageTasks && (
                      <button
                        onClick={() => setTaskToDelete({ id: task.id, title: task.title })}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FBF9F5] border border-stone-200/90 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-800">
            <div className="px-6 py-5 bg-white border-b border-stone-200/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-serif text-slate-900">Create Event Task</h3>
                <p className="text-xs text-stone-500">Add an operational checklist item for this event</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  Assign To Event *
                </label>
                <select
                  required
                  value={newEventId}
                  onChange={(e) => setNewEventId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Confirm audio rig power drop with venue engineer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="Logistics">Logistics</option>
                    <option value="Program">Program</option>
                    <option value="Vendors">Vendors</option>
                    <option value="Design">Design</option>
                    <option value="Production">Production</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as "low" | "medium" | "high")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                    Assign Task To *
                  </label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53] font-medium"
                  >
                    <option value="">-- Select Team Member --</option>
                    <option value="Unassigned">Unassigned (General Queue)</option>
                    {membersList.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                    <option value="__custom__">+ Custom Assignee Name...</option>
                  </select>
                  {newAssignee === "__custom__" && (
                    <input
                      type="text"
                      placeholder="Enter assignee name..."
                      value={customAssignee}
                      onChange={(e) => setCustomAssignee(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  Description / Operational Notes
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Additional context, checkpoint instructions, or vendor requirements..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold shadow-xs transition"
                >
                  {submitting ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* In-App Delete Task Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(taskToDelete)}
        title="Delete Task"
        message={
          <p>
            Are you sure you want to delete <strong>&ldquo;{taskToDelete?.title}&rdquo;</strong>?
          </p>
        }
        confirmLabel="Delete Task"
        cancelLabel="Keep Task"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!taskToDelete || !onDeleteTask) return;
          try {
            setIsDeleting(true);
            await onDeleteTask(taskToDelete.id);
            setTaskToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
        onClose={() => setTaskToDelete(null)}
      />
    </div>
  );
}
