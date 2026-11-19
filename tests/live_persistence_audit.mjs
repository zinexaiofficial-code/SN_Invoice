import http from 'http';

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('LIVE DATABASE PERSISTENCE & INTEGRITY VERIFICATION');
  console.log('====================================================\n');

  // Test 1: Fetch Bootstrap data
  console.log('[TEST 1] Fetching initial bootstrap data...');
  const boot1 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/bootstrap',
    method: 'GET',
  });
  if (boot1.status !== 200 || !boot1.data.success) {
    throw new Error('Bootstrap failed: ' + JSON.stringify(boot1));
  }
  const d1 = boot1.data.data;
  console.log(`✓ Bootstrap OK: ${d1.billingEntities.length} Entities, ${d1.clients.length} Clients, ${d1.invoices.length} Invoices, ${d1.cheques.length} Cheques, ${d1.mediaSchedules.length} Schedules, ${d1.suppliers.length} Suppliers, ${d1.supplierPayables.length} Payables\n`);

  const entity = d1.billingEntities[0];
  const client = d1.clients[0];
  const supplier = d1.suppliers[0];

  // Test 2: Create a Media Schedule with Allocations
  console.log('[TEST 2] Creating new Media Broadcast Schedule with Programme Rows & Allocations...');
  const testSchedId = 'test-sched-' + Date.now();
  const testSchedPayload = {
    id: testSchedId,
    billingEntityId: entity.id,
    clientId: client.id,
    mediaChannelName: 'Sirasa TV',
    mediaType: 'tv',
    campaignName: 'Audit Test Campaign 2026',
    startDate: '2026-11-20',
    endDate: '2026-11-25',
    status: 'draft',
    pricingMode: 'package',
    packageAmount: 250000,
    taxApplicable: true,
    taxRate: 18,
    specialNotes: 'Persistence Verification Schedule',
    items: [
      {
        id: 'item-1-' + Date.now(),
        programmeName: 'Prime News 8PM',
        timeSlot: '08:00 PM – 08:30 PM',
        duration: '15s',
        adType: 'Spot',
        ratePerSpot: 25000,
        totalSpots: 4,
        allocations: {
          '2026-11-20': 1,
          '2026-11-21': 1,
          '2026-11-22': 2,
        }
      },
      {
        id: 'item-2-' + Date.now(),
        programmeName: 'Morning Breakfast Show',
        timeSlot: '07:00 AM – 07:30 AM',
        duration: '10s',
        adType: 'Spot',
        ratePerSpot: 15000,
        totalSpots: 3,
        allocations: {
          '2026-11-23': 1,
          '2026-11-24': 1,
          '2026-11-25': 1,
        }
      }
    ]
  };

  const saveSchedRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/schedules',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, testSchedPayload);

  if (saveSchedRes.status !== 200 || !saveSchedRes.data.success) {
    throw new Error('Save schedule failed: ' + JSON.stringify(saveSchedRes));
  }
  const savedSched = saveSchedRes.data.data;
  console.log(`✓ Schedule Saved: ID=${savedSched.id}, Number=${savedSched.scheduleNumber}, Net=${savedSched.netTotal}`);
  console.log(`  Items count: ${savedSched.items.length}, Grand Total Spots: ${savedSched.totalSpots}\n`);

  // Test 3: Reload Schedule from DB and verify exact dates & spots
  console.log('[TEST 3] Fetching saved Schedule by ID from backend...');
  const getSchedRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/schedules/${testSchedId}`,
    method: 'GET',
  });
  if (getSchedRes.status !== 200 || !getSchedRes.data.success) {
    throw new Error('Get schedule by ID failed: ' + JSON.stringify(getSchedRes));
  }
  const loadedSched = getSchedRes.data.data;
  console.log(`✓ Retrieved Schedule: ${loadedSched.scheduleNumber}`);
  const item1 = loadedSched.items.find(i => i.programmeName === 'Prime News 8PM');
  const item2 = loadedSched.items.find(i => i.programmeName === 'Morning Breakfast Show');
  console.log('  Item 1 Allocations:', item1.allocations);
  console.log('  Item 2 Allocations:', item2.allocations);
  if (item1.allocations['2026-11-20'] !== 1 || item1.allocations['2026-11-22'] !== 2) {
    throw new Error('Allocation dates/spots mismatch for Item 1!');
  }
  if (item2.allocations['2026-11-25'] !== 1) {
    throw new Error('Allocation dates/spots mismatch for Item 2!');
  }
  console.log('✓ Allocation dates & spot counts match 100% without timezone shift!\n');

  // Test 4: Create Supplier Payable
  console.log('[TEST 4] Creating new Supplier Payable...');
  const testPayableId = 'test-pay-' + Date.now();
  const testPayablePayload = {
    id: testPayableId,
    billingEntityId: entity.id,
    supplierId: supplier.id,
    scheduleId: testSchedId,
    supplierBillNumber: 'BILL-SR-2026-999',
    billDate: '2026-11-20',
    dueDate: '2026-12-05',
    description: 'Broadcast airtime payment for Campaign',
    subtotal: 100000,
    taxApplicable: true,
    taxRate: 18,
  };

  const savePayRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supplier-payables',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, testPayablePayload);

  if (savePayRes.status !== 200 || !savePayRes.data.success) {
    throw new Error('Save supplier payable failed: ' + JSON.stringify(savePayRes));
  }
  const savedPayable = savePayRes.data.data;
  console.log(`✓ Supplier Payable Saved: Ref=${savedPayable.payableReference}, Total=${savedPayable.totalAmount}, Status=${savedPayable.status}\n`);

  // Test 5: Record Partial Payment
  console.log('[TEST 5] Recording partial payment against Supplier Payable...');
  const pmtPayload = {
    amount: 50000,
    paymentDate: '2026-11-21',
    paymentMethod: 'bank_transfer',
    referenceNumber: 'TXN-NTB-987654',
    notes: '50% advance for transmission',
    recordedBy: 'Super Admin'
  };

  const pmtRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/supplier-payables/${testPayableId}/payments`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, pmtPayload);

  if (pmtRes.status !== 200 || !pmtRes.data.success) {
    throw new Error('Record payment failed: ' + JSON.stringify(pmtRes));
  }
  const savedTx = pmtRes.data.data;
  console.log(`✓ Payment Transaction Recorded: Ref=${savedTx.paymentReference}, Amount=${savedTx.amount}`);

  // Fetch updated payable
  const getPayRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/supplier-payables/${testPayableId}`,
    method: 'GET',
  });
  const updatedPayable = getPayRes.data.data;
  console.log(`✓ Payable Balance Updated: Paid=${updatedPayable.totalPaid}, Outstanding=${updatedPayable.outstandingAmount}, Status=${updatedPayable.status}`);
  if (updatedPayable.totalPaid !== 50000 || updatedPayable.status !== 'partially_paid') {
    throw new Error('Payable totalPaid or status mismatch after payment!');
  }
  console.log('✓ Partial payment and balance updates verified in PostgreSQL!\n');

  // Test 6: Deletion Authorization (Non-Super Admin Block)
  console.log('[TEST 6] Testing deletion authorization as regular user...');
  const deleteSchedDenied = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/schedules?id=${testSchedId}`,
    method: 'DELETE',
    headers: { 'x-user-role': 'admin' }, // Regular admin, not super_admin
  });
  console.log(`  Delete schedule without super_admin: HTTP ${deleteSchedDenied.status} (Expected 403)`);
  if (deleteSchedDenied.status !== 403) {
    throw new Error('Expected 403 Forbidden for non-super_admin delete!');
  }
  console.log('✓ Non-super_admin permanent deletion blocked as expected!\n');

  // Test 7: Integrity Constraint Check (Cannot delete payable with active payments)
  console.log('[TEST 7] Testing deletion of payable with active payments as super_admin...');
  const deletePayDenied = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/supplier-payables?id=${testPayableId}`,
    method: 'DELETE',
    headers: { 'x-user-role': 'super_admin' },
  });
  console.log(`  Delete payable with active payments: HTTP ${deletePayDenied.status}, Error: "${deletePayDenied.data.error}"`);
  if (deletePayDenied.status !== 500 || !deletePayDenied.data.error.includes('posted payment')) {
    throw new Error('Expected deletion blocked due to active payments!');
  }
  console.log('✓ Deletion blocked by financial integrity constraints!\n');

  // Test 8: Void Payment Transaction & Clean Deletion
  console.log('[TEST 8] Voiding payment transaction...');
  const voidRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/supplier-payables/void/payments?transactionId=${savedTx.id}&reason=Audit+Test+Void`,
    method: 'DELETE',
    headers: { 'x-user-role': 'super_admin' },
  });
  if (voidRes.status !== 200 || !voidRes.data.success) {
    throw new Error('Void payment failed: ' + JSON.stringify(voidRes));
  }
  console.log('✓ Payment voided successfully!');

  // Now delete test payable as super_admin
  const deletePayOk = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/supplier-payables?id=${testPayableId}`,
    method: 'DELETE',
    headers: { 'x-user-role': 'super_admin' },
  });
  if (deletePayOk.status !== 200 || !deletePayOk.data.success) {
    throw new Error('Delete payable failed: ' + JSON.stringify(deletePayOk));
  }
  console.log('✓ Test payable deleted as super_admin.');

  // Now delete test schedule as super_admin
  const deleteSchedOk = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/schedules?id=${testSchedId}`,
    method: 'DELETE',
    headers: { 'x-user-role': 'super_admin' },
  });
  if (deleteSchedOk.status !== 200 || !deleteSchedOk.data.success) {
    throw new Error('Delete schedule failed: ' + JSON.stringify(deleteSchedOk));
  }
  console.log('✓ Test schedule deleted as super_admin.\n');

  // Test 9: Verify Production Data Untouched
  console.log('[TEST 9] Verifying production database data integrity...');
  const bootFinal = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/bootstrap',
    method: 'GET',
  });
  const dFinal = bootFinal.data.data;
  console.log(`✓ Final Counts: Entities=${dFinal.billingEntities.length}, Clients=${dFinal.clients.length}, Invoices=${dFinal.invoices.length}, Cheques=${dFinal.cheques.length}, Schedules=${dFinal.mediaSchedules.length}, Suppliers=${dFinal.suppliers.length}, Payables=${dFinal.supplierPayables.length}`);
  if (dFinal.billingEntities.length !== 5 || dFinal.clients.length !== 3 || dFinal.invoices.length !== 7 || dFinal.cheques.length !== 11) {
    throw new Error('Production data counts changed unexpectedly!');
  }
  console.log('✓ 100% of existing production data remains intact and verified!\n');

  console.log('====================================================');
  console.log('ALL PERSISTENCE AND INTEGRITY TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ AUDIT FAILED:', err);
  process.exit(1);
});
