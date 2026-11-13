"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  PlusCircle,
  Search,
  Filter,
  Download,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ShieldAlert,
  Building2,
  RefreshCw,
  Eye,
  Edit2,
  RotateCcw,
  Clock4,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { storage } from "@/lib/storage";
import { Cheque, ChequeType, ChequeKPIs, BillingEntity, ChequeReminder } from "@/types";
import { ChequeModal } from "@/components/cheques/ChequeModal";
import { ChequeStatusModal } from "@/components/cheques/ChequeStatusModal";
import { ChequeDetailsModal } from "@/components/cheques/ChequeDetailsModal";
import { ChequeCalendar } from "@/components/cheques/ChequeCalendar";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";

function ChequesPageContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [entities, setEntities] = useState<BillingEntity[]>([]);
  const [kpis, setKpis] = useState<ChequeKPIs>({
    totalIncomingAmount: 0,
    totalOutgoingAmount: 0,
    pendingChequesCount: 0,
    pendingChequesAmount: 0,
    due7DaysCount: 0,
    due7DaysAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    clearedCount: 0,
    clearedAmount: 0,
    returnedCount: 0,
    returnedAmount: 0
  });

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"all" | "incoming" | "outgoing" | "action_required" | "calendar">("all");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bankFilter, setBankFilter] = useState<string>("all");

  // Modals state
  const [isNewChequeModalOpen, setIsNewChequeModalOpen] = useState(false);
  const [modalChequeType, setModalChequeType] = useState<ChequeType>("incoming");
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
  const [statusTargetCheque, setStatusTargetCheque] = useState<Cheque | null>(null);
  const [detailsTargetCheque, setDetailsTargetCheque] = useState<Cheque | null>(null);

  const loadData = () => {
    const entList = storage.getBillingEntities();
    setEntities(entList);

    const filterObj = {
      entityId: selectedEntityId !== "all" ? selectedEntityId : undefined,
    };

    const list = storage.getCheques(filterObj);
    setCheques(list);

    const calculatedKpis = storage.getChequeKPIs(filterObj);
    setKpis(calculatedKpis);
  };

  useEffect(() => {
    loadData();

    const handleChequeUpdate = () => loadData();
    window.addEventListener("cheque-updated", handleChequeUpdate);
    window.addEventListener("storage", handleChequeUpdate);

    return () => {
      window.removeEventListener("cheque-updated", handleChequeUpdate);
      window.removeEventListener("storage", handleChequeUpdate);
    };
  }, [selectedEntityId]);

  // Urgent Reminders list
  const urgentReminders = useMemo(() => {
    return storage.getChequeReminders({ onlyPending: true, limit: 5 });
  }, [cheques]);

  // Filtered Cheques for table
  const filteredCheques = useMemo(() => {
    return cheques.filter((c) => {
      if (activeTab === "incoming" && c.type !== "incoming") return false;
      if (activeTab === "outgoing" && c.type !== "outgoing") return false;
      if (activeTab === "action_required") {
        const isAction = c.status === "returned" || c.alertState === "overdue" || c.alertState === "action_required";
        if (!isAction) return false;
      }

      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (bankFilter !== "all" && !c.drawerBank.toLowerCase().includes(bankFilter.toLowerCase())) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const m1 = c.chequeNumber.toLowerCase().includes(q);
        const m2 = c.payerOrPayeeName.toLowerCase().includes(q);
        const m3 = c.drawerBank.toLowerCase().includes(q);
        const m4 = (c.purposeOfPayment || "").toLowerCase().includes(q);
        const m5 = (c.billingEntityName || "").toLowerCase().includes(q);
        if (!m1 && !m2 && !m3 && !m4 && !m5) return false;
      }

      return true;
    });
  }, [cheques, activeTab, statusFilter, bankFilter, searchQuery]);

  // Export CSV handler
  const handleExportCSV = () => {
    if (filteredCheques.length === 0) {
      alert("No cheques to export.");
      return;
    }

    const headers = [
      "Cheque Number",
      "Type",
      "Billing Entity",
      "Payer / Payee",
      "Drawer Bank",
      "Branch",
      "Cheque Date",
      "Expected Action Date",
      "Actual Clearance Date",
      "Amount (LKR)",
      "Status",
      "Return Reason",
      "Notes"
    ];

    const rows = filteredCheques.map((c) => [
      `"${c.chequeNumber}"`,
      `"${c.type}"`,
      `"${c.billingEntityName || ""}"`,
      `"${c.payerOrPayeeName.replace(/"/g, '""')}"`,
      `"${c.drawerBank.replace(/"/g, '""')}"`,
      `"${c.branch || ""}"`,
      `"${c.chequeDate}"`,
      `"${c.expectedActionDate}"`,
      `"${c.actualClearanceDate || ""}"`,
      c.amount,
      `"${c.status}"`,
      `"${c.returnReason || ""}"`,
      `"${(c.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SN_Cheques_Register_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "cleared":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">Cleared</span>;
      case "returned":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">Returned</span>;
      case "pending_deposit":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-300">Pending Deposit</span>;
      case "pending_presentation":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-300">Pending Pres.</span>;
      case "deposited":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-100 text-indigo-800 border border-indigo-300">Deposited</span>;
      case "presented":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-100 text-indigo-800 border border-indigo-300">Presented</span>;
      case "received":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-100 text-blue-800 border border-blue-300">Received</span>;
      case "issued":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-100 text-blue-800 border border-blue-300">Issued</span>;
      case "cancelled":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-300">Cancelled</span>;
      case "replaced":
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-100 text-purple-800 border border-purple-300">Replaced</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getAlertBadge = (c: Cheque) => {
    if (c.status === "cleared") return null;
    if (c.status === "returned") {
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          <span>Action Req.</span>
        </span>
      );
    }
    if (c.alertState === "overdue") {
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
          <Clock className="w-3 h-3 text-rose-600" />
          <span>Overdue</span>
        </span>
      );
    }
    if (c.alertState === "due_today") {
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Due Today</span>
        </span>
      );
    }
    return null;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
              Finance & Treasury
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Smart Reminder Module</span>
          </div>
          <h1 className="text-2xl font-black text-navy-950 mt-1">Cheque Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor incoming client cheques, vendor presentations, deposit deadlines & overdue alerts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Entity Filter Selector */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">All Billing Entities</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.displayName || ent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Record Incoming */}
          <button
            onClick={() => {
              setModalChequeType("incoming");
              setEditingCheque(null);
              setIsNewChequeModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 transition-all active:scale-95 flex items-center space-x-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Record Cheque</span>
          </button>
        </div>
      </div>

      {/* 7 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* 1. Total Incoming */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>Total Incoming</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div>
            <p className="text-base font-black text-slate-900 truncate">
              Rs. {Number(kpis.totalIncomingAmount).toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-slate-400">Client cheques</span>
          </div>
        </div>

        {/* 2. Total Outgoing */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>Total Outgoing</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div>
            <p className="text-base font-black text-slate-900 truncate">
              Rs. {Number(kpis.totalOutgoingAmount).toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-slate-400">Vendor payments</span>
          </div>
        </div>

        {/* 3. Pending Cheques */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>Pending</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-base font-black text-amber-900">{kpis.pendingChequesCount}</span>
              <span className="text-[10px] text-slate-400">cheques</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-600 truncate">
              Rs. {Number(kpis.pendingChequesAmount).toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* 4. Due Within 7 Days */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>Due 7 Days</span>
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-base font-black text-indigo-950">{kpis.due7DaysCount}</span>
              <span className="text-[10px] text-slate-400">cheques</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-600 truncate">
              Rs. {Number(kpis.due7DaysAmount).toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* 5. Overdue Cheques */}
        <div className={cn(
          "bg-white p-3.5 rounded-2xl border shadow-xs flex flex-col justify-between",
          kpis.overdueCount > 0 ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
        )}>
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span className={kpis.overdueCount > 0 ? "text-rose-700 font-bold" : ""}>Overdue</span>
            <AlertTriangle className={cn("w-3.5 h-3.5", kpis.overdueCount > 0 ? "text-rose-600" : "text-slate-400")} />
          </div>
          <div>
            <div className="flex items-baseline space-x-1">
              <span className={cn("text-base font-black", kpis.overdueCount > 0 ? "text-rose-600" : "text-slate-900")}>
                {kpis.overdueCount}
              </span>
              <span className="text-[10px] text-slate-400">cheques</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-600 truncate">
              Rs. {Number(kpis.overdueAmount).toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* 6. Cleared */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>Cleared</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-base font-black text-emerald-700">{kpis.clearedCount}</span>
              <span className="text-[10px] text-slate-400">cheques</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-600 truncate">
              Rs. {Number(kpis.clearedAmount).toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* 7. Returned */}
        <div className={cn(
          "bg-white p-3.5 rounded-2xl border shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1",
          kpis.returnedCount > 0 ? "border-rose-300 bg-rose-50/50" : "border-slate-200"
        )}>
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span className={kpis.returnedCount > 0 ? "text-rose-700 font-bold" : ""}>Returned</span>
            <ShieldAlert className={cn("w-3.5 h-3.5", kpis.returnedCount > 0 ? "text-rose-600" : "text-slate-400")} />
          </div>
          <div>
            <div className="flex items-baseline space-x-1">
              <span className={cn("text-base font-black", kpis.returnedCount > 0 ? "text-rose-700 animate-pulse" : "text-slate-900")}>
                {kpis.returnedCount}
              </span>
              <span className="text-[10px] text-slate-400">action req.</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-600 truncate">
              Rs. {Number(kpis.returnedAmount).toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming Cheque Reminders Panel */}
      {urgentReminders.length > 0 && (
        <div className="bg-gradient-to-r from-navy-950 to-slate-900 text-white rounded-2xl p-5 border border-navy-800 shadow-md">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center space-x-2">
                  <span>Upcoming Cheque Reminders & Action Alerts</span>
                  <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">
                    {urgentReminders.length} urgent
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  Automated deposit notifications, clearance follow-ups, and bounced cheque alerts
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("action_required")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
            >
              <span>View All Alerts</span>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentReminders.slice(0, 3).map((r) => {
              const isUrgent = r.priority === "urgent";

              return (
                <div
                  key={r.id}
                  className={cn(
                    "bg-navy-900/90 rounded-xl p-3.5 border transition-all flex flex-col justify-between space-y-2.5",
                    isUrgent ? "border-rose-500/50 bg-rose-950/20" : "border-navy-700/80"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white truncate">{r.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">{r.reminderDate}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {r.message}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-navy-800 text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => {
                          storage.snoozeReminder(r.id, 1);
                          loadData();
                        }}
                        className="px-2 py-0.5 bg-navy-800 hover:bg-navy-700 text-slate-300 rounded font-medium transition-colors"
                        title="Snooze for 1 day"
                      >
                        Snooze 1d
                      </button>
                      <button
                        onClick={() => {
                          storage.dismissReminder(r.id);
                          loadData();
                        }}
                        className="px-2 py-0.5 bg-navy-800 hover:bg-navy-700 text-slate-400 hover:text-slate-200 rounded transition-colors"
                        title="Dismiss"
                      >
                        Dismiss
                      </button>
                    </div>

                    {r.cheque && (
                      <button
                        onClick={() => setDetailsTargetCheque(r.cheque!)}
                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs & Search Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "py-3 px-3.5 border-b-2 font-bold transition-colors flex items-center space-x-1.5",
                activeTab === "all"
                  ? "border-emerald-600 text-emerald-700 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              <CreditCard className="w-4 h-4" />
              <span>All Cheques ({cheques.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("incoming")}
              className={cn(
                "py-3 px-3.5 border-b-2 font-bold transition-colors flex items-center space-x-1.5",
                activeTab === "incoming"
                  ? "border-emerald-600 text-emerald-700 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>Incoming Cheques ({cheques.filter((c) => c.type === "incoming").length})</span>
            </button>

            <button
              onClick={() => setActiveTab("outgoing")}
              className={cn(
                "py-3 px-3.5 border-b-2 font-bold transition-colors flex items-center space-x-1.5",
                activeTab === "outgoing"
                  ? "border-emerald-600 text-emerald-700 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              <ArrowUpRight className="w-4 h-4 text-blue-600" />
              <span>Outgoing Cheques ({cheques.filter((c) => c.type === "outgoing").length})</span>
            </button>

            <button
              onClick={() => setActiveTab("action_required")}
              className={cn(
                "py-3 px-3.5 border-b-2 font-bold transition-colors flex items-center space-x-1.5",
                activeTab === "action_required"
                  ? "border-rose-600 text-rose-700 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Action Required ({kpis.overdueCount + kpis.returnedCount})</span>
            </button>

            <button
              onClick={() => setActiveTab("calendar")}
              className={cn(
                "py-3 px-3.5 border-b-2 font-bold transition-colors flex items-center space-x-1.5",
                activeTab === "calendar"
                  ? "border-emerald-600 text-emerald-700 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendar View</span>
            </button>
          </div>
        </div>

        {/* Filter Controls (Shown for table tabs) */}
        {activeTab !== "calendar" && (
          <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cheque #, client, bank, notes..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="received">Received</option>
                <option value="pending_deposit">Pending Deposit</option>
                <option value="deposited">Deposited</option>
                <option value="cleared">Cleared</option>
                <option value="returned">Returned</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Banks</option>
                <option value="Commercial">Commercial Bank</option>
                <option value="Seylan">Seylan Bank</option>
                <option value="Sampath">Sampath Bank</option>
                <option value="HNB">HNB</option>
                <option value="BOC">Bank of Ceylon</option>
                <option value="Nations">Nations Trust</option>
              </select>

              {(searchQuery || statusFilter !== "all" || bankFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setBankFilter("all");
                  }}
                  className="px-2.5 py-2 text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT */}
        {activeTab === "calendar" ? (
          <div className="p-4 sm:p-6">
            <ChequeCalendar
              cheques={filteredCheques}
              onSelectCheque={(c) => setDetailsTargetCheque(c)}
            />
          </div>
        ) : (
          /* Cheque Register Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Cheque #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Client / Payee</th>
                  <th className="py-3 px-4">Bank & Branch</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Amount (LKR)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCheques.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No cheques found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or record a new cheque.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCheques.map((chq) => {
                    const isIncoming = chq.type === "incoming";

                    return (
                      <tr
                        key={chq.id}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        onClick={() => setDetailsTargetCheque(chq)}
                      >
                        {/* Cheque # */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          <div className="flex items-center space-x-1.5">
                            <span>#{chq.chequeNumber}</span>
                            {getAlertBadge(chq)}
                          </div>
                        </td>

                        {/* Direction Type */}
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                              isIncoming
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-blue-50 text-blue-800 border border-blue-200"
                            )}
                          >
                            {isIncoming ? (
                              <>
                                <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                <span>In</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3 h-3 text-blue-600" />
                                <span>Out</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* Entity */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded">
                            {chq.billingEntityPrefix || "SN"}
                          </span>
                        </td>

                        {/* Client / Payee */}
                        <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[200px] truncate">
                          {chq.payerOrPayeeName}
                        </td>

                        {/* Bank & Branch */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <p className="font-medium text-slate-900">{chq.drawerBank}</p>
                          <p className="text-[10px] text-slate-400">{chq.branch || "Main Branch"}</p>
                        </td>

                        {/* Due Date */}
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-800 font-mono">
                            {chq.expectedActionDate || chq.chequeDate}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {isIncoming ? "Deposit date" : "Pres. date"}
                          </p>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-bold font-mono text-slate-900">
                          Rs. {Number(chq.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(chq.status)}
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 text-right space-x-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setStatusTargetCheque(chq)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Update Status"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCheque(chq);
                              setIsNewChequeModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Cheque"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDetailsTargetCheque(chq)}
                            className="p-1.5 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Add / Edit Cheque Modal */}
      <ChequeModal
        isOpen={isNewChequeModalOpen}
        cheque={editingCheque}
        defaultType={modalChequeType}
        onClose={() => {
          setIsNewChequeModalOpen(false);
          setEditingCheque(null);
        }}
        onSaved={loadData}
      />

      {/* 2. Change Status Modal */}
      <ChequeStatusModal
        isOpen={Boolean(statusTargetCheque)}
        cheque={statusTargetCheque}
        onClose={() => setStatusTargetCheque(null)}
        onUpdated={loadData}
      />

      {/* 3. Cheque Details Modal */}
      <ChequeDetailsModal
        isOpen={Boolean(detailsTargetCheque)}
        cheque={detailsTargetCheque}
        onClose={() => setDetailsTargetCheque(null)}
        onEdit={(c) => {
          setEditingCheque(c);
          setIsNewChequeModalOpen(true);
        }}
        onUpdateStatus={(c) => setStatusTargetCheque(c)}
        onDelete={(c) => {
          storage.deleteCheque(c.id);
          loadData();
        }}
      />
      </div>
    </AppLayout>
  );
}

export default function ChequesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 font-medium">
          Loading Cheques &amp; Reminders...
        </div>
      }
    >
      <ChequesPageContent />
    </Suspense>
  );
}
