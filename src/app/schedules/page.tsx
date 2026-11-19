"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Radio,
  PlusCircle,
  FileSpreadsheet,
  Search,
  Filter,
  Calendar,
  Layers,
  FileText,
  Printer,
  Trash2,
  Edit,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Tv,
  Wallet,
} from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { MediaSchedule, MediaScheduleStatus } from '@/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScheduleImportModal } from '@/components/schedules/ScheduleImportModal';
import { ScheduleToInvoiceModal } from '@/components/schedules/ScheduleToInvoiceModal';
import { SchedulePdfViewer } from '@/components/schedules/SchedulePdfViewer';
import { SupplierPayableModal } from '@/components/supplier-payments/SupplierPayableModal';

export default function MediaSchedulingPage() {
  const router = useRouter();
  const { schedules, billingEntities, clients, invoices, supplierPayables, deleteSchedule, userRole, isSuperAdmin } = useDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState('all');
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState('all');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [convertTargetSchedule, setConvertTargetSchedule] = useState<MediaSchedule | null>(null);
  const [pdfPreviewSchedule, setPdfPreviewSchedule] = useState<MediaSchedule | null>(null);
  const [supplierPayableTargetSchedule, setSupplierPayableTargetSchedule] = useState<MediaSchedule | null>(null);

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedEntityId !== 'all' && s.billingEntityId !== selectedEntityId) return false;
      if (selectedClientId !== 'all' && s.clientId !== selectedClientId) return false;
      if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;
      if (selectedChannel !== 'all' && s.mediaChannelName.toLowerCase() !== selectedChannel.toLowerCase()) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const client = clients.find((c) => c.id === s.clientId);
        const matchSchedNum = s.scheduleNumber?.toLowerCase().includes(q);
        const matchCampaign = s.campaignName?.toLowerCase().includes(q);
        const matchChannel = s.mediaChannelName?.toLowerCase().includes(q);
        const matchClient = (client?.name || client?.companyName || '').toLowerCase().includes(q);
        const matchNotes = s.specialNotes?.toLowerCase().includes(q);
        if (!matchSchedNum && !matchCampaign && !matchChannel && !matchClient && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [schedules, selectedEntityId, selectedClientId, selectedStatus, selectedChannel, searchQuery, clients]);

  // Dashboard KPI metrics
  const kpis = useMemo(() => {
    const total = schedules.length;
    const draft = schedules.filter((s) => s.status === 'draft').length;
    const confirmed = schedules.filter((s) => s.status === 'confirmed' || s.status === 'active').length;
    const converted = schedules.filter((s) => s.status === 'converted' || s.convertedToInvoiceId).length;
    const totalSpots = schedules.reduce((sum, s) => sum + (s.totalSpots || 0), 0);
    const totalValue = schedules.reduce((sum, s) => sum + (s.netTotal || 0), 0);
    const uninvoicedValue = schedules
      .filter((s) => !s.convertedToInvoiceId && s.status !== 'converted')
      .reduce((sum, s) => sum + (s.netTotal || 0), 0);

    return {
      total,
      draft,
      confirmed,
      converted,
      totalSpots,
      totalValue,
      uninvoicedValue,
    };
  }, [schedules]);

  // Unique channel list for filter
  const channels = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.mediaChannelName) set.add(s.mediaChannelName);
    });
    return Array.from(set);
  }, [schedules]);

  const handleDelete = async (id: string, num: string) => {
    if (confirm(`Are you sure you want to delete Schedule #${num}?`)) {
      await deleteSchedule(id);
    }
  };

  const getStatusBadge = (status: MediaScheduleStatus, isConverted?: boolean) => {
    if (isConverted || status === 'converted') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          Converted to Invoice
        </span>
      );
    }
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Confirmed
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            Active
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
      {/* Top Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-900/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Media Scheduling</h1>
              <p className="text-xs text-slate-500">
                Manage TV & Radio advertising schedules, daily frequencies, and convert to invoices.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import Excel (.xlsx)</span>
          </button>

          <Link
            href="/schedules/new"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Media Schedule</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Schedules */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Schedules
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black text-slate-900">{kpis.total}</span>
            <span className="text-xs text-slate-400">records</span>
          </div>
        </div>

        {/* Total Spots */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Spots
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black text-emerald-700">{kpis.totalSpots}</span>
            <span className="text-xs text-slate-400">transmissions</span>
          </div>
        </div>

        {/* Drafts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Draft
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black text-amber-600">{kpis.draft}</span>
            <span className="text-xs text-slate-400">pending</span>
          </div>
        </div>

        {/* Confirmed / Active */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Confirmed / Active
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black text-teal-700">{kpis.confirmed}</span>
            <span className="text-xs text-slate-400">scheduled</span>
          </div>
        </div>

        {/* Invoiced Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Converted to Inv.
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black text-blue-700">{kpis.converted}</span>
            <span className="text-xs text-slate-400">billed</span>
          </div>
        </div>

        {/* Uninvoiced Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Uninvoiced Value
          </span>
          <div className="mt-1">
            <span className="text-lg font-black text-emerald-700 font-mono block truncate">
              Rs. {kpis.uninvoicedValue.toLocaleString('en-US')}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[220px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schedule #, client, channel, campaign..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs outline-hidden transition-all text-slate-800"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Entity Filter */}
          <select
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden"
          >
            <option value="all">All Entities</option>
            {billingEntities.map((e) => (
              <option key={e.id} value={e.id}>
                [{e.prefix || (e as any)?.invoicePrefix || 'ENT'}] {e.name}
              </option>
            ))}
          </select>

          {/* Client Filter */}
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden"
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.companyName}
              </option>
            ))}
          </select>

          {/* Channel Filter */}
          {channels.length > 0 && (
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden"
            >
              <option value="all">All Channels</option>
              {channels.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="converted">Converted</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Main Schedules Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredSchedules.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Media Schedules Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {schedules.length === 0
                ? "You haven't created or imported any media schedules yet. Import an Excel schedule or create a new one to begin."
                : "No media schedules match your search and filter criteria."}
            </p>
            <div className="pt-2 flex justify-center space-x-3">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Import Excel (.xlsx)</span>
              </button>
              <Link
                href="/schedules/new"
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Schedule</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="px-4 py-3">SCHEDULE #</th>
                  <th className="px-4 py-3">CLIENT & CAMPAIGN</th>
                  <th className="px-4 py-3">CHANNEL</th>
                  <th className="px-4 py-3">BROADCAST PERIOD</th>
                  <th className="px-4 py-3 text-center">SPOTS</th>
                  <th className="px-4 py-3 text-right">COMMERCIAL (LKR)</th>
                  <th className="px-4 py-3 text-center">INVOICE LINK</th>
                  <th className="px-4 py-3 text-center">SUPPLIER PAYMENT</th>
                  <th className="px-4 py-3 text-center">STATUS</th>
                  <th className="px-4 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedules.map((schedule) => {
                  const client = clients.find((c) => c.id === schedule.clientId);
                  const entity = billingEntities.find((e) => e.id === schedule.billingEntityId);
                  const isConverted = Boolean(schedule.convertedToInvoiceId || schedule.status === 'converted');

                  return (
                    <tr
                      key={schedule.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Schedule Number */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/schedules/${schedule.id}`}
                          className="font-bold text-navy-950 font-mono hover:text-emerald-600 block transition-colors"
                        >
                          {schedule.scheduleNumber}
                        </Link>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          [{entity?.prefix || (entity as any)?.invoicePrefix || 'SN'}] {entity?.name?.slice(0, 16)}
                        </span>
                      </td>

                      {/* Client & Campaign */}
                      <td className="px-4 py-3 max-w-xs">
                        <span className="font-bold text-slate-900 block truncate">
                          {client?.name || client?.companyName || schedule.clientSnapshot?.companyName || (schedule.clientSnapshot as any)?.name || 'Unknown Client'}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {schedule.campaignName}
                        </span>
                      </td>

                      {/* Channel */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center space-x-1 font-bold text-slate-800">
                          {schedule.mediaType === 'radio' ? (
                            <Radio className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <Tv className="w-3.5 h-3.5 text-purple-600" />
                          )}
                          <span className="uppercase">{schedule.mediaChannelName}</span>
                        </span>
                      </td>

                      {/* Broadcast Period */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-700 font-medium block">
                          {schedule.startDate} &rarr; {schedule.endDate}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {schedule.items?.length || 0} programme rows
                        </span>
                      </td>

                      {/* Spots */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-black text-emerald-700 text-sm font-mono">
                          {schedule.totalSpots}
                        </span>
                      </td>

                      {/* Commercial Total */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-black text-slate-900 font-mono text-sm block">
                          Rs. {schedule.netTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        {schedule.taxApplicable && (
                          <span className="text-[10px] text-emerald-700 font-medium block">
                            incl. {schedule.taxRate}% VAT
                          </span>
                        )}
                      </td>

                      {/* Invoice Link */}
                      <td className="px-4 py-3 text-center">
                        {schedule.convertedToInvoiceId ? (
                          <Link
                            href={`/invoices/${schedule.convertedToInvoiceId}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-mono font-bold transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>#{schedule.convertedToInvoiceNumber || 'View'}</span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConvertTargetSchedule(schedule)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 rounded-lg text-[11px] font-semibold transition-colors"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Convert</span>
                          </button>
                        )}
                      </td>

                      {/* Supplier Payment Status */}
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const linked = supplierPayables.filter((p) => p.mediaScheduleId === schedule.id);
                          if (linked.length === 0) {
                            return (
                              <button
                                type="button"
                                onClick={() => setSupplierPayableTargetSchedule(schedule)}
                                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-700 font-medium transition-colors"
                                title="Set Broadcaster Cost"
                              >
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold text-[10px]">
                                  Not Set
                                </span>
                              </button>
                            );
                          }

                          const totalCost = linked.reduce((sum, p) => sum + p.totalAmount, 0);
                          const totalPaid = linked.reduce((sum, p) => sum + p.totalPaid, 0);
                          const isAllPaid = totalPaid >= totalCost && totalCost > 0;
                          const hasOverdue = linked.some(
                            (p) =>
                              p.outstandingAmount > 0 &&
                              p.dueDate &&
                              new Date(p.dueDate) < new Date(new Date().toDateString())
                          );

                          return (
                            <div className="space-y-0.5">
                              {isAllPaid ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle className="w-3 h-3" /> Fully Paid
                                </span>
                              ) : hasOverdue ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  <AlertCircle className="w-3 h-3" /> Overdue
                                </span>
                              ) : totalPaid > 0 ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  <Clock className="w-3 h-3" /> Partially Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                  <Clock className="w-3 h-3" /> Unpaid
                                </span>
                              )}
                              <span className="block font-mono text-[10px] text-slate-500 font-bold">
                                Cost: Rs. {totalCost.toLocaleString()}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(schedule.status, isConverted)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Manage Supplier Payment */}
                          <button
                            type="button"
                            onClick={() => setSupplierPayableTargetSchedule(schedule)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                            title="Manage Supplier Payment"
                          >
                            <Wallet className="w-4 h-4" />
                          </button>

                          {/* View/Edit */}
                          <Link
                            href={`/schedules/${schedule.id}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Edit Schedule"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          {/* PDF Preview */}
                          <button
                            type="button"
                            onClick={() => setPdfPreviewSchedule(schedule)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                            title="View / Print PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(schedule.id, schedule.scheduleNumber)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Excel Importer Modal */}
      {isImportModalOpen && (
        <ScheduleImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={(saved) => {
            router.push(`/schedules/${saved.id}`);
          }}
        />
      )}

      {/* Convert to Invoice Modal */}
      {convertTargetSchedule && (
        <ScheduleToInvoiceModal
          schedule={convertTargetSchedule}
          billingEntity={billingEntities.find((e) => e.id === convertTargetSchedule.billingEntityId)}
          client={clients.find((c) => c.id === convertTargetSchedule.clientId)}
          onClose={() => setConvertTargetSchedule(null)}
          onSuccess={(invId) => {
            setConvertTargetSchedule(null);
            router.push(`/invoices/${invId}`);
          }}
        />
      )}

      {/* PDF Previewer Modal */}
      {pdfPreviewSchedule && (
        <SchedulePdfViewer
          schedule={pdfPreviewSchedule}
          billingEntity={billingEntities.find((e) => e.id === pdfPreviewSchedule.billingEntityId)}
          client={clients.find((c) => c.id === pdfPreviewSchedule.clientId)}
          onClose={() => setPdfPreviewSchedule(null)}
        />
      )}

      {/* Supplier Payable Modal */}
      {supplierPayableTargetSchedule && (
        <SupplierPayableModal
          preselectedSchedule={supplierPayableTargetSchedule}
          isOpen={Boolean(supplierPayableTargetSchedule)}
          onClose={() => setSupplierPayableTargetSchedule(null)}
          onSaved={() => {
            setSupplierPayableTargetSchedule(null);
          }}
        />
      )}
      </div>
    </AppLayout>
  );
}
