"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Invoice, BillingEntity } from "@/types";
import { useDatabase } from "@/context/DatabaseContext";
import { storage } from "@/lib/storage";
import { formatLKR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareInvoiceModal } from "@/components/invoices/ShareInvoiceModal";
import { RecordPaymentModal } from "@/components/invoices/RecordPaymentModal";
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
  RefreshCw
} from "lucide-react";

export default function InvoicesListPage() {
  const { invoices, billingEntities, isLoading, error, refresh } = useDatabase();
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeShareInvoice, setActiveShareInvoice] = useState<Invoice | null>(null);
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<Invoice | null>(null);

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

        {/* Invoices Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
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
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-navy-950">
                        <Link href={`/invoices/${inv.id}`} className="hover:underline">
                          #{inv.invoiceNumber}
                        </Link>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-navy-950 font-mono border border-slate-200">
                            {inv.billingSnapshot?.prefix || "SN"}
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
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
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
          onShared={() => setInvoices(storage.getInvoices())}
        />
      )}

      {/* Payment Modal */}
      {activePaymentInvoice && (
        <RecordPaymentModal
          invoice={activePaymentInvoice}
          isOpen={Boolean(activePaymentInvoice)}
          onClose={() => setActivePaymentInvoice(null)}
          onPaymentRecorded={() => setInvoices(storage.getInvoices())}
        />
      )}
    </AppLayout>
  );
}

