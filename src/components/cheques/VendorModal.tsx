"use client";

import React, { useState, useEffect } from "react";
import { Vendor } from "@/types";
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
import { Building2, AlertCircle, Loader2, CreditCard, User, Phone, Mail, MapPin } from "lucide-react";

interface VendorModalProps {
  vendor?: Vendor | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (savedVendor: Vendor) => void;
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

export function VendorModal({ vendor, isOpen, onClose, onSaved }: VendorModalProps) {
  const { saveVendor } = useDatabase();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState<Partial<Vendor>>({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    taxNumber: "",
    defaultBank: "",
    defaultBranch: "",
    defaultAccountNo: "",
    notes: "",
    isActive: true,
  });

  useEffect(() => {
    if (vendor) {
      setFormData({ ...vendor });
    } else {
      setFormData({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        taxNumber: "",
        defaultBank: "",
        defaultBranch: "",
        defaultAccountNo: "",
        notes: "",
        isActive: true,
      });
    }
    setError("");
  }, [vendor, isOpen]);

  const handleChange = (field: keyof Vendor, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setError("Vendor name is required.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const saved = await saveVendor({
        ...formData,
        name: formData.name.trim(),
        contactPerson: formData.contactPerson?.trim() || "",
        phone: formData.phone?.trim() || "",
        email: formData.email?.trim() || "",
        address: formData.address?.trim() || "",
        taxNumber: formData.taxNumber?.trim() || "",
        defaultBank: formData.defaultBank?.trim() || "",
        defaultBranch: formData.defaultBranch?.trim() || "",
        defaultAccountNo: formData.defaultAccountNo?.trim() || "",
        notes: formData.notes?.trim() || "",
      });

      if (onSaved) {
        onSaved(saved);
      }
      onClose();
    } catch (err: any) {
      console.error("Save vendor error:", err);
      setError(err.message || "Failed to save vendor. Please check database connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl shadow-2xl border border-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {vendor ? "Edit Payee / Vendor" : "Register New Vendor / Payee"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Manage vendor profiles, default banking details, and contact information for outgoing cheques.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="vendorName" className="font-bold text-slate-700">
                Vendor / Payee Name *
              </Label>
              <Input
                id="vendorName"
                value={formData.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Sri Lanka Rupavahini Corporation / Asia Broadcasting"
                required
                className="text-xs py-2 bg-slate-50/50"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="vendorContactPerson" className="font-semibold text-slate-600">
                Contact Person
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <Input
                  id="vendorContactPerson"
                  value={formData.contactPerson || ""}
                  onChange={(e) => handleChange("contactPerson", e.target.value)}
                  placeholder="e.g. Accounts Dept / Manager"
                  className="pl-8 text-xs py-2"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="vendorPhone" className="font-semibold text-slate-600">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <Input
                  id="vendorPhone"
                  value={formData.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+94 11 259 9505"
                  className="pl-8 text-xs py-2"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="vendorEmail" className="font-semibold text-slate-600">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <Input
                  id="vendorEmail"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="finance@rupavahini.lk"
                  className="pl-8 text-xs py-2"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="vendorTax" className="font-semibold text-slate-600">
                BRN / Tax Registration No
              </Label>
              <Input
                id="vendorTax"
                value={formData.taxNumber || ""}
                onChange={(e) => handleChange("taxNumber", e.target.value)}
                placeholder="e.g. PV-12345 / VAT-904"
                className="text-xs py-2"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="vendorAddress" className="font-semibold text-slate-600">
                Office / Mailing Address
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <Input
                  id="vendorAddress"
                  value={formData.address || ""}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="e.g. Independence Square, P.O. Box 421, Colombo 07"
                  className="pl-8 text-xs py-2"
                />
              </div>
            </div>
          </div>

          {/* Bank Account Details */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              <span>Default Banking & Cheque Deposit Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="vendorBank" className="text-[11px] font-semibold text-slate-600">
                  Bank Name
                </Label>
                <input
                  list="vendorBankOptions"
                  id="vendorBank"
                  value={formData.defaultBank || ""}
                  onChange={(e) => handleChange("defaultBank", e.target.value)}
                  placeholder="e.g. Bank of Ceylon"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <datalist id="vendorBankOptions">
                  {COMMON_BANKS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <Label htmlFor="vendorBranch" className="text-[11px] font-semibold text-slate-600">
                  Bank Branch
                </Label>
                <Input
                  id="vendorBranch"
                  value={formData.defaultBranch || ""}
                  onChange={(e) => handleChange("defaultBranch", e.target.value)}
                  placeholder="e.g. Main Branch / Torrington"
                  className="text-xs py-2 bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="vendorAccNo" className="text-[11px] font-semibold text-slate-600">
                  Account Number
                </Label>
                <Input
                  id="vendorAccNo"
                  value={formData.defaultAccountNo || ""}
                  onChange={(e) => handleChange("defaultAccountNo", e.target.value)}
                  placeholder="e.g. 0002345678"
                  className="text-xs py-2 bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="vendorNotes" className="font-semibold text-slate-600">
              Internal Remarks / Notes
            </Label>
            <textarea
              id="vendorNotes"
              rows={2}
              value={formData.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="e.g. Preferred media supplier for prime-time radio spots"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-sm"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {vendor ? "Save Changes" : "Save Vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

