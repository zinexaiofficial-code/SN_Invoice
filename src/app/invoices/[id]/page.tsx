"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Invoice, InvoiceTemplateKey } from "@/types";
import { storage } from "@/lib/storage";
import { formatLKR, formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceTemplateRenderer } from "@/components/invoices/InvoiceTemplateRenderer";
import { ShareInvoiceModal } from "@/components/invoices/ShareInvoiceModal";
import { RecordPaymentModal } from "@/components/invoices/RecordPaymentModal";
import {
  Printer,
  Share2,
  DollarSign,
  Copy,
  Ban,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  FileText,
  Building
} from "lucide-react";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [templateKey, setTemplateKey] = useState<InvoiceTemplateKey>("standard");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('admin');

  useEffect(() => {
    setUserRole(storage.getUserRole());
    const found = storage.getInvoiceById(invoiceId);
    if (found) {
      setInvoice(found);
      setTemplateKey(found.templateKey || "standard");
    }
  }, [invoiceId]);

  if (!invoice) {
    return (
      <AppLayout>
        <div className="text-center py-20 space-y-4">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-navy-950">Invoice not found</h2>
          <p className="text-sm text-slate-500">The invoice #{invoiceId} could not be located.</p>
          <Button onClick={() => router.push("/invoices")}>Back to Invoices</Button>
        </div>
      </AppLayout>
    );
  }

  const handleDuplicate = () => {
    try {
      const duplicated = storage.duplicateInvoice(invoice.id);
      router.push(`/invoices/${duplicated.id}`);
    } catch (e: any) {
      alert("Failed to duplicate invoice: " + e.message);
    }
  };

  const handleVoid = () => {
    if (confirm("Are you sure you want to void this invoice? This cannot be undone.")) {
      const updated = storage.voidInvoice(invoice.id);
      setInvoice({ ...updated });
    }
  };

  const handlePrint = () => {
    window.open(`/invoices/${invoice.id}/pdf?template=${templateKey}`, "_blank");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <Link
              href="/invoices"
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-black text-navy-950 tracking-tight">
                  Invoice #{invoice.invoiceNumber}
                </h1>
                <Badge
                  variant={
                    invoice.status === "issued"
                      ? "success"
                      : invoice.status === "paid"
                      ? "info"
                      : invoice.status === "void"
                      ? "destructive"
                      : "secondary"
                  }
                  className="uppercase text-[11px]"
                >
                  {invoice.status}
                </Badge>
                <Badge
                  variant={
                    invoice.paymentStatus === "paid"
                      ? "success"
                      : invoice.paymentStatus === "partially_paid"
                      ? "warning"
                      : invoice.paymentStatus === "voided"
                      ? "destructive"
                      : "destructive"
                  }
                  className="uppercase text-[11px]"
                >
                  {invoice.paymentStatus.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Issued on {formatDate(invoice.invoiceDate)} to {invoice.clientSnapshot?.name}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Print / Download PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center space-x-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Invoice</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={invoice.status === "void" || invoice.paymentStatus === "paid"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1.5"
            >
              <DollarSign className="w-4 h-4" />
              <span>Record Payment</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDuplicate}
              className="flex items-center space-x-1.5"
              title="Duplicate for recurring billing"
            >
              <Copy className="w-4 h-4 text-slate-600" />
              <span>Duplicate</span>
            </Button>

            {userRole === "admin" && invoice.status !== "void" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleVoid}
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Ban className="w-4 h-4 mr-1" />
                <span>Void</span>
              </Button>
            )}
          </div>
        </div>

        {/* Status Summary & Template Selector */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white">
            <span className="text-xs text-slate-500 block">Total Amount</span>
            <span className="text-xl font-bold font-mono text-navy-950 mt-1 block">
              {formatLKR(invoice.grandTotal)}
            </span>
            <span className="text-[11px] text-slate-400">
              Subtotal: {formatLKR(invoice.subtotal)} {invoice.vatApplicable && `+ 18% VAT`}
            </span>
          </Card>

          <Card className="p-4 bg-white">
            <span className="text-xs text-slate-500 block">Confirmed Paid</span>
            <span className="text-xl font-bold font-mono text-emerald-600 mt-1 block">
              {formatLKR(invoice.totalPaid)}
            </span>
            <span className="text-[11px] text-slate-400">
              {invoice.payments?.length || 0} payment recorded
            </span>
          </Card>

          <Card className="p-4 bg-white">
            <span className="text-xs text-slate-500 block">Outstanding Balance</span>
            <span className="text-xl font-bold font-mono text-rose-600 mt-1 block">
              {formatLKR(invoice.outstandingBalance)}
            </span>
            <span className="text-[11px] text-slate-400">
              Due by: {invoice.dueDate ? formatDate(invoice.dueDate) : "On Demand"}
            </span>
          </Card>

          <Card className="p-4 bg-slate-50 border-slate-300 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-700">Display Layout Template</span>
            <select
              value={templateKey}
              onChange={(e) => {
                const newKey = e.target.value as InvoiceTemplateKey;
                setTemplateKey(newKey);
                const updated = storage.saveInvoice({ ...invoice, templateKey: newKey });
                setInvoice(updated);
              }}
              className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-900"
            >
              <option value="standard">Standard Advertising (Classic)</option>
              <option value="vat">VAT Tax Invoice</option>
              <option value="sponsorship">Sponsorship Invoice (Media)</option>
              <option value="custom">Custom Commercial</option>
            </select>
          </Card>
        </div>

        {/* Invoice Preview */}
        <div className="bg-slate-200/60 p-4 md:p-8 rounded-2xl flex justify-center overflow-x-auto shadow-inner">
          <InvoiceTemplateRenderer invoice={{ ...invoice, templateKey }} />
        </div>

        {/* Bottom Details: Payments & Sent History Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment History */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Payment Records</span>
              </CardTitle>
              {invoice.outstandingBalance > 0 && invoice.status !== "void" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="text-xs"
                >
                  Add Payment
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {invoice.payments && invoice.payments.length > 0 ? (
                <div className="divide-y divide-slate-100 text-xs">
                  {invoice.payments.map((p) => (
                    <div key={p.id} className="py-2.5 flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900 capitalize flex items-center space-x-1.5">
                          <span>{p.paymentMethod.replace("_", " ")}</span>
                          {p.transactionRef && (
                            <span className="font-mono text-slate-500 font-normal">
                              ({p.transactionRef})
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {formatDate(p.paymentDate)} {p.notes && `• ${p.notes}`}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {formatLKR(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No payments recorded yet. Click "Record Payment" to log client payments.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Share & Dispatch History */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center space-x-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>Dispatch &amp; Sent Activity</span>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsShareModalOpen(true)}
                className="text-xs"
              >
                Share Again
              </Button>
            </CardHeader>
            <CardContent>
              {invoice.shareHistory && invoice.shareHistory.length > 0 ? (
                <div className="divide-y divide-slate-100 text-xs">
                  {invoice.shareHistory.map((s) => (
                    <div key={s.id} className="py-2.5 flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900 capitalize flex items-center space-x-1.5">
                          <span>{s.channel}</span>
                          <span className="font-mono text-slate-500 font-normal">
                            ({s.recipient || "Handover"})
                          </span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {formatDateTime(s.sharedAt)} {s.notes && `• ${s.notes}`}
                        </div>
                      </div>
                      <Badge variant="success" className="text-[10px] uppercase">
                        {s.deliveryStatus.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Not sent yet. Use "Share Invoice" to send via WhatsApp, Email, or mark as sent.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Share Modal */}
      <ShareInvoiceModal
        invoice={invoice}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onShared={(updated) => setInvoice(updated)}
      />

      {/* Payment Modal */}
      <RecordPaymentModal
        invoice={invoice}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentRecorded={(updated) => setInvoice(updated)}
      />
    </AppLayout>
  );
}

