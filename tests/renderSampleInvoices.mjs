import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = '/Users/zinexai/.gemini/antigravity/brain/7f1d8835-e083-49c2-9de7-6f62789c43ce';

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function runCdpCommand(ws, method, params = {}, id = 1) {
  return new Promise((resolve, reject) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  console.log('Connecting to Chrome CDP...');
  const targets = await fetchJson('http://127.0.0.1:9222/json');
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const wsUrl = pageTarget.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let reqId = 1;

  async function cdp(method, params) {
    return runCdpCommand(ws, method, params, ++reqId);
  }

  await cdp('Page.enable');
  await cdp('DOM.enable');
  await cdp('Runtime.enable');

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('BROWSER CONSOLE:', msg.params.type, msg.params.args?.map(a => a.value || a.description).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.log('BROWSER EXCEPTION:', msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
    }
  });
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1200,
    height: 1600,
    deviceScaleFactor: 2,
    mobile: false
  });

  const testInvoices = [
    { id: 'inv-001', name: 'inv001_sn_nonvat', desc: 'SN Advertising Non-VAT 1-Item' },
    { id: 'inv-002', name: 'inv002_hrp_vat', desc: 'HARIPARA VAT 1-Item with Tax & Stamp' }
  ];

  // Create a 8-item dense invoice to test multi-page splitting
  console.log('\nCreating 8-item invoice to verify dynamic pagination...');
  const denseItems = Array.from({ length: 8 }, (_, i) => ({
    id: `dense-item-${i}`,
    serviceName: `Campaign Service Package #${i + 1}`,
    description: `Multi-channel advertising placement, primetime broadcast, digital social amplification, and monitoring clip #${i + 1}.`,
    quantity: 1,
    unitPrice: 50000,
    lineTotal: 50000,
    sortOrder: i
  }));

  const createDenseRes = await fetch('http://localhost:3009/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoiceNumber: '99001',
      clientId: 'c1111111-1111-1111-1111-111111111111',
      billingEntityId: 'e1111111-1111-1111-1111-111111111111',
      status: 'issued',
      invoiceDate: '2026-11-15',
      dueDate: '2026-11-30',
      items: denseItems,
      vatApplicable: true,
      vatRate: 18,
      specialNotes: 'Multi-page contract agreement terms apply.',
      paymentInstructions: 'Bank transfers to SN Advertising, A/C: 028013149867001, Seylan Bank.'
    })
  });
  const denseData = await createDenseRes.json();
  const denseInvoiceId = denseData.data?.id;
  if (denseInvoiceId) {
    testInvoices.push({
      id: denseInvoiceId,
      name: 'inv_dense_multipage',
      desc: 'Multi-Page 8-Item Invoice with Page 1 & Page 2'
    });
  }

  for (const inv of testInvoices) {
    console.log(`\nNavigating to ${inv.desc} (${inv.id})...`);
    
    const loadPromise = new Promise(resolve => {
      const loadHandler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Page.loadEventFired') {
          ws.removeEventListener('message', loadHandler);
          resolve();
        }
      };
      ws.addEventListener('message', loadHandler);
    });

    await cdp('Page.navigate', { url: `http://localhost:3009/invoices/${inv.id}/pdf?format=digital` });
    await loadPromise;

    // Check what is on the page
    const textEval = await cdp('Runtime.evaluate', {
      expression: `document.body.innerText`
    });
    console.log('Page body text:', textEval?.result?.value);

    // Wait until .a4-page-sheet is populated and not loading
    let ready = false;
    for (let attempts = 0; attempts < 30; attempts++) {
      await new Promise(r => setTimeout(r, 400));
      const evalRes = await cdp('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.a4-page-sheet'))`
      });
      if (evalRes?.result?.value === true) {
        ready = true;
        break;
      }
    }

    if (!ready) {
      console.error(`Invoice ${inv.id} failed to render in time!`);
      continue;
    }

    // Wait additional 500ms for fonts & QR code
    await new Promise(r => setTimeout(r, 600));

    // Get bounding rects of all sheets on page
    const sheetsEval = await cdp('Runtime.evaluate', {
      expression: `(() => {
        const sheets = Array.from(document.querySelectorAll('.a4-page-sheet'));
        return sheets.map(s => {
          const rect = s.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y + window.scrollY,
            width: rect.width,
            height: rect.height
          };
        });
      })()`,
      returnByValue: true
    });

    const sheetRects = sheetsEval?.result?.value || [];
    console.log(`Found ${sheetRects.length} sheet(s) for invoice ${inv.id}`);

    for (let pIdx = 0; pIdx < sheetRects.length; pIdx++) {
      const clip = await cdp('Runtime.evaluate', {
        expression: `(() => {
          const s = document.querySelectorAll('.a4-page-sheet')[${pIdx}];
          const r = s.getBoundingClientRect();
          return {
            x: r.left + window.scrollX,
            y: r.top + window.scrollY,
            width: r.width,
            height: r.height
          };
        })()`,
        returnByValue: true
      });

      const shot = await cdp('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: clip?.result?.value ? { ...clip.result.value, scale: 1 } : undefined
      });

      const pageSuffix = sheetRects.length > 1 ? `_p${pIdx + 1}` : '';
      const outPath = path.join(ARTIFACTS_DIR, `verified_${inv.name}${pageSuffix}.png`);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log(`Saved rendered sheet to ${outPath}`);
    }

    // Also capture full PDF using Page.printToPDF
    const pdfData = await cdp('Page.printToPDF', {
      paperWidth: 8.27, // 210mm in inches
      paperHeight: 11.69, // 297mm in inches
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      printBackground: true,
      preferCSSPageSize: true
    });

    const pdfOutPath = path.join(ARTIFACTS_DIR, `verified_${inv.name}.pdf`);
    fs.writeFileSync(pdfOutPath, Buffer.from(pdfData.data, 'base64'));
    console.log(`Saved printToPDF to ${pdfOutPath}`);
  }

  // Reset to about:blank
  await cdp('Page.navigate', { url: 'about:blank' });
  ws.close();
  console.log('\nAll sample invoices rendered successfully!');
}

main().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
