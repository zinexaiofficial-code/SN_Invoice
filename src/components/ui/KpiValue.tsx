import React from "react";
import { formatKpiCurrency } from "@/lib/utils";

interface KpiCurrencyValueProps {
  amount: number | string | null | undefined;
  className?: string;
  colorClass?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Bulletproof Currency Value Renderer for KPI summary cards.
 * Automatically adapts font size based on numeric length so numbers
 * never cross the box boundary or get clipped by ellipsis.
 */
export function KpiCurrencyValue({
  amount,
  className = "",
  colorClass = "text-navy-950",
  size = "md",
}: KpiCurrencyValueProps) {
  const { prefix, whole, decimal, full } = formatKpiCurrency(amount);

  // Adapt font sizes dynamically based on number length
  const numLength = whole.length;
  const isHuge = numLength >= 10; // 1,000,000,000+
  const isLarge = numLength >= 8; // 10,000,000+
  const isMedium = numLength >= 6; // 100,000+

  let wholeSize = "text-lg xl:text-xl";
  if (size === "lg") {
    if (isHuge) wholeSize = "text-base sm:text-lg xl:text-xl";
    else if (isLarge) wholeSize = "text-lg sm:text-xl xl:text-2xl";
    else if (isMedium) wholeSize = "text-xl sm:text-2xl xl:text-3xl";
    else wholeSize = "text-2xl sm:text-3xl xl:text-4xl";
  } else {
    if (isHuge) wholeSize = "text-sm sm:text-base xl:text-lg";
    else if (isLarge) wholeSize = "text-base sm:text-lg xl:text-xl";
    else if (isMedium) wholeSize = "text-lg sm:text-xl xl:text-2xl";
    else wholeSize = "text-xl sm:text-2xl xl:text-2xl";
  }

  return (
    <div
      title={full}
      className={`inline-flex items-baseline flex-wrap font-mono tracking-tight select-all leading-tight max-w-full ${className}`}
    >
      <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0 select-none">
        {prefix}
      </span>
      <span className={`${wholeSize} font-black ${colorClass} shrink-0`}>
        {whole}
      </span>
      <span className="text-[11px] font-medium text-slate-400 shrink-0 select-none">
        {decimal}
      </span>
    </div>
  );
}
