"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { storage } from "@/lib/storage";
import { VerificationResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Building2,
  FileText,
  UserCheck,
  Calendar,
  Clock,
  ExternalLink,
  Search,
  CheckCircle2,
  Shield,
  ArrowLeft,
  Lock,
} from "lucide-react";

export default function PublicInvoiceVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const tokenParam = (params.token as string) || "";

  const [searchQuery, setSearchQuery] = useState(tokenParam);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tokenParam) {
      setIsLoading(true);
      const res = storage.verifyInvoice(tokenParam);
      setResult(res);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [tokenParam]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/verify/${encodeURIComponent(searchQuery.trim())}`);
  };

  const isSuccess = result?.status === "valid";
  const isVoided = result?.status === "voided";
  const isSuperseded = result?.status === "superseded";
  const isInvalid = !result || result.status === "invalid";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900 font-sans">
      {/* Top Navigation Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-navy-950 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-sm">
              SN
            </div>
            <div>
              <span className="font-extrabold text-navy-950 text-sm tracking-tight block">
                SN INVOICE
              </span>
              <span className="text-[10px] text-slate-500 font-semibold block leading-none">
                Document Verification Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Official Authenticity Service</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 py-8 md:py-12 space-y-6">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-3 border-navy-950 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold">Verifying document credentials against backend ledger...</p>
          </div>
        ) : isSuccess ? (
          /* ================= SUCCESS STATE: INVOICE VERIFIED ================= */
          <Card className="border-emerald-200 shadow-xl overflow-hidden rounded-2xl bg-white">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 sm:p-8 text-white text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md mx-auto flex items-center justify-center shadow-inner">
                <ShieldCheck className="w-9 h-9 text-white" />
              </div>
              <Badge className="bg-emerald-950/40 text-emerald-100 hover:bg-emerald-950/40 border-emerald-400/30 text-xs px-3 py-1 font-bold uppercase tracking-wider">
                Official Document Verified
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Invoice Verified
              </h1>
              <p className="text-emerald-50 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed">
                {result.message}
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Limited Public Disclosure Notice */}
              <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Only public authenticity credentials are disclosed. Private client line items and banking details remain protected.
                </span>
              </div>

              {/* Verified Metadata Table */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                <div className="flex justify-between items-center p-3.5 bg-slate-50/50">
                  <span className="text-slate-500 font-semibold flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Invoice Number</span>
                  </span>
                  <span className="font-mono font-black text-navy-950 text-sm">{result.invoiceNumber}</span>
                </div>

                <div className="flex justify-between items-center p-3.5">
                  <span className="text-slate-500 font-semibold flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Issuing Company</span>
                  </span>
                  <div className="text-right">
                    <span className="font-extrabold text-navy-950 block">{result.issuingCompany}</span>
                    {result.issuingLegalName && result.issuingLegalName !== result.issuingCompany && (
                      <span className="text-[10px] text-slate-500 block">{result.issuingLegalName}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 bg-slate-50/50">
                  <span className="text-slate-500 font-semibold flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Authorized Signatory</span>
                  </span>
                  <div className="text-right">
                    <span className="font-extrabold text-navy-950 block">{result.signatoryName}</span>
                    <span className="text-[10px] text-slate-500 block">{result.signatoryDesignation}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5">
                  <span className="text-slate-500 font-semibold flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Invoice Issue Date</span>
                  </span>
                  <span className="font-semibold text-slate-800">{result.invoiceIssueDate}</span>
                </div>

                <div className="flex justify-between items-center p-3.5 bg-slate-50/50">
                  <span className="text-slate-500 font-semibold flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Digital Approval Timestamp</span>
                  </span>
                  <span className="font-mono font-medium text-slate-800 text-right">
                    {result.approvalDate} at {result.approvalTime}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3.5">
                  <span className="text-slate-500 font-semibold">Verification Status</span>
                  <span className="text-emerald-700 font-black flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Officially Issued &amp; Authentic</span>
                  </span>
                </div>
              </div>

              {/* Cryptographic Reference Footer */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Verification Reference:</span>
                  <span className="font-bold text-navy-950">{result.verificationToken}</span>
                </div>
                {result.canonicalHash && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Canonical Integrity Hash:</span>
                    <span className="truncate max-w-[260px] text-slate-700" title={result.canonicalHash}>
                      {result.canonicalHash}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : isVoided ? (
          /* ================= VOIDED STATE: CANCELLED INVOICE ================= */
          <Card className="border-rose-200 shadow-xl overflow-hidden rounded-2xl bg-white">
            <div className="bg-gradient-to-r from-rose-600 to-red-700 p-6 sm:p-8 text-white text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md mx-auto flex items-center justify-center shadow-inner">
                <AlertTriangle className="w-9 h-9 text-white" />
              </div>
              <Badge className="bg-rose-950/40 text-rose-100 hover:bg-rose-950/40 border-rose-400/30 text-xs px-3 py-1 font-bold uppercase tracking-wider">
                Document Revoked
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Invoice Cancelled / Voided
              </h1>
              <p className="text-rose-50 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed">
                {result.message}
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                <div className="flex justify-between items-center p-3.5 bg-slate-50/50">
                  <span className="text-slate-500 font-semibold">Invoice Number</span>
                  <span className="font-mono font-bold text-navy-950">{result.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center p-3.5">
                  <span className="text-slate-500 font-semibold">Issuing Company</span>
                  <span className="font-bold text-slate-900">{result.issuingCompany}</span>
                </div>
                <div className="flex justify-between items-center p-3.5 bg-slate-50/50">
                  <span className="text-slate-500 font-semibold">Original Issue Date</span>
                  <span className="font-medium text-slate-700">{result.invoiceIssueDate}</span>
                </div>
                <div className="flex justify-between items-center p-3.5">
                  <span className="text-slate-500 font-semibold">Current Status</span>
                  <span className="text-rose-600 font-black uppercase">Void / Not Payable</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isSuperseded ? (
          /* ================= SUPERSEDED STATE ================= */
          <Card className="border-amber-200 shadow-xl overflow-hidden rounded-2xl bg-white">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6 sm:p-8 text-white text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md mx-auto flex items-center justify-center shadow-inner">
                <AlertTriangle className="w-9 h-9 text-white" />
              </div>
              <Badge className="bg-amber-950/40 text-amber-100 hover:bg-amber-950/40 border-amber-400/30 text-xs px-3 py-1 font-bold uppercase tracking-wider">
                Document Superseded
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Original Invoice Superseded
              </h1>
              <p className="text-amber-50 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed">
                {result.message}
              </p>
            </div>
          </Card>
        ) : (
          /* ================= INVALID / NOT FOUND STATE ================= */
          <Card className="border-slate-300 shadow-xl overflow-hidden rounded-2xl bg-white">
            <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6 sm:p-8 text-white text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md mx-auto flex items-center justify-center shadow-inner">
                <XCircle className="w-9 h-9 text-rose-400" />
              </div>
              <Badge className="bg-slate-950/50 text-slate-200 border-slate-600 text-xs px-3 py-1 font-bold uppercase tracking-wider">
                Verification Failed
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Verification Unsuccessful
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed">
                We could not verify this document using the provided reference.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1.5 leading-relaxed">
                <p className="font-bold">Important Notice:</p>
                <p>
                  The reference code does not match any official invoice issued by SN Advertising or its affiliated billing entities. Please check the reference code at the bottom of the invoice or scan the QR code again.
                </p>
              </div>

              {/* Manual Lookup Input */}
              <form onSubmit={handleManualSearch} className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Verify Another Document Reference
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter reference e.g. sn-v-9f8a2b3c4d5e or SN-23459"
                    className="font-mono text-xs"
                  />
                  <Button type="submit" className="bg-navy-950 hover:bg-navy-900 text-white text-xs font-bold shrink-0">
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    <span>Verify</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Informational Security Notice */}
        <div className="text-center text-[11px] text-slate-400 space-y-1.5 pt-4">
          <p>
            Official SN INVOICE Online Verification System — SN Advertising &amp; Affiliated Entities.
          </p>
          <p>
            Need assistance verifying an invoice? Contact <a href="mailto:snadvertising@hotmail.com" className="text-navy-950 font-semibold underline">snadvertising@hotmail.com</a>.
          </p>
        </div>
      </main>
    </div>
  );
}

