import * as XLSX from 'xlsx';
import { MediaSchedule, MediaScheduleItem, MediaType } from '@/types';

export interface ParsedExcelSchedule {
  rawAgencyText: string;
  matchedEntityId?: string;
  matchedEntityName?: string;
  rawClientText: string;
  matchedClientId?: string;
  matchedClientName?: string;
  channelName: string;
  mediaType: MediaType;
  campaignName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dates: string[]; // List of YYYY-MM-DD in column order
  dayLetters: string[]; // M, T, W, etc.
  items: Array<{
    programmeName: string;
    timeSlot: string;
    duration: string;
    adType: string;
    ratePerSpot: number;
    totalSpots: number;
    totalAmount: number;
    allocations: Record<string, number>; // YYYY-MM-DD -> spots
  }>;
  totalSpots: number;
  pricingMode: 'package' | 'spot_rate' | 'not_set';
  packageAmount: number;
  taxApplicable: boolean;
  taxRate: number;
  specialNotes: string;
}

export function parseExcelScheduleBuffer(
  buffer: Buffer | ArrayBuffer,
  knownEntities: Array<{ id: string; name: string; invoicePrefix?: string }> = [],
  knownClients: Array<{ id: string; companyName: string }> = []
): ParsedExcelSchedule {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let agencyRaw = '';
  let clientRaw = '';
  let channelRaw = '';
  let investmentRaw = '';
  let baseYear = 2026;
  let baseMonth = 10; // Default Oct (1-indexed)

  // Scan header rows 0-10
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i] || [];
    const text = r.join(' ');

    // 1. Agency detection
    if (!agencyRaw && /sn advertising|the loop|loop co|haripara|loudspeakers/i.test(text)) {
      const cell = r.find(c => /sn advertising|the loop|loop co|haripara|loudspeakers/i.test(String(c)));
      agencyRaw = cell ? String(cell).trim() : text.trim();
    }

    // 2. Client detection
    if (!clientRaw && /clint|client/i.test(text)) {
      const match = text.match(/(?:clint|client)\s*[-:]*\s*([^\n\r]+)/i);
      if (match) clientRaw = match[1].trim();
    }

    // 3. Channel detection
    if (!channelRaw && /chanal|channal|channel/i.test(text)) {
      const match = text.match(/(?:chanal|channal|channel)\s*[-:]*\s*([^\n\r]+)/i);
      if (match) channelRaw = match[1].trim();
    }

    // 4. Date header detection (e.g. serial date 46301 or "2026 OCT" or "OCT - NOV 2026")
    for (const cell of r) {
      if (typeof cell === 'number' && cell > 44000 && cell < 55000) {
        // Excel serial date to JS Date
        const jsDate = new Date(Math.round((cell - 25569) * 86400 * 1000));
        baseYear = jsDate.getUTCFullYear();
        baseMonth = jsDate.getUTCMonth() + 1;
      } else if (typeof cell === 'string') {
        const ymMatch = cell.match(/(202\d)\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
        if (ymMatch) {
          baseYear = parseInt(ymMatch[1], 10);
          const monthMap: Record<string, number> = {
            jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
            jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
          };
          baseMonth = monthMap[ymMatch[2].toLowerCase()] || 10;
        }
      }
    }
  }

  // Find Special Investment / Lump Sum
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || [];
    const text = r.join(' ');
    if (/invest|invesment|package/i.test(text)) {
      for (const cell of r) {
        const str = String(cell);
        if (typeof cell === 'number' && cell > 1000) {
          investmentRaw = str;
        } else if (/[0-9]+,[0-9]+|\d{4,}/.test(str)) {
          investmentRaw = str;
        }
      }
    }
  }

  // Locate the programmes grid header row
  let headerRowIdx = -1;
  for (let i = 0; i < 15; i++) {
    const r = rows[i] || [];
    if (r.some(c => /programme/i.test(String(c)))) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    headerRowIdx = 8; // fallback
  }

  // Weekday letters (Row headerRowIdx or headerRowIdx - 1)
  const weekdayRow = rows[headerRowIdx] || [];
  const dayNumberRow = rows[headerRowIdx + 1] || [];

  // Parse columns that represent days (1 to 31)
  interface DayCol {
    colIdx: number;
    day: number;
    weekday: string;
    dateStr: string;
  }
  const dayCols: DayCol[] = [];

  let currentYear = baseYear;
  let currentMonth = baseMonth;
  let lastDay = -1;

  dayNumberRow.forEach((val, colIdx) => {
    if (typeof val === 'number' && val >= 1 && val <= 31) {
      if (lastDay > 15 && val < 15) {
        // Month boundary crossed! (e.g. 31 to 1)
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
      lastDay = val;

      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(val).padStart(2, '0')}`;
      const weekday = String(weekdayRow[colIdx] || '').trim().toUpperCase();

      dayCols.push({
        colIdx,
        day: val,
        weekday: weekday || ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(dateStr).getDay()],
        dateStr,
      });
    }
  });

  // Extract Programme Rows
  const items: ParsedExcelSchedule['items'] = [];
  for (let i = headerRowIdx + 2; i < rows.length; i++) {
    const r = rows[i] || [];
    const rowText = r.join(' ');
    if (/total ad|total number/i.test(rowText)) break;

    const progName = r[1];
    if (progName && typeof progName === 'string' && progName.trim().length > 1 && !/total/i.test(progName)) {
      const timeSlot = String(r[2] || '').trim();
      const duration = String(r[3] || '').trim();

      // Guess ad type from name or duration
      let adType = 'Commercial Spot';
      if (/endors/i.test(progName) || /endos/i.test(progName)) adType = 'DJ Endorsement';
      else if (/trailer/i.test(progName)) adType = 'Trailer';
      else if (/open/i.test(progName)) adType = 'Opening Caption';
      else if (/clos/i.test(progName)) adType = 'Closing Caption';

      const allocations: Record<string, number> = {};
      let totalSpots = 0;

      dayCols.forEach(col => {
        const count = Number(r[col.colIdx]) || 0;
        if (count > 0) {
          allocations[col.dateStr] = count;
          totalSpots += count;
        }
      });

      items.push({
        programmeName: progName.trim(),
        timeSlot,
        duration,
        adType,
        ratePerSpot: 0,
        totalSpots,
        totalAmount: 0,
        allocations,
      });
    }
  }

  const grandSpots = items.reduce((acc, it) => acc + it.totalSpots, 0);

  // Parse Investment amount
  let packageAmount = 0;
  let taxApplicable = false;
  if (investmentRaw) {
    if (/\+|tax|vat/i.test(investmentRaw)) {
      taxApplicable = true;
    }
    const numClean = investmentRaw.replace(/[^0-9.]/g, '');
    const parsedNum = parseFloat(numClean);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      packageAmount = parsedNum;
    }
  }

  // Match Entity
  let matchedEntityId: string | undefined;
  let matchedEntityName: string | undefined;
  if (agencyRaw) {
    const low = agencyRaw.toLowerCase();
    const matched = knownEntities.find(e =>
      low.includes(e.name.toLowerCase()) ||
      (e.invoicePrefix && low.includes(e.invoicePrefix.toLowerCase())) ||
      (low.includes('sn') && e.name.toLowerCase().includes('sn advertising')) ||
      (low.includes('haripara') && e.name.toLowerCase().includes('haripara')) ||
      (low.includes('loop') && (e.name.toLowerCase().includes('loop') || e.invoicePrefix === 'TL'))
    );
    if (matched) {
      matchedEntityId = matched.id;
      matchedEntityName = matched.name;
    }
  }

  // Match Client
  let matchedClientId: string | undefined;
  let matchedClientName: string | undefined;
  if (clientRaw) {
    const low = clientRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matched = knownClients.find(c => {
      const cLow = c.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cLow.includes(low) || low.includes(cLow) || (low.includes('ayathi') && cLow.includes('ayathi'));
    });
    if (matched) {
      matchedClientId = matched.id;
      matchedClientName = matched.companyName;
    }
  }

  // Channel & Media Type
  let channelName = channelRaw || 'Television Broadcast';
  let mediaType: MediaType = 'tv';
  if (/fm|radio/i.test(channelName)) {
    mediaType = 'radio';
  } else if (/tv|rupavahini|siyatha|jaya/i.test(channelName)) {
    mediaType = 'tv';
  }

  const startDate = dayCols.length > 0 ? dayCols[0].dateStr : `${baseYear}-${String(baseMonth).padStart(2, '0')}-01`;
  const endDate = dayCols.length > 0 ? dayCols[dayCols.length - 1].dateStr : `${baseYear}-${String(baseMonth).padStart(2, '0')}-28`;

  const campaignName = `${matchedClientName || clientRaw || 'Brand'} - ${channelName} Broadcast Campaign`;

  return {
    rawAgencyText: agencyRaw,
    matchedEntityId,
    matchedEntityName,
    rawClientText: clientRaw,
    matchedClientId,
    matchedClientName,
    channelName,
    mediaType,
    campaignName,
    startDate,
    endDate,
    dates: dayCols.map(d => d.dateStr),
    dayLetters: dayCols.map(d => d.weekday),
    items,
    totalSpots: grandSpots,
    pricingMode: packageAmount > 0 ? 'package' : 'not_set',
    packageAmount,
    taxApplicable,
    taxRate: taxApplicable ? 18 : 0,
    specialNotes: investmentRaw ? `Special Investment: Rs. ${packageAmount.toLocaleString('en-US')} ${taxApplicable ? '+ TAX' : ''}` : '',
  };
}
