"use client";

import React, { useState } from "react";
import { Invoice, PaymentMethod } from "@/types";
import { storage } from "@/lib/storage";
import { formatLKR, formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, CheckCircle, CreditCard, Banknote, Building2 } from "lucide-react";

interface RecordPaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded?: (updatedInvoice: Invoice) => void;
}

export function RecordPaymentModal({ invoice, isOpen, onClose, onPaymentRecorded }: RecordPaymentModalProps) {
  const [amount, setAmount] = useState<number>(invoice.outstandingBalance);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleRecord = () => {
    setError("");
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid payment amount greater than zero.");
      return;
    }

    if (amount > invoice.outstandingBalance) {
      setError(`Payment amount exceeds the outstanding balance (${formatLKR(invoice.outstandingBalance)}).`);
      return;
    }

    try {
      const updated = storage.recordPayment(invoice.id, {
        amount,
        paymentDate,
        paymentMethod,
        transactionRef,
        notes
      });

      if (onPaymentRecorded) onPaymentRecorded(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to record payment");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-navy-950">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <span>Record Payment — #{invoice.invoiceNumber}</span>
          </DialogTitle>
          <DialogDescription>
            Record client payment for {invoice.clientSnapshot?.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Financial Overview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Grand Total:</span>
              <span className="font-bold text-slate-900 font-mono">{formatLKR(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Confirmed Paid:</span>
              <span className="font-bold text-emerald-700 font-mono">{formatLKR(invoice.totalPaid)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
              <span className="font-bold text-navy-950">Outstanding Balance:</span>
              <span className="font-bold text-rose-600 font-mono">{formatLKR(invoice.outstandingBalance)}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          {/* Amount field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label htmlFor="paymentAmount">Payment Amount (LKR) *</Label>
              <button
                type="button"
                onClick={() => setAmount(invoice.outstandingBalance)}
                className="text-xs text-navy-900 font-bold hover:underline"
              >
                Full Balance
              </button>
            </div>
            <Input
              id="paymentAmount"
              type="number"
              step="0.01"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="text-base font-bold font-mono"
            />
          </div>

          {/* Payment Method selector */}
          <div className="space-y-1">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("bank_transfer")}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center space-y-1 transition-all ${
                  paymentMethod === "bank_transfer"
                    ? "border-navy-900 bg-navy-50 text-navy-950 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Building2 className="w-4 h-4 text-navy-900" />
                <span>Bank Transfer</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("cheque")}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center space-y-1 transition-all ${
                  paymentMethod === "cheque"
                    ? "border-navy-900 bg-navy-50 text-navy-950 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CreditCard className="w-4 h-4 text-navy-900" />
                <span>Cheque</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center space-y-1 transition-all ${
                  paymentMethod === "cash"
                    ? "border-navy-900 bg-navy-50 text-navy-950 shadow-sm"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Banknote className="w-4 h-4 text-navy-900" />
                <span>Cash</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="payDate">Payment Date</Label>
            <Input
              id="payDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="txRef">Transaction Ref / Cheque No.</Label>
            <Input
              id="txRef"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. SEYLAN-TRF-9021 or Cheque #004921"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received 75% advance payment"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleRecord} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <CheckCircle className="w-4 h-4 mr-1.5" />
            <span>Confirm &amp; Record</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

