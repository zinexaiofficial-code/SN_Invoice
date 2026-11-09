"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Service, InvoiceTemplate } from "@/types";
import { storage } from "@/lib/storage";
import { formatLKR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Layers, Plus, Edit2, FileText, CheckCircle2 } from "lucide-react";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [serviceName, setServiceName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [servicePrice, setServicePrice] = useState<number>(0);
  const [vatApplicable, setVatApplicable] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setServices(storage.getServices());
    setTemplates(storage.getTemplates());
  };

  const handleOpenModal = (srv?: Service) => {
    if (srv) {
      setEditingService(srv);
      setServiceName(srv.name);
      setServiceDesc(srv.defaultDescription || "");
      setServicePrice(srv.defaultPrice);
      setVatApplicable(srv.vatApplicable);
    } else {
      setEditingService(null);
      setServiceName("");
      setServiceDesc("");
      setServicePrice(0);
      setVatApplicable(false);
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    storage.saveService({
      id: editingService?.id,
      name: serviceName.trim(),
      defaultDescription: serviceDesc.trim(),
      defaultPrice: servicePrice,
      vatApplicable,
      isActive: true
    });

    setIsServiceModalOpen(false);
    refreshData();
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-navy-950 tracking-tight">Services &amp; Templates</h1>
            <p className="text-sm text-slate-500">
              Manage your advertising services catalog, default pricing, and PDF layout templates.
            </p>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </Button>
        </div>

        {/* Templates Showcase (Section 7) */}
        <div>
          <h2 className="text-base font-bold text-navy-950 mb-3 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Official Invoice Templates</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((tmpl) => (
              <Card key={tmpl.id} className="p-4 border-slate-200 hover:border-navy-900 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">
                      {tmpl.key}
                    </span>
                    {tmpl.isDefault && (
                      <Badge variant="success" className="text-[10px]">
                        Default
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-navy-950 text-sm">{tmpl.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tmpl.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ready
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">A4 Portrait</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Services Catalog (Section 13) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-navy-950 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Services Catalog ({services.length})</span>
            </h2>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Service Name</th>
                      <th className="py-3 px-4">Default Description</th>
                      <th className="py-3 px-3">VAT Applicable</th>
                      <th className="py-3 px-4 text-right">Default Price (LKR)</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.map((srv) => (
                      <tr key={srv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-navy-950">
                          {srv.name}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 max-w-md">
                          {srv.defaultDescription}
                        </td>
                        <td className="py-3.5 px-3 text-xs">
                          {srv.vatApplicable ? (
                            <Badge variant="warning" className="text-[10px]">
                              18% VAT
                            </Badge>
                          ) : (
                            <span className="text-slate-400">Non-VAT</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-navy-950">
                          {formatLKR(srv.defaultPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenModal(srv)}
                            className="p-1.5 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded"
                            title="Edit Service"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add / Edit Service Modal */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy-950">
              {editingService ? "Edit Service" : "Add Service to Catalog"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveService} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="sName">Service Name *</Label>
              <Input
                id="sName"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Video Campaign with Presenter (3 Clips)"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sDesc">Default Description</Label>
              <textarea
                id="sDesc"
                rows={2}
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
                placeholder="Pre-filled details when selected in invoice"
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sPrice">Default Price (LKR) *</Label>
              <Input
                id="sPrice"
                type="number"
                step="0.01"
                value={servicePrice || ""}
                onChange={(e) => setServicePrice(parseFloat(e.target.value) || 0)}
                placeholder="125000"
                required
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vatApplicable}
                  onChange={(e) => setVatApplicable(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Subject to VAT (18%) by default
                </span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsServiceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-navy-950 text-white hover:bg-navy-900">
                Save Service
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

