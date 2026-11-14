import { InvoiceItem, LayoutDensity, PageFitMode, PdfTypographySettings } from "@/types";

export const RECOMMENDED_TYPOGRAPHY: Record<LayoutDensity, PdfTypographySettings> = {
  comfortable: {
    pageFitMode: "single_page",
    masterScale: 1.0,
    mode: "smart",
    density: "comfortable",
    titleSizePt: 19,
    headerSizePt: 13,
    sectionHeadingPt: 10.5,
    tableHeaderPt: 9.5,
    bodySizePt: 10,
    descriptionSizePt: 8.5,
    footerSizePt: 8.5,
    showPageNumbers: true,
    blocksConfig: {
      showBankDetails: true,
      showSpecialNotes: true,
      showAmountInWords: true,
      showDueDates: true,
      showSignatureBlock: true,
      customNoteText: "",
    },
  },
  balanced: {
    pageFitMode: "single_page",
    masterScale: 1.0,
    mode: "smart",
    density: "balanced",
    titleSizePt: 17,
    headerSizePt: 12.5,
    sectionHeadingPt: 10,
    tableHeaderPt: 9,
    bodySizePt: 9.5,
    descriptionSizePt: 8.5,
    footerSizePt: 8.5,
    showPageNumbers: true,
    blocksConfig: {
      showBankDetails: true,
      showSpecialNotes: true,
      showAmountInWords: true,
      showDueDates: true,
      showSignatureBlock: true,
      customNoteText: "",
    },
  },
  compact: {
    pageFitMode: "single_page",
    masterScale: 0.95,
    mode: "smart",
    density: "compact",
    titleSizePt: 15,
    headerSizePt: 11.5,
    sectionHeadingPt: 9.5,
    tableHeaderPt: 8.5,
    bodySizePt: 9,
    descriptionSizePt: 8,
    footerSizePt: 8,
    showPageNumbers: true,
    blocksConfig: {
      showBankDetails: true,
      showSpecialNotes: true,
      showAmountInWords: true,
      showDueDates: true,
      showSignatureBlock: true,
      customNoteText: "",
    },
  },
};

export const DEFAULT_TYPOGRAPHY: PdfTypographySettings = RECOMMENDED_TYPOGRAPHY.balanced;

export interface InvoiceHeightEstimate {
  headerHeightMm: number;
  tableHeaderHeightMm: number;
  itemsHeightMm: number[];
  totalItemsHeightMm: number;
  totalsHeightMm: number;
  footerHeightMm: number;
  bottomTaglineHeightMm: number;
  totalFirstPageMm: number;
  fitsOnSinglePage: boolean;
  recommendedDensity: LayoutDensity;
}

/**
 * Accurately estimates component heights in millimetres to guarantee that
 * content never overflows the physical A4 printable boundary (273mm usable height).
 */
export function estimateInvoiceHeights(
  items: InvoiceItem[] = [],
  hasVat: boolean = false,
  hasSpecialNotes: boolean = false,
  density: LayoutDensity = "balanced",
  blocksConfig?: any
): InvoiceHeightEstimate {
  // Page 1 Header: Company Logo, Name, Address, Tax Info, Invoice Title, Bill To Client, Dates
  const headerHeightMm = 50;

  // Table header row
  const tableHeaderHeightMm = 8;

  // Row heights based on density and description length
  const rowBaseHeight = density === "comfortable" ? 11 : density === "balanced" ? 9.5 : 8.5;
  const itemHeights = items.map((it) => {
    let h = rowBaseHeight;
    const desc = it.description?.trim();
    if (desc && desc.toLowerCase() !== it.serviceName.trim().toLowerCase()) {
      // Each ~45 characters wrapped adds ~4mm of height
      const lines = Math.ceil(desc.length / 45);
      h += Math.min(24, lines * 4.0);
    }
    if (it.referenceNumber) {
      h += 3.5;
    }
    return h;
  });

  const totalItemsHeightMm = itemHeights.reduce((a, b) => a + b, 0);

  // Financial Totals Summary (Subtotal, VAT, Grand Total, Words, Notes)
  let totalsHeightMm = hasVat ? 34 : 28;
  if (hasSpecialNotes) totalsHeightMm += 8;
  if (blocksConfig?.customNoteText) totalsHeightMm += 8;

  // Footer: Payment instructions + Digital Signature Block
  const showBank = blocksConfig?.showBankDetails !== false;
  const showSig = blocksConfig?.showSignatureBlock !== false;
  const footerHeightMm = showBank || showSig ? 44 : 0;

  // Bottom Tagline & Page Numbering
  const bottomTaglineHeightMm = 10;

  // Usable height inside A4 sheet: 297mm - 10mm top margin - 14mm bottom margin = 273mm
  const totalFirstPageMm =
    headerHeightMm +
    tableHeaderHeightMm +
    totalItemsHeightMm +
    totalsHeightMm +
    footerHeightMm +
    bottomTaglineHeightMm;

  // A 5mm safety buffer ensures no subpixel rounding ever pushes text into the bottom margin
  const fitsOnSinglePage = totalFirstPageMm <= 268;

  let recommendedDensity: LayoutDensity = "balanced";
  if (totalItemsHeightMm <= 55) {
    recommendedDensity = "comfortable";
  } else if (totalItemsHeightMm <= 95) {
    recommendedDensity = "balanced";
  } else {
    recommendedDensity = "compact";
  }

  return {
    headerHeightMm,
    tableHeaderHeightMm,
    itemsHeightMm: itemHeights,
    totalItemsHeightMm,
    totalsHeightMm,
    footerHeightMm,
    bottomTaglineHeightMm,
    totalFirstPageMm,
    fitsOnSinglePage,
    recommendedDensity,
  };
}

