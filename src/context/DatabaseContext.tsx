"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Client,
  Invoice,
  BillingEntity,
  Service,
  MediaChannel,
  Cheque,
  BrandingSettings,
} from "@/types";
import { storage } from "@/lib/storage";

interface DatabaseContextType {
  clients: Client[];
  invoices: Invoice[];
  billingEntities: BillingEntity[];
  services: Service[];
  mediaChannels: MediaChannel[];
  cheques: Cheque[];
  branding: BrandingSettings | null;
  isLoading: boolean;
  error: string | null;
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
  saveCheque: (cheque: Partial<Cheque>) => Promise<Cheque>;
  deleteCheque: (id: string) => Promise<boolean>;
  saveBranding: (branding: Partial<BrandingSettings>) => Promise<BrandingSettings>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingEntities, setBillingEntities] = useState<BillingEntity[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [mediaChannels, setMediaChannels] = useState<MediaChannel[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBootstrap = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/bootstrap", {
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
      setBranding(storage.getBranding());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();

    const handleStorageChange = () => {
      fetchBootstrap();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("database-synced", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("database-synced", handleStorageChange);
    };
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
    return saved;
  };

  const deleteInvoice = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete invoice");
    }

    setInvoices((prev) => prev.filter((i) => i.id !== id));
    storage.deleteInvoiceLocally(id);
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
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete cheque");
    }

    setCheques((prev) => prev.filter((c) => c.id !== id));
    storage.deleteChequeLocally(id);
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

  return (
    <DatabaseContext.Provider
      value={{
        clients,
        invoices,
        billingEntities,
        services,
        mediaChannels,
        cheques,
        branding,
        isLoading,
        error,
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
        saveCheque,
        deleteCheque,
        saveBranding,
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

