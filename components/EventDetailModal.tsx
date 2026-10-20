"use client";

import { useEffect, useState } from "react";
import {
  X,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  Pencil,
  Save,
} from "lucide-react";
import { EventStatus, getAvailableNextStatuses, isValidStatusTransition } from "@/lib/events/lifecycle";
import ConfirmDialog from "./ConfirmDialog";

interface TaskItem {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  category: string;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  assignedToName?: string;
  completedAt?: string;
}

interface EventDetail {
  id: string;
  name: string;
  category: string;
  description?: string;
  venue: string;
  startDate: string;
  endDate?: string;
  status: EventStatus;
  capacity?: number;
  budget?: number;
  readinessScore?: number;
  templateSlug?: string;
  cancellationReason?: string;
}

interface EventDetailModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated: () => void;
  notify: (text: string, type?: "success" | "error") => void;
  teamMembers?: { name: string; role: string; email?: string }[];
  canEdit?: boolean;
  canClone?: boolean;
  canDelete?: boolean;
  canTransitionStatus?: boolean;
  initialEditMode?: boolean;
}

const LIFECYCLE_STEPS: EventStatus[] = ["Draft", "Planning", "Preparation", "Execution", "Completed"];

export default function EventDetailModal({
  eventId,
  isOpen,
  onClose,
  onEventUpdated,
  notify,
  teamMembers,
  canEdit = false,
  canClone = false,
  canDelete = false,
  canTransitionStatus = false,
  initialEditMode = false,
}: EventDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const fallbackMembers = [
    { name: "Olivia Sterling", role: "Owner" },
    { name: "Marcus Vance", role: "EventManager" },
    { name: "Sophia Chen", role: "EventManager" },
    { name: "Julian Drake", role: "Staff" },
    { name: "Claire Bennett", role: "Staff" },
  ];
  const membersList = teamMembers && teamMembers.length > 0 ? teamMembers : fallbackMembers;
  const [taskFilter, setTaskFilter] = useState<"all" | "todo" | "in_progress" | "completed">("all");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  // Edit event mode state (FR-10, accessible to EventManager and Admin)
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("Wedding");
  const [editVenue, setEditVenue] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // New task form state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<string>("Logistics");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");

  // Cancel modal state
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // In-app Action Confirmation Dialog (Replaces native browser confirm())
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning";
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const populateEditForm = (ev: EventDetail) => {
    setEditName(ev.name || "");
    setEditCategory(ev.category || "Wedding");
    setEditVenue(ev.venue || "");
    setEditStartDate(ev.startDate ? new Date(ev.startDate).toISOString().slice(0, 10) : "");
    setEditEndDate(ev.endDate ? new Date(ev.endDate).toISOString().slice(0, 10) : "");
    setEditBudget(ev.budget !== undefined ? String(ev.budget) : "");
    setEditCapacity(ev.capacity !== undefined ? String(ev.capacity) : "");
    setEditDescription(ev.description || "");
  };

  const loadEventDetails = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load event");

      setEvent(data.event);
      setTasks(data.tasks || []);
      populateEditForm(data.event);
    } catch (err: any) {
      notify(err.message || "Error loading event details", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && eventId) {
      loadEventDetails();
    }
  }, [isOpen, eventId]);

  useEffect(() => {
    if (isOpen) {
      setIsEditing(Boolean(initialEditMode && canEdit));
    }
  }, [isOpen, initialEditMode, canEdit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle status transition (FR-13)
  const handleTransitionStatus = async (targetStatus: EventStatus, reason?: string) => {
    if (!event) return;
    try {
      setIsTransitioning(true);
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          cancellationReason: reason || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Event status transitioned to "${targetStatus}"!`);
      setShowCancelPrompt(false);
      setCancelReason("");
      await loadEventDetails();
      onEventUpdated();
    } catch (err: any) {
      notify(err.message || "Failed to transition event status", "error");
    } finally {
      setIsTransitioning(false);
    }
  };

  // Toggle task status
  const handleToggleTask = async (task: TaskItem) => {
    const nextStatus =
      task.status === "completed" ? "todo" : task.status === "todo" ? "in_progress" : "completed";
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update task");

      // Optimistic update locally
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
      onEventUpdated();
    } catch (err: any) {
      notify(err.message || "Failed to toggle task", "error");
    }
  };

  // Add new task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !event) return;

    if (!newTaskAssignee) {
      notify("Please select who to assign this task to (or choose 'Unassigned')", "error");
      return;
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          title: newTaskTitle.trim(),
          category: newTaskCategory,
          priority: newTaskPriority,
          dueDate: newTaskDueDate || undefined,
          assignedToName: newTaskAssignee.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add task");

      notify(`Task "${data.task.title}" added and assigned to ${newTaskAssignee}!`);
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setNewTaskAssignee("");
      setShowAddTask(false);
      await loadEventDetails();
      onEventUpdated();
    } catch (err: any) {
      notify(err.message || "Failed to add task", "error");
    }
  };

  // Delete task
  const handleDeleteTask = (taskId: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Checklist Task",
      message: (
        <p>
          Are you sure you want to delete the task <strong>&ldquo;{title}&rdquo;</strong>?
        </p>
      ),
      confirmLabel: "Delete Task",
      cancelLabel: "Keep Task",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to delete task");

          notify(`Task deleted.`);
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          onEventUpdated();
        } catch (err: any) {
          notify(err.message || "Failed to delete task", "error");
        }
      },
    });
  };

  // Clone event (FR-12)
  const handleCloneEvent = async () => {
    if (!event) return;
    try {
      setIsCloning(true);
      const res = await fetch(`/api/events/${event.id}/clone`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to duplicate event");

      notify(`Event duplicated as "${data.event.name}" with all checklist tasks!`);
      onEventUpdated();
      onClose();
    } catch (err: any) {
      notify(err.message || "Failed to duplicate event", "error");
    } finally {
      setIsCloning(false);
    }
  };

  // Archive / Delete event (FR-10, Owner & Admin only)
  const handleDeleteEvent = () => {
    if (!event) return;
    setConfirmDialog({
      isOpen: true,
      title: "Archive Event",
      message: (
        <div className="space-y-2">
          <p>
            Are you sure you want to archive <strong>&ldquo;{event.name}&rdquo;</strong>?
          </p>
          <p className="text-[11px] text-stone-500">
            This will transition the event status to Cancelled and safely remove it from active operations while preserving its financial records and audit history.
          </p>
        </div>
      ),
      confirmLabel: "Archive Event",
      cancelLabel: "Keep Event",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || data.error || "Failed to archive event");

          notify(`Event "${event.name}" has been safely archived.`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          onEventUpdated();
          onClose();
        } catch (err: any) {
          notify(err.message || "Failed to archive event", "error");
        }
      },
    });
  };

  // Save Event Edit (FR-10, accessible to EventManager, Admin, Owner)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    if (!editName.trim()) {
      notify("Event title is required", "error");
      return;
    }
    if (!editVenue.trim()) {
      notify("Venue is required", "error");
      return;
    }
    if (!editStartDate) {
      notify("Start date is required", "error");
      return;
    }

    try {
      setSavingEdit(true);
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory,
          venue: editVenue.trim(),
          startDate: editStartDate,
          endDate: editEndDate || undefined,
          budget: editBudget ? parseFloat(editBudget) : 0,
          capacity: editCapacity ? parseInt(editCapacity, 10) : 0,
          description: editDescription.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to save event updates");

      notify(`Event "${data.event?.name || editName}" updated successfully!`);
      setIsEditing(false);
      await loadEventDetails();
      onEventUpdated();
    } catch (err: any) {
      notify(err.message || "Failed to update event", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const filteredTasks = tasks.filter((t) => (taskFilter === "all" ? true : t.status === taskFilter));
  const availableNext = event ? getAvailableNextStatuses(event.status) : [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FBF9F5] border border-stone-200/90 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-white border-b border-stone-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#E06B53]/15 text-[#E06B53]">
              {event?.category || "Event"}
            </span>
            {event?.templateSlug && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#E06B53]" />
                <span className="capitalize">{event.templateSlug} Template</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  if (!isEditing && event) {
                    populateEditForm(event);
                  }
                  setIsEditing(!isEditing);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs ${
                  isEditing
                    ? "bg-[#E06B53] text-white border-[#E06B53]"
                    : "bg-white border-stone-200 hover:border-stone-300 text-stone-700 hover:bg-stone-50"
                }`}
                title={isEditing ? "Exit editing mode" : "Edit Event Details (Event Manager & Admin)"}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{isEditing ? "Cancel Edit" : "Edit Event"}</span>
              </button>
            )}
            {canClone && (
              <button
                onClick={handleCloneEvent}
                disabled={isCloning}
                className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:border-stone-300 text-xs font-semibold text-stone-700 flex items-center space-x-1.5 transition shadow-xs"
                title="Duplicate event and its tasks checklist"
              >
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>{isCloning ? "Cloning..." : "Duplicate Event"}</span>
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDeleteEvent}
                className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 hover:border-rose-300 hover:bg-rose-50 text-xs font-semibold text-rose-600 flex items-center space-x-1.5 transition shadow-xs"
                title="Archive / Delete Event (Owner & Admin only)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Archive Event</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#E06B53] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-stone-400">Loading event details and checklist tasks...</p>
            </div>
          ) : event ? (
            <>
              {/* Event Details: Edit Form vs View Banner */}
              {isEditing && canEdit ? (
                <form
                  onSubmit={handleSaveEvent}
                  className="p-5 bg-white rounded-3xl border border-[#E06B53]/40 shadow-xs space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-xl bg-[#E06B53]/10 text-[#E06B53] flex items-center justify-center">
                        <Pencil className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Edit Event Information</h3>
                        <p className="text-[11px] text-stone-400">
                          Authorized for Event Managers and Administrators
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (event) populateEditForm(event);
                          setIsEditing(false);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="px-4 py-1.5 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingEdit ? "Saving..." : "Save Changes"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Event Name */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                        Event Title / Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Hana and Abebe Wedding"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#E06B53]"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                        Category *
                      </label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                      >
                        <option value="Wedding">Wedding</option>
                        <option value="Corporate Gala">Corporate Gala</option>
                        <option value="Tech Conference">Tech Conference</option>
                        <option value="Product Launch">Product Launch</option>
                        <option value="Charity Gala">Charity Gala</option>
                        <option value="Private Party">Private Party</option>
                        <option value="Exhibition">Exhibition</option>
                        <option value="Festival">Festival</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Venue */}
                    <div>
                      <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                        Venue / Location *
                      </label>
                      <input
                        type="text"
                        required
                        value={editVenue}
                        onChange={(e) => setEditVenue(e.target.value)}
                        placeholder="e.g. Sheraton Hotel Grand Ballroom"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                      />
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                      />
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                      />
                    </div>

                    {/* Allocated Budget */}
                    <div>
                      <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                        Allocated Budget ($ USD)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={editBudget}
                        onChange={(e) => setEditBudget(e.target.value)}
                        placeholder="75000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                      />
                    </div>

                    {/* Guest Capacity */}
                    <div>
                      <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                        Expected Guest Capacity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(e.target.value)}
                        placeholder="250"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                        Event Description / Scope
                      </label>
                      <textarea
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Detailed schedule notes, executive summaries, or special VIP requirements..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF9F5] border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                      />
                    </div>
                  </div>
                </form>
              ) : (
                /* Read-only Event Title & Metadata Banner */
                <div className="space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <h2 className="text-2xl font-serif font-bold text-slate-900">{event.name}</h2>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          event.status === "Execution"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : event.status === "Completed"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : event.status === "Cancelled"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                  </div>

                  {event.description && <p className="text-xs text-stone-600">{event.description}</p>}

                  {event.cancellationReason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Cancellation Notice:</span> {event.cancellationReason}
                      </div>
                    </div>
                  )}

                  {/* Key Metrics Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 bg-white rounded-xl border border-stone-200/70 shadow-2xs">
                      <div className="text-[10px] text-stone-400 flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span>Venue</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 truncate mt-0.5">{event.venue}</div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200/70 shadow-2xs">
                      <div className="text-[10px] text-stone-400 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>Date</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5">
                        {new Date(event.startDate).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200/70 shadow-2xs">
                      <div className="text-[10px] text-stone-400 flex items-center space-x-1">
                        <DollarSign className="w-3 h-3 text-stone-400" />
                        <span>Allocated Budget</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5">
                        ${(event.budget || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200/70 shadow-2xs">
                      <div className="text-[10px] text-stone-400 flex items-center space-x-1">
                        <Users className="w-3 h-3 text-stone-400" />
                        <span>Expected Guests</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5">
                        {event.capacity || 200} guests
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* LIFECYCLE STATE MACHINE STEPPER (FR-13)                                    */}
              {/* ========================================================================= */}
              <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#E06B53]" />
                    <span>Lifecycle State Pipeline</span>
                  </span>
                  <span className="text-[11px] text-stone-400">Strict server-enforced valid transitions</span>
                </div>

                {/* Horizontal Visual Pipeline */}
                <div className="grid grid-cols-5 gap-1.5 py-1">
                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const isCurrent = event.status === step;
                    const isPast =
                      LIFECYCLE_STEPS.indexOf(event.status) > idx && event.status !== "Cancelled";
                    return (
                      <div
                        key={step}
                        className={`text-center py-2 px-1 rounded-xl text-[11px] font-semibold transition border ${
                          isCurrent
                            ? "bg-[#E06B53] text-white border-[#E06B53] shadow-xs"
                            : isPast
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-stone-50 text-stone-400 border-stone-200/60"
                        }`}
                      >
                        <div className="truncate">{step}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Available Action Buttons */}
                {canTransitionStatus ? (
                  <>
                    <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-stone-500">
                        Next Allowed Transitions:{" "}
                        <span className="font-semibold text-slate-800">
                          {availableNext.length > 0 ? availableNext.join(", ") : "None (Terminal State)"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {availableNext
                          .filter((s) => s !== "Cancelled")
                          .map((nextSt) => (
                            <button
                              key={nextSt}
                              disabled={isTransitioning}
                              onClick={() => handleTransitionStatus(nextSt)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1 transition shadow-xs"
                            >
                              <span>Move to {nextSt}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ))}

                        {availableNext.includes("Cancelled") && (
                          <button
                            onClick={() => setShowCancelPrompt(true)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-medium transition"
                          >
                            Cancel Event
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Cancel Prompt Inline */}
                    {showCancelPrompt && (
                      <div className="mt-3 p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2 animate-in fade-in">
                        <p className="text-xs font-semibold text-rose-900">
                          Are you sure you want to cancel this event?
                        </p>
                        <input
                          type="text"
                          placeholder="Optional cancellation reason (e.g. Client requested postponement)..."
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-rose-200 text-xs text-slate-800 placeholder-stone-400 focus:outline-none"
                        />
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setShowCancelPrompt(false)}
                            className="px-3 py-1 rounded-lg text-xs text-stone-600 hover:bg-stone-100"
                          >
                            Keep Active
                          </button>
                          <button
                            disabled={isTransitioning}
                            onClick={() => handleTransitionStatus("Cancelled")}
                            className="px-3.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
                          >
                            Confirm Cancellation
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <span>
                      Current Status: <strong className="text-slate-800">{event.status}</strong>
                    </span>
                    <span className="text-[11px] text-stone-400 italic">
                      Phase transitions managed by Event Managers and Admins
                    </span>
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* TASKS & CHECKLIST MANAGEMENT (FR-11 & FR-14)                              */}
              {/* ========================================================================= */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <span>Event Tasks & Checklist</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200/70 text-stone-700 font-medium font-mono">
                        {completedTasks} / {totalTasks} Completed
                      </span>
                    </h3>
                    <p className="text-xs text-stone-500">
                      Dynamically calculated progress based on database task records
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Filter Pills */}
                    <div className="flex bg-stone-200/60 p-1 rounded-xl text-[11px] font-medium">
                      {(["all", "todo", "in_progress", "completed"] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setTaskFilter(filter)}
                          className={`px-2.5 py-1 rounded-lg capitalize transition ${
                            taskFilter === filter ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-stone-500"
                          }`}
                        >
                          {filter.replace("_", " ")}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowAddTask(!showAddTask)}
                      className="px-3 py-1.5 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-1 transition shadow-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Task</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">Event Execution Readiness</span>
                    <span className="font-bold text-[#E06B53]">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#E06B53] to-amber-500 transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Inline Add Task Form */}
                {showAddTask && (
                  <form
                    onSubmit={handleAddTask}
                    className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 animate-in fade-in"
                  >
                    <div className="text-xs font-bold text-slate-800">Create New Checklist Task</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                          Task Description *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Finalize live broadcast recording links..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                            Category
                          </label>
                          <select
                            value={newTaskCategory}
                            onChange={(e) => setNewTaskCategory(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
                          >
                            <option value="Logistics">Logistics</option>
                            <option value="Vendors">Vendors</option>
                            <option value="Program">Program</option>
                            <option value="Design">Design</option>
                            <option value="Marketing">Marketing</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                            Priority
                          </label>
                          <select
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value as any)}
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                            Assign To *
                          </label>
                          <select
                            value={newTaskAssignee}
                            onChange={(e) => setNewTaskAssignee(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53] font-medium"
                          >
                            <option value="">-- Assignee --</option>
                            <option value="Unassigned">Unassigned</option>
                            {membersList.map((m) => (
                              <option key={m.name} value={m.name}>
                                {m.name} ({m.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddTask(false)}
                        className="px-3 py-1.5 rounded-xl bg-stone-200 text-stone-700 text-xs font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-[#E06B53] text-white text-xs font-semibold hover:bg-[#c95841]"
                      >
                        Save Task
                      </button>
                    </div>
                  </form>
                )}

                {/* Tasks List */}
                <div className="space-y-2">
                  {filteredTasks.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-stone-200/80 text-stone-400 text-xs">
                      No tasks found for this filter view.
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                          task.status === "completed"
                            ? "bg-emerald-50/50 border-emerald-200/80"
                            : task.status === "in_progress"
                            ? "bg-amber-50/40 border-amber-200/80"
                            : "bg-white border-stone-200/80 hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center space-x-3 truncate pr-3">
                          {/* Toggle Checkbox */}
                          <button
                            onClick={() => handleToggleTask(task)}
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition ${
                              task.status === "completed"
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : task.status === "in_progress"
                                ? "bg-amber-500 border-amber-500 text-white"
                                : "border-stone-300 hover:border-[#E06B53] bg-white"
                            }`}
                          >
                            {task.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {task.status === "in_progress" && <Clock className="w-3 h-3" />}
                          </button>

                          <div className="truncate">
                            <span
                              className={`text-xs font-semibold text-slate-800 ${
                                task.status === "completed" ? "line-through text-stone-400" : ""
                              }`}
                            >
                              {task.title}
                            </span>
                            <div className="flex items-center space-x-2 text-[10px] text-stone-400 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium">
                                {task.category}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-medium ${
                                  task.priority === "high"
                                    ? "bg-rose-100 text-rose-700"
                                    : task.priority === "medium"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-stone-100 text-stone-600"
                                }`}
                              >
                                {task.priority}
                              </span>
                              {task.dueDate && (
                                <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                              )}
                              {task.assignedToName && <span>• {task.assignedToName}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => handleDeleteTask(task.id, task.title)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Action Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        variant={confirmDialog.variant}
        isLoading={confirmDialog.isLoading}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
