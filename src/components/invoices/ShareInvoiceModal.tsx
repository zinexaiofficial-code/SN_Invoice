"use client";

import React, { useState } from "react";
import { Invoice, ShareChannel } from "@/types";
import { storage } from "@/lib/storage";
import { formatLKR, formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Mail, CheckCircle2, Send, ExternalLink } from "lucide-react";

interface ShareInvoiceModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onShared?: (updatedInvoice: Invoice) => void;
}

export function ShareInvoiceModal({ invoice, isOpen, onClose, onShared }: ShareInvoiceModalProps) {
  const [channel, setChannel] = useState<ShareChannel>("whatsapp");
  const [recipient, setRecipient] = useState<string>(
    invoice.clientSnapshot?.whatsapp || invoice.clientSnapshot?.mobile || invoice.clientSnapshot?.email || ""
  );
  const [notes, setNotes] = useState<string>("");
  const [sentAtDate, setSentAtDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const defaultMessage = `Dear ${invoice.clientSnapshot?.name || "Client"},\n\nPlease find your invoice #${invoice.invoiceNumber} from SN Advertising.\n\nDate: ${formatDate(invoice.invoiceDate)}\nTotal Amount: ${formatLKR(invoice.grandTotal)}\n${invoice.advancePercentage ? `Advance: ${invoice.advancePercentage}%\n` : ''}\nThank you for your business!`;

  const handleShare = () => {
    let deliveryStatus: 'sent' | 'delivery_confirmed' = 'sent';

    if (channel === "whatsapp") {
      const cleanPhone = recipient.replace(/[^0-9]/g, "");
      const encodedMsg = encodeURIComponent(defaultMessage);
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
      window.open(waUrl, "_blank");
      deliveryStatus = 'sent';
    } else if (channel === "email") {
      const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(
        `Invoice #${invoice.invoiceNumber} from SN Advertising`
      )}&body=${encodeURIComponent(defaultMessage)}`;
      window.open(mailtoUrl, "_blank");
      deliveryStatus = 'sent';
    } else if (channel === "manual") {
      deliveryStatus = 'delivery_confirmed';
    }

    const updated = storage.recordShare(invoice.id, {
      channel,
      recipient,
      deliveryStatus,
      notes: notes || `Sent via ${channel} on ${sentAtDate}`
    });

    if (onShared) onShared(updated);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-navy-950">
            <Send className="w-5 h-5 text-emerald-600" />
            <span>Share Invoice #{invoice.invoiceNumber}</span>
          </DialogTitle>
          <DialogDescription>
            Record sending and share invoice directly with {invoice.clientSnapshot?.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Channel selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setChannel("whatsapp");
                setRecipient(invoice.clientSnapshot?.whatsapp || invoice.clientSnapshot?.mobile || "");
              }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 text-xs font-semibold transition-all ${
                channel === "whatsapp"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm"
                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setChannel("email");
                setRecipient(invoice.clientSnapshot?.email || "");
              }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 text-xs font-semibold transition-all ${
                channel === "email"
                  ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm"
                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Mail className="w-5 h-5 text-blue-600" />
              <span>Email</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setChannel("manual");
                setRecipient("In-Person / Postal Handover");
              }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 text-xs font-semibold transition-all ${
                channel === "manual"
                  ? "border-navy-800 bg-navy-50 text-navy-950 shadow-sm"
                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-navy-800" />
              <span>Mark as Sent</span>
            </button>
          </div>

          <div className="space-y-1">
            <Label htmlFor="recipient">
              {channel === "whatsapp" ? "WhatsApp Number" : channel === "email" ? "Email Address" : "Handover / Delivery Method"}
            </Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={channel === "whatsapp" ? "+94 77 123 4567" : channel === "email" ? "client@example.lk" : "Printed copy delivered"}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sentDate">Sent Date</Label>
            <Input
              id="sentDate"
              type="date"
              value={sentAtDate}
              onChange={(e) => setSentAtDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes / Dispatch Reference (Optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Handed over to accountant"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Message Preview:</p>
            <p className="whitespace-pre-line font-mono text-[11px] text-slate-700">{defaultMessage}</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleShare} className="bg-navy-950 text-white hover:bg-navy-900">
            {channel === "whatsapp" ? (
              <>
                <ExternalLink className="w-4 h-4 mr-1.5" />
                <span>Open WhatsApp &amp; Record</span>
              </>
            ) : channel === "email" ? (
              <>
                <ExternalLink className="w-4 h-4 mr-1.5" />
                <span>Send Email &amp; Record</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                <span>Confirm &amp; Mark as Sent</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

