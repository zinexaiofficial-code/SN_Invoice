"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { Invoice } from "@/types";
import { storage } from "@/lib/storage";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const found = storage.getInvoiceById(invoiceId);
    if (found) {
      setInvoice(found);
    }
    setLoading(false);
  }, [invoiceId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-20 space-y-2">
          <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-semibold">Loading invoice #{invoiceId}...</p>
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout>
        <div className="text-center py-20 space-y-4">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-navy-950">Invoice not found</h2>
          <p className="text-sm text-slate-500">The invoice #{invoiceId} could not be located for editing.</p>
          <div className="flex justify-center space-x-2">
            <Button variant="outline" onClick={() => router.push("/invoices")}>Back to Invoices</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-2">
        <Link
          href={`/invoices/${invoice.id}`}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Invoice #{invoice.invoiceNumber}</span>
        </Link>
      </div>
      <InvoiceForm initialInvoice={invoice} />
    </AppLayout>
  );
}
