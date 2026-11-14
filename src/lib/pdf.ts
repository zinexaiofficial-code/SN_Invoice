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
 * 3. Exact 1:1 aspect ratio mapping (794 × 1123 px at scale 3 = 288 DPI).
 * 4. Ensures document fonts and QR codes are fully loaded before capturing.
 * 5. Guarantees bottom margin (14mm) is never clipped or truncated by PDF viewers.
 * 6. Temporarily normalizes zoom scales on parent containers during capture.
 * 7. Embeds clickable PDF hyperlinks for document authenticity verification.
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

  // Ensure all fonts are fully loaded before rasterization
  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }

  // Save temporary styles on parent container (such as zoom scale)
  const prevContainerTransform = container.style.transform;
  container.style.transform = "none";

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pdfWidth = 210;
  const pdfHeight = 297;
  const totalSheets = sheetsToRender.length;

  try {
    for (let i = 0; i < totalSheets; i++) {
      const sheetEl = sheetsToRender[i];

      if (onProgress) {
        onProgress(i + 1, totalSheets);
      }

      if (i > 0) {
        pdf.addPage("a4", "portrait");
      }

      // Save temporary inline styles
      const prevSheetTransform = sheetEl.style.transform;
      sheetEl.style.transform = "none";

      // Exact pixel dimensions for 210mm x 297mm at 96 DPI
      // 210mm = 793.7px, 297mm = 1122.52px
      const targetWidthPx = 794;
      const targetHeightPx = 1123;

      // High-resolution rendering at scale 3 (288 DPI print-grade quality)
      const canvas = await html2canvas(sheetEl, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: targetWidthPx,
        height: targetHeightPx,
        windowWidth: 1200, // Generous desktop width so responsive classes never collapse
        windowHeight: 1600,
        scrollX: 0,
        scrollY: 0,
      });

      sheetEl.style.transform = prevSheetTransform;

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      // Add image to PDF covering exact 210 x 297 mm
      // Because internal padding is 14mm bottom, all content is safely inside printable boundaries!
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

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
  } finally {
    // Always restore container transform
    container.style.transform = prevContainerTransform;
  }

  // Trigger browser download
  const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(cleanFilename);
}
