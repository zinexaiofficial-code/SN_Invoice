"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Layers, Package, Calendar, AlertTriangle, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { MediaSchedule, BillingEntity, Client } from '@/types';
import { useDatabase } from '@/context/DatabaseContext';

interface ScheduleToInvoiceModalProps {
  schedule: MediaSchedule;
  billingEntity?: BillingEntity;
  client?: Client;
  onClose: () => void;
  onSuccess?: (invoiceId: string) => void;
}

export function ScheduleToInvoiceModal({
  schedule,
  billingEntity,
  client,
  onClose,
  onSuccess,
}: ScheduleToInvoiceModalProps) {
  const router = useRouter();
  const { convertScheduleToInvoice, invoices } = useDatabase();

  const [mode, setMode] = useState<'package' | 'itemized'>('package');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + (billingEntity?.defaultDueDays || 7));
    return d.toISOString().split('T')[0];
  });
  const [customNotes, setCustomNotes] = useState<string>(schedule.specialNotes || '');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already converted
  const alreadyConverted = Boolean(schedule.convertedToInvoiceId);
  const existingInvoice = alreadyConverted
    ? invoices.find((i) => i.id === schedule.convertedToInvoiceId || i.invoiceNumber === schedule.convertedToInvoiceNumber)
    : null;

  const handleConvert = async () => {
    setError(null);
    setIsConverting(true);
    try {
      const invoice = await convertScheduleToInvoice(schedule.id, mode, {
        invoiceDate,
        dueDate,
        notes: customNotes,
      });

      if (onSuccess) {
        onSuccess(invoice.id);
      } else {
        router.push(`/invoices/${invoice.id}`);
      }
    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err?.message || 'Failed to convert schedule to invoice.');
    } finally {
      setIsConverting(false);
    }
  };

  const entityName = billingEntity?.displayName || billingEntity?.name || schedule.billingEntitySnapshot?.name || 'SN Advertising';
  const clientName = client?.name || client?.companyName || schedule.clientSnapshot?.companyName || (schedule.clientSnapshot as any)?.name || 'Client';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-navy-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Convert Schedule to Official Invoice</h3>
              <p className="text-xs text-slate-300">
                {schedule.scheduleNumber} &bull; {schedule.mediaChannelName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-sm">
          {/* Warning if already converted */}
          {alreadyConverted && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs uppercase tracking-wider text-amber-800">
                  Already Converted
                </p>
                <p className="text-xs mt-1">
                  This schedule has already been converted to Invoice{' '}
                  <strong className="font-mono">{schedule.convertedToInvoiceNumber || existingInvoice?.invoiceNumber}</strong>.
                  Converting again will open or update the existing invoice to prevent duplicate billing.
                </p>
                {existingInvoice && (
                  <button
                    type="button"
                    onClick={() => router.push(`/invoices/${existingInvoice.id}`)}
                    className="inline-flex items-center space-x-1 mt-2 text-xs font-bold text-amber-900 underline"
                  >
                    <span>Open Existing Invoice #{existingInvoice.invoiceNumber}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Schedule Summary Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Client:</span>
              <strong className="text-slate-900">{clientName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Billing Entity (Issuer):</span>
              <strong className="text-slate-900">{entityName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Broadcast Period:</span>
              <strong className="text-slate-900">{schedule.startDate} to {schedule.endDate}</strong>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 font-bold">
              <span className="text-slate-700">Scheduled Transmissions:</span>
              <span className="text-emerald-700">{schedule.totalSpots} spots</span>
            </div>
            <div className="flex justify-between text-sm font-black text-navy-950">
              <span>Total Scheduled Value:</span>
              <span className="font-mono text-emerald-800">
                Rs. {schedule.netTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Invoice Line-Item Presentation Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Mode B: Package */}
              <button
                type="button"
                onClick={() => setMode('package')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  mode === 'package'
                    ? 'border-emerald-600 bg-emerald-50/50 text-slate-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div className="flex items-center space-x-2 font-bold text-xs">
                  <Package className={`w-4 h-4 ${mode === 'package' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>Consolidated Package</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Creates 1 clean line item with channel, total spots, and broadcast period. Recommended for lump-sum schedules.
                </p>
              </button>

              {/* Mode A: Detailed */}
              <button
                type="button"
                onClick={() => setMode('itemized')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  mode === 'itemized'
                    ? 'border-emerald-600 bg-emerald-50/50 text-slate-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div className="flex items-center space-x-2 font-bold text-xs">
                  <Layers className={`w-4 h-4 ${mode === 'itemized' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>Itemized Programme Rows</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Creates separate invoice line items for each scheduled programme with spot count and rate per spot.
                </p>
              </button>
            </div>
          </div>

          {/* Dates Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Invoice Special Notes
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. As per Media Schedule SCH-2026-0001"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConvert}
            disabled={isConverting}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isConverting ? 'Generating Invoice...' : 'Generate Official Invoice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
