"use client";

import React, { useState, useEffect } from "react";
import { Client, BillingEntity } from "@/types";
import { storage } from "@/lib/storage";
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
import { Building, AlertCircle } from "lucide-react";

interface ClientModalProps {
  client?: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (savedClient: Client) => void;
}

export function ClientModal({ client, isOpen, onClose, onSaved }: ClientModalProps) {
  const [billingEntities, setBillingEntities] = useState<BillingEntity[]>([]);
  
  const [formData, setFormData] = useState<Partial<Client>>({
    name: "",
    code: "",
    address: "",
    contactPerson: "",
    mobile: "",
    whatsapp: "",
    email: "",
    vatNumber: "",
    brn: "",
    defaultVatPreference: false,
    defaultBillingEntityId: "",
    defaultPaymentTerms: "Immediate",
    defaultAdvancePercentage: 0,
    defaultNote: "",
    internalNotes: "",
    isActive: true,
  });

  const [error, setError] = useState<string>("");

  useEffect(() => {
    const entities = storage.getBillingEntities();
    setBillingEntities(entities);

    if (client) {
      setFormData({ ...client });
    } else {
      setFormData({
        name: "",
        code: "",
        address: "",
        contactPerson: "",
        mobile: "",
        whatsapp: "",
        email: "",
        vatNumber: "",
        brn: "",
        defaultVatPreference: false,
        defaultBillingEntityId: entities[0]?.id || "",
        defaultPaymentTerms: "Immediate",
        defaultAdvancePercentage: 0,
        defaultNote: "",
        internalNotes: "",
        isActive: true,
      });
    }
    setError("");
  }, [client, isOpen]);

  const handleChange = (field: keyof Client, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name?.trim()) {
      setError("Please enter client or company name.");
      return;
    }

    if (!formData.address?.trim()) {
      setError("Please enter client address.");
      return;
    }

    // Duplicate check on name or code (Section 5 requirement)
    const allClients = storage.getClients();
    const existing = allClients.find(
      c => c.id !== client?.id && (
        c.name.trim().toLowerCase() === formData.name?.trim().toLowerCase() ||
        (formData.code?.trim() && c.code.toLowerCase() === formData.code?.trim().toLowerCase())
      )
    );

    if (existing) {
      setError(`A client with this name or code already exists (${existing.name} — ${existing.code}).`);
      return;
    }

    try {
      const saved = storage.saveClient(formData);
      if (onSaved) onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save client");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-navy-950">
            <Building className="w-5 h-5 text-emerald-600" />
            <span>{client ? "Edit Client Details" : "Add New Client"}</span>
          </DialogTitle>
          <DialogDescription>
            Create once, reuse indefinitely. Information auto-populates on future invoices.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="clientName">Client / Company Name *</Label>
              <Input
                id="clientName"
                value={formData.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Chamara Motors and Stickers Center"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="clientCode">Client Code (Auto if blank)</Label>
              <Input
                id="clientCode"
                value={formData.code || ""}
                onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                placeholder="e.g. CHM-001"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="clientAddress">Billing Address *</Label>
            <textarea
              id="clientAddress"
              rows={2}
              value={formData.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="31, Kandy Road Kirillwala, Kadawatha"
              required
              className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
            />
          </div>

          {/* Section: Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson || ""}
                onChange={(e) => handleChange("contactPerson", e.target.value)}
                placeholder="e.g. Mr. Chamara"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                value={formData.mobile || ""}
                onChange={(e) => handleChange("mobile", e.target.value)}
                placeholder="+94 77 123 4567"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp || ""}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
                placeholder="+94 77 123 4567"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="client@mail.lk"
              />
            </div>
          </div>

          {/* Section: Tax & Legal */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="text-xs font-bold text-navy-950 uppercase tracking-wider">Tax &amp; Legal Registration</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="vatNumber">Client VAT Number</Label>
                <Input
                  id="vatNumber"
                  value={formData.vatNumber || ""}
                  onChange={(e) => handleChange("vatNumber", e.target.value)}
                  placeholder="e.g. 100958996 - 7000"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="brn">Business Reg No (BRN)</Label>
                <Input
                  id="brn"
                  value={formData.brn || ""}
                  onChange={(e) => handleChange("brn", e.target.value)}
                  placeholder="e.g. PV-89104"
                />
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center space-x-2 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.defaultVatPreference || false}
                    onChange={(e) => handleChange("defaultVatPreference", e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-800">Charge VAT by default</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section: Default Billing Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="defaultBillingEntity">Default Billing Entity</Label>
              <select
                id="defaultBillingEntity"
                value={formData.defaultBillingEntityId || ""}
                onChange={(e) => handleChange("defaultBillingEntityId", e.target.value)}
                className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-900"
              >
                {billingEntities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="defaultPaymentTerms">Payment Terms</Label>
              <select
                id="defaultPaymentTerms"
                value={formData.defaultPaymentTerms || "Immediate"}
                onChange={(e) => handleChange("defaultPaymentTerms", e.target.value)}
                className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-900"
              >
                <option value="Immediate">Immediate / Advance</option>
                <option value="7 days">7 Days</option>
                <option value="14 days">14 Days</option>
                <option value="30 days">30 Days</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="defaultAdvancePercentage">Default Advance %</Label>
              <Input
                id="defaultAdvancePercentage"
                type="number"
                min="0"
                max="100"
                value={formData.defaultAdvancePercentage ?? 0}
                onChange={(e) => handleChange("defaultAdvancePercentage", parseFloat(e.target.value) || 0)}
                placeholder="e.g. 75"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="defaultNote">Default Note on Invoices</Label>
              <Input
                id="defaultNote"
                value={formData.defaultNote || ""}
                onChange={(e) => handleChange("defaultNote", e.target.value)}
                placeholder="e.g. 75% Advance Payment to Proceed with Work"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="internalNotes">Internal Notes (Not on PDF)</Label>
              <Input
                id="internalNotes"
                value={formData.internalNotes || ""}
                onChange={(e) => handleChange("internalNotes", e.target.value)}
                placeholder="e.g. Key client, orders monthly radio packages"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-navy-950 text-white hover:bg-navy-900">
              {client ? "Update Client" : "Save Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

