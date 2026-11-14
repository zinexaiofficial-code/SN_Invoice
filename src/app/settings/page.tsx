"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { AppLayout } from "@/components/layout/AppLayout";
import { BrandingSettings, BillingEntity } from "@/types";
import { storage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EntityModal } from "@/components/entities/EntityModal";
import {
  Settings,
  Upload,
  CheckCircle2,
  Building,
  ShieldAlert,
  Percent,
  FileCheck,
  Plus,
  Edit,
  Archive,
  ArchiveRestore,
  Trash2,
  AlertCircle,
  Building2,
  ExternalLink,
  CreditCard,
  Mail,
  Phone,
  ShieldCheck
} from "lucide-react";

export default function SettingsPage() {
  const [branding, setBranding] = useState<BrandingSettings>(storage.getBranding());
  const [billingEntities, setBillingEntities] = useState<BillingEntity[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"entities" | "branding">("entities");

  // Modal State
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [selectedEntityToEdit, setSelectedEntityToEdit] = useState<BillingEntity | null>(null);

  // Archive / Delete confirmation
  const [confirmAction, setConfirmAction] = useState<{
    type: "archive" | "unarchive" | "delete";
    entity: BillingEntity;
  } | null>(null);

  const loadData = () => {
    setBranding(storage.getBranding());
    setBillingEntities(storage.getBillingEntities());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = storage.saveBranding(branding);
    setBranding(updated);
    setSavedSuccess("Branding settings saved successfully!");
    setTimeout(() => setSavedSuccess(""), 4000);
  };

  const handleOpenCreateModal = () => {
    setSelectedEntityToEdit(null);
    setIsEntityModalOpen(true);
  };

  const handleOpenEditModal = (entity: BillingEntity) => {
    setSelectedEntityToEdit(entity);
    setIsEntityModalOpen(true);
  };

  const handleEntitySaved = (saved: BillingEntity) => {
    loadData();
    setSavedSuccess(`Billing entity "${saved.displayName || saved.name}" saved successfully!`);
    setTimeout(() => setSavedSuccess(""), 4000);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    const { type, entity } = confirmAction;

    if (type === "archive") {
      const res = storage.archiveBillingEntity(entity.id);
      if (!res.success) {
        alert(res.message);
      } else {
        setSavedSuccess(`Entity "${entity.name}" archived.`);
      }
    } else if (type === "unarchive") {
      const res = storage.unarchiveBillingEntity(entity.id);
      if (!res.success) {
        alert(res.message);
      } else {
        setSavedSuccess(`Entity "${entity.name}" restored to active status.`);
      }
    } else if (type === "delete") {
      const res = storage.deleteBillingEntity(entity.id);
      if (!res.success) {
        alert(res.message);
      } else {
        setSavedSuccess(`Entity "${entity.name}" removed.`);
      }
    }

    setConfirmAction(null);
    loadData();
    setTimeout(() => setSavedSuccess(""), 4000);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-navy-950 tracking-tight">Settings &amp; Entities</h1>
            <p className="text-sm text-slate-500">
              Manage multi-entity business profiles, independent bank accounts, logos, and invoices.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {savedSuccess && (
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{savedSuccess}</span>
              </div>
            )}
            <Button
              onClick={handleOpenCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Billing Entity</span>
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("entities")}
            className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "entities"
                ? "border-navy-950 text-navy-950"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Billing Entities &amp; Organizations ({billingEntities.length})
          </button>
          <button
            onClick={() => setActiveTab("branding")}
            className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "branding"
                ? "border-navy-950 text-navy-950"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Global Agency Branding &amp; Defaults
          </button>
        </div>

        {/* TAB 1: Billing Entities Management */}
        {activeTab === "entities" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {billingEntities.map((ent) => {
                const isArchived = ent.status === "archived" || !ent.isActive;
                const hasInvoices = storage.hasInvoices(ent.id);

                return (
                  <Card
                    key={ent.id}
                    className={`border-slate-200 overflow-hidden shadow-sm transition-all ${
                      isArchived ? "opacity-70 bg-slate-50 border-dashed" : "bg-white hover:border-slate-300"
                    }`}
                  >
                    <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-start justify-between gap-3 bg-slate-50/50">
                      <div className="flex items-center space-x-3.5 min-w-0">
                        {ent.logoUrl ? (
                          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 relative shrink-0 overflow-hidden p-1 shadow-xs">
                            <Image src={ent.logoUrl} alt={ent.name} fill className="object-contain" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-950 to-slate-800 text-white font-extrabold flex items-center justify-center tracking-wider shrink-0 shadow-xs">
                            {ent.prefix || ent.name.slice(0, 3).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <CardTitle className="text-base font-black text-navy-950 truncate uppercase">
                            {ent.displayName || ent.name}
                          </CardTitle>
                          {ent.displayName && ent.displayName !== ent.name && (
                            <p className="text-xs text-slate-500 font-semibold truncate">{ent.name}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="font-mono text-[11px] font-bold bg-navy-100 text-navy-900 px-2 py-0.5 rounded">
                              Prefix: {ent.prefix}
                            </span>
                            {ent.brn && (
                              <span className="text-[11px] text-slate-400 font-mono">
                                BRN: {ent.brn}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1 shrink-0">
                        <Badge
                          variant={ent.isVatRegistered ? "warning" : "info"}
                          className="text-[10px] font-bold"
                        >
                          {ent.isVatRegistered ? `VAT: ${ent.vatNumber || 'Yes'}` : "Non-VAT Entity"}
                        </Badge>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isArchived ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isArchived ? "Archived" : "Active"}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs text-slate-700">
                      {/* Address & Contacts */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Address &amp; Contacts</span>
                        <p className="text-slate-800 leading-snug">{ent.address}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-slate-600 font-sans">
                          {ent.email && (
                            <span className="flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{ent.email}</span>
                            </span>
                          )}
                          {ent.phone && (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{ent.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Banking Details */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-sans">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-navy-950 flex items-center space-x-1">
                            <CreditCard className="w-3 h-3 text-emerald-600" />
                            <span>Default Bank Account</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 font-semibold">
                            Payee: {ent.chequePayee}
                          </span>
                        </div>
                        <p className="font-bold text-navy-950 text-xs">
                          {ent.bankName || "No bank configured"} — {ent.branch || "General Branch"}
                        </p>
                        <p className="font-mono text-slate-700">
                          Account: {ent.accountNumber || "—"} ({ent.accountName || ent.name})
                        </p>
                      </div>

                      {/* Authorized Digital Approval Info */}
                      <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-emerald-900 flex items-center space-x-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Digital Signatory:</span>
                        </span>
                        <span className="font-bold text-navy-950 truncate max-w-[200px]">
                          {ent.signatoryName || "Shafil Surantha"}
                          <span className="font-normal text-slate-500 ml-1">({ent.signatoryDesignation || "Authorized Signatory"})</span>
                        </span>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {hasInvoices ? "Has historical invoices (Protected)" : "No invoices issued"}
                        </span>

                        <div className="flex items-center space-x-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditModal(ent)}
                            className="h-8 text-xs font-bold text-navy-950 hover:bg-slate-100"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" />
                            <span>Edit Entity</span>
                          </Button>

                          {isArchived ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmAction({ type: "unarchive", entity: ent })}
                              className="h-8 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5 mr-1" />
                              <span>Restore</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmAction({ type: "archive", entity: ent })}
                              className="h-8 text-xs text-slate-600 hover:text-slate-900"
                            >
                              <Archive className="w-3.5 h-3.5 mr-1" />
                              <span>Archive</span>
                            </Button>
                          )}

                          {!hasInvoices && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmAction({ type: "delete", entity: ent })}
                              className="h-8 text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Global Branding */}
        {activeTab === "branding" && (
          <form onSubmit={handleSaveBranding} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Official Agency Assets */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-navy-950">Master Identity Assets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1">Default Fallback Logo</Label>
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center">
                      <div className="w-24 h-24 relative mb-2">
                        <Image
                          src={branding.logoUrl || "/logo.png"}
                          alt="SN Advertising Logo"
                          fill
                          className="object-contain"
                          priority
                        />
                      </div>
                      <span className="text-xs font-bold text-navy-950">SN Advertising Master Logo</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Used when an entity lacks custom logo</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-500 block mb-1">Master Authorized Signature</Label>
                    <div className="p-3 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center text-center">
                      <div className="font-script text-xl text-navy-950 italic py-2">
                        SN Advertising
                      </div>
                      <span className="text-[11px] text-slate-500">Authorized Signatory</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Master Contact Details */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-navy-950">Agency HQ &amp; Tax Defaults</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="bName">Headquarters Agency Name *</Label>
                      <Input
                        id="bName"
                        value={branding.businessName}
                        onChange={(e) => setBranding({ ...branding, businessName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bVat">Default VAT Rate (%)</Label>
                      <Input
                        id="bVat"
                        type="number"
                        value={branding.defaultVatRate}
                        onChange={(e) => setBranding({ ...branding, defaultVatRate: parseFloat(e.target.value) || 18 })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="bAddr">Headquarters Address</Label>
                    <Input
                      id="bAddr"
                      value={branding.address}
                      onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="bPhone">Primary Phone Numbers</Label>
                      <Input
                        id="bPhone"
                        value={branding.phone}
                        onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bEmail">Official Email</Label>
                      <Input
                        id="bEmail"
                        type="email"
                        value={branding.email}
                        onChange={(e) => setBranding({ ...branding, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button type="submit" className="bg-navy-950 text-white hover:bg-navy-900 font-semibold">
                      Save Global Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </form>
        )}
      </div>

      {/* Entity Create / Edit Modal */}
      <EntityModal
        isOpen={isEntityModalOpen}
        onClose={() => setIsEntityModalOpen(false)}
        entityToEdit={selectedEntityToEdit}
        onSaved={handleEntitySaved}
      />

      {/* Confirmation Dialog for Archiving / Deleting */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center space-x-3 text-navy-950">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                confirmAction.type === 'delete' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
              }`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">
                  {confirmAction.type === "archive" && "Archive Billing Entity?"}
                  {confirmAction.type === "unarchive" && "Restore Billing Entity?"}
                  {confirmAction.type === "delete" && "Delete Billing Entity?"}
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  {confirmAction.entity.displayName || confirmAction.entity.name}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmAction.type === "archive" && (
                <>
                  Archiving this entity will hide it from the New Invoice issuer list. 
                  All historical invoices issued under <strong>{confirmAction.entity.name}</strong> will remain completely preserved with their frozen snapshots.
                </>
              )}
              {confirmAction.type === "unarchive" && (
                <>
                  Restoring this entity will make it active and selectable again for issuing new invoices.
                </>
              )}
              {confirmAction.type === "delete" && (
                <>
                  Are you sure you want to permanently delete this billing entity? This action cannot be undone.
                </>
              )}
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmAction}
                className={`font-bold ${
                  confirmAction.type === "delete" 
                    ? "bg-rose-600 hover:bg-rose-700 text-white" 
                    : "bg-navy-950 hover:bg-navy-900 text-white"
                }`}
              >
                Confirm {confirmAction.type === "archive" ? "Archive" : confirmAction.type === "unarchive" ? "Restore" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
