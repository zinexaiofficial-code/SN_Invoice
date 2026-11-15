// ==============================================================================
// SUPER ADMIN DELETION & PURGE API VERIFICATION TEST
// Tests single and batch deletion across Invoices, Services, Clients, Cheques, Entities
// ==============================================================================

const BASE_URL = process.env.TEST_APP_URL || 'https://sn-invoice.duckdns.org';

async function runSuperAdminTests() {
  console.log(`\n==========================================================`);
  console.log(`⚡ RUNNING SUPER ADMIN DELETION API TEST SUITE`);
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

  try {
    // 1. Get an existing billing entity and client to create test invoices
    const bootRes = await fetch(`${BASE_URL}/api/bootstrap`);
    const bootData = await bootRes.json();
    const entityId = bootData.data.billingEntities[0]?.id;
    const clientId = bootData.data.clients[0]?.id;

    assert(Boolean(entityId), `Found active billing entity (${entityId})`);
    assert(Boolean(clientId), `Found active client (${clientId})`);

    // 2. Test Single Invoice Deletion (DELETE /api/invoices/[id])
    console.log(`\n[Test 1] Testing Single Invoice Deletion...`);
    const inv1Res = await fetch(`${BASE_URL}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billingEntityId: entityId,
        clientId: clientId,
        invoiceDate: '2026-11-15',
        dueDate: '2026-11-30',
        items: [
          {
            description: 'Test Item For Super Admin Delete',
            serviceName: 'Radio Jingles',
            quantity: 1,
            unitPrice: 50000,
            lineTotal: 50000
          }
        ]
      })
    });
    assert(inv1Res.status === 200, `Created test invoice for single deletion`);
    const inv1Data = await inv1Res.json();
    const inv1Id = inv1Data.data.id;

    // Verify invoice exists
    const check1Res = await fetch(`${BASE_URL}/api/invoices/${encodeURIComponent(inv1Id)}`);
    assert(check1Res.status === 200, `Test invoice verified in database before deletion`);

    // Perform DELETE
    const del1Res = await fetch(`${BASE_URL}/api/invoices/${encodeURIComponent(inv1Id)}`, {
      method: 'DELETE'
    });
    assert(del1Res.status === 200, `DELETE /api/invoices/${inv1Id} returned HTTP 200`);
    const del1Data = await del1Res.json();
    assert(del1Data.success === true, `Delete returned success=true`);

    // Verify invoice is gone
    const checkAfter1 = await fetch(`${BASE_URL}/api/invoices/${encodeURIComponent(inv1Id)}`);
    assert(checkAfter1.status === 404, `Deleted invoice correctly returns 404 Not Found`);

    // 3. Test Batch Invoices Deletion (DELETE /api/invoices with body { ids })
    console.log(`\n[Test 2] Testing Batch Invoices Deletion (Monthly History Purge)...`);
    const batchInvoices = [];
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${BASE_URL}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingEntityId: entityId,
          clientId: clientId,
          invoiceDate: '2026-09-15',
          dueDate: '2026-09-30',
          items: [
            {
              description: `Batch Test Item ${i + 1}`,
              serviceName: 'Social Media Campaign',
              quantity: 1,
              unitPrice: 20000,
              lineTotal: 20000
            }
          ]
        })
      });
      const data = await res.json();
      batchInvoices.push(data.data.id);
    }
    assert(batchInvoices.length === 3, `Created 3 test invoices for batch deletion: ${batchInvoices.join(', ')}`);

    // Perform batch DELETE
    const delBatchRes = await fetch(`${BASE_URL}/api/invoices`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: batchInvoices })
    });
    assert(delBatchRes.status === 200, `DELETE /api/invoices batch returned HTTP 200`);
    const delBatchData = await delBatchRes.json();
    assert(delBatchData.success === true, `Batch delete returned success=true`);
    assert(delBatchData.count === 3, `Batch delete reported 3 items deleted`);

    // Verify all 3 are gone
    for (const id of batchInvoices) {
      const checkRes = await fetch(`${BASE_URL}/api/invoices/${encodeURIComponent(id)}`);
      assert(checkRes.status === 404, `Batch deleted invoice ${id} returns 404 Not Found`);
    }

    // 4. Test Service Deletion (DELETE /api/services?id=...)
    console.log(`\n[Test 3] Testing Service Deletion...`);
    const srvRes = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Temporary Delete Service ${Date.now()}`,
        defaultPrice: 35000,
        category: 'Digital Marketing & Social Media'
      })
    });
    assert(srvRes.status === 200, `Created temporary service`);
    const srvData = await srvRes.json();
    const srvId = srvData.data.id;

    const delSrvRes = await fetch(`${BASE_URL}/api/services?id=${encodeURIComponent(srvId)}`, {
      method: 'DELETE'
    });
    assert(delSrvRes.status === 200, `DELETE /api/services?id=${srvId} returned HTTP 200`);
    const delSrvData = await delSrvRes.json();
    assert(delSrvData.success === true, `Service delete returned success=true`);

    // 5. Test Cheque Deletion (DELETE /api/cheques?id=...)
    console.log(`\n[Test 4] Testing Cheque Deletion...`);
    const chqRes = await fetch(`${BASE_URL}/api/cheques`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'outgoing',
        chequeNumber: `CHQ-DEL-${Date.now().toString().slice(-4)}`,
        amount: 85000,
        chequeDate: '2026-11-20',
        receivedOrIssuedDate: '2026-11-15',
        expectedActionDate: '2026-11-20',
        payerOrPayeeName: 'Test Vendor For Deletion',
        billingEntityId: entityId
      })
    });
    assert(chqRes.status === 200, `Created temporary cheque`);
    const chqData = await chqRes.json();
    const chqId = chqData.data.id;

    const delChqRes = await fetch(`${BASE_URL}/api/cheques?id=${encodeURIComponent(chqId)}`, {
      method: 'DELETE'
    });
    assert(delChqRes.status === 200, `DELETE /api/cheques?id=${chqId} returned HTTP 200`);
    const delChqData = await delChqRes.json();
    assert(delChqData.success === true, `Cheque delete returned success=true`);

    console.log(`\n==========================================================`);
    console.log(`🏁 SUPER ADMIN TEST RESULTS: ${passCount} PASSED | ${failCount} FAILED`);
    console.log(`==========================================================\n`);

  } catch (err) {
    console.error('Test error:', err);
  }
}

runSuperAdminTests();

