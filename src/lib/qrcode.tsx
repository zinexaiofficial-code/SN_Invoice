"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  fgColor?: string;
  bgColor?: string;
}

export function QRCodeDisplay({
  value,
  size = 64,
  className = "",
  fgColor = "#0f172a",
  bgColor = "#ffffff",
}: QRCodeDisplayProps) {
  const [svgString, setSvgString] = useState<string>("");

  useEffect(() => {
    if (!value) return;

    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      color: {
        dark: fgColor,
        light: bgColor,
      },
      width: size,
    })
      .then((svg) => {
        setSvgString(svg);
      })
      .catch((err) => {
        console.error("Failed to generate QR code SVG", err);
      });
  }, [value, size, fgColor, bgColor]);

  if (!svgString) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 border border-slate-200 rounded ${className}`}
      >
        QR
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ width: size, height: size, display: "inline-block" }}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}
