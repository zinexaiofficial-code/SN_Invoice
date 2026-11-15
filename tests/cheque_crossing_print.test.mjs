import assert from 'node:assert';
import { jsPDF } from 'jspdf';

console.log('--- STARTING CHEQUE CROSSING & PRECISION PRINTING SUITE ---');

// =============================================================================
// 1. DEDUPLICATION LOGIC VERIFICATION
// =============================================================================
function formatChequeAmountWords(
  words,
  prefix = '*** ',
  suffix = ' ***'
) {
  let cleanWords = (words || '').trim();

  // Strip multiple consecutive "Rupees Only" from the base words
  cleanWords = cleanWords.replace(/(Rupees\s+Only\s*)+/gi, 'Rupees Only');

  let cleanSuffix = suffix || '';
  // If cleanWords already has "Rupees Only", remove it from suffix
  if (/Rupees\s+Only\b/i.test(cleanWords) && /Rupees\s+Only/i.test(cleanSuffix)) {
    cleanSuffix = cleanSuffix.replace(/Rupees\s+Only\s*/gi, '').trim();
    if (cleanSuffix && !cleanSuffix.startsWith(' ')) {
      cleanSuffix = ' ' + cleanSuffix;
    }
  }

  // If neither words nor suffix has "Rupees Only", append it to words
  if (!/Rupees\s+Only\b/i.test(cleanWords) && !/Rupees\s+Only/i.test(cleanSuffix)) {
    cleanWords = `${cleanWords} Rupees Only`;
  }

  const result = `${prefix || ''}${cleanWords}${cleanSuffix}`.trim();
  // Final safeguard: remove duplicate consecutive "Rupees Only"
  return result.replace(/(Rupees\s+Only)(\s+Rupees\s+Only)+/gi, '$1').replace(/\s+/g, ' ');
}

console.log('\n[Test 1] Testing formatChequeAmountWords deduplication...');

const c1 = formatChequeAmountWords(
  'Thirty Four Thousand Three Hundred Twenty Four Rupees Only',
  '*** ',
  ' Rupees Only ***'
);
assert.strictEqual(
  c1,
  '*** Thirty Four Thousand Three Hundred Twenty Four Rupees Only ***',
  `Failed: got "${c1}"`
);
console.log('✓ Case 1 Passed: Duplicate in suffix stripped cleanly ->', c1);

const c2 = formatChequeAmountWords(
  'Thirty Four Thousand Three Hundred Twenty Four Rupees Only Rupees Only',
  '*** ',
  ' ***'
);
assert.strictEqual(
  c2,
  '*** Thirty Four Thousand Three Hundred Twenty Four Rupees Only ***',
  `Failed: got "${c2}"`
);
console.log('✓ Case 2 Passed: Pre-existing duplicate words stripped ->', c2);

const c3 = formatChequeAmountWords(
  'One Hundred Twenty Five Thousand',
  '*** ',
  ' ***'
);
assert.strictEqual(
  c3,
  '*** One Hundred Twenty Five Thousand Rupees Only ***',
  `Failed: got "${c3}"`
);
console.log('✓ Case 3 Passed: Missing "Rupees Only" appended cleanly ->', c3);

const c4 = formatChequeAmountWords(
  'Fifty Thousand Rupees Only',
  '*** ',
  ' ***'
);
assert.strictEqual(
  c4,
  '*** Fifty Thousand Rupees Only ***',
  `Failed: got "${c4}"`
);
console.log('✓ Case 4 Passed: Clean input preserved ->', c4);

// =============================================================================
// 2. VECTOR PDF CROSSING RENDERING TEST
// =============================================================================
console.log('\n[Test 2] Testing jsPDF Vector Crossing Rendering (Angle & Geometry)...');

function hexToRgb(hex) {
  if (!hex) return [179, 38, 45];
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.substring(0, 2), 16) || 0,
    parseInt(clean.substring(2, 4), 16) || 0,
    parseInt(clean.substring(4, 6), 16) || 0,
  ];
}

// Verify RGB parsing
const rgbRed = hexToRgb('#B3262D');
assert.deepStrictEqual(rgbRed, [179, 38, 45]);
console.log('✓ Hex #B3262D converted to RGB:', rgbRed);

