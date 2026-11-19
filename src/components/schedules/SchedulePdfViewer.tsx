"use client";

import React, { useRef, useState, useMemo } from 'react';
import {
  Printer,
  Download,
  X,
  FileText,
  Sliders,
  RotateCcw,
  CheckSquare,
  Square,
  Building2,
  CreditCard,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MediaSchedule, BillingEntity, Client, MediaScheduleTemplateSettings } from '@/types';
import { useDatabase } from '@/context/DatabaseContext';
import { numberToWordsLKR, cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface SchedulePdfViewerProps {
  schedule: MediaSchedule;
  billingEntity?: BillingEntity;
  client?: Client;
  onClose?: () => void;
}

export function SchedulePdfViewer({
  schedule,
  billingEntity: propBillingEntity,
  client: propClient,
  onClose,
}: SchedulePdfViewerProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showOptionsPanel, setShowOptionsPanel] = useState(true);

  const { billingEntities, branding, saveSchedule } = useDatabase();

  // Resolve Billing Entity & Client snapshots
  const billingEntity = useMemo(() => {
    if (propBillingEntity) return propBillingEntity;
    if (schedule.billingEntityId) {
      const found = billingEntities.find((e) => e.id === schedule.billingEntityId);
      if (found) return found;
    }
    return billingEntities[0];
  }, [propBillingEntity, schedule.billingEntityId, billingEntities]);

  const agencyName =
    billingEntity?.displayName ||
    billingEntity?.name ||
    schedule.billingEntitySnapshot?.name ||
    branding?.businessName ||
    "SN ADVERTISING";

  const entityLegal = billingEntity?.legalName || schedule.billingEntitySnapshot?.legalName || "";

  const clientName =
    propClient?.name ||
    propClient?.companyName ||
    schedule.clientSnapshot?.companyName ||
    (schedule.clientSnapshot as any)?.name ||
    "Araliya Lands and Homes (Pvt) Ltd";

  const billingLogoUrl =
    billingEntity?.logoUrl ||
    schedule.billingEntitySnapshot?.logoUrl ||
    branding?.logoUrl ||
    "/logo.png";

  // Existing or default PDF template settings
  const initialSettings = schedule.pdfTemplateSettings || {};

  // Checkbox State Options
  const [showPreparedBy, setShowPreparedBy] = useState<boolean>(
    initialSettings.showPreparedBy !== false
  );
  const [showAuthorizedSignatory, setShowAuthorizedSignatory] = useState<boolean>(
    initialSettings.showAuthorizedSignatory !== false
  );
  const [showClientAcceptance, setShowClientAcceptance] = useState<boolean>(
    initialSettings.showClientAcceptance !== false
  );
  const [showAmountInWords, setShowAmountInWords] = useState<boolean>(
    initialSettings.showAmountInWords !== false
  );
  const [showBankDetails, setShowBankDetails] = useState<boolean>(
    initialSettings.showBankDetails !== false
  );
  const [showLogo, setShowLogo] = useState<boolean>(
    initialSettings.showLogo !== false
  );
  const [showNotes, setShowNotes] = useState<boolean>(
    initialSettings.showNotes !== false
  );
  const [fontScale, setFontScale] = useState<number>(
    initialSettings.scalePercent || 100
  );

  // Generate list of date strings for calendar grid
  const dates = useMemo(() => {
    const list: string[] = [];
    if (!schedule.startDate || !schedule.endDate) return list;
    const curr = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    while (curr <= end && list.length < 45) {
      list.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  }, [schedule.startDate, schedule.endDate]);

  // Daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    dates.forEach((d) => (totals[d] = 0));
    (schedule.items || []).forEach((it) => {
      const allocs = it.allocations || {};
      dates.forEach((d) => {
        totals[d] = (totals[d] || 0) + (Number(allocs[d]) || 0);
      });
    });
    return totals;
  }, [dates, schedule.items]);

  const grandTotalSpots = (schedule.items || []).reduce((acc, it) => acc + (it.totalSpots || 0), 0);

  // Auto match the word amount
  const amountInWords = useMemo(() => {
    return numberToWordsLKR(schedule.netTotal);
  }, [schedule.netTotal]);

  // Bank Account details
  const bankDetailsText = useMemo(() => {
    if (billingEntity?.paymentInstructions) {
      return billingEntity.paymentInstructions;
    }
    if (billingEntity?.bankName) {
      return `Bank transfers to ${billingEntity.accountName || agencyName}, A/C: ${
        billingEntity.accountNumber || ''
      }, ${billingEntity.bankName} – ${billingEntity.branch || ''}.`;
    }
    return '';
  }, [billingEntity, agencyName]);

  const activeSignaturesCount = [showPreparedBy, showAuthorizedSignatory, showClientAcceptance].filter(Boolean).length;

  // Handle browser direct print
  const handlePrint = () => {
    window.print();
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    setShowPreparedBy(true);
    setShowAuthorizedSignatory(true);
    setShowClientAcceptance(true);
    setShowAmountInWords(true);
    setShowBankDetails(true);
    setShowLogo(true);
    setShowNotes(true);
    setFontScale(100);
  };

  // Save current PDF layout choices
  const handleSavePreferences = async () => {
    setIsSavingSettings(true);
    try {
      const updatedSettings: MediaScheduleTemplateSettings = {
        showLogo,
        showPreparedBy,
        showAuthorizedSignatory,
        showClientAcceptance,
        showAmountInWords,
        showBankDetails,
        showNotes,
        scalePercent: fontScale,
      };

      await saveSchedule({
        ...schedule,
        pdfTemplateSettings: updatedSettings,
      });
    } catch (e) {
      console.error('Failed to save schedule template settings:', e);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle 100% Fit-to-Page PDF export without bottom clipping
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const isLandscape = schedule.pdfOrientation !== 'portrait';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: schedule.pdfPaperSize === 'A3' ? 'a3' : 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 8; // 8mm margin all around
      const maxAvailableWidth = pdfWidth - margin * 2;
      const maxAvailableHeight = pdfHeight - margin * 2;

      // Scale proportionally so the entire document fits within available width AND height
      const scale = Math.min(
        maxAvailableWidth / canvas.width,
        maxAvailableHeight / canvas.height
      );

      const finalWidth = canvas.width * scale;
      const finalHeight = canvas.height * scale;

      // Center perfectly on the page
      const posX = margin + (maxAvailableWidth - finalWidth) / 2;
      const posY = margin + (maxAvailableHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', posX, posY, finalWidth, finalHeight);
      pdf.save(`Schedule_${schedule.scheduleNumber || 'export'}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF. You can also use the browser Print button.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col justify-between overflow-y-auto p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static">
      {/* Top action bar - Hidden when printing */}
      <div className="max-w-6xl w-full mx-auto bg-navy-950 text-white rounded-t-2xl px-4 py-3 flex items-center justify-between shadow-xl print:hidden border-b border-navy-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm tracking-tight text-white">
                Media Broadcast Schedule — {schedule.scheduleNumber}
              </h3>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                1-Page Auto Fit
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {clientName} &bull; {schedule.mediaChannelName} &bull; {schedule.startDate} to {schedule.endDate}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Customization & Checkbox Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowOptionsPanel(!showOptionsPanel)}
            className={cn(
              "inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              showOptionsPanel
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white/10 hover:bg-white/20 text-slate-200"
            )}
            title="Toggle PDF custom options and signature checkboxes"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize &amp; Signatures</span>
            {showOptionsPanel ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : 'Download PDF'}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* PDF Customization & Checkboxes Panel (Collapsible) */}
      {showOptionsPanel && (
        <div className="max-w-6xl w-full mx-auto bg-slate-900 border-x border-b border-navy-800 text-slate-200 p-4 shadow-lg print:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Signatures & Approvals Options */}
            <div className="bg-navy-950/70 p-3 rounded-xl border border-navy-800/80 space-y-2.5">
              <div className="flex items-center justify-between border-b border-navy-800 pb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Signature &amp; Approval Blocks</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeSignaturesCount}/3 Active
                </span>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2.5 text-xs font-medium cursor-pointer select-none hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={showPreparedBy}
                    onChange={(e) => setShowPreparedBy(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-navy-900 border-navy-700 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>
                    Prepared By <span className="text-[11px] text-slate-400 block">(Media Planning Executive)</span>
                  </span>
                </label>

                <label className="flex items-center space-x-2.5 text-xs font-medium cursor-pointer select-none hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={showAuthorizedSignatory}
                    onChange={(e) => setShowAuthorizedSignatory(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-navy-900 border-navy-700 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>
                    Authorized Signatory <span className="text-[11px] text-slate-400 block">({agencyName})</span>
                  </span>
                </label>

                <label className="flex items-center space-x-2.5 text-xs font-medium cursor-pointer select-none hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={showClientAcceptance}
                    onChange={(e) => setShowClientAcceptance(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-navy-900 border-navy-700 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>
                    Client Acceptance <span className="text-[11px] text-slate-400 block">({clientName})</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Column 2: Financial, Bank & Text Blocks */}
            <div className="bg-navy-950/70 p-3 rounded-xl border border-navy-800/80 space-y-2.5">
              <div className="flex items-center justify-between border-b border-navy-800 pb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Financial &amp; Account Details</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Invoice Settings</span>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2.5 text-xs font-medium cursor-pointer select-none hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={showAmountInWords}
                    onChange={(e) => setShowAmountInWords(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-navy-900 border-navy-700 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>
                    Auto Amount in Words <span className="text-[10px] text-emerald-400 block">(Auto matches LKR total)</span>
                  </span>
                </label>

                <label className="flex items-center space-x-2.5 text-xs font-medium cursor-pointer select-none hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={showBankDetails}
                    onChange={(e) => setShowBankDetails(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-navy-900 border-navy-700 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>
                    Bank Account &amp; Transfer Info <span className="text-[10px] text-slate-400 block">(Entity Bank Details)</span>
                  </span>
                </label>

                <label className="flex items-center space-x-2.5 text-xs font-medium cursor-pointer select-none hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-navy-900 border-navy-700 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>
                    Organization Logo <span className="text-[10px] text-slate-400 block">(Entity Brand Emblem)</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Column 3: Sizing, Scaling & Defaults */}
            <div className="bg-navy-950/70 p-3 rounded-xl border border-navy-800/80 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-navy-800 pb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fit-to-Page Scale</span>
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">{fontScale}%</span>
                </div>

                <div className="pt-2">
                  <input
                    type="range"
                    min="85"
                    max="115"
                    step="1"
                    value={fontScale}
                    onChange={(e) => setFontScale(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>85% (Compact)</span>
                    <span>100% (Default)</span>
                    <span>115% (Comfortable)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-navy-800">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="inline-flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Defaults</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={isSavingSettings}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                >
                  {isSavingSettings ? 'Saving...' : 'Save as Default'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Paper Surface */}
      <div className="max-w-6xl w-full mx-auto bg-white rounded-b-2xl shadow-2xl p-6 sm:p-8 md:p-10 text-slate-900 font-sans print:shadow-none print:p-2 print:max-w-full">
        <div
          ref={printRef}
          className="space-y-5 pb-8"
          style={{
            transform: fontScale !== 100 ? `scale(${fontScale / 100})` : undefined,
            transformOrigin: 'top center',
          }}
        >
          {/* Header Section: Organization Logo, Entity Details, and Schedule Meta */}
          <div className="border-b-2 border-navy-950 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left: Organization Logo & Legal Details */}
            <div className="flex items-start space-x-3.5 max-w-xl">
              {showLogo && (
                <div className="w-14 h-14 relative shrink-0 overflow-hidden rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-2xs">
                  <img
                    src={billingLogoUrl}
                    alt={agencyName}
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/logo.png';
                    }}
                  />
                </div>
              )}
              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-black uppercase tracking-wider text-navy-950 leading-tight">
                  {agencyName}
                </div>
                {entityLegal && entityLegal !== agencyName && (
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    {entityLegal}
                  </div>
                )}
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-widest pt-0.5">
                  Official Media Broadcast Schedule &amp; Insertion Order
                </div>
                {(billingEntity?.address || billingEntity?.phone) && (
                  <div className="text-[11px] text-slate-500 leading-tight pt-0.5">
                    {billingEntity.address}
                    {billingEntity.phone ? ` • ${billingEntity.phone}` : ''}
                    {billingEntity.vatNumber ? ` • VAT Reg: ${billingEntity.vatNumber}` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Schedule Reference & Issue Info */}
            <div className="text-left sm:text-right bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-[220px] shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Schedule Reference
              </div>
              <div className="text-sm font-black font-mono text-navy-950 tracking-tight">
                {schedule.scheduleNumber}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Issued Date: <strong className="font-semibold text-slate-800">{new Date().toISOString().split('T')[0]}</strong>
              </div>
              <div className="text-xs text-slate-600">
                Media: <strong className="uppercase text-emerald-800 font-bold">{schedule.mediaType}</strong>
              </div>
            </div>
          </div>

          {/* Schedule Metadata Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs shadow-2xs">
            <div>
              <span className="text-slate-500 font-semibold block uppercase text-[10px]">Client / Advertiser:</span>
              <strong className="text-slate-900 text-sm block mt-0.5">{clientName}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase text-[10px]">Broadcast Channel:</span>
              <strong className="text-emerald-800 text-sm block mt-0.5 uppercase">{schedule.mediaChannelName}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase text-[10px]">Campaign / Product:</span>
              <strong className="text-slate-900 text-sm block mt-0.5">{schedule.campaignName}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase text-[10px]">Broadcast Period:</span>
              <strong className="text-navy-950 text-sm block mt-0.5 font-mono">
                {schedule.startDate} to {schedule.endDate}
              </strong>
            </div>
          </div>

          {/* Broadcast Allocation Grid */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-2xs">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-navy-950 text-white font-bold border-b border-navy-900">
                  <th className="px-2.5 py-1.5 min-w-[140px] border-r border-navy-800">PROGRAMME</th>
                  <th className="px-2 py-1.5 min-w-[110px] border-r border-navy-800">TIME SLOT</th>
                  <th className="px-1.5 py-1.5 min-w-[50px] text-center border-r border-navy-800">DUR.</th>
                  <th className="px-1.5 py-1.5 min-w-[70px] border-r border-navy-800">TYPE</th>
                  {dates.map((dStr) => {
                    const d = new Date(dStr);
                    const letter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
                    const isWk = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th
                        key={`th-letter-${dStr}`}
                        className={`text-center py-1 px-0.5 min-w-[24px] max-w-[28px] border-r border-navy-800 text-[10px] ${
                          isWk ? 'bg-navy-900 text-amber-300 font-black' : ''
                        }`}
                      >
                        {letter}
                      </th>
                    );
                  })}
                  <th className="px-2 py-1.5 text-center font-black min-w-[55px] bg-navy-950">SPOTS</th>
                </tr>

                <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-300 text-[10px]">
                  <th colSpan={4} className="px-2.5 py-1 text-slate-500 uppercase border-r border-slate-300">
                    Day of Month
                  </th>
                  {dates.map((dStr) => {
                    const day = new Date(dStr).getDate();
                    const isWk = new Date(dStr).getDay() === 0 || new Date(dStr).getDay() === 6;
                    return (
                      <th
                        key={`th-day-${dStr}`}
                        className={`text-center py-1 px-0.5 border-r border-slate-200 ${
                          isWk ? 'bg-amber-100 text-amber-900 font-black' : 'bg-slate-100'
                        }`}
                      >
                        {day}
                      </th>
                    );
                  })}
                  <th className="text-center py-1 px-1 bg-slate-200 text-navy-950 font-black">TOTAL</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {(schedule.items || []).map((item, idx) => {
                  const allocs = item.allocations || {};
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="px-2 py-1.5 font-bold text-slate-900 border-r border-slate-200">
                        {item.programmeName}
                      </td>
                      <td className="px-2 py-1.5 text-slate-600 font-mono text-[10px] border-r border-slate-200">
                        {item.timeSlot}
                      </td>
                      <td className="px-1.5 py-1.5 text-center text-slate-700 font-medium border-r border-slate-200">
                        {item.duration}
                      </td>
                      <td className="px-1.5 py-1.5 text-slate-600 text-[10px] border-r border-slate-200">
                        {item.adType || 'Spot'}
                      </td>
                      {dates.map((dStr) => {
                        const count = allocs[dStr] || 0;
                        const isWk = new Date(dStr).getDay() === 0 || new Date(dStr).getDay() === 6;
                        return (
                          <td
                            key={`td-${item.id}-${dStr}`}
                            className={`text-center py-1 px-0.5 border-r border-slate-200 font-bold ${
                              isWk ? 'bg-amber-50/40' : ''
                            } ${count > 0 ? 'text-emerald-800 font-black bg-emerald-50/60' : 'text-slate-300'}`}
                          >
                            {count > 0 ? count : ''}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center font-black text-xs text-navy-950 bg-slate-50">
                        {item.totalSpots}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-400 font-black text-[11px]">
                  <td colSpan={4} className="px-2.5 py-1.5 uppercase text-slate-800 border-r border-slate-300">
                    TOTAL TRANSMISSIONS / DAY
                  </td>
                  {dates.map((dStr) => {
                    const total = dailyTotals[dStr] || 0;
                    return (
                      <td
                        key={`ft-${dStr}`}
                        className={`text-center py-1.5 px-0.5 border-r border-slate-300 ${
                          total > 0 ? 'text-emerald-900 font-black' : 'text-slate-300'
                        }`}
                      >
                        {total > 0 ? total : ''}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center font-black text-sm bg-emerald-700 text-white">
                    {grandTotalSpots}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Commercial & Terms Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-1">
            {/* Left: Notes, Instructions & Bank Transfer Details */}
            <div className="border border-slate-200 rounded-xl p-3 text-xs space-y-2.5 bg-white shadow-2xs">
              {showNotes && (
                <div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] text-navy-950">
                    Broadcast Notes &amp; Special Instructions
                  </h4>
                  <p className="text-slate-600 leading-relaxed mt-0.5">
                    {schedule.specialNotes ||
                      'Broadcast transmission as per approved media plan and channel time slots. Tapes and commercial assets to be delivered 48 hours prior to scheduled telecast.'}
                  </p>
                  {schedule.termsAndConditions && (
                    <div className="text-[11px] text-slate-500 pt-1.5 mt-1.5 border-t border-slate-100">
                      {schedule.termsAndConditions}
                    </div>
                  )}
                </div>
              )}

              {/* Bank Account Details matching Invoice */}
              {showBankDetails && bankDetailsText && (
                <div className={cn(showNotes ? "pt-2 border-t border-slate-200" : "")}>
                  <div className="flex items-center space-x-1.5 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Payment Instructions &amp; Bank Account Details</span>
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed mt-1 text-[11px]">
                    {bankDetailsText}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Financial Summary & Amount in Words */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5 shadow-2xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-1 text-navy-950">
                Commercial Summary
              </h4>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-600">Total Scheduled Spots:</span>
                <strong className="font-mono text-slate-900">{grandTotalSpots} spots</strong>
              </div>

              {schedule.pricingMode === 'package' && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Special Investment Package:</span>
                  <strong className="font-mono text-slate-900 text-sm">
                    Rs. {(schedule.packageAmount || schedule.grossAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              )}

              {schedule.pricingMode === 'spot_rate' && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Gross Broadcast Value:</span>
                  <strong className="font-mono text-slate-900">
                    Rs. {schedule.grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              )}

              {schedule.taxApplicable && (
                <div className="flex justify-between py-0.5 text-emerald-800 font-semibold">
                  <span>VAT / Applicable Tax ({schedule.taxRate}%):</span>
                  <span className="font-mono">+ Rs. {schedule.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-t border-slate-300 text-sm font-black text-navy-950 pt-1.5">
                <span>Total Net Investment:</span>
                <span className="font-mono text-base text-emerald-800">
                  Rs. {schedule.netTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Amount in words matching Invoice */}
              {showAmountInWords && (
                <div className="pt-2 border-t border-slate-200 mt-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                    Amount in Words (LKR):
                  </span>
                  <p className="text-[11px] font-bold text-slate-800 italic mt-0.5 leading-snug">
                    *** {amountInWords} ***
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Optional Signatures & Approvals Section */}
          {activeSignaturesCount > 0 && (
            <div
              className={cn(
                "pt-8 border-t-2 border-slate-300",
                activeSignaturesCount === 3 && "grid grid-cols-3 gap-6",
                activeSignaturesCount === 2 && "grid grid-cols-2 gap-8 max-w-2xl mx-auto",
                activeSignaturesCount === 1 && "max-w-xs mx-auto"
              )}
            >
              {showPreparedBy && (
                <div className="text-center px-3">
                  <div className="border-b-2 border-slate-400 h-9 mb-2.5"></div>
                  <strong className="block text-slate-900 font-bold text-xs uppercase tracking-wider">
                    Prepared By
                  </strong>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    Media Planning Executive
                  </span>
                </div>
              )}

              {showAuthorizedSignatory && (
                <div className="text-center px-3">
                  <div className="border-b-2 border-slate-400 h-9 mb-2.5"></div>
                  <strong className="block text-slate-900 font-bold text-xs uppercase tracking-wider">
                    Authorized Signatory
                  </strong>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    {agencyName}
                  </span>
                </div>
              )}

              {showClientAcceptance && (
                <div className="text-center px-3">
                  <div className="border-b-2 border-slate-400 h-9 mb-2.5"></div>
                  <strong className="block text-slate-900 font-bold text-xs uppercase tracking-wider">
                    Client Acceptance
                  </strong>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    {clientName}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
