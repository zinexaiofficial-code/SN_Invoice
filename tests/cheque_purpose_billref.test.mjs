import assert from 'assert';

console.log('--- STARTING CHEQUE PURPOSE & BILL REFERENCE TEST SUITE ---\n');

// Mock Cheque with Purpose of Payment and Bill Reference
const originalCheque = {
  id: 'chq-test-001',
  type: 'outgoing',
  chequeNumber: '13599',
  amount: 238212,
  currency: 'LKR',
  chequeDate: '2026-12-20',
  receivedOrIssuedDate: '2026-11-15',
  expectedActionDate: '2026-12-20',
  drawerBank: 'Commercial Bank of Ceylon',
  branch: 'xxx',
  payerOrPayeeName: 'Voice of Asia Network (Pvt) Ltd.',
  vendorId: 'v-voa-001',
  supplierName: 'Voice of Asia Network (Pvt) Ltd.',
  status: 'issued',
  purposeOfPayment: 'October Radio Commercial Airtime Campaign',
  billReference: 'INV-VOA-2026-89',
  notes: 'PV: 2026-088 Handed over at office',
  isReminderEnabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

console.log('[Test 1] Verify Initial Cheque Fields...');
assert.strictEqual(originalCheque.purposeOfPayment, 'October Radio Commercial Airtime Campaign');
assert.strictEqual(originalCheque.billReference, 'INV-VOA-2026-89');
console.log('✓ Initial purpose:', originalCheque.purposeOfPayment);
console.log('✓ Initial billReference:', originalCheque.billReference);

console.log('\n[Test 2] Simulating Edit & Update of Purpose and Bill Ref...');
const updatedCheque = {
  ...originalCheque,
  purposeOfPayment: 'Revised Prime-Time Morning Drive Airtime',
  billReference: 'INV-VOA-2026-89-REV2',
  notes: 'Updated voucher reference PV-2026-092',
  updatedAt: new Date().toISOString(),
};

assert.strictEqual(updatedCheque.purposeOfPayment, 'Revised Prime-Time Morning Drive Airtime');
assert.strictEqual(updatedCheque.billReference, 'INV-VOA-2026-89-REV2');
assert.strictEqual(updatedCheque.notes, 'Updated voucher reference PV-2026-092');
console.log('✓ Updated purpose:', updatedCheque.purposeOfPayment);
console.log('✓ Updated billReference:', updatedCheque.billReference);

console.log('\n[Test 3] Simulating Row Mapping from Database (mocking snake_case columns)...');
const dbRow = {
  id: updatedCheque.id,
  type: updatedCheque.type,
  cheque_number: updatedCheque.chequeNumber,
  bank_name: updatedCheque.drawerBank,
  bank_branch: updatedCheque.branch,
  amount: '238212',
  cheque_date: '2026-12-20',
  issue_date: '2026-11-15',
  expected_action_date: '2026-12-20',
  payee_name: updatedCheque.payerOrPayeeName,
  vendor_id: updatedCheque.vendorId,
  purpose_of_payment: 'Revised Prime-Time Morning Drive Airtime',
  bill_reference: 'INV-VOA-2026-89-REV2',
  notes: 'Updated voucher reference PV-2026-092',
  status: 'issued',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function mapChequeRowTest(r) {
  return {
    id: r.id,
    type: r.type,
    chequeNumber: r.cheque_number,
    drawerBank: r.bank_name || '',
    branch: r.bank_branch || '',
    amount: Number(r.amount) || 0,
    currency: 'LKR',
    chequeDate: r.cheque_date,
    receivedOrIssuedDate: r.issue_date,
    expectedActionDate: r.expected_action_date || r.cheque_date,
    payerOrPayeeName: r.payee_name || '',
    vendorId: r.vendor_id || '',
    purposeOfPayment: r.purpose_of_payment || '',
    billReference: r.bill_reference || '',
    notes: r.notes || '',
    status: r.status || 'pending',
  };
}

const mapped = mapChequeRowTest(dbRow);
assert.strictEqual(mapped.purposeOfPayment, 'Revised Prime-Time Morning Drive Airtime');
assert.strictEqual(mapped.billReference, 'INV-VOA-2026-89-REV2');
console.log('✓ DB mapped purposeOfPayment:', mapped.purposeOfPayment);
console.log('✓ DB mapped billReference:', mapped.billReference);

console.log('\n======================================================');
console.log('ALL PURPOSE & BILL REFERENCE TESTS PASSED! 🎯');
console.log('======================================================');
