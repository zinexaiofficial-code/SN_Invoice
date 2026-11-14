"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Invoice, InvoiceTemplateKey, InvoicePdfFormat } from "@/types";
import { storage } from "@/lib/storage";
import { downloadInvoicePdf } from "@/lib/pdf";
import { getVerificationUrl } from "@/lib/crypto";
import { InvoiceTemplateRenderer } from "@/components/invoices/InvoiceTemplateRenderer";
import { Button } from "@/components/ui/button";
import { Printer, Download, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function InvoicePrintPDFPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = params.id as string;
  const templateParam = searchParams.get("template") as InvoiceTemplateKey | null;
  const formatParam = searchParams.get("format") as InvoicePdfFormat | null;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [format, setFormat] = useState<InvoicePdfFormat>(formatParam || "digital");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const inv = storage.getInvoiceById(invoiceId);
    if (inv) {
      if (templateParam) {
        setInvoice({ ...inv, templateKey: templateParam });
      } else {
        setInvoice(inv);
      }
      if (formatParam) {
        setFormat(formatParam);
      } else if (inv.status === "draft") {
        setFormat("print");
      }
    }
  }, [invoiceId, templateParam, formatParam]);

  if (!invoice) {
    return <div className="p-8 text-center text-slate-500">Loading invoice PDF...</div>;
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const filename =
        format === "digital"
          ? `${invoice.invoiceNumber}-Digital.pdf`
          : `${invoice.invoiceNumber}-Print.pdf`;

      const verificationUrl =
        format === "digital"
          ? getVerificationUrl(invoice.verificationToken || invoice.id)
          : undefined;

      await downloadInvoicePdf({
        elementId: "printable-invoice",
        filename,
        verificationUrl,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF file. You can use Print / Save as PDF instead.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white p-4 md:p-8 font-sans">
      {/* Top Floating Action Bar (Hidden when printed) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
        <Link
          href={`/invoices/${invoice.id}`}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-navy-950 font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoice #{invoice.invoiceNumber}</span>
        </Link>

        {/* Format Selector Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFormat("digital")}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
              format === "digital"
                ? "bg-navy-950 text-white shadow-xs"
                : "text-slate-600 hover:text-navy-950"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Digital Signature (Adobe)</span>
          </button>

          <button
            type="button"
            onClick={() => setFormat("print")}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
              format === "print" || format === "blank"
                ? "bg-navy-950 text-white shadow-xs"
                : "text-slate-600 hover:text-navy-950"
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Blank Signature (Hard Copy)</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleDownload}
            disabled={isDownloading || (format === "digital" && invoice.status === "draft")}
            className="bg-navy-950 text-white hover:bg-navy-900 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isDownloading ? "Exporting..." : `Download ${format === "digital" ? "Digital" : "Print"} PDF`}</span>
          </Button>

          <Button
            variant="outline"
            onClick={handlePrint}
            className="text-xs font-bold flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-700" />
            <span>Print View</span>
          </Button>
        </div>
      </div>

      {/* A4 Printable Document Container */}
      <div className="flex justify-center print:m-0 print:p-0">
        <InvoiceTemplateRenderer
          invoice={invoice}
          format={format}
          printMode={true}
        />
      </div>

      {/* Print Specific CSS */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 10mm 10mm;
          }
        }
      `}</style>
    </div>
  );
}
