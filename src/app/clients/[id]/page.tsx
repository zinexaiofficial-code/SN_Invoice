"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Client, Invoice, BillingEntity } from "@/types";
import { useDatabase } from "@/context/DatabaseContext";
import { storage } from "@/lib/storage";
import { formatLKR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientModal } from "@/components/clients/ClientModal";
import {
  ArrowLeft,
  Building,
  Calendar,
  DollarSign,
  FileText,
  PlusCircle,
  Edit2,
  Printer,
  ChevronRight,
  TrendingUp,
  Download
} from "lucide-react";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { clients, invoices: dbInvoices, billingEntities, isLoading, refresh } = useDatabase();

  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const client = clients.find((c) => c.id === clientId) || storage.getClientById(clientId) || null;
  const invoices = (client ? dbInvoices.filter((i) => i.clientId === client.id) : []);
  const billingEntity = (client && client.defaultBillingEntityId)
    ? billingEntities.find((e) => e.id === client.defaultBillingEntityId) || null
    : null;

  if (isLoading && !client) {
    return (
      <AppLayout>
        <div className="text-center py-20 space-y-3">
          <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-semibold">Loading client details...</p>
        </div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="text-center py-20 space-y-4">
          <Building className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-navy-950">Client not found</h2>
          <Button onClick={() => router.push("/clients")}>Back to Clients</Button>
        </div>
      </AppLayout>
    );
  }

  // Financial aggregates
  const validInvoices = invoices.filter((i) => i.status !== "void");
  const totalInvoiced = validInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalPaid = validInvoices.reduce((sum, i) => sum + i.totalPaid, 0);
  const outstandingBalance = validInvoices.reduce((sum, i) => sum + i.outstandingBalance, 0);
  const lastInvoice = validInvoices.length > 0
    ? [...validInvoices].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))[0]
    : null;

  // Month-wise aggregation (Section 5 requirement)
  // Generates summary for current year months (e.g. August 2026, September 2026, October 2026)
  const months = [
    { label: "August 2026", year: 2026, month: 8, key: "2026-08" },
    { label: "September 2026", year: 2026, month: 9, key: "2026-09" },
    { label: "October 2026", year: 2026, month: 10, key: "2026-10" },
    { label: "November 2026", year: 2026, month: 11, key: "2026-11" },
  ];

  const monthSummary = months.map((m) => {
    const monthInvoices = validInvoices.filter((inv) => {
      const d = new Date(inv.invoiceDate);
      return d.getFullYear() === m.year && d.getMonth() + 1 === m.month;
    });
    const amount = monthInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    return {
      ...m,
      count: monthInvoices.length,
      amount,
    };
  });

  // Displayed invoices: filtered by selected month if clicked, or all invoices
  const displayedInvoices = selectedMonthKey
    ? validInvoices.filter((inv) => {
        const d = new Date(inv.invoiceDate);
        const [y, m] = selectedMonthKey.split("-").map(Number);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      })
    : validInvoices;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <Link
              href="/clients"
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-black text-navy-950 tracking-tight uppercase">
                  {client.name}
                </h1>
                <Badge variant="secondary" className="font-mono font-bold text-xs">
                  {client.code}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{client.address}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center space-x-1.5"
            >
              <Edit2 className="w-4 h-4 text-slate-600" />
              <span>Edit Client</span>
            </Button>
            <Link
              href="/invoices/new"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Invoice for This Client</span>
            </Link>
          </div>
        </div>

        {/* Client KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 bg-white">
            <span className="text-xs text-slate-500 block">Total Invoices</span>
            <span className="text-2xl font-black font-mono text-navy-950 mt-1 block">
              {validInvoices.length}
            </span>
            <span className="text-[11px] text-slate-400">Generated</span>
          </Card>

          <Card className="p-4 bg-white">
            <span className="text-xs text-slate-500 block">Total Invoiced</span>
            <span className="text-2xl font-black font-mono text-navy-950 mt-1 block">
              {formatLKR(totalInvoiced)}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Lifetime revenue</span>
          </Card>

          <Card className="p-4 bg-white">
            <span className="text-xs text-slate-500 block">Total Paid</span>
            <span className="text-2xl font-black font-mono text-emerald-600 mt-1 block">
              {formatLKR(totalPaid)}
            </span>
            <span className="text-[11px] text-slate-400">Received payments</span>
          </Card>

          <Card className="p-4 bg-white">
            <span className="text-xs text-slate-500 block">Outstanding Balance</span>
            <span className="text-2xl font-black font-mono text-rose-600 mt-1 block">
              {formatLKR(outstandingBalance)}
            </span>
            <span className="text-[11px] text-rose-500 font-medium">To be collected</span>
          </Card>

          <Card className="p-4 bg-white">
            <span className="text-xs text-slate-500 block">Last Invoice Date</span>
            <span className="text-lg font-bold font-mono text-slate-800 mt-1 block">
              {lastInvoice ? formatDate(lastInvoice.invoiceDate) : "None"}
            </span>
            <span className="text-[11px] text-slate-400">
              {lastInvoice ? `#${lastInvoice.invoiceNumber}` : "-"}
            </span>
          </Card>
        </div>

        {/* Client Meta Info Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 mb-2">Contact Details</CardTitle>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div><strong>Person:</strong> {client.contactPerson || "Not provided"}</div>
              <div><strong>Mobile:</strong> {client.mobile || "Not provided"}</div>
              <div><strong>WhatsApp:</strong> {client.whatsapp || "Not provided"}</div>
              <div><strong>Email:</strong> {client.email || "Not provided"}</div>
            </div>
          </Card>

          <Card className="p-4">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 mb-2">Tax &amp; Legal Info</CardTitle>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div><strong>VAT Reg No:</strong> {client.vatNumber || "Not VAT registered"}</div>
              <div><strong>BRN:</strong> {client.brn || "Not provided"}</div>
              <div><strong>Charge VAT Default:</strong> {client.defaultVatPreference ? "Yes (18%)" : "No"}</div>
            </div>
          </Card>

          <Card className="p-4">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 mb-2">Default Billing Settings</CardTitle>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div><strong>Entity:</strong> {billingEntity?.name || "SN Advertising"}</div>
              <div><strong>Payment Terms:</strong> {client.defaultPaymentTerms || "Immediate"}</div>
              {client.defaultAdvancePercentage ? (
                <div><strong>Advance %:</strong> {client.defaultAdvancePercentage}%</div>
              ) : null}
              {client.defaultNote ? (
                <div><strong>Default Note:</strong> {client.defaultNote}</div>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Month-Wise Invoice Summary (Section 5 Core Example) */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-100">
            <div>
              <CardTitle className="text-base text-navy-950">Month-Wise Invoice Summary</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any month to filter this client's invoices generated in that period.
              </p>
            </div>
            {selectedMonthKey && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMonthKey(null)}
                className="text-xs"
              >
                Clear Month Filter (Show All)
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {monthSummary.map((m) => {
                const isSelected = selectedMonthKey === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMonthKey(isSelected ? null : m.key)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-navy-900 bg-navy-900 text-white shadow-md"
                        : "border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className={`text-xs font-bold block ${isSelected ? "text-slate-200" : "text-slate-600"}`}>
                      {m.label}
                    </span>
                    <span className={`text-lg font-black font-mono block mt-0.5 ${isSelected ? "text-white" : "text-navy-950"}`}>
                      {m.count} {m.count === 1 ? "invoice" : "invoices"}
                    </span>
                    <span className={`text-xs font-mono font-medium block mt-1 ${isSelected ? "text-emerald-300" : "text-emerald-700"}`}>
                      {formatLKR(m.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Invoices List Table for this Client */}
        <Card>
          <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-navy-950">
                {selectedMonthKey ? `Invoices for ${selectedMonthKey}` : "All Invoices for This Client"}
              </span>
              <Badge variant="secondary" className="font-mono text-xs">
                {displayedInvoices.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-4">Service Description</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-3 text-center">Sent Status</th>
                    <th className="py-3 px-3 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedInvoices.map((inv) => (
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

                      <td className="py-3 px-3 font-mono text-xs text-slate-600">
                        {formatDate(inv.invoiceDate)}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-700 max-w-xs">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {inv.items?.[0]?.serviceName}
                        </div>
                        <div className="text-slate-500 line-clamp-1">
                          {inv.items?.[0]?.description} {inv.servicePeriodText && `(${inv.servicePeriodText})`}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-navy-950">
                        {formatLKR(inv.grandTotal)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant={inv.sentStatus === "delivery_confirmed" ? "success" : inv.sentStatus === "sent" ? "info" : "secondary"}
                          className="text-[10px] capitalize whitespace-nowrap"
                        >
                          {inv.sentStatus.replace("_", " ")}
                        </Badge>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant={inv.paymentStatus === "paid" ? "success" : inv.paymentStatus === "partially_paid" ? "warning" : "destructive"}
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
                            title="View Details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/invoices/${inv.id}/pdf`}
                            target="_blank"
                            className="p-1.5 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded"
                            title="Print / PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayedInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                        No invoices found for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ClientModal
        client={client}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaved={() => refresh()}
      />
    </AppLayout>
  );
}

