"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Invoice, Client, DashboardKPIs } from "@/types";
import { storage } from "@/lib/storage";
import { formatLKR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  DollarSign,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  PlusCircle,
  Printer,
  Calendar,
  Building,
  ChevronRight,
  TrendingUp,
  BarChart2
} from "lucide-react";

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs>({
    totalClients: 0,
    invoicesThisMonth: 0,
    totalInvoicedThisMonth: 0,
    invoicesSentThisMonth: 0,
    outstandingAmount: 0,
    paidAmount: 0,
    overdueInvoicesCount: 0,
  });

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Month & Client selector
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // September 2026 (matching sample)
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  useEffect(() => {
    const allInvs = storage.getInvoices();
    const allClis = storage.getClients();
    setInvoices(allInvs);
    setClients(allClis);
    setKpis(storage.getDashboardKPIs(selectedYear, selectedMonth));
  }, [selectedYear, selectedMonth, selectedClientId]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Client filtered recent invoices
  const recentInvoices = invoices
    .filter((inv) => !selectedClientId || inv.clientId === selectedClientId)
    .slice(0, 7);

  // Top clients by invoiced value
  const clientRevenueMap: Record<string, { name: string; total: number; count: number }> = {};
  invoices.forEach((inv) => {
    if (inv.status === "void") return;
    const cid = inv.clientId;
    const cname = inv.clientSnapshot?.name || "Unknown";
    if (!clientRevenueMap[cid]) {
      clientRevenueMap[cid] = { name: cname, total: 0, count: 0 };
    }
    clientRevenueMap[cid].total += inv.grandTotal;
    clientRevenueMap[cid].count += 1;
  });

  const topClients = Object.values(clientRevenueMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Payment Status counts
  const paymentStatusCounts = {
    paid: invoices.filter((i) => i.paymentStatus === "paid").length,
    partially_paid: invoices.filter((i) => i.paymentStatus === "partially_paid").length,
    unpaid: invoices.filter((i) => i.paymentStatus === "unpaid" && i.status !== "void").length,
    voided: invoices.filter((i) => i.status === "void").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header & Month/Year/Client Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-navy-950 tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-500">
              SN Advertising commercial performance, active campaigns, and cashflow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="h-9 px-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-navy-950"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="h-9 px-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-navy-950"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 max-w-xs"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <Link
              href="/invoices/new"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Invoice</span>
            </Link>
          </div>
        </div>

        {/* 7 KPI Cards (Section 4 Requirements) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="p-3 bg-white">
            <span className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              Total Clients
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <span className="text-xl font-black font-mono text-navy-950 mt-1 block">
              {kpis.totalClients}
            </span>
            <span className="text-[10px] text-slate-400">Active accounts</span>
          </Card>

          <Card className="p-3 bg-white">
            <span className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              Invoices This Month
              <FileText className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <span className="text-xl font-black font-mono text-navy-950 mt-1 block">
              {kpis.invoicesThisMonth}
            </span>
            <span className="text-[10px] text-slate-400">{monthNames[selectedMonth - 1]}</span>
          </Card>

          <Card className="p-3 bg-white border-l-4 border-l-navy-950">
            <span className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              Invoiced This Month
              <DollarSign className="w-3.5 h-3.5 text-navy-950" />
            </span>
            <span className="text-lg font-black font-mono text-navy-950 mt-1 block truncate">
              {formatLKR(kpis.totalInvoicedThisMonth)}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Billed gross</span>
          </Card>

          <Card className="p-3 bg-white">
            <span className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              Sent This Month
              <Send className="w-3.5 h-3.5 text-blue-500" />
            </span>
            <span className="text-xl font-black font-mono text-blue-600 mt-1 block">
              {kpis.invoicesSentThisMonth}
            </span>
            <span className="text-[10px] text-slate-400">Dispatched</span>
          </Card>

          <Card className="p-3 bg-white border-l-4 border-l-rose-500">
            <span className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              Outstanding Amount
              <Clock className="w-3.5 h-3.5 text-rose-500" />
            </span>
            <span className="text-lg font-black font-mono text-rose-600 mt-1 block truncate">
              {formatLKR(kpis.outstandingAmount)}
            </span>
            <span className="text-[10px] text-rose-500 font-medium">Receivables</span>
          </Card>

          <Card className="p-3 bg-white border-l-4 border-l-emerald-500">
            <span className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              Paid Amount
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </span>
            <span className="text-lg font-black font-mono text-emerald-600 mt-1 block truncate">
              {formatLKR(kpis.paidAmount)}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Collected</span>
          </Card>

          <Card className="p-3 bg-white">
            <span className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              Overdue Invoices
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            </span>
            <span className="text-xl font-black font-mono text-amber-600 mt-1 block">
              {kpis.overdueInvoicesCount}
            </span>
            <span className="text-[10px] text-slate-400">Past due date</span>
          </Card>
        </div>

        {/* Dashboard Visual Cards & Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Clients by Value */}
          <Card className="lg:col-span-2">
            <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-navy-950 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Top Clients by Invoiced Value</span>
              </CardTitle>
              <Link href="/clients" className="text-xs text-navy-900 font-bold hover:underline">
                View All Clients →
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {topClients.map((client, idx) => {
                const maxVal = topClients[0]?.total || 1;
                const percentage = Math.round((client.total / maxVal) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-navy-950 uppercase">{client.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatLKR(client.total)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-navy-900 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {client.count} campaigns &amp; packages invoiced
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Payment Status Breakdown */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-navy-950 flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                <span>Payment Status Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-emerald-50 text-emerald-950 border border-emerald-100">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-bold">Fully Paid</span>
                </div>
                <span className="font-mono font-bold text-base">{paymentStatusCounts.paid}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-lg bg-amber-50 text-amber-950 border border-amber-100">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-bold">Partially Paid / Advance</span>
                </div>
                <span className="font-mono font-bold text-base">{paymentStatusCounts.partially_paid}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-lg bg-rose-50 text-rose-950 border border-rose-100">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="font-bold">Unpaid / Outstanding</span>
                </div>
                <span className="font-mono font-bold text-base">{paymentStatusCounts.unpaid}</span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
                <span>Total Active Records:</span>
                <span className="font-mono font-bold text-slate-800">{invoices.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Invoices Table (Section 4 Requirement) */}
        <Card>
          <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-navy-950">Recent Invoices</CardTitle>
              <p className="text-xs text-slate-400">Click any row to open full details and generate official PDF.</p>
            </div>
            <Link href="/invoices" className="text-xs text-navy-900 font-bold hover:underline">
              View All Invoices ({invoices.length}) →
            </Link>
          </CardHeader>
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
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-navy-950">
                        <Link href={`/invoices/${inv.id}`} className="hover:underline">
                          #{inv.invoiceNumber}
                        </Link>
                        {inv.regNo && (
                          <span className="block text-[11px] font-normal text-slate-400 font-mono">
                            {inv.regNo}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-navy-950 line-clamp-1">
                          {inv.clientSnapshot?.name}
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-1">
                          {inv.items?.[0]?.serviceName}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-xs text-slate-600">
                        {formatDate(inv.invoiceDate)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-navy-950">
                        {formatLKR(inv.grandTotal)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant={inv.sentStatus === "delivery_confirmed" ? "success" : inv.sentStatus === "sent" ? "info" : "secondary"}
                          className="text-[10px] capitalize whitespace-nowrap"
                        >
                          {inv.sentStatus.replace("_", " ")}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant={inv.paymentStatus === "paid" ? "success" : inv.paymentStatus === "partially_paid" ? "warning" : "destructive"}
                          className="text-[10px] capitalize whitespace-nowrap"
                        >
                          {inv.paymentStatus.replace("_", " ")}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
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
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

