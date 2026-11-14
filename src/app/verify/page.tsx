"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Search, Shield, ArrowRight } from "lucide-react";

export default function VerificationLandingPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    router.push(`/verify/${encodeURIComponent(token.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900 font-sans">
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
            <span>Official Authenticity Service</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-16 space-y-6">
        <Card className="shadow-xl rounded-2xl border-slate-200 overflow-hidden bg-white">
          <div className="p-8 text-center bg-gradient-to-b from-navy-950 to-slate-900 text-white space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md mx-auto flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Verify Invoice Authenticity</h1>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Enter the unique verification reference token or invoice number printed on the bottom of your official document.
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Verification Reference or Invoice Number
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="e.g. sn-v-9f8a2b3c4d5e or SN-23459"
                    className="font-mono text-sm pl-10 h-11"
                    required
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Found under &quot;Verify Document Authenticity&quot; or next to the QR code.
                </span>
              </div>

              <Button
                type="submit"
                className="w-full bg-navy-950 hover:bg-navy-900 text-white font-bold h-11 flex items-center justify-center space-x-2 shadow-sm"
              >
                <span>Verify Document</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

