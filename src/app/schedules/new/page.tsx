"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Radio,
  Tv,
  Calendar,
  Building2,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { MediaSchedule, MediaScheduleItem, MediaPricingMode, MediaType } from '@/types';
import { ScheduleGrid } from '@/components/schedules/ScheduleGrid';
import { ScheduleImportModal } from '@/components/schedules/ScheduleImportModal';

export default function NewSchedulePage() {
  const router = useRouter();
  const { billingEntities, clients, mediaChannels, saveSchedule } = useDatabase();

  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [channelName, setChannelName] = useState<string>('Siyatha TV');
  const [mediaType, setMediaType] = useState<MediaType>('tv');
  const [campaignName, setCampaignName] = useState<string>('');
  const [scheduleNumber, setScheduleNumber] = useState<string>('');

  // Dates
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Pricing
  const [pricingMode, setPricingMode] = useState<MediaPricingMode>('package');
  const [packageAmount, setPackageAmount] = useState<number>(475000);
  const [defaultSpotRate, setDefaultSpotRate] = useState<number>(0);
  const [taxApplicable, setTaxApplicable] = useState<boolean>(true);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [specialNotes, setSpecialNotes] = useState<string>('Special Investment: Rs. 475,000 + TAX');
  const [terms, setTerms] = useState<string>('Tapes and transmission assets to be delivered 48 hours prior to telecast.');

  // Items
  const [items, setItems] = useState<MediaScheduleItem[]>([
    {
      id: crypto.randomUUID(),
      programmeName: 'Drama (Prime Time)',
      timeSlot: '08:00 PM - 08:30 PM',
      duration: '10s',
      adType: 'Spot',
      ratePerSpot: 0,
      totalSpots: 0,
      totalAmount: 0,
      displayOrder: 0,
      allocations: {},
    },
    {
      id: crypto.randomUUID(),
      programmeName: 'Morning Show',
      timeSlot: '07:00 AM - 09:00 AM',
      duration: '10s',
      adType: 'Spot',
      ratePerSpot: 0,
      totalSpots: 0,
      totalAmount: 0,
      displayOrder: 1,
      allocations: {},
    },
  ]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize entity & client
  useEffect(() => {
    if (billingEntities.length > 0 && !selectedEntityId) {
      setSelectedEntityId(billingEntities[0].id);
    }
  }, [billingEntities, selectedEntityId]);

  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  // Auto-generate schedule number
  useEffect(() => {
    if (!scheduleNumber && selectedEntityId) {
      const entity = billingEntities.find((e) => e.id === selectedEntityId);
      const prefix = entity?.prefix || (entity as any)?.invoicePrefix || 'SN';
      const year = new Date().getFullYear();
      setScheduleNumber(`SCH-${prefix}-${year}-0001`);
    }
  }, [selectedEntityId, billingEntities, scheduleNumber]);

  // Auto-update campaign name when client changes
  useEffect(() => {
    const client = clients.find((c) => c.id === selectedClientId);
    if (client && !campaignName) {
      setCampaignName(`${client.name || client.companyName} Broadcast Campaign`);
    }
  }, [selectedClientId, clients, campaignName]);

  // Compute date array
  const dateList = useMemo(() => {
    const dates: string[] = [];
    if (!startDate || !endDate) return dates;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return dates;

    const curr = new Date(start);
    while (curr <= end && dates.length < 60) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  // Calculate grand total spots and financials
  const grandTotalSpots = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.totalSpots || 0), 0);
  }, [items]);

  const grossAmount = useMemo(() => {
    if (pricingMode === 'package') return Number(packageAmount) || 0;
    if (pricingMode === 'spot_rate') {
      return items.reduce((sum, it) => sum + (it.totalAmount || 0), 0);
    }
    return 0;
  }, [pricingMode, packageAmount, items]);

  const taxAmount = useMemo(() => {
    return taxApplicable ? Math.round(grossAmount * (taxRate / 100)) : 0;
  }, [grossAmount, taxApplicable, taxRate]);

  const netTotal = grossAmount + taxAmount;

  // Handle Save
  const handleSave = async (status: 'draft' | 'confirmed' = 'draft') => {
    if (!selectedEntityId || !selectedClientId) {
      setError('Please select a Billing Entity and Client.');
      return;
    }
    if (!campaignName.trim()) {
      setError('Campaign name is required.');
      return;
    }
    if (dateList.length === 0) {
      setError('Please provide a valid start and end date range.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const entity = billingEntities.find((e) => e.id === selectedEntityId);
      const client = clients.find((c) => c.id === selectedClientId);

      const scheduleData: Partial<MediaSchedule> = {
        scheduleNumber: scheduleNumber.trim() || `SCH-${Date.now().toString().slice(-6)}`,
        billingEntityId: selectedEntityId,
        clientId: selectedClientId,
        mediaChannelName: channelName,
        mediaType,
        campaignName: campaignName.trim(),
        startDate,
        endDate,
        status,
        pricingMode,
        packageAmount: Number(packageAmount) || 0,
        ratePerSpot: Number(defaultSpotRate) || 0,
        grossAmount,
        discountAmount: 0,
        taxApplicable,
        taxRate,
        taxAmount,
        netTotal,
        specialNotes,
        termsAndConditions: terms,
        pdfOrientation: 'landscape',
        pdfPaperSize: 'A4',
        clientSnapshot: client ? {
          id: client.id,
          name: client.name,
          companyName: client.name || client.companyName || '',
          address: client.address || '',
          email: client.email || '',
          phone: client.mobile || (client as any).phone || '',
          vatNumber: client.vatNumber || '',
        } as any : undefined,
        billingEntitySnapshot: entity ? {
          id: entity.id,
          name: entity.name,
          legalName: (entity as any).legalName || entity.name,
          address: entity.address || '',
          phone: entity.phone || '',
          email: entity.email || '',
          vatNumber: entity.vatNumber || '',
          logoUrl: entity.logoUrl || '',
        } as any : undefined,
        items,
      };

      const saved = await saveSchedule(scheduleData);
      router.push(`/schedules/${saved.id}`);
    } catch (err: any) {
      console.error('Error saving new schedule:', err);
      setError(err?.message || 'Failed to save media schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/schedules"
            className="p-2 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Media Schedule</h1>
            <p className="text-xs text-slate-500">
              Configure broadcast media, daily frequency allocations, and commercials.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import from Excel</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('confirmed')}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save & Confirm Schedule'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Meta Configuration Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>Schedule Header & Identity</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Billing Entity */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Billing Entity (Agency / Issuer) *
            </label>
            <select
              value={selectedEntityId}
              onChange={(e) => {
                setSelectedEntityId(e.target.value);
                const ent = billingEntities.find((b) => b.id === e.target.value);
                const p = ent?.prefix || (ent as any)?.invoicePrefix || 'SN';
                setScheduleNumber(`SCH-${p}-${new Date().getFullYear()}-0001`);
              }}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            >
              {billingEntities.map((e) => (
                <option key={e.id} value={e.id}>
                  [{e.prefix || (e as any)?.invoicePrefix || 'ENT'}] {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Client / Advertiser *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.companyName}
                </option>
              ))}
            </select>
          </div>

          {/* Channel Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Broadcast Channel *
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => {
                setChannelName(e.target.value);
                if (/fm|radio/i.test(e.target.value)) setMediaType('radio');
                else if (/tv/i.test(e.target.value)) setMediaType('tv');
              }}
              list="media-channel-datalist"
              placeholder="e.g. Siyatha TV, Ran FM, Sooriyan FM"
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 uppercase"
            />
            <datalist id="media-channel-datalist">
              {mediaChannels.map((mc) => (
                <option key={mc.id} value={mc.name} />
              ))}
            </datalist>
          </div>

          {/* Media Type */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Media Medium
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMediaType('tv')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                  mediaType === 'tv'
                    ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>TV</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaType('radio')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all ${
                  mediaType === 'radio'
                    ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Radio</span>
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Campaign, Schedule #, Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Campaign Name */}
          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Campaign / Product Title *
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. Ayathi Biologique - Prime Time Campaign"
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            />
          </div>

          {/* Schedule Number */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Schedule Ref. # *
            </label>
            <input
              type="text"
              value={scheduleNumber}
              onChange={(e) => setScheduleNumber(e.target.value)}
              placeholder="SCH-SN-2026-0001"
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Broadcast Date Range ({dateList.length} Days)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Commercial & Pricing Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Commercial Terms & Investment Structure</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Pricing Mode */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Pricing Mode
            </label>
            <select
              value={pricingMode}
              onChange={(e) => setPricingMode(e.target.value as MediaPricingMode)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            >
              <option value="package">Special Investment Package (Lump Sum)</option>
              <option value="spot_rate">Rate Per Spot (Calculated)</option>
              <option value="not_set">Unpriced / Scheduling Only</option>
            </select>
          </div>

          {/* Package Investment Amount */}
          {pricingMode === 'package' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Special Investment Amount (LKR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rs.</span>
                <input
                  type="number"
                  value={packageAmount || ''}
                  onChange={(e) => setPackageAmount(Number(e.target.value) || 0)}
                  placeholder="475000"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Spot Rate default */}
          {pricingMode === 'spot_rate' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Default Rate Per Spot (LKR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rs.</span>
                <input
                  type="number"
                  value={defaultSpotRate || ''}
                  onChange={(e) => setDefaultSpotRate(Number(e.target.value) || 0)}
                  placeholder="2500"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Tax / VAT Toggle */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Applicable Tax (VAT)
            </label>
            <div className="flex items-center space-x-3 pt-1.5">
              <label className="inline-flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxApplicable}
                  onChange={(e) => setTaxApplicable(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-700">+ TAX ({taxRate}% VAT)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Financial Summary Pill */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Total Scheduled Transmissions:</span>
            <strong className="text-emerald-700 text-sm font-black">{grandTotalSpots} spots</strong>
          </div>

          <div>
            <span className="text-slate-500 block">Gross Value:</span>
            <strong className="text-slate-800 font-mono">
              Rs. {grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </strong>
          </div>

          {taxApplicable && (
            <div>
              <span className="text-slate-500 block">VAT ({taxRate}%):</span>
              <strong className="text-slate-800 font-mono">
                + Rs. {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          )}

          <div className="text-right">
            <span className="text-slate-500 block">Net Schedule Value:</span>
            <strong className="text-emerald-800 font-mono text-base font-black">
              Rs. {netTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      </div>

      {/* Interactive Date Grid */}
      <ScheduleGrid
        dates={dateList}
        items={items}
        pricingMode={pricingMode}
        defaultRate={defaultSpotRate}
        onChange={setItems}
      />

      {/* Notes & Broadcast Terms */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
          Notes & Insertion Order Terms
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Broadcast Special Notes
            </label>
            <textarea
              rows={3}
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="e.g. Special Investment: Rs. 475,000 + TAX"
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Terms & Conditions
            </label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="e.g. Tapes to be delivered 48 hours prior to scheduled telecast."
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <ScheduleImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={(saved) => {
            router.push(`/schedules/${saved.id}`);
          }}
        />
      )}
    </div>
  );
}
