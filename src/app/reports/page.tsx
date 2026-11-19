"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { AppLayout } from "@/components/layout/AppLayout";
import { Invoice, Client, BillingEntity, SupplierPayable } from "@/types";
import { formatLKR, formatDate } from "@/lib/utils";
import { KpiCurrencyValue } from "@/components/ui/KpiValue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  Send,
  FileSpreadsheet,
  Wallet,
  TrendingUp,
  CreditCard,
  Building2
} from "lucide-react";

import { useDatabase } from "@/context/DatabaseContext";

export default function ReportsPage() {
  const { invoices, clients, billingEntities, suppliers, supplierPayables, schedules, isLoading } = useDatabase();
  const [reportType, setReportType] = useState<
    "monthly" | "client_wise" | "sent_status" | "outstanding" | "paid" | "yearly" | "supplier_payables" | "cashflow"
  >("monthly");

  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedBillingEntityId, setSelectedBillingEntityId] = useState<string>("");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Filtering invoices
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

  // Filtering supplier payables
  let displayedPayables = supplierPayables;
  if (selectedBillingEntityId) {
    displayedPayables = displayedPayables.filter((p) => p.billingEntityId === selectedBillingEntityId);
  }
  if (reportType === "monthly") {
    displayedPayables = displayedPayables.filter((p) => {
      const d = new Date(p.billDate);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });
  } else if (reportType === "yearly") {
    displayedPayables = displayedPayables.filter((p) => {
      const d = new Date(p.billDate);
      return d.getFullYear() === selectedYear;
    });
  }

  // Invoice Totals
  const totalInvoicedSum = displayedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalCustomerPaidSum = displayedInvoices.reduce((sum, inv) => sum + inv.totalPaid, 0);
  const totalCustomerOutstandingSum = displayedInvoices.reduce((sum, inv) => sum + inv.outstandingBalance, 0);

  // Supplier Payables Totals
  const totalSupplierBilled = displayedPayables.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalSupplierPaid = displayedPayables.reduce((sum, p) => sum + p.totalPaid, 0);
  const totalSupplierOutstanding = displayedPayables.reduce((sum, p) => sum + p.outstandingAmount, 0);

  // Cashflow: Money IN vs Money OUT
  const moneyIn = totalCustomerPaidSum;
  const moneyOut = totalSupplierPaid;
  const netCashFlow = moneyIn - moneyOut;
  const estimatedRevenue = totalInvoicedSum;
  const estimatedGrossProfit = estimatedRevenue - totalSupplierBilled;

  // Export to Excel / CSV with entity details
  const handleExportExcel = () => {
    let worksheet: any;
    let sheetName = "Report";

    if (reportType === "supplier_payables") {
      sheetName = "Supplier Payables";
      const data = displayedPayables.map((p) => {
        const sup = suppliers.find((s) => s.id === p.supplierId);
        const ent = billingEntities.find((e) => e.id === p.billingEntityId);
        return {
          "Payable Ref": p.payableNumber,
          "Supplier Name": sup?.name || p.supplierSnapshot?.name || "N/A",
          "Supplier Bill #": p.supplierInvoiceNumber || "-",
          "Billing Entity": ent?.displayName || ent?.name || "N/A",
          "Channel": p.channelName || "-",
          "Campaign": p.campaignName || "-",
          "Bill Date": p.billDate,
          "Due Date": p.dueDate,
          "Total Bill (LKR)": p.totalAmount,
          "Total Paid (LKR)": p.totalPaid,
          "Outstanding (LKR)": p.outstandingAmount,
          "Status": p.status,
        };
      });
      worksheet = XLSX.utils.json_to_sheet(data);
    } else if (reportType === "cashflow") {
      sheetName = "Cashflow Summary";
      const data = [
        { Metric: "Customer Revenue (Invoiced)", "Amount (LKR)": estimatedRevenue },
        { Metric: "Supplier Expenses (Billed)", "Amount (LKR)": totalSupplierBilled },
        { Metric: "Estimated Gross Profit", "Amount (LKR)": estimatedGrossProfit },
        { Metric: "------------------------", "Amount (LKR)": "" },
        { Metric: "Money IN (Customer Collections)", "Amount (LKR)": moneyIn },
        { Metric: "Money OUT (Supplier Settlements)", "Amount (LKR)": moneyOut },
        { Metric: "Net Cash Flow (Realized)", "Amount (LKR)": netCashFlow },
      ];
      worksheet = XLSX.utils.json_to_sheet(data);
    } else {
      sheetName = "Invoice Report";
      const data = displayedInvoices.map((inv) => {
        const ent = billingEntities.find((e) => e.id === inv.billingEntityId);
        return {
          "Invoice Number": inv.invoiceNumber,
          "Invoice Date": formatDate(inv.invoiceDate),
          "Billing Entity": ent?.displayName || ent?.name || inv.billingSnapshot?.displayName || inv.billingSnapshot?.name || "N/A",
          "Entity Prefix": ent?.prefix || inv.billingSnapshot?.prefix || "SN",
          "Entity VAT Reg": ent?.vatNumber || inv.billingSnapshot?.vatNumber || "Non-VAT",
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
        };
      });
      worksheet = XLSX.utils.json_to_sheet(data);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const entityPrefix = selectedBillingEntityId
      ? (billingEntities.find((e) => e.id === selectedBillingEntityId)?.prefix || "ENT")
      : "ALL";
    const fileName = `SN_Invoice_${entityPrefix}_${reportType}_${selectedYear}_${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-navy-950 tracking-tight">Business Reports &amp; Exports</h1>
            <p className="text-sm text-slate-500">
              Generate monthly summaries, cashflow audits, supplier payables, and export datasets to Excel.
            </p>
          </div>
          <Button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-2 shadow-xs"
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
            { id: "supplier_payables", label: "Supplier Payables Report", icon: Wallet },
            { id: "cashflow", label: "Cashflow (Money In vs Out)", icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = reportType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  isSelected
                    ? "bg-navy-950 text-white shadow-xs"
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

          {(reportType === "monthly" || reportType === "yearly" || reportType === "cashflow") && (
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
        {reportType === "cashflow" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white min-w-0 flex flex-col justify-between shadow-xs border-emerald-200 bg-emerald-50/20">
              <span className="text-xs text-emerald-800 font-bold uppercase block">Money IN (Customer Receipts)</span>
              <div className="my-1">
                <KpiCurrencyValue amount={moneyIn} colorClass="text-emerald-700" size="lg" />
              </div>
              <span className="text-[10px] text-emerald-600">Collected from invoices</span>
            </Card>

            <Card className="p-4 bg-white min-w-0 flex flex-col justify-between shadow-xs border-rose-200 bg-rose-50/20">
              <span className="text-xs text-rose-800 font-bold uppercase block">Money OUT (Supplier Payments)</span>
              <div className="my-1">
                <KpiCurrencyValue amount={moneyOut} colorClass="text-rose-700" size="lg" />
              </div>
              <span className="text-[10px] text-rose-600">Disbursed to TV & Radio</span>
            </Card>

            <Card className="p-4 bg-white min-w-0 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-slate-700 font-bold uppercase block">Net Cash Flow</span>
              <div className="my-1">
                <KpiCurrencyValue
                  amount={netCashFlow}
                  colorClass={netCashFlow >= 0 ? "text-emerald-700" : "text-rose-700"}
                  size="lg"
                />
              </div>
              <span className="text-[10px] text-slate-500">Realized liquidity balance</span>
            </Card>

            <Card className="p-4 bg-white min-w-0 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-slate-700 font-bold uppercase block">Gross Margin Spread</span>
              <div className="my-1">
                <KpiCurrencyValue amount={estimatedGrossProfit} colorClass="text-navy-950" size="lg" />
              </div>
              <span className="text-[10px] text-slate-500">Revenue minus supplier cost</span>
            </Card>
          </div>
        ) : reportType === "supplier_payables" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white min-w-0 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-slate-500 block">Total Supplier Bills</span>
              <div className="my-1">
                <span className="text-2xl font-black font-mono text-navy-950 block">
                  {displayedPayables.length}
                </span>
              </div>
            </Card>
            <Card className="p-4 bg-white min-w-0 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-slate-500 block">Total Broadcaster Charges</span>
              <div className="my-1">
                <KpiCurrencyValue amount={totalSupplierBilled} colorClass="text-navy-950" size="lg" />
              </div>
            </Card>
            <Card className="p-4 bg-white min-w-0 flex flex-col justify-between shadow-xs border-emerald-200 bg-emerald-50/20">
              <span className="text-xs text-emerald-800 font-bold block">Total Paid to Suppliers</span>
              <div className="my-1">
                <KpiCurrencyValue amount={totalSupplierPaid} colorClass="text-emerald-700" size="lg" />
              </div>
            </Card>
            <Card className="p-4 bg-white min-w-0 flex flex-col justify-between shadow-xs border-rose-200 bg-rose-50/20">
              <span className="text-xs text-rose-800 font-bold block">Outstanding to Suppliers</span>
              <div className="my-1">
                <KpiCurrencyValue amount={totalSupplierOutstanding} colorClass="text-rose-700" size="lg" />
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white min-w-0 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-slate-500 block">Total Records</span>
              <div className="my-1">
                <span className="text-2xl font-black font-mono text-navy-950 block">
                  {displayedInvoices.length}
                </span>
              </div>
            </Card>
            <Card className="p-4 bg-white min-w-0 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-slate-500 block">Total Invoiced</span>
              <div className="my-1">
                <KpiCurrencyValue amount={totalInvoicedSum} colorClass="text-navy-950" size="lg" />
              </div>
            </Card>
            <Card className="p-4 bg-white min-w-0 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-slate-500 block">Total Collected</span>
              <div className="my-1">
                <KpiCurrencyValue amount={totalCustomerPaidSum} colorClass="text-emerald-600" size="lg" />
              </div>
            </Card>
            <Card className="p-4 bg-white min-w-0 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-slate-500 block">Total Outstanding</span>
              <div className="my-1">
                <KpiCurrencyValue amount={totalCustomerOutstandingSum} colorClass="text-rose-600" size="lg" />
              </div>
            </Card>
          </div>
        )}

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {reportType === "supplier_payables" ? (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Payable #</th>
                      <th className="py-3 px-3">Bill Date</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Channel / Campaign</th>
                      <th className="py-3 px-4 text-right">Total (LKR)</th>
                      <th className="py-3 px-4 text-right">Paid (LKR)</th>
                      <th className="py-3 px-4 text-right">Balance (LKR)</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {displayedPayables.map((p) => {
                      const sup = suppliers.find((s) => s.id === p.supplierId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-navy-950">
                            #{p.payableNumber}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">{p.billDate}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {sup?.name || p.supplierSnapshot?.name || "Supplier"}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="font-semibold text-slate-800">{p.channelName || "-"}</span>
                            {p.campaignName && <span className="block text-[11px] text-slate-400">{p.campaignName}</span>}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-navy-950">
                            {formatLKR(p.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                            {formatLKR(p.totalPaid)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                            {formatLKR(p.outstandingAmount)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {displayedPayables.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                          No supplier payables found for this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : reportType === "cashflow" ? (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Inflow Section */}
                    <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/20 space-y-3">
                      <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2 border-b border-emerald-200 pb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Cash Inflow (Customer Collections)</span>
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Invoiced to Clients:</span>
                          <span className="font-mono font-bold text-slate-900">{formatLKR(totalInvoicedSum)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-800 font-bold">
                          <span>Actual Cash Collected:</span>
                          <span className="font-mono">{formatLKR(moneyIn)}</span>
                        </div>
                        <div className="flex justify-between text-rose-700 font-medium">
                          <span>Uncollected Receivables:</span>
                          <span className="font-mono">{formatLKR(totalCustomerOutstandingSum)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Outflow Section */}
                    <div className="border border-rose-200 rounded-xl p-4 bg-rose-50/20 space-y-3">
                      <h3 className="font-bold text-rose-900 text-sm flex items-center gap-2 border-b border-rose-200 pb-2">
                        <CreditCard className="w-4 h-4 text-rose-700" />
                        <span>Cash Outflow (Supplier Settlements)</span>
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Broadcaster Charges:</span>
                          <span className="font-mono font-bold text-slate-900">{formatLKR(totalSupplierBilled)}</span>
                        </div>
                        <div className="flex justify-between text-rose-800 font-bold">
                          <span>Actual Cash Disbursed:</span>
                          <span className="font-mono">{formatLKR(moneyOut)}</span>
                        </div>
                        <div className="flex justify-between text-amber-700 font-medium">
                          <span>Pending Supplier Liabilities:</span>
                          <span className="font-mono">{formatLKR(totalSupplierOutstanding)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Summary Bar */}
                  <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between text-sm">
                    <div>
                      <span className="text-slate-400 text-xs block uppercase tracking-wider font-bold">
                        Net Realized Cash Position
                      </span>
                      <span className="text-xs text-slate-300">
                        Total Collections ({formatLKR(moneyIn)}) &minus; Total Disbursements ({formatLKR(moneyOut)})
                      </span>
                    </div>
                    <span
                      className={`text-xl font-mono font-black ${
                        netCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatLKR(netCashFlow)}
                    </span>
                  </div>
                </div>
              ) : (
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
                            {billingEntities.find((e) => e.id === inv.billingEntityId)?.prefix || inv.billingSnapshot?.prefix || "SN"}
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
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
