"use client";

import React, { useState, useMemo } from 'react';
import { Clock, X, Check, Moon, Sun, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlotModalProps {
  isOpen: boolean;
  currentTimeSlot?: string;
  programmeName?: string;
  onApply: (formattedTimeSlot: string) => void;
  onClose: () => void;
}

// Generate 30-minute interval times from 12:00 AM to 11:30 PM
export const TIME_SLOT_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const period = h < 12 ? 'AM' : 'PM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const hourStr = hour12.toString().padStart(2, '0');
    const minStr = m.toString().padStart(2, '0');
    TIME_SLOT_OPTIONS.push(`${hourStr}:${minStr} ${period}`);
  }
}

// Common Broadcast Presets in Sri Lanka TV & Radio
const PRESETS = [
  { label: 'Prime Time (08:00 - 08:30 PM)', start: '08:00 PM', end: '08:30 PM', category: 'TV Prime' },
  { label: 'Prime Time 2 (08:30 - 09:00 PM)', start: '08:30 PM', end: '09:00 PM', category: 'TV Prime' },
  { label: 'Late Prime (09:00 - 09:30 PM)', start: '09:00 PM', end: '09:30 PM', category: 'TV Prime' },
  { label: 'Morning Show (07:00 - 09:00 AM)', start: '07:00 AM', end: '09:00 AM', category: 'Radio / TV' },
  { label: 'Breakfast Drive (06:30 - 09:30 AM)', start: '06:30 AM', end: '09:30 AM', category: 'Radio' },
  { label: 'Midday Slot (12:00 - 01:00 PM)', start: '12:00 PM', end: '01:00 PM', category: 'General' },
  { label: 'Evening Drive (05:00 - 07:00 PM)', start: '05:00 PM', end: '07:00 PM', category: 'Radio' },
  { label: 'Night Show (10:00 - 11:00 PM)', start: '10:00 PM', end: '11:00 PM', category: 'General' },
];

export function TimeSlotModal({
  isOpen,
  currentTimeSlot = '',
  programmeName = 'Programme',
  onApply,
  onClose,
}: TimeSlotModalProps) {
  // Parse initial start and end times
  const initial = useMemo(() => {
    if (!currentTimeSlot) {
      return { start: '08:00 PM', end: '08:30 PM', custom: '' };
    }
    const parts = currentTimeSlot.split(/\s*(?:-|–|—|to)\s*/i);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const s = parts[0].trim();
      const e = parts[1].trim();
      return {
        start: TIME_SLOT_OPTIONS.includes(s) ? s : '08:00 PM',
        end: TIME_SLOT_OPTIONS.includes(e) ? e : '08:30 PM',
        custom: currentTimeSlot,
      };
    }
    return { start: '08:00 PM', end: '08:30 PM', custom: currentTimeSlot };
  }, [currentTimeSlot]);

  const [mode, setMode] = useState<'standard' | 'custom'>('standard');
  const [startTime, setStartTime] = useState<string>(initial.start);
  const [endTime, setEndTime] = useState<string>(initial.end);
  const [customValue, setCustomValue] = useState<string>(initial.custom || currentTimeSlot);

  if (!isOpen) return null;

  // Determine if overnight (+1 Day)
  const isOvernight = useMemo(() => {
    const sIdx = TIME_SLOT_OPTIONS.indexOf(startTime);
    const eIdx = TIME_SLOT_OPTIONS.indexOf(endTime);
    return sIdx >= 0 && eIdx >= 0 && eIdx <= sIdx;
  }, [startTime, endTime]);

  // Handle Preset Click
  const handleSelectPreset = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    setMode('standard');
  };

  // Submit
  const handleSave = () => {
    if (mode === 'custom') {
      onApply(customValue.trim() || `${startTime} – ${endTime}`);
    } else {
      onApply(`${startTime} – ${endTime}`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-navy-950 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">
                Select Broadcast Time Slot
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

        {/* Tab switch: Standard (30-min Intervals) vs Custom */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3">
          <button
            type="button"
            onClick={() => setMode('standard')}
            className={cn(
              "px-4 py-2 text-xs font-bold border-b-2 transition-colors",
              mode === 'standard'
                ? "border-emerald-600 text-emerald-700 bg-white rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            30-Min Interval Selector
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={cn(
              "px-4 py-2 text-xs font-bold border-b-2 transition-colors",
              mode === 'custom'
                ? "border-emerald-600 text-emerald-700 bg-white rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            Custom Text Entry
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {mode === 'standard' ? (
            <>
              {/* Start and End Selectors */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Start Time
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {TIME_SLOT_OPTIONS.map((t) => (
                      <option key={`start-${t}`} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    End Time
                  </label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {TIME_SLOT_OPTIONS.map((t) => (
                      <option key={`end-${t}`} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Formatted Preview Box */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Formatted Time Slot
                  </span>
                  <div className="text-sm font-black font-mono text-emerald-950 mt-0.5">
                    {startTime} – {endTime}
                  </div>
                </div>
                {isOvernight && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[10px] font-bold border border-amber-300">
                    <Moon className="w-3 h-3 text-amber-700" />
                    <span>Overnight (+1 Day)</span>
                  </span>
                )}
              </div>

              {/* Broadcast Presets */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Quick Broadcast Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => {
                    const isSelected = startTime === p.start && endTime === p.end;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handleSelectPreset(p.start, p.end)}
                        className={cn(
                          "text-left p-2 rounded-lg border text-xs transition-all",
                          isSelected
                            ? "bg-navy-950 text-white border-navy-900 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        )}
                      >
                        <div className="font-bold text-[11px] leading-tight">{p.label}</div>
                        <div className={cn("text-[10px] font-mono mt-0.5", isSelected ? "text-emerald-300" : "text-slate-500")}>
                          {p.start} – {p.end}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Custom Time Slot Format
              </label>
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="e.g. 08:15 PM – 08:45 PM or Live Broadcast"
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Enter any specific broadcast schedule string or non-standard slot range.
              </p>
            </div>
          )}
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
            onClick={handleSave}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Time Slot</span>
          </button>
        </div>
      </div>
    </div>
  );
}

