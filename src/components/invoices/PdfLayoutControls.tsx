"use client";

import React, { useState } from "react";
import {
  InvoicePdfFormat,
  InvoiceTemplateKey,
  LayoutDensity,
  PageFitMode,
  PdfTypographySettings,
  InvoiceBlocksConfig,
} from "@/types";
import { RECOMMENDED_TYPOGRAPHY } from "@/lib/pdfTypography";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sliders,
  RotateCcw,
  Sparkles,
  Printer,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Files,
  LayoutGrid,
  Check,
  Type,
} from "lucide-react";

interface PdfLayoutControlsProps {
  format: InvoicePdfFormat;
  onFormatChange: (format: InvoicePdfFormat) => void;
  templateKey: InvoiceTemplateKey;
  onTemplateChange: (template: InvoiceTemplateKey) => void;
  typography: PdfTypographySettings;
  onTypographyChange: (settings: PdfTypographySettings) => void;
  zoomScale?: number;
  onZoomChange?: (scale: number) => void;
  onDownload?: () => void;
  onPrint?: () => void;
  isDownloading?: boolean;
  downloadDisabled?: boolean;
  compactMode?: boolean; // For modal dialogs
}

export function PdfLayoutControls({
  format,
  onFormatChange,
  templateKey,
  onTemplateChange,
  typography,
  onTypographyChange,
  zoomScale = 1,
  onZoomChange,
  onDownload,
  onPrint,
  isDownloading = false,
  downloadDisabled = false,
  compactMode = false,
}: PdfLayoutControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"typography" | "blocks">("typography");

  const isSmart = typography.mode === "smart";
  const pageFitMode: PageFitMode = typography.pageFitMode || "single_page";
  const masterScale: number = typography.masterScale ?? 1.0;
  const blocks: InvoiceBlocksConfig = typography.blocksConfig || {
    showBankDetails: true,
    showSpecialNotes: true,
    showAmountInWords: true,
    showDueDates: true,
    showSignatureBlock: true,
    customNoteText: "",
  };

  const handlePageFitChange = (fit: PageFitMode) => {
    onTypographyChange({
      ...typography,
      pageFitMode: fit,
    });
  };

  const handleMasterScaleChange = (scaleVal: number) => {
    onTypographyChange({
      ...typography,
      masterScale: scaleVal,
    });
  };

  const handleToggleMode = (mode: "smart" | "manual") => {
    if (mode === "smart") {
      const recommended = RECOMMENDED_TYPOGRAPHY[typography.density || "balanced"];
      onTypographyChange({
        ...recommended,
        mode: "smart",
        pageFitMode,
        masterScale,
        blocksConfig: blocks,
      });
    } else {
      onTypographyChange({ ...typography, mode: "manual" });
    }
  };

  const handleDensityChange = (density: LayoutDensity) => {
    const preset = RECOMMENDED_TYPOGRAPHY[density];
    if (isSmart) {
      onTypographyChange({
        ...preset,
        mode: "smart",
        density,
        pageFitMode,
        masterScale,
        blocksConfig: blocks,
      });
    } else {
      onTypographyChange({
        ...typography,
        density,
        bodySizePt: preset.bodySizePt,
        tableHeaderPt: preset.tableHeaderPt,
        descriptionSizePt: preset.descriptionSizePt,
      });
    }
  };

  const handleResetRecommended = () => {
    const recommended = RECOMMENDED_TYPOGRAPHY.balanced;
    onTypographyChange({
      ...recommended,
      pageFitMode: "single_page",
      masterScale: 1.0,
      mode: "smart",
      blocksConfig: {
        showBankDetails: true,
        showSpecialNotes: true,
        showAmountInWords: true,
        showDueDates: true,
        showSignatureBlock: true,
        customNoteText: "",
      },
    });
  };

  const handleSliderChange = (key: keyof PdfTypographySettings, val: number) => {
    onTypographyChange({
      ...typography,
      mode: "manual",
      [key]: val,
    });
  };

  const handleBlockToggle = (key: keyof InvoiceBlocksConfig) => {
    onTypographyChange({
      ...typography,
      blocksConfig: {
        ...blocks,
        [key]: !blocks[key],
      },
    });
  };

  const handleCustomNoteChange = (text: string) => {
    onTypographyChange({
      ...typography,
      blocksConfig: {
        ...blocks,
        customNoteText: text,
      },
    });
  };

  return (
    <div className="w-full max-w-[210mm] mx-auto mb-4 print:hidden space-y-2.5 font-sans">
      {/* Top Floating Action Bar */}
      <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Page Mode Switcher (1 Page Auto-Fit vs Multi-Page) */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => handlePageFitChange("single_page")}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs font-bold transition-all ${
              pageFitMode === "single_page"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>1 Page (Fit to Page)</span>
          </button>

          <button
            type="button"
            onClick={() => handlePageFitChange("multi_page")}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs font-bold transition-all ${
              pageFitMode === "multi_page"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Files className="w-3.5 h-3.5 text-blue-400" />
            <span>Multi-Page (2+ Pages)</span>
          </button>
        </div>

        {/* Format Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => onFormatChange("digital")}
            className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
              format === "digital"
                ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Digital</span>
          </button>

          <button
            type="button"
            onClick={() => onFormatChange("print")}
            className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
              format === "print" || format === "blank"
                ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Blank / Print</span>
          </button>
        </div>

        {/* Template Selector */}
        <select
          value={templateKey}
          onChange={(e) => onTemplateChange(e.target.value as InvoiceTemplateKey)}
          className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="standard">Standard Advertising</option>
          <option value="vat">VAT Tax Invoice</option>
          <option value="sponsorship">Media Sponsorship</option>
          <option value="custom">Commercial Invoice</option>
        </select>

        {/* PDF Layout Settings Drawer Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={`text-xs font-bold flex items-center space-x-1.5 border-slate-300 h-8 ${
            isOpen ? "bg-slate-100 text-slate-900" : "text-slate-700"
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-slate-600" />
          <span>Customize &amp; Fonts</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>

        {/* Zoom Controls (when provided) */}
        {onZoomChange && (
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              title="Zoom Out"
              onClick={() => onZoomChange(Math.max(0.6, zoomScale - 0.1))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-700 px-1">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              title="Zoom In"
              onClick={() => onZoomChange(Math.min(1.5, zoomScale + 0.1))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Actions (Download & Print) */}
        <div className="flex items-center space-x-2">
          {onPrint && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPrint}
              className="text-xs font-bold flex items-center space-x-1.5 border-slate-300 text-slate-700 h-8"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          )}

          {onDownload && (
            <Button
              type="button"
              size="sm"
              disabled={isDownloading || downloadDisabled}
              onClick={onDownload}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs h-8"
            >
              <span>{isDownloading ? "Exporting..." : `Download A4 PDF`}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Expandable Customization & Typography Drawer */}
      {isOpen && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Tabs: Typography & Scale vs Blocks Customization */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("typography")}
                className={`px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                  activeTab === "typography" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
              >
                <Type className="w-3.5 h-3.5 text-slate-700" />
                <span>Font Sizing &amp; Scale</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("blocks")}
                className={`px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                  activeTab === "blocks" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-slate-700" />
                <span>Custom Blocks &amp; Text</span>
              </button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetRecommended}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1 h-7"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Reset Defaults</span>
            </Button>
          </div>

          {activeTab === "typography" ? (
            <div className="space-y-4">
              {/* Master Proportional Scale Slider (Auto scales total invoice proportionally) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Master Proportional Font Scale
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Adjusts all headers, items, totals, and footer text proportionally in real time
                    </span>
                  </div>
                  <span className="font-mono font-black text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {Math.round(masterScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={masterScale}
                  onChange={(e) => handleMasterScaleChange(parseFloat(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
              </div>

              {/* Grid: Mode, Density, and Individual Size Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Mode & Density Controls */}
                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Font Sizing Mode
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => handleToggleMode("smart")}
                        className={`py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1 transition-all ${
                          isSmart ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Smart Auto</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleMode("manual")}
                        className={`py-1.5 px-2 rounded-lg transition-all ${
                          !isSmart ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                        }`}
                      >
                        <span>Manual</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Spacing Density
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                      {(["comfortable", "balanced", "compact"] as LayoutDensity[]).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleDensityChange(d)}
                          className={`py-1 px-1.5 rounded-lg capitalize transition-all ${
                            typography.density === d ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Individual Sliders Column 1 */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-0.5">
                      <span>Document Title</span>
                      <span className="font-mono font-bold">{typography.titleSizePt} pt</span>
                    </div>
                    <input
                      type="range"
                      min="13"
                      max="22"
                      step="0.5"
                      value={typography.titleSizePt}
                      onChange={(e) => handleSliderChange("titleSizePt", parseFloat(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-0.5">
                      <span>Company Name</span>
                      <span className="font-mono font-bold">{typography.headerSizePt} pt</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="18"
                      step="0.5"
                      value={typography.headerSizePt}
                      onChange={(e) => handleSliderChange("headerSizePt", parseFloat(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-0.5">
                      <span>Table Header</span>
                      <span className="font-mono font-bold">{typography.tableHeaderPt} pt</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="12"
                      step="0.5"
                      value={typography.tableHeaderPt}
                      onChange={(e) => handleSliderChange("tableHeaderPt", parseFloat(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                {/* Individual Sliders Column 2 */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-0.5">
                      <span>Line Item Body</span>
                      <span className="font-mono font-bold">{typography.bodySizePt} pt</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="13"
                      step="0.5"
                      value={typography.bodySizePt}
                      onChange={(e) => handleSliderChange("bodySizePt", parseFloat(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-0.5">
                      <span>Description Text</span>
                      <span className="font-mono font-bold">{typography.descriptionSizePt} pt</span>
                    </div>
                    <input
                      type="range"
                      min="7.5"
                      max="12"
                      step="0.5"
                      value={typography.descriptionSizePt}
                      onChange={(e) => handleSliderChange("descriptionSizePt", parseFloat(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-0.5">
                      <span>Footer &amp; Payment</span>
                      <span className="font-mono font-bold">{typography.footerSizePt} pt</span>
                    </div>
                    <input
                      type="range"
                      min="7.5"
                      max="11"
                      step="0.5"
                      value={typography.footerSizePt}
                      onChange={(e) => handleSliderChange("footerSizePt", parseFloat(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= BLOCKS CUSTOMIZATION & TOGGLES ================= */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {[
                  { key: "showBankDetails", label: "Bank & Payment Details" },
                  { key: "showAmountInWords", label: "Amount in Words" },
                  { key: "showSpecialNotes", label: "Special Notes Clause" },
                  { key: "showDueDates", label: "Due Date & References" },
                  { key: "showSignatureBlock", label: "Signature & Stamp Block" },
                ].map(({ key, label }) => {
                  const isActive = Boolean(blocks[key as keyof InvoiceBlocksConfig]);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleBlockToggle(key as keyof InvoiceBlocksConfig)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all ${
                        isActive
                          ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                          : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <span>{label}</span>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center text-white ${
                          isActive ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      >
                        {isActive && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Additional Note / Clause Text Block */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 block">
                  Add Custom Note / Declaration Block (Optional)
                </label>
                <input
                  type="text"
                  value={blocks.customNoteText || ""}
                  onChange={(e) => handleCustomNoteChange(e.target.value)}
                  placeholder="e.g. Goods/Services delivered in satisfactory condition. Subject to Colombo jurisdiction."
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
