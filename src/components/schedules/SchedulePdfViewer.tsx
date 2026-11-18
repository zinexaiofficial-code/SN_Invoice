"use client";

import React, { useRef } from 'react';
import { Printer, Download, X, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { MediaSchedule, BillingEntity, Client } from '@/types';
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
  billingEntity,
  client,
  onClose,
}: SchedulePdfViewerProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  // Generate list of date strings
  const dates = React.useMemo(() => {
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
  const dailyTotals = React.useMemo(() => {
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

  const agencyName = billingEntity?.displayName || billingEntity?.name || schedule.billingEntitySnapshot?.name || "SN ADVERTISING";
  const clientName = client?.name || client?.companyName || schedule.clientSnapshot?.companyName || (schedule.clientSnapshot as any)?.name || "Client";

  // Handle browser direct print
  const handlePrint = () => {
    window.print();
  };

  // Handle PDF export
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

      const imgWidth = pdfWidth - 10;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, Math.min(imgHeight, pdfHeight - 10));
      pdf.save(`Schedule_${schedule.scheduleNumber || 'export'}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF. You can also use the browser Print button.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-between overflow-y-auto p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static">
      {/* Top action bar - Hidden when printing */}
      <div className="max-w-6xl w-full mx-auto bg-navy-950 text-white rounded-t-xl px-4 py-3 flex items-center justify-between shadow-lg print:hidden">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-bold text-sm">Media Broadcast Schedule — {schedule.scheduleNumber}</h3>
            <p className="text-[11px] text-slate-300">
              {clientName} &bull; {schedule.mediaChannelName} &bull; {schedule.startDate} to {schedule.endDate}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating...' : 'Download PDF'}</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Printable Paper Surface */}
      <div className="max-w-6xl w-full mx-auto bg-white rounded-b-xl shadow-2xl p-6 sm:p-8 md:p-10 text-slate-900 font-sans print:shadow-none print:p-4 print:max-w-full">
        <div ref={printRef} className="space-y-6">
          {/* Header Section */}
          <div className="border-b-2 border-navy-950 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xl sm:text-2xl font-black uppercase tracking-wider text-navy-950">
                {agencyName}
              </div>
              <div className="text-xs font-semibold text-emerald-800 uppercase tracking-widest mt-0.5">
                Official Media Broadcast Schedule & Insertion Order
              </div>
              {billingEntity?.address && (
                <div className="text-[11px] text-slate-500 mt-1 max-w-md">
                  {billingEntity.address} &bull; {billingEntity.phone || ''}
                </div>
              )}
            </div>

            <div className="text-left sm:text-right bg-slate-50 border border-slate-200 rounded-lg p-3 min-w-[220px]">
              <div className="text-[11px] font-bold uppercase text-slate-500">Schedule Reference</div>
              <div className="text-sm font-black font-mono text-navy-950">{schedule.scheduleNumber}</div>
              <div className="text-xs text-slate-600 mt-1">
                Issued Date: <strong>{new Date().toISOString().split('T')[0]}</strong>
              </div>
              <div className="text-xs text-slate-600">
                Media: <strong className="uppercase">{schedule.mediaType}</strong>
              </div>
            </div>
          </div>

          {/* Schedule Metadata Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs">
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
              <strong className="text-navy-950 text-sm block mt-0.5">
                {schedule.startDate} to {schedule.endDate}
              </strong>
            </div>
          </div>

          {/* Broadcast Allocation Grid */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-2">
            {/* Left: Notes & Conditions */}
            <div className="border border-slate-200 rounded-lg p-3 text-xs space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Broadcast Notes & Special Instructions
              </h4>
              <p className="text-slate-600 leading-relaxed">
                {schedule.specialNotes || 'Broadcast transmission as per approved media plan and channel time slots. Tapes and commercial assets to be delivered 48 hours prior to scheduled telecast.'}
              </p>
              {schedule.termsAndConditions && (
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  {schedule.termsAndConditions}
                </div>
              )}
            </div>

            {/* Right: Financial Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
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
            </div>
          </div>

          {/* Signatures & Approvals Section */}
          <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs border-t border-slate-300">
            <div>
              <div className="border-b border-slate-400 h-10 mb-2"></div>
              <strong className="block text-slate-800">Prepared By</strong>
              <span className="text-[11px] text-slate-500">Media Planning Executive</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-10 mb-2"></div>
              <strong className="block text-slate-800">Authorized Signatory</strong>
              <span className="text-[11px] text-slate-500">{agencyName}</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-10 mb-2"></div>
              <strong className="block text-slate-800">Client Acceptance</strong>
              <span className="text-[11px] text-slate-500">{clientName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
