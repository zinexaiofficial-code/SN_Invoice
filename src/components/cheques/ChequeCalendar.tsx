"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2
} from "lucide-react";
import { Cheque } from "@/types";

interface ChequeCalendarProps {
  cheques: Cheque[];
  onSelectCheque: (cheque: Cheque) => void;
}

export function ChequeCalendar({ cheques, onSelectCheque }: ChequeCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0, Sunday is 6 (or standard Sunday 0)
  const startingDayIndex = firstDayOfMonth; // Sunday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const todayStr = new Date().toISOString().split("T")[0];

  // Map cheques to date strings
  const chequesByDate = new Map<string, Cheque[]>();
  cheques.forEach((c) => {
    // If returned and has follow up date, use follow-up date; otherwise expectedActionDate or chequeDate
    const targetDate = c.status === "returned" && c.followUpDate
      ? c.followUpDate
      : (c.expectedActionDate || c.chequeDate);

    if (targetDate) {
      const list = chequesByDate.get(targetDate) || [];
      list.push(c);
      chequesByDate.set(targetDate, list);
    }
  });

  // Calculate monthly stats
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const thisMonthCheques = cheques.filter((c) => {
    const d = c.expectedActionDate || c.chequeDate;
    return d && d.startsWith(currentMonthPrefix);
  });

  const incomingTotal = thisMonthCheques
    .filter((c) => c.type === "incoming")
    .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  const outgoingTotal = thisMonthCheques
    .filter((c) => c.type === "outgoing")
    .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  // Generate calendar day cells
  const calendarCells = [];

  // Previous month trailing days
  for (let i = startingDayIndex - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    calendarCells.push({
      day: d,
      isCurrentMonth: false,
      dateStr: "",
      cheques: []
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      dateStr,
      cheques: chequesByDate.get(dateStr) || []
    });
  }

  // Next month leading days to complete full 35 or 42 grid
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: false,
      dateStr: "",
      cheques: []
    });
  }

  const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Calendar Navigation Header */}
      <div className="p-4 sm:p-5 bg-navy-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-900">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">
              {monthNames[month]} {year}
            </h3>
            <p className="text-xs text-slate-300">
              Cheque Deposit & Presentation Schedule
            </p>
          </div>
        </div>

        {/* Month Summary Pills & Navigation */}
        <div className="flex items-center space-x-2">
          <div className="hidden md:flex items-center space-x-3 mr-3 text-xs">
            <span className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-2.5 py-1 rounded-lg font-mono">
              📥 In: Rs. {incomingTotal.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </span>
            <span className="bg-navy-900 border border-navy-800 text-slate-300 px-2.5 py-1 rounded-lg font-mono">
              📤 Out: Rs. {outgoingTotal.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </span>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-navy-900 hover:bg-navy-800 border border-navy-800 rounded-lg text-xs font-semibold text-slate-200 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center bg-navy-900 border border-navy-800 rounded-lg p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-navy-800 text-slate-300 hover:text-white rounded-md transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-navy-800 text-slate-300 hover:text-white rounded-md transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-xs font-bold text-slate-600">
        {weekDayLabels.map((w, idx) => (
          <div key={w} className={idx === 0 || idx === 6 ? "text-slate-400" : ""}>
            {w}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-50/50">
        {calendarCells.map((cell, idx) => {
          const isToday = cell.dateStr === todayStr;

          return (
            <div
              key={idx}
              className={`min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 transition-colors flex flex-col justify-between ${
                !cell.isCurrentMonth
                  ? "bg-slate-100/50 text-slate-300 pointer-events-none"
                  : "bg-white hover:bg-slate-50/80"
              } ${isToday ? "bg-emerald-50/30 ring-1 ring-inset ring-emerald-500" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday
                      ? "bg-emerald-600 text-white font-extrabold shadow-sm"
                      : cell.isCurrentMonth
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {cell.day}
                </span>

                {cell.cheques.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">
                    {cell.cheques.length} chq
                  </span>
                )}
              </div>

              {/* Cheque badges for this day */}
              <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-24">
                {cell.cheques.map((chq) => {
                  const isIncoming = chq.type === "incoming";
                  const isReturned = chq.status === "returned";
                  const isCleared = chq.status === "cleared";
                  const isOverdue =
                    !isCleared && chq.expectedActionDate && chq.expectedActionDate < todayStr;

                  return (
                    <button
                      key={chq.id}
                      onClick={() => onSelectCheque(chq)}
                      className={`w-full text-left px-1.5 py-1 rounded-md text-[10px] font-semibold transition-all border block shadow-2xs truncate ${
                        isReturned
                          ? "bg-rose-100 border-rose-300 text-rose-900"
                          : isCleared
                          ? "bg-slate-100 border-slate-200 text-slate-600 line-through opacity-80"
                          : isOverdue
                          ? "bg-amber-100 border-amber-300 text-amber-950 font-bold"
                          : isIncoming
                          ? "bg-emerald-50 border-emerald-200 text-emerald-950 hover:bg-emerald-100"
                          : "bg-blue-50 border-blue-200 text-blue-950 hover:bg-blue-100"
                      }`}
                      title={`#${chq.chequeNumber} - Rs. ${Number(chq.amount).toLocaleString()} (${chq.payerOrPayeeName})`}
                    >
                      <div className="flex items-center space-x-1">
                        {isReturned ? (
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                        ) : isIncoming ? (
                          <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                        )}
                        <span className="font-mono">#{chq.chequeNumber}</span>
                        <span className="font-normal opacity-90 truncate">
                          Rs. {Math.round(chq.amount / 1000)}k
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center space-x-4 flex-wrap">
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            <span>Incoming Deposit</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" />
            <span>Outgoing Presentation</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
            <span>Overdue</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block" />
            <span>Returned (Action Req.)</span>
          </span>
        </div>

        <span className="text-[11px] text-slate-400">Click any cheque to view details & update status</span>
      </div>
    </div>
  );
}
