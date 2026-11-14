"use client";

import React, { useState } from "react";
import {
  InvoicePdfFormat,
  InvoiceTemplateKey,
  LayoutDensity,
  PdfTypographySettings,
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
} from "lucide-react";

interface PdfLayoutControlsProps {
  format: InvoicePdfFormat;
  onFormatChange: (format: InvoicePdfFormat) => void;
  templateKey: InvoiceTemplateKey;
  onTemplateChange: (template: InvoiceTemplateKey) => void;
  typography: PdfTypographySettings;
  onTypographyChange: (settings: PdfTypographySettings) => void;
  zoomScale: number;
  onZoomChange: (scale: number) => void;
  onDownload: () => void;
  onPrint: () => void;
  isDownloading?: boolean;
  downloadDisabled?: boolean;
}

export function PdfLayoutControls({
  format,
  onFormatChange,
  templateKey,
  onTemplateChange,
  typography,
  onTypographyChange,
  zoomScale,
  onZoomChange,
  onDownload,
  onPrint,
  isDownloading = false,
  downloadDisabled = false,
}: PdfLayoutControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isSmart = typography.mode === "smart";

  const handleToggleMode = (mode: "smart" | "manual") => {
    if (mode === "smart") {
      const recommended = RECOMMENDED_TYPOGRAPHY[typography.density || "balanced"];
      onTypographyChange({ ...recommended, mode: "smart" });
    } else {
      onTypographyChange({ ...typography, mode: "manual" });
    }
  };

  const handleDensityChange = (density: LayoutDensity) => {
    const preset = RECOMMENDED_TYPOGRAPHY[density];
    if (isSmart) {
      onTypographyChange({ ...preset, mode: "smart", density });
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
    onTypographyChange({ ...recommended, mode: "smart" });
  };

  const handleSliderChange = (key: keyof PdfTypographySettings, val: number) => {
    onTypographyChange({
      ...typography,
      mode: "manual",
      [key]: val,
    });
  };

  return (
    <div className="w-full max-w-[210mm] mx-auto mb-6 print:hidden space-y-3 font-sans">
      {/* Top Floating Action Bar */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Format Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => onFormatChange("digital")}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
              format === "digital"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Digital Signature</span>
          </button>

          <button
            type="button"
            onClick={() => onFormatChange("print")}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
              format === "print" || format === "blank"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Blank / Hard Copy</span>
          </button>
        </div>

        {/* Template Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-500 font-semibold hidden sm:inline">
            Template:
          </label>
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
        </div>

        {/* PDF Layout Settings Drawer Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={`text-xs font-bold flex items-center space-x-1.5 border-slate-300 ${
            isOpen ? "bg-slate-100 text-slate-900" : "text-slate-700"
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-slate-600" />
          <span>PDF Layout Settings</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            title="Zoom Out"
            onClick={() => onZoomChange(Math.max(0.6, zoomScale - 0.1))}
            className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-bold text-slate-700 px-1.5">
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
          <button
            type="button"
            title="Reset Zoom"
            onClick={() => onZoomChange(1)}
            className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export Actions */}
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="text-xs font-bold flex items-center space-x-1.5 border-slate-300 text-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print View</span>
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isDownloading || downloadDisabled}
            onClick={onDownload}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
          >
            <span>{isDownloading ? "Exporting A4 PDF..." : `Download A4 PDF`}</span>
          </Button>
        </div>
      </div>

      {/* Expandable PDF Layout Settings Drawer */}
      {isOpen && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">PDF Layout &amp; Typography Settings</h3>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500">
                A4 ISO Document Engine
              </Badge>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetRecommended}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1 h-7"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Reset to Recommended</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mode & Density Controls */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5">
                  Font Sizing Mode
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleToggleMode("smart")}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                      isSmart
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Smart Auto Fit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleMode("manual")}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                      !isSmart
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>Manual Sizes</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-tight">
                  {isSmart
                    ? "Dynamically calculates optimal font sizes to prevent awkward page splits without dropping below 9pt."
                    : "Customize individual font sizes for headers, tables, descriptions, and totals."}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5">
                  Layout Density
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  {(["comfortable", "balanced", "compact"] as LayoutDensity[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleDensityChange(d)}
                      className={`py-1 px-2 rounded-lg capitalize transition-all ${
                        typography.density === d
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Typography Sliders (Column 1) */}
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Document Title Size</span>
                  <span className="font-mono font-bold text-slate-900">{typography.titleSizePt} pt</span>
                </div>
                <input
                  type="range"
                  min="14"
                  max="22"
                  step="0.5"
                  value={typography.titleSizePt}
                  onChange={(e) => handleSliderChange("titleSizePt", parseFloat(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Header Company Name</span>
                  <span className="font-mono font-bold text-slate-900">{typography.headerSizePt} pt</span>
                </div>
                <input
                  type="range"
                  min="11"
                  max="18"
                  step="0.5"
                  value={typography.headerSizePt}
                  onChange={(e) => handleSliderChange("headerSizePt", parseFloat(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Table Header Size</span>
                  <span className="font-mono font-bold text-slate-900">{typography.tableHeaderPt} pt</span>
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

            {/* Typography Sliders (Column 2) */}
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Table Body Text</span>
                  <span className="font-mono font-bold text-slate-900">{typography.bodySizePt} pt</span>
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
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Service Description Size</span>
                  <span className="font-mono font-bold text-slate-900">{typography.descriptionSizePt} pt</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="12"
                  step="0.5"
                  value={typography.descriptionSizePt}
                  onChange={(e) => handleSliderChange("descriptionSizePt", parseFloat(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Footer &amp; Payment Text</span>
                  <span className="font-mono font-bold text-slate-900">{typography.footerSizePt} pt</span>
                </div>
                <input
                  type="range"
                  min="8"
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
      )}
    </div>
  );
}
