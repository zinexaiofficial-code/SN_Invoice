"use client";

import React, { useState, useEffect } from "react";
import { SupplierPayable, SupplierPaymentMethod } from "@/types";
import { useDatabase } from "@/context/DatabaseContext";
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
import {
  CreditCard,
  AlertCircle,
  Loader2,
  DollarSign,
  CheckCircle2,
  Building2,
  Calendar,
  FileCheck,
  ArrowRight
} from "lucide-react";

interface RecordPaymentModalProps {
  payable: SupplierPayable | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export function RecordPaymentModal({
  payable,
  isOpen,
  onClose,
  onPaymentSuccess
}: RecordPaymentModalProps) {
  const { recordSupplierPayment, cheques, suppliers } = useDatabase();

  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<SupplierPaymentMethod>("bank_transfer");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [chequeId, setChequeId] = useState<string>("");
  const [paidBy, setPaidBy] = useState<string>("Finance Dept");
  const [notes, setNotes] = useState<string>("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const outstanding = payable?.outstandingAmount ?? 0;

  useEffect(() => {
    if (payable) {
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setAmount(payable.outstandingAmount > 0 ? payable.outstandingAmount : 0);
      setPaymentMethod("bank_transfer");
      setReferenceNumber("");
      setChequeId("");
      setNotes("");
      setError("");
    }
  }, [payable, isOpen]);

  const handleFullPayClick = () => {
    if (payable) {
      setAmount(payable.outstandingAmount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payable) return;

    if (amount <= 0) {
      setError("Payment amount must be greater than Rs. 0.00.");
      return;
    }

    if (amount > payable.outstandingAmount + 0.01) {
      setError(
        `Payment amount (Rs. ${amount.toLocaleString()}) cannot exceed the outstanding balance (Rs. ${payable.outstandingAmount.toLocaleString()}).`
      );
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await recordSupplierPayment(payable.id, {
        paymentDate,
        amount: Number(amount),
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        chequeId: chequeId || undefined,
        paidBy: paidBy.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to record payment:", err);
      setError(err.message || "Failed to record payment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!payable) return null;

  // Filter outgoing cheques matching this supplier or general outgoing
  const relevantCheques = cheques.filter((ch) => ch.type === "outgoing");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white p-6 rounded-xl border border-slate-200 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2 text-navy-950">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Record Payment to Supplier
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Payable #{payable.payableNumber} &bull; {payable.supplierSnapshot?.name || "Supplier"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bill Summary Card */}
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-600">
            <span>Total Bill Amount:</span>
            <span className="font-mono font-bold text-slate-900">
              Rs. {payable.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Total Already Paid:</span>
            <span className="font-mono font-bold text-emerald-700">
              Rs. {payable.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
            <span>Outstanding Balance:</span>
            <span className="font-mono text-rose-700 text-sm">
              Rs. {payable.outstandingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          {/* Payment Amount with Quick Full Pay */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">
                Payment Amount (LKR) <span className="text-red-500">*</span>
              </Label>
              {payable.outstandingAmount > 0 && (
                <button
                  type="button"
                  onClick={handleFullPayClick}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline"
                >
                  Pay Full Balance (Rs. {payable.outstandingAmount.toLocaleString()})
                </button>
              )}
            </div>
            <Input
              type="number"
              min="0.01"
              max={payable.outstandingAmount}
              step="0.01"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="text-sm font-mono font-bold bg-white"
              required
            />
          </div>

          {/* Payment Date & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Payment Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="text-xs bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Payment Method</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as SupplierPaymentMethod)}
                className="w-full h-9 rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
              >
                <option value="bank_transfer">Bank Transfer (SLIPS/CEFT)</option>
                <option value="cheque">Company Cheque</option>
                <option value="cash">Cash Settlement</option>
                <option value="online">Online / Card</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Cheque specific picker if method is Cheque */}
          {paymentMethod === "cheque" && (
            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg space-y-2 text-xs">
              <Label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Link to Cheque Management (Optional)</span>
              </Label>
              <select
                value={chequeId}
                onChange={(e) => {
                  const selId = e.target.value;
                  setChequeId(selId);
                  const sel = relevantCheques.find((c) => c.id === selId);
                  if (sel) {
                    setReferenceNumber(`Cheque #${sel.chequeNumber}`);
                    if (!amount || amount === payable.outstandingAmount) {
                      setAmount(sel.amount);
                    }
                  }
                }}
                className="w-full h-8 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs shadow-sm"
              >
                <option value="">-- Manual Cheque or Select from Register --</option>
                {relevantCheques.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.chequeNumber} - Rs. {c.amount.toLocaleString()} - {c.payerOrPayeeName || c.supplierName || "Payee"} ({c.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reference Number & Paid By */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">
                Transaction / Cheque Ref #
              </Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. TXN-98402 / CHQ-1049"
                className="text-xs font-mono bg-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Paid By / Authorized By</Label>
              <Input
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                placeholder="e.g. Accounts Executive"
                className="text-xs bg-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Payment Notes / Remarks</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 50% advance for prime time broadcast"
              className="text-xs bg-white"
            />
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || amount <= 0}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Recording...
                </>
              ) : (
                "Confirm & Record Payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
