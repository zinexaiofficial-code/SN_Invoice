"use client";

import React, { useState, useEffect } from "react";
import { Supplier, SupplierType } from "@/types";
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
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  Tv,
  Radio,
  Plus,
  X,
  FileText
} from "lucide-react";

interface SupplierModalProps {
  supplier?: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (savedSupplier: Supplier) => void;
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

const SUGGESTED_CHANNELS = [
  "Siyatha TV",
  "Sooriyan FM",
  "Ran FM",
  "Jaya TV",
  "Sri Lanka Rupavahini",
  "Channel Eye",
  "ITN",
  "Sirasa TV",
  "Shakthi TV",
  "TV Derana",
  "Hiru TV",
  "Swarnavahini",
  "Gold FM",
  "Sun FM",
  "Yes FM",
  "Kiss FM"
];

export function SupplierModal({ supplier, isOpen, onClose, onSaved }: SupplierModalProps) {
  const { saveSupplier, suppliers } = useDatabase();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState<Partial<Supplier>>({
    code: "",
    name: "",
    type: "tv" as SupplierType,
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    taxNumber: "",
    defaultBank: "",
    defaultBranch: "",
    defaultAccountNo: "",
    defaultAccountName: "",
    paymentTerms: "Net 30",
    channels: [],
    notes: "",
    isActive: true,
  });

  const [channelInput, setChannelInput] = useState("");

  useEffect(() => {
    if (supplier) {
      setFormData({
        ...supplier,
        channels: supplier.channels || []
      });
    } else {
      // Auto-generate code SUP-001
      const count = suppliers.length + 1;
      const autoCode = `SUP-${String(count).padStart(3, "0")}`;
      setFormData({
        code: autoCode,
        name: "",
        type: "tv" as SupplierType,
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        taxNumber: "",
        defaultBank: "",
        defaultBranch: "",
        defaultAccountNo: "",
        defaultAccountName: "",
        paymentTerms: "Net 30",
        channels: [],
        notes: "",
        isActive: true,
      });
    }
    setChannelInput("");
    setError("");
  }, [supplier, isOpen, suppliers.length]);

  const handleChange = (field: keyof Supplier, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddChannel = (channelName: string) => {
    const trimmed = channelName.trim();
    if (!trimmed) return;
    const current = formData.channels || [];
    if (!current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        channels: [...current, trimmed]
      }));
    }
    setChannelInput("");
  };

  const handleRemoveChannel = (channelToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      channels: (prev.channels || []).filter((c) => c !== channelToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setError("Supplier Name is required.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const saved = await saveSupplier({
        ...formData,
        code: formData.code?.trim() || `SUP-${String(suppliers.length + 1).padStart(3, "0")}`,
        name: formData.name.trim(),
        type: formData.type || "other",
        contactPerson: formData.contactPerson?.trim() || "",
        phone: formData.phone?.trim() || "",
        email: formData.email?.trim() || "",
        address: formData.address?.trim() || "",
        taxNumber: formData.taxNumber?.trim() || "",
        defaultBank: formData.defaultBank?.trim() || "",
        defaultBranch: formData.defaultBranch?.trim() || "",
        defaultAccountNo: formData.defaultAccountNo?.trim() || "",
        defaultAccountName: formData.defaultAccountName?.trim() || "",
        paymentTerms: formData.paymentTerms || "Net 30",
        channels: formData.channels || [],
        notes: formData.notes?.trim() || "",
        isActive: formData.isActive ?? true,
      });

      if (onSaved) {
        onSaved(saved);
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to save supplier:", err);
      setError(err.message || "Failed to save supplier. Please check details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-xl border border-slate-200 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2 text-navy-950">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {supplier ? `Edit Supplier: ${supplier.name}` : "Register New Media Supplier / Vendor"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Manage supplier profiles, broadcast networks, payment terms, and banking details.
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
          {/* Top Row: Code, Name, Type */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-3 space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Supplier Code</Label>
              <Input
                value={formData.code || ""}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="SUP-001"
                className="text-xs font-mono"
              />
            </div>

            <div className="sm:col-span-6 space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Supplier Legal Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Voice of Asia Network (Pvt) Ltd"
                className="text-xs font-medium"
                required
              />
            </div>

            <div className="sm:col-span-3 space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Supplier Type</Label>
              <select
                value={formData.type || "tv"}
                onChange={(e) => handleChange("type", e.target.value as SupplierType)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="tv">Television Network</option>
                <option value="radio">Radio Broadcaster</option>
                <option value="media_house">Media House / Agency</option>
                <option value="other">General Supplier</option>
              </select>
            </div>
          </div>

          {/* Linked Broadcast Channels */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-blue-600" />
                <span>Linked Broadcast Channels</span>
              </Label>
              <span className="text-[10px] text-slate-500">
                Enables automatic matching when importing Media Schedules
              </span>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-1.5 min-h-[30px] p-1.5 bg-white border border-slate-200 rounded-md">
              {(formData.channels || []).length === 0 ? (
                <span className="text-xs text-slate-400 italic px-1">
                  No channels linked yet. Add channels below.
                </span>
              ) : (
                (formData.channels || []).map((ch) => (
                  <span
                    key={ch}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    <span>{ch}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChannel(ch)}
                      className="hover:text-red-600 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Input & Quick suggestions */}
            <div className="flex items-center gap-2">
              <Input
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChannel(channelInput);
                  }
                }}
                placeholder="Type channel name (e.g. Siyatha TV) and press Enter..."
                className="text-xs flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddChannel(channelInput)}
                className="text-xs h-9 px-3"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>

            {/* Quick Suggestions Pills */}
            <div className="flex flex-wrap gap-1 pt-1">
              <span className="text-[10px] text-slate-400 self-center mr-1">Quick Add:</span>
              {SUGGESTED_CHANNELS.filter(
                (ch) => !(formData.channels || []).some((c) => c.toLowerCase() === ch.toLowerCase())
              )
                .slice(0, 6)
                .map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => handleAddChannel(ch)}
                    className="text-[10px] px-2 py-0.5 bg-slate-200/70 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded transition-colors"
                  >
                    + {ch}
                  </button>
                ))}
            </div>
          </div>

          {/* Contact Details */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Contact & Business Address</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Contact Person</Label>
                <Input
                  value={formData.contactPerson || ""}
                  onChange={(e) => handleChange("contactPerson", e.target.value)}
                  placeholder="e.g. Mr. Nimal Perera"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Phone Number</Label>
                <Input
                  value={formData.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="e.g. +94 11 234 5678"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Email Address</Label>
                <Input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="e.g. billing@channel.lk"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Business Address</Label>
                <Input
                  value={formData.address || ""}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="e.g. No. 45, Television Road, Colombo 07"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Tax / VAT Registration No.</Label>
                <Input
                  value={formData.taxNumber || ""}
                  onChange={(e) => handleChange("taxNumber", e.target.value)}
                  placeholder="e.g. 102938475-7000"
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Banking & Settlement Details */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-emerald-50/20">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Banking & Payment Settlement Information</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Beneficiary Bank</Label>
                <select
                  value={formData.defaultBank || ""}
                  onChange={(e) => handleChange("defaultBank", e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">-- Select Bank --</option>
                  {COMMON_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Branch Name</Label>
                <Input
                  value={formData.defaultBranch || ""}
                  onChange={(e) => handleChange("defaultBranch", e.target.value)}
                  placeholder="e.g. Head Office / Colombo 03"
                  className="text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Account Number</Label>
                <Input
                  value={formData.defaultAccountNo || ""}
                  onChange={(e) => handleChange("defaultAccountNo", e.target.value)}
                  placeholder="e.g. 1000293848"
                  className="text-xs font-mono bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Account Beneficiary Name</Label>
                <Input
                  value={formData.defaultAccountName || ""}
                  onChange={(e) => handleChange("defaultAccountName", e.target.value)}
                  placeholder="e.g. Voice of Asia Network Pvt Ltd"
                  className="text-xs bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Default Payment Terms</Label>
                <select
                  value={formData.paymentTerms || "Net 30"}
                  onChange={(e) => handleChange("paymentTerms", e.target.value)}
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
              <div className="flex items-center space-x-2 pt-5">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive ?? true}
                  onChange={(e) => handleChange("isActive", e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <Label htmlFor="isActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Active Supplier (Available for new bills)
                </Label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Internal Remarks / Notes</Label>
            <Input
              value={formData.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="e.g. Credit facility approved with 30-day grace period."
              className="text-xs"
            />
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
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving Supplier...
                </>
              ) : supplier ? (
                "Update Supplier"
              ) : (
                "Save Supplier"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

