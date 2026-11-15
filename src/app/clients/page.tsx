"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Client, Invoice } from "@/types";
import { useDatabase } from "@/context/DatabaseContext";
import { formatLKR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ClientModal } from "@/components/clients/ClientModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Search,
  Building,
  Phone,
  Mail,
  FileText,
  ChevronRight,
  Edit2,
  RefreshCw,
  Trash2,
  Loader2
} from "lucide-react";

export default function ClientsListPage() {
  const { clients, invoices, isLoading, error, refresh, isSuperAdmin, deleteClient } = useDatabase();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredClients = clients.filter((c) => {
    if (statusFilter === "active" && !c.isActive) return false;
    if (statusFilter === "inactive" && c.isActive) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesName = c.name.toLowerCase().includes(q);
      const matchesCode = (c.code || "").toLowerCase().includes(q);
      const matchesPhone = (c.mobile || "").includes(q) || (c.whatsapp || "").includes(q);
      const matchesVat = (c.vatNumber || "").toLowerCase().includes(q);
      if (!matchesName && !matchesCode && !matchesPhone && !matchesVat) return false;
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-navy-950 tracking-tight">Clients</h1>
            <p className="text-sm text-slate-500">
              Create once, reuse indefinitely across all advertising campaigns.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingClient(null);
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Client</span>
          </Button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company name, code, phone, VAT..."
              className="pl-9 h-10 text-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            {(["active", "inactive", "all"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-navy-950 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Clients Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Client / Company</th>
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-4">Contact &amp; Phone</th>
                    <th className="py-3 px-3">VAT Registration</th>
                    <th className="py-3 px-3 text-center">Invoices</th>
                    <th className="py-3 px-4 text-right">Total Billed</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((client) => {
                    const clientInvoices = invoices.filter((i) => i.clientId === client.id && i.status !== "void");
                    const totalBilled = clientInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

                    return (
                      <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-navy-950">
                          <Link href={`/clients/${client.id}`} className="hover:underline flex items-center space-x-2">
                            <span>{client.name}</span>
                          </Link>
                          <span className="block text-xs font-normal text-slate-500 mt-0.5 line-clamp-1">
                            {client.address}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-xs font-bold text-slate-700">
                          {client.code}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {client.contactPerson && <div className="font-semibold text-slate-800">{client.contactPerson}</div>}
                          {client.mobile && <div>{client.mobile}</div>}
                          {client.email && <div className="text-slate-400">{client.email}</div>}
                        </td>

                        <td className="py-3.5 px-3 text-xs font-mono text-slate-700">
                          {client.vatNumber ? (
                            <span className="text-amber-900 font-semibold">{client.vatNumber}</span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                          {clientInvoices.length}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-navy-950">
                          {formatLKR(totalBilled)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => {
                                setEditingClient(client);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded"
                              title="Edit Client"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/clients/${client.id}`}
                              className="p-1.5 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded"
                              title="View Client Details & History"
                            >
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            </Link>
                            {isSuperAdmin && (
                              <button
                                onClick={() => setClientToDelete(client)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                title="Delete Client (Super Admin)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                        {isLoading ? (
                          <div className="flex items-center justify-center space-x-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                            <span>Loading clients from database...</span>
                          </div>
                        ) : error ? (
                          <span className="text-rose-500 font-medium">{error}</span>
                        ) : (
                          "No clients found matching your search."
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ClientModal
        client={editingClient}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
        }}
        onSaved={refresh}
      />

      {/* Super Admin Delete Client Modal */}
      <Dialog open={Boolean(clientToDelete)} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-black text-navy-950">
              Permanently Delete Client?
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-slate-600 space-y-2 py-2">
            <p>
              Are you sure you want to delete client <strong className="text-navy-950 font-bold">{clientToDelete?.name}</strong> ({clientToDelete?.code})?
            </p>
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg">
              <p className="font-semibold">⚠️ Super Admin Action:</p>
              <p className="text-[11px] mt-0.5">If this client has existing invoices, they will safely archive to preserve invoice audit integrity, or be permanently removed if unused.</p>
            </div>
          </div>
          <DialogFooter className="mt-4 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setClientToDelete(null)}
              className="text-slate-600"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={async () => {
                if (!clientToDelete) return;
                setIsDeleting(true);
                try {
                  await deleteClient(clientToDelete.id);
                  setClientToDelete(null);
                } catch (err: any) {
                  alert("Failed to delete client: " + (err.message || "Unknown error"));
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center space-x-1"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Delete Client</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

