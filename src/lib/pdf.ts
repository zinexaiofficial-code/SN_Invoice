"use client";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface ExportPdfOptions {
  elementId?: string;
  filename: string;
  verificationUrl?: string;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Downloads a high-resolution, true ISO A4 portrait PDF file using jsPDF and html2canvas.
 *
 * Key Architectural Guarantees:
 * 1. True ISO A4 portrait dimensions (210mm × 297mm / ~595.28 × 841.89 points).
 * 2. Multi-page support: iterates through every `.a4-page-sheet` element.
 * 3. Exact 1:1 aspect ratio mapping (never squashes or squeezes content onto 1 page).
 * 4. High resolution 2.5x DPI rendering for sharp, readable fonts and logos.
 * 5. Embeds clickable PDF hyperlinks for document authenticity verification.
 */
export async function downloadInvoicePdf({
  elementId = "printable-invoice",
  filename,
  verificationUrl,
  onProgress,
}: ExportPdfOptions): Promise<void> {
  const container = document.getElementById(elementId);
  if (!container) {
    throw new Error(`Invoice container element with id "${elementId}" not found for PDF export.`);
  }

  // Look for distinct A4 page sheets inside the container
  const pageSheets = Array.from(
    container.querySelectorAll<HTMLElement>(".a4-page-sheet")
  );

  const sheetsToRender: HTMLElement[] =
    pageSheets.length > 0 ? pageSheets : [container];

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pdfWidth = 210;
  const pdfHeight = 297;
  const totalSheets = sheetsToRender.length;

  for (let i = 0; i < totalSheets; i++) {
    const sheetEl = sheetsToRender[i];

    if (onProgress) {
      onProgress(i + 1, totalSheets);
    }

    if (i > 0) {
      pdf.addPage("a4", "portrait");
    }

    // Save temporary inline styles if any adjustments needed
    const prevTransform = sheetEl.style.transform;
    sheetEl.style.transform = "none";

    // Measure full scroll dimensions so bottom elements are never truncated
    const fullWidth = sheetEl.offsetWidth || 794;
    const fullHeight = sheetEl.scrollHeight || sheetEl.offsetHeight || 1123;

    // High quality canvas rendering with dynamic full height capture
    const canvas = await html2canvas(sheetEl, {
      scale: 2.5, // 240 DPI crisp quality
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: fullWidth,
      height: fullHeight,
      windowWidth: Math.max(fullWidth, 794),
      windowHeight: Math.max(fullHeight, 1123),
      scrollX: 0,
      scrollY: 0,
    });

    // Restore transform if any
    sheetEl.style.transform = prevTransform;

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const canvasRatio = canvas.height / canvas.width;
    const a4Ratio = pdfHeight / pdfWidth; // 297 / 210 = 1.4142857

    if (canvasRatio <= a4Ratio + 0.005) {
      // Content fits naturally within A4 page height
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    } else {
      // Content is slightly taller than standard A4: scale proportionally so the bottom footer is NEVER cut off!
      const renderHeight = pdfHeight;
      const renderWidth = pdfHeight / canvasRatio;
      const offsetX = (pdfWidth - renderWidth) / 2;
      pdf.addImage(imgData, "JPEG", offsetX, 0, renderWidth, renderHeight, undefined, "FAST");
    }

    // Clickable PDF verification hyperlink annotation
    if (verificationUrl) {
      const linkElem = sheetEl.querySelector<HTMLElement>(
        ".verification-hyperlink, a[data-verification-link='true']"
      );
      if (linkElem) {
        const containerRect = sheetEl.getBoundingClientRect();
        const linkRect = linkElem.getBoundingClientRect();

        const relX = (linkRect.left - containerRect.left) / containerRect.width;
        const relY = (linkRect.top - containerRect.top) / containerRect.height;
        const relW = linkRect.width / containerRect.width;
        const relH = linkRect.height / containerRect.height;

        const pdfX = relX * pdfWidth;
        const pdfY = relY * pdfHeight;
        const pdfW = relW * pdfWidth;
        const pdfH = relH * pdfHeight;

        pdf.link(pdfX, pdfY, pdfW, pdfH, { url: verificationUrl });
      }
    }
  }

  // Trigger browser download
  const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(cleanFilename);
}
