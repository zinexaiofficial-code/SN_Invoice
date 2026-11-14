"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Invoice, InvoiceTemplateKey, InvoicePdfFormat, PdfTypographySettings } from "@/types";
import { storage } from "@/lib/storage";
import { downloadInvoicePdf } from "@/lib/pdf";
import { getVerificationUrl } from "@/lib/crypto";
import { resolveTypography } from "@/lib/pdfTypography";
import { InvoiceTemplateRenderer } from "@/components/invoices/InvoiceTemplateRenderer";
import { PdfLayoutControls } from "@/components/invoices/PdfLayoutControls";
import { ArrowLeft } from "lucide-react";

export default function InvoicePrintPDFPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = params.id as string;
  const templateParam = searchParams.get("template") as InvoiceTemplateKey | null;
  const formatParam = searchParams.get("format") as InvoicePdfFormat | null;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [format, setFormat] = useState<InvoicePdfFormat>(formatParam || "digital");
  const [templateKey, setTemplateKey] = useState<InvoiceTemplateKey>(templateParam || "standard");
  const [typography, setTypography] = useState<PdfTypographySettings>(() =>
    resolveTypography()
  );
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const inv = storage.getInvoiceById(invoiceId);
    if (inv) {
      setInvoice(inv);
      if (templateParam) {
        setTemplateKey(templateParam);
      } else if (inv.templateKey) {
        setTemplateKey(inv.templateKey);
      }

      if (formatParam) {
        setFormat(formatParam);
      } else if (inv.status === "draft") {
        setFormat("print");
      }

      // Initial typography from invoice or billing entity
      const initialTypo = resolveTypography(
        inv.pdfLayout || inv.billingSnapshot?.pdfLayout,
        inv.items,
        inv.vatApplicable,
        Boolean(inv.specialNotes)
      );
      setTypography(initialTypo);
    }
  }, [invoiceId, templateParam, formatParam]);

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-slate-500 font-sans">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold">Loading A4 Invoice PDF Document...</p>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const prefix = invoice.billingSnapshot?.prefix || "SN";
      const cleanNum = invoice.invoiceNumber.startsWith(prefix) ? invoice.invoiceNumber : `${prefix}-${invoice.invoiceNumber}`;
      const filename = `${cleanNum}-${format === "digital" ? "Digital" : "Print"}.pdf`;

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
      console.error("PDF download failed:", err);
      alert("Failed to export PDF file. You can use browser Print -> Save as PDF instead.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white p-4 md:p-8 font-sans">
      {/* Back Link */}
      <div className="max-w-[210mm] mx-auto mb-3 print:hidden">
        <Link
          href={`/invoices/${invoice.id}`}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold py-1 px-2 rounded hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoice #{invoice.invoiceNumber}</span>
        </Link>
      </div>

      {/* Interactive PDF Layout Settings & Action Controls */}
      <PdfLayoutControls
        format={format}
        onFormatChange={setFormat}
        templateKey={templateKey}
        onTemplateChange={setTemplateKey}
        typography={typography}
        onTypographyChange={setTypography}
        zoomScale={zoomScale}
        onZoomChange={setZoomScale}
        onDownload={handleDownload}
        onPrint={handlePrint}
        isDownloading={isDownloading}
        downloadDisabled={format === "digital" && invoice.status === "draft"}
      />

      {/* A4 Printable Document Container */}
      <div className="flex justify-center print:m-0 print:p-0">
        <InvoiceTemplateRenderer
          invoice={{ ...invoice, templateKey }}
          format={format}
          printMode={true}
          typographySettings={typography}
          zoomScale={zoomScale}
        />
      </div>

      {/* Strict ISO A4 Print Stylesheet */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
          .a4-page-sheet {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            transform: none !important;
          }
          .print\\:hidden,
          header,
          nav {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
