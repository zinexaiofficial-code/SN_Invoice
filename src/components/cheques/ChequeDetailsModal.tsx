"use client";

import React from "react";
import {
  X,
  Calendar,
  Building2,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  RotateCcw,
  Trash2,
  Layers,
  Image as ImageIcon
} from "lucide-react";
import { Cheque } from "@/types";

interface ChequeDetailsModalProps {
  cheque: Cheque | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (cheque: Cheque) => void;
  onUpdateStatus: (cheque: Cheque) => void;
  onDelete: (cheque: Cheque) => void;
}

export function ChequeDetailsModal({
  cheque,
  isOpen,
  onClose,
  onEdit,
  onUpdateStatus,
  onDelete
}: ChequeDetailsModalProps) {
  if (!isOpen || !cheque) return null;

  const isIncoming = cheque.type === "incoming";
  const isCleared = cheque.status === "cleared";
  const isReturned = cheque.status === "returned";

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "cleared":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "returned":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "pending_deposit":
      case "pending_presentation":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "deposited":
      case "presented":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "received":
      case "issued":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "cancelled":
        return "bg-slate-100 text-slate-800 border-slate-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-navy-950 text-white p-5 flex items-start justify-between border-b border-navy-900">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono uppercase">
                {isIncoming ? "Incoming Cheque" : "Outgoing Cheque"}
              </span>
              {cheque.billingEntityPrefix && (
                <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-bold">
                  {cheque.billingEntityPrefix}
                </span>
              )}
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border capitalize ${getStatusBadgeClass(
                  cheque.status
                )}`}
              >
                {cheque.status.replace("_", " ")}
              </span>
            </div>

            <h2 className="text-xl font-black text-white mt-2 flex items-center space-x-2">
              <span>Cheque #{cheque.chequeNumber}</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {cheque.drawerBank} {cheque.branch ? `— ${cheque.branch}` : ""}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Main Amount Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-500 font-medium">Face Value / Cheque Amount</span>
              <p className="text-2xl font-black text-slate-900">
                Rs. {Number(cheque.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {isIncoming ? "Payer (Client): " : "Payee (Vendor): "}
                <span className="font-bold text-slate-900">{cheque.payerOrPayeeName}</span>
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  onClose();
                  onUpdateStatus(cheque);
                }}
                className="px-3.5 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Update Status</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onEdit(cheque);
                }}
                className="p-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                title="Edit Cheque Details"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete Cheque #${cheque.chequeNumber}?`)) {
                    onDelete(cheque);
                    onClose();
                  }
                }}
                className="p-2 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                title="Delete Cheque"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Returned Alert Banner if returned */}
          {isReturned && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Cheque Returned (Dishonoured) — Action Required</span>
              </div>
              <p className="text-xs text-rose-900">
                <strong>Return Reason:</strong> {cheque.returnReason || "Refer to Drawer"}
              </p>
              {cheque.bankCharges && (
                <p className="text-xs text-rose-900">
                  <strong>Bank Charges Debited:</strong> Rs.{" "}
                  {Number(cheque.bankCharges).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              )}
              {cheque.followUpDate && (
                <p className="text-xs text-rose-900">
                  <strong>Follow-up Scheduled Date:</strong> {cheque.followUpDate}
                </p>
              )}
              {cheque.replacementChequeRef && (
                <p className="text-xs text-rose-900">
                  <strong>Replacement Cheque:</strong> {cheque.replacementChequeRef}
                </p>
              )}
            </div>
          )}

          {/* Dates & Entity Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block mb-0.5">Cheque Date</span>
              <span className="font-bold text-slate-800">{cheque.chequeDate}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block mb-0.5">
                {isIncoming ? "Received Date" : "Issue Date"}
              </span>
              <span className="font-bold text-slate-800">{cheque.receivedOrIssuedDate}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block mb-0.5">
                {isIncoming ? "Expected Deposit" : "Expected Presentation"}
              </span>
              <span className="font-bold text-slate-800">{cheque.expectedActionDate}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block mb-0.5">Billing Entity</span>
              <span className="font-bold text-slate-800">{cheque.billingEntityName}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block mb-0.5">Target/Issuing Bank A/C</span>
              <span className="font-mono font-bold text-slate-800">
                {cheque.bankAccountNumber || "Entity Account"}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block mb-0.5">Clearance Status</span>
              <span className="font-bold text-slate-800">
                {isCleared ? `Cleared on ${cheque.actualClearanceDate}` : "Pending Clearance"}
              </span>
            </div>
          </div>

          {/* Purpose & Notes */}
          {(cheque.purposeOfPayment || cheque.billReference || cheque.notes) && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              {cheque.purposeOfPayment && (
                <p>
                  <strong className="text-slate-700">Purpose:</strong> {cheque.purposeOfPayment}
                </p>
              )}
              {cheque.billReference && (
                <p>
                  <strong className="text-slate-700">Bill/Ref:</strong> {cheque.billReference}
                </p>
              )}
              {cheque.notes && (
                <p>
                  <strong className="text-slate-700">Notes:</strong> {cheque.notes}
                </p>
              )}
            </div>
          )}

          {/* Linked Invoices Section */}
          {cheque.invoiceAllocations && cheque.invoiceAllocations.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Linked Invoices ({cheque.invoiceAllocations.length})</span>
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {cheque.invoiceAllocations.map((alloc) => (
                  <div key={alloc.id} className="p-3 flex items-center justify-between bg-white">
                    <div>
                      <span className="font-bold text-slate-900">Invoice #{alloc.invoiceNumber}</span>
                      <p className="text-[11px] text-slate-500">
                        {isCleared ? "Payment recorded to invoice" : "Pending clearance before posting payment"}
                      </p>
                    </div>
                    <span className="font-bold font-mono text-emerald-700">
                      Rs. {Number(alloc.allocatedAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cheque Images */}
          {(cheque.imageFrontUrl || cheque.imageBackUrl) && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cheque Image Attachments</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cheque.imageFrontUrl && (
                  <div className="border border-slate-200 rounded-xl p-2 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Front Side
                    </span>
                    <img
                      src={cheque.imageFrontUrl}
                      alt="Front"
                      className="w-full h-36 object-contain rounded-lg bg-white border border-slate-200"
                    />
                  </div>
                )}
                {cheque.imageBackUrl && (
                  <div className="border border-slate-200 rounded-xl p-2 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Back / Endorsement
                    </span>
                    <img
                      src={cheque.imageBackUrl}
                      alt="Back"
                      className="w-full h-36 object-contain rounded-lg bg-white border border-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status History Audit Trail */}
          {cheque.statusHistory && cheque.statusHistory.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Status & Audit History ({cheque.statusHistory.length})</span>
              </h4>
              <div className="space-y-2 border-l-2 border-slate-200 ml-3 pl-4 py-1">
                {cheque.statusHistory.map((sh, idx) => (
                  <div key={sh.id || idx} className="text-xs relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute -left-[21px] top-1 ring-4 ring-white" />
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800 capitalize">
                        {sh.newStatus.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {sh.changedAt ? new Date(sh.changedAt).toLocaleString("en-US") : ""}
                      </span>
                    </div>
                    {sh.notes && <p className="text-slate-600 text-[11px] mt-0.5">{sh.notes}</p>}
                    {sh.returnReason && (
                      <p className="text-rose-600 text-[11px]">Reason: {sh.returnReason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            ID: {cheque.id} • Created: {cheque.createdAt?.split("T")[0]}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

