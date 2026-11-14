"use client";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface ExportPdfOptions {
  elementId?: string;
  filename: string;
  verificationUrl?: string;
}

/**
 * Downloads a high-resolution, true A4 PDF file using jsPDF and html2canvas.
 * Calculates clickable hyperlink bounding box if verificationUrl is provided.
 */
export async function downloadInvoicePdf({
  elementId = "printable-invoice",
  filename,
  verificationUrl,
}: ExportPdfOptions): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Invoice element with id "${elementId}" not found for PDF export.`);
  }

  // Render element to high-res canvas (2x DPI for crisp print quality)
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.98);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = 210;
  const pdfHeight = 297;

  // Add the high-res rasterized page
  pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

  // If a verification URL is specified, find the link element on the DOM to attach a clickable PDF link annotation
  if (verificationUrl) {
    const linkElem = element.querySelector<HTMLElement>(".verification-hyperlink, a[data-verification-link='true']");
    if (linkElem) {
      const containerRect = element.getBoundingClientRect();
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

  // Trigger browser download
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

