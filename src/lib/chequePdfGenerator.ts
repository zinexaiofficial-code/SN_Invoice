import { jsPDF } from 'jspdf';
import { ChequePrintPayload } from '@/types/chequePrint';

/**
 * High-precision mm-based Vector PDF Generator for Cheque Calibration and Final Printing
 */
export function createChequePdf(payload: ChequePrintPayload): jsPDF {
  const { template, printerProfile, liveData, printType } = payload;

  const isLandscape = template.a4Orientation === 'landscape';
  const a4Width = isLandscape ? 297 : 210;
  const a4Height = isLandscape ? 210 : 297;

  // Initialize jsPDF with mm units
  const doc = new jsPDF({
    orientation: template.a4Orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pOffsetX = Number(printerProfile?.offsetX) || 0;
  const pOffsetY = Number(printerProfile?.offsetY) || 0;

  const cX = (Number(template.chequeX) || 0) + pOffsetX;
  const cY = (Number(template.chequeY) || 0) + pOffsetY;
  const cW = Number(template.chequeWidth) || 178;
  const cH = Number(template.chequeHeight) || 89;
  const cRot = (Number(template.chequeRotation) || 0) % 360;

  // ---------------------------------------------------------------------------
  // TEST PRINT OVERLAYS (Only drawn when printType === 'test')
  // ---------------------------------------------------------------------------
  if (printType === 'test') {
    // 1. A4 Page boundary margin guide
    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.3);
    doc.rect(5, 5, a4Width - 10, a4Height - 10);

    // 2. Corner alignment crosshairs
    const drawCrosshair = (x: number, y: number) => {
      doc.setDrawColor(160, 175, 190);
      doc.setLineWidth(0.2);
      doc.line(x - 4, y, x + 4, y);
      doc.line(x, y - 4, x, y + 4);
    };
    drawCrosshair(10, 10);
    drawCrosshair(a4Width - 10, 10);
    drawCrosshair(10, a4Height - 10);
    drawCrosshair(a4Width - 10, a4Height - 10);

    // 3. Printer Feed & Header Info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 115, 130);
    doc.text(
      `SN INVOICE — CHEQUE CALIBRATION SHEET (A4 ${template.a4Orientation.toUpperCase()} · ${a4Width}x${a4Height}mm)`,
      15,
      9
    );
    doc.text(
      `Bank: ${template.bankName} | Cheque Size: ${cW}x${cH}mm | Cheque Pos: X=${template.chequeX}mm, Y=${template.chequeY}mm | Rot: ${cRot}°`,
      15,
      13
    );

    // 4. 100mm Physical Scale Verification Bar
    doc.setDrawColor(30, 41, 59);
    doc.setFillColor(30, 41, 59);
    doc.rect(a4Width - 115, 7, 100, 1.5, 'F');
    doc.setFontSize(7);
    doc.text('100 mm scale check (measure with ruler to confirm 100% 1:1 scale print)', a4Width - 115, 12);

    // 5. Feed Direction Arrow
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text(`▲ PRINTER FEED DIRECTION (LEADING EDGE: ${template.feedDirection?.toUpperCase() || 'TOP'})`, a4Width / 2, 8, {
      align: 'center',
    });

    // 6. Draw Cheque Outer Box (Rotated)
    doc.saveGraphicsState();
    // Rotate canvas around (cX, cY)
    if (cRot !== 0) {
      // jsPDF angle is in degrees clockwise if using matrix, or convert
    }
  }

  // ---------------------------------------------------------------------------
  // HELPER: Transform Cheque-Local (x, y) into Page Absolute Coordinates
  // ---------------------------------------------------------------------------
  function transformCoord(localX: number, localY: number): { x: number; y: number; textAngle: number } {
    let pageX = cX;
    let pageY = cY;
    let angle = 0;

    switch (cRot) {
      case 0:
        pageX = cX + localX;
        pageY = cY + localY;
        angle = 0;
        break;
      case 90:
        // 90 deg clockwise: origin (0,0) lands at (cX + cH, cY)
        // Local X points down (+Y page), Local Y points left (-X page)
        pageX = cX + (cH - localY);
        pageY = cY + localX;
        angle = 270; // 90 deg clockwise in text orientation
        break;
      case 180:
        // 180 deg clockwise (upside-down):
        // Local X points left (-X page), Local Y points up (-Y page)
        pageX = cX + (cW - localX);
        pageY = cY + (cH - localY);
        angle = 180;
        break;
      case 270:
        // 270 deg clockwise (90 deg counter-clockwise):
        pageX = cX + localY;
        pageY = cY + (cW - localX);
        angle = 90;
        break;
      default:
        pageX = cX + localX;
        pageY = cY + localY;
        angle = 0;
    }

    return { x: pageX, y: pageY, textAngle: angle };
  }

  // If Test Mode, draw the cheque boundary rectangle
  if (printType === 'test') {
    doc.setDrawColor(16, 185, 129); // Emerald border
    doc.setLineWidth(0.5);

    // Draw the 4 corners of the cheque
    const p1 = transformCoord(0, 0);
    const p2 = transformCoord(cW, 0);
    const p3 = transformCoord(cW, cH);
    const p4 = transformCoord(0, cH);

    doc.line(p1.x, p1.y, p2.x, p2.y);
    doc.line(p2.x, p2.y, p3.x, p3.y);
    doc.line(p3.x, p3.y, p4.x, p4.y);
    doc.line(p4.x, p4.y, p1.x, p1.y);

    // Cheque label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129);
    const labelPos = transformCoord(4, 6);
    doc.text(`[CHEQUE BOUNDARY: ${template.bankName}]`, labelPos.x, labelPos.y, {
      angle: labelPos.textAngle,
    });
  }

  // ---------------------------------------------------------------------------
  // PRINTABLE FIELDS
  // ---------------------------------------------------------------------------
  const fields = template.fields;

  // Helper to draw a text field
  const renderField = (
    cfg: any,
    value: string,
    fallbackName: string,
    options?: { isCrossing?: boolean }
  ) => {
    if (!cfg || cfg.isVisible === false || !value) return;

    const coords = transformCoord(cfg.x, cfg.y);

    // In test print, draw the field bounding box outline & label
    if (printType === 'test') {
      doc.setDrawColor(14, 165, 233); // Sky blue dashed outline
      doc.setLineWidth(0.25);
      doc.setLineDashPattern([1, 1], 0);

      const fW = cfg.width || 30;
      const fH = cfg.height || 8;
      const b1 = transformCoord(cfg.x, cfg.y);
      const b2 = transformCoord(cfg.x + fW, cfg.y);
      const b3 = transformCoord(cfg.x + fW, cfg.y + fH);
      const b4 = transformCoord(cfg.x, cfg.y + fH);

      doc.line(b1.x, b1.y, b2.x, b2.y);
      doc.line(b2.x, b2.y, b3.x, b3.y);
      doc.line(b3.x, b3.y, b4.x, b4.y);
      doc.line(b4.x, b4.y, b1.x, b1.y);

      doc.setLineDashPattern([], 0); // reset dash

      // Small label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(14, 165, 233);
      doc.text(`[${fallbackName}]`, b1.x, b1.y - 0.5, { angle: coords.textAngle });
    }

    // Prepare text styling
    const font = cfg.fontFamily === 'Courier' ? 'courier' : 'helvetica';
    const weight = cfg.fontWeight === 'bold' ? 'bold' : 'normal';
    doc.setFont(font, weight);
    doc.setFontSize(cfg.fontSize || 10);
    doc.setTextColor(15, 23, 42); // Clean dark navy / black for crisp printing

    // Special Crossing handling (A/C PAYEE ONLY with double parallel lines)
    if (options?.isCrossing) {
      const crossingText = value || 'A/C PAYEE ONLY';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(cfg.fontSize || 8);

      // Render crossing text
      doc.text(crossingText, coords.x, coords.y, {
        angle: coords.textAngle,
        align: cfg.textAlign || 'center',
      });

      // Draw double parallel lines if style is parallel_lines
      if (cfg.style !== 'text_only') {
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.35);
        const l1Start = transformCoord(cfg.x, cfg.y - 2);
        const l1End = transformCoord(cfg.x + (cfg.width || 30), cfg.y - 2);
        const l2Start = transformCoord(cfg.x, cfg.y + 4);
        const l2End = transformCoord(cfg.x + (cfg.width || 30), cfg.y + 4);
        doc.line(l1Start.x, l1Start.y, l1End.x, l1End.y);
        doc.line(l2Start.x, l2Start.y, l2End.x, l2End.y);
      }
      return;
    }

    // Format text with prefix / suffix
    let displayText = `${cfg.prefix || ''}${value}${cfg.suffix || ''}`;

    // Date spacing if letterSpacing is set
    if (cfg.id === 'date' && cfg.letterSpacing && cfg.letterSpacing > 0) {
      // Split characters and space them
      const chars = displayText.replace(/\s+/g, '').split('');
      chars.forEach((char, idx) => {
        const charCoord = transformCoord(cfg.x + idx * (cfg.letterSpacing || 3.5), cfg.y);
        doc.text(char, charCoord.x, charCoord.y, {
          angle: charCoord.textAngle,
        });
      });
      return;
    }

    // Amount in words: multi-line wrapping if needed
    if (cfg.id === 'amountWords') {
      const maxW = cfg.width || 120;
      const splitLines = doc.splitTextToSize(displayText, maxW);
      const lineH = (cfg.fontSize || 10) * 0.45; // mm per line

      splitLines.slice(0, cfg.maxLines || 2).forEach((line: string, idx: number) => {
        const lineCoord = transformCoord(cfg.x, cfg.y + idx * (lineH * (cfg.lineHeight || 1.25)));
        doc.text(line, lineCoord.x, lineCoord.y, {
          angle: lineCoord.textAngle,
          align: cfg.textAlign || 'left',
        });
      });
      return;
    }

    // Standard Single Line Text
    doc.text(displayText, coords.x, coords.y, {
      angle: coords.textAngle,
      align: cfg.textAlign || 'left',
    });
  };

  // 1. Date
  if (fields.date) {
    renderField(fields.date, liveData.date, 'Date');
  }

  // 2. Payee Name
  if (fields.payee) {
    renderField(fields.payee, liveData.payeeName, 'Payee');
  }

  // 3. Amount in Words
  if (fields.amountWords) {
    renderField(fields.amountWords, liveData.amountWords, 'Amount in Words');
  }

  // 4. Amount in Figures
  if (fields.amountFigures) {
    renderField(fields.amountFigures, liveData.amountFigures, 'Amount in Figures');
  }

  // 5. Crossing (A/C Payee Only)
  if (fields.crossing) {
    renderField(fields.crossing, liveData.crossingText || 'A/C PAYEE ONLY', 'Crossing', { isCrossing: true });
  }

  return doc;
}

export function generateChequePdfBlob(payload: ChequePrintPayload): Blob {
  const doc = createChequePdf(payload);
  return doc.output('blob');
}

export function generateChequePdfDataUrl(payload: ChequePrintPayload): string {
  const doc = createChequePdf(payload);
  return doc.output('datauristring');
}

export function downloadChequePdf(payload: ChequePrintPayload, filename?: string): void {
  const doc = createChequePdf(payload);
  const defaultName = `Cheque_${payload.liveData.chequeNumber || 'Print'}_${payload.printType}.pdf`;
  doc.save(filename || defaultName);
}
