"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, X, Check, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FillMode = 'all' | 'weekdays' | 'saturday' | 'sunday' | 'weekend' | 'custom';
export type FillBehaviour = 'replace' | 'empty_only' | 'clear';

interface SmartFillModalProps {
  isOpen: boolean;
  programmeName: string;
  dates: string[]; // YYYY-MM-DD
  currentAllocations: Record<string, number>;
  onApply: (newAllocations: Record<string, number>) => void;
  onClose: () => void;
}

const WEEKDAY_NAMES = [
  { dayIndex: 1, label: 'Mon', full: 'Monday' },
  { dayIndex: 2, label: 'Tue', full: 'Tuesday' },
  { dayIndex: 3, label: 'Wed', full: 'Wednesday' },
  { dayIndex: 4, label: 'Thu', full: 'Thursday' },
  { dayIndex: 5, label: 'Fri', full: 'Friday' },
  { dayIndex: 6, label: 'Sat', full: 'Saturday' },
  { dayIndex: 0, label: 'Sun', full: 'Sunday' },
];

export function SmartFillModal({
  isOpen,
  programmeName,
  dates,
  currentAllocations,
  onApply,
  onClose,
}: SmartFillModalProps) {
  // Load session preferences if available
  const [spotsPerDay, setSpotsPerDay] = useState<number>(1);
  const [mode, setMode] = useState<FillMode>('weekdays');
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [behaviour, setBehaviour] = useState<FillBehaviour>('replace');
  const [useDateRange, setUseDateRange] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(dates[0] || '');
  const [endDate, setEndDate] = useState<string>(dates[dates.length - 1] || '');

  // Retrieve saved preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sn_smart_fill_pref');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.spotsPerDay !== undefined) setSpotsPerDay(parsed.spotsPerDay);
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.behaviour) setBehaviour(parsed.behaviour);
        if (Array.isArray(parsed.customDays)) setCustomDays(parsed.customDays);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Update dates if list changes
  useEffect(() => {
    if (dates.length > 0) {
      if (!startDate) setStartDate(dates[0]);
      if (!endDate) setEndDate(dates[dates.length - 1]);
    }
  }, [dates, startDate, endDate]);

  if (!isOpen) return null;

  // Filter dates by sub-range if active
  const effectiveDates = useMemo(() => {
    if (!useDateRange || !startDate || !endDate) return dates;
    return dates.filter((d) => d >= startDate && d <= endDate);
  }, [dates, useDateRange, startDate, endDate]);

  // Determine which dates match the selected day filter
  const matchingDates = useMemo(() => {
    return effectiveDates.filter((dStr) => {
      // Base calculation strictly on actual calendar math
      const d = new Date(dStr);
      const day = d.getDay(); // 0 is Sunday, 6 is Saturday
      switch (mode) {
        case 'all':
          return true;
        case 'weekdays':
          return day >= 1 && day <= 5;
        case 'saturday':
          return day === 6;
        case 'sunday':
          return day === 0;
        case 'weekend':
          return day === 0 || day === 6;
        case 'custom':
          return customDays.includes(day);
        default:
          return false;
      }
    });
  }, [effectiveDates, mode, customDays]);

  // Compute preview impact
  const preview = useMemo(() => {
    const updated = { ...currentAllocations };
    let affectedCount = 0;

    matchingDates.forEach((dStr) => {
      const current = updated[dStr] || 0;
      if (behaviour === 'clear') {
        if (current > 0) affectedCount++;
        delete updated[dStr];
      } else if (behaviour === 'empty_only') {
        if (current === 0 && spotsPerDay > 0) {
          updated[dStr] = spotsPerDay;
          affectedCount++;
        }
      } else {
        // replace
        if (current !== spotsPerDay) affectedCount++;
        if (spotsPerDay > 0) {
          updated[dStr] = spotsPerDay;
        } else {
          delete updated[dStr];
        }
      }
    });

    const newTotalSpots = Object.values(updated).reduce((a, b) => a + (Number(b) || 0), 0);
    const oldTotalSpots = Object.values(currentAllocations).reduce((a, b) => a + (Number(b) || 0), 0);
    const diff = newTotalSpots - oldTotalSpots;

    return {
      updatedAllocations: updated,
      matchingCount: matchingDates.length,
      affectedCount,
      oldTotalSpots,
      newTotalSpots,
      diff,
    };
  }, [matchingDates, currentAllocations, behaviour, spotsPerDay]);

  // Toggle Custom Day checkbox
  const handleToggleCustomDay = (dayIndex: number) => {
    if (customDays.includes(dayIndex)) {
      setCustomDays(customDays.filter((d) => d !== dayIndex));
    } else {
      setCustomDays([...customDays, dayIndex]);
    }
  };

  // Submit and save preferences
  const handleApply = () => {
    try {
      localStorage.setItem(
        'sn_smart_fill_pref',
        JSON.stringify({
          spotsPerDay,
          mode,
          behaviour,
          customDays,
        })
      );
    } catch {
      // Ignore
    }

    onApply(preview.updatedAllocations);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-navy-950 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">
                Smart Frequency Fill
              </h3>
              <p className="text-[11px] text-slate-300">
                {programmeName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Spot Count */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Daily Spot Count (Transmissions / Day)
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 5, 10].map((num) => (
                <button
                  key={`num-preset-${num}`}
                  type="button"
                  onClick={() => setSpotsPerDay(num)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg font-mono font-bold text-xs transition-colors border",
                    spotsPerDay === num && behaviour !== 'clear'
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  )}
                >
                  {num}
                </button>
              ))}
              <div className="w-24">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={spotsPerDay}
                  onChange={(e) => setSpotsPerDay(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="Custom"
                  className="w-full py-1.5 px-2 text-center bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Date Selection Mode */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Target Broadcast Days
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'weekdays', label: 'Mon – Fri (Weekdays)' },
                { id: 'weekend', label: 'Sat & Sun (Weekends)' },
                { id: 'saturday', label: 'Saturday Only' },
                { id: 'sunday', label: 'Sunday Only' },
                { id: 'all', label: 'All Days (Everyday)' },
                { id: 'custom', label: 'Custom Weekdays' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id as FillMode)}
                  className={cn(
                    "px-2.5 py-2 rounded-xl text-left border text-xs font-semibold transition-all",
                    mode === opt.id
                      ? "bg-navy-950 text-white border-navy-900 shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom Day Checkboxes */}
            {mode === 'custom' && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Select Days of Week
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_NAMES.map((w) => {
                    const isChecked = customDays.includes(w.dayIndex);
                    return (
                      <button
                        key={`custom-day-${w.dayIndex}`}
                        type="button"
                        onClick={() => handleToggleCustomDay(w.dayIndex)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                          isChecked
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                        )}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Fill Behaviour */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Fill Behaviour
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBehaviour('replace')}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all",
                  behaviour === 'replace'
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950 ring-1 ring-emerald-400"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
              >
                <div className="font-bold text-xs">Replace All</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Overwrite matching dates</div>
              </button>

              <button
                type="button"
                onClick={() => setBehaviour('empty_only')}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all",
                  behaviour === 'empty_only'
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950 ring-1 ring-emerald-400"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
              >
                <div className="font-bold text-xs">Empty Only</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Keep existing spots</div>
              </button>

              <button
                type="button"
                onClick={() => setBehaviour('clear')}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all",
                  behaviour === 'clear'
                    ? "bg-rose-50 border-rose-300 text-rose-950 ring-1 ring-rose-400"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
              >
                <div className="font-bold text-xs">Clear Matching</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Set to 0 / remove</div>
              </button>
            </div>
          </div>

          {/* Section 4: Optional Date Range Sub-selection */}
          <div className="pt-1">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={useDateRange}
                onChange={(e) => setUseDateRange(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 bg-slate-100 border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Limit fill to a specific date range</span>
            </label>

            {useDateRange && (
              <div className="grid grid-cols-2 gap-3 mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    From Date
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={dates[0]}
                    max={endDate || dates[dates.length - 1]}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    To Date
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || dates[0]}
                    max={dates[dates.length - 1]}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Live Impact Preview Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Impact Preview
              </span>
              <span className="text-xs font-mono font-bold text-emerald-800">
                {preview.matchingCount} Matching Days
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Cells Affected</span>
                <strong className="text-xs font-mono text-slate-800 font-bold">{preview.affectedCount}</strong>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Spots Change</span>
                <strong className={cn("text-xs font-mono font-bold", preview.diff >= 0 ? "text-emerald-700" : "text-rose-600")}>
                  {preview.diff >= 0 ? `+${preview.diff}` : preview.diff}
                </strong>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">New Row Total</span>
                <strong className="text-xs font-mono text-navy-950 font-black">{preview.newTotalSpots} spots</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Smart Fill</span>
          </button>
        </div>
      </div>
    </div>
  );
}
