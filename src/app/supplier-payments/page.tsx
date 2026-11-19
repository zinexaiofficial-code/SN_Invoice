"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet,
  PlusCircle,
  Search,
  Filter,
  Building2,
  Tv,
  Radio,
  FileText,
  Printer,
  Trash2,
  Edit,
  ArrowRight,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Download,
  Calendar,
  Layers,
  Users
} from "lucide-react";
import { useDatabase } from "@/context/DatabaseContext";
import {
  SupplierPayable,
  Supplier,
  SupplierPaymentStatus,
  MediaSchedule
} from "@/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { SupplierPayableModal } from "@/components/supplier-payments/SupplierPayableModal";
import { SupplierModal } from "@/components/supplier-payments/SupplierModal";
import { RecordPaymentModal } from "@/components/supplier-payments/RecordPaymentModal";
import { SupplierStatementModal } from "@/components/supplier-payments/SupplierStatementModal";
import { KpiCurrencyValue } from "@/components/ui/KpiValue";

export default function SupplierPaymentsPage() {
  const router = useRouter();
  const {
    suppliers,
    supplierPayables,
    billingEntities,
    clients,
    schedules,
    deleteSupplierPayable,
    deleteSupplier,
    userRole
  } = useDatabase();

  const [activeTab, setActiveTab] = useState<"payables" | "suppliers">("payables");

  // Filters for Payables
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("all");
  const [selectedSupplierId, setSelectedSupplierId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState("all");

  // Supplier directory search
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");

  // Modals state
  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<SupplierPayable | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [paymentTargetPayable, setPaymentTargetPayable] = useState<SupplierPayable | null>(null);
  const [statementPayable, setStatementPayable] = useState<SupplierPayable | null>(null);

  // Filtered Payables
  const filteredPayables = useMemo(() => {
    return supplierPayables.filter((p) => {
      if (selectedEntityId !== "all" && p.billingEntityId !== selectedEntityId) return false;
      if (selectedSupplierId !== "all" && p.supplierId !== selectedSupplierId) return false;
      if (selectedChannel !== "all" && p.channelName?.toLowerCase() !== selectedChannel.toLowerCase()) return false;

      // Status check (with dynamic overdue calculation)
      const isOverdue =
        p.outstandingAmount > 0 &&
        p.dueDate &&
        new Date(p.dueDate) < new Date(new Date().toDateString());

      if (selectedStatus === "overdue") {
        if (!isOverdue) return false;
      } else if (selectedStatus !== "all") {
        if (p.status !== selectedStatus) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sup = suppliers.find((s) => s.id === p.supplierId);
        const sched = schedules.find((s) => s.id === p.mediaScheduleId);
        const matchRef = p.payableNumber?.toLowerCase().includes(q);
        const matchInv = p.supplierInvoiceNumber?.toLowerCase().includes(q);
        const matchSup = (sup?.name || p.supplierSnapshot?.name || "").toLowerCase().includes(q);
        const matchCampaign = (p.campaignName || sched?.campaignName || "").toLowerCase().includes(q);
        const matchChannel = (p.channelName || sched?.mediaChannelName || "").toLowerCase().includes(q);
        if (!matchRef && !matchInv && !matchSup && !matchCampaign && !matchChannel) {
          return false;
        }
      }

      return true;
    });
  }, [supplierPayables, selectedEntityId, selectedSupplierId, selectedChannel, selectedStatus, searchQuery, suppliers, schedules]);

  // Filtered Suppliers Directory
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery.trim()) return suppliers;
    const q = supplierSearchQuery.toLowerCase();
    return suppliers.filter((s) => {
      const matchName = s.name.toLowerCase().includes(q);
      const matchCode = s.code?.toLowerCase().includes(q);
      const matchChannel = (s.channels || []).some((c) => c.toLowerCase().includes(q));
      const matchContact = s.contactPerson?.toLowerCase().includes(q);
      return matchName || matchCode || matchChannel || matchContact;
    });
  }, [suppliers, supplierSearchQuery]);

  // 6 KPI Metrics
  const kpis = useMemo(() => {
    let totalPayablesAmount = 0;
    let totalPaidAmount = 0;
    let outstandingAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let partiallyPaidCount = 0;
    let fullyPaidCount = 0;

    const todayStr = new Date().toDateString();
    const today = new Date(todayStr);

    supplierPayables.forEach((p) => {
      // Respect selected billing entity filter if set
      if (selectedEntityId !== "all" && p.billingEntityId !== selectedEntityId) {
        return;
      }

      totalPayablesAmount += p.totalAmount || 0;
      totalPaidAmount += p.totalPaid || 0;
      outstandingAmount += p.outstandingAmount || 0;

      const isOverdue =
        p.outstandingAmount > 0 &&
        p.dueDate &&
        new Date(p.dueDate) < today;

      if (isOverdue) {
        overdueCount += 1;
        overdueAmount += p.outstandingAmount;
      }

      if (p.status === "partially_paid" || (p.totalPaid > 0 && p.outstandingAmount > 0)) {
        partiallyPaidCount += 1;
      } else if (p.status === "paid" || (p.totalPaid >= p.totalAmount && p.totalAmount > 0)) {
        fullyPaidCount += 1;
      }
    });

    return {
      totalPayablesCount: supplierPayables.length,
      totalPayablesAmount,
      totalPaidAmount,
      outstandingAmount,
      overdueCount,
      overdueAmount,
      partiallyPaidCount,
      fullyPaidCount,
    };
  }, [supplierPayables, selectedEntityId]);

  // Unique channel list
  const uniqueChannels = useMemo(() => {
    const set = new Set<string>();
    supplierPayables.forEach((p) => {
      if (p.channelName) set.add(p.channelName);
    });
    schedules.forEach((s) => {
      if (s.mediaChannelName) set.add(s.mediaChannelName);
    });
    return Array.from(set).sort();
  }, [supplierPayables, schedules]);

  // Delete payable handler
  const handleDeletePayable = async (id: string, ref: string) => {
    if (!confirm(`Are you sure you want to delete supplier payable "${ref}"? Any recorded payments will also be removed.`)) {
      return;
    }
    try {
      await deleteSupplierPayable(id);
    } catch (err) {
      console.error("Failed to delete payable:", err);
      alert("Failed to delete payable. Please try again.");
    }
  };

  // Delete supplier handler
  const handleDeleteSupplier = async (id: string, name: string) => {
    const hasPayables = supplierPayables.some((p) => p.supplierId === id);
    if (hasPayables) {
      alert(`Cannot delete supplier "${name}" because bills are linked to this supplier. Archive or delete bills first.`);
      return;
    }
    if (!confirm(`Delete supplier "${name}"?`)) return;

    try {
      await deleteSupplier(id);
    } catch (err) {
      console.error("Failed to delete supplier:", err);
      alert("Failed to delete supplier.");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (filteredPayables.length === 0) {
      alert("No payables to export.");
      return;
    }
    const headers = [
      "Payable Ref",
      "Supplier",
      "Supplier Invoice #",
      "Billing Entity",
      "Schedule Ref",
      "Campaign",
      "Channel",
      "Bill Date",
      "Due Date",
      "Total Amount",
      "Total Paid",
      "Outstanding Balance",
      "Status",
    ];

    const rows = filteredPayables.map((p) => {
      const sup = suppliers.find((s) => s.id === p.supplierId);
      const entity = billingEntities.find((e) => e.id === p.billingEntityId);
      const sched = schedules.find((s) => s.id === p.mediaScheduleId);
      return [
        p.payableNumber,
        `"${sup?.name || p.supplierSnapshot?.name || ""}"`,
        `"${p.supplierInvoiceNumber || ""}"`,
        `"${entity?.name || ""}"`,
        p.mediaScheduleId ? sched?.scheduleNumber || "" : "",
        `"${p.campaignName || sched?.campaignName || ""}"`,
        `"${p.channelName || sched?.mediaChannelName || ""}"`,
        p.billDate,
        p.dueDate,
        p.totalAmount,
        p.totalPaid,
        p.outstandingAmount,
        p.status,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Supplier_Payables_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge Helper
  const getStatusBadge = (payable: SupplierPayable) => {
    const isOverdue =
      payable.outstandingAmount > 0 &&
      payable.dueDate &&
      new Date(payable.dueDate) < new Date(new Date().toDateString());

    if (payable.status === "paid" || payable.status === "fully_paid" || payable.outstandingAmount <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
          <CheckCircle className="w-3 h-3" /> Fully Paid
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
          <AlertCircle className="w-3 h-3" /> Overdue
        </span>
      );
    }
    if (payable.status === "partially_paid" || payable.totalPaid > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
          <Clock className="w-3 h-3" /> Partially Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
        <Clock className="w-3 h-3" /> Unpaid
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-5 pb-10">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-sm">
                <Wallet className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Supplier Payments
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Outgoing payments to TV channels, radio broadcasters, and media houses. Settle bills and monitor cash outflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingSupplier(null);
                setIsSupplierModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>+ New Supplier</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingPayable(null);
                setIsPayableModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Supplier Bill</span>
            </button>
          </div>
        </div>

        {/* 6 Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Supplier Payables */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
              Total Payables
            </span>
            <span className="text-lg font-black text-slate-900 font-mono mt-1 block">
              <KpiCurrencyValue value={kpis.totalPayablesAmount} />
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {kpis.totalPayablesCount} registered bills
            </span>
          </div>

          {/* Card 2: Total Amount Paid */}
          <div className="p-3.5 bg-white border border-emerald-200 rounded-xl shadow-xs bg-emerald-50/20">
            <span className="text-[11px] font-bold text-emerald-800 block uppercase tracking-wider">
              Total Settled
            </span>
            <span className="text-lg font-black text-emerald-700 font-mono mt-1 block">
              <KpiCurrencyValue value={kpis.totalPaidAmount} />
            </span>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">
              Outflow completed
            </span>
          </div>

          {/* Card 3: Outstanding Amount */}
          <div className="p-3.5 bg-white border border-rose-200 rounded-xl shadow-xs bg-rose-50/20">
            <span className="text-[11px] font-bold text-rose-800 block uppercase tracking-wider">
              Outstanding
            </span>
            <span className="text-lg font-black text-rose-700 font-mono mt-1 block">
              <KpiCurrencyValue value={kpis.outstandingAmount} />
            </span>
            <span className="text-[10px] text-rose-600 mt-0.5 block">
              Pending settlements
            </span>
          </div>

          {/* Card 4: Overdue Payments */}
          <div className="p-3.5 bg-white border border-red-300 rounded-xl shadow-xs bg-red-50/30">
            <span className="text-[11px] font-bold text-red-800 block uppercase tracking-wider flex items-center justify-between">
              <span>Overdue</span>
              <span className="px-1.5 py-0.2 bg-red-200 text-red-900 rounded-full text-[10px]">
                {kpis.overdueCount}
              </span>
            </span>
            <span className="text-lg font-black text-red-700 font-mono mt-1 block">
              <KpiCurrencyValue value={kpis.overdueAmount} />
            </span>
            <span className="text-[10px] text-red-600 mt-0.5 block">
              Past payment deadline
            </span>
          </div>

          {/* Card 5: Partially Paid */}
          <div className="p-3.5 bg-white border border-amber-200 rounded-xl shadow-xs bg-amber-50/20">
            <span className="text-[11px] font-bold text-amber-800 block uppercase tracking-wider">
              Partially Paid
            </span>
            <span className="text-xl font-black text-amber-700 font-mono mt-1 block">
              {kpis.partiallyPaidCount}
            </span>
            <span className="text-[10px] text-amber-600 mt-0.5 block">
              Active installments
            </span>
          </div>

          {/* Card 6: Fully Paid */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
              Fully Settled
            </span>
            <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
              {kpis.fullyPaidCount}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Zero balance bills
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex items-center space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("payables")}
            className={`pb-3 text-xs font-bold transition-all relative ${
              activeTab === "payables"
                ? "text-emerald-700 border-b-2 border-emerald-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>All Supplier Bills & Payables</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
              {filteredPayables.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("suppliers")}
            className={`pb-3 text-xs font-bold transition-all relative ${
              activeTab === "suppliers"
                ? "text-emerald-700 border-b-2 border-emerald-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Suppliers & Broadcasters Directory</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
              {suppliers.length}
            </span>
          </button>
        </div>

        {/* TAB 1: ALL PAYABLES */}
        {activeTab === "payables" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center gap-2.5 text-xs">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search payable #, supplier, invoice #, campaign, channel..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Entity Filter */}
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">All Billing Entities</option>
                {billingEntities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>

              {/* Supplier Filter */}
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Channel Filter */}
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">All Channels</option>
                {uniqueChannels.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Fully Paid</option>
                <option value="overdue">Overdue Only</option>
              </select>
            </div>

            {/* Payables Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              {filteredPayables.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">No Supplier Bills Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {searchQuery || selectedStatus !== "all" || selectedSupplierId !== "all"
                      ? "No records match your selected search or filter criteria."
                      : "Record outgoing supplier expenses or link an existing Media Schedule to track broadcaster payments."}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPayable(null);
                        setIsPayableModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                    >
                      + Record First Supplier Bill
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="px-4 py-3">PAYABLE #</th>
                        <th className="px-4 py-3">SUPPLIER</th>
                        <th className="px-4 py-3">SCHEDULE & CAMPAIGN</th>
                        <th className="px-4 py-3">CHANNEL</th>
                        <th className="px-4 py-3">BILL / DUE DATE</th>
                        <th className="px-4 py-3 text-right">TOTAL (LKR)</th>
                        <th className="px-4 py-3 text-right">PAID (LKR)</th>
                        <th className="px-4 py-3 text-right">BALANCE (LKR)</th>
                        <th className="px-4 py-3 text-center">STATUS</th>
                        <th className="px-4 py-3 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPayables.map((payable) => {
                        const sup = suppliers.find((s) => s.id === payable.supplierId);
                        const entity = billingEntities.find((e) => e.id === payable.billingEntityId);
                        const sched = schedules.find((s) => s.id === payable.mediaScheduleId);

                        return (
                          <tr
                            key={payable.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            {/* Payable Ref */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Link
                                href={`/supplier-payments/${payable.id}`}
                                className="font-bold text-navy-950 font-mono hover:text-emerald-600 block transition-colors"
                              >
                                {payable.payableNumber}
                              </Link>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                                [{entity?.prefix || (entity as any)?.invoicePrefix || "SN"}] {entity?.name?.slice(0, 16)}
                              </span>
                            </td>

                            {/* Supplier Name */}
                            <td className="px-4 py-3 max-w-xs">
                              <span className="font-bold text-slate-900 block truncate">
                                {sup?.name || payable.supplierSnapshot?.name || "Supplier"}
                              </span>
                              {payable.supplierInvoiceNumber && (
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  Inv #{payable.supplierInvoiceNumber}
                                </span>
                              )}
                            </td>

                            {/* Schedule & Campaign */}
                            <td className="px-4 py-3 max-w-xs">
                              {sched ? (
                                <div>
                                  <Link
                                    href={`/schedules/${sched.id}`}
                                    className="font-semibold text-blue-700 hover:underline block truncate"
                                  >
                                    {sched.scheduleNumber}
                                  </Link>
                                  <span className="text-[11px] text-slate-500 block truncate">
                                    {payable.campaignName || sched.campaignName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Standalone</span>
                              )}
                            </td>

                            {/* Channel */}
                            <td className="px-4 py-3">
                              {payable.channelName ? (
                                <span className="inline-flex items-center space-x-1 font-semibold text-slate-800 uppercase">
                                  <Tv className="w-3.5 h-3.5 text-purple-600" />
                                  <span>{payable.channelName}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* Bill & Due Date */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-slate-700 font-medium block">
                                Due: {payable.dueDate}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                Bill: {payable.billDate}
                              </span>
                            </td>

                            {/* Total Amount */}
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                              Rs. {payable.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>

                            {/* Paid Amount */}
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                              Rs. {payable.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>

                            {/* Balance */}
                            <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                              Rs. {payable.outstandingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {getStatusBadge(payable)}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-1">
                                {/* Record Payment */}
                                {payable.outstandingAmount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setPaymentTargetPayable(payable)}
                                    className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="Record Payment"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Statement / PDF */}
                                <button
                                  type="button"
                                  onClick={() => setStatementPayable(payable)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Print Statement / Voucher"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>

                                {/* Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPayable(payable);
                                    setIsPayableModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Edit Bill"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayable(payable.id, payable.payableNumber || payable.payableReference || "Bill")}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Bill"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SUPPLIERS DIRECTORY */}
        {activeTab === "suppliers" && (
          <div className="space-y-4">
            {/* Search & Action bar */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={supplierSearchQuery}
                  onChange={(e) => setSupplierSearchQuery(e.target.value)}
                  placeholder="Search supplier by name, code, contact person, or channel..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingSupplier(null);
                  setIsSupplierModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Supplier Profile</span>
              </button>
            </div>

            {/* Suppliers Grid / List */}
            {filteredSuppliers.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-sm">No Suppliers Registered</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Add TV channels, radio broadcasters, and media houses to manage outgoing billing.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSupplier(null);
                    setIsSupplierModalOpen(true);
                  }}
                  className="mt-3 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  + Add First Supplier
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSuppliers.map((supplier) => {
                  // Calculate supplier totals
                  const supPayables = supplierPayables.filter((p) => p.supplierId === supplier.id);
                  const totalBilled = supPayables.reduce((sum, p) => sum + p.totalAmount, 0);
                  const totalPaid = supPayables.reduce((sum, p) => sum + p.totalPaid, 0);
                  const totalOutstanding = supPayables.reduce((sum, p) => sum + p.outstandingAmount, 0);

                  return (
                    <div
                      key={supplier.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                              {supplier.code || "SUP"}
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm leading-snug">
                              {supplier.name}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {supplier.type}
                          </span>
                        </div>

                        {/* Linked channels */}
                        {(supplier.channels || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {(supplier.channels || []).map((ch) => (
                              <span
                                key={ch}
                                className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-medium uppercase"
                              >
                                {ch}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Contact details */}
                        <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                          {supplier.contactPerson && (
                            <p>Contact: <span className="font-medium text-slate-800">{supplier.contactPerson}</span></p>
                          )}
                          {supplier.phone && <p>Phone: {supplier.phone}</p>}
                          {supplier.email && <p className="truncate">Email: {supplier.email}</p>}
                        </div>

                        {/* Bank info */}
                        {supplier.defaultBank && (
                          <div className="p-2 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-700 font-mono">
                            <span className="text-[9px] text-slate-400 uppercase block font-sans">
                              Bank Account
                            </span>
                            <span>{supplier.defaultBank}</span>
                            {supplier.defaultAccountNo && (
                              <span className="block font-bold">A/C: {supplier.defaultAccountNo}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Financial footprint */}
                      <div className="pt-2 border-t border-slate-100 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Total Billed:</span>
                          <span className="font-mono font-bold text-slate-900">
                            Rs. {totalBilled.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Outstanding:</span>
                          <span className="font-mono font-bold text-rose-700">
                            Rs. {totalOutstanding.toLocaleString()}
                          </span>
                        </div>

                        {/* Card actions */}
                        <div className="pt-3 flex items-center justify-between border-t border-slate-100 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPayable(null);
                              setIsPayableModalOpen(true);
                            }}
                            className="text-[11px] font-bold text-emerald-700 hover:underline"
                          >
                            + Record Bill
                          </button>

                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSupplier(supplier);
                                setIsSupplierModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                              title="Edit Supplier"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                              title="Delete Supplier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* Supplier Payable Modal */}
      {isPayableModalOpen && (
        <SupplierPayableModal
          payable={editingPayable}
          isOpen={isPayableModalOpen}
          onClose={() => {
            setIsPayableModalOpen(false);
            setEditingPayable(null);
          }}
        />
      )}

      {/* Supplier Profile Modal */}
      {isSupplierModalOpen && (
        <SupplierModal
          supplier={editingSupplier}
          isOpen={isSupplierModalOpen}
          onClose={() => {
            setIsSupplierModalOpen(false);
            setEditingSupplier(null);
          }}
        />
      )}

      {/* Record Payment Modal */}
      {paymentTargetPayable && (
        <RecordPaymentModal
          payable={paymentTargetPayable}
          isOpen={Boolean(paymentTargetPayable)}
          onClose={() => setPaymentTargetPayable(null)}
        />
      )}

      {/* Statement / Voucher Modal */}
      {statementPayable && (
        <SupplierStatementModal
          payable={statementPayable}
          onClose={() => setStatementPayable(null)}
        />
      )}
    </AppLayout>
  );
}
