"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  SupplierPayable,
  Supplier,
  MediaSchedule,
  BillingEntity,
  Client,
  SupplierPaymentStatus
} from "@/types";
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
  Building2,
  AlertCircle,
  Loader2,
  Calendar,
  FileText,
  DollarSign,
  Plus,
  Tv,
  Radio,
  CheckCircle,
  HelpCircle,
  Info
} from "lucide-react";
import { SupplierModal } from "./SupplierModal";

interface SupplierPayableModalProps {
  payable?: SupplierPayable | null;
  preselectedSchedule?: MediaSchedule | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (savedPayable: SupplierPayable) => void;
}

export function SupplierPayableModal({
  payable,
  preselectedSchedule,
  isOpen,
  onClose,
  onSaved
}: SupplierPayableModalProps) {
  const {
    suppliers,
    supplierPayables,
    schedules,
    billingEntities,
    clients,
    saveSupplierPayable,
    userRole
  } = useDatabase();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);

  // Form State
  const [billingEntityId, setBillingEntityId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [mediaScheduleId, setMediaScheduleId] = useState<string>("");
  const [payableNumber, setPayableNumber] = useState<string>("");
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>("");
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [channelName, setChannelName] = useState<string>("");
  const [campaignName, setCampaignName] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");

  // Commercial amounts
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [hasTax, setHasTax] = useState<boolean>(false);
  const [paymentTerms, setPaymentTerms] = useState<string>("Net 30");
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Auto-calculated totals
  const calculatedTaxAmount = useMemo(() => {
    if (!hasTax || taxRate <= 0) return 0;
    const base = Math.max(0, subtotal - discount);
    return Math.round(((base * taxRate) / 100) * 100) / 100;
  }, [subtotal, discount, hasTax, taxRate]);

  const calculatedTotal = useMemo(() => {
    const base = Math.max(0, subtotal - discount);
    return base + calculatedTaxAmount;
  }, [subtotal, discount, calculatedTaxAmount]);

  // Selected schedule object
  const activeSchedule = useMemo(() => {
    return schedules.find((s) => s.id === mediaScheduleId) || preselectedSchedule || null;
  }, [mediaScheduleId, preselectedSchedule, schedules]);

  // Generate unique payable reference number
  const generatePayableNumber = (entityId?: string) => {
    const entity = billingEntities.find((e) => e.id === entityId) || billingEntities[0];
    const prefix = entity?.prefix || (entity as any)?.invoicePrefix || "SN";
    const year = new Date().getFullYear();
    const count = supplierPayables.length + 1;
    return `PAY-${prefix}-${year}-${String(count).padStart(4, "0")}`;
  };

  // Pre-fill or initialize
  useEffect(() => {
    if (payable) {
      // Editing existing payable
      setBillingEntityId(payable.billingEntityId || "");
      setSupplierId(payable.supplierId || "");
      setMediaScheduleId(payable.mediaScheduleId || "");
      setPayableNumber(payable.payableNumber || "");
      setSupplierInvoiceNumber(payable.supplierInvoiceNumber || "");
      setBillDate(payable.billDate ? payable.billDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setDueDate(payable.dueDate ? payable.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setChannelName(payable.channelName || "");
      setCampaignName(payable.campaignName || "");
      setClientId(payable.clientId || "");
      setSubtotal(payable.subtotal || 0);
      setDiscount(payable.discount || 0);
      setTaxRate(payable.taxRate || 0);
      setHasTax((payable.taxAmount || 0) > 0 || (payable.taxRate || 0) > 0);
      setPaymentTerms(payable.paymentTerms || "Net 30");
      setDescription(payable.description || "");
      setNotes(payable.notes || "");
    } else {
      // Creating new payable
      const initialEntityId = preselectedSchedule?.billingEntityId || billingEntities[0]?.id || "";
      setBillingEntityId(initialEntityId);
      setPayableNumber(generatePayableNumber(initialEntityId));
      setSupplierInvoiceNumber("");
      const today = new Date().toISOString().slice(0, 10);
      setBillDate(today);

      if (preselectedSchedule) {
        setMediaScheduleId(preselectedSchedule.id);
        setChannelName(preselectedSchedule.mediaChannelName || "");
        setCampaignName(preselectedSchedule.campaignName || "");
        setClientId(preselectedSchedule.clientId || "");
        setDescription(
          `Media broadcast charges for ${preselectedSchedule.campaignName} on ${preselectedSchedule.mediaChannelName} (${preselectedSchedule.startDate} to ${preselectedSchedule.endDate})`
        );

        // Try to find matching supplier for this channel
        const matchedSup = suppliers.find((s) =>
          (s.channels || []).some(
            (ch) => ch.toLowerCase() === (preselectedSchedule.mediaChannelName || "").toLowerCase()
          )
        );
        if (matchedSup) {
          setSupplierId(matchedSup.id);
          setPaymentTerms(matchedSup.paymentTerms || "Net 30");
        } else {
          setSupplierId("");
          setPaymentTerms("Net 30");
        }
      } else {
        setMediaScheduleId("");
        setChannelName("");
        setCampaignName("");
        setClientId("");
        setSupplierId("");
        setDescription("");
        setPaymentTerms("Net 30");
      }

      setSubtotal(0);
      setDiscount(0);
      setTaxRate(18);
      setHasTax(false);
      setNotes("");

      // Due date calculation
      const due = new Date();
      due.setDate(due.getDate() + 30);
      setDueDate(due.toISOString().slice(0, 10));
    }
    setError("");
  }, [payable, preselectedSchedule, isOpen, billingEntities, suppliers]);

  // When Schedule changes in dropdown
  const handleScheduleChange = (selectedSchedId: string) => {
    setMediaScheduleId(selectedSchedId);
    if (!selectedSchedId) return;

    const sched = schedules.find((s) => s.id === selectedSchedId);
    if (sched) {
      if (sched.billingEntityId) {
        setBillingEntityId(sched.billingEntityId);
        if (!payable) {
          setPayableNumber(generatePayableNumber(sched.billingEntityId));
        }
      }
      setChannelName(sched.mediaChannelName || "");
      setCampaignName(sched.campaignName || "");
      setClientId(sched.clientId || "");
      if (!description) {
        setDescription(
          `Media broadcast charges for ${sched.campaignName} on ${sched.mediaChannelName} (${sched.startDate} to ${sched.endDate})`
        );
      }

      // Try auto-matching supplier
      const matchedSup = suppliers.find((s) =>
        (s.channels || []).some(
          (ch) => ch.toLowerCase() === (sched.mediaChannelName || "").toLowerCase()
        )
      );
      if (matchedSup && !supplierId) {
        setSupplierId(matchedSup.id);
        setPaymentTerms(matchedSup.paymentTerms || "Net 30");
      }
    }
  };

  // When Supplier changes in dropdown
  const handleSupplierChange = (selectedSupId: string) => {
    setSupplierId(selectedSupId);
    const sup = suppliers.find((s) => s.id === selectedSupId);
    if (sup && sup.paymentTerms) {
      setPaymentTerms(sup.paymentTerms);
      // Auto-adjust due date
      const daysMatch = sup.paymentTerms.match(/\d+/);
      const days = daysMatch ? parseInt(daysMatch[0], 10) : 30;
      const bDate = new Date(billDate || new Date());
      bDate.setDate(bDate.getDate() + days);
      setDueDate(bDate.toISOString().slice(0, 10));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!billingEntityId) {
      setError("Please select a Billing Entity.");
      return;
    }
    if (!supplierId) {
      setError("Please select a Supplier / Vendor.");
      return;
    }
    if (!payableNumber.trim()) {
      setError("Payable reference number is required.");
      return;
    }
    if (calculatedTotal <= 0) {
      setError("Total bill amount must be greater than Rs. 0.00.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const selectedSup = suppliers.find((s) => s.id === supplierId);
      const selectedEntity = billingEntities.find((e) => e.id === billingEntityId);
      const selectedClient = clients.find((c) => c.id === clientId);

      const totalPaid = payable?.totalPaid || 0;
      const outstanding = Math.max(0, calculatedTotal - totalPaid);

      // Determine payment status
      let status: SupplierPaymentStatus = "unpaid";
      if (totalPaid >= calculatedTotal && calculatedTotal > 0) {
        status = "paid";
      } else if (totalPaid > 0) {
        status = "partially_paid";
      } else {
        status = "unpaid";
      }

      // Check if overdue
      if (status !== "paid" && dueDate && new Date(dueDate) < new Date(new Date().toDateString())) {
        status = "overdue";
      }

      const payload: Partial<SupplierPayable> = {
        id: payable?.id,
        billingEntityId,
        supplierId,
        mediaScheduleId: mediaScheduleId || undefined,
        payableNumber: payableNumber.trim(),
        supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
        billDate,
        dueDate,
        channelName: channelName.trim() || undefined,
        campaignName: campaignName.trim() || undefined,
        clientId: clientId || undefined,
        subtotal: Number(subtotal) || 0,
        discount: Number(discount) || 0,
        taxRate: hasTax ? Number(taxRate) : 0,
        taxAmount: calculatedTaxAmount,
        totalAmount: calculatedTotal,
        totalPaid,
        outstandingAmount: outstanding,
        status,
        paymentTerms,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        supplierSnapshot: selectedSup
          ? {
              name: selectedSup.name,
              code: selectedSup.code,
              type: selectedSup.type,
              contactPerson: selectedSup.contactPerson,
              phone: selectedSup.phone,
              email: selectedSup.email,
              bankName: selectedSup.defaultBank,
              bankBranch: selectedSup.defaultBranch,
              accountNumber: selectedSup.defaultAccountNo,
            }
          : undefined,
      };

      const saved = await saveSupplierPayable(payload);
      if (onSaved) {
        onSaved(saved);
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to save supplier payable:", err);
      setError(err.message || "Failed to save supplier bill. Please check inputs.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-white p-6 rounded-xl border border-slate-200 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2 text-navy-950">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {payable ? `Edit Supplier Payable: ${payable.payableNumber}` : "Record Supplier Payable / Bill"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Track outgoing broadcast expenses, TV & Radio broadcaster invoices, and settlement obligations.
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

          <form onSubmit={handleSubmit} className="space-y-4 pt-3">
            {/* Top Bar: Billing Entity & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="sm:col-span-6 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Paying Company (Billing Entity) <span className="text-red-500">*</span>
                </Label>
                <select
                  value={billingEntityId}
                  onChange={(e) => {
                    const newEntityId = e.target.value;
                    setBillingEntityId(newEntityId);
                    if (!payable) {
                      setPayableNumber(generatePayableNumber(newEntityId));
                    }
                  }}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                  required
                >
                  <option value="">-- Select Billing Entity --</option>
                  {billingEntities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.prefix || (e as any).invoicePrefix || "SN"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-6 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Payable Ref Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={payableNumber}
                  onChange={(e) => setPayableNumber(e.target.value)}
                  placeholder="PAY-SN-2026-0001"
                  className="text-xs font-mono font-bold bg-white"
                  required
                />
              </div>
            </div>

            {/* Media Schedule Link Section (Crucial requirement) */}
            <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-blue-600" />
                  <span>Link to Media Schedule (Optional)</span>
                </Label>
                <span className="text-[10px] text-blue-700 font-medium">
                  Enables schedule margin calculation & campaign cost tracking
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-12">
                  <select
                    value={mediaScheduleId}
                    onChange={(e) => handleScheduleChange(e.target.value)}
                    className="w-full h-9 rounded-md border border-blue-200 bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                  >
                    <option value="">-- No Schedule (Standalone Expense / General Bill) --</option>
                    {schedules.map((s) => {
                      const client = clients.find((c) => c.id === s.clientId);
                      const clientName = client?.name || client?.companyName || "Client";
                      return (
                        <option key={s.id} value={s.id}>
                          {s.scheduleNumber} | {clientName} - {s.campaignName} ({s.mediaChannelName}) - Total: Rs. {s.netTotal?.toLocaleString()}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {activeSchedule && (
                <div className="p-2.5 bg-white border border-blue-100 rounded-md text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="text-blue-800">Campaign: {activeSchedule.campaignName}</span>
                    <span className="text-emerald-700 font-mono">
                      Client Invoice Value: Rs. {activeSchedule.netTotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>
                      Channel: <strong className="text-slate-700 uppercase">{activeSchedule.mediaChannelName}</strong> ({activeSchedule.mediaType.toUpperCase()})
                    </span>
                    <span>
                      Broadcast Period: {activeSchedule.startDate} &rarr; {activeSchedule.endDate} ({activeSchedule.totalSpots} spots)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Supplier & Bill Details */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Supplier Selection */}
              <div className="sm:col-span-8 space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    Supplier / Broadcaster <span className="text-red-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsQuickSupplierOpen(true)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> New Supplier
                  </button>
                </div>
                <select
                  value={supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                  required
                >
                  <option value="">-- Select Supplier / Channel Network --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.type.toUpperCase()}) {s.channels?.length ? `- [${s.channels.join(", ")}]` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier's Invoice Number */}
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Supplier Bill / Invoice #
                </Label>
                <Input
                  value={supplierInvoiceNumber}
                  onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-SLRC-4829"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Dates & Payment Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Supplier Bill Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Payment Due Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-xs font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Payment Terms</Label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Immediate">Immediate / Advance</option>
                  <option value="Net 7">Net 7 Days</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 45">Net 45 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                </select>
              </div>
            </div>

            {/* Financial Amounts Calculation Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Supplier Bill Breakdown & Total (LKR)</span>
                </span>
                <span className="text-[11px] text-slate-500 italic">
                  Enter actual supplier invoice amounts
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Gross Bill Subtotal (Rs.) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={subtotal || ""}
                    onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="text-xs font-mono font-bold bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Discount (Rs.)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount || ""}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="text-xs font-mono bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">VAT / Tax</Label>
                    <label className="text-[10px] text-slate-600 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasTax}
                        onChange={(e) => setHasTax(e.target.checked)}
                        className="rounded text-emerald-600 w-3 h-3"
                      />
                      Apply Tax
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      disabled={!hasTax}
                      min="0"
                      step="0.1"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      placeholder="18"
                      className="text-xs font-mono w-20 bg-white"
                    />
                    <span className="text-xs text-slate-500">% =</span>
                    <span className="text-xs font-mono font-semibold text-slate-700">
                      Rs. {calculatedTaxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Total Display */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Total Supplier Bill Amount:
                </span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  Rs. {calculatedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Description & Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Service Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Prime time spot broadcasting October 2026"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Internal Notes / Payment Instructions</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cheque payment requested by accounts department"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4 flex items-center justify-between">
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
                disabled={isSaving}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving Payable...
                  </>
                ) : payable ? (
                  "Update Payable"
                ) : (
                  "Save Supplier Payable"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Supplier Modal */}
      {isQuickSupplierOpen && (
        <SupplierModal
          isOpen={isQuickSupplierOpen}
          onClose={() => setIsQuickSupplierOpen(false)}
          onSaved={(newSup) => {
            setSupplierId(newSup.id);
            if (newSup.paymentTerms) setPaymentTerms(newSup.paymentTerms);
          }}
        />
      )}
    </>
  );
}
