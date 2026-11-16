"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  Invoice, 
  Client, 
  BillingEntity, 
  ReportingDateMode 
} from "@/types";
import { storage } from "@/lib/storage";
import { formatLKR, formatDate } from "@/lib/utils";
import { KpiCurrencyValue } from "@/components/ui/KpiValue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareInvoiceModal } from "@/components/invoices/ShareInvoiceModal";
import { RecordPaymentModal } from "@/components/invoices/RecordPaymentModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Search,
  Filter,
  Eye,
  Printer,
  Share2,
  Copy,
  Users,
  FileCheck,
  DollarSign,
  TrendingUp,
  Download,
  PlusCircle,
  Trash2,
  AlertTriangle,
  Zap,
  CheckSquare,
  Square,
  Loader2
} from "lucide-react";

import { useDatabase } from "@/context/DatabaseContext";
import { cn } from "@/lib/utils";

export default function MonthlyHistoryPage() {
  const { clients, billingEntities, invoices: allInvoices, isLoading, isSuperAdmin, deleteInvoice, deleteInvoicesBatch } = useDatabase();

  // Filter states
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(() => now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => now.getMonth() + 1);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedBillingEntityId, setSelectedBillingEntityId] = useState<string>("");
  const [dateMode, setDateMode] = useState<ReportingDateMode>("issued");
  const [sentStatusFilter, setSentStatusFilter] = useState<string>("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeShareInvoice, setActiveShareInvoice] = useState<Invoice | null>(null);
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<Invoice | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.length === invoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map((i) => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSingle = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInvoice(invoiceToDelete.id);
      setSelectedIds((prev) => prev.filter((id) => id !== invoiceToDelete.id));
      setInvoiceToDelete(null);
    } catch (err: any) {
      alert("Failed to delete invoice: " + (err.message || "Unknown error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      await deleteInvoicesBatch(selectedIds);
      setSelectedIds([]);
      setIsBatchDeleteModalOpen(false);
    } catch (err: any) {
      alert("Failed to delete selected invoices: " + (err.message || "Unknown error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePurgeMonth = async () => {
    if (invoices.length === 0) return;
    setIsDeleting(true);
    try {
      const allIdsInMonth = invoices.map((i) => i.id);
      await deleteInvoicesBatch(allIdsInMonth);
      setSelectedIds([]);
      setIsPurgeModalOpen(false);
      setPurgeConfirmText("");
    } catch (err: any) {
      alert("Failed to purge month invoices: " + (err.message || "Unknown error"));
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    refreshInvoices();
  }, [
    allInvoices,
    selectedYear,
    selectedMonth,
    selectedClientId,
    selectedBillingEntityId,
    dateMode,
    sentStatusFilter,
    paymentStatusFilter,
    searchQuery
  ]);

  const refreshInvoices = () => {
    const filtered = storage.getFilteredInvoices({
      year: selectedYear,
      month: selectedMonth,
      clientId: selectedClientId || undefined,
      billingEntityId: selectedBillingEntityId || undefined,
      dateMode,
      sentStatus: (sentStatusFilter as any) || undefined,
      paymentStatus: (paymentStatusFilter as any) || undefined,
      searchQuery: searchQuery || undefined
    });
    setInvoices(filtered);
  };

  const handleDuplicate = (invoiceId: string) => {
    try {
      const duplicated = storage.duplicateInvoice(invoiceId);
      refreshInvoices();
      alert(`Duplicated invoice created: #${duplicated.invoiceNumber}`);
    } catch (e: any) {
      alert("Failed to duplicate invoice: " + e.message);
    }
  };

  // Summary Metrics for currently filtered month
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.status !== 'void' ? inv.grandTotal : 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.totalPaid, 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.outstandingBalance, 0);
  const invoicesSentCount = invoices.filter((inv) => inv.sentStatus !== 'not_sent').length;
  const uniqueClientsBilled = new Set(invoices.map((inv) => inv.clientId)).size;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-6 h-6 text-emerald-600" />
              <h1 className="text-2xl font-black text-navy-950 tracking-tight">Monthly Invoice History</h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Track invoices generated, sent, or serviced in specific months for any client.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/reports"
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <span>Full Analytics Reports</span>
            </Link>
            <Link
              href="/invoices/new"
              className="bg-navy-950 hover:bg-navy-900 text-white font-semibold py-2 px-3.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Invoice</span>
            </Link>
          </div>
        </div>

        {/* Date Mode Selector Tabs (Section 10 Important Date Handling) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setDateMode("issued")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateMode === "issued" ? "bg-white text-navy-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              1. Issued in Month
            </button>
            <button
              onClick={() => setDateMode("sent")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateMode === "sent" ? "bg-white text-navy-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              2. Sent in Month
            </button>
            <button
              onClick={() => setDateMode("service_period")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateMode === "service_period" ? "bg-white text-navy-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              3. Services for Month
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Year selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-navy-950"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2027}>2027</option>
            </select>

            {/* Month selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-navy-950"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>

            {/* Client Filter */}
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 max-w-xs"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Billing Entity Filter */}
            <select
              value={selectedBillingEntityId}
              onChange={(e) => setSelectedBillingEntityId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
            >
              <option value="">🏢 All Entities</option>
              {billingEntities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  [{ent.prefix}] {ent.displayName || ent.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Monthly Summary KPI Bar (Responsive Grid to Prevent Value Clipping) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-3.5">
          <Card className="p-3.5 bg-white border-slate-200 min-w-0 flex flex-col justify-between shadow-xs">
            <span className="text-[11px] text-slate-500 block font-medium">Invoices Issued</span>
            <div className="my-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-navy-950 block">{invoices.length}</span>
            </div>
            <span className="text-[10px] text-slate-400">In {monthNames[selectedMonth - 1]} {selectedYear}</span>
          </Card>

          <Card className="p-3.5 bg-white border-slate-200 min-w-0 flex flex-col justify-between shadow-xs">
            <span className="text-[11px] text-slate-500 block font-medium">Invoices Sent</span>
            <div className="my-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-blue-600 block">{invoicesSentCount}</span>
            </div>
            <span className="text-[10px] text-slate-400">{invoices.length - invoicesSentCount} not sent</span>
          </Card>

          <Card className="p-3.5 bg-white border-slate-200 border-l-4 border-l-navy-950 min-w-0 flex flex-col justify-between shadow-xs">
            <span className="text-[11px] text-slate-500 block font-medium">Total Invoiced</span>
            <div className="my-1">
              <KpiCurrencyValue amount={totalInvoiced} colorClass="text-navy-950" size="lg" />
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Gross revenue</span>
          </Card>

          <Card className="p-3.5 bg-white border-slate-200 border-l-4 border-l-emerald-500 min-w-0 flex flex-col justify-between shadow-xs">
            <span className="text-[11px] text-slate-500 block font-medium">Total Paid</span>
            <div className="my-1">
              <KpiCurrencyValue amount={totalPaid} colorClass="text-emerald-600" size="lg" />
            </div>
            <span className="text-[10px] text-slate-400">Collected</span>
          </Card>

          <Card className="p-3.5 bg-white border-slate-200 border-l-4 border-l-rose-500 min-w-0 flex flex-col justify-between shadow-xs">
            <span className="text-[11px] text-slate-500 block font-medium">Total Outstanding</span>
            <div className="my-1">
              <KpiCurrencyValue amount={totalOutstanding} colorClass="text-rose-600" size="lg" />
            </div>
            <span className="text-[10px] text-rose-500 font-medium">Receivables</span>
          </Card>

          <Card className="p-3.5 bg-white border-slate-200 min-w-0 flex flex-col justify-between shadow-xs">
            <span className="text-[11px] text-slate-500 block font-medium">Active Clients Billed</span>
            <div className="my-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-purple-600 block">{uniqueClientsBilled}</span>
            </div>
            <span className="text-[10px] text-slate-400">Unique advertisers</span>
          </Card>
        </div>

        {/* History Table (Section 10 Columns) */}
        <Card>
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-navy-950">
                Invoices for {monthNames[selectedMonth - 1]} {selectedYear}
              </span>
              <Badge variant="secondary" className="font-mono text-xs">
                {invoices.length} Found
              </Badge>
            </div>

            <div className="w-64">
              <Input
                placeholder="Search description, number, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </CardHeader>

          {/* Super Admin Month History Purge & Batch Controls */}
          {isSuperAdmin && (
            <div className="bg-rose-50/95 border-b border-rose-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-700 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4 text-rose-600" />
                </span>
                <div>
                  <p className="font-bold text-rose-950">Super Admin Monthly History Deletion Controls</p>
                  <p className="text-rose-700 text-[11px]">
                    Delete invoices option-wise per row, select items for batch deletion, or perform a total month purge.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedIds.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedIds([])}
                      className="h-8 text-xs text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
                    >
                      Clear Selection ({selectedIds.length})
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsBatchDeleteModalOpen(true)}
                      className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center space-x-1.5 shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedIds.length})</span>
                    </Button>
                  </>
                )}

                {invoices.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setPurgeConfirmText("");
                      setIsPurgeModalOpen(true);
                    }}
                    className="h-8 text-xs bg-rose-700 hover:bg-rose-800 text-white font-bold flex items-center space-x-1.5 shadow-xs ring-1 ring-rose-400"
                    title={`Totally purge all ${invoices.length} invoices for ${monthNames[selectedMonth - 1]} ${selectedYear}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge Month Invoices ({invoices.length})</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {isSuperAdmin && (
                      <th className="py-3 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-slate-600 hover:text-navy-950 p-1"
                          title={selectedIds.length === invoices.length ? "Deselect All" : "Select All"}
                        >
                          {selectedIds.length > 0 && selectedIds.length === invoices.length ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Amount (LKR)</th>
                    <th className="py-3 px-3">Sent Date</th>
                    <th className="py-3 px-3 text-center">Sent Status</th>
                    <th className="py-3 px-3 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const isSelected = selectedIds.includes(inv.id);
                    return (
                      <tr
                        key={inv.id}
                        className={cn(
                          "transition-colors",
                          isSelected ? "bg-rose-50/40 hover:bg-rose-50/60" : "hover:bg-slate-50/80"
                        )}
                      >
                        {isSuperAdmin && (
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectOne(inv.id)}
                              className="text-slate-600 hover:text-navy-950 p-1"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-rose-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>
                        )}
                        <td className="py-3 px-4 font-mono font-bold text-navy-950">
                          <Link href={`/invoices/${inv.id}`} className="hover:underline">
                            #{inv.invoiceNumber}
                          </Link>
                          {inv.regNo && (
                            <span className="block text-[11px] font-normal text-slate-400 font-mono">
                              {inv.regNo}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {formatDate(inv.invoiceDate)}
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-900">
                          <Link href={`/clients/${inv.clientId}`} className="hover:underline text-navy-950 font-semibold block line-clamp-1">
                            {inv.clientSnapshot?.name}
                          </Link>
                          <span className="text-[11px] text-slate-400 font-mono">{inv.clientSnapshot?.code}</span>
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                          <div className="font-semibold text-slate-800 line-clamp-1">
                            {inv.items?.[0]?.serviceName}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {inv.items?.[0]?.description} {inv.servicePeriodText && `(${inv.servicePeriodText})`}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-navy-950">
                          <div>{formatLKR(inv.grandTotal)}</div>
                          {inv.vatApplicable && (
                            <div className="text-[10px] text-slate-400 font-normal">incl. 18% VAT</div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-600 font-mono whitespace-nowrap">
                          {inv.sentAt ? formatDate(inv.sentAt) : "-"}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant={
                              inv.sentStatus === "delivery_confirmed"
                                ? "success"
                                : inv.sentStatus === "sent"
                                ? "info"
                                : "secondary"
                            }
                            className="text-[10px] capitalize whitespace-nowrap"
                          >
                            {inv.sentStatus.replace("_", " ")}
                          </Badge>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant={
                              inv.paymentStatus === "paid"
                                ? "success"
                                : inv.paymentStatus === "partially_paid"
                                ? "warning"
                                : inv.paymentStatus === "voided"
                                ? "destructive"
                                : "destructive"
                            }
                            className="text-[10px] capitalize whitespace-nowrap"
                          >
                            {inv.paymentStatus.replace("_", " ")}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <Link
                              href={`/invoices/${inv.id}`}
                              className="p-1.5 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/invoices/${inv.id}/pdf`}
                              target="_blank"
                              className="p-1.5 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded"
                              title="Print / PDF"
                            >
                              <Printer className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => setActiveShareInvoice(inv)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Share"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(inv.id)}
                              className="p-1.5 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/clients/${inv.clientId}`}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                              title="Client History"
                            >
                              <Users className="w-4 h-4" />
                            </Link>
                            {isSuperAdmin && (
                              <button
                                onClick={() => setInvoiceToDelete(inv)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                title="Delete Invoice from History (Super Admin)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={isSuperAdmin ? 10 : 9} className="text-center py-12 text-slate-400 text-sm">
                        No invoices found for {monthNames[selectedMonth - 1]} {selectedYear}. Try changing the month, client or date mode above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Share Modal */}
      {activeShareInvoice && (
        <ShareInvoiceModal
          invoice={activeShareInvoice}
          isOpen={Boolean(activeShareInvoice)}
          onClose={() => setActiveShareInvoice(null)}
          onShared={() => refreshInvoices()}
        />
      )}

      {/* Payment Modal */}
      {activePaymentInvoice && (
        <RecordPaymentModal
          invoice={activePaymentInvoice}
          isOpen={Boolean(activePaymentInvoice)}
          onClose={() => setActivePaymentInvoice(null)}
          onPaymentRecorded={() => refreshInvoices()}
        />
      )}

      {/* Super Admin Single Invoice Delete Modal */}
      <Dialog open={Boolean(invoiceToDelete)} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-black text-navy-950">
              Permanently Delete Invoice #{invoiceToDelete?.invoiceNumber}?
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-slate-600 space-y-2 py-2">
            <p>
              Remove this invoice for <strong className="text-navy-950">{invoiceToDelete?.clientSnapshot?.name}</strong> totaling <strong className="text-navy-950">{formatLKR(invoiceToDelete?.grandTotal || 0)}</strong> from {monthNames[selectedMonth - 1]} {selectedYear}?
            </p>
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg">
              <p className="font-semibold">⚠️ Super Admin Warning:</p>
              <p className="text-[11px] mt-0.5">This will delete the invoice and line items from PostgreSQL production database. This cannot be undone.</p>
            </div>
          </div>
          <DialogFooter className="mt-4 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setInvoiceToDelete(null)}
              className="text-slate-600"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleDeleteSingle}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center space-x-1"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Delete Permanently</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Super Admin Batch Invoices Delete Modal */}
      <Dialog open={isBatchDeleteModalOpen} onOpenChange={(open) => !open && setIsBatchDeleteModalOpen(false)}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-black text-navy-950">
              Batch Delete {selectedIds.length} Selected Invoices?
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-slate-600 space-y-2 py-2">
            <p>
              You are about to permanently delete <strong className="text-rose-600 font-bold">{selectedIds.length}</strong> selected invoice(s) from {monthNames[selectedMonth - 1]} {selectedYear}.
            </p>
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg">
              <p className="font-semibold">⚠️ Super Admin Warning:</p>
              <p className="text-[11px] mt-0.5">All selected invoices and line items will be purged atomically from PostgreSQL. This cannot be reversed.</p>
            </div>
          </div>
          <DialogFooter className="mt-4 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setIsBatchDeleteModalOpen(false)}
              className="text-slate-600"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleDeleteBatch}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center space-x-1"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Delete All {selectedIds.length} Invoices</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Super Admin TOTAL MONTH PURGE Modal */}
      <Dialog open={isPurgeModalOpen} onOpenChange={(open) => !open && setIsPurgeModalOpen(false)}>
        <DialogContent className="max-w-lg p-6 rounded-2xl border-rose-300">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2 ring-4 ring-rose-50">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <DialogTitle className="text-xl font-black text-rose-950 tracking-tight">
              Totally Purge All Invoices for {monthNames[selectedMonth - 1]} {selectedYear}?
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-slate-700 space-y-3 py-2">
            <p className="leading-relaxed">
              This total purge operation will permanently remove all <strong className="text-navy-950 font-bold">{invoices.length} invoices</strong> generated for <strong className="text-navy-950">{monthNames[selectedMonth - 1]} {selectedYear}</strong> totaling <strong className="text-rose-600 font-bold">{formatLKR(totalInvoiced)}</strong>.
            </p>

            <div className="bg-rose-950 text-white p-3 rounded-xl space-y-1">
              <p className="font-bold text-rose-300 flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>EXTREME CAUTION — IRREVERSIBLE OPERATION</span>
              </p>
              <p className="text-[11px] text-slate-300">
                All monthly invoice entries, line items, and audit trails for this billing month will be wiped from PostgreSQL.
              </p>
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Type <span className="font-mono text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">DELETE</span> to confirm purge:
              </label>
              <Input
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="font-mono text-xs uppercase"
              />
            </div>
          </div>
          <DialogFooter className="mt-4 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setIsPurgeModalOpen(false)}
              className="text-slate-600"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting || purgeConfirmText.trim().toUpperCase() !== "DELETE"}
              onClick={handlePurgeMonth}
              className="bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold flex items-center space-x-1"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Purge Entire Month History</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

