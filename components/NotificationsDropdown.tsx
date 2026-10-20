"use client";

import { useEffect, useState, useRef } from "react";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "task" | "booking" | "conflict" | "approval" | "payment" | "deadline" | "readiness" | "system";
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

interface NotificationsDropdownProps {
  onNavigateTab?: (tab: string) => void;
}

export default function NotificationsDropdown({ onNavigateTab }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // Polling per MVP spec (Section 21.2)
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { notificationId: id } : { markAll: true }),
      });
      if (id) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark notifications", err);
    }
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "conflict":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "approval":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "payment":
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case "booking":
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case "readiness":
        return <Sparkles className="w-4 h-4 text-[#E06B53]" />;
      default:
        return <Clock className="w-4 h-4 text-stone-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white border border-stone-200/80 text-stone-600 hover:text-slate-900 hover:border-stone-300 transition shadow-xs"
        title="Notifications Center"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#E06B53] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-stone-200 shadow-2xl z-50 overflow-hidden animate-in fade-in duration-200">
          <div className="p-3.5 bg-stone-50 border-b border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900">Notifications & Alerts</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#E06B53]/15 text-[#E06B53] text-[10px] font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                className="text-[11px] font-medium text-[#E06B53] hover:underline flex items-center space-x-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-stone-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400">No notifications yet.</div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.isRead) markAsRead(item.id);
                    if (item.actionUrl && onNavigateTab) {
                      const tab = item.actionUrl.replace("/?tab=", "");
                      onNavigateTab(tab);
                      setIsOpen(false);
                    }
                  }}
                  className={`p-3.5 hover:bg-stone-50 cursor-pointer transition flex items-start space-x-3 ${
                    !item.isRead ? "bg-stone-50/70" : ""
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white border border-stone-200/80 shrink-0 mt-0.5">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
                      {!item.isRead && <span className="w-2 h-2 rounded-full bg-[#E06B53] shrink-0 ml-1.5" />}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">{item.message}</p>
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      {new Date(item.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-stone-50 border-t border-stone-200/80 text-center">
            <span className="text-[10px] text-stone-400">EverFlow Real-Time Notifications</span>
          </div>
        </div>
      )}
    </div>
  );
}
