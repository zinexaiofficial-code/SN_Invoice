"use client";

import React, { useRef, useState, useMemo } from "react";
import {
  Printer,
  Download,
  X,
  Building2,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Tv,
  Radio,
  Calendar,
  DollarSign
} from "lucide-react";
import {
  SupplierPayable,
  BillingEntity,
  Supplier,
  MediaSchedule,
  Client
} from "@/types";
import { useDatabase } from "@/context/DatabaseContext";
import { numberToWordsLKR } from "@/lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface SupplierStatementModalProps {
  payable: SupplierPayable;
  onClose: () => void;
}

export function SupplierStatementModal({ payable, onClose }: SupplierStatementModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { billingEntities, suppliers, schedules, clients, branding } = useDatabase();

  // Resolve Billing Entity
  const billingEntity = useMemo(() => {
    if (payable.billingEntityId) {
      const found = billingEntities.find((e) => e.id === payable.billingEntityId);
      if (found) return found;
    }
    return billingEntities[0];
  }, [payable.billingEntityId, billingEntities]);

  // Resolve Supplier
  const supplier = useMemo(() => {
    if (payable.supplierId) {
      const found = suppliers.find((s) => s.id === payable.supplierId);
      if (found) return found;
    }
    return null;
  }, [payable.supplierId, suppliers]);

  // Resolve Schedule if linked
  const schedule = useMemo(() => {
    if (payable.mediaScheduleId) {
      return schedules.find((s) => s.id === payable.mediaScheduleId) || null;
    }
    return null;
  }, [payable.mediaScheduleId, schedules]);

  // Resolve Client
  const client = useMemo(() => {
    const cId = payable.clientId || schedule?.clientId;
    if (cId) {
      return clients.find((c) => c.id === cId) || null;
    }
    return null;
  }, [payable.clientId, schedule?.clientId, clients]);

  const agencyName =
    billingEntity?.displayName ||
    billingEntity?.name ||
    branding?.businessName ||
    "SN ADVERTISING";

  const agencyLogoUrl =
    billingEntity?.logoUrl ||
    branding?.logoUrl ||
    "/logo.png";

  const amountInWords = useMemo(() => {
    return numberToWordsLKR(payable.totalAmount);
  }, [payable.totalAmount]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxAvailableWidth = pdfWidth - margin * 2;
      const maxAvailableHeight = pdfHeight - margin * 2;

      const scale = Math.min(
        maxAvailableWidth / canvas.width,
        maxAvailableHeight / canvas.height
      );

      const finalWidth = canvas.width * scale;
      const finalHeight = canvas.height * scale;
      const posX = margin + (maxAvailableWidth - finalWidth) / 2;
      const posY = margin + (maxAvailableHeight - finalHeight) / 2;

      pdf.addImage(imgData, "PNG", posX, posY, finalWidth, finalHeight);
      pdf.save(`Supplier_Statement_${payable.payableNumber || "export"}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF. You can also use the browser Print button.");
    } finally {
      setIsExporting(false);
    }
  };

  const transactions = payable.transactions || payable.payments || [];
  const validTransactions = transactions.filter((t) => t.status !== "voided" && t.status !== "void");

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-between overflow-y-auto p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static">
      {/* Top action toolbar (hidden on print) */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-t-xl print:hidden shadow-lg border border-slate-800">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs tracking-wide">
            Supplier Statement & Voucher: {payable.payableNumber}
          </span>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
            {payable.status.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? "Generating..." : "Download PDF"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Statement Document (Printable A4 Target) */}
      <div className="w-full max-w-4xl mx-auto bg-white rounded-b-xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none">
        <div
          ref={printRef}
          className="p-8 sm:p-10 bg-white text-slate-900 font-sans print:p-6"
          style={{ minHeight: "297mm", boxSizing: "border-box" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
            <div>
              <div className="flex items-center space-x-3">
                {agencyLogoUrl && (
                  <img
                    src={agencyLogoUrl}
                    alt={agencyName}
                    className="h-12 w-auto object-contain max-w-[160px]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                )}
                <div>
                  <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight">
                    {agencyName}
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {billingEntity?.legalName || "Advertising & Media Agency"}
                  </p>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-slate-600 space-y-0.5 leading-relaxed">
                {billingEntity?.address && <p>{billingEntity.address}</p>}
                <p>
                  {billingEntity?.phone && <span>Tel: {billingEntity.phone} &bull; </span>}
                  {billingEntity?.email && <span>Email: {billingEntity.email} &bull; </span>}
                  {billingEntity?.vatNumber && <span>Tax/VAT: {billingEntity.vatNumber}</span>}
                </p>
              </div>
            </div>

            {/* Document Title & Reference */}
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                Payment Voucher & Statement
              </span>
              <div className="mt-3 text-xs space-y-1">
                <div>
                  <span className="text-slate-400">VOUCHER REF: </span>
                  <span className="font-mono font-bold text-slate-900">{payable.payableNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400">BILL DATE: </span>
                  <span className="font-medium text-slate-800">{payable.billDate}</span>
                </div>
                <div>
                  <span className="text-slate-400">PAYMENT DUE: </span>
                  <span className="font-medium text-rose-700">{payable.dueDate}</span>
                </div>
                {payable.supplierInvoiceNumber && (
                  <div>
                    <span className="text-slate-400">SUPPLIER INV: </span>
                    <span className="font-mono text-slate-800">{payable.supplierInvoiceNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Supplier & Campaign Section */}
          <div className="grid grid-cols-2 gap-6 py-5 border-b border-slate-200">
            {/* Left: Supplier Details */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                PAYEE / SUPPLIER DETAILS
              </span>
              <h3 className="font-bold text-slate-900 text-sm">
                {supplier?.name || payable.supplierSnapshot?.name || "Supplier Name"}
              </h3>
              <p className="text-slate-600">
                {supplier?.address || "Address on record"}
              </p>
              <div className="pt-1 text-[11px] text-slate-600 space-y-0.5">
                {supplier?.contactPerson && (
                  <p>Attn: <strong>{supplier.contactPerson}</strong></p>
                )}
                {supplier?.phone && <p>Phone: {supplier.phone}</p>}
                {supplier?.email && <p>Email: {supplier.email}</p>}
                {supplier?.taxNumber && <p>Tax ID: {supplier.taxNumber}</p>}
              </div>

              {/* Bank Details */}
              {(supplier?.defaultBank || supplier?.defaultAccountNo) && (
                <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700">
                  <span className="font-bold block text-[10px] uppercase text-slate-500">
                    Settlement Bank Account:
                  </span>
                  <span>
                    {supplier.defaultBank} &bull; A/C: <strong>{supplier.defaultAccountNo}</strong>
                    {supplier.defaultBranch ? ` (${supplier.defaultBranch})` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Media Schedule & Campaign Information */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                CAMPAIGN & BROADCAST REFERENCE
              </span>
              {schedule ? (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Schedule Ref:</span>
                    <span className="font-mono font-bold text-slate-900">{schedule.scheduleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Advertiser / Client:</span>
                    <span className="font-semibold text-slate-800">
                      {client?.name || client?.companyName || "Client"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Campaign:</span>
                    <span className="text-slate-800">{schedule.campaignName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Channel / Medium:</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {schedule.mediaChannelName} ({schedule.mediaType.toUpperCase()})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Broadcast Period:</span>
                    <span className="text-slate-800">
                      {schedule.startDate} &rarr; {schedule.endDate} ({schedule.totalSpots} spots)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px]">
                  <p className="font-semibold text-slate-800">General Expense / Standalone Bill</p>
                  <p className="text-slate-500 mt-1">
                    {payable.description || "General media production and broadcaster charges."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bill Items / Commercial Breakdown Table */}
          <div className="py-5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Bill Particulars & Commercial Breakdown
            </h4>
            <table className="w-full text-xs text-left border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2.5">DESCRIPTION OF BROADCAST / SERVICES</th>
                  <th className="p-2.5 text-center">CHANNEL</th>
                  <th className="p-2.5 text-right">AMOUNT (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2.5">
                    <span className="font-semibold text-slate-900 block">
                      {payable.description || `Broadcaster charges for ${payable.campaignName || "broadcast campaign"}`}
                    </span>
                    {payable.supplierInvoiceNumber && (
                      <span className="text-[11px] text-slate-500 block">
                        Vendor Bill Ref: #{payable.supplierInvoiceNumber}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-center uppercase font-bold text-slate-700">
                    {payable.channelName || schedule?.mediaChannelName || "-"}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                    Rs. {payable.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>

                {payable.discount > 0 && (
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right text-slate-600">
                      Less: Supplier Trade Discount
                    </td>
                    <td className="p-2.5 text-right font-mono text-rose-600">
                      - Rs. {payable.discount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}

                {payable.taxAmount > 0 && (
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right text-slate-600">
                      Add: VAT / Applicable Tax ({payable.taxRate}%)
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-800">
                      + Rs. {payable.taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}

                <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <td colSpan={2} className="p-2.5 text-right text-slate-900 uppercase">
                    Total Payable Amount:
                  </td>
                  <td className="p-2.5 text-right font-mono text-slate-900 text-sm">
                    Rs. {payable.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Amount in words */}
            <div className="mt-2 text-[11px] text-slate-600 italic">
              <strong>Amount in Words:</strong> {amountInWords}
            </div>
          </div>

          {/* Payment Remittance Ledger */}
          <div className="py-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Payment & Settlement Transactions History
            </h4>

            {validTransactions.length === 0 ? (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded text-center text-xs text-amber-800 font-medium">
                No payments recorded yet against this bill. Full balance remains outstanding.
              </div>
            ) : (
              <table className="w-full text-xs text-left border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2">DATE</th>
                    <th className="p-2">METHOD</th>
                    <th className="p-2">TRANSACTION / CHEQUE #</th>
                    <th className="p-2">PAID BY</th>
                    <th className="p-2 text-right">PAID (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {validTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="p-2 text-slate-800">{tx.paymentDate}</td>
                      <td className="p-2 uppercase text-slate-700">
                        {tx.paymentMethod.replace("_", " ")}
                      </td>
                      <td className="p-2 text-slate-800">{tx.referenceNumber || "-"}</td>
                      <td className="p-2 text-slate-600">{tx.paidBy || "Authorized"}</td>
                      <td className="p-2 text-right font-bold text-emerald-700">
                        Rs. {tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Financial Summary Box */}
            <div className="mt-4 flex justify-end">
              <div className="w-72 bg-slate-50 border border-slate-300 rounded p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Bill Amount:</span>
                  <span className="font-mono font-bold text-slate-900">
                    Rs. {payable.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Settled to Date:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    Rs. {payable.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-300 font-black text-slate-900 text-sm">
                  <span>Balance Outstanding:</span>
                  <span className="font-mono text-rose-700">
                    Rs. {payable.outstandingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures & Authorization Block */}
          <div className="mt-10 pt-6 border-t-2 border-slate-200 grid grid-cols-4 gap-4 text-center text-xs">
            <div className="space-y-6">
              <div className="border-b border-slate-400 h-10"></div>
              <div>
                <p className="font-bold text-slate-900">Prepared By</p>
                <p className="text-[10px] text-slate-500">Accounts Executive</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-b border-slate-400 h-10"></div>
              <div>
                <p className="font-bold text-slate-900">Checked By</p>
                <p className="text-[10px] text-slate-500">Senior Accountant</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-b border-slate-400 h-10"></div>
              <div>
                <p className="font-bold text-slate-900">Authorized Signatory</p>
                <p className="text-[10px] text-slate-500">{agencyName}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-b border-slate-400 h-10"></div>
              <div>
                <p className="font-bold text-slate-900">Payee Acknowledgment</p>
                <p className="text-[10px] text-slate-500">Signature & Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
