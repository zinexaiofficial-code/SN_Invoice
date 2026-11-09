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
import {
  Settings,
  Upload,
  CheckCircle2,
  Building,
  ShieldAlert,
  Percent,
  FileCheck
} from "lucide-react";

export default function SettingsPage() {
  const [branding, setBranding] = useState<BrandingSettings>(storage.getBranding());
  const [billingEntities, setBillingEntities] = useState<BillingEntity[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"branding" | "entities">("branding");

  useEffect(() => {
    setBranding(storage.getBranding());
    setBillingEntities(storage.getBillingEntities());
  }, []);

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = storage.saveBranding(branding);
    setBranding(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleUpdateEntity = (index: number, field: keyof BillingEntity, val: any) => {
    setBillingEntities((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSaveEntity = (entity: BillingEntity) => {
    storage.saveBillingEntity(entity);
    setBillingEntities(storage.getBillingEntities());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-navy-950 tracking-tight">Settings &amp; Branding</h1>
            <p className="text-sm text-slate-500">
              Configure business identity, logo, authorized signature, and billing entities.
            </p>
          </div>
          {savedSuccess && (
            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved successfully!</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("branding")}
            className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "branding"
                ? "border-navy-950 text-navy-950"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Business Branding &amp; Logo
          </button>
          <button
            onClick={() => setActiveTab("entities")}
            className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "entities"
                ? "border-navy-950 text-navy-950"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Billing Entities &amp; Bank Details ({billingEntities.length})
          </button>
        </div>

        {/* TAB 1: Business Branding */}
        {activeTab === "branding" && (
          <form onSubmit={handleSaveBranding} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Logo & Signature Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-navy-950">Official Identity Assets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Logo Preview */}
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1">Official SN Advertising Logo</Label>
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
                      <span className="text-xs font-bold text-navy-950">Original SN Logo Active</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Applied to all invoice PDFs</span>
                    </div>
                  </div>

                  {/* Authorized Signature */}
                  <div>
                    <Label className="text-xs text-slate-500 block mb-1">Authorized Signature Stamp</Label>
                    <div className="p-3 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center text-center">
                      <div className="font-script text-xl text-navy-950 italic py-2">
                        SN Advertising
                      </div>
                      <span className="text-[11px] text-slate-500">Authorized Signatory configured</span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                    <strong>One-Time Upload:</strong> The official logo and letterhead details are saved persistently and automatically injected into every new and historical invoice.
                  </div>
                </CardContent>
              </Card>

              {/* Business Contact & Tax Defaults */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-navy-950">Letterhead &amp; Contact Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="bName">Business Name *</Label>
                      <Input
                        id="bName"
                        value={branding.businessName}
                        onChange={(e) => setBranding({ ...branding, businessName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="vatRate">Default Applicable VAT Rate (%)</Label>
                      <Input
                        id="vatRate"
                        type="number"
                        step="0.01"
                        value={branding.defaultVatRate}
                        onChange={(e) => setBranding({ ...branding, defaultVatRate: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="bAddress">Official Business Address (Letterhead) *</Label>
                    <textarea
                      id="bAddress"
                      rows={2}
                      value={branding.address}
                      onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                      className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="bPhone">Official Contact Phone Numbers</Label>
                      <Input
                        id="bPhone"
                        value={branding.phone}
                        onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bEmail">Official Billing Email</Label>
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
                      Save Branding Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </form>
        )}

        {/* TAB 2: Billing Entities */}
        {activeTab === "entities" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {billingEntities.map((ent, idx) => (
                <Card key={ent.id} className="border-slate-200">
                  <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base text-navy-950 font-bold uppercase">{ent.name}</CardTitle>
                      <span className="text-xs text-slate-400 font-mono">Prefix: {ent.prefix}</span>
                    </div>
                    <Badge variant={ent.vatNumber ? "warning" : "info"} className="text-[10px]">
                      {ent.vatNumber ? `VAT: ${ent.vatNumber}` : "Non-VAT Entity"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Entity Display Name</Label>
                      <Input
                        value={ent.name}
                        onChange={(e) => handleUpdateEntity(idx, "name", e.target.value)}
                        className="h-9 text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Cheque Payee Name *</Label>
                      <Input
                        value={ent.chequePayee}
                        onChange={(e) => handleUpdateEntity(idx, "chequePayee", e.target.value)}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Bank Name</Label>
                        <Input
                          value={ent.bankName || ""}
                          onChange={(e) => handleUpdateEntity(idx, "bankName", e.target.value)}
                          placeholder="e.g. Seylan Bank"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Branch</Label>
                        <Input
                          value={ent.branch || ""}
                          onChange={(e) => handleUpdateEntity(idx, "branch", e.target.value)}
                          placeholder="Kadawatha Branch"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Account Name</Label>
                        <Input
                          value={ent.accountName || ""}
                          onChange={(e) => handleUpdateEntity(idx, "accountName", e.target.value)}
                          placeholder="SN Advertising"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Account Number</Label>
                        <Input
                          value={ent.accountNumber || ""}
                          onChange={(e) => handleUpdateEntity(idx, "accountNumber", e.target.value)}
                          placeholder="028013149867001"
                          className="h-9 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">VAT Number (If Registered)</Label>
                      <Input
                        value={ent.vatNumber || ""}
                        onChange={(e) => handleUpdateEntity(idx, "vatNumber", e.target.value)}
                        placeholder="e.g. 114094498-7000"
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Payment Instructions (Printed on Invoices)</Label>
                      <textarea
                        rows={2}
                        value={ent.paymentInstructions || ""}
                        onChange={(e) => handleUpdateEntity(idx, "paymentInstructions", e.target.value)}
                        className="w-full rounded-md border border-slate-300 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveEntity(billingEntities[idx])}
                        className="bg-navy-950 text-white hover:bg-navy-900 text-xs"
                      >
                        Update Entity
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