/**
 * Intelligently computes font sizes and density based on invoice content.
 */
export function computeSmartAutoFit(
  items: InvoiceItem[] = [],
  hasVat: boolean = false,
  hasSpecialNotes: boolean = false,
  pageFitMode: PageFitMode = "single_page",
  blocksConfig?: any
): PdfTypographySettings {
  const estimate = estimateInvoiceHeights(items, hasVat, hasSpecialNotes, "balanced", blocksConfig);
  const selectedDensity = estimate.recommendedDensity;
  const base = RECOMMENDED_TYPOGRAPHY[selectedDensity];

  return {
    ...base,
    pageFitMode,
    mode: "smart",
    density: selectedDensity,
  };
}

/**
 * Resolves final active typography settings, merging user overrides with defaults.
 */
export function resolveTypography(
  overrides?: Partial<PdfTypographySettings>,
  items: InvoiceItem[] = [],
  hasVat: boolean = false,
  hasSpecialNotes: boolean = false
): PdfTypographySettings {
  const pageFitMode: PageFitMode = overrides?.pageFitMode || "single_page";
  const masterScale: number = overrides?.masterScale ?? 1.0;

  let base: PdfTypographySettings;

  if (!overrides || overrides.mode === "smart" || !overrides.mode) {
    base = computeSmartAutoFit(items, hasVat, hasSpecialNotes, pageFitMode, overrides?.blocksConfig);
    if (overrides?.density && overrides.density !== base.density) {
      base = { ...RECOMMENDED_TYPOGRAPHY[overrides.density], mode: "smart", density: overrides.density };
    }
  } else {
    // Manual mode
    base = {
      mode: "manual",
      pageFitMode,
      masterScale,
      density: overrides.density || "balanced",
      titleSizePt: clamp(overrides.titleSizePt ?? 17, 13, 22),
      headerSizePt: clamp(overrides.headerSizePt ?? 12.5, 10, 18),
      sectionHeadingPt: clamp(overrides.sectionHeadingPt ?? 10, 9, 13),
      tableHeaderPt: clamp(overrides.tableHeaderPt ?? 9, 8, 12),
      bodySizePt: clamp(overrides.bodySizePt ?? 9.5, 8, 13),
      descriptionSizePt: clamp(overrides.descriptionSizePt ?? 8.5, 7.5, 12),
      footerSizePt: clamp(overrides.footerSizePt ?? 8.5, 7.5, 11),
      showPageNumbers: overrides.showPageNumbers ?? true,
      blocksConfig: overrides.blocksConfig,
    };
  }

  // Apply master scale if different from 1.0
  const scale = clamp(masterScale, 0.75, 1.3);

  return {
    ...base,
    pageFitMode,
    masterScale: scale,
    titleSizePt: Math.round(base.titleSizePt * scale * 10) / 10,
    headerSizePt: Math.round(base.headerSizePt * scale * 10) / 10,
    sectionHeadingPt: Math.round(base.sectionHeadingPt * scale * 10) / 10,
    tableHeaderPt: Math.round(base.tableHeaderPt * scale * 10) / 10,
    bodySizePt: Math.round(base.bodySizePt * scale * 10) / 10,
    descriptionSizePt: Math.round(base.descriptionSizePt * scale * 10) / 10,
    footerSizePt: Math.round(base.footerSizePt * scale * 10) / 10,
    showPageNumbers: overrides?.showPageNumbers ?? base.showPageNumbers,
    blocksConfig: {
      showBankDetails: overrides?.blocksConfig?.showBankDetails ?? true,
      showSpecialNotes: overrides?.blocksConfig?.showSpecialNotes ?? true,
      showAmountInWords: overrides?.blocksConfig?.showAmountInWords ?? true,
      showDueDates: overrides?.blocksConfig?.showDueDates ?? true,
      showSignatureBlock: overrides?.blocksConfig?.showSignatureBlock ?? true,
      customNoteText: overrides?.blocksConfig?.customNoteText ?? "",
    },
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export interface PaginatedPage {
  pageIndex: number; // 0-based
  pageNumber: number; // 1-based
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  items: InvoiceItem[];
  startIndex: number;
}

export interface PaginationOptions {
  hasVat?: boolean;
  hasSpecialNotes?: boolean;
  blocksConfig?: any;
}

/**
 * Paginates invoice line items safely onto true ISO A4 portrait sheets (210 × 297 mm).
 * Guarantees that:
 * 1. Content on any page never exceeds 273mm usable height.
 * 2. If content on Page 1 fits, it stays on 1 Page.
 * 3. If content would exceed Page 1 capacity, it cleanly splits across pages so that
 *    the Payment Instructions, Digital Signature Card, and Footer are NEVER clipped.
 */
export function paginateInvoiceItems(
  items: InvoiceItem[] = [],
  density: LayoutDensity = "balanced",
  pageFitMode: PageFitMode = "single_page",
  options?: PaginationOptions
): PaginatedPage[] {
  if (!items || items.length === 0) {
    return [
      {
        pageIndex: 0,
        pageNumber: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        items: [],
        startIndex: 0,
      },
    ];
  }

  const estimate = estimateInvoiceHeights(
    items,
    options?.hasVat ?? false,
    options?.hasSpecialNotes ?? false,
    density,
    options?.blocksConfig
  );

  // If Single Page mode requested AND it fits within the 268mm safety budget:
  if (pageFitMode === "single_page" && estimate.fitsOnSinglePage) {
    return [
      {
        pageIndex: 0,
        pageNumber: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        items,
        startIndex: 0,
      },
    ];
  }

  // Multi-Page Splitting Logic (or auto-split when single page budget exceeded)
  // Page 1 budget: 273mm usable - 50mm header - 8mm table head - 10mm continuation tagline = 205mm
  const page1MaxItemsHeightMm = 185;
  // Continuation Page budget (with totals & signature): 273mm - 14mm header - 8mm table head - 34mm totals - 44mm footer - 10mm tagline = 163mm
  const lastPageMaxItemsHeightMm = 145;
  // Continuation Page budget (without totals & signature): 273mm - 14mm header - 8mm table head - 10mm tagline = 241mm
  const midPageMaxItemsHeightMm = 220;

  const pages: { items: InvoiceItem[]; startIndex: number }[] = [];
  let remaining = [...items];
  let currentIndex = 0;

  let currentBatch: InvoiceItem[] = [];
  let currentBatchHeight = 0;

  while (remaining.length > 0) {
    const nextItem = remaining[0];
    const itemIndex = items.indexOf(nextItem);
    const itemHeight = estimate.itemsHeightMm[itemIndex] || (density === "comfortable" ? 12 : 10);

    const isFirst = pages.length === 0;

    if (isFirst) {
      // We are packing Page 1
      if (currentBatchHeight + itemHeight <= page1MaxItemsHeightMm || currentBatch.length === 0) {
        currentBatch.push(remaining.shift()!);
        currentBatchHeight += itemHeight;
      } else {
        pages.push({ items: currentBatch, startIndex: currentIndex });
        currentIndex += currentBatch.length;
        currentBatch = [];
        currentBatchHeight = 0;
      }
    } else {
      // Subsequent pages
      // Check if this batch can finish all remaining items and accommodate the footer
      const restHeight = remaining.reduce((acc, it) => {
        const idx = items.indexOf(it);
        return acc + (estimate.itemsHeightMm[idx] || 10);
      }, 0);

      const limit = restHeight <= lastPageMaxItemsHeightMm ? lastPageMaxItemsHeightMm : midPageMaxItemsHeightMm;

      if (currentBatchHeight + itemHeight <= limit || currentBatch.length === 0) {
        currentBatch.push(remaining.shift()!);
        currentBatchHeight += itemHeight;
      } else {
        pages.push({ items: currentBatch, startIndex: currentIndex });
        currentIndex += currentBatch.length;
        currentBatch = [];
        currentBatchHeight = 0;
      }
    }
  }

  if (currentBatch.length > 0) {
    pages.push({ items: currentBatch, startIndex: currentIndex });
  }

  const totalPages = pages.length;

  return pages.map((p, idx) => ({
    pageIndex: idx,
    pageNumber: idx + 1,
    totalPages,
    isFirstPage: idx === 0,
    isLastPage: idx === totalPages - 1,
    items: p.items,
    startIndex: p.startIndex,
  }));
}
