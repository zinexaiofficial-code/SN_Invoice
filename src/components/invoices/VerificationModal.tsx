"use client";

import React, { useState } from "react";
import { Invoice, VerificationResult } from "@/types";
import { storage } from "@/lib/storage";
import { getVerificationUrl } from "@/lib/crypto";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeDisplay } from "@/lib/qrcode";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Building2,
  UserCheck,
  Clock,
  Hash,
  XCircle,
} from "lucide-react";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export function VerificationModal({ isOpen, onClose, invoice }: VerificationModalProps) {
  const [copied, setCopied] = useState(false);

  // Fetch real server/storage verification record
  const result: VerificationResult = storage.verifyInvoice(
    invoice.verificationToken || invoice.id || invoice.invoiceNumber
  );

  const verificationUrl = getVerificationUrl(invoice.verificationToken || invoice.id);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const isSuccess = result.status === "valid";
  const isVoided = result.status === "voided" || invoice.status === "void";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl bg-white shadow-2xl border-slate-200">
        <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                isVoided
                  ? "bg-rose-100 text-rose-700"
                  : isSuccess
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {isVoided ? (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              ) : isSuccess ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-navy-950 flex items-center space-x-2">
                <span>Document Authenticity Verification</span>
                <Badge
                  variant={isVoided ? "destructive" : isSuccess ? "success" : "warning"}
                  className="text-[10px] font-bold uppercase tracking-wider"
                >
                  {isVoided ? "Cancelled / Voided" : isSuccess ? "Verified Authentic" : "Unverified"}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Official backend verification record for Invoice #{invoice.invoiceNumber}.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 text-xs text-slate-700">
          {/* Main Verification Statement Banner */}
          <div
            className={`p-4 rounded-xl border leading-relaxed ${
              isVoided
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : isSuccess
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <p className="font-semibold text-sm">
              {result.message}
            </p>
            <p className="text-[11px] mt-1 text-slate-500">
              Application-level digital approval recorded in SN INVOICE audit ledger.
            </p>
          </div>

          {/* Details Grid & QR Code */}
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1 space-y-2.5 w-full">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Invoice Number:</span>
                <span className="font-mono font-bold text-navy-950 text-xs">{invoice.invoiceNumber}</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Issuing Entity:</span>
                <span className="font-bold text-slate-900 text-xs">{result.issuingCompany}</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Authorized Signatory:</span>
                <span className="font-bold text-navy-950 text-xs">
                  {result.signatoryName} <span className="text-slate-500 font-normal">({result.signatoryDesignation})</span>
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Issue Date:</span>
                <span className="font-medium text-slate-800">{result.invoiceIssueDate}</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Approval Timestamp:</span>
                <span className="font-mono font-semibold text-slate-800 text-[11px]">
                  {result.approvalDate} — {result.approvalTime}
                </span>
              </div>
            </div>

            {/* QR Code Card */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-2xs">
              <QRCodeDisplay value={verificationUrl} size={88} />
              <span className="text-[10px] font-bold text-slate-500 mt-2">Scan to Verify</span>
            </div>
          </div>

          {/* Cryptographic Hash & Token Reference */}
          <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200 font-mono text-[10px] space-y-1.5 text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Verification Reference:</span>
              <span className="font-bold text-navy-950 truncate max-w-[280px]">
                {invoice.verificationToken || "Pending Issuance"}
              </span>
            </div>
            {invoice.canonicalHash && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Canonical Snapshot Hash:</span>
                <span className="truncate max-w-[280px] text-slate-700" title={invoice.canonicalHash}>
                  {invoice.canonicalHash}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="w-full sm:w-auto text-xs font-semibold flex items-center space-x-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
            <span>{copied ? "Link Copied!" : "Copy Verification Link"}</span>
          </Button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => window.open(verificationUrl, "_blank")}
              className="w-full sm:w-auto bg-navy-950 text-white hover:bg-navy-900 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Public Verification Page</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

