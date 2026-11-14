"use client";

import React from "react";
import Image from "next/image";
import {
  Invoice,
  InvoiceItem,
  InvoicePdfFormat,
  PdfTypographySettings,
  LayoutDensity,
} from "@/types";
import {
  formatLKR,
  formatDate,
  numberToWordsLKR,
  formatServicePeriod,
} from "@/lib/utils";
import { resolveTypography, paginateInvoiceItems, PaginatedPage } from "@/lib/pdfTypography";
import { DigitalApprovalBlock } from "@/components/invoices/DigitalApprovalBlock";

export interface InvoiceTemplateRendererProps {
  invoice: Invoice;
  printMode?: boolean;
  format?: InvoicePdfFormat;
  isDraftPreview?: boolean;
  typographySettings?: Partial<PdfTypographySettings>;
  zoomScale?: number;
}

/**
 * Clean Corporate Logo or White Lettermark Badge.
 */
function EntityLogoOrBadge({
  logoUrl,
  entityName,
  prefix,
  size = "md",
}: {
  logoUrl?: string;
  entityName?: string;
  prefix?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = React.useState(false);

  const sizeDimensions = {
    sm: "w-9 h-9 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-14 h-14 text-base",
  }[size];

  if (logoUrl && !imgError) {
    return (
      <div className={`${sizeDimensions} relative shrink-0 overflow-hidden`}>
        <Image
          src={logoUrl}
          alt={entityName || "Billing Entity Logo"}
          fill
          className="object-contain object-left"
          priority
          onError={() => setImgError(true)}
          sizes="56px"
        />
      </div>
    );
  }

  const initials =
    prefix || (entityName ? entityName.slice(0, 3).toUpperCase() : "ENT");

  return (
    <div
      className={`${sizeDimensions} rounded-xl border border-slate-300 bg-white text-slate-800 font-extrabold flex flex-col items-center justify-center tracking-wider shrink-0 shadow-2xs`}
    >
      <span className="text-xs font-black tracking-tight">{initials}</span>
    </div>
  );
}

/**
 * Service line item cell with secondary advertising metadata tags.
 */
function ItemServiceCell({
  item,
  descriptionSizePt = 8.5,
}: {
  item: InvoiceItem;
  descriptionSizePt?: number;
}) {
  const hasMediaChannel = Boolean(item.mediaChannel && item.mediaChannel.trim());
  const hasRefNumber = Boolean(item.referenceNumber && item.referenceNumber.trim());
  const hasCategory = Boolean(item.category && item.category !== "Other Services");

  return (
    <div className="space-y-0.5 leading-snug">
      {/* Title Line: Service Name + Media Channel */}
      <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
        <span>{item.serviceName}</span>
        {hasMediaChannel && (
          <span className="text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[9.5px] inline-flex items-center space-x-1">
            <span>—</span>
            <span>{item.mediaChannel}</span>
          </span>
        )}
      </div>

      {/* Media Reference Line (RO Number, Booking Ref, Spot ID) */}
      {hasRefNumber && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="inline-flex items-center space-x-1 font-mono text-[9px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
            <span className="text-slate-500 uppercase">{item.referenceType || "RO No"}:</span>
            <span className="text-slate-900 font-bold">{item.referenceNumber}</span>
          </span>
          {hasCategory && (
            <span className="text-[8.5px] font-medium text-slate-500 uppercase tracking-wide">
              ({item.category})
            </span>
          )}
        </div>
      )}

      {/* Category without Ref */}
      {!hasRefNumber && hasCategory && (
        <div className="text-[8.5px] font-medium text-slate-500 uppercase tracking-wide">
          ({item.category})
        </div>
      )}

      {/* Work Description */}
      {item.description && (
        <div
          className="text-slate-600 whitespace-pre-line pt-0.5 leading-relaxed"
          style={{ fontSize: `${descriptionSizePt}pt` }}
        >
          {item.description}
        </div>
      )}
    </div>
  );
}

