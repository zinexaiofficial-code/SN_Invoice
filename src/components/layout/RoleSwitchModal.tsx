"use client";

import React from "react";
import { UserRole } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, Zap, UserCheck, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export function RoleSwitchModal({
  isOpen,
  onClose,
  currentRole,
  onSelectRole,
}: RoleSwitchModalProps) {
  const roles: {
    id: UserRole;
    title: string;
    badge: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    description: string;
    features: string[];
    isDefault?: boolean;
  }[] = [
    {
      id: "admin",
      title: "Admin Account",
      badge: "Standard Default",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: ShieldCheck,
      iconBg: "bg-emerald-500/20 text-emerald-400",
      description: "Standard daily operational mode. Data modification, invoice issuance, and payment tracking with protected deletion safeguards.",
      features: [
        "Create, edit, duplicate, and issue invoices",
        "Record client payments & manage cheques",
        "Access system settings and billing entities",
        "Protected from accidental record deletion",
      ],
      isDefault: true,
    },
    {
      id: "super_admin",
      title: "Super Admin",
      badge: "Full Deletion Access",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
      icon: Zap,
      iconBg: "bg-rose-500/20 text-rose-400",
      description: "Elevated master administration mode. Unlocks permanent removal and total history purge options across all modules.",
      features: [
        "Delete invoices option-wise or in multi-select batches",
        "Total monthly history purge with safety verification",
        "Permanent removal for services, media channels, & clients",
        "Delete cheques and override billing entity protections",
      ],
    },
    {
      id: "staff",
      title: "Staff Account",
      badge: "Restricted View",
      badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
      icon: UserCheck,
      iconBg: "bg-blue-500/20 text-blue-400",
      description: "Staff level view for daily entry and status viewing. Administrative settings are hidden.",
      features: [
        "Generate and view invoices",
        "Record payments & view cheque calendar",
        "Settings & sensitive configuration hidden",
      ],
    },
  ];

  const handleSelect = (roleId: UserRole) => {
    onSelectRole(roleId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl">
        <DialogHeader className="bg-navy-950 text-white p-6 pb-5">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Zap className="w-4 h-4" />
            <span>Role &amp; Permissions Manager</span>
          </div>
          <DialogTitle className="text-xl font-black text-white tracking-tight mt-1">
            Switch Operational Role
          </DialogTitle>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Choose your working role. <strong className="text-white">Admin Account</strong> is the default safe mode. Switch to <strong className="text-rose-300">Super Admin</strong> whenever you need to permanently remove or bulk purge records.
          </p>
        </DialogHeader>

        <div className="p-6 space-y-3.5 bg-slate-50/50">
          {roles.map((r) => {
            const Icon = r.icon;
            const isSelected = currentRole === r.id;

            return (
              <div
                key={r.id}
                onClick={() => handleSelect(r.id)}
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all cursor-pointer bg-white text-left",
                  isSelected
                    ? r.id === "super_admin"
                      ? "border-rose-500 ring-2 ring-rose-200 shadow-md bg-rose-50/30"
                      : "border-navy-900 ring-2 ring-navy-100 shadow-md"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", r.iconBg)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-navy-950">{r.title}</h4>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", r.badgeClass)}>
                          {r.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-normal">
                        {r.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    {isSelected ? (
                      <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white", r.id === "super_admin" ? "bg-rose-600" : "bg-navy-950")}>
                        <Check className="w-4 h-4 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-transparent hover:border-slate-400">
                        •
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-500">
                  {r.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isSelected ? (r.id === "super_admin" ? "bg-rose-500" : "bg-emerald-500") : "bg-slate-300")} />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="flex items-center space-x-1 text-slate-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>You can switch back to Admin Account at any time.</span>
            </span>
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 hover:text-navy-950"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
