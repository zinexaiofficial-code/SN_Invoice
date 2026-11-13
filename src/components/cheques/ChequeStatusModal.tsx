"use client";

import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Ban,
  Clock,
  DollarSign,
  Calendar,
  FileText
} from "lucide-react";
import { Cheque, ChequeStatus, IncomingChequeStatus, OutgoingChequeStatus } from "@/types";
import { storage } from "@/lib/storage";

interface ChequeStatusModalProps {
  cheque: Cheque | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function ChequeStatusModal({ cheque, isOpen, onClose, onUpdated }: ChequeStatusModalProps) {
  if (!isOpen || !cheque) return null;

  const isIncoming = cheque.type === "incoming";
  const [newStatus, setNewStatus] = useState<ChequeStatus>(cheque.status);
  const [clearedDate, setClearedDate] = useState<string>(
    cheque.actualClearanceDate || new Date().toISOString().split("T")[0]
  );
  const [returnReason, setReturnReason] = useState<string>(cheque.returnReason || "Refer to Drawer (Insufficient funds)");
  const [bankCharges, setBankCharges] = useState<number>(cheque.bankCharges || 1500);
  const [followUpDate, setFollowUpDate] = useState<string>(
    cheque.followUpDate || new Date().toISOString().split("T")[0]
  );
  const [replacementChequeRef, setReplacementChequeRef] = useState<string>(cheque.replacementChequeRef || "");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const incomingStatuses: { value: IncomingChequeStatus; label: string; desc: string; color: string }[] = [
    { value: "received", label: "Received", desc: "Cheque in hand, awaiting deposit preparation", color: "bg-blue-100 text-blue-800" },
    { value: "pending_deposit", label: "Pending Deposit", desc: "Prepared for bank deposit", color: "bg-amber-100 text-amber-800" },
    { value: "deposited", label: "Deposited", desc: "Deposited at bank, awaiting clearance", color: "bg-indigo-100 text-indigo-800" },
    { value: "cleared", label: "Cleared / Realized", desc: "Funds confirmed in bank account", color: "bg-emerald-100 text-emerald-800" },
    { value: "returned", label: "Returned (Dishonoured)", desc: "Cheque bounced / returned by bank", color: "bg-rose-100 text-rose-800" },
    { value: "cancelled", label: "Cancelled", desc: "Cheque voided or cancelled by client", color: "bg-slate-100 text-slate-800" },
    { value: "replaced", label: "Replaced", desc: "New replacement cheque received", color: "bg-purple-100 text-purple-800" },
  ];

  const outgoingStatuses: { value: OutgoingChequeStatus; label: string; desc: string; color: string }[] = [
    { value: "prepared", label: "Prepared", desc: "Cheque written, awaiting signature/dispatch", color: "bg-slate-100 text-slate-800" },
    { value: "issued", label: "Issued / Handed Over", desc: "Dispatched to vendor/payee", color: "bg-blue-100 text-blue-800" },
    { value: "pending_presentation", label: "Pending Presentation", desc: "Payee holding cheque before presentation date", color: "bg-amber-100 text-amber-800" },
    { value: "presented", label: "Presented at Bank", desc: "Presented for debit at clearing", color: "bg-indigo-100 text-indigo-800" },
    { value: "cleared", label: "Cleared / Debited", desc: "Amount successfully debited from account", color: "bg-emerald-100 text-emerald-800" },
    { value: "returned", label: "Returned / Payment Stopped", desc: "Cheque returned or stopped", color: "bg-rose-100 text-rose-800" },
    { value: "cancelled", label: "Cancelled / Void", desc: "Cheque destroyed or cancelled", color: "bg-slate-200 text-slate-800" },
  ];

  const availableStatuses = isIncoming ? incomingStatuses : outgoingStatuses;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      storage.updateChequeStatus(cheque.id, newStatus, {
        notes,
        clearedDate: newStatus === "cleared" ? clearedDate : undefined,
        returnReason: newStatus === "returned" ? returnReason : undefined,
        bankCharges: newStatus === "returned" ? bankCharges : undefined,
        followUpDate: newStatus === "returned" ? followUpDate : undefined,
        replacementChequeRef: newStatus === "returned" || newStatus === "replaced" ? replacementChequeRef : undefined,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cheque-updated"));
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-navy-950 text-white p-5 flex items-center justify-between border-b border-navy-900">
          <div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono uppercase">
              {isIncoming ? "Incoming Cheque" : "Outgoing Cheque"}
            </span>
            <h2 className="text-lg font-bold text-white mt-1">
              Update Status — Cheque #{cheque.chequeNumber}
            </h2>
            <p className="text-xs text-slate-300">
              {isIncoming ? `Client: ${cheque.payerOrPayeeName}` : `Payee: ${cheque.payerOrPayeeName}`} • Rs.{" "}
              {Number(cheque.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Current vs New Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select New Status *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableStatuses.map((s) => {
                const isSelected = newStatus === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setNewStatus(s.value)}
                    className={`text-left p-2.5 rounded-xl border text-xs transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 font-semibold text-emerald-950 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{s.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Cleared Details */}
          {newStatus === "cleared" && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Funds Cleared Confirmation</h4>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    {isIncoming && cheque.invoiceAllocations && cheque.invoiceAllocations.length > 0
                      ? `Marking this cheque as cleared will automatically record payment on ${cheque.invoiceAllocations.length} linked invoice(s).`
                      : "Record the date this cheque cleared into your bank account."}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">
                  Actual Clearance Date *
                </label>
                <input
                  type="date"
                  value={clearedDate}
                  onChange={(e) => setClearedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* Conditional Returned Details */}
          {newStatus === "returned" && (
            <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-950">Returned Cheque Details</h4>
                  <p className="text-[11px] text-rose-800">
                    This will create an urgent action reminder and alert notification for follow-up.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-rose-950 mb-1">
                    Return Reason *
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    required
                  >
                    <option value="Refer to Drawer (Insufficient funds)">
                      Refer to Drawer (Insufficient funds)
                    </option>
                    <option value="Signature mismatch / irregular">Signature mismatch / irregular</option>
                    <option value="Payment stopped by drawer">Payment stopped by drawer</option>
                    <option value="Post-dated / Stale cheque">Post-dated / Stale cheque</option>
                    <option value="Account closed">Account closed</option>
                    <option value="Words and figures differ">Words and figures differ</option>
                    <option value="Other return reason">Other return reason</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-rose-950 mb-1">
                      Bank Return Charges (Rs.)
                    </label>
                    <input
                      type="number"
                      value={bankCharges}
                      onChange={(e) => setBankCharges(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      placeholder="1500.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-rose-950 mb-1">
                      Urgent Follow-up Date *
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rose-950 mb-1">
                    Replacement Cheque Reference / New Cheque Number
                  </label>
                  <input
                    type="text"
                    value={replacementChequeRef}
                    onChange={(e) => setReplacementChequeRef(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    placeholder="e.g. New Cheque #458999 requested"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes / Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Status Change Notes & Remarks
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              placeholder="e.g. Cheque deposited at Seylan Bank counter by accountant..."
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Confirm Status Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

