"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Service,
  InvoiceTemplate,
  ServiceCategory,
  SERVICE_CATEGORIES,
  AdvertisingReferenceType,
  REFERENCE_TYPES,
  MediaChannel
} from "@/types";
import { useDatabase } from "@/context/DatabaseContext";
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
import {
  Layers,
  Plus,
  Edit2,
  FileText,
  CheckCircle2,
  Radio,
  Tv,
  Globe,
  Tag,
  Hash,
  Trash2,
  Sparkles,
  Loader2
} from "lucide-react";

export default function ServicesPage() {
  const { services, mediaChannels, saveService, deleteService, refresh } = useDatabase();
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Service form fields
  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory | "">("");
  const [mediaChannel, setMediaChannel] = useState("");
  const [isCustomChannel, setIsCustomChannel] = useState(false);
  const [customChannelName, setCustomChannelName] = useState("");
  const [referenceType, setReferenceType] = useState<AdvertisingReferenceType | "">("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [servicePrice, setServicePrice] = useState<number>(0);
  const [vatApplicable, setVatApplicable] = useState(false);

  // Quick channel creation state
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<'radio' | 'tv' | 'digital' | 'other'>('radio');

  useEffect(() => {
    setTemplates(storage.getTemplates());
  }, []);

  const handleOpenModal = (srv?: Service) => {
    if (srv) {
      setEditingService(srv);
      setServiceName(srv.name);
      setServiceCategory(srv.category || "");
      setMediaChannel(srv.defaultMediaChannel || "");
      setIsCustomChannel(false);
      setCustomChannelName("");
      setReferenceType(srv.defaultReferenceType || "");
      setServiceDesc(srv.defaultDescription || "");
      setServicePrice(srv.defaultPrice);
      setVatApplicable(srv.vatApplicable);
    } else {
      setEditingService(null);
      setServiceName("");
      setServiceCategory("");
      setMediaChannel("");
      setIsCustomChannel(false);
      setCustomChannelName("");
      setReferenceType("");
      setServiceDesc("");
      setServicePrice(0);
      setVatApplicable(false);
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    let finalChannel = mediaChannel.trim();
    if (isCustomChannel && customChannelName.trim()) {
      finalChannel = customChannelName.trim();
      // Auto-save to media channels list
      storage.saveMediaChannel({
        name: finalChannel,
        type: serviceCategory.includes("Television") ? "tv" : serviceCategory.includes("Digital") ? "digital" : "radio"
      });
    }

    setIsSaving(true);
    try {
      await saveService({
        id: editingService?.id,
        name: serviceName.trim(),
        category: serviceCategory || undefined,
        defaultMediaChannel: finalChannel || undefined,
        defaultReferenceType: referenceType || undefined,
        defaultDescription: serviceDesc.trim(),
        defaultPrice: servicePrice,
        vatApplicable,
        isActive: true
      });
      setIsServiceModalOpen(false);
    } catch (err: any) {
      alert(err?.message || "Failed to save service to database");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    storage.saveMediaChannel({
      name: newChannelName.trim(),
      type: newChannelType
    });
    setNewChannelName("");
    refresh();
  };

  const handleDeleteChannel = (id: string) => {
    if (confirm("Remove this station from media channels list?")) {
      storage.deleteMediaChannel(id);
      refresh();
    }
  };

  const getCategoryBadgeClass = (cat?: ServiceCategory) => {
    switch (cat) {
      case "Radio / FM Advertising":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "Television Advertising":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "Digital Advertising":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "Sponsorship":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "Media Production":
        return "bg-rose-50 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-navy-950 tracking-tight">Services &amp; Templates</h1>
            <p className="text-sm text-slate-500">
              Manage Radio, Television, Digital advertising services, station channels, and invoice templates.
            </p>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service to Catalog</span>
          </Button>
        </div>

        {/* Templates Showcase */}
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

        {/* Services Catalog */}
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
                      <th className="py-3 px-4">Service &amp; Category</th>
                      <th className="py-3 px-4">Media Channel</th>
                      <th className="py-3 px-3">Default Ref Type</th>
                      <th className="py-3 px-4">Default Description</th>
                      <th className="py-3 px-3">VAT</th>
                      <th className="py-3 px-4 text-right">Default Price (LKR)</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.map((srv) => (
                      <tr key={srv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-navy-950">{srv.name}</div>
                          {srv.category && (
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadgeClass(srv.category)}`}>
                              {srv.category}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {srv.defaultMediaChannel ? (
                            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded inline-flex items-center space-x-1">
                              {srv.category?.includes("Radio") && <Radio className="w-3 h-3 text-amber-600" />}
                              {srv.category?.includes("Television") && <Tv className="w-3 h-3 text-purple-600" />}
                              {srv.category?.includes("Digital") && <Globe className="w-3 h-3 text-blue-600" />}
                              <span>{srv.defaultMediaChannel}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Any / Flexible</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-xs">
                          {srv.defaultReferenceType ? (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {srv.defaultReferenceType}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                          {srv.defaultDescription}
                        </td>
                        <td className="py-3.5 px-3 text-xs">
                          {srv.vatApplicable ? (
                            <Badge variant="warning" className="text-[10px]">
                              18% VAT
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">0% Non-VAT</span>
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

        {/* Media Channels & Stations Management */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60 rounded-t-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base text-navy-950 flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-emerald-600" />
                  <span>Media Stations &amp; Broadcast Channels ({channels.length})</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-configured stations for Radio FM, Television, and Digital ad insertions. Custom stations can also be added freely.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Quick Add Channel Form */}
            <form onSubmit={handleAddChannel} className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <Input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Enter channel / station name (e.g. Shakthi FM, Hiru TV, TV Derana)..."
                className="text-xs bg-white flex-1"
              />
              <select
                value={newChannelType}
                onChange={(e) => setNewChannelType(e.target.value as any)}
                className="h-10 text-xs rounded-md border border-slate-300 bg-white px-3 font-semibold text-slate-800"
              >
                <option value="radio">Radio / FM</option>
                <option value="tv">Television</option>
                <option value="digital">Digital / Social</option>
                <option value="other">Other Channel</option>
              </select>
              <Button type="submit" size="sm" className="bg-navy-950 text-white hover:bg-navy-900 text-xs font-bold shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Add Channel</span>
              </Button>
            </form>

            {/* Channels Pill Grid */}
            <div className="flex flex-wrap gap-2 pt-1">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold bg-white border-slate-200 text-slate-800 shadow-2xs group"
                >
                  {ch.type === "radio" && <Radio className="w-3 h-3 text-amber-600" />}
                  {ch.type === "tv" && <Tv className="w-3 h-3 text-purple-600" />}
                  {ch.type === "digital" && <Globe className="w-3 h-3 text-blue-600" />}
                  <span>{ch.name}</span>
                  {ch.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteChannel(ch.id)}
                      className="text-slate-300 hover:text-rose-600 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete custom channel"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Service Modal */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-navy-950 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{editingService ? "Edit Service" : "Add Service to Catalog"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveService} className="space-y-4 py-2">
            {/* Service Name */}
            <div className="space-y-1">
              <Label htmlFor="sName">Service Name *</Label>
              <Input
                id="sName"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Commercial Advertising Package on Hiru FM"
                required
              />
            </div>

            {/* Service Category */}
            <div className="space-y-1">
              <Label htmlFor="sCat" className="flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>Service Category (Optional)</span>
              </Label>
              <select
                id="sCat"
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
                className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-900"
              >
                <option value="">-- Select Category --</option>
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Media Channel / Station */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sChannel" className="flex items-center space-x-1 text-xs">
                  <Radio className="w-3.5 h-3.5 text-slate-500" />
                  <span>Media Channel / Station (Optional)</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setIsCustomChannel(!isCustomChannel)}
                  className="text-[11px] text-emerald-700 hover:underline font-bold"
                >
                  {isCustomChannel ? "Select from list" : "+ Enter custom station"}
                </button>
              </div>

              {isCustomChannel ? (
                <Input
                  value={customChannelName}
                  onChange={(e) => setCustomChannelName(e.target.value)}
                  placeholder="Type custom station name (e.g. Shakthi FM, Capital TV)..."
                  className="text-xs"
                />
              ) : (
                <select
                  id="sChannel"
                  value={mediaChannel}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomChannel(true);
                      setMediaChannel("");
                    } else {
                      setMediaChannel(e.target.value);
                    }
                  }}
                  className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-900"
                >
                  <option value="">-- No Default Channel / Flexible --</option>
                  <optgroup label="Radio / FM Stations">
                    {channels.filter((c) => c.type === "radio").map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Television Stations">
                    {channels.filter((c) => c.type === "tv").map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Digital Channels">
                    {channels.filter((c) => c.type === "digital").map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <option value="__custom__">+ Enter Custom Channel...</option>
                </select>
              )}
            </div>

            {/* Default Reference Type */}
            <div className="space-y-1">
              <Label htmlFor="sRefType" className="flex items-center space-x-1">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                <span>Default Reference Type (Optional)</span>
              </Label>
              <select
                id="sRefType"
                value={referenceType}
                onChange={(e) => setReferenceType(e.target.value as AdvertisingReferenceType)}
                className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-900"
              >
                <option value="">-- None / Standard Service --</option>
                {REFERENCE_TYPES.map((ref) => (
                  <option key={ref} value={ref}>
                    {ref} (e.g. RO Number, Booking Ref, Spot ID)
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 block">
                The actual reference number (RO No, Spot ID) will be entered per invoice line item.
              </span>
            </div>

            {/* Default Description */}
            <div className="space-y-1">
              <Label htmlFor="sDesc">Default Description</Label>
              <textarea
                id="sDesc"
                rows={2}
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
                placeholder="Pre-filled details when selected in invoice (e.g. Prime-Time 30-sec spots)"
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
              />
            </div>

            {/* Default Price */}
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

            {/* VAT Checkbox */}
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

            <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Button type="button" variant="outline" onClick={() => setIsServiceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-navy-950 text-white hover:bg-navy-900 font-bold flex items-center space-x-1.5">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                <span>{isSaving ? "Saving..." : "Save Service"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
