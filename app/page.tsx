"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Users,
  Briefcase,
  FileText,
  Clock,
  DollarSign,
  Shield,
  Settings,
  Plus,
  Search,
  Bell,
  ChevronDown,
  Building2,
  Sparkles,
  ArrowRight,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  SlidersHorizontal,
  FolderKanban,
  AlertTriangle,
  Lock,
  Compass,
  FileCheck2,
  ListFilter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  CalendarDays,
  MapPin,
  TrendingUp,
  CreditCard,
  Trash2,
  Pencil,
  MessageSquare,
  BarChart3,
  UserCheck,
  FileSpreadsheet,
  RotateCcw,
} from "lucide-react";
import { Role, Permission, ROLE_DEFINITIONS, ROLE_PERMISSIONS, getRoleDisplayName } from "@/lib/auth/permissions";
import EventDetailModal from "@/components/EventDetailModal";
import TemplatesView from "@/components/TemplatesView";
import AuthLifecycleModal from "@/components/AuthLifecycleModal";
import CreateEventModal from "@/components/CreateEventModal";
import CreateOrgModal from "@/components/CreateOrgModal";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import VendorsView from "@/components/VendorsView";
import ClientsView from "@/components/ClientsView";
import FinancesView from "@/components/FinancesView";
import CalendarView from "@/components/CalendarView";
import CollaborationView from "@/components/CollaborationView";
import DocumentsView from "@/components/DocumentsView";
import AttendeesView from "@/components/AttendeesView";
import ReportsView from "@/components/ReportsView";
import PlatformAdminView from "@/components/PlatformAdminView";
import WelcomeView from "@/components/WelcomeView";
import TasksView from "@/components/TasksView";
import FrontWelcomePage from "@/components/FrontWelcomePage";
import ConfirmDialog from "@/components/ConfirmDialog";
import InstructionBanner from "@/components/InstructionBanner";
import LiquidEther from "@/components/LiquidEther";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  emailVerified: boolean;
  status: string;
  isPlatformAdmin?: boolean;
}

interface ActiveOrgInfo {
  id: string;
  name: string;
  slug: string;
  brandColor?: string;
  country?: string;
  currency: string;
  timeZone: string;
  status: string;
  plan: string;
  trialEndsAt: string;
  limits: {
    maxActiveEvents: number;
    maxTeamMembers: number;
    maxStorageMB: number;
  };
  isInspecting?: boolean;
  isPlatformRoot?: boolean;
}

interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  brandColor?: string;
  status: string;
  plan: string;
  role: Role;
  membershipStatus: string;
}

interface EventItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  venue: string;
  startDate: string;
  endDate?: string;
  status: string;
  capacity?: number;
  budget?: number;
  readinessScore?: number;
  templateSlug?: string;
  imageUrl?: string;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  tasksCount?: {
    total: number;
    completed: number;
    percentage: number;
  };
}

interface MemberItem {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  status: "active" | "suspended";
  joinedAt: string;
  isOwner: boolean;
}

interface InvitationItem {
  id: string;
  email: string;
  role: Role;
  status: string;
  token: string;
  expiresAt: string;
  invitedBy: string;
  inviteUrl: string;
}

interface AuditLogItem {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

export default function Release1EverFlowDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "welcome"
    | "tasks"
    | "events"
    | "vendors"
    | "clients"
    | "finances"
    | "calendar"
    | "collaboration"
    | "documents"
    | "attendees"
    | "templates"
    | "team"
    | "reports"
    | "platform"
    | "auth"
    | "workspaces"
    | "matrix"
    | "audit"
  >("overview");

