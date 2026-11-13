"use client";

import React from "react";
import Image from "next/image";
import { Invoice } from "@/types";
import { formatLKR, formatDate, numberToWordsLKR, formatServicePeriod } from "@/lib/utils";

interface InvoiceTemplateRendererProps {
  invoice: Invoice;
  printMode?: boolean;
}

function EntityLogoOrBadge({
  logoUrl,
  entityName,
  prefix,
  size = "md"
}: {
  logoUrl?: string;
  entityName?: string;
  prefix?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = React.useState(false);
  const sizeClasses = {
    sm: "w-12 h-12 text-sm",
    md: "w-20 h-20 text-base",
    lg: "w-24 h-24 text-lg",
  }[size];

  if (logoUrl && !imgError) {
    return (
      <div className={`${sizeClasses} relative shrink-0`}>
        <Image
          src={logoUrl}
          alt={entityName || "Billing Entity Logo"}
          fill
          className="object-contain"
          priority
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  const initials = prefix || (entityName ? entityName.slice(0, 3).toUpperCase() : "ENT");
  return (
    <div
      className={`${sizeClasses} rounded-xl bg-gradient-to-br from-navy-950 via-slate-900 to-slate-800 text-white font-black flex flex-col items-center justify-center tracking-wider shadow-sm shrink-0 border border-slate-300`}
    >
      <span className="text-sm font-extrabold">{initials}</span>
    </div>
  );
}

export function InvoiceTemplateRenderer({ invoice, printMode = false }: InvoiceTemplateRendererProps) {
  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    regNo,
    yourRef,
    product,
    clientSnapshot,
    billingSnapshot,
    items,
    subtotal,
    vatApplicable,
    vatRate,
    vatAmount,
    grandTotal,
    advancePercentage,
    specialNotes,
    paymentInstructions,
    templateKey = 'standard',
    includeServicePeriod,
    servicePeriodStart,
    servicePeriodEnd,
    showVatSeparately = true
  } = invoice;

  const entityName = billingSnapshot?.displayName || billingSnapshot?.name || "SN Advertising";
  const entityLegal = billingSnapshot?.name;
  const entityPrefix = billingSnapshot?.prefix || "SN";
  const entityFooter = billingSnapshot?.footerText || `Thank you for partnering with ${entityName} — Sri Lanka`;
  const signatoryName = billingSnapshot?.signatoryName || "Authorized Signatory";
  const signatoryTitle = billingSnapshot?.signatoryDesignation || `For ${entityName}`;

  // Default payment instruction fallback if entity didn't set one
  const defaultBankText = billingSnapshot?.bankName 
    ? `Bank transfers to ${billingSnapshot?.accountName || entityName}, A/C: ${billingSnapshot?.accountNumber || ''}, ${billingSnapshot?.bankName} – ${billingSnapshot?.branch || ''}.` 
    : '';
  const finalPaymentInstructions = paymentInstructions || billingSnapshot?.paymentInstructions || 
    `Cheques should be drawn in favour of ${billingSnapshot?.chequePayee || entityName} and crossed "ACCOUNT PAYEE" only. ${defaultBankText}`;

  return (
    <div
      id="printable-invoice"
      className={`bg-white text-slate-900 mx-auto select-text font-sans ${
        printMode
          ? "w-[210mm] min-h-[297mm] p-10 print:p-8 print:m-0"
          : "w-full max-w-4xl p-6 md:p-10 shadow-lg rounded-xl border border-slate-200"
      }`}
      style={{ boxSizing: "border-box" }}
    >
      {/* ===================== TEMPLATE 1: STANDARD ADVERTISING (EXCEL EXACT) ===================== */}
      {templateKey === 'standard' && (
        <div className="flex flex-col justify-between min-h-full">
          <div>
            {/* Header: Dynamic Entity Logo and Letterhead */}
            <div className="flex items-start justify-between border-b-2 border-navy-950 pb-5">
              <div className="flex items-center space-x-4">
                <EntityLogoOrBadge
                  logoUrl={billingSnapshot?.logoUrl}
                  entityName={entityName}
                  prefix={entityPrefix}
                  size="md"
                />
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-navy-950 uppercase">
                    {entityName}
                  </h1>
                  {entityLegal && entityLegal !== entityName && (
                    <p className="text-xs text-slate-500 font-semibold">{entityLegal}</p>
                  )}
                  {billingSnapshot?.brn && (
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">BRN: {billingSnapshot.brn}</p>
                  )}
                  {billingSnapshot?.vatNumber && (
                    <p className="text-[11px] text-emerald-800 font-mono font-semibold">
                      VAT Reg: {billingSnapshot.vatNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right text-xs text-slate-700 leading-relaxed font-sans max-w-xs">
                {billingSnapshot?.address && (
                  <p className="font-semibold text-slate-900 whitespace-pre-line">{billingSnapshot.address}</p>
                )}
                {billingSnapshot?.email && (
                  <p className="text-navy-900 font-medium mt-1">{billingSnapshot.email}</p>
                )}
                {billingSnapshot?.phone && (
                  <p className="font-mono text-slate-800 mt-0.5">{billingSnapshot.phone}</p>
                )}
                {billingSnapshot?.secondaryPhone && (
                  <p className="font-mono text-slate-800">{billingSnapshot.secondaryPhone}</p>
                )}
                {billingSnapshot?.website && (
                  <p className="text-slate-500 text-[11px]">{billingSnapshot.website}</p>
                )}
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">DOCUMENT</span>
                <h2 className="text-2xl font-black text-navy-950 tracking-wider uppercase">INVOICE</h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">INVOICE NO:</span>
                <span className="text-xl font-mono font-bold text-navy-900">{invoiceNumber}</span>
              </div>
            </div>

            {/* Client & Meta Info Grid */}
            <div className="mt-5 grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-4 bg-slate-50/50 text-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Name of the advertiser &amp; address
                </p>
                <p className="font-bold text-base text-navy-950 uppercase leading-snug">
                  {clientSnapshot?.name || "Client Name"}
                </p>
                <p className="text-slate-700 text-xs whitespace-pre-line mt-1">
                  {clientSnapshot?.address}
                </p>
                {clientSnapshot?.vatNumber && (
                  <p className="text-xs font-semibold text-slate-800 mt-2 font-mono">
                    CLIENT VAT NO: {clientSnapshot.vatNumber}
                  </p>
                )}
                {clientSnapshot?.contactPerson && (
                  <p className="text-xs text-slate-600 mt-1">
                    Attn: {clientSnapshot.contactPerson}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-right flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex justify-end space-x-2 text-xs">
                    <span className="text-slate-500 font-medium">Date:</span>
                    <span className="font-bold text-slate-900 font-mono">{formatDate(invoiceDate)}</span>
                  </div>
                  {dueDate && (
                    <div className="flex justify-end space-x-2 text-xs">
                      <span className="text-slate-500 font-medium">Due Date:</span>
                      <span className="font-bold text-slate-900 font-mono">{formatDate(dueDate)}</span>
                    </div>
                  )}
                  {regNo && (
                    <div className="flex justify-end space-x-2 text-xs">
                      <span className="text-slate-500 font-medium">Reg. No:</span>
                      <span className="font-bold text-slate-900 font-mono">{regNo}</span>
                    </div>
                  )}
                  {yourRef && (
                    <div className="flex justify-end space-x-2 text-xs">
                      <span className="text-slate-500 font-medium">Your Ref:</span>
                      <span className="font-bold text-slate-900">{yourRef}</span>
                    </div>
                  )}
                  {product && (
                    <div className="flex justify-end space-x-2 text-xs">
                      <span className="text-slate-500 font-medium">Product:</span>
                      <span className="font-bold text-slate-900">{product}</span>
                    </div>
                  )}
                  {includeServicePeriod && servicePeriodStart && servicePeriodEnd && (
                    <div className="flex justify-end space-x-2 text-xs">
                      <span className="text-slate-500 font-medium">Service Period:</span>
                      <span className="font-bold text-emerald-800 font-mono">
                        {formatServicePeriod(servicePeriodStart, servicePeriodEnd)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-slate-500">Billing Entity: </span>
                  <span className="text-xs font-bold text-navy-950">{entityName}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mt-5 border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-navy-950 text-white text-xs font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 border-r border-navy-900 w-32">Period</th>
                    <th className="py-2.5 px-4 border-r border-navy-900">Description of Service</th>
                    <th className="py-2.5 px-3 border-r border-navy-900 text-center w-16">Qty</th>
                    <th className="py-2.5 px-3 border-r border-navy-900 text-right w-28">Price (Rs.)</th>
                    <th className="py-2.5 px-4 text-right w-36">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-3 px-3 text-xs font-mono font-medium border-r border-slate-200 align-top">
                        {item.servicePeriod || formatDate(invoiceDate)}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 align-top">
                        <div className="font-bold text-navy-950">{item.serviceName}</div>
                        <div className="text-xs text-slate-600 whitespace-pre-line mt-0.5">{item.description}</div>
                      </td>
                      <td className="py-3 px-3 text-xs text-center border-r border-slate-200 align-top font-mono">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-xs text-right border-r border-slate-200 align-top font-mono">
                        {formatLKR(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-navy-950 align-top font-mono">
                        {formatLKR(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Totals */}
            <div className="mt-4 flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="w-full md:max-w-md text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-900">Amount in Words:</p>
                <p className="italic text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 font-medium">
                  {numberToWordsLKR(grandTotal)}
                </p>
                {specialNotes && (
                  <p className="font-bold text-navy-900 mt-2">
                    {specialNotes}
                  </p>
                )}
                {advancePercentage > 0 && (
                  <div className="p-2 bg-blue-50/70 border border-blue-200 rounded text-blue-950 font-medium text-xs">
                    <span>Advance Required: </span>
                    <span className="font-bold">{advancePercentage}% ({formatLKR(grandTotal * (advancePercentage / 100))})</span>
                  </div>
                )}
              </div>

              <div className="w-full md:w-72 border border-slate-300 rounded-lg overflow-hidden text-sm bg-slate-50">
                <div className="flex justify-between py-2 px-3 border-b border-slate-200 text-xs">
                  <span className="text-slate-600 font-medium">
                    {vatApplicable && showVatSeparately === false ? "Subtotal (Net Amount):" : "Total / Subtotal:"}
                  </span>
                  <span className="font-bold text-slate-900 font-mono">{formatLKR(subtotal)}</span>
                </div>
                {vatApplicable && showVatSeparately !== false && (
                  <div className="flex justify-between py-2 px-3 border-b border-slate-200 text-xs bg-amber-50/60">
                    <span className="text-slate-700 font-medium">VAT ({vatRate}%):</span>
                    <span className="font-bold text-amber-900 font-mono">{formatLKR(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2.5 px-3 bg-navy-950 text-white font-bold">
                  <span className="tracking-wide">
                    {vatApplicable && showVatSeparately === false ? "Total (Including VAT):" : "Grand Total:"}
                  </span>
                  <span className="font-mono text-base">{formatLKR(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer & Payment Instructions */}
          <div className="mt-8 pt-4 border-t-2 border-slate-300 text-xs text-slate-700 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <p className="font-bold text-navy-950 mb-1 uppercase tracking-wide text-[11px]">Payment Instructions:</p>
                <p className="font-medium text-slate-800 leading-relaxed">
                  {finalPaymentInstructions}
                </p>
              </div>

              <div className="text-right flex flex-col items-end">
                {billingSnapshot?.signatureUrl ? (
                  <div className="w-36 h-14 relative mb-1">
                    <Image
                      src={billingSnapshot.signatureUrl}
                      alt="Authorized Signature"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-44 border-b border-slate-400 pb-1 mb-1 text-center">
                    <span className="font-script text-lg text-navy-900 italic font-semibold">Authorized</span>
                  </div>
                )}
                <p className="font-bold text-navy-950 text-xs uppercase tracking-wider">{signatoryName}</p>
                <p className="text-[10px] text-slate-500">{signatoryTitle}</p>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-200">
              {entityFooter}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TEMPLATE 2: VAT TAX INVOICE ===================== */}
      {templateKey === 'vat' && (
        <div className="flex flex-col justify-between min-h-full">
          <div>
            {/* Header: Dynamic Entity and IRD VAT Registration */}
            <div className="flex items-start justify-between border-b-2 border-navy-900 pb-5">
              <div className="flex items-center space-x-4">
                <EntityLogoOrBadge
                  logoUrl={billingSnapshot?.logoUrl}
                  entityName={entityName}
                  prefix={entityPrefix}
                  size="md"
                />
                <div>
                  <h1 className="text-2xl font-black text-navy-950 tracking-tight uppercase">{entityName}</h1>
                  {entityLegal && entityLegal !== entityName && (
                    <p className="text-xs text-slate-600 font-bold uppercase">{entityLegal}</p>
                  )}
                  {billingSnapshot?.brn && (
                    <p className="text-xs text-slate-500 font-mono">BRN: {billingSnapshot.brn}</p>
                  )}
                  <p className="text-xs text-slate-500">Commercial &amp; Professional Advertising Services</p>
                </div>
              </div>

              <div className="text-right text-xs text-slate-700 leading-relaxed font-sans max-w-xs">
                <p className="font-semibold text-slate-900 whitespace-pre-line">{billingSnapshot?.address}</p>
                {billingSnapshot?.email && <p className="text-navy-900">{billingSnapshot.email}</p>}
                {billingSnapshot?.phone && <p className="font-mono text-slate-800 mt-0.5">{billingSnapshot.phone}</p>}
                <div className="mt-2 bg-navy-900 text-white px-2.5 py-1 rounded text-right inline-block">
                  <span className="text-[10px] font-bold block text-slate-300">ISSUER VAT REG NO:</span>
                  <span className="text-xs font-mono font-bold tracking-wider">
                    {billingSnapshot?.vatNumber || "114094498-7000"}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-4 flex items-center justify-between bg-slate-100 px-4 py-2.5 rounded-lg border border-slate-200">
              <div>
                <h2 className="text-xl font-extrabold text-navy-950 tracking-wider uppercase">TAX INVOICE (VAT)</h2>
                <span className="text-[11px] text-slate-500">Issued under Inland Revenue Department Guidelines</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-600 block">TAX INVOICE NO:</span>
                <span className="text-lg font-mono font-bold text-navy-950">{invoiceNumber}</span>
              </div>
            </div>

            {/* Two-Column Client & Tax Info */}
            <div className="mt-4 grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-4 text-sm bg-white">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">CUSTOMER / ADVERTISER DETAILS</p>
                <p className="font-extrabold text-base text-navy-950 uppercase">{clientSnapshot?.name}</p>
                <p className="text-slate-700 text-xs whitespace-pre-line mt-1">{clientSnapshot?.address}</p>
                
                <div className="mt-3 p-2 bg-amber-50/80 border border-amber-300 rounded">
                  <span className="text-[10px] uppercase font-bold text-amber-900 block">CLIENT VAT REGISTRATION NO:</span>
                  <span className="text-xs font-mono font-extrabold text-amber-950">
                    {clientSnapshot?.vatNumber || "UNREGISTERED / NOT PROVIDED"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-right flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex justify-end space-x-2 text-xs">
                    <span className="text-slate-500">Tax Invoice Date:</span>
                    <span className="font-bold text-slate-900 font-mono">{formatDate(invoiceDate)}</span>
                  </div>
                  {dueDate && (
                    <div className="flex justify-end space-x-2 text-xs">
                      <span className="text-slate-500">Due Date:</span>
                      <span className="font-bold text-slate-900 font-mono">{formatDate(dueDate)}</span>
                    </div>
                  )}
                  {regNo && (
                    <div className="flex justify-end space-x-2 text-xs">
                      <span className="text-slate-500">Job Reference:</span>
                      <span className="font-bold text-slate-900 font-mono">{regNo}</span>
                    </div>
                  )}
                  {product && (
                    <div className="flex justify-end space-x-2 text-xs">
                      <span className="text-slate-500">Product / Brand:</span>
                      <span className="font-bold text-slate-900">{product}</span>
                    </div>
                  )}
                  {includeServicePeriod && servicePeriodStart && servicePeriodEnd && (
                    <div className="flex justify-end space-x-2 text-xs">
                      <span className="text-slate-500">Service Period:</span>
                      <span className="font-bold text-emerald-800 font-mono">
                        {formatServicePeriod(servicePeriodStart, servicePeriodEnd)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-slate-500">Payment Payee: </span>
                  <span className="text-xs font-bold text-navy-950">{billingSnapshot?.chequePayee || entityName}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table with VAT Detail */}
            <div className="mt-5 border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-navy-950 text-white text-xs font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 border-r border-navy-900 w-32">Advertising Period</th>
                    <th className="py-2.5 px-4 border-r border-navy-900">Description of Service</th>
                    <th className="py-2.5 px-3 border-r border-navy-900 text-center w-16">Qty</th>
                    <th className="py-2.5 px-3 border-r border-navy-900 text-right w-28">Net Price</th>
                    <th className="py-2.5 px-4 text-right w-36">Net Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-3 px-3 text-xs font-mono font-medium border-r border-slate-200 align-top">
                        {item.servicePeriod || formatDate(invoiceDate)}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 align-top">
                        <div className="font-bold text-navy-950">{item.serviceName}</div>
                        <div className="text-xs text-slate-600 whitespace-pre-line mt-0.5">{item.description}</div>
                      </td>
                      <td className="py-3 px-3 text-xs text-center border-r border-slate-200 align-top font-mono">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-xs text-right border-r border-slate-200 align-top font-mono">
                        {formatLKR(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-navy-950 align-top font-mono">
                        {formatLKR(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tax Breakdown Summary */}
            <div className="mt-4 flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="w-full md:max-w-md text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-900">Total Tax Invoice Value in Words:</p>
                <p className="italic text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 font-medium">
                  {numberToWordsLKR(grandTotal)}
                </p>
                {specialNotes && <p className="font-bold text-navy-900">{specialNotes}</p>}
              </div>

              <div className="w-full md:w-80 border border-slate-300 rounded-lg overflow-hidden text-sm bg-slate-50">
                <div className="flex justify-between py-2 px-3 border-b border-slate-200 text-xs">
                  <span className="text-slate-600">Subtotal (Net Value):</span>
                  <span className="font-bold text-slate-900 font-mono">{formatLKR(subtotal)}</span>
                </div>
                {vatApplicable && showVatSeparately !== false && (
                  <div className="flex justify-between py-2 px-3 border-b border-slate-200 text-xs bg-amber-50">
                    <span className="text-amber-900 font-semibold">Value Added Tax ({vatRate}%):</span>
                    <span className="font-bold text-amber-950 font-mono">{formatLKR(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2.5 px-3 bg-navy-950 text-white font-bold">
                  <span className="tracking-wide">
                    {vatApplicable && showVatSeparately === false ? "Total (Including VAT):" : "Gross Total (Rs.):"}
                  </span>
                  <span className="font-mono text-base">{formatLKR(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t-2 border-slate-300 text-xs text-slate-700 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <p className="font-bold text-navy-950 mb-1 uppercase tracking-wide text-[11px]">Payment Terms &amp; Instructions:</p>
                <p className="font-medium text-slate-800 leading-relaxed">
                  {finalPaymentInstructions}
                </p>
              </div>

              <div className="text-right flex flex-col items-end">
                {billingSnapshot?.signatureUrl ? (
                  <div className="w-36 h-14 relative mb-1">
                    <Image
                      src={billingSnapshot.signatureUrl}
                      alt="Authorized Signature"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-44 border-b border-slate-400 pb-1 mb-1 text-center">
                    <span className="font-script text-lg text-navy-900 italic font-semibold">Authorized</span>
                  </div>
                )}
                <p className="font-bold text-navy-950 text-xs uppercase tracking-wider">{signatoryName}</p>
                <p className="text-[10px] text-slate-500">{signatoryTitle}</p>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-200">
              {entityFooter}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TEMPLATE 3: SPONSORSHIP INVOICE (RADIO / BROADCAST) ===================== */}
      {templateKey === 'sponsorship' && (
        <div className="flex flex-col justify-between min-h-full">
          <div>
            {/* Header: Radio & Broadcast branding */}
            <div className="flex items-start justify-between border-b-2 border-navy-950 pb-5">
              <div className="flex items-center space-x-4">
                <EntityLogoOrBadge
                  logoUrl={billingSnapshot?.logoUrl}
                  entityName={entityName}
                  prefix={entityPrefix}
                  size="md"
                />
                <div>
                  <h1 className="text-2xl font-black text-navy-950 tracking-tight uppercase">{entityName}</h1>
                  <div className="inline-flex items-center px-2 py-0.5 mt-1 rounded bg-navy-100 text-navy-900 text-xs font-bold uppercase">
                    Broadcast &amp; Media Sponsorship Division
                  </div>
                  {billingSnapshot?.vatNumber && (
                    <p className="text-[11px] text-emerald-800 font-mono font-semibold mt-0.5">
                      VAT: {billingSnapshot.vatNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right text-xs text-slate-700 leading-relaxed max-w-xs">
                <p className="font-semibold text-slate-900 whitespace-pre-line">{billingSnapshot?.address}</p>
                {billingSnapshot?.email && <p className="text-navy-900">{billingSnapshot.email}</p>}
                {billingSnapshot?.phone && <p className="font-mono text-slate-800 mt-1">{billingSnapshot.phone}</p>}
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-4 flex items-center justify-between border-b border-slate-300 pb-3">
              <div>
                <h2 className="text-xl font-black text-navy-950 tracking-wider uppercase">MEDIA SPONSORSHIP INVOICE</h2>
                <span className="text-xs text-slate-500">Radio, Television &amp; Digital Airtime Placement</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">INVOICE NO:</span>
                <span className="text-xl font-mono font-bold text-navy-900">{invoiceNumber}</span>
              </div>
            </div>

            {/* Client and Program Slot Grid */}
            <div className="mt-4 grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-4 bg-slate-50/60 text-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  SPONSOR / ADVERTISER:
                </p>
                <p className="font-bold text-base text-navy-950 uppercase">{clientSnapshot?.name}</p>
                <p className="text-slate-700 text-xs whitespace-pre-line mt-1">{clientSnapshot?.address}</p>
                {clientSnapshot?.vatNumber && (
                  <p className="text-xs font-mono font-semibold text-slate-800 mt-1">
                    VAT: {clientSnapshot.vatNumber}
                  </p>
                )}
              </div>

              <div className="text-right space-y-1 text-xs">
                <div className="flex justify-end space-x-2">
                  <span className="text-slate-500">Invoice Date:</span>
                  <span className="font-bold text-slate-900 font-mono">{formatDate(invoiceDate)}</span>
                </div>
                {regNo && (
                  <div className="flex justify-end space-x-2">
                    <span className="text-slate-500">Broadcast Ref:</span>
                    <span className="font-bold text-navy-900 font-mono">{regNo}</span>
                  </div>
                )}
                {includeServicePeriod && servicePeriodStart && servicePeriodEnd ? (
                  <div className="flex justify-end space-x-2">
                    <span className="text-slate-500">Service Period:</span>
                    <span className="font-bold text-emerald-800 font-mono">
                      {formatServicePeriod(servicePeriodStart, servicePeriodEnd)}
                    </span>
                  </div>
                ) : invoice.servicePeriodText ? (
                  <div className="flex justify-end space-x-2">
                    <span className="text-slate-500">Campaign Period:</span>
                    <span className="font-bold text-emerald-800 font-mono">{invoice.servicePeriodText}</span>
                  </div>
                ) : null}
                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Billing Entity:</span>
                  <span className="font-bold text-navy-950">{entityName}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mt-5 border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-navy-950 text-white text-xs font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 border-r border-navy-900 w-36">Broadcast Period</th>
                    <th className="py-2.5 px-4 border-r border-navy-900">Sponsorship Package &amp; Station Details</th>
                    <th className="py-2.5 px-3 border-r border-navy-900 text-center w-16">Qty</th>
                    <th className="py-2.5 px-4 text-right w-40">Total Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-3 px-3 text-xs font-mono font-medium border-r border-slate-200 align-top">
                        {item.servicePeriod || invoice.servicePeriodText || formatDate(invoiceDate)}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 align-top">
                        <div className="font-bold text-navy-950 uppercase">{item.serviceName}</div>
                        <div className="text-xs text-slate-600 whitespace-pre-line mt-0.5 font-medium">{item.description}</div>
                      </td>
                      <td className="py-3 px-3 text-xs text-center border-r border-slate-200 align-top font-mono">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-navy-950 align-top font-mono">
                        {formatLKR(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="w-full md:max-w-md text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-900">Amount in Words:</p>
                <p className="italic text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 font-medium">
                  {numberToWordsLKR(grandTotal)}
                </p>
                {specialNotes && <p className="font-bold text-navy-900">{specialNotes}</p>}
              </div>

              <div className="w-full md:w-72 border border-slate-300 rounded-lg overflow-hidden text-sm bg-slate-50">
                <div className="flex justify-between py-2 px-3 border-b border-slate-200 text-xs">
                  <span className="text-slate-600">Package Subtotal:</span>
                  <span className="font-bold text-slate-900 font-mono">{formatLKR(subtotal)}</span>
                </div>
                {vatApplicable && showVatSeparately !== false && (
                  <div className="flex justify-between py-2 px-3 border-b border-slate-200 text-xs bg-amber-50">
                    <span className="text-slate-700">VAT ({vatRate}%):</span>
                    <span className="font-bold text-amber-900 font-mono">{formatLKR(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2.5 px-3 bg-navy-950 text-white font-bold">
                  <span>{vatApplicable && showVatSeparately === false ? "Total (Including VAT):" : "Grand Total:"}</span>
                  <span className="font-mono text-base">{formatLKR(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t-2 border-slate-300 text-xs text-slate-700 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <p className="font-bold text-navy-950 mb-1 uppercase tracking-wide text-[11px]">Payment Details:</p>
                <p className="font-medium text-slate-800 leading-relaxed">
                  {finalPaymentInstructions}
                </p>
              </div>

              <div className="text-right flex flex-col items-end">
                {billingSnapshot?.signatureUrl ? (
                  <div className="w-36 h-14 relative mb-1">
                    <Image
                      src={billingSnapshot.signatureUrl}
                      alt="Authorized Signature"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-44 border-b border-slate-400 pb-1 mb-1 text-center">
                    <span className="font-script text-lg text-navy-900 italic font-semibold">Authorized</span>
                  </div>
                )}
                <p className="font-bold text-navy-950 text-xs uppercase tracking-wider">{signatoryName}</p>
                <p className="text-[10px] text-slate-500">{signatoryTitle}</p>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-200">
              {entityFooter}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TEMPLATE 4: CUSTOM COMMERCIAL INVOICE ===================== */}
      {templateKey === 'custom' && (
        <div className="flex flex-col justify-between min-h-full">
          <div>
            {/* Header: Modern Corporate */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-6">
              <div className="flex items-center space-x-4">
                <EntityLogoOrBadge
                  logoUrl={billingSnapshot?.logoUrl}
                  entityName={entityName}
                  prefix={entityPrefix}
                  size="md"
                />
                <div>
                  <h1 className="text-2xl font-black text-navy-950 tracking-tight uppercase">{entityName}</h1>
                  <p className="text-xs text-slate-500 font-medium">Smart Advertising, Production &amp; Commercial Growth</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-3xl font-extrabold text-navy-950 uppercase tracking-tight block">INVOICE</span>
                <span className="text-sm font-mono font-bold text-slate-600">#{invoiceNumber}</span>
              </div>
            </div>

            {/* Corporate Info Cards */}
            <div className="mt-6 grid grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">ISSUED BY</span>
                <p className="font-bold text-navy-950">{entityName}</p>
                <p className="text-slate-600 mt-0.5">{billingSnapshot?.address}</p>
                <p className="text-slate-600 mt-1 font-mono">{billingSnapshot?.phone}</p>
                {billingSnapshot?.vatNumber && <p className="font-mono text-slate-700">VAT: {billingSnapshot.vatNumber}</p>}
                {billingSnapshot?.brn && <p className="font-mono text-slate-700">BRN: {billingSnapshot.brn}</p>}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">BILLED TO</span>
                <p className="font-bold text-navy-950 uppercase">{clientSnapshot?.name}</p>
                <p className="text-slate-600 mt-0.5">{clientSnapshot?.address}</p>
                {clientSnapshot?.vatNumber && <p className="font-mono text-slate-700 mt-1">VAT: {clientSnapshot.vatNumber}</p>}
                {clientSnapshot?.email && <p className="text-slate-600">{clientSnapshot.email}</p>}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">INVOICE DETAILS</span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-bold font-mono">{formatDate(invoiceDate)}</span>
                </div>
                {dueDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Due Date:</span>
                    <span className="font-bold font-mono">{formatDate(dueDate)}</span>
                  </div>
                )}
                {regNo && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ref No:</span>
                    <span className="font-bold font-mono">{regNo}</span>
                  </div>
                )}
                {yourRef && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Client Ref:</span>
                    <span className="font-bold">{yourRef}</span>
                  </div>
                )}
                {includeServicePeriod && servicePeriodStart && servicePeriodEnd && (
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Service Period:</span>
                    <span className="font-bold text-emerald-800 font-mono">
                      {formatServicePeriod(servicePeriodStart, servicePeriodEnd)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs font-semibold uppercase">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Service / Task</th>
                    <th className="py-2.5 px-3 w-32">Period</th>
                    <th className="py-2.5 px-3 text-center w-16">Qty</th>
                    <th className="py-2.5 px-3 text-right w-28">Rate</th>
                    <th className="py-2.5 px-4 text-right w-36">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-3 px-3 text-xs text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-navy-950">{item.serviceName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                      </td>
                      <td className="py-3 px-3 text-xs font-mono text-slate-600">{item.servicePeriod || '-'}</td>
                      <td className="py-3 px-3 text-xs text-center font-mono">{item.quantity}</td>
                      <td className="py-3 px-3 text-xs text-right font-mono">{formatLKR(item.unitPrice)}</td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-navy-950 font-mono">
                        {formatLKR(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-4 flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="w-full md:max-w-md text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Total in Words:</p>
                <p className="italic text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 font-medium">
                  {numberToWordsLKR(grandTotal)}
                </p>
                {specialNotes && <p className="font-medium text-navy-900 mt-1">{specialNotes}</p>}
              </div>

              <div className="w-full md:w-72 border border-slate-200 rounded-lg overflow-hidden text-sm bg-slate-50">
                <div className="flex justify-between py-2 px-3 border-b border-slate-200 text-xs">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-bold font-mono">{formatLKR(subtotal)}</span>
                </div>
                {vatApplicable && showVatSeparately !== false && (
                  <div className="flex justify-between py-2 px-3 border-b border-slate-200 text-xs">
                    <span className="text-slate-600">VAT ({vatRate}%):</span>
                    <span className="font-bold font-mono">{formatLKR(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2.5 px-3 bg-slate-900 text-white font-bold">
                  <span>{vatApplicable && showVatSeparately === false ? "Total (Including VAT):" : "Grand Total:"}</span>
                  <span className="font-mono text-base">{formatLKR(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-600">
            <div className="flex justify-between items-end">
              <div className="max-w-md">
                <p className="font-bold text-navy-950 mb-0.5">Payment Instructions:</p>
                <p>{finalPaymentInstructions}</p>
              </div>
              <div className="text-right">
                {billingSnapshot?.signatureUrl ? (
                  <div className="w-36 h-12 relative mb-1 ml-auto">
                    <Image
                      src={billingSnapshot.signatureUrl}
                      alt="Authorized Signature"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-40 border-b border-slate-400 pb-1 mb-1 text-center font-script text-base text-navy-950">
                    Authorized Sign
                  </div>
                )}
                <p className="font-bold text-navy-950 uppercase text-[10px]">{signatoryName}</p>
                <p className="text-[9px] text-slate-500">{signatoryTitle}</p>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-100 mt-3">
              {entityFooter}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
