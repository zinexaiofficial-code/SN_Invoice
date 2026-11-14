"use client";

import React from "react";
import Image from "next/image";
import { Invoice, InvoicePdfFormat, BillingSnapshot, InvoiceApproval } from "@/types";
import { formatColomboDateTime, formatAdobeSignatureDate } from "@/lib/utils";
import { getVerificationUrl } from "@/lib/crypto";
import { QRCodeDisplay } from "@/lib/qrcode";

interface DigitalApprovalBlockProps {
  invoice?: Partial<Invoice>;
  format?: InvoicePdfFormat;
  isDraftPreview?: boolean;
  // Overrides for live entity settings preview
  previewSettings?: {
    signatureEnabled?: boolean;
    signatoryName?: string;
    signatoryDesignation?: string;
    signatoryEmail?: string;
    signatureImageUrl?: string;
    displaySignatureImage?: boolean;
    verificationEnabled?: boolean;
    showQrCode?: boolean;
    entityName?: string;
    previewFormat?: InvoicePdfFormat;
  };
}

export function DigitalApprovalBlock({
  invoice,
  format = "digital",
  isDraftPreview = false,
  previewSettings,
}: DigitalApprovalBlockProps) {
  const billing: Partial<BillingSnapshot> = invoice?.billingSnapshot || {};
  const approval: Partial<InvoiceApproval> = invoice?.approval || {};
  const isSettingsPreview = Boolean(previewSettings);

  const signatoryName =
    previewSettings?.signatoryName ??
    approval.signatoryNameSnapshot ??
    billing.signatoryName ??
    "Shafil Surantha";

  const signatoryDesignation =
    previewSettings?.signatoryDesignation ??
    approval.signatoryDesignationSnapshot ??
    billing.signatoryDesignation ??
    "Authorized Signatory";

  const signatoryEmail =
    previewSettings?.signatoryEmail ??
    approval.signatoryEmailSnapshot ??
    billing.signatoryEmail ??
    billing.email ??
    "snadvertising@hotmail.com";

  const entityName =
    previewSettings?.entityName ??
    billing.displayName ??
    billing.name ??
    "SN Advertising";

  const signatureImageUrl =
    previewSettings?.signatureImageUrl ??
    billing.signatureImageUrl ??
    billing.signatureUrl;

  const displaySignatureImage =
    previewSettings?.displaySignatureImage ??
    billing.displaySignatureImage ??
    false;

  const showQrCode =
    previewSettings?.showQrCode ??
    billing.showQrCode ??
    true;

  const verificationEnabled =
    previewSettings?.verificationEnabled ??
    billing.verificationEnabled ??
    true;

  // Determine active format
  const activeFormat: InvoicePdfFormat =
    previewSettings?.previewFormat ||
    format ||
    invoice?.signatureFormat ||
    "digital";

  // Name splitting for large typography on the left
  const nameParts = (signatoryName || "Authorized Signatory").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");

  // =========================================================================
  // OPTION B: BLANK SIGNATURE / HARD COPY PRINT PDF (MANUAL SIGNATURE & STAMP)
  // =========================================================================
  if (activeFormat === "print" || activeFormat === "blank") {
    return (
      <div className="flex flex-col items-end text-right not-prose">
        <div className="w-full max-w-[340px] border border-slate-900 bg-white text-left font-sans shadow-xs">
          {/* Blank Signing Area (Plenty of white space for manual signature & stamp) */}
          <div className="h-20 p-2.5 flex flex-col justify-between relative bg-white select-none">
            <span className="text-[9px] font-mono text-slate-300 uppercase tracking-widest">
              Manual Signature
            </span>
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] text-slate-300 font-mono">
                Date: ____________________
              </span>
              <span className="text-[8.5px] text-slate-300 font-mono">
                Official Stamp
              </span>
            </div>
          </div>

          {/* Bottom Designation Row */}
          <div className="border-t border-slate-900 py-1.5 px-3 text-center bg-white">
            <span className="text-xs font-semibold text-slate-900 tracking-normal block">
              {signatoryDesignation || "Authorized Signatory"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // OPTION A: DIGITAL SIGNATURE (VERIFIED ADOBE ACROBAT FORMAT)
  // =========================================================================
  const verificationToken = invoice?.verificationToken || "sn-v-sample-preview-ref";
  const verificationUrl = getVerificationUrl(verificationToken);

  const approvalDateRaw =
    approval.approvalTimestamp ||
    invoice?.issuedAt ||
    invoice?.createdAt ||
    new Date().toISOString();

  const adobeDate = formatAdobeSignatureDate(approvalDateRaw);

  return (
    <div className="flex flex-col items-end text-right not-prose">
      <div className="w-full max-w-[370px] border border-slate-900 bg-white text-left font-sans shadow-xs">
        {/* Main Signature Content Area */}
        <div className="p-3 relative flex items-center justify-between gap-3 overflow-hidden bg-white">
          {/* Left Column: Large Name (or Uploaded Artwork) */}
          <div className="shrink-0 max-w-[130px] z-10">
            {displaySignatureImage && signatureImageUrl ? (
              <div className="w-28 h-10 relative mb-1">
                <Image
                  src={signatureImageUrl}
                  alt={`${signatoryName} Signature`}
                  fill
                  className="object-contain object-left"
                  sizes="112px"
                />
              </div>
            ) : null}

            {/* Large Bold Signatory Name */}
            <div className="font-sans font-bold text-slate-900 text-[18px] leading-[1.15] tracking-tight">
              <div>{firstName}</div>
              {lastName ? <div>{lastName}</div> : null}
            </div>
          </div>

          {/* Right Column: Adobe Watermark Ribbon + Signature Lines */}
          <div className="relative flex-1 pl-1 z-10">
            {/* Adobe Acrobat Stylized Loop Ribbon Watermark */}
            <svg
              viewBox="0 0 100 100"
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-20 h-20 pointer-events-none opacity-20 text-rose-600"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M52 14 C66 14, 78 28, 74 46 C70 62, 50 80, 32 94 C24 100, 18 102, 22 104 C28 106, 40 98, 56 82 C76 62, 94 38, 90 22 C86 8, 66 6, 50 16 C36 26, 30 48, 38 70 C46 86, 60 100, 76 106"
                stroke="#e11d48"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="54" cy="34" r="8" stroke="#e11d48" strokeWidth="2" strokeDasharray="3 3" />
            </svg>

            {/* Standard PKCS#7 / Adobe Digital Signature Typography */}
            <div className="space-y-0.5 text-[9.5px] leading-[1.3] text-slate-900">
              <p className="font-normal">
                Digitally signed by <span className="font-semibold">{signatoryName}</span>
              </p>
              <p className="break-words text-slate-700">
                <span className="font-semibold text-slate-900">DN: </span>
                cn={signatoryName}, o={entityName}, ou=Invoice Billing, email={signatoryEmail}, c=LK
              </p>
              <p className="font-mono text-[9px] text-slate-800">
                <span className="font-sans font-semibold text-slate-900">Date: </span>
                {adobeDate}
              </p>

              {/* Online Verification Hyperlink & QR code */}
              {verificationEnabled && (
                <div className="pt-1 flex items-center justify-between gap-1">
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-verification-link="true"
                    className="verification-hyperlink text-[8.5px] font-bold text-emerald-800 hover:text-emerald-950 underline decoration-emerald-600 decoration-1 underline-offset-1 inline-flex items-center space-x-1"
                  >
                    <span>Verify Document Authenticity ↗</span>
                  </a>

                  {showQrCode && (
                    <div className="bg-white p-0.5 rounded border border-slate-300 shrink-0 shadow-2xs">
                      <QRCodeDisplay value={verificationUrl} size={32} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Designation Row */}
        <div className="border-t border-slate-900 py-1.5 px-3 text-center bg-white">
          <span className="text-xs font-semibold text-slate-900 tracking-normal block">
            {signatoryDesignation || "Authorized Signatory"}
          </span>
        </div>
      </div>
    </div>
  );
}
