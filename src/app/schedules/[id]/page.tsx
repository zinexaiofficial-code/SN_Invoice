"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Radio,
  Tv,
  Calendar,
  Building2,
  FileText,
  Printer,
  Trash2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { MediaSchedule, MediaScheduleItem, MediaPricingMode, MediaType } from '@/types';
import { ScheduleGrid } from '@/components/schedules/ScheduleGrid';
import { SchedulePdfViewer } from '@/components/schedules/SchedulePdfViewer';
import { ScheduleToInvoiceModal } from '@/components/schedules/ScheduleToInvoiceModal';

export default function ScheduleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params?.id as string;

  const { schedules, billingEntities, clients, mediaChannels, saveSchedule, deleteSchedule } = useDatabase();

  const [schedule, setSchedule] = useState<MediaSchedule | null>(null);
  const [items, setItems] = useState<MediaScheduleItem[]>([]);
  const [channelName, setChannelName] = useState<string>('');
  const [mediaType, setMediaType] = useState<MediaType>('tv');
  const [campaignName, setCampaignName] = useState<string>('');
  const [status, setStatus] = useState<any>('draft');
  const [pricingMode, setPricingMode] = useState<MediaPricingMode>('package');
  const [packageAmount, setPackageAmount] = useState<number>(0);
  const [defaultSpotRate, setDefaultSpotRate] = useState<number>(0);
  const [taxApplicable, setTaxApplicable] = useState<boolean>(false);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [terms, setTerms] = useState<string>('');

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load schedule data
  useEffect(() => {
    const found = schedules.find((s) => s.id === scheduleId);
    if (found) {
      setSchedule(found);
      setItems(found.items || []);
      setChannelName(found.mediaChannelName || '');
      setMediaType(found.mediaType || 'tv');
      setCampaignName(found.campaignName || '');
      setStatus(found.status || 'draft');
      setPricingMode(found.pricingMode || 'package');
      setPackageAmount(found.packageAmount || 0);
      setDefaultSpotRate(found.ratePerSpot || 0);
      setTaxApplicable(Boolean(found.taxApplicable));
      setTaxRate(found.taxRate || 18);
      setSpecialNotes(found.specialNotes || '');
      setTerms(found.termsAndConditions || '');
    } else {
      // Fetch directly from API if not yet in state
      fetch(`/api/schedules/${scheduleId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            const s: MediaSchedule = json.data;
            setSchedule(s);
            setItems(s.items || []);
            setChannelName(s.mediaChannelName || '');
            setMediaType(s.mediaType || 'tv');
            setCampaignName(s.campaignName || '');
            setStatus(s.status || 'draft');
            setPricingMode(s.pricingMode || 'package');
            setPackageAmount(s.packageAmount || 0);
            setDefaultSpotRate(s.ratePerSpot || 0);
            setTaxApplicable(Boolean(s.taxApplicable));
            setTaxRate(s.taxRate || 18);
            setSpecialNotes(s.specialNotes || '');
            setTerms(s.termsAndConditions || '');
          }
        })
        .catch((e) => console.error('Fetch schedule error:', e));
    }
  }, [scheduleId, schedules]);

  // Compute dates list
  const dateList = useMemo(() => {
    const dates: string[] = [];
    if (!schedule?.startDate || !schedule?.endDate) return dates;
    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return dates;

    const curr = new Date(start);
    while (curr <= end && dates.length < 60) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }, [schedule?.startDate, schedule?.endDate]);

  // Calculations
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

  const billingEntity = billingEntities.find((e) => e.id === schedule?.billingEntityId);
  const client = clients.find((c) => c.id === schedule?.clientId);

  const isConverted = Boolean(schedule?.convertedToInvoiceId || schedule?.status === 'converted');

  // Handle Save Updates
  const handleSave = async () => {
    if (!schedule) return;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated: MediaSchedule = {
        ...schedule,
        mediaChannelName: channelName,
        mediaType,
        campaignName,
        status,
        pricingMode,
        packageAmount: Number(packageAmount) || 0,
        ratePerSpot: Number(defaultSpotRate) || 0,
        grossAmount,
        taxApplicable,
        taxRate,
        taxAmount,
        netTotal,
        specialNotes,
        termsAndConditions: terms,
        items,
        updatedAt: new Date().toISOString(),
      };

      const saved = await saveSchedule(updated);
      setSchedule(saved);
      setSuccessMsg('Schedule updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      setError(err?.message || 'Failed to update schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule) return;
    if (confirm(`Are you sure you want to delete Schedule #${schedule.scheduleNumber}?`)) {
      await deleteSchedule(schedule.id);
      router.push('/schedules');
    }
  };

  if (!schedule) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-sm font-semibold">Loading media schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/schedules"
            className="p-2 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {schedule.scheduleNumber}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  isConverted
                    ? 'bg-blue-100 text-blue-800'
                    : status === 'confirmed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {isConverted ? 'Converted' : status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {client?.name || client?.companyName} &bull; {schedule.mediaChannelName} &bull; {schedule.startDate} to {schedule.endDate}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Converted Invoice Badge / Button */}
          {schedule.convertedToInvoiceId ? (
            <Link
              href={`/invoices/${schedule.convertedToInvoiceId}`}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-mono font-bold border border-blue-200 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Invoice #{schedule.convertedToInvoiceNumber}</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setIsConvertModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Convert to Invoice</span>
            </button>
          )}

          {/* PDF Preview & Print */}
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>PDF Preview & Print</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDelete}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            title="Delete Schedule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Overview Metadata Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Client / Advertiser</span>
            <strong className="text-slate-900 text-sm block mt-0.5">{client?.name || client?.companyName}</strong>
            <span className="text-[11px] text-slate-400 font-mono">[{client?.code || client?.clientCode || 'CL'}]</span>
          </div>

          <div>
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Agency / Issuer</span>
            <strong className="text-slate-900 text-sm block mt-0.5">{billingEntity?.name}</strong>
            <span className="text-[11px] text-slate-400 font-mono">[{billingEntity?.prefix || (billingEntity as any)?.invoicePrefix || 'SN'}]</span>
          </div>

          <div>
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Broadcast Channel</span>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="mt-0.5 px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded font-bold uppercase text-xs text-slate-800"
            />
          </div>

          <div>
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Broadcast Period</span>
            <strong className="text-navy-950 text-sm block mt-0.5">
              {schedule.startDate} to {schedule.endDate}
            </strong>
            <span className="text-[11px] text-slate-500 font-semibold">{dateList.length} Calendar Days</span>
          </div>
        </div>

        {/* Campaign & Status Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div className="sm:col-span-2">
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Campaign Title</span>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            />
          </div>

          <div>
            <span className="text-slate-500 font-bold block uppercase text-[10px]">Schedule Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            >
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Commercial & Pricing Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Commercial Terms</span>
          </div>
          <span className="font-mono text-emerald-800 text-xs">
            Net Investment: Rs. {netTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Pricing Mode</label>
            <select
              value={pricingMode}
              onChange={(e) => setPricingMode(e.target.value as MediaPricingMode)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            >
              <option value="package">Special Investment Package (Lump Sum)</option>
              <option value="spot_rate">Rate Per Spot (Calculated)</option>
              <option value="not_set">Unpriced / Scheduling Only</option>
            </select>
          </div>

          {pricingMode === 'package' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Special Investment Amount (LKR)
              </label>
              <input
                type="number"
                value={packageAmount || ''}
                onChange={(e) => setPackageAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
              />
            </div>
          )}

          {pricingMode === 'spot_rate' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Default Rate Per Spot (LKR)
              </label>
              <input
                type="number"
                value={defaultSpotRate || ''}
                onChange={(e) => setDefaultSpotRate(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
              />
            </div>
          )}

          <div className="flex items-center space-x-4 pt-3">
            <label className="inline-flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={taxApplicable}
                onChange={(e) => setTaxApplicable(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-slate-700">Apply Tax ({taxRate}% VAT)</span>
            </label>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Special Notes</label>
          <input
            type="text"
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
          />
        </div>
      </div>

      {/* Broadcast Date Grid */}
      <ScheduleGrid
        dates={dateList}
        items={items}
        pricingMode={pricingMode}
        defaultRate={defaultSpotRate}
        onChange={setItems}
      />

      {/* PDF Preview Modal */}
      {isPdfModalOpen && (
        <SchedulePdfViewer
          schedule={{
            ...schedule,
            mediaChannelName: channelName,
            campaignName,
            status,
            pricingMode,
            packageAmount,
            grossAmount,
            taxApplicable,
            taxRate,
            taxAmount,
            netTotal,
            specialNotes,
            items,
          }}
          billingEntity={billingEntity}
          client={client}
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}

      {/* Convert to Invoice Modal */}
      {isConvertModalOpen && (
        <ScheduleToInvoiceModal
          schedule={{
            ...schedule,
            mediaChannelName: channelName,
            campaignName,
            status,
            pricingMode,
            packageAmount,
            grossAmount,
            taxApplicable,
            taxRate,
            taxAmount,
            netTotal,
            specialNotes,
            items,
          }}
          billingEntity={billingEntity}
          client={client}
          onClose={() => setIsConvertModalOpen(false)}
          onSuccess={(invId) => {
            setIsConvertModalOpen(false);
            router.push(`/invoices/${invId}`);
          }}
        />
      )}
    </div>
  );
}
