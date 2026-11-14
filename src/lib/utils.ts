import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in LKR (Sri Lankan Rupees)
 * Example: 125000 -> Rs. 125,000.00
 */
export function formatLKR(amount: number | string | null | undefined): string {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(numeric)) return 'Rs. 0.00';
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(numeric)
    .replace('LKR', 'Rs.')
    .trim();
}

/**
 * Format date in DD/MM/YYYY
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Format service period date range.
 * Example: ("2026-11-01", "2026-11-30") -> "01 November 2026 – 30 November 2026"
 */
export function formatServicePeriod(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return '';
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return `${startDate} – ${endDate}`;

    const formatDateLong = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    };

    return `${formatDateLong(s)} – ${formatDateLong(e)}`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
}

/**
 * Format datetime in DD/MM/YYYY, HH:mm
 */
export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Convert number to words in Sri Lankan Rupees
 */
export function numberToWordsLKR(amount: number): string {
  if (!amount || isNaN(amount)) return 'Zero Rupees Only';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let result = '';
    if (n >= 100) {
      result += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result.trim();
    }
    if (n > 0) {
      result += units[n] + ' ';
    }
    return result.trim();
  }

  const integerPart = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - integerPart) * 100);

  if (integerPart === 0 && cents === 0) return 'Zero Rupees Only';

  let words = '';
  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (millions > 0) {
    words += convertGroup(millions) + ' Million ';
  }
  if (thousands > 0) {
    words += convertGroup(thousands) + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertGroup(remainder) + ' ';
  }

  words = words.trim() + ' Rupees';

  if (cents > 0) {
    words += ' and ' + convertGroup(cents) + ' Cents';
  }

  return words + ' Only';
}

/**
 * Format timestamp in Asia/Colombo timezone.
 * Returns dateStr: "14 November 2026", timeStr: "10:30 AM (Asia/Colombo)", fullStr: "14 November 2026 at 10:30 AM (Asia/Colombo)"
 */
export function formatColomboDateTime(dateInput: string | Date | null | undefined) {
  if (!dateInput) {
    return {
      dateStr: "-",
      timeStr: "- (Asia/Colombo)",
      fullStr: "-",
    };
  }
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      return {
        dateStr: String(dateInput),
        timeStr: "- (Asia/Colombo)",
        fullStr: String(dateInput),
      };
    }

    const dateStr = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Colombo",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);

    const timeRaw = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Colombo",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);

    const timeStr = `${timeRaw} (Asia/Colombo)`;
    const fullStr = `${dateStr} at ${timeStr}`;

    return { dateStr, timeStr, fullStr };
  } catch {
    return {
      dateStr: String(dateInput),
      timeStr: "- (Asia/Colombo)",
      fullStr: String(dateInput),
    };
  }
}

/**
 * Format datetime in standard Adobe Acrobat PDF digital signature format:
 * Example: "2026.11.14 10:30:15 +05'30'" (Asia/Colombo timezone)
 */
export function formatAdobeSignatureDate(dateInput: string | Date | null | undefined): string {
  const d = dateInput
    ? typeof dateInput === "string"
      ? new Date(dateInput)
      : dateInput
    : new Date();

  if (isNaN(d.getTime())) return "2026.11.14 10:30:00 +05'30'";

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
    return `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}:${get("second")} +05'30'`;
  } catch {
    return "2026.11.14 10:30:00 +05'30'";
  }
}



