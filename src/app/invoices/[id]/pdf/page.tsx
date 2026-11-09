"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Invoice, InvoiceTemplateKey } from "@/types";
import { storage } from "@/lib/storage";
import { InvoiceTemplateRenderer } from "@/components/invoices/InvoiceTemplateRenderer";
import { Button } from "@/components/ui/button";
import { Printer, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function InvoicePrintPDFPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = params.id as string;
  const templateParam = searchParams.get("template") as InvoiceTemplateKey | null;

  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const inv = storage.getInvoiceById(invoiceId);
    if (inv) {
      if (templateParam) {
        setInvoice({ ...inv, templateKey: templateParam });
      } else {
        setInvoice(inv);
      }
    }
  }, [invoiceId, templateParam]);

  if (!invoice) {
    return <div className="p-8 text-center text-slate-500">Loading invoice PDF...</div>;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white p-4 md:p-8">
      {/* Top Floating Action Bar (Hidden when printed) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/invoices/${invoice.id}`}
          className="inline-flex items-center space-x-1.5 text-sm text-slate-600 hover:text-navy-950 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoice</span>
        </Link>

        <div className="flex items-center space-x-3">
          <Button
            onClick={handlePrint}
            className="bg-navy-950 text-white hover:bg-navy-900 flex items-center space-x-2 shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF (A4)</span>
          </Button>
        </div>
      </div>

      {/* A4 Printable Document Container */}
      <div className="flex justify-center print:m-0 print:p-0">
        <InvoiceTemplateRenderer invoice={invoice} printMode={true} />
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
            margin: 12mm 10mm 12mm 10mm;
          }
        }
      `}</style>
    </div>
  );
}