  // Auth & Tenant Context (FR-01, FR-02, FR-04, FR-05)
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeOrg, setActiveOrg] = useState<ActiveOrgInfo | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);

  // Domain Data
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsSummary, setEventsSummary] = useState<{
    totalEvents: number;
    activeEvents: number;
    completedEvents: number;
    totalTasksCount: number;
    totalCompletedTasksCount: number;
    overallTaskPercentage: number;
  }>({
    totalEvents: 0,
    activeEvents: 0,
    completedEvents: 0,
    totalTasksCount: 0,
    totalCompletedTasksCount: 0,
    overallTaskPercentage: 0,
  });

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [memberLimits, setMemberLimits] = useState({ current: 0, max: 5 });
  const [tasks, setTasks] = useState<any[]>([]);
  const [enteredWorkspace, setEnteredWorkspace] = useState(false);

  // Filters for Events Directory (FR-15)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");

  // Modals & Popups
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedEventIdForDetail, setSelectedEventIdForDetail] = useState<string | null>(null);
  const [openInEditMode, setOpenInEditMode] = useState(false);

  // In-app Action Confirmation Dialog (Replaces native browser confirm())
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "primary";
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Pre-filled template props when clicked from Templates Explorer
  const [eventModalInitialTemplate, setEventModalInitialTemplate] = useState<{
    slug: string;
    category: string;
    budget: number;
    capacity: number;
  }>({ slug: "", category: "Wedding", budget: 45000, capacity: 200 });

  // Notification Toast
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);


  // Invite Form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("Staff");
  const [createdInvite, setCreatedInvite] = useState<{
    email: string;
    role: Role;
    token: string;
    inviteUrl: string;
  } | null>(null);

  // Sync tab with URL hash/params
  useEffect(() => {
    const handleUrlTab = () => {
      const hash = window.location.hash.replace("#", "");
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") || hash;
      if (tabParam === "roles") {
        window.location.href = "/roles";
        return;
      }
      const validTabs = [
        "overview",
        "welcome",
        "tasks",
        "events",
        "vendors",
        "clients",
        "finances",
        "calendar",
        "collaboration",
        "documents",
        "attendees",
        "templates",
        "team",
        "reports",
        "platform",
        "auth",
        "workspaces",
        "matrix",
        "audit",
      ];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam as any);
        if (tabParam === "welcome") {
          setEnteredWorkspace(false);
        } else {
          setEnteredWorkspace(true);
        }
      } else {
        // By default, stay on the front welcome page before entering workspace
        setEnteredWorkspace(false);
      }
    };
    handleUrlTab();
    window.addEventListener("hashchange", handleUrlTab);
    return () => window.removeEventListener("hashchange", handleUrlTab);
  }, []);

  const canAccessTab = (tab: string): boolean => {
    switch (tab) {
      case "overview":
      case "welcome":
      case "calendar":
      case "collaboration":
      case "documents":
        return true;
      case "tasks":
        // Only internal operational team with task:manage (Owner, Admin, EventManager, Staff)
        return permissions.includes("task:manage");
      case "events":
        // Events Directory: Only internal team (Owner, Admin, EventManager, Staff).
        // External Vendor and Client MUST NOT browse the company's events directory!
        return currentRole !== "Vendor" && currentRole !== "Client" && permissions.includes("event:view");
      case "attendees":
        // Guest List & Passes: Only for team members who manage attendees (Owner, Admin, EventManager, Staff)
        return permissions.includes("attendee:manage");
      case "templates":
        return permissions.includes("event:create");
      case "vendors":
        return permissions.includes("vendor:view");
      case "clients":
        return permissions.includes("client:view");
      case "finances":
        return permissions.includes("finance:view");
      case "reports":
        return permissions.includes("finance:view") || permissions.includes("org:settings:view");
      case "team":
        return permissions.includes("member:view");
      case "workspaces":
        return permissions.includes("org:settings:view");
      case "matrix":
        return currentRole === "Owner" || currentRole === "Admin" || Boolean(user?.isPlatformAdmin);
      case "platform":
        return Boolean(user?.isPlatformAdmin);
      case "auth":
        return currentRole === "Owner" || currentRole === "Admin" || Boolean(user?.isPlatformAdmin);
      case "audit":
        return permissions.includes("audit:view");
      default:
        return true;
    }
  };

  const switchTab = (tab: typeof activeTab) => {
    if (!canAccessTab(tab)) {
      notify(`Confidential: Role "${currentRole}" does not have authority to access this module.`, "error");
      return;
    }
    if (tab === "welcome") {
      setEnteredWorkspace(false);
    } else {
      setEnteredWorkspace(true);
    }
    setActiveTab(tab);
    window.history.replaceState(null, "", `?tab=${tab}`);
  };

  // Guard tab against unauthorized role view
  useEffect(() => {
    if (!loading && currentRole && !canAccessTab(activeTab)) {
      const fallbackTab = user?.isPlatformAdmin
        ? "platform"
        : currentRole === "Vendor"
        ? "vendors"
        : "overview";
      setActiveTab(fallbackTab);
      window.history.replaceState(null, "", `?tab=${fallbackTab}`);
    }
  }, [activeTab, currentRole, permissions, loading, user]);

  // Platform Admin (Yenege) guard: If not inspecting a tenant and on overview, redirect to platform console
  useEffect(() => {
    if (!loading && user?.isPlatformAdmin && activeTab === "overview" && !activeOrg?.isInspecting) {
      setActiveTab("platform");
      window.history.replaceState(null, "", "?tab=platform");
    }
  }, [loading, user, activeTab, activeOrg]);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // 1. Initial Load & Seed Detection
  const loadUserAndTenantState = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/me");
      const data = await res.json();

      if (!data.authenticated || !data.activeOrganization) {
        // Automatically seed rich demo data on initial fresh run for frictionless review
        await fetch("/api/seed", { method: "POST" });
        const retryRes = await fetch("/api/auth/me");
        const retryData = await retryRes.json();
        setUser(retryData.user);
        setActiveOrg(retryData.activeOrganization);
        setCurrentRole(retryData.currentRole);
        setPermissions(retryData.permissions || []);
        setOrganizations(retryData.organizations || []);
      } else {
        setUser(data.user);
        setActiveOrg(data.activeOrganization);
        setCurrentRole(data.currentRole);
        setPermissions(data.permissions || []);
        setOrganizations(data.organizations || []);

        // Platform Admin (Yenege Academy) defaults directly to Platform Master Console
        if (data.user?.isPlatformAdmin) {
          const hash = window.location.hash.replace("#", "");
          const params = new URLSearchParams(window.location.search);
          const tabParam = params.get("tab") || hash;
          if (!tabParam || tabParam === "overview" || tabParam === "welcome") {
            setActiveTab("platform");
            setEnteredWorkspace(true);
            window.history.replaceState(null, "", "?tab=platform");
          }
        } else if (data.currentRole === "FinanceManager" || data.currentRole === "Finance Manager") {
          const hash = window.location.hash.replace("#", "");
          const params = new URLSearchParams(window.location.search);
          const tabParam = params.get("tab") || hash;
          if (!tabParam || tabParam === "overview" || tabParam === "welcome") {
            setActiveTab("finances");
            setEnteredWorkspace(true);
            window.history.replaceState(null, "", "?tab=finances");
          }
        } else if (data.currentRole === "Vendor") {
          const hash = window.location.hash.replace("#", "");
          const params = new URLSearchParams(window.location.search);
          const tabParam = params.get("tab") || hash;
          if (!tabParam || tabParam === "overview" || tabParam === "welcome") {
            setActiveTab("vendors");
            setEnteredWorkspace(true);
            window.history.replaceState(null, "", "?tab=vendors");
          }
        }
      }
    } catch (err) {
      console.error("Failed to load user session", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserAndTenantState();
  }, []);

  // 2. Load Tenant-Scoped Data when activeOrg changes
  const refreshTenantData = async () => {
    if (!activeOrg) return;

    try {
      // Build query params for events
      const params = new URLSearchParams();
      if (selectedCategoryFilter !== "All") params.append("category", selectedCategoryFilter);
      if (selectedStatusFilter !== "All") params.append("status", selectedStatusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const evRes = await fetch(`/api/events?${params.toString()}`);
      if (evRes.ok) {
        const evData = await evRes.json();
        setEvents(evData.events || []);
        if (evData.summary) setEventsSummary(evData.summary);
      }

      // Tenant members & invitations (guarded by member:view)
      const memRes = await fetch("/api/members");
      if (memRes.ok) {
        const memData = await memRes.json();
        setMembers(memData.members || []);
        setInvitations(memData.invitations || []);
        if (memData.limits) setMemberLimits(memData.limits);
      }

      // Tenant audit logs (guarded by audit:view)
      const auditRes = await fetch("/api/audit-logs?limit=25");
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData.logs || []);
      }

      // Tenant tasks (for Welcome view, Tasks manager, and Overview)
      const taskRes = await fetch("/api/tasks");
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData.tasks || []);
      }
    } catch (err) {
      console.error("Error refreshing tenant data", err);
    }
  };

  // Toggle task status
  const handleToggleTaskStatus = async (
    taskId: string,
    newStatus: "todo" | "in_progress" | "completed"
  ) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId || t._id === taskId
              ? {
                  ...t,
                  status: newStatus,
                  completedAt: newStatus === "completed" ? new Date().toISOString() : undefined,
                }
              : t
          )
        );
        notify(newStatus === "completed" ? "Task marked completed!" : `Task status set to ${newStatus}`);
        // Refresh event progress metrics
        const evRes = await fetch("/api/events");
        if (evRes.ok) {
          const evData = await evRes.json();
          setEvents(evData.events || []);
          if (evData.summary) setEventsSummary(evData.summary);
        }
      } else {
        notify(data.message || "Failed to update task", "error");
      }
    } catch (err) {
      notify("Network error updating task", "error");
    }
  };

  // Add new event task
  const handleAddTask = async (taskData: {
    eventId: string;
    title: string;
    description?: string;
    category: string;
    priority: "low" | "medium" | "high";
    dueDate?: string;
    assignedToName?: string;
  }) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      const data = await res.json();
      if (res.ok) {
        notify("Event task created successfully!");
        setTasks((prev) => [data.task, ...prev]);
        refreshTenantData();
      } else {
        notify(data.message || "Failed to create task", "error");
      }
    } catch (err) {
      notify("Network error creating task", "error");
    }
  };

  // Delete event task
  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        notify("Task removed");
        setTasks((prev) => prev.filter((t) => t.id !== taskId && t._id !== taskId));
        refreshTenantData();
      } else {
        const data = await res.json();
        notify(data.message || "Failed to delete task", "error");
      }
    } catch (err) {
      notify("Network error deleting task", "error");
    }
  };

  // Update event task properties (e.g. reassigning assignee)
  const handleUpdateTask = async (taskId: string, updates: any) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId || t._id === taskId ? { ...t, ...updates } : t))
        );
        refreshTenantData();
      } else {
        notify(data.message || "Failed to update task", "error");
      }
    } catch (err) {
      notify("Network error updating task", "error");
    }
  };

  // Archive / Delete event (FR-10, Owner and Admin only)
  const handleDeleteEvent = (e: React.MouseEvent, eventId: string, eventName: string) => {
    e.stopPropagation();
    if (!permissions.includes("event:delete")) {
      notify("Only Organization Owners and Admins can archive/delete events.", "error");
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: "Archive Event",
      message: (
        <div className="space-y-2">
          <p>
            Are you sure you want to archive <strong>&ldquo;{eventName}&rdquo;</strong>?
          </p>
          <p className="text-[11px] text-stone-500">
            This will transition the event to Cancelled and safely remove it from active operations while preserving its financial records and audit history.
          </p>
        </div>
      ),
      confirmLabel: "Archive Event",
      cancelLabel: "Keep Event",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || data.error || "Failed to archive event");

          notify(`Event "${eventName}" has been archived.`);
          if (selectedEventIdForDetail === eventId) {
            setSelectedEventIdForDetail(null);
          }
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          await refreshTenantData();
        } catch (err: any) {
          notify(err.message || "Failed to archive event", "error");
        }
      },
    });
  };

  useEffect(() => {
    if (activeOrg) {
      refreshTenantData();
    }
  }, [activeOrg, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  // Handle Organization Switching (FR-05)
  const handleSwitchOrg = async (targetOrgId: string) => {
    try {
      setShowOrgDropdown(false);
      const res = await fetch("/api/auth/switch-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: targetOrgId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Switched workspace to "${data.activeOrganization.name}"`);
      await loadUserAndTenantState();
    } catch (err: any) {
      notify(err.message || "Failed to switch organization", "error");
    }
  };

  // Handle Team Member Invitation (FR-03)
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.includes("member:invite")) {
      notify(`Permission Denied: Role "${currentRole}" in "${activeOrg?.name}" cannot invite members. Workspace Owners, Admins, and Event Managers have this permission.`, "error");
      return;
    }
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      if (data.invitation) {
        setCreatedInvite(data.invitation);
      }
      notify(`Invitation generated for ${inviteEmail} as ${inviteRole}!`);
      await refreshTenantData();
    } catch (err: any) {
      notify(err.message || "Failed to send invitation", "error");
    }
  };

  // Handle Member Status Change (FR-06: Suspend / Reactivate)
  const handleToggleMemberSuspension = async (member: MemberItem) => {
    const newStatus = member.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipId: member.membershipId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(
        newStatus === "suspended"
          ? `${member.name} suspended. Access revoked immediately.`
          : `${member.name} reactivated.`
      );
      await refreshTenantData();
    } catch (err: any) {
      notify(err.message || "Failed to update member status", "error");
    }
  };

  // Handle Member Role Update (FR-04, FR-07)
  const handleUpdateRole = async (membershipId: string, newRole: Role) => {
    try {
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, newRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Role updated to ${newRole}`);
      await refreshTenantData();
    } catch (err: any) {
      notify(err.message || "Failed to update role", "error");
    }
  };

  // Handle Member Removal (FR-06)
  const handleRemoveMember = (membershipId: string, memberName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Remove Team Member",
      message: (
        <div className="space-y-2">
          <p>
            Are you sure you want to remove <strong>{memberName}</strong> from this organization?
          </p>
          <p className="text-[11px] text-stone-500">
            Their session will be invalidated and workspace access will immediately terminate.
          </p>
        </div>
      ),
      confirmLabel: "Remove Member",
      cancelLabel: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/members?membershipId=${membershipId}`, {
            method: "DELETE",
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.message || data.error);

          notify(`${memberName} removed. Immediate access loss enforced.`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          await refreshTenantData();
        } catch (err: any) {
          notify(err.message || "Failed to remove member", "error");
        }
      },
    });
  };

  // Revoke Invitation
  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/members?invitationId=${invitationId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify("Invitation revoked");
      await refreshTenantData();
    } catch (err: any) {
      notify(err.message || "Failed to revoke invitation", "error");
    }
  };

  // Duplicate / Clone Event
  const handleCloneEventFromCard = async (e: React.MouseEvent, eventId: string, eventTitle: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/events/${eventId}/clone`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Duplicated "${eventTitle}" with all checklist tasks!`);
      await refreshTenantData();
    } catch (err: any) {
      notify(err.message || "Failed to duplicate event", "error");
    }
  };


  // Reset Demo Database
  const handleResetDatabase = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Reset Demonstration Database",
      message: (
        <div className="space-y-2">
          <p>
            Are you sure you want to reset the database to clean <strong>Release 1 demonstration fixtures</strong>?
          </p>
          <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            This will wipe newly created events and restore Aurelia Events & Galas to its verified baseline multi-tenant data.
          </p>
        </div>
      ),
      confirmLabel: "Reset Database",
      cancelLabel: "Cancel",
      variant: "warning",
      onConfirm: async () => {
        try {
          setLoading(true);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          const res = await fetch("/api/seed", { method: "POST" });
          const data = await res.json();
          notify("Database re-seeded with realistic Release 1 multi-tenant fixtures!");
          await loadUserAndTenantState();
        } catch (err) {
          notify("Failed to re-seed database", "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // When template is selected from TemplatesView
  const handleSelectTemplateFromExplorer = (
    slug: string,
    category: string,
    budget: number,
    capacity: number
  ) => {
    setEventModalInitialTemplate({ slug, category, budget, capacity });
    setShowCreateEventModal(true);
  };

  // Sign out of workspace and return to Welcome Portal
  const handleLogout = async () => {
    try {
      setLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setActiveOrg(null);
      setCurrentRole(null);
      setPermissions([]);
      setEnteredWorkspace(false);
      setActiveTab("welcome");
      window.location.href = "/?tab=welcome";
    } catch (err: any) {
      window.location.href = "/?tab=welcome";
    } finally {
      setLoading(false);
    }
  };

  if (loading && !activeOrg) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-3 border-[#E06B53] border-t-transparent rounded-full animate-spin" />
        <h2 className="text-base font-semibold text-stone-700 tracking-wide font-serif">
          EverFlow — Release 1 Foundation
        </h2>
        <p className="text-xs text-stone-400">Loading multi-tenant workspaces, events, and templates...</p>
      </div>
    );
  }

  const primaryEvent = events.find((e) => e.status === "Preparation") || events[0];

  // FRONT WELCOME PAGE: Displayed in front of the page before entering workspace
  if (!enteredWorkspace || activeTab === "welcome") {
    return (
      <>
        {actionMessage && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 text-sm font-medium transition-all transform animate-in slide-in-from-bottom duration-300 ${
              actionMessage.type === "success"
                ? "bg-slate-900 text-white border border-emerald-500/30"
                : "bg-rose-900 text-white border border-rose-500/30"
            }`}
          >
            {actionMessage.type === "success" ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        <FrontWelcomePage
          organizationName={activeOrg?.name || "Your Organization"}
          organizationSlug={activeOrg?.slug || "org"}
          organizationPlan={activeOrg?.plan}
          brandColor={activeOrg?.brandColor || "#E06B53"}
          userRole={currentRole}
          userName={user?.name || "Team Member"}
          userEmail={user?.email}
          userAvatar={user?.avatar}
          organizations={organizations}
          activeOrgId={activeOrg?.id}
          events={events}
          tasks={tasks}
          isLoggedIn={Boolean(user)}
          onLogout={handleLogout}
          onRefreshSession={async () => {
            await loadUserAndTenantState();
            await refreshTenantData();
          }}
          onSwitchOrg={handleSwitchOrg}
          onEnterWorkspace={() => {
            setEnteredWorkspace(true);
            const targetTab = user?.isPlatformAdmin
              ? "platform"
              : currentRole === "Vendor"
              ? "vendors"
              : "overview";
            setActiveTab(targetTab);
            window.history.replaceState(null, "", `?tab=${targetTab}`);
          }}
          onToggleTaskStatus={handleToggleTaskStatus}
          onAddTask={handleAddTask}
          notify={notify}
          onOpenCreateEvent={() => setShowCreateEventModal(true)}
          onOpenEventDetail={(id) => setSelectedEventIdForDetail(id)}
        />

        {/* Live Modals for Welcome Page */}
        {showCreateEventModal && (
          <CreateEventModal
            isOpen={showCreateEventModal}
            onClose={() => setShowCreateEventModal(false)}
            onEventCreated={() => {
              refreshTenantData();
              setShowCreateEventModal(false);
            }}
            notify={notify}
            initialTemplateSlug={eventModalInitialTemplate.slug}
            initialCategory={eventModalInitialTemplate.category}
            initialBudget={eventModalInitialTemplate.budget}
            initialCapacity={eventModalInitialTemplate.capacity}
          />
        )}

        {selectedEventIdForDetail && (
          <EventDetailModal
            eventId={selectedEventIdForDetail}
            isOpen={Boolean(selectedEventIdForDetail)}
            onClose={() => {
              setSelectedEventIdForDetail(null);
              setOpenInEditMode(false);
            }}
            onEventUpdated={refreshTenantData}
            notify={notify}
            teamMembers={members}
            canEdit={currentRole === "Owner" || currentRole === "Admin" || currentRole === "EventManager"}
            canClone={permissions.includes("event:create")}
            canTransitionStatus={permissions.includes("event:transition_status")}
            canDelete={permissions.includes("event:delete")}
            initialEditMode={openInEditMode}
          />
        )}

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
      </>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#FBF9F5] text-slate-800 font-sans antialiased relative overflow-hidden">
      {/* React Bits LiquidEther Ambient Flowing Background */}
      <LiquidEther opacity={0.32} />

      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 text-sm font-medium transition-all transform animate-in slide-in-from-bottom duration-300 ${
            actionMessage.type === "success"
              ? "bg-slate-900 text-white border border-emerald-500/30"
              : "bg-rose-900 text-white border border-rose-500/30"
          }`}
        >
          {actionMessage.type === "success" ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEFT SIDEBAR (Dark Charcoal & Warm Coral Luxury Aesthetic)                */}
      {/* ========================================================================= */}
      <aside className="w-72 bg-[#131417] text-stone-300 flex flex-col shrink-0 border-r border-stone-800/80 select-none h-full z-20 min-h-0 overflow-hidden">
        {/* Top Brand & Workspace Header */}
        <div className="p-4 border-b border-stone-800/60 shrink-0">
            {user?.isPlatformAdmin ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-stone-950 bg-amber-400 shadow-md shadow-amber-500/20">
                      <Sparkles className="w-4 h-4 text-stone-950" />
                    </div>
                    <div>
                      <span className="text-xs tracking-wider uppercase font-bold text-amber-300">
                        YENEGE ACADEMY
                      </span>
                      <div className="text-[10px] text-amber-400/90 font-medium">SaaS Platform Owner (Tier 1)</div>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-amber-200">
                      Platform Master Console
                    </div>
                    <div className="text-[9px] text-amber-400/80 font-mono">
                      Master Authority • Multi-Tenant
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[9px] uppercase border border-amber-500/40">
                    Tier 1
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
                      style={{ backgroundColor: activeOrg?.brandColor || "#E06B53" }}
                    >
                      <span className="text-sm">✦</span>
                    </div>
                    <div>
                      <span className="text-xs tracking-wider uppercase font-semibold text-stone-200">
                        EVERFLOW
                      </span>
                      <div className="text-[10px] text-[#E06B53] font-medium">Release 1 Foundation</div>
                    </div>
                  </div>
                </div>

                {/* Active Workspace Selector Dropdown (FR-05) */}
                <div className="relative mt-2">
                  <button
                    onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                    className="w-full bg-stone-900/90 hover:bg-stone-800/90 text-left px-3 py-2.5 rounded-xl border border-stone-800 flex items-center justify-between transition group"
                  >
                    <div className="truncate pr-2">
                      <div className="text-xs font-semibold text-stone-100 truncate">
                        {activeOrg?.name || "Select Workspace"}
                      </div>
                      <div className="text-[10px] text-stone-400 flex items-center space-x-1.5 mt-0.5">
                        <span className="px-1.5 py-0.5 bg-stone-800 rounded text-[#E06B53] font-semibold text-[10px] tracking-wide">
                          {getRoleDisplayName(currentRole)}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{activeOrg?.plan || "Trial"}</span>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-stone-400 group-hover:text-stone-200 shrink-0 transition" />
                  </button>

                  {/* Multi-Tenant Switcher Dropdown (FR-05) */}
                  {showOrgDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-[#1A1C20] border border-stone-700/80 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                      <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                        Switch Workspace
                      </div>

                      {organizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => handleSwitchOrg(org.id)}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                            org.id === activeOrg?.id
                              ? "bg-[#E06B53]/20 text-[#E06B53] font-semibold"
                              : "text-stone-300 hover:bg-stone-800"
                          }`}
                        >
                          <div className="truncate">
                            <div className="truncate">{org.name}</div>
                            <div className="text-[10px] text-stone-400">
                              Role: {org.role} • {org.plan}
                            </div>
                          </div>
                          {org.id === activeOrg?.id && <Check className="w-3.5 h-3.5 text-[#E06B53] shrink-0" />}
                        </button>
                      ))}

                      {user?.isPlatformAdmin && (
                        <div className="border-t border-stone-800 pt-1 mt-1">
                          <button
                            onClick={() => {
                              setShowOrgDropdown(false);
                              setShowCreateOrgModal(true);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-[#E06B53] hover:bg-[#E06B53]/10 flex items-center space-x-2 font-medium transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create New Organization</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 min-h-0 p-3 space-y-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-stone-800">
            {user?.isPlatformAdmin ? (
              /* YENEGE ACADEMY PLATFORM MASTER MENU (Tier 1) */
              <div className="space-y-4">
                {/* 1. PLATFORM GOVERNANCE */}
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                    <span>Platform Operations</span>
                    <span className="text-amber-500 font-mono">Tier 1</span>
                  </div>

                  <button
                    onClick={() => switchTab("platform")}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      activeTab === "platform"
                        ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold"
                        : "text-amber-200 hover:text-white hover:bg-stone-800"
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Event Companies & Licensing</span>
                  </button>

                  <button
                    onClick={() => switchTab("matrix")}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      activeTab === "matrix"
                        ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold"
                        : "text-stone-300 hover:text-white hover:bg-stone-800"
                    }`}
                  >
                    <Shield className="w-4 h-4 shrink-0 text-stone-400" />
                    <span>Role Matrix & RBAC</span>
                  </button>

                  <button
                    onClick={() => switchTab("audit")}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      activeTab === "audit"
                        ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold"
                        : "text-stone-300 hover:text-white hover:bg-stone-800"
                    }`}
                  >
                    <FileCheck2 className="w-4 h-4 shrink-0 text-stone-400" />
                    <span>Platform Security Audit</span>
                  </button>


                </div>

                {/* 2. TENANT SUPPORT INSPECTION (TIER 2) */}
                <div className="space-y-1 pt-3 border-t border-stone-800">
                  <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-stone-400 flex items-center justify-between">
                    <span>Inspect Event Company</span>
                    <span className="text-stone-500 font-mono">Tier 2 Support</span>
                  </div>

                  <p className="px-3 text-[10px] text-stone-500 leading-relaxed mb-1">
                    Select an event organizer company to inspect in support mode:
                  </p>

                  <div className="space-y-1">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={async () => {
                          await handleSwitchOrg(org.id);
                          switchTab("overview");
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                          activeOrg?.id === org.id && activeTab !== "platform"
                            ? "bg-stone-800 text-amber-300 border border-amber-500/40 font-semibold"
                            : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                        }`}
                      >
                        <div className="truncate pr-1">
                          <div className="truncate font-medium">{org.name}</div>
                          <div className="text-[9px] text-stone-500 font-mono">
                            {org.plan} • {org.status}
                          </div>
                        </div>
                        {activeOrg?.id === org.id && activeTab !== "platform" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0 font-mono">
                            Inspecting
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                    {activeOrg?.id !== "platform-master-yenege" && activeTab !== "platform" && (
                      <button
                        onClick={async () => {
                          await handleSwitchOrg("platform-master-yenege");
                          switchTab("platform");
                        }}
                        className="w-full mt-2 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Return to Master Console</span>
                      </button>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setEnteredWorkspace(false);
                          setActiveTab("welcome");
                          window.history.replaceState(null, "", "?tab=welcome");
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-900/60 transition"
                      >
                        <Compass className="w-4 h-4 text-stone-400" />
                        <span>Front Welcome Portal</span>
                      </button>
                    </div>
                  </div>
                </div>
            ) : (
              /* REGULAR EVENT ORGANIZER COMPANY MENU (Operations, Coordination, Finances, Team) */
              <>
                {/* 1. OPERATIONS */}
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-stone-500">
                    Operations
                  </div>

                  {/* Return to Front Welcome Page */}
                  <button
                    onClick={() => {
                      setEnteredWorkspace(false);
                      setActiveTab("welcome");
                      window.history.replaceState(null, "", "?tab=welcome");
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>← Welcome Page</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-400/20 text-amber-300 font-semibold uppercase">
                      Front Door
                    </span>
                  </button>

                  <button
                    onClick={() => switchTab("overview")}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      activeTab === "overview"
                        ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                        : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>Dashboard</span>
                  </button>

                  {/* Event Tasks & Checklists (Internal Staff Operations) */}
                  {permissions.includes("task:manage") && (
                    <button
                      onClick={() => switchTab("tasks")}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                        activeTab === "tasks"
                          ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                          : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <CheckSquare className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>Event Tasks</span>
                      </div>
                      {tasks.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-300 font-mono">
                          {tasks.filter((t) => t.status !== "completed").length}
                        </span>
                      )}
                    </button>
                  )}

                  {currentRole !== "Vendor" && currentRole !== "Client" && permissions.includes("event:view") && (
                    <button
                      onClick={() => switchTab("events")}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                        activeTab === "events"
                          ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                          : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>Events Directory</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-300">
                        {events.length}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => switchTab("calendar")}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      activeTab === "calendar"
                        ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                        : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                    }`}
                  >
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    <span>Calendar & Run Sheet</span>
                  </button>

                  {permissions.includes("event:create") && (
                    <button
                      onClick={() => switchTab("templates")}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                        activeTab === "templates"
                          ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                          : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                      }`}
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Event Blueprints</span>
                    </button>
                  )}
                </div>

                {/* 2. COORDINATION */}
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-stone-500">
                    Coordination
                  </div>

                  {permissions.includes("vendor:view") && (
                    <button
                      onClick={() => switchTab("vendors")}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                        activeTab === "vendors"
                          ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                          : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                      }`}
                    >
                      <Briefcase className="w-4 h-4 shrink-0" />
                      <span>{currentRole === "Vendor" ? "Vendor Bookings" : "Vendors & Partners"}</span>
                    </button>
                  )}

                  {permissions.includes("client:view") && (
                    <button
                      onClick={() => switchTab("clients")}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                        activeTab === "clients"
                          ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                          : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                      }`}
                    >
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span>Clients & Stakeholders</span>
                    </button>
                  )}

                  <button
                    onClick={() => switchTab("collaboration")}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      activeTab === "collaboration"
                        ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                        : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span>Communication Hub</span>
                  </button>

                  <button
                    onClick={() => switchTab("documents")}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      activeTab === "documents"
                        ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                        : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>Documents & Approvals</span>
                  </button>

                  {permissions.includes("attendee:manage") && (
                    <button
                      onClick={() => switchTab("attendees")}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                        activeTab === "attendees"
                          ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                          : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                      }`}
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      <span>Guest List & Passes</span>
                    </button>
                  )}
                </div>

                {/* 3. FINANCES & REPORTS */}
                {(permissions.includes("finance:view") || permissions.includes("org:settings:view")) && (
                  <div className="space-y-1">
                    <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-stone-500">
                      Finances & Analytics
                    </div>
                    {permissions.includes("finance:view") && (
                      <button
                        onClick={() => switchTab("finances")}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                          activeTab === "finances"
                            ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                            : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                        }`}
                      >
                        <DollarSign className="w-4 h-4 shrink-0" />
                        <span>Finances & Invoices</span>
                      </button>
                    )}

                    <button
                      onClick={() => switchTab("reports")}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                        activeTab === "reports"
                          ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                          : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 shrink-0" />
                      <span>Executive Reports</span>
                    </button>
                  </div>
                )}

                {/* 4. MANAGEMENT & TEAM */}
                {(permissions.includes("member:view") ||
                  permissions.includes("org:settings:view") ||
                  permissions.includes("audit:view") ||
                  currentRole === "Owner" ||
                  currentRole === "Admin") && (
                  <div className="space-y-1">
                    <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-stone-500">
                      Management & Admin
                    </div>
                    {permissions.includes("member:view") && (
                      <button
                        onClick={() => switchTab("team")}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                          activeTab === "team"
                            ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                            : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Users className="w-4 h-4 shrink-0" />
                          <span>Team & Permissions</span>
                        </div>
                        {invitations.length > 0 && <span className="w-2 h-2 rounded-full bg-[#E06B53] shrink-0" />}
                      </button>
                    )}

                    {permissions.includes("org:settings:view") && (
                      <button
                        onClick={() => switchTab("workspaces")}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                          activeTab === "workspaces"
                            ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                            : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                        }`}
                      >
                        <Building2 className="w-4 h-4 shrink-0" />
                        <span>Workspaces</span>
                      </button>
                    )}

                    {(currentRole === "Owner" || currentRole === "Admin") && (
                      <button
                        onClick={() => switchTab("matrix")}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                          activeTab === "matrix"
                            ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                            : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                        }`}
                      >
                        <Shield className="w-4 h-4 shrink-0" />
                        <span>Role Matrix & RBAC</span>
                      </button>
                    )}

                    {(currentRole === "Owner" || currentRole === "Admin") && (
                      <button
                        onClick={() => switchTab("auth")}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                          activeTab === "auth"
                            ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                            : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                        }`}
                      >
                        <KeyRound className="w-4 h-4 shrink-0" />
                        <span>Account Security</span>
                      </button>
                    )}

                    {permissions.includes("audit:view") && (
                      <button
                        onClick={() => switchTab("audit")}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                          activeTab === "audit"
                            ? "bg-[#E06B53] text-white shadow-md shadow-[#E06B53]/25 font-semibold"
                            : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                        }`}
                      >
                        <FileCheck2 className="w-4 h-4 shrink-0" />
                        <span>Audit Ledger</span>
                      </button>
                    )}


                  </div>
                )}
              </>
            )}
          </nav>

        {/* Bottom Section: Plan Quota & User Profile */}
        <div className="p-3.5 pb-4 space-y-2.5 border-t border-stone-800/80 bg-[#131417] shrink-0 z-10">
          <div className="p-3 rounded-2xl bg-stone-900/70 border border-stone-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-stone-400 text-[11px]">
              <span>Active Events Quota</span>
              <span className="font-mono text-stone-200 font-bold">
                {eventsSummary.activeEvents} / {activeOrg?.limits?.maxActiveEvents || 5}
              </span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E06B53] rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    ((eventsSummary.activeEvents || 1) / (activeOrg?.limits?.maxActiveEvents || 5)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2.5 truncate pr-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-800 shrink-0 border border-stone-700">
                {user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xs text-stone-300">
                    {user?.name?.[0] || "O"}
                  </div>
                )}
              </div>
              <div className="truncate">
                <div className="text-xs font-medium text-stone-200 truncate">{user?.name}</div>
                <div className="text-[10px] text-stone-400 truncate">{getRoleDisplayName(currentRole)}</div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                onClick={handleLogout}
                title="Sign Out to Welcome Portal"
                className="px-2 py-1 text-stone-400 hover:text-rose-400 rounded-lg hover:bg-stone-800 transition flex items-center gap-1 border border-stone-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold">Sign Out</span>
              </button>
              <button
                onClick={handleResetDatabase}
                title="Reset Demo Data (Re-seed)"
                className="p-1.5 text-stone-500 hover:text-stone-300 rounded-lg hover:bg-stone-800 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA                                                         */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Real-Time Operational Instruction Notification Bar for Every Role */}
        <InstructionBanner
          userRole={currentRole}
          userName={user?.name}
          userEmail={user?.email}
          isPlatformAdmin={Boolean(user?.isPlatformAdmin)}
          currentTab={activeTab}
          onNotificationSent={() => refreshTenantData()}
        />

        {/* Top Header Bar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-stone-200/80 px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex items-center space-x-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search events, venues, tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-100/70 border border-transparent focus:border-[#E06B53]/40 focus:bg-white text-xs text-slate-800 placeholder-stone-400 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Return to Front Welcome Page Button */}
            <button
              onClick={() => {
                setEnteredWorkspace(false);
                setActiveTab("welcome");
                window.history.replaceState(null, "", "?tab=welcome");
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200/80 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center space-x-1.5 transition shadow-2xs"
              title="Return to the Front Welcome Page"
            >
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>← Welcome Portal</span>
            </button>

            <NotificationsDropdown onNavigateTab={(tab) => switchTab(tab as any)} />

            {permissions.includes("event:create") && (
              <button
                onClick={() => {
                  setEventModalInitialTemplate({ slug: "", category: "Wedding", budget: 45000, capacity: 200 });
                  setShowCreateEventModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold tracking-wide flex items-center space-x-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Event</span>
              </button>
            )}

            {permissions.includes("member:invite") && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 hover:border-stone-300 text-stone-700 text-xs font-medium flex items-center space-x-1.5 transition shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5 text-stone-500" />
                <span>Invite Team</span>
              </button>
            )}

            {(currentRole === "Owner" || currentRole === "Admin" || user?.isPlatformAdmin) && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium flex items-center space-x-1.5 transition"
                title="Manage security & password settings"
              >
                <KeyRound className="w-3.5 h-3.5 text-stone-500" />
                <span>Account Settings</span>
              </button>
            )}

            {/* Universal Sign Out to Welcome Portal for all roles */}
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 text-stone-700 hover:text-rose-700 text-xs font-semibold flex items-center space-x-1.5 transition shadow-2xs"
              title="Sign Out of workspace and return to Welcome Portal"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 lg:p-8 w-full space-y-8">
          {/* Access Restricted Banner if user is on a confidential tab */}
          {!canAccessTab(activeTab) && (
            <div className="p-12 text-center max-w-md mx-auto bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif font-bold text-slate-900">Confidential Admin Area</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                This module contains confidential organization settings, financials, or platform administration data. As a <strong>{getRoleDisplayName(currentRole)}</strong> in <strong>{activeOrg?.name}</strong>, you do not have permission to access this section.
              </p>
              <button
                onClick={() => switchTab("overview")}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
              >
                Return to Operational Dashboard
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: WORKSPACE DASHBOARD (FR-14 & FR-15)                                */}
          {/* ========================================================================= */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* PLATFORM SUPPORT INSPECTION MODE BANNER (When Tier 1 Platform Admin inspects a tenant) */}
              {user?.isPlatformAdmin && (
                <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 border-2 border-amber-500/40 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
                  <div className="flex items-start md:items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-lg shrink-0 shadow-md shadow-amber-500/30">
                      ✦
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                          Platform Support Inspection Mode (Tier 1 Authority)
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-mono font-bold border border-amber-300">
                          Tenant: {activeOrg?.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-stone-900 text-amber-300 text-[9px] font-mono font-bold">
                          Tier 2 Workplace
                        </span>
                      </div>
                      <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                        You are supervising the isolated operational workspace of <strong>{activeOrg?.name}</strong>. Event operations, checklists, and invoices below are managed by this event organizing company.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await handleSwitchOrg("platform-master-yenege");
                      switchTab("platform");
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 flex items-center space-x-2 transition shadow-md shadow-amber-600/20 cursor-pointer"
                  >
                    <span>← Return to Yenege Master Console</span>
                  </button>
                </div>
              )}

              {/* Welcome & Context Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider font-semibold mb-1">
                    {user?.isPlatformAdmin ? (
                      <span className="text-amber-700 font-bold flex items-center space-x-1.5">
                        <span>✦</span>
                        <span>{activeOrg?.name} • Platform Owner Support Supervision (Tier 1)</span>
                      </span>
                    ) : (
                      <span className="text-[#E06B53]">
                        {activeOrg?.name} • {getRoleDisplayName(currentRole)} Authority
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">
                    Welcome back, {user?.isPlatformAdmin ? "Yenege (Platform Master)" : (user?.name?.split(" ")[0] || "Olivia")}.
                  </h1>
                  <p className="text-sm text-stone-500 mt-1">
                    {user?.isPlatformAdmin
                      ? `Viewing ${activeOrg?.name}'s operational pipeline, task completions, and event calendar in read-only platform oversight.`
                      : currentRole === "Vendor"
                      ? `Vendor Partner Portal: View your contracted service deliverables, load-in run sheets, and messaging with ${activeOrg?.name}.`
                      : currentRole === "Client"
                      ? `Client Stakeholder Portal: Track your contracted celebration, timeline run sheet, and coordinator communications.`
                      : "Release 1 operational dashboard: events, dates, task progress, and live status summaries."}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tenant Guard Active</span>
                  </span>

                </div>
              </div>

              {currentRole === "Vendor" ? (
                /* VENDOR PARTNER PORTAL (Restricted to bookings, deliverables, run sheets, messages) */
                <div className="space-y-6">
                  {/* Vendor Confidentiality Banner */}
                  <div className="p-5 rounded-3xl bg-blue-50/80 border border-blue-200/80 text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-start sm:items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                          Contractor & Vendor Partner Portal
                        </div>
                        <p className="text-xs text-blue-900/80 mt-0.5">
                          You are viewing contracted deliverables, load-in run sheets, and messaging with <strong>{activeOrg?.name}</strong>. Internal company task checklists, production budgets, and other events remain strictly confidential.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => switchTab("vendors")}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 transition shadow-xs flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Open Bookings</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Vendor Quick Modules */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                      onClick={() => switchTab("vendors")}
                      className="p-5 rounded-3xl bg-white border border-stone-200/80 hover:border-blue-400 shadow-xs cursor-pointer transition group space-y-2"
                    >
                      <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                        Vendor Bookings & Deliverables
                      </div>
                      <p className="text-xs text-stone-500">
                        View agreed services, contracts, and payment statuses for your firm.
                      </p>
                    </div>

                    <div
                      onClick={() => switchTab("calendar")}
                      className="p-5 rounded-3xl bg-white border border-stone-200/80 hover:border-blue-400 shadow-xs cursor-pointer transition group space-y-2"
                    >
                      <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                        Load-In Schedule & Run Sheet
                      </div>
                      <p className="text-xs text-stone-500">
                        Review minute-by-minute cue times and arrival windows for event day.
                      </p>
                    </div>

                    <div
                      onClick={() => switchTab("collaboration")}
                      className="p-5 rounded-3xl bg-white border border-stone-200/80 hover:border-blue-400 shadow-xs cursor-pointer transition group space-y-2"
                    >
                      <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                        Communication Hub
                      </div>
                      <p className="text-xs text-stone-500">
                        Direct messaging with event directors and logistics coordinators.
                      </p>
                    </div>

                    <div
                      onClick={() => switchTab("documents")}
                      className="p-5 rounded-3xl bg-white border border-stone-200/80 hover:border-blue-400 shadow-xs cursor-pointer transition group space-y-2"
                    >
                      <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                        Agreements & Compliance
                      </div>
                      <p className="text-xs text-stone-500">
                        Insurance certificates, COIs, service agreements, and approvals.
                      </p>
                    </div>
                  </div>

                  {/* Contracted Events for this Vendor */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold font-serif text-slate-900">Your Contracted Events</h3>
                        <p className="text-xs text-stone-500">
                          Events in {activeOrg?.name} with confirmed services booked from your firm.
                        </p>
                      </div>
                    </div>

                    {events.length === 0 ? (
                      <div className="p-8 bg-white rounded-3xl border border-stone-200/80 text-center text-xs text-stone-500">
                        No active event bookings currently linked to your vendor profile.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {events.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                                {ev.category}
                              </span>
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Confirmed Service
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-slate-900 font-serif">{ev.name}</h4>
                            <div className="flex items-center space-x-4 text-xs text-stone-500">
                              <span className="flex items-center space-x-1.5">
                                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                                <span>{new Date(ev.startDate).toLocaleDateString()}</span>
                              </span>
                              <span className="flex items-center space-x-1.5">
                                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                                <span className="truncate max-w-[200px]">{ev.venue}</span>
                              </span>
                            </div>
                            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                              <button
                                onClick={() => switchTab("calendar")}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center space-x-1 cursor-pointer"
                              >
                                <span>View Run Sheet Schedule</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => switchTab("vendors")}
                                className="px-3 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition cursor-pointer"
                              >
                                Service Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : currentRole === "Client" ? (
                /* CLIENT STAKEHOLDER PORTAL (Restricted to client's contracted event, timeline, documents, messages) */
                <div className="space-y-6">
                  {/* Client Privacy Banner */}
                  <div className="p-5 rounded-3xl bg-amber-50/80 border border-amber-200/80 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-start sm:items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#E06B53] text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                          Client Stakeholder Event Portal
                        </div>
                        <p className="text-xs text-amber-900/80 mt-0.5">
                          Dedicated private view for your contracted event with <strong>{activeOrg?.name}</strong>. Track preparation milestones, run sheets, and approvals. Internal company operational checklists and other events remain strictly confidential.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => switchTab("collaboration")}
                      className="px-4 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold shrink-0 transition shadow-xs flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Message Planner</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary Event Showcase for Client */}
                  {primaryEvent && (
                    <div className="p-6 md:p-8 rounded-3xl bg-white border border-stone-200/80 shadow-sm space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E06B53]/15 text-[#E06B53]">
                              {primaryEvent.category}
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {primaryEvent.status} Phase
                            </span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
                            {primaryEvent.name}
                          </h2>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                            <span className="flex items-center space-x-1.5">
                              <MapPin className="w-3.5 h-3.5 text-stone-400" />
                              <span>{primaryEvent.venue}</span>
                            </span>
                            <span className="flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 text-stone-400" />
                              <span>{new Date(primaryEvent.startDate).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-center shrink-0">
                          <span className="text-[11px] text-stone-400 block font-medium">Production Readiness</span>
                          <span className="text-2xl font-bold font-serif text-[#E06B53]">
                            {primaryEvent.tasksCount?.percentage || primaryEvent.readinessScore || 85}%
                          </span>
                          <span className="text-[10px] text-emerald-600 block mt-0.5 font-semibold">On Track</span>
                        </div>
                      </div>

                      {/* Client Fast Actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          onClick={() => switchTab("calendar")}
                          className="p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 text-left transition border border-stone-200/60 group cursor-pointer"
                        >
                          <div className="text-xs font-bold text-slate-900 group-hover:text-[#E06B53] flex items-center justify-between">
                            <span>Day-of Run Sheet</span>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition" />
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1">
                            Minute-by-minute schedule of arrivals, ceremonies, and catering.
                          </p>
                        </button>

                        <button
                          onClick={() => switchTab("documents")}
                          className="p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 text-left transition border border-stone-200/60 group cursor-pointer"
                        >
                          <div className="text-xs font-bold text-slate-900 group-hover:text-[#E06B53] flex items-center justify-between">
                            <span>Contracts & Invoices</span>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition" />
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1">
                            Review agreements, signed proposals, and invoice receipts.
                          </p>
                        </button>

                        <button
                          onClick={() => switchTab("collaboration")}
                          className="p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 text-left transition border border-stone-200/60 group cursor-pointer"
                        >
                          <div className="text-xs font-bold text-slate-900 group-hover:text-[#E06B53] flex items-center justify-between">
                            <span>Planner Communication</span>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition" />
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1">
                            Send direct requests and coordinate with your production team.
                          </p>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Real Database KPI Metrics Cards (Phase 4 — Dashboards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-2">
                  <div className="text-stone-400 text-xs font-medium flex items-center justify-between">
                    <span>Total Events</span>
                    <Calendar className="w-4 h-4 text-stone-400" />
                  </div>
                  <div className="text-2xl font-bold font-serif text-slate-900">{eventsSummary.totalEvents}</div>
                  <div className="text-[11px] text-stone-500 flex items-center space-x-1">
                    <span className="text-emerald-600 font-semibold">{eventsSummary.activeEvents} active</span>
                    <span>in lifecycle pipeline</span>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-2">
                  <div className="text-stone-400 text-xs font-medium flex items-center justify-between">
                    <span>Task Completion</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold font-serif text-slate-900">
                    {eventsSummary.overallTaskPercentage}%
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {eventsSummary.totalCompletedTasksCount} of {eventsSummary.totalTasksCount} DB tasks done
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-2">
                  <div className="text-stone-400 text-xs font-medium flex items-center justify-between">
                    <span>Execution Phase</span>
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold font-serif text-slate-900">
                    {events.filter((e) => e.status === "Execution").length}
                  </div>
                  <div className="text-[11px] text-stone-500">Live or on-site event operations</div>
                </div>

                {permissions.includes("member:view") ? (
                  <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-2">
                    <div className="text-stone-400 text-xs font-medium flex items-center justify-between">
                      <span>Team Roster</span>
                      <Users className="w-4 h-4 text-stone-400" />
                    </div>
                    <div className="text-2xl font-bold font-serif text-slate-900">{members.length} Members</div>
                    <div className="text-[11px] text-stone-500">
                      {invitations.length} pending email invites
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-2">
                    <div className="text-stone-400 text-xs font-medium flex items-center justify-between">
                      <span>Completed Events</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold font-serif text-slate-900">{eventsSummary.completedEvents}</div>
                    <div className="text-[11px] text-stone-500">Delivered successfully</div>
                  </div>
                )}
              </div>

              {/* Next Upcoming Event Hero Card */}
              {primaryEvent && (
                <div
                  onClick={() => setSelectedEventIdForDetail(primaryEvent.id)}
                  className="p-6 md:p-8 rounded-3xl bg-white border border-stone-200/80 shadow-sm cursor-pointer hover:border-[#E06B53]/50 transition group flex flex-col md:flex-row gap-6 justify-between items-start md:items-center"
                >
                  <div className="space-y-3 max-w-xl">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E06B53]/15 text-[#E06B53]">
                        {primaryEvent.category}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                        {primaryEvent.status} Phase
                      </span>
                    </div>

                    <h2 className="text-2xl font-serif font-bold text-slate-900 group-hover:text-[#E06B53] transition">
                      {primaryEvent.name}
                    </h2>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                      <span className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        <span>{primaryEvent.venue}</span>
                      </span>
                      <span className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{new Date(primaryEvent.startDate).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center space-x-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                        <span>${(primaryEvent.budget || 0).toLocaleString()}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end space-y-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[11px] text-stone-400 block">Readiness Score</span>
                      <span className="text-2xl font-bold text-[#E06B53]">
                        {primaryEvent.tasksCount?.percentage || primaryEvent.readinessScore || 75}%
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {permissions.includes("event:edit") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventIdForDetail(primaryEvent.id);
                            setOpenInEditMode(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center space-x-1 transition shadow-2xs"
                          title="Edit Event Details (Event Manager & Admin)"
                        >
                          <Pencil className="w-3.5 h-3.5 text-stone-600" />
                          <span>Edit</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => handleCloneEventFromCard(e, primaryEvent.id, primaryEvent.name)}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center space-x-1 transition"
                        title="Duplicate event and its tasks checklist"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Clone</span>
                      </button>
                      {permissions.includes("event:delete") && (
                        <button
                          onClick={(e) => handleDeleteEvent(e, primaryEvent.id, primaryEvent.name)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center space-x-1 transition shadow-2xs"
                          title="Archive / Delete Event (Owner & Admin only)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Archive</span>
                        </button>
                      )}
                      <span className="px-4 py-2 rounded-xl bg-[#E06B53] text-white text-xs font-semibold group-hover:bg-[#c95841] transition flex items-center space-x-1 shadow-xs">
                        <span>Manage & Tasks</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Cards Grid & Filters */}
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold font-serif text-slate-900">Organization Events Directory</h3>
                    <p className="text-xs text-stone-500">
                      Isolated to {activeOrg?.name} • Click any event card to open its checklist & status controls.
                    </p>
                  </div>

                  {/* Status Filters */}
                  <div className="flex flex-wrap gap-1.5 bg-stone-200/50 p-1 rounded-2xl text-xs font-medium">
                    {["All", "Planning", "Preparation", "Execution", "Completed", "Cancelled"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setSelectedStatusFilter(st)}
                        className={`px-3 py-1 rounded-xl transition ${
                          selectedStatusFilter === st
                            ? "bg-white text-slate-900 font-bold shadow-2xs"
                            : "text-stone-500 hover:text-stone-800"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventIdForDetail(ev.id)}
                      className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#E06B53]/40 transition group cursor-pointer"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#E06B53]/15 text-[#E06B53]">
                            {ev.category}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ev.status === "Execution"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : ev.status === "Completed"
                                ? "bg-purple-50 text-purple-800 border border-purple-200"
                                : ev.status === "Cancelled"
                                ? "bg-rose-50 text-rose-800 border border-rose-200"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {ev.status}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 group-hover:text-[#E06B53] transition line-clamp-1">
                          {ev.name}
                        </h4>

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

                        {/* Progress Bar derived from DB records (FR-14) */}
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
                        <div>
                          <span className="text-[10px] text-stone-400 block">Allocated Budget</span>
                          <span className="font-bold text-slate-800">${(ev.budget || 0).toLocaleString()}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          {permissions.includes("event:edit") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEventIdForDetail(ev.id);
                                setOpenInEditMode(true);
                              }}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-[#E06B53] hover:bg-stone-100 transition"
                              title="Edit Event Details (Event Manager & Admin)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {permissions.includes("event:create") && (
                            <button
                              onClick={(e) => handleCloneEventFromCard(e, ev.id, ev.name)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                              title="Duplicate Event"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {permissions.includes("event:delete") && (
                            <button
                              onClick={(e) => handleDeleteEvent(e, ev.id, ev.name)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Archive / Delete Event (Owner & Admin only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="text-[#E06B53] font-semibold flex items-center space-x-0.5 text-xs">
                            <span>Manage</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Tasks Widget for Operations & Staff */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-serif">
                        Active Event Tasks & Checkpoints ({tasks.filter((t) => t.status !== "completed").length} pending)
                      </h3>
                      <p className="text-xs text-stone-500">
                        Operational tasks assigned across events in {activeOrg?.name}. Click checkmark to toggle status.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => switchTab("tasks")}
                    className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center space-x-1 transition self-start sm:self-auto"
                  >
                    <span>Open All Tasks</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs">
                    No active tasks currently registered for this organization.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tasks.slice(0, 6).map((task) => {
                      const taskId = task.id || task._id;
                      const isDone = task.status === "completed";
                      return (
                        <div
                          key={taskId}
                          onClick={() => handleToggleTaskStatus(taskId, isDone ? "todo" : "completed")}
                          className={`p-3.5 rounded-2xl border transition flex items-start space-x-3 cursor-pointer group ${
                            isDone
                              ? "bg-stone-50/70 border-stone-200/50 opacity-75"
                              : "bg-white border-stone-200/80 hover:border-emerald-300 hover:shadow-xs"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                                isDone
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "border-stone-300 bg-white group-hover:border-emerald-500"
                              }`}
                            >
                              {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div
                              className={`text-xs font-semibold leading-snug truncate ${
                                isDone ? "line-through text-stone-400" : "text-slate-800 group-hover:text-emerald-700"
                              }`}
                            >
                              {task.title}
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-stone-400">
                              <span className="font-medium text-stone-600 truncate">
                                {task.eventId?.name || task.eventName || "Event"}
                              </span>
                              <span>•</span>
                              <span className="capitalize">{task.category}</span>
                              {task.assignedToName && (
                                <>
                                  <span>•</span>
                                  <span className="text-stone-500 font-medium">{task.assignedToName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          )}



          {/* ========================================================================= */}
          {/* EVENT TASKS & CHECKLISTS MANAGER                                          */}
          {/* ========================================================================= */}
          {activeTab === "tasks" && canAccessTab("tasks") && (
            <TasksView
              tasks={tasks.map((t) => ({
                id: t.id || t._id,
                eventId: t.eventId?._id || t.eventId?.id || t.eventId || "",
                eventName: t.eventId?.name || t.eventName || "Event Task",
                eventCategory: t.eventId?.category || t.eventCategory || "General",
                eventVenue: t.eventId?.venue || t.eventVenue || "",
                title: t.title,
                description: t.description,
                category: t.category,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate,
                assignedToName: t.assignedToName,
                isBlocked: t.isBlocked,
                blockedReason: t.blockedReason,
                completedAt: t.completedAt,
              }))}
              events={events.map((e) => ({
                id: e.id,
                name: e.name,
                category: e.category,
              }))}
              teamMembers={members}
              onToggleTaskStatus={handleToggleTaskStatus}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onOpenEventDetail={(eventId) => setSelectedEventIdForDetail(eventId)}
              canManageTasks={
                permissions.includes("task:manage") ||
                permissions.includes("event:edit") ||
                currentRole === "Staff"
              }
              notify={notify}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 2: EVENTS DIRECTORY (FR-10 & FR-13)                                   */}
          {/* ========================================================================= */}
          {activeTab === "events" && canAccessTab("events") && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-[#E06B53] uppercase tracking-wider">
                    EVENT OPERATIONS
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-900">Events Management Directory</h2>
                  <p className="text-xs text-stone-500">
                    Create, view, edit, cancel, complete, and duplicate events with strict lifecycle validation.
                  </p>
                </div>

                {permissions.includes("event:create") && (
                  <button
                    onClick={() => {
                      setEventModalInitialTemplate({ slug: "", category: "Wedding", budget: 45000, capacity: 200 });
                      setShowCreateEventModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-2 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Event</span>
                  </button>
                )}
              </div>

              {/* Event Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEventIdForDetail(ev.id)}
                    className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#E06B53]/40 transition group cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#E06B53]/15 text-[#E06B53]">
                          {ev.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                          {ev.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#E06B53] transition">
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
                      <div>
                        <span className="text-[10px] text-stone-400 block">Allocated Budget</span>
                        <span className="font-bold text-slate-800">${(ev.budget || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {permissions.includes("event:edit") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEventIdForDetail(ev.id);
                              setOpenInEditMode(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium flex items-center space-x-1 transition"
                            title="Edit Event Details (Event Manager & Admin)"
                          >
                            <Pencil className="w-3 h-3 text-stone-600" />
                            <span>Edit</span>
                          </button>
                        )}
                        {permissions.includes("event:create") && (
                          <button
                            onClick={(e) => handleCloneEventFromCard(e, ev.id, ev.name)}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium flex items-center space-x-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Duplicate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: BLUEPRINTS & TEMPLATES (FR-11)                                     */}
          {/* ========================================================================= */}
          {activeTab === "templates" && canAccessTab("templates") && (
            <TemplatesView
              onSelectTemplate={handleSelectTemplateFromExplorer}
              canCreateEvent={permissions.includes("event:create")}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB: CALENDAR & RUN SHEETS (FR-42, FR-43, FR-44)                          */}
          {/* ========================================================================= */}
          {activeTab === "calendar" && (
            <CalendarView
              events={events.map((e) => ({
                id: e.id,
                name: e.name,
                startDate: e.startDate,
                venue: e.venue,
              }))}
              notify={notify}
              canManage={
                permissions.includes("event:edit") ||
                permissions.includes("finance:manage")
              }
              onNavigateTab={(tab) => switchTab(tab as any)}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB: VENDORS CRM (FR-20, FR-21, FR-22, FR-23)                             */}
          {/* ========================================================================= */}
          {activeTab === "vendors" && canAccessTab("vendors") && (
            <VendorsView
              events={events.map((e) => ({
                id: e.id,
                name: e.name,
                startDate: e.startDate,
                venue: e.venue,
              }))}
              notify={notify}
              canManage={permissions.includes("vendor:manage")}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB: CLIENTS & STAKEHOLDERS (FR-30, FR-31, FR-32)                         */}
          {/* ========================================================================= */}
          {activeTab === "clients" && canAccessTab("clients") && (
            <ClientsView
              events={events.map((e) => ({
                id: e.id,
                name: e.name,
                startDate: e.startDate,
                venue: e.venue,
              }))}
              notify={notify}
              canManage={permissions.includes("client:manage")}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB: BUDGET & FINANCIAL TRACKING (FR-50, FR-51, FR-52, FR-53)             */}
          {/* ========================================================================= */}
          {activeTab === "finances" && canAccessTab("finances") && (
            <FinancesView
              events={events.map((e) => ({
                id: e.id,
                name: e.name,
                startDate: e.startDate,
                venue: e.venue,
              }))}
              notify={notify}
              canManage={permissions.includes("finance:manage")}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB: COLLABORATION & CHANNELS (FR-70, FR-71)                              */}
          {/* ========================================================================= */}
          {activeTab === "collaboration" && (
            <CollaborationView
              events={events.map((e) => ({
                id: e.id,
                name: e.name,
                category: e.category,
                clientName: e.clientName,
                clientEmail: e.clientEmail,
              }))}
              currentRole={currentRole}
              notify={notify}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB: DOCUMENTS & APPROVALS (FR-60, FR-61, FR-62)                          */}
          {/* ========================================================================= */}
          {activeTab === "documents" && (
            <DocumentsView
              events={events.map((e) => ({
                id: e.id,
                name: e.name,
              }))}
              currentRole={currentRole}
              notify={notify}
              canManage={permissions.includes("document:manage")}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB: ATTENDEES & GUEST LIST (FR-80)                                       */}
          {/* ========================================================================= */}
          {activeTab === "attendees" && canAccessTab("attendees") && (
            <AttendeesView
              events={events.map((e) => ({
                id: e.id,
                name: e.name,
              }))}
              notify={notify}
              canManage={permissions.includes("attendee:manage")}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB: ORGANIZATION REPORTS & EXPORT (FR-95)                                */}
          {/* ========================================================================= */}
          {activeTab === "reports" && canAccessTab("reports") && <ReportsView />}

          {/* ========================================================================= */}
          {/* TAB: PLATFORM ADMIN CONSOLE (FR-100, FR-101, FR-102, FR-105)              */}
          {/* ========================================================================= */}
          {activeTab === "platform" && canAccessTab("platform") && <PlatformAdminView notify={notify} />}

            {/* ========================================================================= */}
          {/* TAB 4: TEAM & ACCESS CONTROL (FR-03, FR-06, FR-07)                        */}
          {/* ========================================================================= */}
          {activeTab === "team" && canAccessTab("team") && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-[#E06B53] uppercase tracking-wider">
                    TEAM & ACCESS CONTROL
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-900">Team & Access Control</h2>
                  <p className="text-xs text-stone-500">
                    Manage team roles (Owner, Admin, Event Manager, Staff), suspend members with immediate access termination, and dispatch expiring invites.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-medium">
                    Seat Usage: <strong>{memberLimits.current}</strong> / {memberLimits.max}
                  </div>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-2 transition shadow-xs"
                  >
                    {!permissions.includes("member:invite") ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    <span>Invite Member</span>
                  </button>
                </div>
              </div>

              {/* RBAC Notice if user is non-admin/owner */}
              {!permissions.includes("member:invite") && (
                <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start space-x-3 text-xs text-amber-900 shadow-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold flex items-center space-x-2">
                      <span>Limited Member Permissions (Your Role: {getRoleDisplayName(currentRole)} in {activeOrg?.name})</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      In EverFlow, <strong>Workspace Owners</strong>, <strong>Administrators</strong>, and <strong>Event Managers</strong> have authority to invite team members. As a {getRoleDisplayName(currentRole)}, member operations are in read-only mode for this organization.
                    </p>
                    {organizations.some((o) => o.role === "Owner" && o.id !== activeOrg?.id) && (
                      <div className="pt-1 flex items-center space-x-2">
                        <span className="text-[10px] font-semibold text-amber-900">Switch to an Owner workspace:</span>
                        {organizations
                          .filter((o) => o.role === "Owner" && o.id !== activeOrg?.id)
                          .map((o) => (
                            <button
                              key={o.id}
                              onClick={() => handleSwitchOrg(o.id)}
                              className="px-2 py-0.5 bg-white border border-amber-300 rounded-lg text-[10px] font-bold text-amber-950 hover:bg-amber-100 transition"
                            >
                              {o.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Members Table */}
              <div className="bg-white border border-stone-200/80 rounded-3xl shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900">Active Workspace Members ({members.length})</h3>
                  <span className="text-xs text-stone-400">Strictly isolated to {activeOrg?.name}</span>
                </div>

                <div className="divide-y divide-stone-100">
                  {members.map((member) => (
                    <div
                      key={member.membershipId}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="w-9 h-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-xs text-stone-600">
                          {member.name?.[0] || "U"}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-900">{member.name}</span>
                            {member.isOwner && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-800 font-bold uppercase tracking-wider">
                                Workspace Owner
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                member.status === "active"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {member.status}
                            </span>
                          </div>
                          <span className="text-xs text-stone-400">{member.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Role Selector (Owner / Admin with permission can adjust) */}
                        {!member.isOwner && permissions.includes("member:update_role") ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.membershipId, e.target.value as Role)}
                            className="px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-700 bg-white focus:outline-none"
                          >
                            <option value="Admin">Admin</option>
                            <option value="EventManager">Event Manager</option>
                            <option value="Staff">Staff</option>
                            <option value="FinanceManager">Finance Manager</option>
                            <option value="VendorCoordinator">Vendor Coordinator</option>
                          </select>
                        ) : (
                          <span className="px-3 py-1 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl">
                            {ROLE_DEFINITIONS[member.role]?.name || member.role}
                          </span>
                        )}

                        {/* Suspension Toggle (FR-06) */}
                        {!member.isOwner && permissions.includes("member:suspend") && (
                          <button
                            onClick={() => handleToggleMemberSuspension(member)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              member.status === "active"
                                ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {member.status === "active" ? "Suspend Access" : "Reactivate"}
                          </button>
                        )}

                        {/* Remove Member */}
                        {!member.isOwner && permissions.includes("member:remove") && (
                          <button
                            onClick={() => handleRemoveMember(member.membershipId, member.name)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Remove Member from Workspace"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Invitations Table (FR-03) */}
              <div className="bg-white border border-stone-200/80 rounded-3xl shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Pending Invitations ({invitations.length})</h3>
                    <span className="text-xs text-stone-400">7-Day Expiration Token Enforced</span>
                  </div>
                  <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 font-medium">
                    Local Dev: Copy or Open link directly to accept
                  </div>
                </div>

                {invitations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-400">No active pending invitations.</div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center space-x-2">
                            <span>{inv.email}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E06B53]/10 text-[#E06B53]">
                              {inv.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            Expires: {new Date(inv.expiresAt).toLocaleDateString()} • Token: {inv.token?.slice(0, 8)}...
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(inv.inviteUrl);
                              notify(`Copied invite link for ${inv.email}!`);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium flex items-center space-x-1.5 transition text-xs"
                            title="Copy activation link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </button>

                          <a
                            href={inv.inviteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#E06B53]/15 hover:bg-[#E06B53]/25 text-[#E06B53] font-semibold flex items-center space-x-1.5 transition text-xs"
                            title="Open invitation acceptance page"
                          >
                            <span>Open Link</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => handleRevokeInvitation(inv.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-medium transition text-xs"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: AUTH & PASSWORD RESET LIFECYCLE (FR-01)                             */}
          {/* ========================================================================= */}
          {activeTab === "auth" && canAccessTab("auth") && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <div className="text-xs font-semibold text-[#E06B53] uppercase tracking-wider">
                  SECURITY & CREDENTIALS
                </div>
                <h2 className="text-2xl font-serif font-bold text-slate-900">
                  Authentication & Account Lifecycle
                </h2>
                <p className="text-xs text-stone-500">
                  Time-limited password resets, email verification states, and credential security.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current User Card */}
                <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-slate-900">Current User Identity</h3>

                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                      {user?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-sm text-stone-600">
                          {user?.name?.[0] || "U"}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{user?.name}</div>
                      <div className="text-xs text-stone-400">{user?.email}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            user?.emailVerified
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {user?.emailVerified ? "Email Verified" : "Unverified"}
                        </span>
                        <span className="text-[10px] text-stone-400">Status: {user?.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="w-full py-2.5 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-xs"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Open Password Reset & Verification Dialog</span>
                    </button>
                  </div>
                </div>

                {/* FR-01 Specification Overview */}
                <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3">
                  <h3 className="text-base font-bold text-slate-900">Enterprise Security Guarantees</h3>
                  <div className="space-y-2 text-xs text-stone-600">
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Bcrypt Password Hashing:</strong> Salt rounds = 10, plain text never stored.
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Expiring Reset Tokens:</strong> 60-minute hard expiry; redeemed tokens are revoked immediately.
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Suspension Revocation:</strong> Suspended accounts cannot request resets or log in.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: WORKSPACES & CONTEXT SWITCHING (FR-02 & FR-05)                      */}
          {/* ========================================================================= */}
          {activeTab === "workspaces" && canAccessTab("workspaces") && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-[#E06B53] uppercase tracking-wider">
                    WORKSPACE MANAGEMENT
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-900">Workspaces & Organizations</h2>
                  <p className="text-xs text-stone-500">
                    Create new organizations on trial plans, configure country and timezone, and switch contexts.
                  </p>
                </div>

                {user?.isPlatformAdmin ? (
                  <button
                    onClick={() => setShowCreateOrgModal(true)}
                    className="px-4 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-2 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Organization</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-stone-100 border border-stone-200/80 text-xs text-stone-600 max-w-md">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Organization Provisioning managed by <strong>Yenege Platform Admin</strong>. As {currentRole || "Owner"}, you can assign Event Managers, Staff, Clients & Vendors.
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {organizations.map((org) => {
                  const isActive = org.id === activeOrg?.id;
                  return (
                    <div
                      key={org.id}
                      className={`p-6 rounded-3xl border transition space-y-4 flex flex-col justify-between ${
                        isActive
                          ? "bg-white border-[#E06B53] shadow-md ring-2 ring-[#E06B53]/20"
                          : "bg-white border-stone-200/80 hover:border-stone-300"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                            {org.plan}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E06B53]/15 text-[#E06B53]">
                              Active Context
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{org.name}</h3>
                          <p className="text-xs text-stone-400">/{org.slug}</p>
                        </div>

                        <div className="text-xs text-stone-500 space-y-1">
                          <div>
                            Your Assigned Role: <strong>{org.role}</strong>
                          </div>
                          <div>Status: {org.membershipStatus}</div>
                        </div>
                      </div>

                      <button
                        disabled={isActive}
                        onClick={() => handleSwitchOrg(org.id)}
                        className={`w-full py-2.5 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? "bg-stone-100 text-stone-400 cursor-default"
                            : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                        }`}
                      >
                        {isActive ? "Currently Operating Here" : "Switch to Workspace"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: ROLE-PERMISSION MATRIX (FR-04 & FR-07)                             */}
          {/* ========================================================================= */}
          {activeTab === "matrix" && canAccessTab("matrix") && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <div className="text-xs font-semibold text-[#E06B53] uppercase tracking-wider">
                  ROLE PERMISSIONS MATRIX
                </div>
                <h2 className="text-2xl font-serif font-bold text-slate-900">
                  Role Sets & Permission Matrix
                </h2>
                <p className="text-xs text-stone-500">
                  Strict Deny-by-Default enforcement. SaaS Super Admins have zero visibility into tenant business records.
                </p>
              </div>

              {/* Roles Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {["Owner", "Admin", "EventManager", "Staff"].map((r) => {
                  const def = ROLE_DEFINITIONS[r];
                  return (
                    <div key={r} className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-2">
                      <div className="text-xs font-bold text-[#E06B53] uppercase tracking-wider">
                        {def?.name || r}
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">{def?.description}</p>
                      <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-400">
                        {def?.boundaries}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table Matrix */}
              <div className="bg-white border border-stone-200/80 rounded-3xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200/80 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="px-6 py-3.5">Granular Permission</th>
                        <th className="px-4 py-3.5">Owner</th>
                        <th className="px-4 py-3.5">Admin</th>
                        <th className="px-4 py-3.5">Event Manager</th>
                        <th className="px-4 py-3.5">Staff</th>
                        <th className="px-4 py-3.5 text-stone-400">SaaS Super Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {[
                        { perm: "event:view", label: "View Organization Events" },
                        { perm: "event:create", label: "Create New Events & Checklists" },
                        { perm: "event:edit", label: "Edit Events & Lifecycle Statuses" },
                        { perm: "event:delete", label: "Archive / Delete Events" },
                        { perm: "task:manage", label: "Manage Event Tasks & Checkpoints" },
                        { perm: "member:view", label: "View Team Member Directory" },
                        { perm: "member:invite", label: "Invite New Team Members" },
                        { perm: "member:suspend", label: "Suspend Team Members" },
                        { perm: "member:remove", label: "Remove Members from Workspace" },
                        { perm: "org:billing:manage", label: "Manage Billing & Subscriptions" },
                      ].map((row) => (
                        <tr key={row.perm} className="hover:bg-stone-50/50">
                          <td className="px-6 py-3 font-semibold text-slate-800">
                            <div>{row.label}</div>
                            <span className="text-[10px] font-mono text-stone-400">{row.perm}</span>
                          </td>
                          <td className="px-4 py-3">
                            {ROLE_PERMISSIONS.Owner.includes(row.perm as any) ? (
                              <Check className="w-4 h-4 text-emerald-600 font-bold" />
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {ROLE_PERMISSIONS.Admin.includes(row.perm as any) ? (
                              <Check className="w-4 h-4 text-emerald-600 font-bold" />
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {ROLE_PERMISSIONS.EventManager.includes(row.perm as any) ? (
                              <Check className="w-4 h-4 text-emerald-600 font-bold" />
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {ROLE_PERMISSIONS.Staff.includes(row.perm as any) ? (
                              <Check className="w-4 h-4 text-emerald-600 font-bold" />
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-stone-400 font-mono text-[10px]">Zero Visibility</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: IMMUTABLE AUDIT LOGS                                               */}
          {/* ========================================================================= */}
          {activeTab === "audit" && canAccessTab("audit") && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <div className="text-xs font-semibold text-[#E06B53] uppercase tracking-wider">
                  APPEND-ONLY SECURITY LEDGER
                </div>
                <h2 className="text-2xl font-serif font-bold text-slate-900">Immutable Audit Logs</h2>
                <p className="text-xs text-stone-500">
                  Every organization creation, invitation, member suspension, and status transition is permanently recorded.
                </p>
              </div>

              <div className="bg-white border border-stone-200/80 rounded-3xl shadow-xs overflow-hidden">
                <div className="divide-y divide-stone-100">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-stone-50/50 transition flex items-start justify-between text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-stone-100 text-stone-800 font-bold">
                            {log.action}
                          </span>
                          <span className="font-semibold text-slate-800">{log.actorEmail}</span>
                        </div>
                        {log.details && (
                          <div className="text-[11px] font-mono text-stone-500 truncate max-w-xl">
                            {JSON.stringify(log.details)}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}
      {/* 1. Event Detail & Task Checklist Modal (FR-14) */}
      {selectedEventIdForDetail && (
        <EventDetailModal
          eventId={selectedEventIdForDetail}
          isOpen={!!selectedEventIdForDetail}
          onClose={() => {
            setSelectedEventIdForDetail(null);
            setOpenInEditMode(false);
          }}
          onEventUpdated={refreshTenantData}
          notify={notify}
          teamMembers={members}
          canEdit={permissions.includes("event:edit")}
          canClone={permissions.includes("event:create")}
          canTransitionStatus={permissions.includes("event:transition_status")}
          canDelete={permissions.includes("event:delete")}
          initialEditMode={openInEditMode}
        />
      )}

      {/* 2. Create Event Modal with Template Picker (FR-10, FR-11) */}
      <CreateEventModal
        isOpen={showCreateEventModal}
        onClose={() => setShowCreateEventModal(false)}
        onEventCreated={refreshTenantData}
        notify={notify}
        initialTemplateSlug={eventModalInitialTemplate.slug}
        initialCategory={eventModalInitialTemplate.category}
        initialBudget={eventModalInitialTemplate.budget}
        initialCapacity={eventModalInitialTemplate.capacity}
      />

      {/* 3. Create Organization Modal (FR-02) */}
      <CreateOrgModal
        isOpen={showCreateOrgModal}
        onClose={() => setShowCreateOrgModal(false)}
        onOrgCreated={loadUserAndTenantState}
        notify={notify}
      />

      {/* 4. Auth Lifecycle Modal (FR-01) */}
      <AuthLifecycleModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUserEmail={user?.email}
        isEmailVerified={user?.emailVerified}
        notify={notify}
        onRefreshSession={loadUserAndTenantState}
      />

      {/* 5. Invite Team Member Modal (FR-03) */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FBF9F5] border border-stone-200/90 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-800">
            <div className="px-6 py-5 bg-white border-b border-stone-200/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-serif text-slate-900">Invite Team Member</h3>
                <p className="text-xs text-stone-500">Dispatch an expiring invitation token</p>
              </div>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setCreatedInvite(null);
                }}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {createdInvite ? (
              <div className="p-6 space-y-4 animate-in fade-in">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                    <span className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Invitation Link Generated</span>
                    </span>
                    <span className="text-[10px] text-emerald-700">Valid for 7 days</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Invitation created for <strong>{createdInvite.email}</strong> with role <strong>{createdInvite.role}</strong> in <strong>{activeOrg?.name}</strong>.
                  </p>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1.5">
                  <div className="font-bold flex items-center space-x-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Why did no email arrive in their inbox?</span>
                  </div>
                  <p className="leading-relaxed text-amber-800">
                    In this local development environment, external emails are not dispatched over the internet (no live SMTP service configured).
                  </p>
                  <p className="leading-relaxed font-semibold text-amber-950">
                    Copy or open the direct activation link below to accept the invitation:
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-stone-200 text-xs font-mono break-all text-slate-800 space-y-1.5 shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-stone-400">Direct Invitation Link</div>
                  <div className="select-all p-2 bg-stone-50 rounded-lg text-slate-900 text-[11px]">
                    {createdInvite.inviteUrl}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdInvite.inviteUrl);
                      notify(`Copied invitation link for ${createdInvite.email}!`);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </button>

                  <a
                    href={createdInvite.inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition text-center shadow-xs"
                  >
                    <span>Open Accept Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="pt-2 flex justify-between items-center border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedInvite(null);
                      setInviteEmail("");
                    }}
                    className="text-xs text-[#E06B53] font-semibold hover:underline"
                  >
                    + Invite Another Member
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCreatedInvite(null);
                      setShowInviteModal(false);
                      setInviteEmail("");
                    }}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteMember} className="p-6 space-y-4">
                {!permissions.includes("member:invite") && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
                    <div className="flex items-center space-x-1.5 font-bold text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Permission Restricted ({getRoleDisplayName(currentRole)} in {activeOrg?.name})</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Under EverFlow RBAC policy, <strong>Workspace Owners</strong>, <strong>Admins</strong>, and <strong>Event Managers</strong> can invite new team members. Staff members cannot dispatch invites.
                    </p>
                    {organizations.some((o) => o.role === "Owner" && o.id !== activeOrg?.id) && (
                      <div className="pt-2 border-t border-amber-200">
                        <p className="text-[10px] font-semibold text-amber-900 mb-1.5">
                          Switch to a workspace where you are an Owner:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {organizations
                            .filter((o) => o.role === "Owner" && o.id !== activeOrg?.id)
                            .map((o) => (
                              <button
                                key={o.id}
                                type="button"
                                onClick={async () => {
                                  await handleSwitchOrg(o.id);
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-amber-300 rounded-xl text-[10px] font-bold text-stone-800 shadow-xs transition"
                              >
                                Switch to {o.name}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                    Team Member Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="collaborator@aureliaevents.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none focus:border-[#E06B53]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                    Assigned Workspace Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="Staff">Staff (Task Execution Only)</option>
                    <option value="EventManager">Event Manager (Full Event Operations)</option>
                    <option value="Admin">Administrator (Operations & Members)</option>
                    <option value="FinanceManager">Finance Manager (Budgets & Reports)</option>
                    <option value="VendorCoordinator">Vendor Coordinator (Vendor Directory)</option>
                    <option value="Vendor">External Vendor (Bookings & Deliveries)</option>
                    <option value="Client">Client (Read & Approvals)</option>
                  </select>
                </div>

                <div className="p-3 bg-stone-100 rounded-2xl text-[11px] text-stone-600 leading-relaxed">
                  Invitations generate an expiring 7-day token. In local development, you will receive an instant direct link to accept.
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-xl bg-stone-200 text-stone-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!permissions.includes("member:invite")}
                    className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-xs transition ${
                      permissions.includes("member:invite")
                        ? "bg-[#E06B53] hover:bg-[#c95841] text-white cursor-pointer"
                        : "bg-stone-300 text-stone-500 cursor-not-allowed opacity-80"
                    }`}
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Action Confirmation Modal (Replaces browser native confirm) */}
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
