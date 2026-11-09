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

