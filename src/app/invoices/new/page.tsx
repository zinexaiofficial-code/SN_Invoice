"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";

export default function NewInvoicePage() {
  return (
    <AppLayout>
      <InvoiceForm />
    </AppLayout>
  );
}

