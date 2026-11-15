"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Invoice, BillingEntity } from "@/types";
import { useDatabase } from "@/context/DatabaseContext";
import { storage } from "@/lib/storage";
import { formatLKR, formatDate, cn } from "@/lib/utils";
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
  PlusCircle,
  Search,
  Printer,
  Share2,
  DollarSign,
  Eye,
  FileText,
  Filter,
  Building2,
  Edit,
  RefreshCw,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Zap,
  Loader2
} from "lucide-react";

export default function InvoicesListPage() {
  const { invoices, billingEntities, isLoading, error, refresh, isSuperAdmin, deleteInvoice, deleteInvoicesBatch } = useDatabase();
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeShareInvoice, setActiveShareInvoice] = useState<Invoice | null>(null);
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<Invoice | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredInvoices = invoices.filter((inv) => {
    if (selectedEntityId && inv.billingEntityId !== selectedEntityId) return false;
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesNo = inv.invoiceNumber.toLowerCase().includes(q);
      const matchesClient = (inv.clientSnapshot?.name || "").toLowerCase().includes(q);
      const matchesItem = inv.items?.some((i) => i.description.toLowerCase().includes(q));
      const matchesRef = (inv.regNo || "").toLowerCase().includes(q);
      if (!matchesNo && !matchesClient && !matchesItem && !matchesRef) return false;
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map((i) => i.id));
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-navy-950 tracking-tight">Invoices</h1>
            <p className="text-sm text-slate-500">
              Manage, track, and generate professional invoices for SN Advertising.
            </p>
          </div>
          <Link
            href="/invoices/new"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl flex items-center space-x-2 shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Invoice</span>
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice #, client, ref..."
                className="pl-9 h-10 text-xs sm:text-sm"
              />
            </div>

            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-navy-950"
            >
              <option value="">🏢 All Entities</option>
              {billingEntities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  [{ent.prefix}] {ent.displayName || ent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["all", "issued", "draft", "paid", "void"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-navy-950 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Super Admin Batch Actions Bar */}
        {isSuperAdmin && (
          <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-700 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4 text-rose-600" />
              </span>
              <div>
                <p className="font-bold text-rose-950">Super Admin Deletion Controls</p>
                <p className="text-rose-700 text-[11px]">
                  {selectedIds.length > 0
                    ? `${selectedIds.length} invoice(s) selected for permanent deletion`
                    : "Select rows using checkboxes for multi-invoice batch delete, or use row trash icons for option-wise delete."}
                </p>
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  className="h-8 text-xs text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
                >
                  Clear Selection
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
              </div>
            )}
          </div>
        )}

        {/* Invoices Table */}
        <Card>
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
                          title={selectedIds.length === filteredInvoices.length ? "Deselect All" : "Select All"}
                        >
                          {selectedIds.length > 0 && selectedIds.length === filteredInvoices.length ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-4 text-right">Total (LKR)</th>
                    <th className="py-3 px-3 text-center">Sent Status</th>
                    <th className="py-3 px-3 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => {
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
                          <td className="py-3.5 px-3 text-center">
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
                        <td className="py-3.5 px-4 font-mono font-bold text-navy-950">
                          <Link href={`/invoices/${inv.id}`} className="hover:underline">
                            #{inv.invoiceNumber}
                          </Link>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-navy-950 font-mono border border-slate-200">
                              {billingEntities.find(e => e.id === inv.billingEntityId)?.prefix || inv.billingSnapshot?.prefix || (inv as any).billingEntitySnapshot?.prefix || "SN"}
                            </span>
                            {inv.regNo && (
                              <span className="text-[11px] font-normal text-slate-400 font-mono">
                                {inv.regNo}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 line-clamp-1">
                            {inv.clientSnapshot?.name}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1">
                            {inv.items?.[0]?.description || inv.items?.[0]?.serviceName}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {formatDate(inv.invoiceDate)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-navy-950">
                          <div>{formatLKR(inv.grandTotal)}</div>
                          {inv.outstandingBalance > 0 && inv.totalPaid > 0 && (
                            <div className="text-[11px] text-rose-600 font-medium">
                              Bal: {formatLKR(inv.outstandingBalance)}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
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

                        <td className="py-3.5 px-3 text-center">
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

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <Link
                              href={`/invoices/${inv.id}/edit`}
                              className="p-1.5 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded"
                              title="Edit Invoice"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/invoices/${inv.id}`}
                              className="p-1.5 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded"
                              title="View Details"
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
                              title="Share Invoice"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            {inv.paymentStatus !== "paid" && inv.status !== "void" && (
                              <button
                                onClick={() => setActivePaymentInvoice(inv)}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                title="Record Payment"
                              >
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                onClick={() => setInvoiceToDelete(inv)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                title="Permanently Delete Invoice (Super Admin)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={isSuperAdmin ? 8 : 7} className="text-center py-12 text-slate-400 text-sm">
                        No invoices found matching your filters.
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
          onShared={() => refresh()}
        />
      )}

      {/* Payment Modal */}
      {activePaymentInvoice && (
        <RecordPaymentModal
          invoice={activePaymentInvoice}
          isOpen={Boolean(activePaymentInvoice)}
          onClose={() => setActivePaymentInvoice(null)}
          onPaymentRecorded={() => refresh()}
        />
      )}

      {/* Super Admin Single Invoice Delete Confirmation Modal */}
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
              You are about to permanently delete this invoice for <strong className="text-navy-950">{invoiceToDelete?.clientSnapshot?.name}</strong> totaling <strong className="text-navy-950">{formatLKR(invoiceToDelete?.grandTotal || 0)}</strong>.
            </p>
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg">
              <p className="font-semibold">⚠️ Super Admin Warning:</p>
              <p className="text-[11px] mt-0.5">This action will remove the invoice record, line items, and audit entries from the PostgreSQL production database. This cannot be undone.</p>
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

      {/* Super Admin Batch Invoices Delete Confirmation Modal */}
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
              You have selected <strong className="text-rose-600 font-bold">{selectedIds.length}</strong> invoice(s) for bulk permanent removal.
            </p>
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg">
              <p className="font-semibold">⚠️ Super Admin Warning:</p>
              <p className="text-[11px] mt-0.5">All {selectedIds.length} invoices and their associated line items will be purged atomically from PostgreSQL. This cannot be reversed.</p>
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
    </AppLayout>
  );
}

