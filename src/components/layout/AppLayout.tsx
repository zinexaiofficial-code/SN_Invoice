"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  FileText,
  PlusCircle,
  CalendarDays,
  BarChart3,
  Layers,
  Settings,
  ShieldCheck,
  UserCheck,
  Menu,
  X,
  Wifi,
  WifiOff,
  ChevronRight,
  Sparkles,
  CreditCard
} from "lucide-react";
import { storage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<'admin' | 'staff'>('admin');
  const [isOnline, setIsOnline] = useState(true);
  const [branding, setBranding] = useState({ businessName: 'SN Advertising', logoUrl: '/logo.png' });

  useEffect(() => {
    setRole(storage.getUserRole());
    const b = storage.getBranding();
    if (b) setBranding({ businessName: b.businessName, logoUrl: b.logoUrl || '/logo.png' });

    // Authoritative backend database synchronization
    storage.syncWithServer();
    storage.syncFromSupabase();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const toggleRole = () => {
    const newRole = role === 'admin' ? 'staff' : 'admin';
    setRole(newRole);
    storage.setUserRole(newRole);
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Invoices", href: "/invoices", icon: FileText },
    { name: "Cheque Management", href: "/cheques", icon: CreditCard },
    { name: "Create Invoice", href: "/invoices/new", icon: PlusCircle, isPrimary: true },
    { name: "Monthly History", href: "/history", icon: CalendarDays },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Services & Templates", href: "/services", icon: Layers },
    ...(role === 'admin' ? [{ name: "Settings", href: "/settings", icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 antialiased font-sans">
      {/* Top Banner on Mobile */}
      <div className="md:hidden bg-navy-950 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white p-0.5 flex items-center justify-center">
            <Image src={branding.logoUrl} alt="Logo" width={32} height={32} className="object-contain" priority />
          </div>
          <div>
            <span className="font-bold text-base tracking-wide text-white">SN Invoice</span>
            <span className="block text-[10px] text-slate-300 -mt-0.5">Multi-Entity Invoicing</span>
          </div>
        </Link>
        <div className="flex items-center space-x-2">
          <NotificationBell />
          <button
            onClick={toggleRole}
            className="text-xs bg-navy-900 border border-navy-700 px-2 py-1 rounded text-slate-200 flex items-center space-x-1"
            title="Toggle between Admin and Staff mode"
          >
            {role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <UserCheck className="w-3.5 h-3.5 text-blue-400" />}
            <span className="capitalize text-[11px] font-medium">{role}</span>
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-200 hover:bg-navy-900"
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-navy-950 text-white shrink-0 border-r border-navy-900 shadow-xl sticky top-0 h-screen select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-navy-900 flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-md">
            <Image src={branding.logoUrl} alt="Logo" width={40} height={40} className="object-contain" priority />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-extrabold text-base tracking-tight text-white leading-tight">SN INVOICE</h1>
            <p className="text-xs text-slate-300 font-medium truncate">Multi-Entity Invoicing</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 pb-2">
          <Link
            href="/invoices/new"
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-5 h-5" />
            <span>New Invoice</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href) && item.href !== "/invoices/new");
            if (item.isPrimary) return null; // We already have the prominent button

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                  isActive
                    ? "bg-navy-800 text-white font-semibold shadow-sm border border-navy-700/60"
                    : "text-slate-300 hover:bg-navy-900 hover:text-white"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-white")} />
                <span className="flex-1">{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 text-emerald-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer info & Role switcher */}
        <div className="p-4 border-t border-navy-900 space-y-3 bg-navy-950/80">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center space-x-1.5">
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online (PWA)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Offline Mode</span>
                </>
              )}
            </span>
            <span className="text-[11px] font-mono text-slate-400">v1.0 LKR</span>
          </div>

          <div className="bg-navy-900 rounded-lg p-2.5 flex items-center justify-between border border-navy-800">
            <div className="flex items-center space-x-2">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", role === 'admin' ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300")}>
                {role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-white capitalize">{role} Account</p>
                <p className="text-[10px] text-slate-400">SN Advertising</p>
              </div>
            </div>
            <button
              onClick={toggleRole}
              className="text-[11px] text-slate-300 hover:text-white bg-navy-800 hover:bg-navy-700 px-2 py-1 rounded transition-colors"
              title="Switch role for testing"
            >
              Switch
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-navy-950 text-white flex flex-col p-6 animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between pb-6 border-b border-navy-900">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center">
                <Image src={branding.logoUrl} alt="Logo" width={36} height={36} className="object-contain" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-white">SN INVOICE</h2>
                <p className="text-xs text-slate-400">SN Advertising</p>
              </div>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-300 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="py-4">
            <Link
              href="/invoices/new"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg"
            >
              <PlusCircle className="w-5 h-5" />
              <span>New Invoice</span>
            </Link>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              if (item.isPrimary) return null; // Only one New Invoice action in mobile menu
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium",
                    isActive ? "bg-navy-800 text-white font-bold" : "text-slate-300 hover:bg-navy-900"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-emerald-400" : "text-slate-400")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-navy-50 text-navy-900 rounded-md border border-navy-100">
              SN INVOICE PWA
            </span>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">
              Multi-Entity & Cheque Reminder System
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-navy-950 rounded-xl px-1 py-0.5 shadow-sm">
              <NotificationBell />
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <button
              onClick={toggleRole}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center space-x-1.5 transition-all shadow-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              title="Click to switch role"
            >
              {role === 'admin' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <UserCheck className="w-4 h-4 text-blue-600" />
              )}
              <span className="capitalize font-semibold">{role} View</span>
            </button>
          </div>
        </header>

        {/* Offline Banner if offline */}
        {!isOnline && (
          <div className="bg-amber-500 text-navy-950 font-medium px-4 py-2 text-xs text-center flex items-center justify-center space-x-2 shadow-sm">
            <WifiOff className="w-4 h-4" />
            <span>You are currently in offline mode. Changes are saved locally and will be preserved.</span>
          </div>
        )}

        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation (as requested in Section 2) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors",
            pathname === "/" ? "text-navy-900 font-bold" : "text-slate-500"
          )}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/clients"
          className={cn(
            "flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors",
            pathname.startsWith("/clients") ? "text-navy-900 font-bold" : "text-slate-500"
          )}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Clients</span>
        </Link>
        <Link
          href="/invoices/new"
          className="flex flex-col items-center -mt-5 bg-gradient-to-tr from-emerald-600 to-teal-600 text-white p-3 rounded-full shadow-lg shadow-emerald-900/30 active:scale-95 transition-transform"
        >
          <PlusCircle className="w-6 h-6" />
          <span className="sr-only">New Invoice</span>
        </Link>
        <Link
          href="/history"
          className={cn(
            "flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors",
            pathname === "/history" ? "text-navy-900 font-bold" : "text-slate-500"
          )}
        >
          <CalendarDays className="w-5 h-5 mb-0.5" />
          <span>History</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center py-1 px-2 text-[10px] font-medium text-slate-500"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}

