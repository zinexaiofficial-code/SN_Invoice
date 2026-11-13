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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareInvoiceModal } from "@/components/invoices/ShareInvoiceModal";
import { RecordPaymentModal } from "@/components/invoices/RecordPaymentModal";
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
  PlusCircle
} from "lucide-react";

export default function MonthlyHistoryPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [billingEntities, setBillingEntities] = useState<BillingEntity[]>([]);

  // Filter states
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(2026); // Default 2026 as per samples
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // September 2026 (Chamara sample)
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedBillingEntityId, setSelectedBillingEntityId] = useState<string>("");
  const [dateMode, setDateMode] = useState<ReportingDateMode>("issued");
  const [sentStatusFilter, setSentStatusFilter] = useState<string>("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeShareInvoice, setActiveShareInvoice] = useState<Invoice | null>(null);
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    setClients(storage.getClients());
    setBillingEntities(storage.getBillingEntities());
    refreshInvoices();
  }, [
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

        {/* Monthly Summary KPI Bar (Section 10 Requirement) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3 bg-white border-slate-200">
            <span className="text-[11px] text-slate-500 block font-medium">Invoices Issued</span>
            <span className="text-xl font-black font-mono text-navy-950 mt-0.5 block">{invoices.length}</span>
            <span className="text-[10px] text-slate-400">In {monthNames[selectedMonth - 1]} {selectedYear}</span>
          </Card>

          <Card className="p-3 bg-white border-slate-200">
            <span className="text-[11px] text-slate-500 block font-medium">Invoices Sent</span>
            <span className="text-xl font-black font-mono text-blue-600 mt-0.5 block">{invoicesSentCount}</span>
            <span className="text-[10px] text-slate-400">{invoices.length - invoicesSentCount} not sent</span>
          </Card>

          <Card className="p-3 bg-white border-slate-200">
            <span className="text-[11px] text-slate-500 block font-medium">Total Invoiced</span>
            <span className="text-xl font-black font-mono text-navy-950 mt-0.5 block">{formatLKR(totalInvoiced)}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Gross revenue</span>
          </Card>

          <Card className="p-3 bg-white border-slate-200">
            <span className="text-[11px] text-slate-500 block font-medium">Total Paid</span>
            <span className="text-xl font-black font-mono text-emerald-600 mt-0.5 block">{formatLKR(totalPaid)}</span>
            <span className="text-[10px] text-slate-400">Collected</span>
          </Card>

          <Card className="p-3 bg-white border-slate-200">
            <span className="text-[11px] text-slate-500 block font-medium">Total Outstanding</span>
            <span className="text-xl font-black font-mono text-rose-600 mt-0.5 block">{formatLKR(totalOutstanding)}</span>
            <span className="text-[10px] text-rose-500 font-medium">Receivables</span>
          </Card>

          <Card className="p-3 bg-white border-slate-200">
            <span className="text-[11px] text-slate-500 block font-medium">Active Clients Billed</span>
            <span className="text-xl font-black font-mono text-purple-600 mt-0.5 block">{uniqueClientsBilled}</span>
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
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
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
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
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
                        </div>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400 text-sm">
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
    </AppLayout>
  );
}

