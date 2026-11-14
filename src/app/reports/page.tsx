"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { AppLayout } from "@/components/layout/AppLayout";
import { Invoice, Client, BillingEntity } from "@/types";
import { storage } from "@/lib/storage";
import { formatLKR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  Send,
  FileSpreadsheet
} from "lucide-react";

import { useDatabase } from "@/context/DatabaseContext";

export default function ReportsPage() {
  const { invoices, clients, billingEntities, isLoading } = useDatabase();
  const [reportType, setReportType] = useState<
    "monthly" | "client_wise" | "sent_status" | "outstanding" | "paid" | "yearly"
  >("monthly");

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // September 2026
  const [selectedBillingEntityId, setSelectedBillingEntityId] = useState<string>("");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Filtering based on active report and selected billing entity
  let displayedInvoices = invoices.filter((i) => i.status !== "void");

  if (selectedBillingEntityId) {
    displayedInvoices = displayedInvoices.filter((inv) => inv.billingEntityId === selectedBillingEntityId);
  }

  if (reportType === "monthly") {
    displayedInvoices = displayedInvoices.filter((inv) => {
      const d = new Date(inv.invoiceDate);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });
  } else if (reportType === "sent_status") {
    displayedInvoices = displayedInvoices.filter((inv) => inv.sentStatus !== "not_sent");
  } else if (reportType === "outstanding") {
    displayedInvoices = displayedInvoices.filter((inv) => inv.outstandingBalance > 0);
  } else if (reportType === "paid") {
    displayedInvoices = displayedInvoices.filter((inv) => inv.paymentStatus === "paid");
  } else if (reportType === "yearly") {
    displayedInvoices = displayedInvoices.filter((inv) => {
      const d = new Date(inv.invoiceDate);
      return d.getFullYear() === selectedYear;
    });
  }

  const totalSum = displayedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalPaidSum = displayedInvoices.reduce((sum, inv) => sum + inv.totalPaid, 0);
  const totalOutstandingSum = displayedInvoices.reduce((sum, inv) => sum + inv.outstandingBalance, 0);

  // Export to Excel / CSV with entity details
  const handleExportExcel = () => {
    const data = displayedInvoices.map((inv) => ({
      "Invoice Number": inv.invoiceNumber,
      "Invoice Date": formatDate(inv.invoiceDate),
      "Billing Entity": inv.billingSnapshot?.displayName || inv.billingSnapshot?.name || "N/A",
      "Entity Prefix": inv.billingSnapshot?.prefix || "SN",
      "Entity VAT Reg": inv.billingSnapshot?.vatNumber || "Non-VAT",
      "Client Name": inv.clientSnapshot?.name,
      "Client Code": inv.clientSnapshot?.code,
      "Client VAT": inv.clientSnapshot?.vatNumber || "N/A",
      "Service Description": inv.items?.[0]?.description || inv.items?.[0]?.serviceName,
      "Advertising Period": inv.servicePeriodText || inv.items?.[0]?.servicePeriod || "-",
      "Subtotal (LKR)": inv.subtotal,
      "VAT Applicable": inv.vatApplicable ? "Yes" : "No",
      "VAT Amount (LKR)": inv.vatAmount,
      "Grand Total (LKR)": inv.grandTotal,
      "Total Paid (LKR)": inv.totalPaid,
      "Outstanding Balance (LKR)": inv.outstandingBalance,
      "Sent Status": inv.sentStatus,
      "Sent Date": inv.sentAt ? formatDate(inv.sentAt) : "-",
      "Payment Status": inv.paymentStatus,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice Report");

    const entityPrefix = selectedBillingEntityId 
      ? (billingEntities.find(e => e.id === selectedBillingEntityId)?.prefix || "ENT") 
      : "ALL";
    const fileName = `SN_Invoice_${entityPrefix}_${reportType}_${selectedYear}_${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-navy-950 tracking-tight">Business Reports &amp; Exports</h1>
            <p className="text-sm text-slate-500">
              Generate monthly summaries, audit receivables, and export datasets to Excel or CSV.
            </p>
          </div>
          <Button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-2 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel / CSV</span>
          </Button>
        </div>

        {/* Report Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "monthly", label: "Monthly Invoice Report", icon: Calendar },
            { id: "client_wise", label: "Client-Wise Report", icon: Users },
            { id: "sent_status", label: "Sent Invoice Report", icon: Send },
            { id: "outstanding", label: "Outstanding Receivables", icon: Clock },
            { id: "paid", label: "Paid Invoices Report", icon: CheckCircle2 },
            { id: "yearly", label: "Yearly Overview", icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = reportType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  isSelected
                    ? "bg-navy-950 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">🏢 Entity:</span>
            <select
              value={selectedBillingEntityId}
              onChange={(e) => setSelectedBillingEntityId(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-slate-300 font-bold text-navy-950 bg-white"
            >
              <option value="">All Billing Entities</option>
              {billingEntities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  [{ent.prefix}] {ent.displayName || ent.name}
                </option>
              ))}
            </select>
          </div>

          {(reportType === "monthly" || reportType === "yearly") && (
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
              <span className="font-bold text-slate-700">Period:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="h-8 px-2 rounded border border-slate-300 font-bold"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
              {reportType === "monthly" && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="h-8 px-2 rounded border border-slate-300 font-bold"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white">
            <span className="text-xs text-slate-500 block">Total Records</span>
            <span className="text-2xl font-black font-mono text-navy-950 mt-1 block">
              {displayedInvoices.length}
            </span>
          </Card>
          <Card className="p-4 bg-white">
            <span className="text-xs text-slate-500 block">Total Invoiced</span>
            <span className="text-2xl font-black font-mono text-navy-950 mt-1 block">
              {formatLKR(totalSum)}
            </span>
          </Card>
          <Card className="p-4 bg-white">
            <span className="text-xs text-slate-500 block">Total Collected</span>
            <span className="text-2xl font-black font-mono text-emerald-600 mt-1 block">
              {formatLKR(totalPaidSum)}
            </span>
          </Card>
          <Card className="p-4 bg-white">
            <span className="text-xs text-slate-500 block">Total Outstanding</span>
            <span className="text-2xl font-black font-mono text-rose-600 mt-1 block">
              {formatLKR(totalOutstandingSum)}
            </span>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Service &amp; Period</th>
                    <th className="py-3 px-4 text-right">Invoiced (LKR)</th>
                    <th className="py-3 px-4 text-right">Paid (LKR)</th>
                    <th className="py-3 px-4 text-right">Balance (LKR)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-navy-950">
                        <div>#{inv.invoiceNumber}</div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-navy-900 border border-slate-200 inline-block mt-0.5">
                          {inv.billingSnapshot?.prefix || "SN"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {inv.clientSnapshot?.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {inv.items?.[0]?.serviceName} {inv.servicePeriodText && `(${inv.servicePeriodText})`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-navy-950">
                        {formatLKR(inv.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        {formatLKR(inv.totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                        {formatLKR(inv.outstandingBalance)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant={inv.paymentStatus === "paid" ? "success" : "warning"}
                          className="text-[10px] capitalize whitespace-nowrap"
                        >
                          {inv.paymentStatus.replace("_", " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {displayedInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                        No records found for this report filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