export function InvoiceTemplateRenderer({
  invoice,
  printMode = false,
  format = "digital",
  isDraftPreview = false,
  typographySettings,
  zoomScale = 1,
}: InvoiceTemplateRendererProps) {
  const {
    invoiceNumber = "",
    invoiceDate,
    dueDate,
    regNo,
    yourRef,
    product,
    clientSnapshot,
    billingSnapshot,
    items = [],
    subtotal = 0,
    vatApplicable = false,
    vatRate = 0,
    vatAmount = 0,
    grandTotal = 0,
    advancePercentage = 0,
    specialNotes,
    paymentInstructions,
    templateKey = "standard",
    includeServicePeriod,
    servicePeriodStart,
    servicePeriodEnd,
    showVatSeparately = true,
  } = invoice;

  const entityName =
    billingSnapshot?.displayName || billingSnapshot?.name || "SN Advertising";
  const entityLegal = billingSnapshot?.name;
  const entityPrefix = (billingSnapshot?.prefix || "SN").trim();
  const entityFooter =
    billingSnapshot?.footerText ||
    `Thank you for partnering with ${entityName} — Colombo, Sri Lanka`;
  const effectiveFormat: InvoicePdfFormat =
    format || invoice?.signatureFormat || "digital";

  // Prevent duplicate prefix bug e.g. HRP-HRP-2026-23468
  const cleanInvoiceNo =
    invoiceNumber.startsWith(`${entityPrefix}-`) || invoiceNumber.startsWith(`${entityPrefix}`)
      ? invoiceNumber
      : `${entityPrefix}-${invoiceNumber}`;

  // Resolve typography scaling based on invoice layout settings or smart auto-fit
  const mergedSettings = {
    ...billingSnapshot?.pdfLayout,
    ...invoice.pdfLayout,
    ...typographySettings,
  };

  const typo: PdfTypographySettings = resolveTypography(
    mergedSettings,
    items,
    vatApplicable,
    Boolean(specialNotes)
  );

  const blocks = typo.blocksConfig || {
    showBankDetails: true,
    showSpecialNotes: true,
    showAmountInWords: true,
    showDueDates: true,
    showSignatureBlock: true,
    customNoteText: "",
  };

  // Paginate items onto true ISO A4 sheets respecting pageFitMode
  const pages: PaginatedPage[] = paginateInvoiceItems(
    items,
    typo.density,
    typo.pageFitMode || "single_page"
  );

  // Default payment instruction fallback
  const defaultBankText = billingSnapshot?.bankName
    ? `Bank transfers to ${billingSnapshot?.accountName || entityName}, A/C: ${
        billingSnapshot?.accountNumber || ""
      }, ${billingSnapshot?.bankName} – ${billingSnapshot?.branch || ""}.`
    : "";
  const finalPaymentInstructions =
    paymentInstructions ||
    billingSnapshot?.paymentInstructions ||
    `Cheques should be drawn in favour of ${
      billingSnapshot?.chequePayee || entityName
    } and crossed "ACCOUNT PAYEE" only. ${defaultBankText}`;

  // Document Heading Title based on template and VAT registration
  const documentTitle =
    templateKey === "vat" || (vatApplicable && billingSnapshot?.vatNumber)
      ? "TAX INVOICE"
      : templateKey === "sponsorship"
      ? "MEDIA SPONSORSHIP INVOICE"
      : templateKey === "custom"
      ? "COMMERCIAL INVOICE"
      : "INVOICE";

  // Density-specific table row padding classes
  const isSinglePage = typo.pageFitMode === "single_page" || pages.length === 1;
  const rowPaddingClass =
    isSinglePage && items.length >= 4
      ? "py-1.5 px-2.5"
      : typo.density === "comfortable"
      ? "py-2.5 px-3"
      : typo.density === "compact"
      ? "py-1 px-2"
      : "py-2 px-2.5";

  return (
    <div
      id="printable-invoice"
      className="invoice-render-container flex flex-col items-center select-text font-sans not-prose"
      style={{
        transform: zoomScale !== 1 ? `scale(${zoomScale})` : undefined,
        transformOrigin: "top center",
      }}
    >
      {pages.map((page) => (
        <div
          key={`a4-page-${page.pageNumber}`}
          className={`a4-page-sheet bg-white text-slate-900 border border-slate-200 box-border relative flex flex-col justify-between ${
            printMode
              ? "print:m-0 print:border-none print:shadow-none"
              : "shadow-md rounded-xl mb-6 last:mb-0 ring-1 ring-slate-900/5"
          }`}
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "9mm 12mm 8mm 12mm",
            boxSizing: "border-box",
            backgroundColor: "#FFFFFF",
          }}
        >
          {/* ===================== PAGE CONTENT TOP ===================== */}
          <div className="flex-1 flex flex-col">
            {/* ----------------- FIRST PAGE HEADER ----------------- */}
            {page.isFirstPage ? (
              <div>
                {/* Header: Company Logo & Details (Left) + Address & Tax (Right) */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
                  {/* Left: Logo & Company Name */}
                  <div className="flex items-start space-x-2.5 max-w-[55%]">
                    <EntityLogoOrBadge
                      logoUrl={billingSnapshot?.logoUrl}
                      entityName={entityName}
                      prefix={entityPrefix}
                      size="md"
                    />
                    <div className="space-y-0.5">
                      <h1
                        className="font-extrabold tracking-tight text-slate-900 uppercase leading-snug"
                        style={{ fontSize: `${typo.headerSizePt}pt` }}
                      >
                        {entityName}
                      </h1>
                      {entityLegal && entityLegal !== entityName && (
                        <p className="text-[9.5px] text-slate-500 font-semibold uppercase leading-tight">
                          {entityLegal}
                        </p>
                      )}
                      <p className="text-[9.5px] text-slate-500 font-medium">
                        Advertising &amp; Media Services
                      </p>
                    </div>
                  </div>

                  {/* Right: Invoice Number Badge & Issuer Info */}
                  <div className="text-right space-y-0.5 max-w-[44%] text-slate-600">
                    <div className="font-mono text-xs font-bold text-slate-800 tracking-wide uppercase">
                      INVOICE NO. {cleanInvoiceNo}
                    </div>
                    {billingSnapshot?.address && (
                      <p className="text-[9px] leading-tight text-slate-500 whitespace-pre-line pt-0.5">
                        {billingSnapshot.address}
                      </p>
                    )}
                    <div className="text-[8.5px] text-slate-500 space-x-1.5 pt-0.5">
                      {billingSnapshot?.email && <span>{billingSnapshot.email}</span>}
                      {billingSnapshot?.phone && <span>• {billingSnapshot.phone}</span>}
                    </div>
                    <div className="text-[8.5px] text-slate-500 space-x-1.5 font-mono">
                      {billingSnapshot?.brn && <span>BRN: {billingSnapshot.brn}</span>}
                      {billingSnapshot?.vatNumber && (
                        <span className="font-semibold text-emerald-800">
                          • VAT: {billingSnapshot.vatNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Title Banner & Meta Grid */}
                <div className="pt-2 pb-2.5 flex items-start justify-between">
                  {/* Left: Document Heading & Client "Bill To" */}
                  <div className="space-y-0.5 max-w-[60%]">
                    <h2
                      className="font-black text-slate-900 uppercase tracking-tight leading-tight"
                      style={{ fontSize: `${typo.titleSizePt}pt` }}
                    >
                      {documentTitle}
                    </h2>
                    <div className="text-slate-600 pt-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        BILL TO:
                      </span>
                      <p
                        className="font-bold text-slate-900 uppercase leading-snug"
                        style={{ fontSize: `${typo.sectionHeadingPt}pt` }}
                      >
                        {clientSnapshot?.name || "Client Name"}
                      </p>
                      {clientSnapshot?.address && (
                        <p className="text-[9px] text-slate-500 whitespace-pre-line leading-tight">
                          {clientSnapshot.address}
                        </p>
                      )}
                      {clientSnapshot?.vatNumber && (
                        <p className="text-[8.5px] font-mono text-slate-700 font-semibold mt-0.5">
                          Client VAT: {clientSnapshot.vatNumber}
                        </p>
                      )}
                      {clientSnapshot?.contactPerson && (
                        <p className="text-[8.5px] text-slate-500">
                          Attn: {clientSnapshot.contactPerson}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Key Dates & References */}
                  {blocks.showDueDates !== false && (
                    <div className="text-right space-y-0.5 text-slate-600 min-w-[125px]">
                      <div className="text-xs">
                        <span className="text-slate-400 mr-1.5 text-[9.5px]">Date:</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {formatDate(invoiceDate)}
                        </span>
                      </div>
                      {dueDate && (
                        <div className="text-xs">
                          <span className="text-slate-400 mr-1.5 text-[9.5px]">Due Date:</span>
                          <span className="font-semibold text-slate-800 font-mono">
                            {formatDate(dueDate)}
                          </span>
                        </div>
                      )}
                      {regNo && (
                        <div className="text-xs">
                          <span className="text-slate-400 mr-1.5 text-[9.5px]">Ref:</span>
                          <span className="font-mono text-slate-800 font-bold">{regNo}</span>
                        </div>
                      )}
                      {yourRef && (
                        <div className="text-xs">
                          <span className="text-slate-400 mr-1.5 text-[9.5px]">Client Ref:</span>
                          <span className="font-medium text-slate-800">{yourRef}</span>
                        </div>
                      )}
                      {includeServicePeriod && servicePeriodStart && servicePeriodEnd && (
                        <div className="text-[9px] text-emerald-800 font-mono font-semibold pt-0.5">
                          Period: {formatServicePeriod(servicePeriodStart, servicePeriodEnd)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ----------------- CONTINUATION PAGE HEADER ----------------- */
              <div className="border-b border-slate-200 pb-1.5 mb-2.5 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-900 uppercase">
                    {entityName}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">{documentTitle} (Continuation)</span>
                </div>
                <div className="font-mono text-slate-700 font-bold">
                  INVOICE NO. {cleanInvoiceNo}
                </div>
              </div>
            )}

            {/* ----------------- SERVICE ITEMS TABLE ----------------- */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left border-collapse" style={{ fontSize: `${typo.bodySizePt}pt` }}>
                <thead>
                  <tr
                    className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-bold tracking-wider uppercase"
                    style={{ fontSize: `${typo.tableHeaderPt}pt` }}
                  >
                    <th className="py-1.5 px-3 w-28 font-semibold">Period / Date</th>
                    <th className="py-1.5 px-3 font-semibold">Description of Service</th>
                    <th className="py-1.5 px-2 text-center w-12 font-semibold">Qty</th>
                    <th className="py-1.5 px-3 text-right w-24 font-semibold">Price (Rs.)</th>
                    <th className="py-1.5 px-3 text-right w-28 font-semibold">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {page.items.map((item, idx) => (
                    <tr key={item.id || `${page.startIndex + idx}`}>
                      <td className={`${rowPaddingClass} font-mono text-[8.5px] text-slate-500 align-top`}>
                        {item.servicePeriod || formatDate(invoiceDate)}
                      </td>
                      <td className={`${rowPaddingClass} align-top`}>
                        <ItemServiceCell
                          item={item}
                          descriptionSizePt={typo.descriptionSizePt}
                        />
                      </td>
                      <td className={`${rowPaddingClass} text-center font-mono align-top text-slate-700`}>
                        {item.quantity}
                      </td>
                      <td className={`${rowPaddingClass} text-right font-mono align-top text-slate-600`}>
                        {formatLKR(item.unitPrice)}
                      </td>
                      <td className={`${rowPaddingClass} text-right font-mono font-bold text-slate-900 align-top`}>
                        {formatLKR(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtle continuation notice if multiple pages */}
            {!page.isLastPage && (
              <div className="pt-1.5 text-right">
                <span className="text-[9px] italic text-slate-400">
                  Continued on next page...
                </span>
              </div>
            )}

            {/* ----------------- TOTALS & FINANCIAL SUMMARY (LAST PAGE ONLY) ----------------- */}
            {page.isLastPage && (
              <div className="mt-2.5 pt-1 flex items-start justify-between gap-5">
                {/* Left: Words, Special Notes, Custom Clause */}
                <div className="flex-1 space-y-1 text-slate-600 max-w-sm">
                  {blocks.showAmountInWords !== false && (
                    <div>
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">
                        AMOUNT IN WORDS:
                      </span>
                      <p className="text-[9px] italic text-slate-700 font-medium">
                        {numberToWordsLKR(grandTotal)}
                      </p>
                    </div>
                  )}

                  {blocks.showSpecialNotes !== false && specialNotes && (
                    <div className="pt-0.5">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">
                        SPECIAL NOTE:
                      </span>
                      <p className="text-[9px] text-slate-800 font-semibold leading-snug">
                        {specialNotes}
                      </p>
                    </div>
                  )}

                  {/* Optional Custom Note / Block */}
                  {blocks.customNoteText && (
                    <div className="pt-0.5">
                      <p className="text-[8.5px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-200">
                        {blocks.customNoteText}
                      </p>
                    </div>
                  )}

                  {advancePercentage > 0 && (
                    <div className="text-[8.5px] text-slate-700 pt-0.5">
                      <span className="font-semibold text-slate-900">Advance Required: </span>
                      <span>
                        {advancePercentage}% ({formatLKR(grandTotal * (advancePercentage / 100))})
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Clean Financial Summary (NO solid black boxes!) */}
                <div className="w-60 space-y-0.5 text-right text-xs">
                  <div className="flex justify-between text-slate-500 py-0.5">
                    <span>
                      {vatApplicable && showVatSeparately === false
                        ? "Subtotal (Net Amount):"
                        : "Total / Subtotal:"}
                    </span>
                    <span className="font-mono font-medium text-slate-800">
                      {formatLKR(subtotal)}
                    </span>
                  </div>

                  {vatApplicable && showVatSeparately !== false && (
                    <div className="flex justify-between text-slate-500 py-0.5">
                      <span>VAT ({vatRate}%):</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatLKR(vatAmount)}
                      </span>
                    </div>
                  )}

                  {/* Clean Separator */}
                  <div className="border-t border-slate-300 my-1 pt-1 flex justify-between items-baseline">
                    <span className="text-slate-500 font-semibold text-xs">Grand Total</span>
                    <span className="font-mono font-extrabold text-slate-900 text-sm tracking-tight">
                      Rs. {formatLKR(grandTotal)}
                    </span>
                  </div>

                  {/* Payment tracking balance if partial payment exists */}
                  {invoice.totalPaid > 0 && (
                    <div className="pt-0.5 border-t border-slate-100 text-[9.5px] space-y-0.5">
                      <div className="flex justify-between text-emerald-800">
                        <span>Paid:</span>
                        <span className="font-mono font-bold">{formatLKR(invoice.totalPaid)}</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold">
                        <span>Balance Due:</span>
                        <span className="font-mono">{formatLKR(invoice.outstandingBalance)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ===================== PAGE BOTTOM (FOOTER) ===================== */}
          <div className="mt-auto pt-2">
            {/* Payment Details & Signature Block (Rendered on Last Page) */}
            {page.isLastPage ? (
              <div className="border-t border-slate-200 pt-2 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                {/* Left: Payment Instructions & Bank Details */}
                {blocks.showBankDetails !== false ? (
                  <div className="text-slate-600 space-y-0.5">
                    <p className="font-bold text-slate-900 text-[9.5px] uppercase tracking-wider">
                      PAYMENT INSTRUCTIONS &amp; BANK DETAILS
                    </p>
                    <p
                      className="text-slate-600 leading-relaxed font-normal"
                      style={{ fontSize: `${typo.footerSizePt}pt` }}
                    >
                      {finalPaymentInstructions}
                    </p>
                  </div>
                ) : (
                  <div></div>
                )}

                {/* Right: Digital Approval or Blank Signature Block */}
                {blocks.showSignatureBlock !== false && (
                  <div>
                    <DigitalApprovalBlock
                      invoice={invoice}
                      format={effectiveFormat}
                      isDraftPreview={isDraftPreview}
                    />
                  </div>
                )}
              </div>
            ) : null}

            {/* Bottom Tagline & Page Numbering */}
            <div className="border-t border-slate-100 pt-2 mt-1.5 flex items-center justify-between text-[8.5px] text-slate-400">
              <span className="truncate max-w-[450px]">{entityFooter}</span>
              {typo.showPageNumbers && (
                <span className="font-mono font-semibold text-slate-500 shrink-0">
                  Page {page.pageNumber} of {page.totalPages}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
