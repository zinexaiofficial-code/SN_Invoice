"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Client,
  Invoice,
  BillingEntity,
  Service,
  MediaChannel,
  Cheque,
  Vendor,
  BrandingSettings,
  UserRole,
  MediaSchedule,
  Supplier,
  SupplierPayable,
  SupplierPaymentTransaction,
} from "@/types";
import { storage } from "@/lib/storage";

interface DatabaseContextType {
  clients: Client[];
  invoices: Invoice[];
  billingEntities: BillingEntity[];
  services: Service[];
  mediaChannels: MediaChannel[];
  cheques: Cheque[];
  vendors: Vendor[];
  schedules: MediaSchedule[];
  suppliers: Supplier[];
  supplierPayables: SupplierPayable[];
  branding: BrandingSettings | null;
  userRole: UserRole;
  isSuperAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  setUserRole: (role: UserRole) => void;
  refresh: () => Promise<void>;
  saveClient: (client: Partial<Client>) => Promise<Client>;
  archiveClient: (id: string) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;
  saveBillingEntity: (entity: Partial<BillingEntity>) => Promise<BillingEntity>;
  archiveBillingEntity: (id: string) => Promise<boolean>;
  deleteBillingEntity: (id: string) => Promise<boolean>;
  saveService: (service: Partial<Service>) => Promise<Service>;
  deleteService: (id: string) => Promise<boolean>;
  saveInvoice: (invoice: Partial<Invoice>) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<boolean>;
  deleteInvoicesBatch: (ids: string[]) => Promise<boolean>;
  saveCheque: (cheque: Partial<Cheque>) => Promise<Cheque>;
  deleteCheque: (id: string) => Promise<boolean>;
  saveVendor: (vendor: Partial<Vendor>) => Promise<Vendor>;
  deleteVendor: (id: string) => Promise<boolean>;
  saveSchedule: (schedule: Partial<MediaSchedule>) => Promise<MediaSchedule>;
  deleteSchedule: (id: string) => Promise<boolean>;
  convertScheduleToInvoice: (scheduleId: string, mode?: 'itemized' | 'package', options?: any) => Promise<Invoice>;
  saveBranding: (branding: Partial<BrandingSettings>) => Promise<BrandingSettings>;
  saveSupplier: (supplier: Partial<Supplier>) => Promise<Supplier>;
  deleteSupplier: (id: string) => Promise<boolean>;
  saveSupplierPayable: (payable: Partial<SupplierPayable>) => Promise<SupplierPayable>;
  deleteSupplierPayable: (id: string) => Promise<boolean>;
  recordSupplierPayment: (arg1: any, arg2?: any) => Promise<SupplierPaymentTransaction>;
  voidSupplierPayment: (transactionId: string, reason?: string) => Promise<boolean>;
  refreshSuppliers: () => Promise<void>;
  refreshSupplierPayables: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingEntities, setBillingEntities] = useState<BillingEntity[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [mediaChannels, setMediaChannels] = useState<MediaChannel[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [schedules, setSchedules] = useState<MediaSchedule[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierPayables, setSupplierPayables] = useState<SupplierPayable[]>([]);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [userRole, setUserRoleState] = useState<UserRole>("admin");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = userRole === "super_admin";

  useEffect(() => {
    setUserRoleState(storage.getUserRole());
    const handleRoleChanged = (e: any) => {
      const r = e.detail || storage.getUserRole();
      setUserRoleState(r);
    };
    const handleScheduleUpdated = () => {
      setSchedules(storage.getMediaSchedules());
    };
    window.addEventListener("user-role-changed", handleRoleChanged);
    window.addEventListener("schedule-updated", handleScheduleUpdated);
    return () => {
      window.removeEventListener("user-role-changed", handleRoleChanged);
      window.removeEventListener("schedule-updated", handleScheduleUpdated);
    };
  }, []);

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
    storage.setUserRole(role);
  };

  const isFetchingRef = React.useRef(false);

  const fetchBootstrap = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setError(null);
      const res = await fetch(`/api/bootstrap?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load system data (HTTP ${res.status})`);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || "Invalid response from server");
      }

      const data = json.data;
      setBillingEntities(data.billingEntities || []);
      setClients(data.clients || []);
      setServices(data.services || []);
      setMediaChannels(data.mediaChannels || []);
      setInvoices(data.invoices || []);
      setCheques(data.cheques || []);
      setVendors(data.vendors || []);
      setSchedules(data.mediaSchedules || []);
      setSuppliers(data.suppliers || []);
      setSupplierPayables(data.supplierPayables || []);
      setBranding(data.branding || null);

      // Cache snapshot into storage for offline PWA fallback
      storage.updateFromBootstrap(data);
    } catch (err: any) {
      console.error("[DatabaseProvider] Sync error:", err);
      setError(err?.message || "Error connecting to server database");
      // Resilient fallback to cached storage if offline
      setBillingEntities(storage.getBillingEntities());
      setClients(storage.getClients());
      setServices(storage.getServices());
      setMediaChannels(storage.getMediaChannels());
      setInvoices(storage.getInvoices());
      setCheques(storage.getCheques());
      setVendors(storage.getVendors());
      setSchedules(storage.getMediaSchedules());
      setBranding(storage.getBranding());
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  // --- CRUD Actions ---

  const saveClient = async (clientData: Partial<Client>): Promise<Client> => {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save client to database");
    }

    const json = await res.json();
    const saved: Client = json.data;

    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [...prev, saved];
    });

    storage.saveClientLocally(saved);
    return saved;
  };

  const archiveClient = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/clients?id=${encodeURIComponent(id)}&archive=true`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to archive client");
    }

    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: false } : c)));
    storage.archiveClientLocally(id);
    return true;
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/clients?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete client");
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || "Could not delete client");
    }

    setClients((prev) => prev.filter((c) => c.id !== id));
    storage.deleteClientLocally(id);
    return true;
  };

  const saveBillingEntity = async (entityData: Partial<BillingEntity>): Promise<BillingEntity> => {
    const res = await fetch("/api/billing-entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entityData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save billing entity");
    }

    const json = await res.json();
    const saved: BillingEntity = json.data;

    setBillingEntities((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [...prev, saved];
    });

    // Reactively synchronize invoices state in memory
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.billingEntityId === saved.id) {
          return {
            ...inv,
            billingSnapshot: {
              ...inv.billingSnapshot,
              name: saved.name,
              displayName: saved.displayName || saved.name,
              address: saved.address,
              addressLine1: saved.addressLine1,
              addressLine2: saved.addressLine2,
              city: saved.city,
              postalCode: saved.postalCode,
              country: saved.country,
              phone: saved.phone,
              secondaryPhone: saved.secondaryPhone,
              email: saved.email,
              website: saved.website,
              brn: saved.brn,
              vatNumber: saved.vatNumber,
              isVatRegistered: saved.isVatRegistered,
              chequePayee: saved.chequePayee || saved.displayName || saved.name,
              bankName: saved.bankName,
              branch: saved.branch,
              accountName: saved.accountName,
              accountNumber: saved.accountNumber,
              swiftCode: saved.swiftCode,
              paymentInstructions: saved.paymentInstructions,
              logoUrl: saved.logoUrl,
              signatureImageUrl: saved.signatureImageUrl || saved.signatureUrl,
              signatoryName: saved.signatoryName,
              signatoryDesignation: saved.signatoryDesignation,
              signatoryEmail: saved.signatoryEmail,
              footerText: saved.footerText,
              prefix: saved.prefix,
            },
          };
        }
        return inv;
      })
    );

    // Reactively synchronize cheques state in memory
    setCheques((prev) =>
      prev.map((chq) => {
        if (chq.billingEntityId === saved.id) {
          return {
            ...chq,
            billingEntityName: saved.displayName || saved.name,
            billingEntityPrefix: saved.prefix,
          };
        }
        return chq;
      })
    );

    storage.saveBillingEntityLocally(saved);
    return saved;
  };

  const archiveBillingEntity = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/billing-entities?id=${encodeURIComponent(id)}&archive=true`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to archive billing entity");
    }

    setBillingEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "archived", isActive: false } : e))
    );
    storage.archiveBillingEntityLocally(id);
    return true;
  };

  const deleteBillingEntity = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/billing-entities?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete billing entity");
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || "Cannot delete billing entity");
    }

    setBillingEntities((prev) => prev.filter((e) => e.id !== id));
    storage.deleteBillingEntityLocally(id);
    return true;
  };

  const saveService = async (serviceData: Partial<Service>): Promise<Service> => {
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serviceData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save service");
    }

    const json = await res.json();
    const saved: Service = json.data;

    setServices((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [...prev, saved];
    });

    storage.saveServiceLocally(saved);
    return saved;
  };

  const deleteService = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/services?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete service");
    }

    setServices((prev) => prev.filter((s) => s.id !== id));
    storage.deleteServiceLocally(id);
    return true;
  };

  const saveInvoice = async (invoiceData: Partial<Invoice>): Promise<Invoice> => {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save invoice");
    }

    const json = await res.json();
    const saved: Invoice = json.data;

    setInvoices((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [saved, ...prev];
    });

    storage.saveInvoiceLocally(saved);

    // Auto-increment sequence for the billing entity so the next invoice gets the incremented number
    if (saved.billingEntityId && saved.invoiceNumber) {
      storage.incrementInvoiceNumber(saved.billingEntityId, saved.invoiceNumber);

      const match = saved.invoiceNumber.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) {
          setBillingEntities((prev) =>
            prev.map((e) =>
              e.id === saved.billingEntityId
                ? { ...e, currentSequence: Math.max(e.currentSequence || 1, num + 1) }
                : e
            )
          );
        }
      }
    }

    return saved;
  };

  const deleteInvoice = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "x-user-role": userRole },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete invoice");
    }

    setInvoices((prev) => prev.filter((i) => i.id !== id));
    storage.deleteInvoiceLocally(id);
    return true;
  };

  const deleteInvoicesBatch = async (ids: string[]): Promise<boolean> => {
    if (!ids || ids.length === 0) return true;
    const res = await fetch("/api/invoices", {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        "x-user-role": userRole,
      },
      body: JSON.stringify({ ids }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to batch delete invoices");
    }

    const idSet = new Set(ids);
    setInvoices((prev) => prev.filter((i) => !idSet.has(i.id)));
    storage.deleteInvoicesLocally(ids);
    return true;
  };

  const saveCheque = async (chequeData: Partial<Cheque>): Promise<Cheque> => {
    const res = await fetch("/api/cheques", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chequeData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save cheque");
    }

    const json = await res.json();
    const saved: Cheque = json.data;

    setCheques((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [saved, ...prev];
    });

    storage.saveChequeLocally(saved);
    return saved;
  };

  const deleteCheque = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/cheques?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "x-user-role": userRole },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete cheque");
    }

    setCheques((prev) => prev.filter((c) => c.id !== id));
    storage.deleteChequeLocally(id);
    return true;
  };

  const saveVendor = async (vendorData: Partial<Vendor>): Promise<Vendor> => {
    const res = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vendorData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save vendor");
    }

    const json = await res.json();
    const saved: Vendor = json.data;

    setVendors((prev) => {
      const idx = prev.findIndex((v) => v.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [...prev, saved];
    });

    storage.saveVendorLocally(saved);
    return saved;
  };

  const deleteVendor = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/vendors?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete vendor");
    }

    setVendors((prev) => prev.filter((v) => v.id !== id));
    storage.deleteVendorLocally(id);
    return true;
  };

  const saveBranding = async (brandingData: Partial<BrandingSettings>): Promise<BrandingSettings> => {
    const res = await fetch("/api/branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brandingData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save branding settings");
    }

    const json = await res.json();
    const saved: BrandingSettings = json.data;
    setBranding(saved);
    storage.saveBrandingLocally(saved);
    return saved;
  };

  const saveSchedule = async (schedule: Partial<MediaSchedule>): Promise<MediaSchedule> => {
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedule),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Failed to save schedule");
    }

    const json = await res.json();
    const saved = json.data as MediaSchedule;
    setSchedules((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    storage.saveMediaScheduleLocally(saved);
    return saved;
  };

  const deleteSchedule = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/schedules?id=${encodeURIComponent(id)}`, { 
      method: "DELETE",
      headers: { "x-user-role": userRole },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete schedule");
    }
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    storage.deleteMediaScheduleLocally(id);
    return true;
  };

  const convertScheduleToInvoice = async (
    scheduleId: string,
    mode: "itemized" | "package" = "package",
    options?: any
  ): Promise<Invoice> => {
    const res = await fetch(`/api/schedules/${scheduleId}/convert-to-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, ...options }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Failed to convert schedule to invoice");
    }

    const json = await res.json();
    const createdInvoice = json.data as Invoice;

    setInvoices((prev) => [createdInvoice, ...prev.filter((i) => i.id !== createdInvoice.id)]);
    storage.saveInvoiceLocally(createdInvoice);

    setSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId
          ? {
              ...s,
              status: "converted",
              convertedToInvoiceId: createdInvoice.id,
              convertedToInvoiceNumber: createdInvoice.invoiceNumber,
              convertedAt: new Date().toISOString(),
            }
          : s
      )
    );

    return createdInvoice;
  };

  const refreshSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) setSuppliers(json.data);
      }
    } catch (e) {
      console.error("Failed to refresh suppliers:", e);
    }
  };

  const refreshSupplierPayables = async () => {
    try {
      const res = await fetch("/api/supplier-payables", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) setSupplierPayables(json.data);
      }
    } catch (e) {
      console.error("Failed to refresh supplier payables:", e);
    }
  };

  const saveSupplier = async (supplier: Partial<Supplier>): Promise<Supplier> => {
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supplier),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save supplier");
    }
    const json = await res.json();
    const saved = json.data as Supplier;
    setSuppliers((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
    return saved;
  };

  const deleteSupplier = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/suppliers?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "x-user-role": userRole },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete supplier");
    }
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    return true;
  };

  const saveSupplierPayable = async (payable: Partial<SupplierPayable>): Promise<SupplierPayable> => {
    const res = await fetch("/api/supplier-payables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payable),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save supplier payable");
    }
    const json = await res.json();
    const saved = json.data as SupplierPayable;
    setSupplierPayables((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
    return saved;
  };

  const deleteSupplierPayable = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/supplier-payables?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "x-user-role": userRole },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete supplier payable");
    }
    setSupplierPayables((prev) => prev.filter((p) => p.id !== id));
    return true;
  };

  const recordSupplierPayment = async (arg1: any, arg2?: any): Promise<SupplierPaymentTransaction> => {
    let paymentData: any = {};
    if (typeof arg1 === 'string' && arg2) {
      paymentData = { ...arg2, payableId: arg1 };
    } else {
      paymentData = { ...arg1 };
    }
    const res = await fetch(`/api/supplier-payables/${paymentData.payableId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to record payment");
    }
    const json = await res.json();
    const tx = json.data as SupplierPaymentTransaction;

    await refreshSupplierPayables();
    return tx;
  };

  const voidSupplierPayment = async (transactionId: string, reason?: string): Promise<boolean> => {
    const res = await fetch(
      `/api/supplier-payables/void/payments?transactionId=${transactionId}&reason=${encodeURIComponent(
        reason || "Voided by user"
      )}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to void payment");
    }
    await refreshSupplierPayables();
    return true;
  };

  return (
    <DatabaseContext.Provider
      value={{
        clients,
        invoices,
        billingEntities,
        services,
        mediaChannels,
        cheques,
        vendors,
        schedules,
        suppliers,
        supplierPayables,
        branding,
        userRole,
        isSuperAdmin,
        isLoading,
        error,
        setUserRole,
        refresh: fetchBootstrap,
        saveClient,
        archiveClient,
        deleteClient,
        saveBillingEntity,
        archiveBillingEntity,
        deleteBillingEntity,
        saveService,
        deleteService,
        saveInvoice,
        deleteInvoice,
        deleteInvoicesBatch,
        saveCheque,
        deleteCheque,
        saveVendor,
        deleteVendor,
        saveSchedule,
        deleteSchedule,
        convertScheduleToInvoice,
        saveBranding,
        saveSupplier,
        deleteSupplier,
        saveSupplierPayable,
        deleteSupplierPayable,
        recordSupplierPayment,
        voidSupplierPayment,
        refreshSuppliers,
        refreshSupplierPayables,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return ctx;
}

