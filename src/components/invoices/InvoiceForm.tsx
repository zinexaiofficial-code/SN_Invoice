"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Invoice, 
  Client, 
  BillingEntity, 
  Service, 
  InvoiceItem, 
  InvoiceTemplate,
  InvoiceTemplateKey 
} from "@/types";
import { storage } from "@/lib/storage";
import { formatLKR, formatDate, formatServicePeriod } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientModal } from "@/components/clients/ClientModal";
import { InvoiceTemplateRenderer } from "@/components/invoices/InvoiceTemplateRenderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Plus, 
  Trash2, 
  Eye, 
  Save, 
  CheckCircle2, 
  Printer, 
  UserPlus, 
  Building2, 
  Layers, 
  Sparkles,
  AlertCircle,
  Calendar,
  AlertTriangle
} from "lucide-react";

interface InvoiceFormProps {
  initialInvoice?: Invoice | null;
}

export function InvoiceForm({ initialInvoice }: InvoiceFormProps) {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [billingEntities, setBillingEntities] = useState<BillingEntity[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [error, setError] = useState<string>("");

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedBillingEntityId, setSelectedBillingEntityId] = useState<string>("");
  const [templateKey, setTemplateKey] = useState<InvoiceTemplateKey>("standard");
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState<string>("");
  const [product, setProduct] = useState<string>("");
  const [regNo, setRegNo] = useState<string>("");
  const [yourRef, setYourRef] = useState<string>("");
  const [servicePeriodText, setServicePeriodText] = useState<string>("");
  const [status, setStatus] = useState<Invoice['status']>("draft");

  // Items State
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "item-init",
      serviceName: "Video Campaign with Presenter (3 Clips)",
      description: "Video Campaign with Presenter (3 Clips)",
      servicePeriod: new Date().toISOString().split("T")[0],
      quantity: 1,
      unitPrice: 125000,
      lineTotal: 125000,
      sortOrder: 0,
    },
  ]);

  // Tax and Advance
  const [vatApplicable, setVatApplicable] = useState<boolean>(false);
  const [vatRate, setVatRate] = useState<number>(18);
  const [advancePercentage, setAdvancePercentage] = useState<number>(0);
  const [specialNotes, setSpecialNotes] = useState<string>("");
  const [paymentInstructions, setPaymentInstructions] = useState<string>("");

  // Service Period (Optional)
  const [includeServicePeriod, setIncludeServicePeriod] = useState<boolean>(false);
  const [servicePeriodStart, setServicePeriodStart] = useState<string>("");
  const [servicePeriodEnd, setServicePeriodEnd] = useState<string>("");

  // VAT Display Presentation (MODE A: separate line, MODE B: included without separate line)
  const [showVatSeparately, setShowVatSeparately] = useState<boolean>(true);

  // Load references and set initial data
  useEffect(() => {
    const clis = storage.getClients();
    const ents = storage.getBillingEntities();
    const servs = storage.getServices();
    const tmpls = storage.getTemplates();
    const branding = storage.getBranding();

    setClients(clis);
    setBillingEntities(ents);
    setServices(servs);
    setTemplates(tmpls);
    setVatRate(branding.defaultVatRate || 18);

    if (initialInvoice) {
      setInvoiceNumber(initialInvoice.invoiceNumber);
      setSelectedClientId(initialInvoice.clientId);
      setSelectedBillingEntityId(initialInvoice.billingEntityId);
      setTemplateKey(initialInvoice.templateKey || "standard");
      setInvoiceDate(initialInvoice.invoiceDate);
      setDueDate(initialInvoice.dueDate || "");
      setProduct(initialInvoice.product || "");
      setRegNo(initialInvoice.regNo || "");
      setYourRef(initialInvoice.yourRef || "");
      setServicePeriodText(initialInvoice.servicePeriodText || "");
      setStatus(initialInvoice.status);
      setItems(initialInvoice.items.length > 0 ? initialInvoice.items : []);
      setVatApplicable(initialInvoice.vatApplicable);
      setVatRate(initialInvoice.vatRate);
      setAdvancePercentage(initialInvoice.advancePercentage || 0);
      setSpecialNotes(initialInvoice.specialNotes || "");
      setPaymentInstructions(initialInvoice.paymentInstructions || "");
      setIncludeServicePeriod(initialInvoice.includeServicePeriod ?? Boolean(initialInvoice.servicePeriodStart && initialInvoice.servicePeriodEnd));
      setServicePeriodStart(initialInvoice.servicePeriodStart || "");
      setServicePeriodEnd(initialInvoice.servicePeriodEnd || "");
      setShowVatSeparately(initialInvoice.showVatSeparately ?? true);
    } else {
      // New Invoice: Default to first active billing entity and its sequence
      const activeEntities = ents.filter(e => e.isActive && e.status !== 'archived');
      const defaultEntity = activeEntities[0] || ents[0];
      if (defaultEntity) {
        setSelectedBillingEntityId(defaultEntity.id);
        setInvoiceNumber(storage.getNextInvoiceNumber(defaultEntity.id));
        setPaymentInstructions(defaultEntity.paymentInstructions || "");
        setVatApplicable(Boolean(defaultEntity.isVatRegistered));
        setTemplateKey(defaultEntity.defaultInvoiceTemplate || (defaultEntity.isVatRegistered ? 'vat' : 'standard'));
      } else {
        setInvoiceNumber(storage.getNextInvoiceNumber());
      }
    }
  }, [initialInvoice]);

  // When Client changes, auto-fill client preferences
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    if (client.defaultBillingEntityId) {
      handleEntityChange(client.defaultBillingEntityId);
    }

    if (client.defaultVatPreference !== undefined) {
      setVatApplicable(client.defaultVatPreference);
      if (client.defaultVatPreference) {
        setTemplateKey("vat");
      }
    }

    if (client.defaultAdvancePercentage) {
      setAdvancePercentage(client.defaultAdvancePercentage);
    }

    if (client.defaultNote) {
      setSpecialNotes(client.defaultNote);
    }
  };

  // When Billing Entity changes, update sequence number, template, tax, and bank instructions
  const [entityChangeNotice, setEntityChangeNotice] = useState<string>("");

  const handleEntityChange = (entityId: string) => {
    const prevEntity = billingEntities.find(e => e.id === selectedBillingEntityId);
    const entity = billingEntities.find((e) => e.id === entityId);
    if (!entity) return;

    setSelectedBillingEntityId(entityId);

    // Update sequence number for this specific entity if creating new invoice
    if (!initialInvoice) {
      const nextNum = storage.getNextInvoiceNumber(entityId);
      setInvoiceNumber(nextNum);
    }

    // Set entity defaults
    setPaymentInstructions(entity.paymentInstructions || "");
    if (entity.defaultInvoiceTemplate) {
      setTemplateKey(entity.defaultInvoiceTemplate);
    } else if (entity.isVatRegistered) {
      setTemplateKey("vat");
    }

    if (entity.isVatRegistered !== undefined) {
      setVatApplicable(entity.isVatRegistered);
    }

    if (entity.invoiceNotes && !specialNotes) {
      setSpecialNotes(entity.invoiceNotes);
    }

    if (prevEntity && prevEntity.id !== entity.id) {
      setEntityChangeNotice(`Switched billing entity to ${entity.displayName || entity.name}. Updated prefix to ${entity.prefix} and refreshed bank instructions.`);
      setTimeout(() => setEntityChangeNotice(""), 5000);
    }
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const vatAmount = vatApplicable ? Math.round(subtotal * (vatRate / 100) * 100) / 100 : 0;
  const grandTotal = subtotal + vatAmount;
  const advanceAmount = advancePercentage > 0 ? Math.round(grandTotal * (advancePercentage / 100) * 100) / 100 : 0;

  // Item row operations
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        const q = field === "quantity" ? parseFloat(value) || 0 : item.quantity;
        const p = field === "unitPrice" ? parseFloat(value) || 0 : item.unitPrice;
        item.lineTotal = Math.round(q * p * 100) / 100;
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleSelectService = (index: number, serviceId: string) => {
    const s = services.find((srv) => srv.id === serviceId);
    if (!s) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        serviceId: s.id,
        serviceName: s.name,
        description: s.defaultDescription || s.name,
        unitPrice: s.defaultPrice,
        lineTotal: Math.round((updated[index].quantity || 1) * s.defaultPrice * 100) / 100,
      };
      return updated;
    });
    if (s.vatApplicable && !vatApplicable) {
      setVatApplicable(true);
      setTemplateKey("vat");
    }
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: "item-" + Date.now(),
        serviceName: "Custom Advertising Service",
        description: "",
        servicePeriod: servicePeriodText || formatDate(invoiceDate),
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
        sortOrder: prev.length,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Compile snapshot & build invoice object
  const buildInvoicePayload = (newStatus: Invoice['status']): Invoice => {
    const client = clients.find((c) => c.id === selectedClientId);
    const entity = billingEntities.find((e) => e.id === selectedBillingEntityId);

    const clientSnapshot = {
      id: client?.id || "unknown",
      name: client?.name || "Client Name",
      code: client?.code || "CLI",
      address: client?.address || "",
      vatNumber: client?.vatNumber,
      contactPerson: client?.contactPerson,
      mobile: client?.mobile,
      whatsapp: client?.whatsapp,
      email: client?.email,
    };

    const billingSnapshot = {
      id: entity?.id || "unknown",
      name: entity?.name || "SN Advertising",
      displayName: entity?.displayName || entity?.name || "SN Advertising",
      address: entity?.address || "Kelaniya",
      addressLine1: entity?.addressLine1,
      addressLine2: entity?.addressLine2,
      city: entity?.city,
      postalCode: entity?.postalCode,
      country: entity?.country,
      phone: entity?.phone,
      secondaryPhone: entity?.secondaryPhone,
      email: entity?.email,
      website: entity?.website,
      brn: entity?.brn,
      vatNumber: entity?.vatNumber,
      isVatRegistered: entity?.isVatRegistered,
      chequePayee: entity?.chequePayee || entity?.name || "SN ADVERTISING",
      bankName: entity?.bankName,
      branch: entity?.branch,
      accountName: entity?.accountName,
      accountNumber: entity?.accountNumber,
      swiftCode: entity?.swiftCode,
      paymentInstructions: paymentInstructions || entity?.paymentInstructions,
      logoUrl: entity?.logoUrl,
      signatureUrl: entity?.signatureUrl,
      signatoryName: entity?.signatoryName,
      signatoryDesignation: entity?.signatoryDesignation,
      primaryColor: entity?.primaryColor,
      secondaryColor: entity?.secondaryColor,
      footerText: entity?.footerText,
      prefix: entity?.prefix || "SN",
    };

    return {
      id: initialInvoice?.id || `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber.trim(),
      clientId: selectedClientId,
      billingEntityId: selectedBillingEntityId,
      templateKey,
      status: newStatus,
      invoiceDate,
      dueDate: dueDate || undefined,
      issuedAt: newStatus === "issued" ? (initialInvoice?.issuedAt || new Date().toISOString()) : initialInvoice?.issuedAt,
      sentAt: initialInvoice?.sentAt,
      paidAt: initialInvoice?.paidAt,
      product: product.trim() || undefined,
      regNo: regNo.trim() || undefined,
      yourRef: yourRef.trim() || undefined,
      includeServicePeriod,
      servicePeriodStart: includeServicePeriod && servicePeriodStart ? servicePeriodStart : undefined,
      servicePeriodEnd: includeServicePeriod && servicePeriodEnd ? servicePeriodEnd : undefined,
      servicePeriodText: servicePeriodText.trim() || undefined,
      subtotal,
      vatApplicable,
      vatRate,
      vatAmount,
      taxableBase: subtotal,
      showVatSeparately: vatApplicable ? showVatSeparately : true,
      grandTotal,
      advancePercentage,
      advanceAmount,
      specialNotes: specialNotes.trim() || undefined,
      paymentInstructions,
      sentStatus: initialInvoice?.sentStatus || "not_sent",
      paymentStatus: initialInvoice?.paymentStatus || "unpaid",
      totalPaid: initialInvoice?.totalPaid || 0,
      outstandingBalance: Math.max(0, grandTotal - (initialInvoice?.totalPaid || 0)),
      clientSnapshot,
      billingSnapshot,
      items,
      payments: initialInvoice?.payments || [],
      shareHistory: initialInvoice?.shareHistory || [],
      createdAt: initialInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSave = (targetStatus: Invoice['status']) => {
    setError("");

    // Section 7 Validation Rules
    if (!selectedBillingEntityId) {
      setError("Please select a billing entity before issuing or saving this invoice.");
      return;
    }
    if (!selectedClientId) {
      setError("Please choose a client.");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one service.");
      return;
    }
    const hasZeroPrice = items.some((it) => it.unitPrice <= 0);
    if (hasZeroPrice) {
      setError("Enter a valid unit price greater than 0 for all services.");
      return;
    }

    if (includeServicePeriod && servicePeriodStart && servicePeriodEnd) {
      if (servicePeriodEnd < servicePeriodStart) {
        setError("Service Period: 'To Date' cannot be earlier than 'From Date'.");
        return;
      }
    }

    const payload = buildInvoicePayload(targetStatus);
    storage.saveInvoice(payload);

    router.push(`/invoices/${payload.id}`);
  };

  const currentPreviewInvoice = buildInvoicePayload(status);
  const activeEntity = billingEntities.find(e => e.id === selectedBillingEntityId);

  return (
    <div className="space-y-6 pb-28 md:pb-8">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-navy-950 tracking-tight">
            {initialInvoice ? `Edit Invoice #${initialInvoice.invoiceNumber}` : "Create New Invoice"}
          </h1>
          <p className="text-sm text-slate-500">
            Select billing entity, client, services, and generate official invoice.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center space-x-1.5"
          >
            <Eye className="w-4 h-4 text-navy-900" />
            <span>Preview PDF</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave("draft")}
            className="flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>Save Draft</span>
          </Button>
          <Button
            type="button"
            onClick={() => handleSave("issued")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Issue Invoice</span>
          </Button>
        </div>
      </div>

      {entityChangeNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span>{entityChangeNotice}</span>
          <button onClick={() => setEntityChangeNotice("")} className="text-blue-500 hover:text-blue-800 text-xs">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Sections A & B */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section A: Invoice Header & Billing Entity */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base font-bold flex items-center space-x-2 text-navy-950">
                <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Section A — Billing Entity &amp; Details</span>
              </CardTitle>
              <span className="text-[11px] font-mono bg-navy-100 text-navy-900 px-2.5 py-0.5 rounded-full font-bold">
                #{invoiceNumber || "NEW"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Prominent Billing Entity Selection */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="entity" className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center space-x-1.5">
                  <span>Billing Entity (Issuer) *</span>
                </Label>
                {activeEntity && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    activeEntity.isVatRegistered 
                      ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}>
                    {activeEntity.isVatRegistered ? `VAT: ${activeEntity.vatNumber}` : 'Non-VAT Entity'}
                  </span>
                )}
              </div>

              <select
                id="entity"
                value={selectedBillingEntityId}
                onChange={(e) => handleEntityChange(e.target.value)}
                className="w-full h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-900 shadow-sm"
              >
                {billingEntities.filter(e => e.isActive && e.status !== 'archived').map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    [{ent.prefix}] {ent.displayName || ent.name} — {ent.isVatRegistered ? `VAT (${ent.vatNumber})` : 'Non-VAT'}
                  </option>
                ))}
              </select>

              {activeEntity && (
                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/80 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span><strong>Bank:</strong> {activeEntity.bankName || 'N/A'}</span>
                  <span><strong>Branch:</strong> {activeEntity.branch || 'N/A'}</span>
                  <span><strong>A/C:</strong> {activeEntity.accountNumber || 'N/A'}</span>
                </div>
              )}
            </div>

            {/* Invoice Number & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="invNo" className="text-xs font-bold text-slate-700">Invoice Number *</Label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                    {activeEntity?.prefix || 'SN'}-Sequence
                  </span>
                </div>
                <Input
                  id="invNo"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="font-mono font-bold text-navy-950 bg-slate-50 border-slate-300 h-10 text-sm"
                  placeholder="e.g. SN-23467"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invDate" className="text-xs font-bold text-slate-700">Invoice Date *</Label>
                <Input
                  id="invDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="border-slate-300 h-10 text-sm"
                  required
                />
              </div>
            </div>

            {/* Layout Template & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="template" className="text-xs font-bold text-slate-700">
                  Layout Template *
                </Label>
                <select
                  id="template"
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value as InvoiceTemplateKey)}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-900"
                >
                  <option value="standard">Standard Advertising (Classic Excel)</option>
                  <option value="vat">VAT Tax Invoice (IRD Compliant)</option>
                  <option value="sponsorship">Sponsorship Invoice (Radio/Media)</option>
                  <option value="custom">Custom Commercial Invoice</option>
                </select>
                <p className="text-[10px] text-slate-400">Can be switched anytime without retyping</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="text-xs font-bold text-slate-700">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="border-slate-300 h-10 text-sm"
                />
                <p className="text-[10px] text-slate-400">Defaults to entity due terms if left blank</p>
              </div>
            </div>

            {/* References Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="regNo" className="text-xs font-semibold text-slate-700">
                  Reg. No / Job Ref
                </Label>
                <Input
                  id="regNo"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="e.g. 2645/RFR"
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="product" className="text-xs font-semibold text-slate-700">
                  Product / Brand
                </Label>
                <Input
                  id="product"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="Optional brand name"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="yourRef" className="text-xs font-semibold text-slate-700">
                  Client Ref / PO
                </Label>
                <Input
                  id="yourRef"
                  value={yourRef}
                  onChange={(e) => setYourRef(e.target.value)}
                  placeholder="Optional PO number"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section B: Client Selector */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3 px-4 sm:px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center space-x-2 text-navy-950">
              <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Section B — Client (Advertiser)</span>
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsClientModalOpen(true)}
              className="text-xs flex items-center space-x-1 h-8 px-2.5 bg-white"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add New Client</span>
            </Button>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="clientSelect" className="text-xs font-bold text-slate-700">Select Existing Client *</Label>
              <select
                id="clientSelect"
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-900 font-semibold"
              >
                <option value="">-- Choose Client --</option>
                {clients.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.name} ({cli.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Client Snapshot Card */}
            {selectedClientId ? (
              (() => {
                const cli = clients.find((c) => c.id === selectedClientId);
                if (!cli) return null;
                return (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-extrabold text-navy-950 uppercase text-xs sm:text-sm">{cli.name}</p>
                        <p className="text-slate-600 whitespace-pre-line mt-0.5 text-xs">{cli.address}</p>
                      </div>
                      <span className="font-mono bg-navy-100 text-navy-900 px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ml-2">
                        {cli.code}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-1 text-slate-700 text-[11px]">
                      {cli.vatNumber && <span><strong>VAT:</strong> {cli.vatNumber}</span>}
                      {cli.mobile && <span><strong>Phone:</strong> {cli.mobile}</span>}
                      {cli.email && <span><strong>Email:</strong> {cli.email}</span>}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="p-5 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500 bg-slate-50/50">
                Choose an advertiser above to preview printed details and automatically fill billing defaults.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Period (Optional) */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="py-3.5 px-4 sm:px-6 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <CardTitle className="text-sm sm:text-base font-bold text-navy-950">
              Service Period (Optional)
            </CardTitle>
          </div>
          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-700">Include Service Period on Invoice</span>
            <input
              type="checkbox"
              checked={includeServicePeriod}
              onChange={(e) => setIncludeServicePeriod(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
          </label>
        </CardHeader>

        {includeServicePeriod && (
          <CardContent className="p-4 sm:p-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <Label htmlFor="servicePeriodStart" className="text-xs font-bold text-slate-700 mb-1.5 block">
                  From Date *
                </Label>
                <Input
                  id="servicePeriodStart"
                  type="date"
                  value={servicePeriodStart}
                  onChange={(e) => setServicePeriodStart(e.target.value)}
                  className="bg-white border-slate-300 font-medium text-xs"
                />
              </div>

              <div>
                <Label htmlFor="servicePeriodEnd" className="text-xs font-bold text-slate-700 mb-1.5 block">
                  To Date *
                </Label>
                <Input
                  id="servicePeriodEnd"
                  type="date"
                  value={servicePeriodEnd}
                  onChange={(e) => setServicePeriodEnd(e.target.value)}
                  className="bg-white border-slate-300 font-medium text-xs"
                />
              </div>

              {servicePeriodStart && servicePeriodEnd && servicePeriodEnd < servicePeriodStart && (
                <div className="col-span-full text-xs text-rose-600 font-bold flex items-center space-x-1.5 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Validation Error: 'To Date' cannot be earlier than 'From Date'.</span>
                </div>
              )}

              {servicePeriodStart && servicePeriodEnd && servicePeriodEnd >= servicePeriodStart && (
                <div className="col-span-full text-xs text-emerald-800 font-medium bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                  <span>Display on PDF: <strong>Service Period: {formatServicePeriod(servicePeriodStart, servicePeriodEnd)}</strong></span>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded">Active</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Note: This is an invoice-level service period. It is completely optional and separate from the line-item Period field in Section C.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Section C: Invoice Items (Mobile Cards + Desktop Table) */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3 px-4 sm:px-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base font-bold flex items-center space-x-2 text-navy-950">
              <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Section C — Services &amp; Line Items</span>
            </CardTitle>
            <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
              Select predefined services or customize descriptions, advertising periods, and pricing.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItemRow}
            className="text-xs font-semibold flex items-center space-x-1 h-8 px-3 bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Service Row</span>
          </Button>
        </CardHeader>

        <CardContent className="p-3 sm:p-6 space-y-4">
          {/* MOBILE VIEW (block md:hidden): Beautiful Touch-Friendly Card for each item */}
          <div className="block md:hidden space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3 relative"
              >
                {/* Header of Item Card */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-navy-950 text-white text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-navy-950">Service Item</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {formatLKR(item.lineTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      disabled={items.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      title="Remove Row"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                </div>

                {/* Service Selection */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Service From Catalog</Label>
                  <select
                    value={item.serviceId || ""}
                    onChange={(e) => handleSelectService(idx, e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-900"
                  >
                    <option value="">-- Custom Service Entry --</option>
                    {services.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} ({formatLKR(srv.defaultPrice)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Work Description (Printed on PDF)</Label>
                  <textarea
                    rows={2}
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    placeholder="Enter full advertising details, presenter clips, slot specifics..."
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-navy-900"
                  />
                </div>

                {/* 3-Field Grid: Period, Quantity, Unit Price */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-[11px] font-bold text-slate-700">Advertising Period / Broadcast Date</Label>
                    <Input
                      value={item.servicePeriod || ""}
                      onChange={(e) => updateItem(idx, "servicePeriod", e.target.value)}
                      placeholder="e.g. OCT - NOV 2026 or 2026-08-12"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                      className="h-9 text-xs font-mono text-center font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Unit Price (Rs.)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                      className="h-9 text-xs font-mono font-bold text-right"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500">Calculated Line Amount:</span>
                  <span className="font-mono font-black text-navy-950 text-sm">
                    {formatLKR(item.lineTotal)}
                  </span>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addItemRow}
              className="w-full h-10 border-dashed border-slate-300 text-xs font-bold text-navy-950 hover:bg-slate-50 flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Add Another Service Row</span>
            </Button>
          </div>

          {/* DESKTOP VIEW (hidden md:block): Generous Responsive Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3 w-52">Service From Catalog</th>
                  <th className="py-2.5 px-3">Work Description</th>
                  <th className="py-2.5 px-3 w-40">Period / Date</th>
                  <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                  <th className="py-2.5 px-3 w-32 text-right">Unit Price (Rs.)</th>
                  <th className="py-2.5 px-3 w-36 text-right">Amount (Rs.)</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 align-top">
                      <select
                        value={item.serviceId || ""}
                        onChange={(e) => handleSelectService(idx, e.target.value)}
                        className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-navy-900 font-medium"
                      >
                        <option value="">-- Custom Entry --</option>
                        {services.map((srv) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-3 align-top">
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        placeholder="Service details, clips, media specifics..."
                        className="w-full rounded-md border border-slate-300 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
                      />
                    </td>

                    <td className="py-3 px-3 align-top">
                      <Input
                        value={item.servicePeriod || ""}
                        onChange={(e) => updateItem(idx, "servicePeriod", e.target.value)}
                        placeholder="OCT - NOV 2026"
                        className="h-9 text-xs font-mono"
                      />
                    </td>

                    <td className="py-3 px-2 align-top">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        className="h-9 text-xs text-center font-mono font-bold"
                      />
                    </td>

                    <td className="py-3 px-3 align-top">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                        className="h-9 text-xs text-right font-mono font-bold"
                      />
                    </td>

                    <td className="py-3 px-3 align-top text-right font-mono font-black text-navy-950 pt-4">
                      {formatLKR(item.lineTotal)}
                    </td>

                    <td className="py-3 px-2 align-top text-center pt-3.5">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                        title="Delete Line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Section D (Summary) & Section E (Payment Instructions) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section E: Payment Terms, Advance & Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Section E — Payment Instructions &amp; Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="advPercent">Advance Required %</Label>
                <Input
                  id="advPercent"
                  type="number"
                  min="0"
                  max="100"
                  value={advancePercentage}
                  onChange={(e) => {
                    const pct = parseFloat(e.target.value) || 0;
                    setAdvancePercentage(pct);
                    if (pct > 0 && !specialNotes) {
                      setSpecialNotes(`(${pct}% Advance Payment to Proceed with Work)`);
                    }
                  }}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label>Advance Amount</Label>
                <div className="h-10 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-700 text-sm">
                  {formatLKR(advanceAmount)}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Special Note (Printed on Invoice)</Label>
              <Input
                id="notes"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="e.g. (75% Advance Payment to Proceed with Work)"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="payInst">Cheque / Bank Transfer Instructions</Label>
              <textarea
                id="payInst"
                rows={3}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section D: Financial Summary */}
        <Card className="bg-slate-50 border-slate-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-navy-950">Section D — Financial Summary (Live)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-sm text-slate-600 font-medium">Subtotal (Line Items):</span>
              <span className="text-base font-bold font-mono text-slate-900">{formatLKR(subtotal)}</span>
            </div>

            {activeEntity && !activeEntity.isVatRegistered ? (
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Non-VAT Entity: {activeEntity.displayName || activeEntity.name}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">0% VAT</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  This billing entity is not registered for VAT with the IRD and cannot issue invoices charging VAT.
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vatApplicable}
                      onChange={(e) => {
                        setVatApplicable(e.target.checked);
                        if (e.target.checked && templateKey === 'standard') {
                          setTemplateKey('vat');
                        }
                      }}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-sm font-bold text-slate-800">Charge VAT (18%)</span>
                  </label>
                  <span className="text-xs font-mono font-semibold text-slate-600">Rate: {vatRate}%</span>
                </div>

                {vatApplicable && (
                  <div className="pt-2.5 border-t border-slate-200 space-y-2.5">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showVatSeparately}
                        onChange={(e) => setShowVatSeparately(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Show VAT as Separate Line on Invoice
                      </span>
                    </label>

                    {/* Mode Indicator & Accounting Details */}
                    <div className={`p-2.5 rounded-lg border text-xs ${
                      showVatSeparately
                        ? "bg-amber-50/80 border-amber-200 text-amber-950"
                        : "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                    }`}>
                      <span className="font-bold block text-[11px] uppercase tracking-wide">
                        {showVatSeparately ? "Presentation: Mode A — Separate Line" : "Presentation: Mode B — Inclusive (No Separate Row)"}
                      </span>
                      <span className="text-[11px] opacity-90 block mt-0.5">
                        {showVatSeparately
                          ? "Subtotal, VAT (18%), and Grand Total are itemized as separate lines on the invoice PDF."
                          : "Main total will display as 'Total (Including VAT)' with no separate VAT row. Full VAT calculation is preserved internally."}
                      </span>
                    </div>

                    {showVatSeparately && (
                      <div className="flex justify-between items-center text-xs pt-1 text-amber-900 font-medium">
                        <span>VAT Amount (18%):</span>
                        <span className="font-bold font-mono text-sm">{formatLKR(vatAmount)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="p-4 bg-navy-950 text-white rounded-xl flex items-center justify-between shadow-md">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-300 block font-semibold">
                  {vatApplicable && !showVatSeparately ? "Total (Including VAT)" : "Grand Total"}
                </span>
                <span className="text-xs text-emerald-400 font-medium">
                  {vatApplicable && !showVatSeparately ? `Includes ${formatLKR(vatAmount)} VAT (18%)` : "Sri Lankan Rupees (LKR)"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono tracking-tight">{formatLKR(grandTotal)}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPreviewOpen(true)}
                className="w-full flex items-center justify-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Full Layout Preview</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PDF Layout Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <DialogTitle className="text-navy-950 flex items-center space-x-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <span>Invoice PDF Preview</span>
              </DialogTitle>
              {/* Template switch in preview */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-semibold text-slate-600">Template:</span>
                <select
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value as InvoiceTemplateKey)}
                  className="h-8 rounded border border-slate-300 bg-white px-2 font-medium"
                >
                  <option value="standard">Standard Advertising</option>
                  <option value="vat">VAT Invoice</option>
                  <option value="sponsorship">Sponsorship Invoice</option>
                  <option value="custom">Custom Invoice</option>
                </select>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 overflow-x-auto">
            <InvoiceTemplateRenderer invoice={currentPreviewInvoice} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close Preview
            </Button>
            <Button
              onClick={() => {
                setIsPreviewOpen(false);
                handleSave("issued");
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Confirm &amp; Issue Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sticky Mobile Total Bar */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 bg-navy-950/95 backdrop-blur-md text-white px-4 py-2.5 z-30 shadow-2xl border-t border-navy-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-semibold">Grand Total</span>
          <span className="text-base font-black font-mono text-emerald-400">{formatLKR(grandTotal)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            className="text-xs h-9 bg-navy-900 border-navy-700 text-white hover:bg-navy-800 px-3"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            <span>Preview</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleSave("issued")}
            className="text-xs h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 shadow-md"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span>Issue</span>
          </Button>
        </div>
      </div>

      {/* Inline Client Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSaved={(newClient) => {
          setClients(storage.getClients());
          handleClientChange(newClient.id);
        }}
      />
    </div>
  );
}
