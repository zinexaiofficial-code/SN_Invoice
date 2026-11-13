"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  X,
  Clock4,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { storage } from "@/lib/storage";
import { ChequeReminder, Cheque } from "@/types";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reminders, setReminders] = useState<(ChequeReminder & { cheque?: Cheque })[]>([]);
  const [filter, setFilter] = useState<"all" | "urgent" | "today">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshReminders = () => {
    const list = storage.getChequeReminders({ onlyPending: true });
    setReminders(list);
  };

  useEffect(() => {
    refreshReminders();

    // Listen to local storage events or refresh periodically
    const interval = setInterval(refreshReminders, 15000);
    const handleStorageChange = () => refreshReminders();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cheque-updated", handleStorageChange);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cheque-updated", handleStorageChange);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount = reminders.filter((r) => !r.isRead).length;
  const urgentCount = reminders.filter((r) => r.priority === "urgent" || r.priority === "high").length;

  const handleSnooze = (reminderId: string, days: number, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.snoozeReminder(reminderId, days);
    refreshReminders();
  };

  const handleDismiss = (reminderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.dismissReminder(reminderId);
    refreshReminders();
  };

  const handleMarkAllRead = () => {
    reminders.forEach((r) => storage.markReminderRead(r.id));
    refreshReminders();
  };

  const handleReminderClick = (r: ChequeReminder & { cheque?: Cheque }) => {
    storage.markReminderRead(r.id);
    refreshReminders();
    setIsOpen(false);
    if (r.cheque) {
      router.push(`/cheques?search=${encodeURIComponent(r.cheque.chequeNumber)}`);
    } else {
      router.push("/cheques");
    }
  };

  const filteredReminders = reminders.filter((r) => {
    if (filter === "urgent") return r.priority === "urgent" || r.priority === "high";
    if (filter === "today") return r.reminderType === "due_today" || r.reminderType === "returned_action";
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-navy-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500",
          isOpen && "bg-navy-900 text-white",
          urgentCount > 0 && "text-amber-400"
        )}
        title={unreadCount > 0 ? `${unreadCount} Cheque Reminders & Alerts` : "Cheque Reminders"}
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-md ring-2 ring-navy-950 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 md:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 text-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right">
          {/* Header */}
          <div className="bg-navy-950 text-white p-4 flex items-center justify-between border-b border-navy-900">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-white flex items-center space-x-2">
                  <span>Cheque Reminders</span>
                  {unreadCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-300">Automated deposit & follow-up tracking</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded hover:bg-navy-900 transition-colors"
                >
                  Mark read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Filter Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center space-x-1.5 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-colors",
                filter === "all"
                  ? "bg-navy-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/70"
              )}
            >
              All ({reminders.length})
            </button>
            <button
              onClick={() => setFilter("urgent")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1",
                filter === "urgent"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/70"
              )}
            >
              <span>Urgent</span>
              {urgentCount > 0 && (
                <span className="bg-white/20 text-white text-[10px] px-1 rounded-full font-bold">
                  {urgentCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter("today")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-colors",
                filter === "today"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/70"
              )}
            >
              Today
            </button>
          </div>

          {/* Reminders List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredReminders.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80" />
                <p className="text-sm font-semibold text-slate-700">All cheques up to date</p>
                <p className="text-xs text-slate-500 mt-0.5">No pending alerts or overdue cheques.</p>
              </div>
            ) : (
              filteredReminders.map((r) => {
                const isUrgent = r.priority === "urgent";
                const isHigh = r.priority === "high";

                return (
                  <div
                    key={r.id}
                    onClick={() => handleReminderClick(r)}
                    className={cn(
                      "p-3.5 hover:bg-slate-50 transition-colors cursor-pointer rounded-xl my-1 relative group",
                      !r.isRead && "bg-emerald-50/40 border-l-4 border-emerald-500",
                      isUrgent && "bg-rose-50/40 border-l-4 border-rose-500"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5",
                            isUrgent
                              ? "bg-rose-100 text-rose-600"
                              : isHigh
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-600"
                          )}
                        >
                          {isUrgent ? (
                            <ShieldAlert className="w-4 h-4" />
                          ) : isHigh ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 leading-tight">
                              {r.title}
                            </span>
                            {r.cheque?.billingEntityPrefix && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-semibold">
                                {r.cheque.billingEntityPrefix}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">{r.message}</p>

                          <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-0.5">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{r.reminderDate}</span>
                            </span>
                            {r.cheque?.drawerBank && (
                              <span className="font-medium text-slate-600">
                                {r.cheque.drawerBank}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dismiss button */}
                      <button
                        onClick={(e) => handleDismiss(r.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-opacity"
                        title="Dismiss reminder"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick action buttons footer */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={(e) => handleSnooze(r.id, 1, e)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium flex items-center space-x-1 transition-colors"
                          title="Remind again tomorrow"
                        >
                          <Clock4 className="w-3 h-3" />
                          <span>Snooze 1d</span>
                        </button>
                        <button
                          onClick={(e) => handleSnooze(r.id, 3, e)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
                          title="Remind in 3 days"
                        >
                          3d
                        </button>
                      </div>

                      <span className="text-emerald-700 group-hover:text-emerald-800 font-semibold flex items-center space-x-1">
                        <span>View Cheque</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-between">
            <Link
              href="/cheques"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
            >
              <span>Open Cheque Register & Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-[10px] text-slate-400 font-mono">Asia/Colombo</span>
          </div>
        </div>
      )}
    </div>
  );
}
