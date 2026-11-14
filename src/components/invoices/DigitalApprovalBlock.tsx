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

  // =========================================================================
  // OPTION B: BLANK SIGNATURE / HARD COPY PRINT PDF (MANUAL SIGNATURE & STAMP)
  // =========================================================================
  if (activeFormat === "print" || activeFormat === "blank") {
    return (
      <div className="flex flex-col items-end text-right not-prose">
        <div className="w-full max-w-[320px] border border-slate-300 rounded-lg bg-white text-left font-sans shadow-2xs overflow-hidden">
          {/* Blank Signing Area (Plenty of white space for manual signature & stamp) */}
          <div className="h-16 p-2.5 flex flex-col justify-between relative bg-white select-none">
            <span className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider">
              Authorized Signature &amp; Stamp
            </span>
            <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono">
              <span>Date: ________________</span>
              <span>Official Seal / Stamp</span>
            </div>
          </div>

          {/* Bottom Designation Row */}
          <div className="border-t border-slate-200 py-1.5 px-3 bg-slate-50 text-center">
            <span className="text-[11px] font-bold text-slate-800 tracking-normal block">
              {signatoryDesignation || "Authorized Signatory"}
            </span>
            <span className="text-[9.5px] text-slate-500 block leading-tight">
              {entityName}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // OPTION A: DIGITAL APPROVAL (PROFESSIONAL APPLICATION-LEVEL VERIFIED FORMAT)
  // =========================================================================
  const verificationToken = invoice?.verificationToken || "sn-v-sample-preview-ref";
  const verificationUrl = getVerificationUrl(verificationToken);

  const approvalDateRaw =
    approval.approvalTimestamp ||
    invoice?.issuedAt ||
    invoice?.createdAt ||
    new Date().toISOString();

  const colomboTime = formatColomboDateTime(approvalDateRaw);
  const adobeDate = formatAdobeSignatureDate(approvalDateRaw);

  const nameParts = (signatoryName || "Authorized Signatory").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");

  return (
    <div className="flex flex-col items-end text-right not-prose">
      <div className="w-full max-w-[340px] border border-slate-300 rounded-lg bg-white text-left font-sans shadow-2xs overflow-hidden">
        {/* Main Signature Content Area */}
        <div className="p-2.5 relative flex items-center justify-between gap-2.5 overflow-hidden bg-white">
          {/* Left Column: Signatory Artwork or Typography */}
          <div className="shrink-0 max-w-[115px] z-10">
            {displaySignatureImage && signatureImageUrl ? (
              <div className="w-24 h-9 relative mb-1">
                <Image
                  src={signatureImageUrl}
                  alt={`${signatoryName} Signature`}
                  fill
                  className="object-contain object-left"
                  sizes="96px"
                />
              </div>
            ) : null}

            {/* Bold Signatory Name */}
            <div className="font-sans font-extrabold text-navy-950 text-[15px] leading-[1.15] tracking-tight">
              <div>{firstName}</div>
              {lastName ? <div>{lastName}</div> : null}
            </div>
            <div className="text-[9.5px] font-semibold text-slate-500 mt-0.5 leading-tight">
              {signatoryDesignation}
            </div>
          </div>

          {/* Right Column: Digital Approval Details + Verification Link */}
          <div className="relative flex-1 pl-1 z-10 border-l border-slate-200">
            <div className="space-y-0.5 text-[8.5px] leading-[1.25] text-slate-800">
              <p className="font-semibold text-slate-800 flex items-center space-x-1">
                <span>✓</span>
                <span>Digitally Approved via SN INVOICE</span>
              </p>
              <p className="text-slate-600 truncate">
                <span className="font-semibold text-slate-800">Org: </span>
                {entityName}
              </p>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-800">Signatory: </span>
                {signatoryName}
              </p>
              <p className="font-mono text-[8px] text-slate-600">
                <span className="font-sans font-semibold text-slate-800">Date: </span>
                {colomboTime.dateStr} {colomboTime.timeStr}
              </p>

              {/* Online Verification Hyperlink & Optional QR Code */}
              {verificationEnabled && (
                <div className="pt-1 flex items-center justify-between gap-1 border-t border-slate-100 mt-1">
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-verification-link="true"
                    className="verification-hyperlink text-[8px] font-bold text-slate-700 hover:text-slate-950 underline decoration-slate-400 decoration-1 underline-offset-1 inline-flex items-center space-x-0.5"
                  >
                    <span>Verify Authenticity ↗</span>
                  </a>

                  {showQrCode && (
                    <div className="bg-white p-0.5 rounded border border-slate-200 shrink-0 shadow-2xs">
                      <QRCodeDisplay value={verificationUrl} size={28} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Designation Row */}
        <div className="border-t border-slate-200 py-1 px-2.5 bg-slate-50/70 text-center">
          <span className="text-[9.5px] font-semibold text-slate-700 tracking-normal block">
            {entityName} — Official Digital Authorization
          </span>
        </div>
      </div>
    </div>
  );
}