const rgbBlack = hexToRgb('#000000');
assert.deepStrictEqual(rgbBlack, [0, 0, 0]);
console.log('✓ Hex #000000 converted to RGB:', rgbBlack);

const rgbNavy = hexToRgb('#1E3A8A');
assert.deepStrictEqual(rgbNavy, [30, 58, 138]);
console.log('✓ Hex #1E3A8A converted to RGB:', rgbNavy);

// Generate PDF with Crossing OFF
console.log('\n[Test 3] Generating A4 Landscape PDF with Crossing OFF...');
const docOff = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
// Draw sample cheque fields
docOff.setFont('helvetica', 'bold');
docOff.setFontSize(11);
docOff.text('15 / 11 / 2026', 134, 27);
docOff.text('*** SAMPLE COMPANY (PVT) LTD ***', 30, 43);
docOff.text(formatChequeAmountWords('One Hundred Twenty Five Thousand Rupees Only'), 28, 53);
docOff.text('= 125,000.00 /=', 128, 61);

const bufOff = docOff.output('arraybuffer');
assert(bufOff.byteLength > 1000, 'PDF buffer must be valid');
console.log(`✓ PDF with Crossing OFF generated successfully (${bufOff.byteLength} bytes)`);

// Generate PDF with Crossing ON (45° Diagonal Top-Left)
console.log('\n[Test 4] Generating A4 Landscape PDF with Crossing ON (45° Rotated, Dark Red)...');
const docOn = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
docOn.setFont('helvetica', 'bold');
docOn.setFontSize(11);
docOn.text('15 / 11 / 2026', 134, 27);
docOn.text('*** SAMPLE COMPANY (PVT) LTD ***', 30, 43);
docOn.text(formatChequeAmountWords('One Hundred Twenty Five Thousand Rupees Only'), 28, 53);
docOn.text('= 125,000.00 /=', 128, 61);

// Draw Crossing Group at 45°
const cfg = {
  x: 16,
  y: 10,
  lineLength: 34,
  lineSpacing: 7.5,
  lineThickness: 0.35,
  angle: 45,
  text: 'A/C PAYEE ONLY',
  textColor: '#B3262D',
  lineColor: '#B3262D',
  showLines: true,
};

const cx = cfg.x + cfg.lineLength / 2;
const cy = cfg.y + cfg.lineSpacing / 2;
const theta = (cfg.angle * Math.PI) / 180;
const ux = Math.cos(theta);
const uy = Math.sin(theta);
const vx = -Math.sin(theta);
const vy = Math.cos(theta);
const halfL = cfg.lineLength / 2;
const halfS = cfg.lineSpacing / 2;

// Endpoints
const p1S = { x: cx - halfS * vx - halfL * ux, y: cy - halfS * vy - halfL * uy };
const p1E = { x: cx - halfS * vx + halfL * ux, y: cy - halfS * vy + halfL * uy };
const p2S = { x: cx + halfS * vx - halfL * ux, y: cy + halfS * vy - halfL * uy };
const p2E = { x: cx + halfS * vx + halfL * ux, y: cy + halfS * vy + halfL * uy };

docOn.setDrawColor(...rgbRed);
docOn.setLineWidth(cfg.lineThickness);
docOn.line(p1S.x, p1S.y, p1E.x, p1E.y);
docOn.line(p2S.x, p2S.y, p2E.x, p2E.y);

docOn.setTextColor(...rgbRed);
docOn.setFontSize(8.5);
// jsPDF counter-clockwise angle
const jsPdfAngle = (-cfg.angle + 360) % 360;
docOn.text(cfg.text, cx, cy, { align: 'center', baseline: 'middle', angle: jsPdfAngle });

const bufOn = docOn.output('arraybuffer');
assert(bufOn.byteLength > bufOff.byteLength, 'PDF with crossing must contain additional vector objects');
console.log(`✓ PDF with 45° Rotated Dark Red Crossing generated successfully (${bufOn.byteLength} bytes)`);

console.log('\n======================================================');
console.log('ALL TESTS PASSED: Crossing & Precision Printing Ready!');
console.log('======================================================\n');
