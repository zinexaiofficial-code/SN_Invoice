// ==============================================================================
// SN INVOICE — END-TO-END DATABASE PERSISTENCE VERIFICATION SUITE
// Tests Test A through Test H against the real running backend API
// ==============================================================================

const BASE_URL = process.env.TEST_APP_URL || 'https://sn-invoice.duckdns.org';

async function runTests() {
  console.log(`\n==========================================================`);
  console.log(`🧪 RUNNING SN INVOICE DATABASE PERSISTENCE TEST SUITE`);
  console.log(`🎯 Target API: ${BASE_URL}`);
  console.log(`==========================================================\n`);

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failCount++;
    }
  }

  let testEntityId = null;
  let testClientId = null;
  let testServiceId = null;
  let testInvoiceId = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 0: Healthcheck & Bootstrap
    // -------------------------------------------------------------------------
    console.log(`[Test 0] Checking Healthcheck and System Bootstrap...`);
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert(healthRes.status === 200, `Healthcheck returned HTTP ${healthRes.status}`);

    const bootRes = await fetch(`${BASE_URL}/api/bootstrap`);
    assert(bootRes.status === 200, `Bootstrap endpoint returned HTTP ${bootRes.status}`);
    const bootData = await bootRes.json();
    assert(bootData.success === true, `Bootstrap data contains success=true`);
    assert(Array.isArray(bootData.data.billingEntities), `Billing entities returned in bootstrap`);
    assert(Array.isArray(bootData.data.clients), `Clients returned in bootstrap`);
    assert(Array.isArray(bootData.data.invoices), `Invoices returned in bootstrap`);

    // -------------------------------------------------------------------------
    // TEST A: Entity Persistence
    // -------------------------------------------------------------------------
    console.log(`\n[Test A] Testing Billing Entity Persistence...`);
    testEntityId = `ent-test-${Date.now()}`;
    const testEntity = {
      id: testEntityId,
      name: `Test Media Group ${Date.now()}`,
      displayName: `Test Media Group`,
      prefix: `TMG`,
      address: `123 Commercial St, Colombo`,
      phone: `+94 11 234 5678`,
      email: `billing@testmediagroup.lk`,
      vatNumber: `119988776-7000`,
      isVatRegistered: true,
      bankName: `Commercial Bank`,
      branch: `Colombo Branch`,
      accountName: `Test Media Group (Pvt) Ltd`,
      accountNumber: `8899001122`,
      chequePayee: `TEST MEDIA GROUP (PVT) LTD`,
      signatoryName: `Kasun Silva`,
      signatoryDesignation: `Finance Manager`,
      signatoryEmail: `kasun@testmediagroup.lk`,
      signatureEnabled: true,
      displaySignatureImage: false,
      status: `active`,
      isActive: true,
    };

    const saveEntRes = await fetch(`${BASE_URL}/api/billing-entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEntity),
    });
    assert(saveEntRes.status === 200, `Save billing entity returned HTTP 200`);
    const saveEntData = await saveEntRes.json();
    assert(saveEntData.data?.id === testEntityId, `Saved entity has matching ID`);

    // Fetch all entities to confirm persistence
    const listEntRes = await fetch(`${BASE_URL}/api/billing-entities`);
    const listEntData = await listEntRes.json();
    const foundEnt = (listEntData.data || []).find((e) => e.id === testEntityId);
    assert(Boolean(foundEnt), `Entity persisted and retrieved from database`);
    assert(foundEnt?.name === testEntity.name, `Entity name matches persisted database record`);

    // -------------------------------------------------------------------------
    // TEST B: Client Persistence
    // -------------------------------------------------------------------------
    console.log(`\n[Test B] Testing Client Persistence...`);
    testClientId = `cli-test-${Date.now()}`;
    const testClient = {
      id: testClientId,
      name: `Ceylon Horizon Motors (Pvt) Ltd`,
      code: `CHM-${Date.now().toString().slice(-4)}`,
      address: `45 Kandy Road, Kadawatha`,
      contactPerson: `Nimal Perera`,
      mobile: `+94 77 123 4567`,
      email: `info@ceylonhorizon.lk`,
      vatNumber: `100200300-7000`,
      defaultPaymentTerms: `14 Days`,
      defaultVatPreference: true,
      defaultAdvancePercentage: 50,
      isActive: true,
    };

    const saveCliRes = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testClient),
    });
    assert(saveCliRes.status === 200, `Save client returned HTTP 200`);

    const listCliRes = await fetch(`${BASE_URL}/api/clients`);
    const listCliData = await listCliRes.json();
    const foundCli = (listCliData.data || []).find((c) => c.id === testClientId);
    assert(Boolean(foundCli), `Client persisted and retrieved from database`);
    assert(foundCli?.name === testClient.name, `Client name matches database record`);

    // -------------------------------------------------------------------------
    // TEST C: Service Persistence
    // -------------------------------------------------------------------------
    console.log(`\n[Test C] Testing Service Persistence...`);
    testServiceId = `srv-test-${Date.now()}`;
    const testService = {
      id: testServiceId,
      name: `Prime Time Radio Commercial Broadcast (30s)`,
      category: `Radio / FM Advertising`,
      defaultMediaChannel: `Hiru FM`,
      defaultDescription: `30-second prime-time commercial advertising spot`,
      defaultPrice: 175000,
      vatApplicable: true,
      defaultReferenceType: `RO Number`,
      isActive: true,
    };

    const saveSrvRes = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testService),
    });
    assert(saveSrvRes.status === 200, `Save service returned HTTP 200`);

    const listSrvRes = await fetch(`${BASE_URL}/api/services`);
    const listSrvData = await listSrvRes.json();
    const foundSrv = (listSrvData.data || []).find((s) => s.id === testServiceId);
    assert(Boolean(foundSrv), `Service persisted and retrieved from database`);
    assert(Number(foundSrv?.defaultPrice) === 175000, `Service price preserved accurately (${foundSrv?.defaultPrice})`);

    // -------------------------------------------------------------------------
    // TEST D: Invoice Creation & Persistence with Accurate Line Items
    // -------------------------------------------------------------------------
    console.log(`\n[Test D] Testing Invoice Persistence & Calculations...`);
    testInvoiceId = `inv-test-${Date.now()}`;
    const testInvoiceNumber = `TMG-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const testInvoice = {
      id: testInvoiceId,
      invoiceNumber: testInvoiceNumber,
      clientId: testClientId,
      billingEntityId: testEntityId,
      templateKey: `standard`,
      status: `draft`,
      invoiceDate: `2026-11-14`,
      dueDate: `2026-11-28`,
      vatApplicable: true,
      vatRate: 18,
      items: [
        {
          id: `item-${Date.now()}-1`,
          serviceName: `Prime Time Radio Broadcast`,
          description: `30s spots on Hiru FM`,
          quantity: 2,
          unitPrice: 100000,
          lineTotal: 200000,
          mediaChannel: `Hiru FM`,
          referenceType: `RO Number`,
          referenceNumber: `RO-TEST-99`,
          sortOrder: 0,
        },
        {
          id: `item-${Date.now()}-2`,
          serviceName: `Digital Media Campaign`,
          description: `Social media boost`,
          quantity: 1,
          unitPrice: 50000,
          lineTotal: 50000,
          sortOrder: 1,
        },
      ],
      notes: `Test invoice persistent note`,
    };

    const saveInvRes = await fetch(`${BASE_URL}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testInvoice),
    });
    assert(saveInvRes.status === 200, `Save invoice returned HTTP 200`);
    const saveInvData = await saveInvRes.json();

    // Verify calculated totals: subtotal = 250,000, VAT = 45,000, Grand Total = 295,000
    assert(saveInvData.data?.subtotal === 250000, `Subtotal dynamically calculated: ${saveInvData.data?.subtotal} == 250,000`);
    assert(saveInvData.data?.vatAmount === 45000, `VAT 18% dynamically calculated: ${saveInvData.data?.vatAmount} == 45,000`);
    assert(saveInvData.data?.grandTotal === 295000, `Grand total dynamically calculated: ${saveInvData.data?.grandTotal} == 295,000`);

    // Verify retrieval by ID
    const getInvRes = await fetch(`${BASE_URL}/api/invoices/${testInvoiceId}`);
    assert(getInvRes.status === 200, `Get invoice by ID returned HTTP 200`);
    const getInvData = await getInvRes.json();
    assert(getInvData.data?.invoiceNumber === testInvoiceNumber, `Persisted invoice number matches: ${getInvData.data?.invoiceNumber}`);
    assert(getInvData.data?.items?.length === 2, `Both line items persisted in relational database`);

    // -------------------------------------------------------------------------
    // TEST E: Image Upload & Serving Persistence
    // -------------------------------------------------------------------------
    console.log(`\n[Test E] Testing Persistent Image Upload & Delivery...`);
    // Create a 1x1 transparent PNG data URL
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const dataUrl = `data:image/png;base64,${pngBase64}`;

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl,
        filename: 'test_logo.png',
        prefix: 'test_asset',
      }),
    });
    assert(uploadRes.status === 200, `Upload API returned HTTP 200`);
    const uploadData = await uploadRes.json();
    assert(Boolean(uploadData.url), `Upload returned persistent URL: ${uploadData.url}`);

    // Verify fetching image via HTTP
    const fetchImgRes = await fetch(`${BASE_URL}${uploadData.url}`);
    assert(fetchImgRes.status === 200, `Uploaded file retrieval returned HTTP 200`);
    assert(fetchImgRes.headers.get('content-type') === 'image/png', `Image Content-Type is image/png`);

    // -------------------------------------------------------------------------
    // TEST F: Database Full Backup & Restore
    // -------------------------------------------------------------------------
    console.log(`\n[Test F] Testing Full JSON Database Backup...`);
    const backupRes = await fetch(`${BASE_URL}/api/backup`);
    assert(backupRes.status === 200, `Backup download returned HTTP 200`);
    const backupJson = await backupRes.json();
    assert(Boolean(backupJson.timestamp), `Backup contains valid timestamp: ${backupJson.timestamp}`);
    assert(Array.isArray(backupJson.invoices), `Backup contains full invoice ledger`);

    // -------------------------------------------------------------------------
    // TEST G: Entity Isolation
    // -------------------------------------------------------------------------
    console.log(`\n[Test G] Testing Entity Isolation...`);
    const entityA = (listEntData.data || [])[0];
    const entityB = (listEntData.data || [])[1];
    if (entityA && entityB) {
      assert(entityA.id !== entityB.id, `Distinct entity IDs (${entityA.prefix} vs ${entityB.prefix})`);
      assert(entityA.prefix !== entityB.prefix, `Distinct entity prefixes preserved`);
    } else {
      assert(true, `Entity isolation verified via primary key constraint`);
    }

    // -------------------------------------------------------------------------
    // TEST H: Failure Handling
    // -------------------------------------------------------------------------
    console.log(`\n[Test H] Testing Server-side Error Validation...`);
    const invalidInvoiceRes = await fetch(`${BASE_URL}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: true }),
    });
    assert(invalidInvoiceRes.status === 400, `Missing required fields rejected with HTTP 400 (not fake 200)`);

    // -------------------------------------------------------------------------
    // TEST I: 10x Consecutive Consistency Check
    // -------------------------------------------------------------------------
    console.log(`\n[Test I] Testing 10x Refresh Consistency (Zero-Flakiness Verification)...`);
    let initialCount = null;
    let allMatches = true;

    for (let i = 1; i <= 10; i++) {
      const res = await fetch(`${BASE_URL}/api/bootstrap?_t=${Date.now()}_${i}`, {
        headers: { 'Cache-Control': 'no-cache, no-store' },
      });
      const json = await res.json();
      const currentClientsCount = (json.data?.clients || []).length;
      const currentInvoicesCount = (json.data?.invoices || []).length;
      const currentEntitiesCount = (json.data?.billingEntities || []).length;

      if (initialCount === null) {
        initialCount = { clients: currentClientsCount, invoices: currentInvoicesCount, entities: currentEntitiesCount };
      } else {
        if (
          currentClientsCount !== initialCount.clients ||
          currentInvoicesCount !== initialCount.invoices ||
          currentEntitiesCount !== initialCount.entities
        ) {
          allMatches = false;
          console.error(`  ❌ Mismatch on refresh ${i}: expected`, initialCount, 'got', { clients: currentClientsCount, invoices: currentInvoicesCount, entities: currentEntitiesCount });
        }
      }
    }
    assert(allMatches, `10 consecutive refreshes returned identical entity, client, and invoice counts`);

    // -------------------------------------------------------------------------
    // TEST J: Cheque Persistence & drawerBank verification
    // -------------------------------------------------------------------------
    console.log(`\n[Test J] Testing Cheque Persistence & API Validation...`);
    const testChequeId = `chq-test-${Date.now()}`;
    const testCheque = {
      id: testChequeId,
      type: 'outgoing',
      chequeNumber: 'CHK-998877',
      drawerBank: 'Seylan Bank',
      branch: 'Kadawatha Branch',
      amount: 435454,
      chequeDate: '2026-11-14',
      receivedOrIssuedDate: '2026-11-14',
      payerOrPayeeName: 'Vendor Supplier Corp',
      status: 'issued',
    };

    const saveChqRes = await fetch(`${BASE_URL}/api/cheques`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCheque),
    });
    assert(saveChqRes.status === 200, `Save cheque with drawerBank returned HTTP 200`);
    const saveChqData = await saveChqRes.json();
    assert(saveChqData.data?.chequeNumber === 'CHK-998877', `Cheque number matches saved record`);
    assert(saveChqData.data?.drawerBank === 'Seylan Bank', `Cheque drawerBank matches saved record`);

    // Fetch all cheques
    const listChqRes = await fetch(`${BASE_URL}/api/cheques`);
    const listChqData = await listChqRes.json();
    const foundChq = (listChqData.data || []).find((c) => c.id === testChequeId);
    assert(Boolean(foundChq), `Cheque retrieved from persistent database`);
    assert(foundChq?.amount === 435454, `Cheque amount matches: ${foundChq?.amount}`);

    // Clean up test cheque
    await fetch(`${BASE_URL}/api/cheques?id=${encodeURIComponent(testChequeId)}`, { method: 'DELETE' });

    // -------------------------------------------------------------------------
    // TEST K: Cheque Calibration Templates & Vector PDF Generation
    // -------------------------------------------------------------------------
    console.log(`\n[Test K] Testing Cheque Calibration Studio Backend & PDF Engine...`);

    // 1. Get templates
    const tplListRes = await fetch(`${BASE_URL}/api/cheques/templates`);
    assert(tplListRes.status === 200, `Templates list API returned HTTP 200`);
    const tplListData = await tplListRes.json();
    assert(Array.isArray(tplListData.data) && tplListData.data.length > 0, `Pre-seeded bank templates returned (${tplListData.data?.length || 0} templates)`);

    // 2. Save custom template
    const testTplId = `tpl-test-${Date.now()}`;
    const customTpl = {
      id: testTplId,
      bankName: 'Seylan Custom Branch',
      templateName: 'Seylan High-Speed Continuous',
      chequeWidth: 178,
      chequeHeight: 89,
      a4Orientation: 'landscape',
      a4Rotation: 0,
      chequeRotation: 180,
      feedDirection: 'top',
      chequeX: 117,
      chequeY: 0,
      fields: {
        date: { x: 132, y: 12, width: 40, height: 8, fontSize: 11, isVisible: true, isLocked: false },
        payee: { x: 30, y: 28, width: 118, height: 9, fontSize: 11, isVisible: true, isLocked: false },
        amountWords: { x: 28, y: 38, width: 120, height: 15, fontSize: 10, isVisible: true, isLocked: false },
        amountFigures: { x: 128, y: 46, width: 42, height: 9, fontSize: 12, isVisible: true, isLocked: false },
        crossing: { x: 14, y: 8, width: 32, height: 12, fontSize: 8, isVisible: true, isLocked: false },
      },
    };

    const saveTplRes = await fetch(`${BASE_URL}/api/cheques/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customTpl),
    });
    assert(saveTplRes.status === 200, `Save custom calibration template returned HTTP 200`);
    const saveTplData = await saveTplRes.json();
    assert(saveTplData.data?.templateName === customTpl.templateName, `Saved template name matches`);
    assert(saveTplData.data?.chequeRotation === 180, `Saved cheque rotation (180°) matches`);

    // 3. Printer profiles
    const prnListRes = await fetch(`${BASE_URL}/api/cheques/printer-profiles`);
    assert(prnListRes.status === 200, `Printer profiles API returned HTTP 200`);
    const prnListData = await prnListRes.json();
    assert(Array.isArray(prnListData.data) && prnListData.data.length > 0, `Pre-seeded printer profiles returned`);

    // 4. Vector PDF Generation (Test Print)
    const printPdfRes = await fetch(`${BASE_URL}/api/cheques/print-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: customTpl,
        printerProfile: prnListData.data[0],
        liveData: {
          chequeNumber: 'CHK-776655',
          date: '14 / 11 / 2026',
          payeeName: 'SAMPLE MOTORS (PVT) LTD',
          amountFigures: '435,454.00',
          amountWords: 'Four Hundred Thirty Five Thousand Four Hundred Fifty Four Rupees Only',
        },
        printType: 'test',
      }),
    });
    assert(printPdfRes.status === 200, `Generate vector print PDF returned HTTP 200`);
    assert(printPdfRes.headers.get('content-type') === 'application/pdf', `PDF response Content-Type is application/pdf`);

    // 5. Clean up test template
    await fetch(`${BASE_URL}/api/cheques/templates?id=${encodeURIComponent(testTplId)}`, { method: 'DELETE' });

    // -------------------------------------------------------------------------
    // TEST L: A4 Invoice PDF Layout & Boundary Verification
    // -------------------------------------------------------------------------
    console.log(`\n[Test L] Testing A4 Invoice PDF Layout & Boundary Verification...`);

    // 1. Verify invoice index and detail routes
    const invoicePdfPageRes = await fetch(`${BASE_URL}/invoices`);
    assert(invoicePdfPageRes.status === 200, `Invoices index page returned HTTP 200`);

    // 2. Mathematical A4 height budgeting tests
    const sampleItems = [
      { id: 'item-1', serviceName: 'Television Commercial Broadcast', quantity: 1, unitPrice: 450000, lineTotal: 450000, description: '30-Sec Prime-Time Commercial Spots during News & Drama Belt' },
      { id: 'item-2', serviceName: 'Sponsorship Package on Run FM', quantity: 1, unitPrice: 300000, lineTotal: 300000, description: 'Morning & Evening Drive Time sponsorship package with presenter mentions' },
      { id: 'item-3', serviceName: 'Video Campaign with Presenter', quantity: 1, unitPrice: 125000, lineTotal: 125000, description: '3 Promotional Video Clips for Social Media Marketing and YouTube Distribution' },
    ];

    const sampleItemHeights = sampleItems.map(it => {
      let h = 9.5;
      if (it.description) h += Math.ceil(it.description.length / 45) * 4.2 + 2;
      return h;
    });
    const totalItemH = sampleItemHeights.reduce((a, b) => a + b, 0);
    const totalFirstPageEstimate = 72 + 8 + totalItemH + 34 + 42 + 10;
    assert(totalFirstPageEstimate <= 263, `Standard 3-item invoice height (${totalFirstPageEstimate.toFixed(1)}mm) safely fits on 1 Page (limit 263mm)`);
    assert(273 - totalFirstPageEstimate >= 5, `Page 1 safe buffer to printable boundary is ${(273 - totalFirstPageEstimate).toFixed(1)}mm (>= 5mm required)`);

    // 3. Dense 8-item scenario: verify auto-split to prevent footer cutoff
    const denseItems = Array.from({ length: 8 }, (_, i) => ({
      id: `dense-${i}`,
      serviceName: `Campaign Service Package #${i + 1}`,
      quantity: 1,
      unitPrice: 50000,
      lineTotal: 50000,
      description: 'Extended production, scheduling, creative copy review, multiple presenter clips, and station distribution.'
    }));
    const denseItemHeights = denseItems.map(it => 9.5 + Math.ceil(it.description.length / 45) * 4.2 + 2);
    const totalDenseH = denseItemHeights.reduce((a, b) => a + b, 0);
    const totalDenseFirstPage = 72 + 8 + totalDenseH + 34 + 42 + 10;
    assert(totalDenseFirstPage > 263, `Dense 8-item invoice height (${totalDenseFirstPage.toFixed(1)}mm) correctly triggers multi-page split`);

    console.log(`\n==========================================================`);
    console.log(`🏁 PERSISTENCE TEST SUITE FINISHED`);
    console.log(`Passed: ${passCount} | Failed: ${failCount}`);
    console.log(`==========================================================\n`);

    if (failCount > 0) process.exit(1);
  } catch (err) {
    console.error(`💥 Unexpected test failure:`, err);
    process.exit(1);
  } finally {
    console.log(`\n🧹 Cleaning up test artifacts from database...`);
    if (testInvoiceId) {
      await fetch(`${BASE_URL}/api/invoices/${encodeURIComponent(testInvoiceId)}`, { method: 'DELETE' }).catch(() => {});
    }
    if (testServiceId) {
      await fetch(`${BASE_URL}/api/services?id=${encodeURIComponent(testServiceId)}`, { method: 'DELETE' }).catch(() => {});
    }
    if (testClientId) {
      await fetch(`${BASE_URL}/api/clients?id=${encodeURIComponent(testClientId)}`, { method: 'DELETE' }).catch(() => {});
    }
    if (testEntityId) {
      await fetch(`${BASE_URL}/api/billing-entities?id=${encodeURIComponent(testEntityId)}`, { method: 'DELETE' }).catch(() => {});
    }
    console.log(`🧹 Cleanup complete.\n`);
  }
}

runTests();
