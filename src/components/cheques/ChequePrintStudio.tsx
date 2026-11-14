"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  RotateCw,
  Printer,
  FileCheck,
  Save,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Sliders,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Move,
  Layers,
  Sparkles,
  Download,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Check,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import {
  Cheque,
  ChequePrintTemplate,
  ChequePrinterProfile,
  ChequePrintFields,
  ChequeFieldConfig,
  A4Orientation,
  RotationAngle,
  FeedDirection,
  ChequePrintPayload,
} from "@/types/chequePrint";
import { DEFAULT_CHEQUE_TEMPLATES, DEFAULT_PRINTER_PROFILES } from "@/lib/chequeDefaults";
import { downloadChequePdf, createChequePdf } from "@/lib/chequePdfGenerator";
import { numberToWordsLKR } from "@/lib/utils";

interface ChequePrintStudioProps {
  isOpen: boolean;
  onClose: () => void;
  cheque?: Cheque | null;
  onSaved?: () => void;
}

export function ChequePrintStudio({ isOpen, onClose, cheque, onSaved }: ChequePrintStudioProps) {
  // Database / state templates and profiles
  const [templates, setTemplates] = useState<ChequePrintTemplate[]>(DEFAULT_CHEQUE_TEMPLATES);
  const [profiles, setProfiles] = useState<ChequePrinterProfile[]>(DEFAULT_PRINTER_PROFILES);
  const [activeTemplate, setActiveTemplate] = useState<ChequePrintTemplate>(DEFAULT_CHEQUE_TEMPLATES[0]);
  const [activeProfile, setActiveProfile] = useState<ChequePrinterProfile>(DEFAULT_PRINTER_PROFILES[0]);

  // Calibration Controls State
  const [isMoveTextFields, setIsMoveTextFields] = useState<boolean>(false);
  const [selectedFieldKey, setSelectedFieldKey] = useState<keyof ChequePrintFields | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [gridSizeMm, setGridSizeMm] = useState<number>(5);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Undo / Redo history
  const [history, setHistory] = useState<ChequePrintTemplate[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Dragging refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingChequeRef = useRef<boolean>(false);
  const isDraggingFieldRef = useRef<string | null>(null);
  const dragStartPosRef = useRef<{ clientX: number; clientY: number; origX: number; origY: number }>({
    clientX: 0,
    clientY: 0,
    origX: 0,
    origY: 0,
  });

  // Calculate live preview data
  const liveData = useMemo(() => {
    const rawAmount = cheque?.amount ? Number(cheque.amount) : 125000;
    const formattedAmount = rawAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const words = numberToWordsLKR(rawAmount);

    let dateStr = "14 / 11 / 2026";
    if (cheque?.chequeDate) {
      const parts = cheque.chequeDate.split("-");
      if (parts.length === 3) {
        dateStr = `${parts[2]} / ${parts[1]} / ${parts[0]}`;
      }
    }

    return {
      chequeNumber: cheque?.chequeNumber || "23467",
      date: dateStr,
      payeeName: cheque?.payerOrPayeeName || cheque?.supplierName || "SAMPLE COMPANY (PVT) LTD",
      amountFigures: formattedAmount,
      amountWords: words,
      crossingText: "A/C PAYEE ONLY",
    };
  }, [cheque]);

  // Load saved templates and printer profiles from PostgreSQL on mount
  useEffect(() => {
    if (!isOpen) return;

    async function loadBackendData() {
      try {
        const [tplRes, prnRes] = await Promise.all([
          fetch("/api/cheques/templates"),
          fetch("/api/cheques/printer-profiles"),
        ]);

        if (tplRes.ok) {
          const tplJson = await tplRes.json();
          if (tplJson.success && Array.isArray(tplJson.data) && tplJson.data.length > 0) {
            setTemplates(tplJson.data);
            // Match template by bank name if cheque has drawerBank
            const matched = tplJson.data.find(
              (t: ChequePrintTemplate) =>
                cheque?.drawerBank && t.bankName.toLowerCase().includes(cheque.drawerBank.toLowerCase())
            );
            setActiveTemplate(matched || tplJson.data[0]);
          }
        }

        if (prnRes.ok) {
          const prnJson = await prnRes.json();
          if (prnJson.success && Array.isArray(prnJson.data) && prnJson.data.length > 0) {
            setProfiles(prnJson.data);
            const defPrn = prnJson.data.find((p: ChequePrinterProfile) => p.isDefault) || prnJson.data[0];
            setActiveProfile(defPrn);
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote cheque templates, using built-in defaults:", err);
      }
    }

    loadBackendData();
  }, [isOpen, cheque]);

  // Push state to undo history
  const pushHistory = useCallback((newTemplate: ChequePrintTemplate) => {
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, JSON.parse(JSON.stringify(newTemplate))];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const updateTemplate = useCallback(
    (updater: (prev: ChequePrintTemplate) => ChequePrintTemplate) => {
      setActiveTemplate((current) => {
        const next = updater(JSON.parse(JSON.stringify(current)));
        pushHistory(next);
        return next;
      });
    },
    [pushHistory]
  );

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setActiveTemplate(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setActiveTemplate(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  // Dimensions & Scales
  const a4Width = activeTemplate.a4Orientation === "landscape" ? 297 : 210;
  const a4Height = activeTemplate.a4Orientation === "landscape" ? 210 : 297;

  // Viewport display scale (pixels per mm)
  const displayScale = activeTemplate.a4Orientation === "landscape" ? 3.0 * zoomLevel : 2.5 * zoomLevel;
  const canvasWidthPx = a4Width * displayScale;
  const canvasHeightPx = a4Height * displayScale;

  // ---------------------------------------------------------------------------
  // ROTATION & POSITION ACTIONS
  // ---------------------------------------------------------------------------
  const handleRotateCheque90 = () => {
    updateTemplate((prev) => ({
      ...prev,
      chequeRotation: ((prev.chequeRotation + 90) % 360) as RotationAngle,
    }));
  };

  const handleRotateA490 = () => {
    updateTemplate((prev) => ({
      ...prev,
      a4Rotation: ((prev.a4Rotation + 90) % 360) as RotationAngle,
    }));
  };

  const handleToggleA4Orientation = () => {
    updateTemplate((prev) => {
      const nextOri = prev.a4Orientation === "landscape" ? "portrait" : "landscape";
      return {
        ...prev,
        a4Orientation: nextOri,
      };
    });
  };

  const handleResetLayout = () => {
    const baseDefault = DEFAULT_CHEQUE_TEMPLATES.find((t) => t.bankName === activeTemplate.bankName) || DEFAULT_CHEQUE_TEMPLATES[0];
    updateTemplate(() => JSON.parse(JSON.stringify(baseDefault)));
    setSelectedFieldKey(null);
  };

  // ---------------------------------------------------------------------------
  // DRAG & DROP HANDLING
  // ---------------------------------------------------------------------------
  const handleMouseDownCheque = (e: React.MouseEvent) => {
    if (isMoveTextFields) return; // If text fields mode is enabled, do not drag whole cheque
    e.preventDefault();
    e.stopPropagation();

    isDraggingChequeRef.current = true;
    dragStartPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origX: activeTemplate.chequeX,
      origY: activeTemplate.chequeY,
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseDownField = (fieldKey: keyof ChequePrintFields, e: React.MouseEvent) => {
    if (!isMoveTextFields) return;
    const field = activeTemplate.fields[fieldKey];
    if (field?.isLocked) return;

    e.preventDefault();
    e.stopPropagation();

    setSelectedFieldKey(fieldKey);
    isDraggingFieldRef.current = fieldKey;
    dragStartPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origX: field?.x || 0,
      origY: field?.y || 0,
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const deltaScreenX = (e.clientX - dragStartPosRef.current.clientX) / displayScale;
      const deltaScreenY = (e.clientY - dragStartPosRef.current.clientY) / displayScale;

      // 1. Cheque Rectangle Dragging
      if (isDraggingChequeRef.current) {
        let newX = dragStartPosRef.current.origX + deltaScreenX;
        let newY = dragStartPosRef.current.origY + deltaScreenY;

        if (snapToGrid) {
          newX = Math.round(newX / gridSizeMm) * gridSizeMm;
          newY = Math.round(newY / gridSizeMm) * gridSizeMm;
        }

        // Keep inside A4 with some margin
        newX = Math.max(-50, Math.min(a4Width, Math.round(newX * 10) / 10));
        newY = Math.max(-50, Math.min(a4Height, Math.round(newY * 10) / 10));

        setActiveTemplate((prev) => ({
          ...prev,
          chequeX: newX,
          chequeY: newY,
        }));
      }

      // 2. Individual Field Dragging
      if (isDraggingFieldRef.current) {
        const fieldKey = isDraggingFieldRef.current as keyof ChequePrintFields;
        const rotRad = (-(activeTemplate.chequeRotation || 0) * Math.PI) / 180;

        // Counter-rotate screen movement to match cheque's internal local coordinates
        const localDeltaX = deltaScreenX * Math.cos(rotRad) - deltaScreenY * Math.sin(rotRad);
        const localDeltaY = deltaScreenX * Math.sin(rotRad) + deltaScreenY * Math.cos(rotRad);

        let newX = dragStartPosRef.current.origX + localDeltaX;
        let newY = dragStartPosRef.current.origY + localDeltaY;

        if (snapToGrid) {
          newX = Math.round(newX / gridSizeMm) * gridSizeMm;
          newY = Math.round(newY / gridSizeMm) * gridSizeMm;
        }

        newX = Math.max(0, Math.min(activeTemplate.chequeWidth - 5, Math.round(newX * 10) / 10));
        newY = Math.max(0, Math.min(activeTemplate.chequeHeight - 5, Math.round(newY * 10) / 10));

        setActiveTemplate((prev) => {
          const currentField = prev.fields[fieldKey];
          if (!currentField) return prev;
          return {
            ...prev,
            fields: {
              ...prev.fields,
              [fieldKey]: {
                ...currentField,
                x: newX,
                y: newY,
              },
            },
          };
        });
      }
    },
    [displayScale, snapToGrid, gridSizeMm, a4Width, a4Height, activeTemplate.chequeRotation, activeTemplate.chequeWidth, activeTemplate.chequeHeight]
  );

  const handleMouseUp = useCallback(() => {
    if (isDraggingChequeRef.current || isDraggingFieldRef.current) {
      pushHistory(activeTemplate);
    }
    isDraggingChequeRef.current = false;
    isDraggingFieldRef.current = null;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }, [activeTemplate, handleMouseMove, pushHistory]);

  // Keyboard fine movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const step = e.altKey ? 0.1 : e.shiftKey ? 2.0 : 0.5;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const dX = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dY = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;

        if (isMoveTextFields && selectedFieldKey) {
          // Move selected field
          updateTemplate((prev) => {
            const f = prev.fields[selectedFieldKey];
            if (!f || f.isLocked) return prev;
            return {
              ...prev,
              fields: {
                ...prev.fields,
                [selectedFieldKey]: {
                  ...f,
                  x: Math.round((f.x + dX) * 10) / 10,
                  y: Math.round((f.y + dY) * 10) / 10,
                },
              },
            };
          });
        } else {
          // Move entire cheque
          updateTemplate((prev) => ({
            ...prev,
            chequeX: Math.round((prev.chequeX + dX) * 10) / 10,
            chequeY: Math.round((prev.chequeY + dY) * 10) / 10,
          }));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMoveTextFields, selectedFieldKey, updateTemplate]);

  // ---------------------------------------------------------------------------
  // BACKEND SAVE & PRINT ACTIONS
  // ---------------------------------------------------------------------------
  const handleSaveCalibration = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      // 1. Save Bank Template
      const res = await fetch("/api/cheques/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeTemplate),
      });

      // 2. Save Printer Profile
      if (activeProfile) {
        await fetch("/api/cheques/printer-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activeProfile),
        });
      }

      if (!res.ok) throw new Error("Failed to save template to database");

      setSaveSuccessMsg("Calibration saved successfully to PostgreSQL!");
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      onSaved?.();
    } catch (err: any) {
      alert(err.message || "Failed to save calibration");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = (printType: "test" | "final") => {
    const payload: ChequePrintPayload = {
      chequeId: cheque?.id,
      template: activeTemplate,
      printerProfile: activeProfile,
      liveData,
      printType,
    };

    // Record print job in backend history
    fetch("/api/cheques/print-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chequeId: cheque?.id,
        templateId: activeTemplate.id,
        printerProfileId: activeProfile.id,
        printType,
        settingsSnapshot: {
          chequeX: activeTemplate.chequeX,
          chequeY: activeTemplate.chequeY,
          chequeRotation: activeTemplate.chequeRotation,
          a4Orientation: activeTemplate.a4Orientation,
          offsetX: activeProfile.offsetX,
          offsetY: activeProfile.offsetY,
        },
      }),
    }).catch((e) => console.warn("Notice: Print job record warning", e));

    // Generate PDF and open in print-ready popup or download
    const doc = createChequePdf(payload);
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Open print window directly
    const printWindow = window.open(blobUrl, "_blank");
    if (printWindow) {
      printWindow.focus();
    } else {
      // Fallback: direct download
      downloadChequePdf(payload);
    }
  };

  const handleDownloadPdf = (printType: "test" | "final") => {
    const payload: ChequePrintPayload = {
      chequeId: cheque?.id,
      template: activeTemplate,
      printerProfile: activeProfile,
      liveData,
      printType,
    };
    downloadChequePdf(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden animate-in fade-in duration-150">
      {/* 1. TOP STUDIO HEADER */}
      <header className="h-14 bg-navy-950 border-b border-navy-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold text-white tracking-wide">
                SN Cheque Calibration &amp; Print Studio
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                Canva-Style Visual Editor
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {cheque ? `Cheque #${cheque.chequeNumber} · Payee: ${liveData.payeeName}` : "Generic Calibration Mode"}
            </p>
          </div>
        </div>

        {/* Center Mode Controls */}
        <div className="flex items-center space-x-3 bg-navy-900/80 px-3 py-1.5 rounded-xl border border-navy-800">
          <button
            onClick={handleRotateCheque90}
            className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center space-x-1.5 transition active:scale-95"
            title="Rotate cheque 90 degrees clockwise"
          >
            <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rotate 90°</span>
          </button>

          <button
            onClick={handleResetLayout}
            className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition active:scale-95"
          >
            Reset
          </button>

          <div className="h-4 w-px bg-slate-700" />

          {/* Toggle "Move text fields" Mode */}
          <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer text-slate-200 select-none">
            <input
              type="checkbox"
              checked={isMoveTextFields}
              onChange={(e) => {
                setIsMoveTextFields(e.target.checked);
                if (!e.target.checked) setSelectedFieldKey(null);
              }}
              className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-800 cursor-pointer"
            />
            <span className={isMoveTextFields ? "text-emerald-400 font-bold" : "text-slate-300"}>
              Move text fields
            </span>
          </label>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 disabled:opacity-40 text-slate-300 transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 disabled:opacity-40 text-slate-300 transition"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-navy-800" />

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 transition"
            title="Close Editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN 3-PANEL STUDIO BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* =================================================================== */}
        {/* LEFT PANEL: Bank Template & Layout Settings */}
        {/* =================================================================== */}
        <aside className="w-72 bg-navy-950/95 border-r border-navy-800 flex flex-col overflow-y-auto shrink-0 text-xs">
          <div className="p-3 border-b border-navy-800/80 bg-navy-900/40">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Template &amp; Printer Setup
            </span>
          </div>

          <div className="p-4 space-y-4">
            {/* Bank Template Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Bank Cheque Template
              </label>
              <select
                value={activeTemplate.id}
                onChange={(e) => {
                  const found = templates.find((t) => t.id === e.target.value);
                  if (found) {
                    setActiveTemplate(JSON.parse(JSON.stringify(found)));
                    setSelectedFieldKey(null);
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.bankName} ({tpl.chequeWidth}x{tpl.chequeHeight}mm)
                  </option>
                ))}
              </select>
            </div>

            {/* Printer Profile Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Printer Calibration Profile
              </label>
              <select
                value={activeProfile.id}
                onChange={(e) => {
                  const found = profiles.find((p) => p.id === e.target.value);
                  if (found) setActiveProfile(found);
                }}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {profiles.map((prn) => (
                  <option key={prn.id} value={prn.id}>
                    {prn.name} (X:{prn.offsetX > 0 ? `+${prn.offsetX}` : prn.offsetX}mm, Y:
                    {prn.offsetY > 0 ? `+${prn.offsetY}` : prn.offsetY}mm)
                  </option>
                ))}
              </select>
            </div>

            {/* Global Hardware Printer Offset */}
            <div className="p-2.5 rounded-lg bg-navy-900/60 border border-navy-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Hardware Alignment Offset
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Global Offset X (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={activeProfile.offsetX}
                    onChange={(e) =>
                      setActiveProfile((prev) => ({ ...prev, offsetX: Number(e.target.value) || 0 }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Global Offset Y (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={activeProfile.offsetY}
                    onChange={(e) =>
                      setActiveProfile((prev) => ({ ...prev, offsetY: Number(e.target.value) || 0 }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* A4 Sheet Settings */}
            <div className="pt-2 border-t border-navy-800/80 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                A4 Paper Sheet
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleToggleA4Orientation}
                  className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded border border-slate-700 text-center font-medium"
                >
                  {activeTemplate.a4Orientation === "landscape" ? "A4 Landscape (297x210)" : "A4 Portrait (210x297)"}
                </button>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">
                  A4 Rotation: {activeTemplate.a4Rotation}°
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      onClick={() => updateTemplate((prev) => ({ ...prev, a4Rotation: deg as RotationAngle }))}
                      className={`py-1 text-[11px] rounded font-mono ${
                        activeTemplate.a4Rotation === deg
                          ? "bg-emerald-600 text-white font-bold"
                          : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cheque Rectangle Size & Rotation */}
            <div className="pt-2 border-t border-navy-800/80 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Physical Cheque Specs
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Width (mm)</label>
                  <input
                    type="number"
                    value={activeTemplate.chequeWidth}
                    onChange={(e) =>
                      updateTemplate((prev) => ({ ...prev, chequeWidth: Number(e.target.value) || 178 }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Height (mm)</label>
                  <input
                    type="number"
                    value={activeTemplate.chequeHeight}
                    onChange={(e) =>
                      updateTemplate((prev) => ({ ...prev, chequeHeight: Number(e.target.value) || 89 }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Cheque Position X / Y */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Cheque X (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={activeTemplate.chequeX}
                    onChange={(e) =>
                      updateTemplate((prev) => ({ ...prev, chequeX: Number(e.target.value) || 0 }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Cheque Y (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={activeTemplate.chequeY}
                    onChange={(e) =>
                      updateTemplate((prev) => ({ ...prev, chequeY: Number(e.target.value) || 0 }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Cheque Rotation */}
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">
                  Cheque Rotation: {activeTemplate.chequeRotation}°
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      onClick={() =>
                        updateTemplate((prev) => ({ ...prev, chequeRotation: deg as RotationAngle }))
                      }
                      className={`py-1 text-[11px] rounded font-mono ${
                        activeTemplate.chequeRotation === deg
                          ? "bg-emerald-600 text-white font-bold"
                          : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Canvas Helpers */}
            <div className="pt-2 border-t border-navy-800/80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Visual Guides
              </span>
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 bg-slate-900"
                  />
                  <span>Show Millimetre Grid</span>
                </label>
                <label className="text-xs text-slate-300 flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={snapToGrid}
                    onChange={(e) => setSnapToGrid(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 bg-slate-900"
                  />
                  <span>Snap (5mm)</span>
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* =================================================================== */}
        {/* CENTER PANEL: Interactive A4 Canvas Workbench */}
        {/* =================================================================== */}
        <main className="flex-1 bg-black/90 flex flex-col overflow-hidden relative">
          {/* Zoom & Quick Controls overlay bar */}
          <div className="absolute top-3 left-4 z-20 flex items-center space-x-2 bg-navy-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-navy-800 text-xs text-slate-300 shadow-xl">
            <span className="font-mono text-emerald-400 font-semibold">
              Scale: 1 mm = {displayScale.toFixed(1)} px
            </span>
            <div className="h-3 w-px bg-slate-700" />
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
              className="p-1 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.1))}
              className="p-1 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:text-white"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Canvas Scroll Area */}
          <div
            ref={canvasRef}
            className="flex-1 overflow-auto p-8 flex flex-col items-center justify-start relative select-none"
          >
            {/* Floating Canva Toolbar (matches reference screenshot) */}
            <div className="flex items-center space-x-3 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 text-xs shadow-2xl mb-6 shrink-0 z-20">
              <button
                onClick={handleRotateCheque90}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg flex items-center space-x-1.5 transition active:scale-95"
                title="Rotate cheque 90 degrees clockwise"
              >
                <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rotate 90°</span>
              </button>

              <button
                onClick={handleResetLayout}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition active:scale-95"
              >
                Reset
              </button>

              <div className="h-4 w-px bg-slate-700" />

              <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer text-slate-200 select-none">
                <input
                  type="checkbox"
                  checked={isMoveTextFields}
                  onChange={(e) => {
                    setIsMoveTextFields(e.target.checked);
                    if (!e.target.checked) setSelectedFieldKey(null);
                  }}
                  className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-800 cursor-pointer"
                />
                <span className={isMoveTextFields ? "text-emerald-400 font-bold" : "text-slate-300"}>
                  Move text fields
                </span>
              </label>
            </div>

            {/* The A4 Page (White Canvas with Drop Shadow) */}
            <div
              style={{
                width: `${canvasWidthPx}px`,
                height: `${canvasHeightPx}px`,
                transform: `rotate(${activeTemplate.a4Rotation}deg)`,
                transition: "transform 0.2s ease",
              }}
              className="bg-white rounded-md shadow-2xl relative overflow-hidden border border-slate-300 shrink-0"
            >
              {/* Top-Left Millimetre Dimensions Watermark */}
              <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400 select-none z-0">
                A4 · {a4Width} × {a4Height} mm
              </div>

              {/* Feed Direction Indicator Arrow & Leading Edge Marker */}
              <div className="absolute top-0 inset-x-0 h-4 bg-emerald-500/10 border-b border-emerald-500/30 flex items-center justify-center text-[9px] font-bold text-emerald-700 font-mono tracking-wider z-0">
                ▲ PRINTER FEED DIRECTION · LEADING EDGE ({activeTemplate.feedDirection.toUpperCase()})
              </div>

              {/* Visual Millimetre Grid Overlay */}
              {showGrid && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern
                      id="smallGrid"
                      width={5 * displayScale}
                      height={5 * displayScale}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${5 * displayScale} 0 L 0 0 0 ${5 * displayScale}`}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="0.5"
                      />
                    </pattern>
                    <pattern
                      id="grid"
                      width={20 * displayScale}
                      height={20 * displayScale}
                      patternUnits="userSpaceOnUse"
                    >
                      <rect
                        width={20 * displayScale}
                        height={20 * displayScale}
                        fill="url(#smallGrid)"
                      />
                      <path
                        d={`M ${20 * displayScale} 0 L 0 0 0 ${20 * displayScale}`}
                        fill="none"
                        stroke="#475569"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              )}

              {/* ============================================================= */}
              {/* THE CHEQUE RECTANGLE OVERLAY */}
              {/* ============================================================= */}
              <div
                onMouseDown={handleMouseDownCheque}
                style={{
                  position: "absolute",
                  left: `${activeTemplate.chequeX * displayScale}px`,
                  top: `${activeTemplate.chequeY * displayScale}px`,
                  width: `${(activeTemplate.chequeRotation === 90 || activeTemplate.chequeRotation === 270 ? activeTemplate.chequeHeight : activeTemplate.chequeWidth) * displayScale}px`,
                  height: `${(activeTemplate.chequeRotation === 90 || activeTemplate.chequeRotation === 270 ? activeTemplate.chequeWidth : activeTemplate.chequeHeight) * displayScale}px`,
                  cursor: isMoveTextFields ? "default" : "move",
                }}
                className={`border-2 ${
                  isMoveTextFields
                    ? "border-emerald-600 bg-white/70"
                    : "border-emerald-600 bg-white/80 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20"
                } shadow-sm z-10 select-none overflow-hidden`}
              >
                {/* Rotated content container */}
                <div
                  style={{
                    position: "relative",
                    width: `${activeTemplate.chequeWidth * displayScale}px`,
                    height: `${activeTemplate.chequeHeight * displayScale}px`,
                    transformOrigin: activeTemplate.chequeRotation === 180 ? "center center" : "top left",
                    transform:
                      activeTemplate.chequeRotation === 90
                        ? `rotate(90deg) translate(0, -${activeTemplate.chequeHeight * displayScale}px)`
                        : activeTemplate.chequeRotation === 180
                        ? "rotate(180deg)"
                        : activeTemplate.chequeRotation === 270
                        ? `rotate(270deg) translate(-${activeTemplate.chequeWidth * displayScale}px, 0)`
                        : "none",
                  }}
                  className="w-full h-full relative"
                >
                  {/* Cheque Header Label Badge */}
                  <div className="absolute top-1 right-2 text-[9px] font-bold font-mono tracking-wider text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded pointer-events-none select-none">
                    CHEQUE PREVIEW · {activeTemplate.bankName}
                  </div>

                  {/* Printable Fields inside Cheque */}
                  {/* 1. Date */}
                  {activeTemplate.fields.date && activeTemplate.fields.date.isVisible && (
                    <div
                      onMouseDown={(e) => handleMouseDownField("date", e)}
                      style={{
                        position: "absolute",
                        left: `${activeTemplate.fields.date.x * displayScale}px`,
                        top: `${activeTemplate.fields.date.y * displayScale}px`,
                        width: `${(activeTemplate.fields.date.width || 40) * displayScale}px`,
                        fontSize: `${activeTemplate.fields.date.fontSize * 1.3}px`,
                        fontFamily: activeTemplate.fields.date.fontFamily || "monospace",
                        letterSpacing: `${(activeTemplate.fields.date.letterSpacing || 2) * (displayScale / 3)}px`,
                        cursor: isMoveTextFields ? "move" : "inherit",
                      }}
                      className={`p-1 rounded font-bold text-slate-900 border border-dashed transition ${
                        isMoveTextFields
                          ? selectedFieldKey === "date"
                            ? "border-emerald-600 bg-emerald-100/70 ring-2 ring-emerald-400"
                            : "border-emerald-500/80 hover:bg-emerald-50/50 cursor-move"
                          : "border-emerald-500/60"
                      }`}
                    >
                      {liveData.date}
                    </div>
                  )}

                  {/* 2. Payee Name */}
                  {activeTemplate.fields.payee && activeTemplate.fields.payee.isVisible && (
                    <div
                      onMouseDown={(e) => handleMouseDownField("payee", e)}
                      style={{
                        position: "absolute",
                        left: `${activeTemplate.fields.payee.x * displayScale}px`,
                        top: `${activeTemplate.fields.payee.y * displayScale}px`,
                        width: `${(activeTemplate.fields.payee.width || 115) * displayScale}px`,
                        fontSize: `${activeTemplate.fields.payee.fontSize * 1.3}px`,
                        cursor: isMoveTextFields ? "move" : "inherit",
                      }}
                      className={`p-1 rounded font-bold text-slate-900 truncate border border-dashed transition ${
                        isMoveTextFields
                          ? selectedFieldKey === "payee"
                            ? "border-emerald-600 bg-emerald-100/70 ring-2 ring-emerald-400"
                            : "border-emerald-500/80 hover:bg-emerald-50/50 cursor-move"
                          : "border-emerald-500/60"
                      }`}
                    >
                      {activeTemplate.fields.payee.prefix}
                      {liveData.payeeName}
                      {activeTemplate.fields.payee.suffix}
                    </div>
                  )}

                  {/* 3. Amount in Words */}
                  {activeTemplate.fields.amountWords && activeTemplate.fields.amountWords.isVisible && (
                    <div
                      onMouseDown={(e) => handleMouseDownField("amountWords", e)}
                      style={{
                        position: "absolute",
                        left: `${activeTemplate.fields.amountWords.x * displayScale}px`,
                        top: `${activeTemplate.fields.amountWords.y * displayScale}px`,
                        width: `${(activeTemplate.fields.amountWords.width || 120) * displayScale}px`,
                        fontSize: `${activeTemplate.fields.amountWords.fontSize * 1.25}px`,
                        lineHeight: activeTemplate.fields.amountWords.lineHeight || 1.2,
                        cursor: isMoveTextFields ? "move" : "inherit",
                      }}
                      className={`p-1 rounded text-slate-900 border border-dashed transition ${
                        isMoveTextFields
                          ? selectedFieldKey === "amountWords"
                            ? "border-emerald-600 bg-emerald-100/70 ring-2 ring-emerald-400"
                            : "border-emerald-500/80 hover:bg-emerald-50/50 cursor-move"
                          : "border-emerald-500/60"
                      }`}
                    >
                      {activeTemplate.fields.amountWords.prefix}
                      {liveData.amountWords}
                      {activeTemplate.fields.amountWords.suffix}
                    </div>
                  )}

                  {/* 4. Amount in Figures */}
                  {activeTemplate.fields.amountFigures && activeTemplate.fields.amountFigures.isVisible && (
                    <div
                      onMouseDown={(e) => handleMouseDownField("amountFigures", e)}
                      style={{
                        position: "absolute",
                        left: `${activeTemplate.fields.amountFigures.x * displayScale}px`,
                        top: `${activeTemplate.fields.amountFigures.y * displayScale}px`,
                        width: `${(activeTemplate.fields.amountFigures.width || 42) * displayScale}px`,
                        fontSize: `${activeTemplate.fields.amountFigures.fontSize * 1.3}px`,
                        fontFamily: "monospace",
                        cursor: isMoveTextFields ? "move" : "inherit",
                      }}
                      className={`p-1 rounded font-bold text-slate-900 border border-dashed transition ${
                        isMoveTextFields
                          ? selectedFieldKey === "amountFigures"
                            ? "border-emerald-600 bg-emerald-100/70 ring-2 ring-emerald-400"
                            : "border-emerald-500/80 hover:bg-emerald-50/50 cursor-move"
                          : "border-emerald-500/60"
                      }`}
                    >
                      {activeTemplate.fields.amountFigures.prefix}
                      {liveData.amountFigures}
                      {activeTemplate.fields.amountFigures.suffix}
                    </div>
                  )}

                  {/* 5. Crossing (A/C Payee Only) */}
                  {activeTemplate.fields.crossing && activeTemplate.fields.crossing.isVisible && (
                    <div
                      onMouseDown={(e) => handleMouseDownField("crossing", e)}
                      style={{
                        position: "absolute",
                        left: `${activeTemplate.fields.crossing.x * displayScale}px`,
                        top: `${activeTemplate.fields.crossing.y * displayScale}px`,
                        width: `${(activeTemplate.fields.crossing.width || 32) * displayScale}px`,
                        fontSize: `${activeTemplate.fields.crossing.fontSize * 1.2}px`,
                        cursor: isMoveTextFields ? "move" : "inherit",
                      }}
                      className={`text-center font-bold text-slate-900 border border-dashed transition ${
                        isMoveTextFields
                          ? selectedFieldKey === "crossing"
                            ? "border-emerald-600 bg-emerald-100/70 ring-2 ring-emerald-400"
                            : "border-emerald-500/80 hover:bg-emerald-50/50 cursor-move"
                          : "border-emerald-500/60"
                      }`}
                    >
                      {activeTemplate.fields.crossing.style === "parallel_lines" && (
                        <div className="border-t border-b border-slate-900 py-0.5">
                          {activeTemplate.fields.crossing.text || "A/C PAYEE ONLY"}
                        </div>
                      )}
                      {activeTemplate.fields.crossing.style !== "parallel_lines" && (
                        <div>{activeTemplate.fields.crossing.text || "A/C PAYEE ONLY"}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status details directly below A4 paper (matches reference screenshot) */}
            <div className="mt-6 flex flex-col items-center space-y-1 text-center select-none shrink-0">
              <div className="text-sm font-mono text-slate-200 font-bold tracking-wide">
                X: {activeTemplate.chequeX.toFixed(1)} mm · Y: {activeTemplate.chequeY.toFixed(1)} mm &nbsp;&nbsp;&nbsp; Rotation: {activeTemplate.chequeRotation}°
              </div>
              <div className="text-xs text-slate-400">
                Drag the cheque to position it on the A4 page. Enable &quot;Move text fields&quot; to drag individual fields.
              </div>
            </div>
          </div>

          {/* Canvas Bottom Information Status Bar */}
          <div className="h-10 bg-navy-950 border-t border-navy-800 px-6 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <div className="flex items-center space-x-4">
              <span className="font-mono text-emerald-400 font-semibold">
                X: {activeTemplate.chequeX.toFixed(1)} mm · Y: {activeTemplate.chequeY.toFixed(1)} mm
              </span>
              <span className="font-mono text-slate-300">
                Rotation: {activeTemplate.chequeRotation}°
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-[11px] text-slate-300">
                {isMoveTextFields
                  ? `Editing text field: ${selectedFieldKey ? selectedFieldKey.toUpperCase() : "Click any field inside the cheque to select"}`
                  : "Drag the cheque to position it on the A4 page. Enable 'Move text fields' to drag individual fields."}
              </span>
            </div>

            {saveSuccessMsg && (
              <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1 animate-pulse">
                <Check className="w-4 h-4" />
                <span>{saveSuccessMsg}</span>
              </span>
            )}
          </div>
        </main>

        {/* =================================================================== */}
        {/* RIGHT PANEL: Selected Element Inspector */}
        {/* =================================================================== */}
        <aside className="w-80 bg-navy-950/95 border-l border-navy-800 flex flex-col overflow-y-auto shrink-0 text-xs">
          <div className="p-3 border-b border-navy-800/80 bg-navy-900/40 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Element Inspector
            </span>
            {selectedFieldKey && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-semibold">
                {selectedFieldKey}
              </span>
            )}
          </div>

          <div className="p-4 space-y-4">
            {selectedFieldKey ? (
              // ---------------- Field Properties Inspector ----------------
              (() => {
                const field = activeTemplate.fields[selectedFieldKey];
                if (!field) return <p className="text-slate-400">Field not found</p>;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">
                        {field.name || selectedFieldKey}
                      </span>
                      <button
                        onClick={() =>
                          updateTemplate((prev) => ({
                            ...prev,
                            fields: {
                              ...prev.fields,
                              [selectedFieldKey]: {
                                ...field,
                                isVisible: !field.isVisible,
                              },
                            },
                          }))
                        }
                        className={`p-1 rounded ${
                          field.isVisible ? "text-emerald-400 hover:bg-slate-800" : "text-slate-500"
                        }`}
                        title={field.isVisible ? "Hide element" : "Show element"}
                      >
                        {field.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Coordinates in mm */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">X (mm from cheque)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={field.x}
                          onChange={(e) =>
                            updateTemplate((prev) => ({
                              ...prev,
                              fields: {
                                ...prev.fields,
                                [selectedFieldKey]: {
                                  ...field,
                                  x: Number(e.target.value) || 0,
                                },
                              },
                            }))
                          }
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Y (mm from cheque)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={field.y}
                          onChange={(e) =>
                            updateTemplate((prev) => ({
                              ...prev,
                              fields: {
                                ...prev.fields,
                                [selectedFieldKey]: {
                                  ...field,
                                  y: Number(e.target.value) || 0,
                                },
                              },
                            }))
                          }
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Width & Font Size */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">Width (mm)</label>
                        <input
                          type="number"
                          value={field.width}
                          onChange={(e) =>
                            updateTemplate((prev) => ({
                              ...prev,
                              fields: {
                                ...prev.fields,
                                [selectedFieldKey]: {
                                  ...field,
                                  width: Number(e.target.value) || 10,
                                },
                              },
                            }))
                          }
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Font Size (pt)</label>
                        <input
                          type="number"
                          value={field.fontSize}
                          onChange={(e) =>
                            updateTemplate((prev) => ({
                              ...prev,
                              fields: {
                                ...prev.fields,
                                [selectedFieldKey]: {
                                  ...field,
                                  fontSize: Number(e.target.value) || 10,
                                },
                              },
                            }))
                          }
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </div>

                    {/* Font & Style */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400">Font Family</label>
                      <select
                        value={field.fontFamily || "Inter"}
                        onChange={(e) =>
                          updateTemplate((prev) => ({
                            ...prev,
                            fields: {
                              ...prev.fields,
                              [selectedFieldKey]: {
                                ...field,
                                fontFamily: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                      >
                        <option value="Inter">Helvetica / Inter (Clean Modern)</option>
                        <option value="Courier">Courier / Monospace (Typewriter)</option>
                        <option value="Times">Times Roman (Traditional Serif)</option>
                      </select>
                    </div>

                    {/* Text Alignment */}
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Text Alignment</label>
                      <div className="grid grid-cols-3 gap-1">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() =>
                              updateTemplate((prev) => ({
                                ...prev,
                                fields: {
                                  ...prev.fields,
                                  [selectedFieldKey]: {
                                    ...field,
                                    textAlign: align,
                                  },
                                },
                              }))
                            }
                            className={`py-1 text-center capitalize rounded ${
                              field.textAlign === align
                                ? "bg-emerald-600 text-white font-bold"
                                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Prefix & Suffix */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">Prefix text</label>
                        <input
                          type="text"
                          value={field.prefix || ""}
                          onChange={(e) =>
                            updateTemplate((prev) => ({
                              ...prev,
                              fields: {
                                ...prev.fields,
                                [selectedFieldKey]: {
                                  ...field,
                                  prefix: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                          placeholder="e.g. ***"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Suffix text</label>
                        <input
                          type="text"
                          value={field.suffix || ""}
                          onChange={(e) =>
                            updateTemplate((prev) => ({
                              ...prev,
                              fields: {
                                ...prev.fields,
                                [selectedFieldKey]: {
                                  ...field,
                                  suffix: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                          placeholder="e.g. /="
                        />
                      </div>
                    </div>

                    {/* Lock from accidental drag */}
                    <button
                      onClick={() =>
                        updateTemplate((prev) => ({
                          ...prev,
                          fields: {
                            ...prev.fields,
                            [selectedFieldKey]: {
                              ...field,
                              isLocked: !field.isLocked,
                            },
                          },
                        }))
                      }
                      className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 text-slate-300 flex items-center justify-center space-x-1.5"
                    >
                      {field.isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>{field.isLocked ? "Field Locked from Dragging" : "Lock Field Position"}</span>
                    </button>
                  </div>
                );
              })()
            ) : (
              // ---------------- Cheque Overview Inspector ----------------
              <div className="space-y-4">
                <div className="p-3 bg-navy-900/60 rounded-xl border border-navy-800">
                  <h3 className="font-bold text-white text-sm">Cheque Alignment Summary</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select any field directly on the cheque preview to adjust its position, font size, and text formatting.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Quick Field Selection
                  </span>
                  {(Object.keys(activeTemplate.fields) as (keyof ChequePrintFields)[]).map((key) => {
                    const f = activeTemplate.fields[key];
                    if (!f) return null;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setIsMoveTextFields(true);
                          setSelectedFieldKey(key);
                        }}
                        className="w-full p-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-left flex items-center justify-between transition"
                      >
                        <span className="font-medium text-slate-200">{f.name || key}</span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          X:{f.x} Y:{f.y} mm
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ===================================================================== */}
      {/* 3. BOTTOM ACTION DOCK */}
      {/* ===================================================================== */}
      <footer className="h-16 bg-navy-950 border-t border-navy-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveCalibration}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>{isSaving ? "Saving..." : "Save Calibration"}</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {/* 1. Test Print (Plain Paper with alignment guides) */}
          <button
            onClick={() => handlePrint("test")}
            className="px-4 py-2 bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-700/60 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 active:scale-95 shadow-md"
            title="Prints on plain A4 paper with boundary boxes to compare physical alignment"
          >
            <FileCheck className="w-4 h-4 text-sky-400" />
            <span>Test Print (Plain Paper)</span>
          </button>

          {/* 2. Download Vector PDF */}
          <button
            onClick={() => handleDownloadPdf("final")}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
            title="Download pure vector PDF"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          {/* 3. Final Print (Directly on Real Bank Cheque) */}
          <button
            onClick={() => handlePrint("final")}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-950/40 transition flex items-center space-x-2 active:scale-95"
            title="Prints pure text fields without outlines directly on your bank cheque"
          >
            <Printer className="w-4 h-4" />
            <span>Final Print (Bank Cheque)</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
