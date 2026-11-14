"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Upload,
  Calendar,
  Building2,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  Layers
} from "lucide-react";
import {
  Cheque,
  ChequeType,
  ChequeStatus,
  BillingEntity,
  Client,
  Invoice,
  ChequeInvoiceAllocation
} from "@/types";
import { storage } from "@/lib/storage";

interface ChequeModalProps {
  cheque?: Cheque | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultType?: ChequeType;
  defaultInvoiceId?: string;
}

const COMMON_BANKS = [
  "Commercial Bank of Ceylon",
  "Seylan Bank",
  "Sampath Bank",
  "Hatton National Bank (HNB)",
  "Bank of Ceylon (BOC)",
  "People's Bank",
  "Nations Trust Bank (NTB)",
  "DFCC Bank",
  "Pan Asia Bank",
  "National Development Bank (NDB)",
  "Standard Chartered Bank",
  "HSBC Sri Lanka"
];

export function ChequeModal({
  cheque,
  isOpen,
  onClose,
  onSaved,
  defaultType = "incoming",
  defaultInvoiceId
}: ChequeModalProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<"details" | "invoices" | "images" | "reminders">("details");
  const [entities, setEntities] = useState<BillingEntity[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [type, setType] = useState<ChequeType>(cheque?.type || defaultType);
  const [chequeNumber, setChequeNumber] = useState(cheque?.chequeNumber || "");
  const [amount, setAmount] = useState<string>(cheque ? String(cheque.amount) : "");
  const [currency] = useState("LKR");
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [chequeDate, setChequeDate] = useState(cheque?.chequeDate || todayStr);
  const [receivedOrIssuedDate, setReceivedOrIssuedDate] = useState(cheque?.receivedOrIssuedDate || todayStr);
  const [expectedActionDate, setExpectedActionDate] = useState(cheque?.expectedActionDate || cheque?.chequeDate || todayStr);

  const [drawerBank, setDrawerBank] = useState(cheque?.drawerBank || "");
  const [branch, setBranch] = useState(cheque?.branch || "");
  const [payerOrPayeeName, setPayerOrPayeeName] = useState(cheque?.payerOrPayeeName || "");
  const [clientId, setClientId] = useState(cheque?.clientId || "");
  const [supplierName, setSupplierName] = useState(cheque?.supplierName || "");
  
  const [billingEntityId, setBillingEntityId] = useState(cheque?.billingEntityId || "");
  const [bankAccountId, setBankAccountId] = useState(cheque?.bankAccountId || "");

  const [purposeOfPayment, setPurposeOfPayment] = useState(cheque?.purposeOfPayment || "");
  const [billReference, setBillReference] = useState(cheque?.billReference || "");
  const [notes, setNotes] = useState(cheque?.notes || "");

  const [isReminderEnabled, setIsReminderEnabled] = useState(cheque ? cheque.isReminderEnabled : true);
  const [imageFrontUrl, setImageFrontUrl] = useState(cheque?.imageFrontUrl || "");
  const [imageBackUrl, setImageBackUrl] = useState(cheque?.imageBackUrl || "");

  // Invoice Allocations
  const [allocations, setAllocations] = useState<ChequeInvoiceAllocation[]>(cheque?.invoiceAllocations || []);

  useEffect(() => {
    const entList = storage.getBillingEntities().filter((e) => e.isActive);
    setEntities(entList);
    if (!billingEntityId && entList.length > 0) {
      setBillingEntityId(entList[0].id);
    }

    const clientList = storage.getClients();
    setClients(clientList);

    const invList = storage.getInvoices();
    setInvoices(invList);

    // If defaultInvoiceId provided and creating new cheque
    if (defaultInvoiceId && !cheque) {
      const inv = invList.find((i) => i.id === defaultInvoiceId);
      if (inv) {
        setClientId(inv.clientId);
        setPayerOrPayeeName(inv.clientSnapshot?.name || "");
        setBillingEntityId(inv.billingEntityId || entList[0]?.id || "");
        setBillReference(inv.invoiceNumber);
        setAmount(String(inv.outstandingBalance || inv.grandTotal));
        setAllocations([
          {
            id: "alloc-" + Date.now(),
            chequeId: "",
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            allocatedAmount: inv.outstandingBalance || inv.grandTotal,
            createdAt: new Date().toISOString()
          }
        ]);
      }
    }
  }, [defaultInvoiceId, cheque]);

  // Selected Entity Bank Accounts
  const selectedEntity = entities.find((e) => e.id === billingEntityId);
  const entityBankAccounts = selectedEntity?.bankAccounts || [];

  // When Client changes, auto-fill payer name
  const handleClientChange = (cId: string) => {
    setClientId(cId);
    const selected = clients.find((c) => c.id === cId);
    if (selected) {
      setPayerOrPayeeName(selected.name);
    }
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isFront: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please choose a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (isFront) {
        setImageFrontUrl(dataUrl);
      } else {
        setImageBackUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    // Upload to server persistent storage
    const formData = new FormData();
    formData.append("file", file);
    formData.append("prefix", isFront ? "cheque_front" : "cheque_back");
    fetch("/api/upload", { method: "POST", body: formData })
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          if (isFront) {
            setImageFrontUrl(data.url);
          } else {
            setImageBackUrl(data.url);
          }
        }
      })
      .catch((err) => console.error("Cheque upload to persistent server failed:", err));
  };

  // Allocations total
  const totalAllocated = allocations.reduce((acc, a) => acc + (Number(a.allocatedAmount) || 0), 0);
  const chequeAmountNum = Number(amount) || 0;
  const remainingUnallocated = Math.max(0, chequeAmountNum - totalAllocated);

  const toggleInvoiceAllocation = (inv: Invoice) => {
    const exists = allocations.find((a) => a.invoiceId === inv.id);
    if (exists) {
      setAllocations(allocations.filter((a) => a.invoiceId !== inv.id));
    } else {
      const allocAmount = Math.min(remainingUnallocated, inv.outstandingBalance || inv.grandTotal);
      setAllocations([
        ...allocations,
        {
          id: "alloc-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
          chequeId: cheque?.id || "",
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          allocatedAmount: allocAmount > 0 ? allocAmount : inv.outstandingBalance || inv.grandTotal,
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  const updateAllocationAmount = (invoiceId: string, val: number) => {
    setAllocations(
      allocations.map((a) => (a.invoiceId === invoiceId ? { ...a, allocatedAmount: val } : a))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!chequeNumber.trim()) {
      alert("Please enter the Cheque Number");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid Cheque Amount");
      return;
    }
    if (!drawerBank.trim()) {
      alert("Please specify or select the Drawer Bank");
      return;
    }
    if (!billingEntityId) {
      alert("Please select the Billing Entity");
      return;
    }
    if (type === "incoming" && !payerOrPayeeName.trim()) {
      alert("Please select or enter the Client / Payer name");
      return;
    }
    if (type === "outgoing" && !payerOrPayeeName.trim() && !supplierName.trim()) {
      alert("Please enter the Payee / Vendor name");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedAcc = entityBankAccounts.find((b) => b.id === bankAccountId);

      const chequeData = {
        ...(cheque?.id ? { id: cheque.id } : {}),
        type,
        chequeNumber: chequeNumber.trim(),
        amount: Number(amount),
        currency: "LKR",
        chequeDate,
        receivedOrIssuedDate,
        expectedActionDate,
        drawerBank: drawerBank.trim(),
        branch: branch.trim(),
        bankAccountId: bankAccountId || entityBankAccounts[0]?.id,
        bankAccountNumber: selectedAcc?.accountNumber || selectedEntity?.accountNumber,
        payerOrPayeeName: type === "incoming" ? payerOrPayeeName.trim() : (supplierName.trim() || payerOrPayeeName.trim()),
        clientId: type === "incoming" ? clientId || undefined : undefined,
        supplierName: type === "outgoing" ? (supplierName.trim() || payerOrPayeeName.trim()) : undefined,
        billingEntityId,
        billingEntityName: selectedEntity?.displayName || selectedEntity?.name,
        billingEntityPrefix: selectedEntity?.prefix,
        status: (cheque?.status || (type === "incoming" ? "received" : "issued")) as ChequeStatus,
        purposeOfPayment: purposeOfPayment.trim(),
        billReference: billReference.trim(),
        notes: notes.trim(),
        isReminderEnabled,
        imageFrontUrl: imageFrontUrl || undefined,
        imageBackUrl: imageBackUrl || undefined,
        attachments: cheque?.attachments || [],
        invoiceAllocations: type === "incoming" ? allocations : [],
        statusHistory: cheque?.statusHistory || [],
        reminders: cheque?.reminders || []
      };

      storage.saveCheque(chequeData);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cheque-updated"));
      }

      onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to save cheque");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-navy-950 text-white p-5 flex items-center justify-between border-b border-navy-900">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono uppercase">
                {type === "incoming" ? "Incoming Cheque (Received)" : "Outgoing Cheque (Issued)"}
              </span>
              {selectedEntity?.prefix && (
                <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-bold">
                  {selectedEntity.prefix}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              {cheque ? `Edit Cheque #${cheque.chequeNumber}` : "Record New Cheque"}
            </h2>
            <p className="text-xs text-slate-300">
              Track deposit dates, clearances, and automated reminders
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`py-3 px-3 border-b-2 font-semibold transition-colors flex items-center space-x-1.5 ${
              activeTab === "details"
                ? "border-emerald-600 text-emerald-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Cheque Details</span>
          </button>

          {type === "incoming" && (
            <button
              type="button"
              onClick={() => setActiveTab("invoices")}
              className={`py-3 px-3 border-b-2 font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === "invoices"
                  ? "border-emerald-600 text-emerald-700 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Invoice Allocation ({allocations.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("images")}
            className={`py-3 px-3 border-b-2 font-semibold transition-colors flex items-center space-x-1.5 ${
              activeTab === "images"
                ? "border-emerald-600 text-emerald-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Front & Back Images {(imageFrontUrl || imageBackUrl) ? "✓" : ""}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reminders")}
            className={`py-3 px-3 border-b-2 font-semibold transition-colors flex items-center space-x-1.5 ${
              activeTab === "reminders"
                ? "border-emerald-600 text-emerald-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Reminder Settings</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* TAB 1: Cheque Details */}
          {activeTab === "details" && (
            <div className="space-y-4">
              {/* Cheque Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Cheque Direction *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType("incoming")}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      type === "incoming"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>📥 Incoming (Client Cheque)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("outgoing")}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      type === "outgoing"
                        ? "bg-navy-900 text-white border-navy-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>📤 Outgoing (Vendor / Supplier)</span>
                  </button>
                </div>
              </div>

              {/* Billing Entity & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Billing Entity *
                  </label>
                  <select
                    value={billingEntityId}
                    onChange={(e) => setBillingEntityId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  >
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.displayName || ent.name} ({ent.prefix})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {type === "incoming" ? "Target Deposit Bank A/C" : "Issuing Entity Bank A/C"}
                  </label>
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {entityBankAccounts.map((ba) => (
                      <option key={ba.id} value={ba.id}>
                        {ba.bankName} - {ba.accountNumber} ({ba.branchName})
                      </option>
                    ))}
                    {entityBankAccounts.length === 0 && (
                      <option value="">{selectedEntity?.bankName || "Default Bank A/C"}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Cheque Number & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cheque Number *
                  </label>
                  <input
                    type="text"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-wider focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. 458921"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cheque Amount (LKR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rs.</span>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="125,000.00"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date on Cheque *
                  </label>
                  <input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => {
                      setChequeDate(e.target.value);
                      if (!expectedActionDate) setExpectedActionDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {type === "incoming" ? "Date Received" : "Date Issued"}
                  </label>
                  <input
                    type="date"
                    value={receivedOrIssuedDate}
                    onChange={(e) => setReceivedOrIssuedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {type === "incoming" ? "Expected Deposit Date *" : "Expected Presentation Date *"}
                  </label>
                  <input
                    type="date"
                    value={expectedActionDate}
                    onChange={(e) => setExpectedActionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Drawer Bank & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Drawer Bank (Client/Issuer Bank) *
                  </label>
                  <input
                    type="text"
                    list="bank-list"
                    value={drawerBank}
                    onChange={(e) => setDrawerBank(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. Commercial Bank of Ceylon"
                    required
                  />
                  <datalist id="bank-list">
                    {COMMON_BANKS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank Branch
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. Kelaniya / Kadawatha"
                  />
                </div>
              </div>

              {/* Party (Client or Payee) */}
              {type === "incoming" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Client (Payer)
                    </label>
                    <select
                      value={clientId}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- Choose Existing Client --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payer Name on Cheque *
                    </label>
                    <input
                      type="text"
                      value={payerOrPayeeName}
                      onChange={(e) => setPayerOrPayeeName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="e.g. Araliya Lands and Homes (Pvt) Ltd"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payee / Vendor Name *
                    </label>
                    <input
                      type="text"
                      value={supplierName || payerOrPayeeName}
                      onChange={(e) => {
                        setSupplierName(e.target.value);
                        setPayerOrPayeeName(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="e.g. Asia Broadcasting Corporation (Pvt) Ltd"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vendor Invoice / Bill Ref
                    </label>
                    <input
                      type="text"
                      value={billReference}
                      onChange={(e) => setBillReference(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="e.g. INV-9042"
                    />
                  </div>
                </div>
              )}

              {/* Purpose & Internal Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Purpose of Payment
                  </label>
                  <input
                    type="text"
                    value={purposeOfPayment}
                    onChange={(e) => setPurposeOfPayment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. Video Production 3-Clips Campaign"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Internal Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. Received by hand at office"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Invoice Allocation (Incoming only) */}
          {activeTab === "invoices" && type === "incoming" && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Cheque Amount:</span>
                  <span className="font-bold text-emerald-950 ml-1">
                    Rs. {chequeAmountNum.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Allocated:</span>
                  <span className="font-bold text-emerald-700 ml-1">
                    Rs. {totalAllocated.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Unallocated:</span>
                  <span className="font-bold text-slate-800 ml-1">
                    Rs. {remainingUnallocated.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Select one or more invoices to link this cheque. Payment will only be posted to invoices when the cheque status is marked <strong>Cleared</strong>.
              </p>

              <div className="max-h-64 overflow-y-auto space-y-2 divide-y divide-slate-100">
                {invoices
                  .filter((inv) => !clientId || inv.clientId === clientId)
                  .map((inv) => {
                    const isAllocated = allocations.some((a) => a.invoiceId === inv.id);
                    const alloc = allocations.find((a) => a.invoiceId === inv.id);

                    return (
                      <div
                        key={inv.id}
                        className={`p-3 rounded-xl border transition-all pt-3 ${
                          isAllocated ? "bg-emerald-50/50 border-emerald-300" : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center space-x-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAllocated}
                              onChange={() => toggleInvoiceAllocation(inv)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-slate-900">
                                  Invoice #{inv.invoiceNumber}
                                </span>
                                <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded">
                                  {inv.paymentStatus.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">{inv.clientSnapshot?.name || "Client"}</p>
                            </div>
                          </label>

                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-800">
                              Rs. {Number(inv.grandTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Balance: Rs. {Number(inv.outstandingBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        {isAllocated && (
                          <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center justify-end space-x-2">
                            <span className="text-xs font-semibold text-slate-700">Allocated Amount:</span>
                            <div className="w-36 relative">
                              <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">Rs.</span>
                              <input
                                type="number"
                                step="0.01"
                                value={alloc?.allocatedAmount || ""}
                                onChange={(e) => updateAllocationAmount(inv.id, Number(e.target.value))}
                                className="w-full pl-8 pr-2 py-1 bg-white border border-emerald-300 rounded-md text-xs font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 3: Images & Attachments */}
          {activeTab === "images" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Front Image */}
                <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-50/50">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Cheque Front Image
                  </label>
                  {imageFrontUrl ? (
                    <div className="relative group">
                      <img
                        src={imageFrontUrl}
                        alt="Cheque Front"
                        className="w-full h-36 object-contain rounded-lg border border-slate-200 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setImageFrontUrl("")}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full shadow-md hover:bg-rose-700"
                        title="Remove Front Image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-36 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <Upload className="w-7 h-7 text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-600">Upload Front Image</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG, WebP up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, true)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Back Image */}
                <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-50/50">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Cheque Back / Crossing Image
                  </label>
                  {imageBackUrl ? (
                    <div className="relative group">
                      <img
                        src={imageBackUrl}
                        alt="Cheque Back"
                        className="w-full h-36 object-contain rounded-lg border border-slate-200 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setImageBackUrl("")}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full shadow-md hover:bg-rose-700"
                        title="Remove Back Image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-36 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <Upload className="w-7 h-7 text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-600">Upload Back Image</span>
                      <span className="text-[10px] text-slate-400">Endorsements, stamp & crossing</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Reminders */}
          {activeTab === "reminders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Enable Smart Reminders</h4>
                  <p className="text-[11px] text-slate-500">
                    Receive automated notifications 7 days, 3 days, 1 day before due date, on due date, and overdue alerts.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isReminderEnabled}
                    onChange={(e) => setIsReminderEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="p-4 bg-navy-50/70 border border-navy-100 rounded-xl text-xs space-y-2 text-navy-950">
                <h5 className="font-bold flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Scheduled Reminder Intervals</span>
                </h5>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                  <li><strong>7 Days Before:</strong> Initial advance notice for deposit/cashflow preparation.</li>
                  <li><strong>3 Days Before:</strong> Medium-priority reminder.</li>
                  <li><strong>1 Day Before:</strong> High-priority alert to ready the deposit slip or account balance.</li>
                  <li><strong>On Due Date:</strong> High-priority morning alert (Due Today).</li>
                  <li><strong>Overdue:</strong> Daily urgent alerts until marked cleared, deposited, or resolved.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">
              Entity: {selectedEntity?.displayName || "SN Advertising"}
            </span>

            <div className="flex items-center space-x-3">
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
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : cheque ? "Save Changes" : "Record Cheque"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
