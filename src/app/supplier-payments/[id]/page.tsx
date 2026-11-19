"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Wallet,
  CreditCard,
  Printer,
  Edit,
  Trash2,
  Calendar,
  Building2,
  Tv,
  Radio,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Percent,
  XCircle,
  RotateCcw,
  DollarSign
} from "lucide-react";
import { useDatabase } from "@/context/DatabaseContext";
import {
  SupplierPayable,
  Supplier,
  SupplierPaymentTransaction,
  MediaSchedule,
  BillingEntity,
  Client
} from "@/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { RecordPaymentModal } from "@/components/supplier-payments/RecordPaymentModal";
import { SupplierPayableModal } from "@/components/supplier-payments/SupplierPayableModal";
import { SupplierStatementModal } from "@/components/supplier-payments/SupplierStatementModal";
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

export default function SupplierPayableDetailPage() {
  const router = useRouter();
  const params = useParams();
  const payableId = params?.id as string;

  const {
    supplierPayables,
    suppliers,
    schedules,
    billingEntities,
    clients,
    deleteSupplierPayable,
    voidSupplierPayment
  } = useDatabase();

  const [payable, setPayable] = useState<SupplierPayable | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  // Void transaction modal
  const [voidTargetTx, setVoidTargetTx] = useState<SupplierPaymentTransaction | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState("");

  // Sync payable from database state
  useEffect(() => {
    const found = supplierPayables.find((p) => p.id === payableId);
    if (found) {
      setPayable(found);
    } else {
      // Fetch directly if not in state yet
      fetch(`/api/supplier-payables/${payableId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setPayable(json.data);
          }
        })
        .catch(console.error);
    }
  }, [payableId, supplierPayables]);

  // Resolve associated entities
  const supplier = useMemo(() => {
    if (!payable?.supplierId) return null;
    return suppliers.find((s) => s.id === payable.supplierId) || null;
  }, [payable?.supplierId, suppliers]);

  const schedule = useMemo(() => {
    if (!payable?.mediaScheduleId) return null;
    return schedules.find((s) => s.id === payable.mediaScheduleId) || null;
  }, [payable?.mediaScheduleId, schedules]);

  const billingEntity = useMemo(() => {
    if (!payable?.billingEntityId) return null;
    return billingEntities.find((e) => e.id === payable.billingEntityId) || null;
  }, [payable?.billingEntityId, billingEntities]);

  const client = useMemo(() => {
    const cId = payable?.clientId || schedule?.clientId;
    if (!cId) return null;
    return clients.find((c) => c.id === cId) || null;
  }, [payable?.clientId, schedule?.clientId, clients]);

  if (!payable) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-slate-500 text-xs">
          Loading supplier payable details...
        </div>
      </AppLayout>
    );
  }

  // Calculate percentage paid
  const percentPaid = payable.totalAmount > 0
    ? Math.min(100, Math.round((payable.totalPaid / payable.totalAmount) * 100))
    : 0;

  // Overdue check
  const isOverdue =
    payable.outstandingAmount > 0 &&
    payable.dueDate &&
    new Date(payable.dueDate) < new Date(new Date().toDateString());

  // Delete payable handler
  const handleDelete = async () => {
    if (!confirm(`Delete payable "${payable.payableNumber || payable.payableReference}"? This action cannot be undone.`)) return;
    try {
      await deleteSupplierPayable(payable.id);
      router.push("/supplier-payments");
    } catch (err: any) {
      console.error("Failed to delete payable:", err);
      alert(err?.message || "Failed to delete payable.");
    }
  };

  // Void transaction handler
  const handleConfirmVoid = async () => {
    if (!voidTargetTx) return;
    if (!voidReason.trim()) {
      setVoidError("Please provide an audit reason for voiding this payment.");
      return;
    }
    setIsVoiding(true);
    setVoidError("");
    try {
      await voidSupplierPayment(voidTargetTx.id, voidReason.trim());
      setVoidTargetTx(null);
      setVoidReason("");
    } catch (err: any) {
      console.error("Failed to void payment:", err);
      setVoidError(err.message || "Failed to void payment.");
    } finally {
      setIsVoiding(false);
    }
  };

  // Campaign Profitability calculation
  const campaignRevenue = schedule ? schedule.netTotal : 0;
  const supplierCost = payable.totalAmount;
  const estimatedGrossMargin = campaignRevenue - supplierCost;
  const marginPercentage = campaignRevenue > 0
    ? Math.round((estimatedGrossMargin / campaignRevenue) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-5 pb-12">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <Link
              href="/supplier-payments"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Supplier Payments</span>
            </Link>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {payable.payableNumber}
              </h1>

              {/* Status Badge */}
              {payable.status === "paid" || payable.status === "fully_paid" || payable.outstandingAmount <= 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle className="w-3.5 h-3.5" /> Fully Paid
                </span>
              ) : isOverdue ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                  <AlertCircle className="w-3.5 h-3.5" /> Overdue
                </span>
              ) : payable.totalPaid > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  <Clock className="w-3.5 h-3.5" /> Partially Paid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  <Clock className="w-3.5 h-3.5" /> Unpaid
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {payable.outstandingAmount > 0 && (
              <button
                type="button"
                onClick={() => setIsRecordPaymentOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                <span>Record Payment</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsStatementOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Statement & Voucher</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center space-x-1 px-2.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
              title="Edit Bill"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center space-x-1 px-2.5 py-2 bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold transition-colors"
              title="Delete Bill"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Settlement Overview */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wide">
              Payment Settlement Progress: {percentPaid}%
            </span>
            <span className="font-mono text-slate-600">
              Paid: <strong>Rs. {payable.totalPaid.toLocaleString()}</strong> of{" "}
              <strong>Rs. {payable.totalAmount.toLocaleString()}</strong>
            </span>
          </div>

          {/* Bar */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
            <div
              className={`h-full transition-all duration-500 ${
                percentPaid >= 100
                  ? "bg-emerald-600"
                  : percentPaid > 0
                  ? "bg-emerald-500"
                  : "bg-slate-200"
              }`}
              style={{ width: `${percentPaid}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1 text-center text-xs">
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Bill</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                Rs. {payable.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <span className="text-[10px] text-emerald-600 uppercase block font-semibold">Total Settled</span>
              <span className="font-mono font-bold text-emerald-800 text-sm">
                Rs. {payable.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg">
              <span className="text-[10px] text-rose-600 uppercase block font-semibold">Remaining Balance</span>
              <span className="font-mono font-bold text-rose-800 text-sm">
                Rs. {payable.outstandingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT COLUMN (7 cols): Bill Breakdown & Linked Schedule */}
          <div className="lg:col-span-7 space-y-5">
            {/* Bill Details Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Bill Particulars & Commercial Breakdown</span>
              </h2>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Billing Entity</span>
                  <span className="font-bold text-slate-800">{billingEntity?.name || "SN Advertising"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Supplier Invoice #</span>
                  <span className="font-mono font-bold text-slate-800">
                    {payable.supplierInvoiceNumber || "Not Provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bill Date</span>
                  <span className="font-medium text-slate-800">{payable.billDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Payment Due Date</span>
                  <span className={`font-bold ${isOverdue ? "text-rose-700" : "text-slate-800"}`}>
                    {payable.dueDate} {isOverdue && "(Past Due)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Payment Terms</span>
                  <span className="font-medium text-slate-800">{payable.paymentTerms || "Net 30"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Channel</span>
                  <span className="font-bold text-slate-800 uppercase">{payable.channelName || "-"}</span>
                </div>
              </div>

              {/* Financial Calculation Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <div className="flex justify-between p-2.5 border-b border-slate-100 bg-slate-50">
                  <span className="text-slate-600">Gross Bill Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">
                    Rs. {payable.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {payable.discount > 0 && (
                  <div className="flex justify-between p-2.5 border-b border-slate-100 text-rose-600">
                    <span>Trade Discount:</span>
                    <span className="font-mono">
                      - Rs. {payable.discount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {payable.taxAmount > 0 && (
                  <div className="flex justify-between p-2.5 border-b border-slate-100 text-slate-700">
                    <span>VAT / Applicable Tax ({payable.taxRate}%):</span>
                    <span className="font-mono">
                      + Rs. {payable.taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between p-3 bg-slate-100 font-black text-slate-900">
                  <span className="uppercase">Total Amount Payable:</span>
                  <span className="font-mono text-sm">
                    Rs. {payable.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {(payable.description || payable.notes) && (
                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                  {payable.description && (
                    <p className="text-slate-700">
                      <strong>Description:</strong> {payable.description}
                    </p>
                  )}
                  {payable.notes && (
                    <p className="text-slate-500 text-[11px]">
                      <strong>Internal Notes:</strong> {payable.notes}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Linked Schedule & Campaign Profitability Card */}
            {schedule && (
              <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-xs space-y-4 bg-blue-50/20">
                <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                  <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                    <Tv className="w-4 h-4 text-blue-600" />
                    <span>Linked Media Schedule & Campaign</span>
                  </h2>
                  <Link
                    href={`/schedules/${schedule.id}`}
                    className="text-xs font-bold text-blue-700 hover:underline"
                  >
                    View Schedule &rarr;
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Schedule Number</span>
                    <span className="font-mono font-bold text-slate-900">{schedule.scheduleNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Advertiser / Client</span>
                    <span className="font-bold text-slate-800">
                      {client?.name || client?.companyName || "Client"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Campaign Name</span>
                    <span className="text-slate-800 font-medium">{schedule.campaignName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Spots & Period</span>
                    <span className="text-slate-800">
                      {schedule.totalSpots} spots ({schedule.startDate} &rarr; {schedule.endDate})
                    </span>
                  </div>
                </div>

                {/* Campaign Margin / Profitability Meter */}
                <div className="p-3.5 bg-white border border-blue-200 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Campaign Profitability (Estimated)</span>
                    </span>
                    <span className="font-mono text-emerald-700 font-black">
                      {marginPercentage}% Margin
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="p-2 bg-slate-50 rounded">
                      <span className="text-[10px] text-slate-400 block">Customer Revenue</span>
                      <span className="font-mono font-bold text-slate-800">
                        Rs. {campaignRevenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <span className="text-[10px] text-slate-400 block">Supplier Cost</span>
                      <span className="font-mono font-bold text-rose-700">
                        Rs. {supplierCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded">
                      <span className="text-[10px] text-emerald-700 block">Gross Profit</span>
                      <span className="font-mono font-black text-emerald-800">
                        Rs. {estimatedGrossMargin.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (5 cols): Supplier Profile & Payment Transactions Ledger */}
          <div className="lg:col-span-5 space-y-5">
            {/* Supplier Profile Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Supplier / Broadcaster Profile</span>
              </h2>

              <div className="space-y-2 text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {supplier?.name || payable.supplierSnapshot?.name || "Supplier"}
                  </h3>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">
                    Code: {supplier?.code || payable.supplierSnapshot?.code || "SUP"} &bull; Type: {supplier?.type?.toUpperCase() || "TV/RADIO"}
                  </span>
                </div>

                <div className="text-slate-600 space-y-0.5 text-[11px] pt-1">
                  {supplier?.contactPerson && (
                    <p>Contact: <strong>{supplier.contactPerson}</strong></p>
                  )}
                  {supplier?.phone && <p>Phone: {supplier.phone}</p>}
                  {supplier?.email && <p>Email: {supplier.email}</p>}
                  {supplier?.address && <p>Address: {supplier.address}</p>}
                </div>

                {/* Bank Account */}
                {(supplier?.defaultBank || supplier?.defaultAccountNo) && (
                  <div className="mt-3 p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-emerald-700" /> Settlement Bank Details
                    </span>
                    <p className="font-semibold text-slate-800">{supplier.defaultBank}</p>
                    <p className="font-mono text-slate-900 font-bold">
                      A/C: {supplier.defaultAccountNo}
                    </p>
                    {supplier.defaultBranch && (
                      <p className="text-[11px] text-slate-600">Branch: {supplier.defaultBranch}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Transactions Ledger */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Payment Ledger & History</span>
                </h2>
                {payable.outstandingAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsRecordPaymentOpen(true)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold"
                  >
                    + Record Payment
                  </button>
                )}
              </div>

              {(!payable.transactions || payable.transactions.length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>No payments recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {payable.transactions.map((tx) => {
                    const isVoided = tx.status === "voided" || tx.status === "void";
                    return (
                      <div
                        key={tx.id}
                        className={`p-3 rounded-lg border text-xs space-y-1 transition-all ${
                          isVoided
                            ? "bg-slate-50 border-slate-200 opacity-60 line-through"
                            : "bg-white border-slate-200 hover:border-emerald-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 font-mono text-sm">
                            Rs. {tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                                isVoided
                                  ? "bg-red-100 text-red-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {tx.status}
                            </span>
                            {!isVoided && (
                              <button
                                type="button"
                                onClick={() => {
                                  setVoidTargetTx(tx);
                                  setVoidReason("");
                                  setVoidError("");
                                }}
                                className="text-[10px] text-slate-400 hover:text-rose-600 font-medium"
                                title="Void Payment"
                              >
                                Void
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span>
                            {tx.paymentDate} &bull; {tx.paymentMethod.replace("_", " ").toUpperCase()}
                          </span>
                          {tx.referenceNumber && (
                            <span className="font-mono">Ref: {tx.referenceNumber}</span>
                          )}
                        </div>

                        {tx.notes && (
                          <p className="text-slate-500 text-[11px] italic">"{tx.notes}"</p>
                        )}

                        {isVoided && tx.voidReason && (
                          <p className="text-red-700 text-[10px] font-semibold no-underline pt-0.5">
                            Void reason: {tx.voidReason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          payable={payable}
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
        />
      )}

      {/* Edit Payable Modal */}
      {isEditModalOpen && (
        <SupplierPayableModal
          payable={payable}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={(updated) => setPayable(updated)}
        />
      )}

      {/* Statement / Voucher Modal */}
      {isStatementOpen && (
        <SupplierStatementModal
          payable={payable}
          onClose={() => setIsStatementOpen(false)}
        />
      )}

      {/* Void Payment Confirmation Dialog */}
      {voidTargetTx && (
        <Dialog open={Boolean(voidTargetTx)} onOpenChange={() => setVoidTargetTx(null)}>
          <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-2xl">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-700">
                <AlertCircle className="w-5 h-5" />
                <DialogTitle className="text-base font-bold text-slate-900">
                  Void Payment Transaction
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Voiding Rs. {voidTargetTx.amount.toLocaleString()} paid on {voidTargetTx.paymentDate}. This will reverse the payable balance and maintain an audit log.
              </DialogDescription>
            </DialogHeader>

            {voidError && (
              <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {voidError}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Audit Reason for Voiding <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Cheque returned unpaid / Entry recorded in error"
                  className="text-xs"
                  required
                />
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVoidTargetTx(null)}
                disabled={isVoiding}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmVoid}
                disabled={isVoiding || !voidReason.trim()}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                {isVoiding ? "Voiding..." : "Confirm & Reverse"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
