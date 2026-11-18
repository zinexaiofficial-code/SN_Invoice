"use client";

import React, { useMemo } from 'react';
import { Plus, Trash2, Copy, Sparkles, Clock, Film, Radio, ArrowUpDown } from 'lucide-react';
import { MediaScheduleItem, MediaPricingMode } from '@/types';
import { cn } from '@/lib/utils';

interface ScheduleGridProps {
  dates: string[]; // List of YYYY-MM-DD
  items: MediaScheduleItem[];
  pricingMode: MediaPricingMode;
  defaultRate?: number;
  readOnly?: boolean;
  onChange: (items: MediaScheduleItem[]) => void;
}

export function ScheduleGrid({
  dates,
  items,
  pricingMode,
  defaultRate = 0,
  readOnly = false,
  onChange,
}: ScheduleGridProps) {
  // Parse date details for headers
  const dateMeta = useMemo(() => {
    return dates.map((dStr) => {
      const d = new Date(dStr);
      const dayNum = d.getDate();
      const monthShort = d.toLocaleString('en-US', { month: 'short' });
      const weekdayLetter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      return {
        dateStr: dStr,
        dayNum,
        monthShort,
        weekdayLetter,
        isWeekend,
      };
    });
  }, [dates]);

  // Compute daily column totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    dates.forEach((d) => (totals[d] = 0));
    items.forEach((it) => {
      const allocs = it.allocations || {};
      dates.forEach((d) => {
        totals[d] = (totals[d] || 0) + (Number(allocs[d]) || 0);
      });
    });
    return totals;
  }, [dates, items]);

  // Grand total spots
  const grandTotalSpots = useMemo(() => {
    return Object.values(dailyTotals).reduce((sum, n) => sum + n, 0);
  }, [dailyTotals]);

  // Grand total value (if spot_rate mode)
  const grandTotalAmount = useMemo(() => {
    if (pricingMode !== 'spot_rate') return 0;
    return items.reduce((sum, it) => {
      const rate = it.ratePerSpot || defaultRate || 0;
      return sum + (it.totalSpots * rate);
    }, 0);
  }, [items, pricingMode, defaultRate]);

  // Handle cell spot count change
  const handleSpotChange = (itemIndex: number, dateStr: string, value: string) => {
    if (readOnly) return;
    const num = parseInt(value, 10);
    const validNum = isNaN(num) || num < 0 ? 0 : num;

    const newItems = [...items];
    const currentItem = { ...newItems[itemIndex] };
    const allocs = { ...(currentItem.allocations || {}) };

    if (validNum > 0) {
      allocs[dateStr] = validNum;
    } else {
      delete allocs[dateStr];
    }

    const totalSpots = Object.values(allocs).reduce((sum, n) => sum + n, 0);
    const rate = currentItem.ratePerSpot || defaultRate || 0;
    const totalAmount = totalSpots * rate;

    currentItem.allocations = allocs;
    currentItem.totalSpots = totalSpots;
    currentItem.totalAmount = totalAmount;

    newItems[itemIndex] = currentItem;
    onChange(newItems);
  };

  // Update item details (programme name, time, duration, etc.)
  const handleItemFieldChange = (itemIndex: number, field: keyof MediaScheduleItem, value: any) => {
    if (readOnly) return;
    const newItems = [...items];
    const current = { ...newItems[itemIndex], [field]: value };

    if (field === 'ratePerSpot') {
      const rate = Number(value) || 0;
      current.ratePerSpot = rate;
      current.totalAmount = current.totalSpots * rate;
    }

    newItems[itemIndex] = current;
    onChange(newItems);
  };

  // Add new programme row
  const handleAddRow = () => {
    if (readOnly) return;
    const newItem: MediaScheduleItem = {
      id: crypto.randomUUID(),
      programmeName: `Programme ${items.length + 1}`,
      timeSlot: '08:00 PM - 08:30 PM',
      duration: '10s',
      adType: 'Spot',
      ratePerSpot: defaultRate,
      totalSpots: 0,
      totalAmount: 0,
      displayOrder: items.length,
      allocations: {},
    };
    onChange([...items, newItem]);
  };

  // Duplicate a row
  const handleDuplicateRow = (index: number) => {
    if (readOnly) return;
    const target = items[index];
    const duplicated: MediaScheduleItem = {
      ...target,
      id: crypto.randomUUID(),
      programmeName: `${target.programmeName} (Copy)`,
      displayOrder: items.length,
      allocations: { ...(target.allocations || {}) },
    };
    onChange([...items, duplicated]);
  };

  // Delete a row
  const handleDeleteRow = (index: number) => {
    if (readOnly || items.length <= 1) return;
    onChange(items.filter((_, idx) => idx !== index));
  };

  // Bulk fill row (e.g. 1 on all weekdays)
  const handleBulkFill = (index: number, mode: 'weekdays' | 'all' | 'clear') => {
    if (readOnly) return;
    const newItems = [...items];
    const item = { ...newItems[index] };
    const allocs = { ...(item.allocations || {}) };

    dates.forEach((dStr) => {
      const d = new Date(dStr);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      if (mode === 'clear') {
        delete allocs[dStr];
      } else if (mode === 'weekdays') {
        if (!isWeekend) allocs[dStr] = 1;
        else delete allocs[dStr];
      } else if (mode === 'all') {
        allocs[dStr] = 1;
      }
    });

    const totalSpots = Object.values(allocs).reduce((sum, n) => sum + n, 0);
    const rate = item.ratePerSpot || defaultRate || 0;

    item.allocations = allocs;
    item.totalSpots = totalSpots;
    item.totalAmount = totalSpots * rate;
    newItems[index] = item;
    onChange(newItems);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs">
            Broadcast Grid ({dates.length} Days)
          </span>
          <span className="text-xs text-slate-500">
            Total Transmissions: <strong className="text-emerald-700 font-bold">{grandTotalSpots} spots</strong>
          </span>
          {pricingMode === 'spot_rate' && (
            <span className="text-xs text-slate-500 border-l border-slate-300 pl-2">
              Value: <strong className="text-slate-900 font-bold">Rs. {grandTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </span>
          )}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Programme Row</span>
          </button>
        )}
      </div>

      {/* Grid Container with horizontal scroll */}
      <div className="overflow-x-auto relative w-full scrollbar-thin scrollbar-thumb-slate-300">
        <table className="w-full text-left border-collapse text-xs select-none">
          <thead>
            {/* Header Row 1: Weekday Letters */}
            <tr className="bg-navy-950 text-white border-b border-navy-900 sticky top-0 z-30">
              <th className="sticky left-0 z-40 bg-navy-950 px-3 py-2 font-bold min-w-[180px] border-r border-navy-800">
                PROGRAMME / PLACEMENT
              </th>
              <th className="sticky left-[180px] z-40 bg-navy-950 px-2 py-2 font-bold min-w-[130px] border-r border-navy-800">
                TIME SLOT
              </th>
              <th className="sticky left-[310px] z-40 bg-navy-950 px-2 py-2 font-bold min-w-[70px] border-r border-navy-800">
                DUR.
              </th>
              <th className="sticky left-[380px] z-40 bg-navy-950 px-2 py-2 font-bold min-w-[85px] border-r border-navy-800">
                TYPE
              </th>
              {pricingMode === 'spot_rate' && (
                <th className="sticky left-[465px] z-40 bg-navy-950 px-2 py-2 font-bold min-w-[85px] border-r border-navy-800 text-right">
                  RATE (LKR)
                </th>
              )}

              {/* Day Initials Header */}
              {dateMeta.map((dm) => (
                <th
                  key={`day-letter-${dm.dateStr}`}
                  className={cn(
                    "text-center py-1.5 px-1 font-semibold min-w-[34px] max-w-[36px] border-r border-navy-800 text-[11px]",
                    dm.isWeekend ? "bg-navy-900 text-amber-300 font-bold" : "text-slate-200"
                  )}
                  title={`${dm.dateStr}`}
                >
                  {dm.weekdayLetter}
                </th>
              ))}

              <th className="sticky right-0 z-40 bg-navy-950 px-3 py-2 font-bold text-center min-w-[80px] border-l border-navy-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)]">
                SPOTS
              </th>
              {pricingMode === 'spot_rate' && (
                <th className="px-3 py-2 font-bold text-right min-w-[95px] bg-navy-950 border-l border-navy-800">
                  TOTAL (LKR)
                </th>
              )}
              {!readOnly && (
                <th className="px-2 py-2 font-bold text-center min-w-[70px] bg-navy-950">
                  ACTIONS
                </th>
              )}
            </tr>

            {/* Header Row 2: Day Numbers */}
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 sticky top-[33px] z-20 font-medium">
              <th colSpan={pricingMode === 'spot_rate' ? 5 : 4} className="sticky left-0 z-30 bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 border-r border-slate-300">
                Broadcast Date Calendar
              </th>
              {dateMeta.map((dm) => (
                <th
                  key={`day-num-${dm.dateStr}`}
                  className={cn(
                    "text-center py-1 px-1 font-black text-xs border-r border-slate-200",
                    dm.isWeekend ? "bg-amber-100/70 text-amber-900" : "bg-slate-50 text-slate-800"
                  )}
                  title={`${dm.dayNum} ${dm.monthShort}`}
                >
                  {dm.dayNum}
                </th>
              ))}
              <th className="sticky right-0 z-30 bg-slate-100 px-3 py-1 font-bold text-center text-emerald-800 border-l border-slate-300 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                TOTAL
              </th>
              {pricingMode === 'spot_rate' && (
                <th className="px-3 py-1 font-bold text-right text-slate-800 bg-slate-100 border-l border-slate-300">
                  NET
                </th>
              )}
              {!readOnly && <th className="bg-slate-100"></th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {items.map((item, itemIdx) => {
              const allocs = item.allocations || {};
              const rowRate = item.ratePerSpot || defaultRate || 0;
              const rowTotal = item.totalSpots * rowRate;

              return (
                <tr
                  key={item.id || `item-${itemIdx}`}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  {/* Left Column 1: Programme Name */}
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/50 px-2 py-1.5 border-r border-slate-200 shadow-xs">
                    {readOnly ? (
                      <span className="font-semibold text-slate-800">{item.programmeName}</span>
                    ) : (
                      <input
                        type="text"
                        value={item.programmeName}
                        onChange={(e) => handleItemFieldChange(itemIdx, 'programmeName', e.target.value)}
                        placeholder="e.g. Drama / Morning Show"
                        className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 font-semibold text-slate-800 text-xs outline-hidden"
                      />
                    )}
                  </td>

                  {/* Left Column 2: Time Slot */}
                  <td className="sticky left-[180px] z-10 bg-white group-hover:bg-blue-50/50 px-2 py-1.5 border-r border-slate-200">
                    {readOnly ? (
                      <span className="text-slate-600 font-mono text-[11px]">{item.timeSlot}</span>
                    ) : (
                      <input
                        type="text"
                        value={item.timeSlot || ''}
                        onChange={(e) => handleItemFieldChange(itemIdx, 'timeSlot', e.target.value)}
                        placeholder="08:00 PM - 08:30 PM"
                        className="w-full px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 font-mono text-[11px] text-slate-600 outline-hidden"
                      />
                    )}
                  </td>

                  {/* Left Column 3: Duration */}
                  <td className="sticky left-[310px] z-10 bg-white group-hover:bg-blue-50/50 px-1 py-1.5 border-r border-slate-200 text-center">
                    {readOnly ? (
                      <span className="font-bold text-slate-700">{item.duration}</span>
                    ) : (
                      <input
                        type="text"
                        value={item.duration || ''}
                        onChange={(e) => handleItemFieldChange(itemIdx, 'duration', e.target.value)}
                        placeholder="10s"
                        className="w-full px-1 py-1 text-center bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 font-medium text-slate-700 text-xs outline-hidden"
                      />
                    )}
                  </td>

                  {/* Left Column 4: Ad Type */}
                  <td className="sticky left-[380px] z-10 bg-white group-hover:bg-blue-50/50 px-1 py-1.5 border-r border-slate-200">
                    {readOnly ? (
                      <span className="text-[11px] text-slate-600">{item.adType || 'Spot'}</span>
                    ) : (
                      <select
                        value={item.adType || 'Spot'}
                        onChange={(e) => handleItemFieldChange(itemIdx, 'adType', e.target.value)}
                        className="w-full px-1 py-1 bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-slate-300 text-[11px] text-slate-700 outline-hidden"
                      >
                        <option value="Spot">Spot</option>
                        <option value="DJ Endorsement">DJ Endorse</option>
                        <option value="Trailer">Trailer</option>
                        <option value="Opening Caption">Opening</option>
                        <option value="Closing Caption">Closing</option>
                        <option value="Special">Special</option>
                      </select>
                    )}
                  </td>

                  {/* Optional Left Column 5: Rate */}
                  {pricingMode === 'spot_rate' && (
                    <td className="sticky left-[465px] z-10 bg-white group-hover:bg-blue-50/50 px-2 py-1.5 border-r border-slate-200 text-right">
                      {readOnly ? (
                        <span className="font-mono text-slate-800">
                          {rowRate.toLocaleString('en-US')}
                        </span>
                      ) : (
                        <input
                          type="number"
                          value={item.ratePerSpot || ''}
                          onChange={(e) => handleItemFieldChange(itemIdx, 'ratePerSpot', e.target.value)}
                          placeholder="Rate"
                          className="w-full px-1.5 py-1 text-right bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 font-mono text-slate-800 text-xs outline-hidden"
                        />
                      )}
                    </td>
                  )}

                  {/* Daily Spot Allocations Cells */}
                  {dateMeta.map((dm) => {
                    const spots = allocs[dm.dateStr] || 0;
                    return (
                      <td
                        key={`cell-${item.id}-${dm.dateStr}`}
                        className={cn(
                          "p-0.5 text-center border-r border-slate-200 transition-colors",
                          dm.isWeekend ? "bg-amber-50/40" : "",
                          spots > 0 ? "bg-emerald-50/70" : ""
                        )}
                      >
                        {readOnly ? (
                          <span
                            className={cn(
                              "inline-block w-full py-1 text-center font-bold text-xs",
                              spots > 0 ? "text-emerald-700 font-black" : "text-slate-300"
                            )}
                          >
                            {spots > 0 ? spots : '-'}
                          </span>
                        ) : (
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={spots > 0 ? spots : ''}
                            onChange={(e) => handleSpotChange(itemIdx, dm.dateStr, e.target.value)}
                            className={cn(
                              "w-full h-7 text-center font-bold text-xs rounded transition-all outline-hidden border",
                              spots > 0
                                ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                                : "bg-transparent hover:bg-white focus:bg-white text-slate-700 border-transparent hover:border-slate-300 focus:border-emerald-500"
                            )}
                            title={`${item.programmeName} on ${dm.dayNum} ${dm.monthShort}`}
                          />
                        )}
                      </td>
                    );
                  })}

                  {/* Row Total Spots */}
                  <td className="sticky right-0 z-10 bg-white group-hover:bg-blue-50/50 px-3 py-1.5 text-center font-black text-sm text-emerald-700 border-l border-slate-200 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                    {item.totalSpots}
                  </td>

                  {/* Row Total Amount (if spot_rate mode) */}
                  {pricingMode === 'spot_rate' && (
                    <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 border-l border-slate-200 bg-white group-hover:bg-blue-50/50">
                      Rs. {rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  )}

                  {/* Row Action Buttons */}
                  {!readOnly && (
                    <td className="px-2 py-1.5 text-center bg-white group-hover:bg-blue-50/50 whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleBulkFill(itemIdx, 'weekdays')}
                          title="Fill all weekdays with 1 spot"
                          className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-slate-100"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(itemIdx)}
                          title="Duplicate row"
                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(itemIdx)}
                            title="Delete row"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          {/* Footer: Daily Totals and Grand Total */}
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs sticky bottom-0 z-20">
              <td
                colSpan={pricingMode === 'spot_rate' ? 5 : 4}
                className="sticky left-0 z-30 bg-slate-100 px-3 py-2 text-slate-800 uppercase tracking-wider font-black border-r border-slate-300"
              >
                TOTAL ADVERTISEMENTS / DAILY FREQUENCY
              </td>

              {dateMeta.map((dm) => {
                const total = dailyTotals[dm.dateStr] || 0;
                return (
                  <td
                    key={`foot-total-${dm.dateStr}`}
                    className={cn(
                      "text-center py-2 px-1 font-black text-xs border-r border-slate-200",
                      dm.isWeekend ? "bg-amber-100/60 text-amber-900" : "bg-slate-100 text-slate-800",
                      total > 0 ? "text-emerald-800" : "text-slate-400"
                    )}
                  >
                    {total > 0 ? total : '-'}
                  </td>
                );
              })}

              {/* Grand Total Spots */}
              <td className="sticky right-0 z-30 bg-emerald-600 text-white px-3 py-2 text-center font-black text-base shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)]">
                {grandTotalSpots}
              </td>

              {/* Grand Total Amount */}
              {pricingMode === 'spot_rate' && (
                <td className="px-3 py-2 text-right font-mono font-black text-slate-900 bg-slate-200 border-l border-slate-300">
                  Rs. {grandTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              )}

              {!readOnly && <td className="bg-slate-100"></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
