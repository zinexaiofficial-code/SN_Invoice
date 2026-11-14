import { InvoiceItem, LayoutDensity, PdfTypographySettings } from "@/types";

export const RECOMMENDED_TYPOGRAPHY: Record<LayoutDensity, PdfTypographySettings> = {
  comfortable: {
    mode: "smart",
    density: "comfortable",
    titleSizePt: 20,
    headerSizePt: 14,
    sectionHeadingPt: 11,
    tableHeaderPt: 10,
    bodySizePt: 11,
    descriptionSizePt: 9.5,
    footerSizePt: 9.5,
    showPageNumbers: true,
  },
  balanced: {
    mode: "smart",
    density: "balanced",
    titleSizePt: 18,
    headerSizePt: 13,
    sectionHeadingPt: 10.5,
    tableHeaderPt: 9.5,
    bodySizePt: 10,
    descriptionSizePt: 9,
    footerSizePt: 9,
    showPageNumbers: true,
  },
  compact: {
    mode: "smart",
    density: "compact",
    titleSizePt: 16,
    headerSizePt: 12,
    sectionHeadingPt: 10,
    tableHeaderPt: 9,
    bodySizePt: 9.5,
    descriptionSizePt: 8.5,
    footerSizePt: 8.5,
    showPageNumbers: true,
  },
};

export const DEFAULT_TYPOGRAPHY: PdfTypographySettings = RECOMMENDED_TYPOGRAPHY.balanced;

/**
 * Intelligently computes font sizes and density based on invoice content,
 * guaranteeing comfortable readability without shrinking text below safe limits (min 9pt body).
 */
export function computeSmartAutoFit(
  items: InvoiceItem[] = [],
  hasVat: boolean = false,
  hasSpecialNotes: boolean = false
): PdfTypographySettings {
  const itemCount = items.length;
  
  // Calculate description verbosity
  const totalDescLength = items.reduce((acc, it) => acc + (it.description?.length || 0), 0);
  const avgDescLength = itemCount > 0 ? totalDescLength / itemCount : 0;
  const hasLongDescriptions = avgDescLength > 60 || totalDescLength > 200;

  let selectedDensity: LayoutDensity = "balanced";

  if (itemCount <= 4 && !hasLongDescriptions) {
    selectedDensity = "comfortable";
  } else if (itemCount <= 6 && !hasLongDescriptions) {
    selectedDensity = "balanced";
  } else {
    selectedDensity = "compact";
  }

  const base = RECOMMENDED_TYPOGRAPHY[selectedDensity];

  return {
    ...base,
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
  if (!overrides || overrides.mode === "smart" || !overrides.mode) {
    const smart = computeSmartAutoFit(items, hasVat, hasSpecialNotes);
    if (overrides?.density && overrides.density !== smart.density) {
      // User picked a specific density preset
      const preset = RECOMMENDED_TYPOGRAPHY[overrides.density];
      return { ...preset, mode: "smart", density: overrides.density };
    }
    return smart;
  }

  // Manual mode: clamp to safe ranges specified in requirements
  return {
    mode: "manual",
    density: overrides.density || "balanced",
    titleSizePt: clamp(overrides.titleSizePt ?? 18, 14, 22),
    headerSizePt: clamp(overrides.headerSizePt ?? 13, 11, 18),
    sectionHeadingPt: clamp(overrides.sectionHeadingPt ?? 10.5, 10, 12),
    tableHeaderPt: clamp(overrides.tableHeaderPt ?? 9.5, 8, 12),
    bodySizePt: clamp(overrides.bodySizePt ?? 10, 8, 13),
    descriptionSizePt: clamp(overrides.descriptionSizePt ?? 9, 8, 12),
    footerSizePt: clamp(overrides.footerSizePt ?? 9, 8, 11),
    showPageNumbers: overrides.showPageNumbers ?? true,
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
 * Paginates invoice line items onto true A4 pages without shrinking text.
 * - Single-page invoices: Header + Items + Totals/Footer all on Page 1.
 * - Multi-page invoices: Flow across Page 1, Page 2..N with repeated headers.
 */
export function paginateInvoiceItems(
  items: InvoiceItem[],
  density: LayoutDensity = "balanced"
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

  // Calculate approximate weight per item based on description line count and media tags
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

  // Capacity limits by density
  const singlePageCapacity = density === "comfortable" ? 5.5 : density === "balanced" ? 6.5 : 7.5;
  const page1MultiCapacity = density === "comfortable" ? 8.0 : density === "balanced" ? 9.5 : 11.0;
  const contMidCapacity = density === "comfortable" ? 13.0 : density === "balanced" ? 15.0 : 17.0;
  const contEndCapacity = density === "comfortable" ? 7.0 : density === "balanced" ? 8.5 : 10.0;

  const totalWeight = items.reduce((acc, it) => acc + getItemWeight(it), 0);

  // If everything fits on one single page comfortably
  if (totalWeight <= singlePageCapacity) {
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

  // Multi-page distribution
  const pages: { items: InvoiceItem[]; startIndex: number }[] = [];
  let remaining = [...items];
  let currentIndex = 0;

  // Page 1
  let currentBatch: InvoiceItem[] = [];
  let currentWeight = 0;

  while (remaining.length > 0) {
    const nextItem = remaining[0];
    const weight = getItemWeight(nextItem);

    if (pages.length === 0) {
      // We are on Page 1
      if (currentWeight + weight <= page1MultiCapacity || currentBatch.length === 0) {
        currentBatch.push(remaining.shift()!);
        currentWeight += weight;
      } else {
        pages.push({ items: currentBatch, startIndex: currentIndex });
        currentIndex += currentBatch.length;
        currentBatch = [];
        currentWeight = 0;
      }
    } else {
      // We are on continuation pages (Page 2+)
      // Check if the rest can fit on this page as the final page
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
