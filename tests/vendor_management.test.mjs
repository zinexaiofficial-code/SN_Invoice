import assert from 'assert';

console.log('--- STARTING VENDOR MANAGEMENT & CHEQUE INTEGRATION TEST SUITE ---\n');

// Mock Vendor Data
const vendor1 = {
  id: 'v-001',
  name: 'Sri Lanka Rupavahini Corporation',
  contactPerson: 'Director of Finance',
  phone: '+94 11 259 9505',
  email: 'finance@rupavahini.lk',
  address: 'Torrington Square, Colombo 07',
  taxNumber: 'PV-100234',
  defaultBank: 'Bank of Ceylon (BOC)',
  defaultBranch: 'Main Branch',
  defaultAccountNo: '0002345678',
  notes: 'Prime time TV broadcasting vendor',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const vendor2 = {
  id: 'v-002',
  name: 'Asia Broadcasting Corporation (Pvt) Ltd',
  contactPerson: 'Mr. Perera',
  phone: '+94 11 534 0000',
  email: 'accounts@hirufm.lk',
  defaultBank: 'Commercial Bank of Ceylon',
  defaultBranch: 'World Trade Center',
  defaultAccountNo: '1000987654',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const vendors = [vendor1, vendor2];

// Mock Cheques (including Outgoing linked to vendor)
const cheques = [
  {
    id: 'chq-001',
    type: 'outgoing',
    chequeNumber: '024770',
    amount: 501500,
    vendorId: 'v-001',
    payerOrPayeeName: 'Sri Lanka Rupavahini Corporation',
    drawerBank: 'Bank of Ceylon (BOC)',
    branch: 'Main Branch',
    status: 'issued',
  },
  {
    id: 'chq-002',
    type: 'outgoing',
    chequeNumber: '024771',
    amount: 150000,
    vendorId: 'v-001',
    payerOrPayeeName: 'Sri Lanka Rupavahini Corporation',
    drawerBank: 'Bank of Ceylon (BOC)',
    branch: 'Main Branch',
    status: 'cleared',
  },
  {
    id: 'chq-003',
    type: 'outgoing',
    chequeNumber: '024772',
    amount: 250000,
    vendorId: 'v-002',
    payerOrPayeeName: 'Asia Broadcasting Corporation (Pvt) Ltd',
    drawerBank: 'Commercial Bank of Ceylon',
    branch: 'World Trade Center',
    status: 'issued',
  },
  {
    id: 'chq-004',
    type: 'incoming',
    chequeNumber: '112233',
    amount: 325000,
    payerOrPayeeName: 'Araliya Lands and Homes (Pvt) Ltd',
    status: 'received',
  },
];

console.log('[Test 1] Testing Vendor Directory Filtering...');
const searchQuery = 'rupavahini';
const filtered = vendors.filter(v => 
  v.name.toLowerCase().includes(searchQuery) ||
  (v.contactPerson && v.contactPerson.toLowerCase().includes(searchQuery))
);
assert.strictEqual(filtered.length, 1);
assert.strictEqual(filtered[0].id, 'v-001');
console.log('✓ Found vendor matching query:', filtered[0].name);

console.log('\n[Test 2] Testing Cheque Stats Calculation per Vendor...');
const stats = {};
for (const c of cheques) {
  if (c.type === 'outgoing') {
    for (const v of vendors) {
      if (
        (c.vendorId && c.vendorId === v.id) ||
        (c.payerOrPayeeName && c.payerOrPayeeName.trim().toLowerCase() === v.name.trim().toLowerCase())
      ) {
        if (!stats[v.id]) stats[v.id] = { count: 0, totalAmount: 0 };
        stats[v.id].count += 1;
        stats[v.id].totalAmount += (Number(c.amount) || 0);
      }
    }
  }
}

assert.strictEqual(stats['v-001'].count, 2, 'Vendor 1 should have 2 outgoing cheques');
assert.strictEqual(stats['v-001'].totalAmount, 651500, 'Vendor 1 total paid should be 651,500 LKR');
assert.strictEqual(stats['v-002'].count, 1, 'Vendor 2 should have 1 outgoing cheque');
assert.strictEqual(stats['v-002'].totalAmount, 250000, 'Vendor 2 total paid should be 250,000 LKR');

console.log(`✓ Vendor 1 (Rupavahini): ${stats['v-001'].count} cheques, Total: LKR ${stats['v-001'].totalAmount.toLocaleString()}`);
console.log(`✓ Vendor 2 (Asia Broadcasting): ${stats['v-002'].count} cheques, Total: LKR ${stats['v-002'].totalAmount.toLocaleString()}`);

console.log('\n[Test 3] Verifying Incoming Cheques are excluded from Vendor Outgoing Stats...');
const incomingCountInStats = Object.values(stats).reduce((acc, s) => acc + s.count, 0);
assert.strictEqual(incomingCountInStats, 3, 'Only the 3 outgoing cheques should be in stats');
console.log('✓ Incoming cheques properly excluded from vendor outgoing metrics.');

console.log('\n======================================================');
console.log('ALL VENDOR MANAGEMENT & CHEQUE INTEGRATION TESTS PASSED! 🎯');
console.log('======================================================');
