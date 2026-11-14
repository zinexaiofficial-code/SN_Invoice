"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { BillingEntity, InvoiceTemplateKey, InvoicePdfFormat, LayoutDensity, FontSizePreset } from "@/types";
import { storage } from "@/lib/storage";
import { RECOMMENDED_TYPOGRAPHY } from "@/lib/pdfTypography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Palette, 
  Landmark, 
  FileText, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  X,
  ShieldCheck,
  QrCode,
  ExternalLink,
  Eye,
  RefreshCw
} from "lucide-react";
import { DigitalApprovalBlock } from "@/components/invoices/DigitalApprovalBlock";

interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityToEdit?: BillingEntity | null;
  onSaved: (entity: BillingEntity) => void;
}

export function EntityModal({ isOpen, onClose, entityToEdit, onSaved }: EntityModalProps) {
  const [activeTab, setActiveTab] = useState<"identity" | "branding" | "banking" | "invoice" | "signature">("identity");
  const [error, setError] = useState<string>("");

  // Form State - Business Identity
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [brn, setBrn] = useState("");
  const [isVatRegistered, setIsVatRegistered] = useState(false);
  const [vatNumber, setVatNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("Kelaniya");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Sri Lanka");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [website, setWebsite] = useState("");

  // Branding
  const [logoUrl, setLogoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f172a");
  const [secondaryColor, setSecondaryColor] = useState("#059669");
  const [headerStyle, setHeaderStyle] = useState<'classic' | 'modern' | 'minimal'>('classic');
  const [footerText, setFooterText] = useState("");

  // Banking
  const [bankName, setBankName] = useState("");
  const [branch, setBranch] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [chequePayee, setChequePayee] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");

  // Invoice Configuration
  const [startingSequence, setStartingSequence] = useState<number>(1);
  const [defaultCurrency, setDefaultCurrency] = useState("LKR");
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("Immediate");
  const [defaultDueDays, setDefaultDueDays] = useState<number>(7);
  const [defaultInvoiceTemplate, setDefaultInvoiceTemplate] = useState<InvoiceTemplateKey>("standard");
  const [defaultPdfDensity, setDefaultPdfDensity] = useState<LayoutDensity>("balanced");
  const [defaultPdfMode, setDefaultPdfMode] = useState<FontSizePreset>("smart");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryDesignation, setSignatoryDesignation] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  // Digital Signature & Online Verification State
  const [signatureEnabled, setSignatureEnabled] = useState(true);
  const [signatoryEmail, setSignatoryEmail] = useState("");
  const [signatureImageUrl, setSignatureImageUrl] = useState("");
  const [displaySignatureImage, setDisplaySignatureImage] = useState(true);
  const [verificationEnabled, setVerificationEnabled] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
  const [settingsPreviewFormat, setSettingsPreviewFormat] = useState<InvoicePdfFormat>("digital");

  useEffect(() => {
    if (entityToEdit) {
      setLegalName(entityToEdit.name || "");
      setDisplayName(entityToEdit.displayName || entityToEdit.name || "");
      setPrefix(entityToEdit.prefix || "");
      setBrn(entityToEdit.brn || "");
      setIsVatRegistered(Boolean(entityToEdit.isVatRegistered));
      setVatNumber(entityToEdit.vatNumber || "");
      setAddressLine1(entityToEdit.addressLine1 || entityToEdit.address || "");
      setAddressLine2(entityToEdit.addressLine2 || "");
      setCity(entityToEdit.city || "Kelaniya");
      setPostalCode(entityToEdit.postalCode || "");
      setCountry(entityToEdit.country || "Sri Lanka");
      setEmail(entityToEdit.email || "");
      setPhone(entityToEdit.phone || "");
      setSecondaryPhone(entityToEdit.secondaryPhone || "");
      setWebsite(entityToEdit.website || "");

      setLogoUrl(entityToEdit.logoUrl || "");
      setSignatureUrl(entityToEdit.signatureUrl || "");
      setSignatureImageUrl(entityToEdit.signatureImageUrl || entityToEdit.signatureUrl || "");
      setPrimaryColor(entityToEdit.primaryColor || "#0f172a");
      setSecondaryColor(entityToEdit.secondaryColor || "#059669");
      setHeaderStyle(entityToEdit.headerStyle || "classic");
      setFooterText(entityToEdit.footerText || "");

      setBankName(entityToEdit.bankName || "");
      setBranch(entityToEdit.branch || "");
      setAccountName(entityToEdit.accountName || "");
      setAccountNumber(entityToEdit.accountNumber || "");
      setSwiftCode(entityToEdit.swiftCode || "");
      setChequePayee(entityToEdit.chequePayee || "");
      setPaymentInstructions(entityToEdit.paymentInstructions || "");

      setStartingSequence(entityToEdit.startingSequence || 1);
      setDefaultCurrency(entityToEdit.defaultCurrency || "LKR");
      setDefaultPaymentTerms(entityToEdit.defaultPaymentTerms || "Immediate");
      setDefaultDueDays(entityToEdit.defaultDueDays || 7);
      setDefaultInvoiceTemplate(entityToEdit.defaultInvoiceTemplate || (entityToEdit.isVatRegistered ? "vat" : "standard"));
      setDefaultPdfDensity(entityToEdit.defaultPdfLayout?.density || (entityToEdit.prefix === "HRP" ? "comfortable" : "balanced"));
      setDefaultPdfMode(entityToEdit.defaultPdfLayout?.mode || "smart");
      setSignatoryName(entityToEdit.signatoryName || (entityToEdit.prefix === "SN" ? "Shafil Surantha" : "Authorized Officer"));
      setSignatoryDesignation(entityToEdit.signatoryDesignation || (entityToEdit.prefix === "SN" ? "Authorized Signatory" : "Director of Operations"));
      setSignatoryEmail(entityToEdit.signatoryEmail || entityToEdit.email || (entityToEdit.prefix === "SN" ? "snadvertising@hotmail.com" : "info@haripara.lk"));
      setSignatureEnabled(entityToEdit.signatureEnabled ?? true);
      setDisplaySignatureImage(entityToEdit.displaySignatureImage ?? (entityToEdit.prefix === "SN" ? true : false));
      setVerificationEnabled(entityToEdit.verificationEnabled ?? true);
      setShowQrCode(entityToEdit.showQrCode ?? true);
      setInvoiceNotes(entityToEdit.invoiceNotes || "");
    } else {
      // Reset defaults for new entity
      setLegalName("");
      setDisplayName("");
      setPrefix("");
      setBrn("");
      setIsVatRegistered(false);
      setVatNumber("");
      setAddressLine1("");
      setAddressLine2("");
      setCity("Kelaniya");
      setPostalCode("");
      setCountry("Sri Lanka");
      setEmail("");
      setPhone("");
      setSecondaryPhone("");
      setWebsite("");

      setLogoUrl("");
      setSignatureUrl("");
      setSignatureImageUrl("");
      setSignatureEnabled(true);
      setSignatoryName("Shafil Surantha");
      setSignatoryDesignation("Authorized Signatory");
      setSignatoryEmail("");
      setDisplaySignatureImage(true);
      setVerificationEnabled(true);
      setShowQrCode(true);
      setPrimaryColor("#0f172a");
      setSecondaryColor("#059669");
      setHeaderStyle("classic");
      setFooterText("");

      setBankName("");
      setBranch("");
      setAccountName("");
      setAccountNumber("");
      setSwiftCode("");
      setChequePayee("");
      setPaymentInstructions("");

      setStartingSequence(1);
      setDefaultCurrency("LKR");
      setDefaultPaymentTerms("Immediate");
      setDefaultDueDays(7);
      setDefaultInvoiceTemplate("standard");
      setSignatoryName("");
      setSignatoryDesignation("");
      setInvoiceNotes("");
    }
    setError("");
    setActiveTab("identity");
  }, [entityToEdit, isOpen]);

  // Handle Logo Upload to persistent Base64 Data URL
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Logo must be PNG, JPG, or WebP format.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo file size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target?.result as string);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  // Handle Signature Upload
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Signature must be PNG, JPG, or WebP format.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Signature file size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSignatureUrl(dataUrl);
      setSignatureImageUrl(dataUrl);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedLegal = legalName.trim();
    const trimmedPrefix = prefix.trim().toUpperCase();

    if (!trimmedLegal) {
      setError("Legal Business Name is required.");
      setActiveTab("identity");
      return;
    }
    if (!trimmedPrefix) {
      setError("Entity Prefix is required (e.g. SN, HRP, ADV).");
      setActiveTab("identity");
      return;
    }

    // Check unique prefix
    if (storage.isPrefixTaken(trimmedPrefix, entityToEdit?.id)) {
      setError(`The prefix '${trimmedPrefix}' is already used by another entity. Please choose a unique prefix.`);
      setActiveTab("identity");
      return;
    }

    const fullAddress = [addressLine1.trim(), addressLine2.trim(), city.trim(), country.trim()]
      .filter(Boolean)
      .join(", ");

    const entityPayload: Partial<BillingEntity> = {
      id: entityToEdit?.id,
      name: trimmedLegal,
      displayName: displayName.trim() || trimmedLegal,
      prefix: trimmedPrefix,
      brn: brn.trim() || undefined,
      isVatRegistered,
      vatNumber: isVatRegistered ? vatNumber.trim() : undefined,
      address: fullAddress || "Kelaniya, Sri Lanka",
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      country: country.trim(),
      email: email.trim(),
      phone: phone.trim(),
      secondaryPhone: secondaryPhone.trim(),
      website: website.trim(),

      logoUrl: logoUrl.trim() || undefined,
      primaryColor,
      secondaryColor,
      headerStyle,
      footerText: footerText.trim() || `Thank you for partnering with ${displayName.trim() || trimmedLegal} — Sri Lanka`,

      bankName: bankName.trim(),
      branch: branch.trim(),
      accountName: accountName.trim() || trimmedLegal,
      accountNumber: accountNumber.trim(),
      swiftCode: swiftCode.trim(),
      chequePayee: chequePayee.trim() || displayName.trim() || trimmedLegal,
      paymentInstructions: paymentInstructions.trim() || `Cheques should be drawn in favour of ${chequePayee.trim() || trimmedLegal} and crossed "ACCOUNT PAYEE" only.`,

      startingSequence: Number(startingSequence) || 1,
      defaultCurrency,
      defaultPaymentTerms,
      defaultDueDays: Number(defaultDueDays) || 7,
      defaultInvoiceTemplate,
      defaultPdfLayout: {
        ...RECOMMENDED_TYPOGRAPHY[defaultPdfDensity],
        mode: defaultPdfMode,
        density: defaultPdfDensity,
      },
      signatoryName: signatoryName.trim() || "Authorized Signatory",
      signatoryDesignation: signatoryDesignation.trim() || `For ${displayName.trim() || trimmedLegal}`,
      signatoryEmail: signatoryEmail.trim() || email.trim() || undefined,
      signatureEnabled,
      displaySignatureImage,
      verificationEnabled,
      showQrCode,
      signatureImageUrl: signatureImageUrl.trim() || signatureUrl.trim() || undefined,
      signatureUrl: signatureImageUrl.trim() || signatureUrl.trim() || undefined,
      invoiceNotes: invoiceNotes.trim(),
      status: entityToEdit?.status || "active",
      isActive: entityToEdit?.isActive !== false,
    };

    const saved = storage.saveBillingEntity(entityPayload);
    onSaved(saved);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-white shadow-2xl border-slate-200">
        <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-navy-950 text-white flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-navy-950">
                  {entityToEdit ? `Edit Billing Entity: ${entityToEdit.displayName || entityToEdit.name}` : "Create New Billing Entity"}
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Configure independent legal identity, branding, banking details, and invoice sequence.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-1 pt-4 border-t border-slate-200/80 mt-3">
            {[
              { id: "identity", label: "Business Identity", icon: Building2 },
              { id: "branding", label: "Branding & Assets", icon: Palette },
              { id: "banking", label: "Banking & Accounts", icon: Landmark },
              { id: "invoice", label: "Invoice Config", icon: FileText },
              { id: "signature", label: "Digital Signature & Verification", icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isCurrent = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    isCurrent
                      ? "bg-navy-950 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: Business Identity */}
          {activeTab === "identity" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Legal Registered Business Name *</Label>
                  <Input
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. HARIPARA (PVT) LTD or SN Advertising"
                    className="font-bold text-navy-950"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Official registered corporate name</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Display / Trading Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. SN Advertising"
                  />
                  <span className="text-[10px] text-slate-400">Printed prominently on headers &amp; client documents</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Entity Code / Prefix *</Label>
                  <Input
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="e.g. SN or HRP"
                    className="font-mono font-bold text-navy-950"
                    maxLength={6}
                    required
                  />
                  <span className="text-[10px] text-slate-400">Used for running numbers (e.g. HRP-2026-0001)</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Business Reg. No (BRN)</Label>
                  <Input
                    value={brn}
                    onChange={(e) => setBrn(e.target.value)}
                    placeholder="e.g. PV-104928"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">VAT Registration Status</Label>
                  <div className="flex items-center space-x-2 pt-1.5">
                    <input
                      type="checkbox"
                      id="isVat"
                      checked={isVatRegistered}
                      onChange={(e) => setIsVatRegistered(e.target.checked)}
                      className="w-4 h-4 rounded text-navy-900 focus:ring-navy-900 border-slate-300"
                    />
                    <label htmlFor="isVat" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      VAT Registered Entity
                    </label>
                  </div>
                </div>
              </div>

              {isVatRegistered && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <Label className="text-xs font-bold text-amber-900">Issuer VAT Registration Number *</Label>
                  <Input
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    placeholder="e.g. 114094498-7000"
                    className="font-mono font-bold text-amber-950 bg-white"
                  />
                  <span className="text-[10px] text-amber-800">
                    Will be rendered on Tax Invoices under Inland Revenue Department guidelines.
                  </span>
                </div>
              )}

              {/* Address Fields */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Registered Office Address</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Address Line 1 *</Label>
                    <Input
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="e.g. 32/1, The Suriya Group, Talawatta"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Address Line 2</Label>
                    <Input
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="Gonawala"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">City *</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Kelaniya" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Postal Code</Label>
                    <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="11600" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Country</Label>
                    <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Sri Lanka" />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Contact Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Primary Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 11 772 8282" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Secondary / Mobile Phone</Label>
                    <Input value={secondaryPhone} onChange={(e) => setSecondaryPhone(e.target.value)} placeholder="+94 77 400 0004" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Official Email Address</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="billing@entity.lk" type="email" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Website</Label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.entity.lk" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Branding & Assets */}
          {activeTab === "branding" && (
            <div className="space-y-6 animate-in fade-in">
              {/* Logo Upload Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <Label className="text-xs font-bold text-navy-950 block">Company Logo (PNG, JPG, WebP)</Label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-xl border border-dashed border-slate-300 bg-white relative flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Entity Logo Preview" fill className="object-contain p-1" />
                    ) : (
                      <span className="text-xs text-slate-400 font-bold uppercase">{prefix || "LOGO"}</span>
                    )}
                  </div>
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-600 leading-relaxed">
                      Upload transparent PNG or clean logo file. Preserved at exact aspect ratio without distortion.
                    </p>
                    <div className="flex items-center space-x-2">
                      <label className="cursor-pointer bg-navy-950 hover:bg-navy-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Choose Logo File</span>
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {logoUrl && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setLogoUrl("")} className="text-rose-600 hover:text-rose-700">
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          <span>Remove</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Authorized Signature Upload */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <Label className="text-xs font-bold text-navy-950 block">Authorized Signature Stamp / Signature</Label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-36 h-20 rounded-xl border border-dashed border-slate-300 bg-white relative flex items-center justify-center overflow-hidden shrink-0">
                    {signatureUrl ? (
                      <Image src={signatureUrl} alt="Signature Preview" fill className="object-contain p-1" />
                    ) : (
                      <span className="font-script text-base text-slate-400 italic">Signature</span>
                    )}
                  </div>
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-600 leading-relaxed">
                      Scanned signature or stamp for this entity. Displayed on issued invoices and receipts.
                    </p>
                    <div className="flex items-center space-x-2">
                      <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Choose Signature File</span>
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSignatureUpload} className="hidden" />
                      </label>
                      {signatureUrl && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setSignatureUrl("")} className="text-rose-600 hover:text-rose-700">
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          <span>Remove</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Colors & Footer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Primary Brand Color</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 p-0 rounded-lg cursor-pointer border border-slate-300"
                    />
                    <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono text-xs uppercase" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Header Style</Label>
                  <select
                    value={headerStyle}
                    onChange={(e) => setHeaderStyle(e.target.value as any)}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold"
                  >
                    <option value="classic">Classic Agency Letterhead</option>
                    <option value="modern">Modern Corporate Clean</option>
                    <option value="minimal">Minimal Compact</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Invoice Footer Text</Label>
                <textarea
                  rows={2}
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="e.g. Thank you for partnering with HARIPARA (PVT) LTD — Colombo, Sri Lanka"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Banking Information */}
          {activeTab === "banking" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 leading-relaxed">
                <strong>Independent Bank Accounts:</strong> Invoices generated under this entity will instruct advertisers to make cheques and electronic bank transfers directly to this entity&apos;s bank account.
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Cheque Payee Name *</Label>
                <Input
                  value={chequePayee}
                  onChange={(e) => setChequePayee(e.target.value)}
                  placeholder="e.g. HARIPARA(PVT)LTD or SN ADVERTISING"
                  className="font-mono font-bold text-navy-950"
                  required
                />
                <span className="text-[10px] text-slate-400">Printed on: &quot;Cheques should be drawn in favour of [Cheque Payee]...&quot;</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Bank Name</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Commercial Bank of Ceylon or Seylan Bank"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Branch Name</Label>
                  <Input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. Kelaniya Branch"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Account Holder Name</Label>
                  <Input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. HARIPARA (PVT) LTD"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Account Number</Label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 10002938475"
                    className="font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">SWIFT / Bank Code (Optional)</Label>
                <Input
                  value={swiftCode}
                  onChange={(e) => setSwiftCode(e.target.value)}
                  placeholder="e.g. CCEYLKX"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Custom Payment Instructions (Optional override)</Label>
                <textarea
                  rows={3}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="Leave empty to auto-generate from bank details above"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Invoice Configuration */}
          {activeTab === "invoice" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Starting Invoice Sequence</Label>
                  <Input
                    type="number"
                    min={1}
                    value={startingSequence}
                    onChange={(e) => setStartingSequence(parseInt(e.target.value, 10) || 1)}
                    className="font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">First running number for new invoices</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Default Currency</Label>
                  <Input
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    placeholder="LKR"
                    className="font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Default Payment Terms</Label>
                  <Input
                    value={defaultPaymentTerms}
                    onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                    placeholder="e.g. 7 Days or Immediate"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Default Due Days</Label>
                  <Input
                    type="number"
                    min={0}
                    value={defaultDueDays}
                    onChange={(e) => setDefaultDueDays(parseInt(e.target.value, 10) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Default Layout Template</Label>
                  <select
                    value={defaultInvoiceTemplate}
                    onChange={(e) => setDefaultInvoiceTemplate(e.target.value as InvoiceTemplateKey)}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold"
                  >
                    <option value="standard">Standard Advertising (Classic Excel)</option>
                    <option value="vat">VAT Tax Invoice (IRD Compliant)</option>
                    <option value="sponsorship">Sponsorship Invoice (Radio/Media)</option>
                    <option value="custom">Custom Commercial Invoice</option>
                  </select>
                </div>
              </div>

              {/* Default A4 PDF Layout & Spacing Configuration */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-900 block">Default A4 PDF Layout Settings</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Default Layout Density</Label>
                    <select
                      value={defaultPdfDensity}
                      onChange={(e) => setDefaultPdfDensity(e.target.value as LayoutDensity)}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold"
                    >
                      <option value="comfortable">Comfortable (Generous spacing &amp; 10.5-11pt text)</option>
                      <option value="balanced">Balanced (Standard corporate &amp; 10pt text)</option>
                      <option value="compact">Compact (Tighter padding for dense advertising line items)</option>
                    </select>
                    <span className="text-[10px] text-slate-400">Controls row spacing and typography density for this entity</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Font Sizing Engine</Label>
                    <select
                      value={defaultPdfMode}
                      onChange={(e) => setDefaultPdfMode(e.target.value as FontSizePreset)}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold"
                    >
                      <option value="smart">Smart Auto Fit (Automatically adapts without shrinking below 9pt)</option>
                      <option value="manual">Manual Font Sizes (Follows entity configured scale)</option>
                    </select>
                    <span className="text-[10px] text-slate-400">Prevents text distortion and maintains A4 readability</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Authorized Signatory Name</Label>
                  <Input
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="e.g. S. Nawagamuwa or Authorized Officer"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Authorized Signatory Designation</Label>
                  <Input
                    value={signatoryDesignation}
                    onChange={(e) => setSignatoryDesignation(e.target.value)}
                    placeholder="e.g. Managing Director or Finance Director"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Default Invoice Special Notes</Label>
                <textarea
                  rows={2}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="e.g. 75% Advance Payment to Proceed with Production"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              {/* Digital Signature & Verification Quick Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-navy-950">Digital Signature &amp; Verification</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("signature")}
                    className="text-xs font-semibold text-navy-900 border-navy-200 hover:bg-navy-50"
                  >
                    Open Full Signature Settings
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Signatory</span>
                    <span className="font-bold text-navy-950 truncate block">{signatoryName || "Not set"}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Designation</span>
                    <span className="font-semibold text-slate-700 truncate block">{signatoryDesignation || "Not set"}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Signature Image</span>
                    <span className="font-bold text-slate-700">{signatureImageUrl ? (displaySignatureImage ? "Active & Visible" : "Uploaded (Hidden)") : "None"}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Verification QR</span>
                    <span className="font-bold text-emerald-700">{showQrCode ? "Enabled" : "Disabled"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Digital Signature & Verification */}
          {activeTab === "signature" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 leading-relaxed flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Entity-Specific Digital Authorization:</strong> Invoices issued under <strong>{displayName || legalName || "this entity"}</strong> will carry an authoritative digital approval block with verified signatory credentials, timestamp, and a public verification link.
                </div>
              </div>

              {/* Toggles Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signatureEnabled}
                    onChange={(e) => setSignatureEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-navy-950 focus:ring-navy-900 border-slate-300"
                  />
                  <span className="text-xs font-bold text-navy-950">Enable Digital Signature</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verificationEnabled}
                    onChange={(e) => setVerificationEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-navy-950 focus:ring-navy-900 border-slate-300"
                  />
                  <span className="text-xs font-bold text-navy-950">Enable Online Verification</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showQrCode}
                    onChange={(e) => setShowQrCode(e.target.checked)}
                    className="w-4 h-4 rounded text-navy-950 focus:ring-navy-900 border-slate-300"
                  />
                  <span className="text-xs font-bold text-navy-950">Show QR Code on Invoice</span>
                </label>
              </div>

              {/* Form Fields & Preview Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Left Column: Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">Authorized Signatory Full Name *</Label>
                    <Input
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      placeholder="e.g. Shafil Surantha"
                      className="font-bold text-navy-950"
                      required
                    />
                    <span className="text-[10px] text-slate-400">Official representative authorized to approve invoices for this entity.</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">Authorized Signatory Designation *</Label>
                    <Input
                      value={signatoryDesignation}
                      onChange={(e) => setSignatoryDesignation(e.target.value)}
                      placeholder="e.g. Authorized Signatory or Managing Director"
                      className="font-semibold text-slate-800"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">Authorized Signatory Email</Label>
                    <Input
                      type="email"
                      value={signatoryEmail}
                      onChange={(e) => setSignatoryEmail(e.target.value)}
                      placeholder="e.g. shafil@snadvertising.lk or snadvertising@hotmail.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800">Organization Name (Entity)</Label>
                    <Input
                      value={displayName || legalName || "SN Advertising"}
                      readOnly
                      disabled
                      className="bg-slate-100 font-semibold text-slate-600 cursor-not-allowed"
                    />
                    <span className="text-[10px] text-slate-400">Automatically loaded from entity legal &amp; display profile.</span>
                  </div>

                  {/* Signature Image Artwork */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-navy-950 block">Upload Signature Image (Optional)</Label>
                      <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={displaySignatureImage}
                          onChange={(e) => setDisplaySignatureImage(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-navy-950 focus:ring-navy-900 border-slate-300"
                        />
                        <span>Display Signature Image</span>
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-36 h-16 rounded-xl border border-dashed border-slate-300 bg-white relative flex items-center justify-center overflow-hidden shrink-0">
                        {signatureImageUrl ? (
                          <Image
                            src={signatureImageUrl}
                            alt="Signature Image Preview"
                            fill
                            className="object-contain p-1"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium italic">No artwork</span>
                        )}
                      </div>

                      <div className="space-y-2 text-xs flex-1">
                        <p className="text-slate-600 leading-snug text-[11px]">
                          Upload a transparent PNG, JPG, or WebP scan. When disabled or omitted, the invoice uses clean digital approval typography without handwritten fabrication.
                        </p>
                        <div className="flex items-center space-x-2">
                          <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm">
                            <Upload className="w-3.5 h-3.5 text-navy-900" />
                            <span>{signatureImageUrl ? "Replace Image" : "Upload Image"}</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleSignatureUpload}
                              className="hidden"
                            />
                          </label>
                          {signatureImageUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSignatureImageUrl("");
                                setSignatureUrl("");
                              }}
                              className="text-rose-600 hover:text-rose-700 h-8 text-xs font-bold"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              <span>Remove</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Interactive Appearance Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy-950 flex items-center space-x-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Signature Appearance Preview</span>
                    </span>
                    <div className="flex items-center space-x-1 bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setSettingsPreviewFormat("digital")}
                        className={`px-2 py-1 rounded transition-all ${
                          settingsPreviewFormat === "digital"
                            ? "bg-navy-950 text-white shadow-xs"
                            : "text-slate-600 hover:text-navy-950"
                        }`}
                      >
                        Digital (Adobe)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsPreviewFormat("print")}
                        className={`px-2 py-1 rounded transition-all ${
                          settingsPreviewFormat === "print"
                            ? "bg-navy-950 text-white shadow-xs"
                            : "text-slate-600 hover:text-navy-950"
                        }`}
                      >
                        Blank Hard Copy
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200 flex justify-center">
                    <DigitalApprovalBlock
                      format={settingsPreviewFormat}
                      previewSettings={{
                        signatureEnabled,
                        signatoryName: signatoryName || "Shafil Surantha",
                        signatoryDesignation: signatoryDesignation || "Authorized Signatory",
                        signatoryEmail: signatoryEmail || email || "snadvertising@hotmail.com",
                        signatureImageUrl,
                        displaySignatureImage,
                        verificationEnabled,
                        showQrCode,
                        entityName: displayName || legalName || "SN Advertising",
                        previewFormat: settingsPreviewFormat,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    Previewing {settingsPreviewFormat === "digital" ? "Adobe-style Digital Signature" : "Blank Hard Copy Print Signature"} for <strong>{displayName || legalName || "this entity"}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-navy-950 hover:bg-navy-900 text-white font-bold px-6 shadow-sm">
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
              <span>{entityToEdit ? "Save Entity Changes" : "Create Billing Entity"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

