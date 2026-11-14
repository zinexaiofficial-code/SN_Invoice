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
    bodySizePt: 10.5,
    descriptionSizePt: 9,
    footerSizePt: 9,
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

/**
 * Intelligently computes font sizes and density based on invoice content,
 * defaulting to FIT ON ONE PAGE unless multi-page mode is requested.
 */
export function computeSmartAutoFit(
  items: InvoiceItem[] = [],
  hasVat: boolean = false,
  hasSpecialNotes: boolean = false,
  pageFitMode: PageFitMode = "single_page"
): PdfTypographySettings {
  const itemCount = items.length;
  
  // Calculate description verbosity
  const totalDescLength = items.reduce((acc, it) => acc + (it.description?.length || 0), 0);
  const avgDescLength = itemCount > 0 ? totalDescLength / itemCount : 0;
  const hasLongDescriptions = avgDescLength > 60 || totalDescLength > 200;

  let selectedDensity: LayoutDensity = "balanced";

  if (itemCount <= 3 && !hasLongDescriptions) {
    selectedDensity = "comfortable";
  } else if (itemCount <= 5 && !hasLongDescriptions) {
    selectedDensity = "balanced";
  } else {
    selectedDensity = "compact";
  }

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
 * Supports Master Font Scale: changing masterScale proportionally scales all elements!
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
    base = computeSmartAutoFit(items, hasVat, hasSpecialNotes, pageFitMode);
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

/**
 * Paginates invoice line items.
 * By default (single_page mode), invoices with up to 8-10 items stay on ONE SINGLE PAGE
 * by auto-scaling fonts and padding.
 * Only if user explicitly requests multi_page or if item count is massive (>10 items) does it split.
 */
export function paginateInvoiceItems(
  items: InvoiceItem[],
  density: LayoutDensity = "balanced",
  pageFitMode: PageFitMode = "single_page"
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

  // If SINGLE PAGE MODE is active: FIT ON ONE SINGLE PAGE
  if (pageFitMode === "single_page" || items.length <= 1) {
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

  // Multi-page mode requested by user
  const getItemWeight = (it: InvoiceItem) => {
    let weight = 1.0;
    if (it.description && it.description.length > 50) {
      weight += Math.min(2.0, Math.ceil(it.description.length / 50) * 0.5);
    }
    if (it.mediaChannel || it.referenceNumber) {
      weight += 0.4;
    }
    return weight;
  };

  // In multi-page mode, allow clean split across 2+ pages
  const page1Capacity = density === "comfortable" ? 3.5 : density === "balanced" ? 4.5 : 5.5;
  const contMidCapacity = density === "comfortable" ? 8.0 : density === "balanced" ? 10.0 : 12.0;
  const contEndCapacity = density === "comfortable" ? 5.0 : density === "balanced" ? 6.5 : 8.0;

  const pages: { items: InvoiceItem[]; startIndex: number }[] = [];
  let remaining = [...items];
  let currentIndex = 0;

  let currentBatch: InvoiceItem[] = [];
  let currentWeight = 0;

  while (remaining.length > 0) {
    const nextItem = remaining[0];
    const weight = getItemWeight(nextItem);

    if (pages.length === 0) {
      // Page 1
      if (currentWeight + weight <= page1Capacity || currentBatch.length === 0) {
        currentBatch.push(remaining.shift()!);
        currentWeight += weight;
      } else {
        pages.push({ items: currentBatch, startIndex: currentIndex });
        currentIndex += currentBatch.length;
        currentBatch = [];
        currentWeight = 0;
      }
    } else {
      // Continuation pages
      const restWeight = remaining.reduce((acc, it) => acc + getItemWeight(it), 0);
      const limit = restWeight <= contEndCapacity ? contEndCapacity : contMidCapacity;

      if (currentWeight + weight <= limit || currentBatch.length === 0) {
        currentBatch.push(remaining.shift()!);
        currentWeight += weight;
      } else {
        pages.push({ items: currentBatch, startIndex: currentIndex });
        currentIndex += currentBatch.length;
        currentBatch = [];
        currentWeight = 0;
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
