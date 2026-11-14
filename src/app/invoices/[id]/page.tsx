"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Invoice, InvoiceTemplateKey, Cheque, InvoicePdfFormat, PdfTypographySettings } from "@/types";
import { storage } from "@/lib/storage";
import { formatLKR, formatDate, formatDateTime } from "@/lib/utils";
import { downloadInvoicePdf } from "@/lib/pdf";
import { getVerificationUrl } from "@/lib/crypto";
import { VerificationModal } from "@/components/invoices/VerificationModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceTemplateRenderer } from "@/components/invoices/InvoiceTemplateRenderer";
import { PdfLayoutControls } from "@/components/invoices/PdfLayoutControls";
import { resolveTypography } from "@/lib/pdfTypography";
import { ShareInvoiceModal } from "@/components/invoices/ShareInvoiceModal";
import { RecordPaymentModal } from "@/components/invoices/RecordPaymentModal";
import { ChequeModal } from "@/components/cheques/ChequeModal";
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
  Building,
  CreditCard,
  Plus,
  ShieldCheck,
  Download,
  ExternalLink,
  Check,
  FileCheck,
  Edit
} from "lucide-react";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [templateKey, setTemplateKey] = useState<InvoiceTemplateKey>("standard");
  const [selectedFormat, setSelectedFormat] = useState<InvoicePdfFormat>("digital");
  const [typography, setTypography] = useState<PdfTypographySettings>(() =>
    resolveTypography(undefined)
  );
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isChequeModalOpen, setIsChequeModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('admin');

  const loadCheques = () => {
    setCheques(storage.getCheques());
  };

  const handleTypographyChange = (newTypo: PdfTypographySettings) => {
    setTypography(newTypo);
    if (invoice) {
      const updated = storage.saveInvoice({ ...invoice, pdfLayout: newTypo });
      setInvoice(updated);
    }
  };

  useEffect(() => {
    setUserRole(storage.getUserRole());
    const found = storage.getInvoiceById(invoiceId);
    if (found) {
      setInvoice(found);
      setTemplateKey(found.templateKey || "standard");
      if (found.signatureFormat) {
        setSelectedFormat(found.signatureFormat);
      }
      setTypography(resolveTypography(found.pdfLayout, found.items, found.vatApplicable, !!found.specialNotes));
    }
    loadCheques();

    const handleChequeUpdated = () => {
      loadCheques();
      const updatedInv = storage.getInvoiceById(invoiceId);
      if (updatedInv) {
        setInvoice(updatedInv);
        setTypography(resolveTypography(updatedInv.pdfLayout, updatedInv.items, updatedInv.vatApplicable, !!updatedInv.specialNotes));
      }
    };

    window.addEventListener("cheque-updated", handleChequeUpdated);
    window.addEventListener("storage", handleChequeUpdated);

    return () => {
      window.removeEventListener("cheque-updated", handleChequeUpdated);
      window.removeEventListener("storage", handleChequeUpdated);
    };
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

  const handlePrint = (formatToPrint?: InvoicePdfFormat) => {
    const f = formatToPrint || selectedFormat;
    window.open(`/invoices/${invoice.id}/pdf?format=${f}&template=${templateKey}`, "_blank");
  };

  const handleDownloadDigitalPdf = async () => {
    if (!invoice) return;
    if (invoice.status === "draft") {
      alert("Digitally Approved PDFs can only be downloaded once an invoice has been officially issued.");
      return;
    }
    setIsDownloading(true);
    try {
      await downloadInvoicePdf({
        elementId: "printable-invoice-element",
        filename: `${invoice.invoiceNumber}-Digital.pdf`,
        verificationUrl: getVerificationUrl(invoice.verificationToken || invoice.id),
      });
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF. Opening print preview instead.");
      window.open(`/invoices/${invoice.id}/pdf?format=digital&template=${templateKey}`, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPrintPdf = async () => {
    if (!invoice) return;
    setIsDownloading(true);
    try {
      await downloadInvoicePdf({
        elementId: "printable-invoice-element-print",
        filename: `${invoice.invoiceNumber}-Print.pdf`,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF. Opening print preview instead.");
      window.open(`/invoices/${invoice.id}/pdf?format=print&template=${templateKey}`, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    if (!invoice) return;
    const url = getVerificationUrl(invoice.verificationToken || invoice.id);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
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
            {invoice.status !== "void" && (
              <Link
                href={`/invoices/${invoice.id}/edit`}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
                title="Edit invoice items, prices, or details"
              >
                <Edit className="w-3.5 h-3.5 text-navy-950" />
                <span>Edit Invoice</span>
              </Link>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVerificationModalOpen(true)}
              className="flex items-center space-x-1.5 text-emerald-800 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 font-bold"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verify Authenticity</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadDigitalPdf}
              disabled={invoice.status === "draft" || isDownloading}
              title={invoice.status === "draft" ? "Available only once invoice is officially issued" : "Download Digital Signature PDF"}
              className="flex items-center space-x-1.5 bg-navy-950 text-white hover:bg-navy-900 border-navy-950 font-bold"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Digital PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPrintPdf}
              disabled={isDownloading}
              className="flex items-center space-x-1.5 text-slate-800 hover:bg-slate-100 font-semibold"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Download Blank / Hard Copy PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
              className="flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Print</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="flex items-center space-x-1.5 text-slate-600 hover:bg-slate-100"
              title="Copy public verification link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <ExternalLink className="w-4 h-4" />}
              <span>{copiedLink ? "Link Copied!" : "Copy Verification Link"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center space-x-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
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

        {/* PDF Layout Controls, Format Selector & Page Fit Mode */}
        <PdfLayoutControls
          format={selectedFormat}
          onFormatChange={setSelectedFormat}
          templateKey={templateKey}
          onTemplateChange={(newKey) => {
            setTemplateKey(newKey);
            if (invoice) {
              const updated = storage.saveInvoice({ ...invoice, templateKey: newKey });
              setInvoice(updated);
            }
          }}
          typography={typography}
          onTypographyChange={handleTypographyChange}
          zoomScale={zoomScale}
          onZoomChange={setZoomScale}
          onDownload={selectedFormat === "digital" ? handleDownloadDigitalPdf : handleDownloadPrintPdf}
          onPrint={() => handlePrint(selectedFormat)}
          isDownloading={isDownloading}
          downloadDisabled={selectedFormat === "digital" && invoice.status === "draft"}
        />

        {/* Invoice Preview */}
        <div className="bg-slate-200/60 p-4 md:p-8 rounded-2xl flex justify-center overflow-x-auto shadow-inner">
          <div id="printable-invoice-element">
            <InvoiceTemplateRenderer
              invoice={{ ...invoice, templateKey }}
              format={selectedFormat}
              typographySettings={typography}
              zoomScale={zoomScale}
            />
          </div>
        </div>

        {/* Off-screen print DOM for Option B download */}
        <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
          <div id="printable-invoice-element-print">
            <InvoiceTemplateRenderer
              invoice={{ ...invoice, templateKey }}
              format="print"
              printMode={true}
              typographySettings={typography}
            />
          </div>
        </div>

        {/* Verification Modal */}
        <VerificationModal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          invoice={invoice}
        />

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

          {/* Related Cheques & Clearance Tracking Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Related Cheques &amp; Clearance Tracking</span>
              </CardTitle>
              {invoice.status !== "void" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsChequeModalOpen(true)}
                  className="text-xs flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Cheque</span>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {cheques.filter(
                (c) =>
                  c.invoiceAllocations?.some((a) => a.invoiceId === invoice.id) ||
                  c.billReference === invoice.invoiceNumber
              ).length > 0 ? (
                <div className="space-y-3">
                  <div className="divide-y divide-slate-100 text-xs">
                    {cheques
                      .filter(
                        (c) =>
                          c.invoiceAllocations?.some((a) => a.invoiceId === invoice.id) ||
                          c.billReference === invoice.invoiceNumber
                      )
                      .map((c) => {
                        const alloc = c.invoiceAllocations?.find((a) => a.invoiceId === invoice.id);
                        const allocAmt = alloc?.allocatedAmount || c.amount;
                        const isCleared = c.status === "cleared";
                        const isReturned = c.status === "returned";

                        return (
                          <div
                            key={c.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900 font-mono text-sm">
                                  Cheque #{c.chequeNumber}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                    isCleared
                                      ? "bg-emerald-100 text-emerald-800"
                                      : isReturned
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {c.status.replace("_", " ")}
                                </span>
                              </div>
                              <p className="text-slate-500 text-[11px]">
                                {c.drawerBank} {c.branch && `(${c.branch})`} • Due/Deposit:{" "}
                                {c.expectedActionDate || c.chequeDate}
                              </p>
                              <p className="text-[11px] text-slate-600">
                                {isCleared ? (
                                  <span className="text-emerald-700 font-medium">
                                    ✓ Cleared on {c.actualClearanceDate || "Bank confirmation"} (payment credited to invoice)
                                  </span>
                                ) : isReturned ? (
                                  <span className="text-rose-700 font-bold">
                                    🚨 Returned: {c.returnReason || "Refer to Drawer"} (Action required)
                                  </span>
                                ) : (
                                  <span className="text-amber-700">
                                    ⏳ Pending deposit / clearance (not counted as cash until cleared)
                                  </span>
                                )}
                              </p>
                            </div>

                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                {formatLKR(allocAmt)}
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                Allocated to this invoice
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>
                      Cheques Linked:{" "}
                      <strong>
                        {
                          cheques.filter(
                            (c) =>
                              c.invoiceAllocations?.some((a) => a.invoiceId === invoice.id) ||
                              c.billReference === invoice.invoiceNumber
                          ).length
                        }
                      </strong>
                    </span>
                    <Link
                      href="/cheques"
                      className="text-emerald-700 hover:text-emerald-800 font-semibold"
                    >
                      Open Cheque Workspace →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-5 text-center text-slate-500 text-xs">
                  <p>No cheques recorded for this invoice yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    When a client pays by cheque, record it here to track its deposit date, clearing status, and smart reminders.
                  </p>
                </div>
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

      {/* Cheque Modal */}
      <ChequeModal
        isOpen={isChequeModalOpen}
        onClose={() => setIsChequeModalOpen(false)}
        onSaved={() => {
          loadCheques();
          const updatedInv = storage.getInvoiceById(invoiceId);
          if (updatedInv) setInvoice(updatedInv);
        }}
        defaultInvoiceId={invoice.id}
      />
    </AppLayout>
  );
}

