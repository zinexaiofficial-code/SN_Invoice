"use client";

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, X, Sparkles } from 'lucide-react';
import { ParsedExcelSchedule } from '@/lib/excelScheduleParser';
import { MediaSchedule } from '@/types';
import { useDatabase } from '@/context/DatabaseContext';

interface ScheduleImportModalProps {
  onClose: () => void;
  onImportSuccess?: (schedule: MediaSchedule) => void;
}

export function ScheduleImportModal({
  onClose,
  onImportSuccess,
}: ScheduleImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { billingEntities, clients, saveSchedule } = useDatabase();

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedExcelSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Selected overrides
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    setParsedData(null);
    await uploadAndParseFile(f);
  };

  const uploadAndParseFile = async (f: File) => {
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', f);

      const res = await fetch('/api/schedules/import-excel', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to parse Excel file');
      }

      const json = await res.json();
      const data: ParsedExcelSchedule = json.data;
      setParsedData(data);

      // Preselect matched or default
      if (data.matchedEntityId) {
        setSelectedEntityId(data.matchedEntityId);
      } else if (billingEntities.length > 0) {
        setSelectedEntityId(billingEntities[0].id);
      }

      if (data.matchedClientId) {
        setSelectedClientId(data.matchedClientId);
      } else if (clients.length > 0) {
        setSelectedClientId(clients[0].id);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err?.message || 'Error uploading or analyzing spreadsheet.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveImportedSchedule = async () => {
    if (!parsedData || !selectedEntityId || !selectedClientId) {
      setError('Please select a Billing Entity and Client before saving.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const entity = billingEntities.find((e) => e.id === selectedEntityId);
      const client = clients.find((c) => c.id === selectedClientId);

      const scheduleData: Partial<MediaSchedule> = {
        billingEntityId: selectedEntityId,
        clientId: selectedClientId,
        mediaChannelName: parsedData.channelName || 'Broadcast Media',
        mediaType: parsedData.mediaType || 'tv',
        campaignName: parsedData.campaignName || `${client?.name || client?.companyName} Broadcast Campaign`,
        startDate: parsedData.startDate,
        endDate: parsedData.endDate,
        status: 'draft',
        pricingMode: parsedData.pricingMode,
        packageAmount: parsedData.packageAmount,
        grossAmount: parsedData.packageAmount,
        taxApplicable: parsedData.taxApplicable,
        taxRate: parsedData.taxRate,
        specialNotes: parsedData.specialNotes,
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
        items: parsedData.items.map((it, idx) => ({
          id: crypto.randomUUID(),
          programmeName: it.programmeName,
          timeSlot: it.timeSlot,
          duration: it.duration,
          adType: it.adType,
          ratePerSpot: it.ratePerSpot,
          totalSpots: it.totalSpots,
          totalAmount: it.totalAmount,
          displayOrder: idx,
          allocations: it.allocations,
        })),
      };

      const saved = await saveSchedule(scheduleData);
      if (onImportSuccess) {
        onImportSuccess(saved);
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving imported schedule:', err);
      setError(err?.message || 'Failed to save imported schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-navy-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Import Media Schedule from Excel</h3>
              <p className="text-xs text-slate-300">
                Upload .xlsx schedule file (Siyatha, Ran FM, Sooriyan FM, Jaya TV, etc.)
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
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          {!parsedData ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3 text-slate-500 border border-slate-200">
                <Upload className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-bold text-slate-800 text-sm">
                {isParsing ? 'Analyzing Excel schedule...' : 'Click or drop Excel schedule (.xlsx) here'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports real multi-date schedules with daily frequency allocations and investments.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-950 flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-xs uppercase tracking-wider text-emerald-800">
                    Excel Schedule Analyzed Successfully!
                  </p>
                  <p className="text-xs text-slate-700">
                    File: <strong>{file?.name}</strong> &bull; Total Transmissions:{' '}
                    <strong className="text-emerald-700">{parsedData.totalSpots} spots</strong>
                  </p>
                </div>
              </div>

              {/* Extraction summary grid */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Detected Channel:</span>
                    <strong className="text-slate-900 uppercase">{parsedData.channelName} ({parsedData.mediaType})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Broadcast Period:</span>
                    <strong className="text-slate-900">{parsedData.startDate} to {parsedData.endDate} ({parsedData.dates.length} days)</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Programmes / Slots:</span>
                    <strong className="text-slate-900">{parsedData.items.length} programme rows</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Special Investment:</span>
                    <strong className="text-emerald-800 font-mono text-sm">
                      {parsedData.packageAmount > 0
                        ? `Rs. ${parsedData.packageAmount.toLocaleString('en-US')} ${parsedData.taxApplicable ? '+ TAX' : ''}`
                        : 'Unpriced / Not Set'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Entity & Client Selection Confirmation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Assign Billing Entity (Issuer) *
                  </label>
                  <select
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white"
                  >
                    {billingEntities.map((e) => (
                      <option key={e.id} value={e.id}>
                        [{e.prefix || (e as any)?.invoicePrefix || 'ENT'}] {e.name}
                      </option>
                    ))}
                  </select>
                  {parsedData.rawAgencyText && (
                    <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                      Excel sheet text: &ldquo;{parsedData.rawAgencyText}&rdquo;
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Assign Client (Advertiser) *
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.companyName}
                      </option>
                    ))}
                  </select>
                  {parsedData.rawClientText && (
                    <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                      Excel sheet text: &ldquo;{parsedData.rawClientText}&rdquo;
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {parsedData ? (
            <button
              type="button"
              onClick={() => {
                setParsedData(null);
                setFile(null);
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
            >
              Choose different file
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
            >
              Cancel
            </button>
            {parsedData && (
              <button
                type="button"
                onClick={handleSaveImportedSchedule}
                disabled={isSaving}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Importing...' : 'Save & Open Schedule'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
