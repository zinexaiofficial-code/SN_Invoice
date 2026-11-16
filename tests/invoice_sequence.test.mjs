import assert from 'assert';

console.log('--- STARTING INVOICE SEQUENCE & INCREMENT TEST SUITE ---\n');

function calculateNextInvoiceNumber({
  entity,
  invoices = [],
  storedSeq = null
}) {
  const prefix = (entity?.prefix || 'SN').toUpperCase().trim();
  const year = new Date().getFullYear();

  const startingSeq = Math.max(1, Number(entity?.startingSequence) || 1);
  const entityCurrentSeq = Number(entity?.currentSequence) || 0;

  const entityInvs = invoices.filter(i =>
    i.billingEntityId === entity?.id ||
    (i.invoiceNumber && i.invoiceNumber.toUpperCase().startsWith(prefix))
  );

  let maxInvoiceNum = 0;
  for (const inv of entityInvs) {
    if (!inv.invoiceNumber) continue;
    const match = inv.invoiceNumber.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxInvoiceNum) {
        maxInvoiceNum = num;
      }
    }
  }

  const storedNum = storedSeq ? parseInt(storedSeq, 10) : 0;

  let nextNum = startingSeq;

  // If there are existing invoices with sequence >= startingSeq, next must be > max existing
  if (maxInvoiceNum >= startingSeq) {
    nextNum = Math.max(nextNum, maxInvoiceNum + 1);
  }

  if (entityCurrentSeq > nextNum) {
    nextNum = entityCurrentSeq;
  }

  // Only respect storedNum if it is >= startingSeq and > nextNum
  if (storedNum >= startingSeq && storedNum > nextNum) {
    nextNum = storedNum;
  }

  if (prefix === 'SN') {
    return `SN-${nextNum}`;
  }
  return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
}

// TEST 1: Initial state where entity has startingSequence = 23474, but old test invoice SN-1 exists
console.log('[Test 1] Starting sequence 23474 with existing test invoice SN-1...');
const entitySN = {
  id: 'ent-sn-1',
  name: 'SN Advertising',
  prefix: 'SN',
  startingSequence: 23474,
  currentSequence: 23474
};
const invoicesT1 = [{ id: 'inv-1', invoiceNumber: 'SN-1', billingEntityId: 'ent-sn-1' }];
const next1 = calculateNextInvoiceNumber({ entity: entitySN, invoices: invoicesT1, storedSeq: '2' });
console.log('Result for Test 1:', next1);
assert.strictEqual(next1, 'SN-23474', 'Should be SN-23474 and NOT SN-2');
console.log('✓ Test 1 passed: Ignored stale storedSeq=2 and respected startingSequence 23474\n');

// TEST 2: User issues invoice SN-23474, next invoice must be SN-23475
console.log('[Test 2] After issuing invoice SN-23474...');
const invoicesT2 = [
  { id: 'inv-1', invoiceNumber: 'SN-1', billingEntityId: 'ent-sn-1' },
  { id: 'inv-2', invoiceNumber: 'SN-23474', billingEntityId: 'ent-sn-1' }
];
const next2 = calculateNextInvoiceNumber({
  entity: { ...entitySN, currentSequence: 23475 },
  invoices: invoicesT2,
  storedSeq: '23475'
});
console.log('Result for Test 2:', next2);
assert.strictEqual(next2, 'SN-23475', 'Should automatically increment to SN-23475');
console.log('✓ Test 2 passed: Automatically incremented to SN-23475\n');

// TEST 3: User issues invoice SN-23475, next invoice must be SN-23476
console.log('[Test 3] After issuing invoice SN-23475...');
const invoicesT3 = [
  ...invoicesT2,
  { id: 'inv-3', invoiceNumber: 'SN-23475', billingEntityId: 'ent-sn-1' }
];
const next3 = calculateNextInvoiceNumber({
  entity: { ...entitySN, currentSequence: 23476 },
  invoices: invoicesT3,
  storedSeq: '23476'
});
console.log('Result for Test 3:', next3);
assert.strictEqual(next3, 'SN-23476', 'Should automatically increment to SN-23476');
console.log('✓ Test 3 passed: Automatically incremented to SN-23476\n');

// TEST 4: Bare numeric invoice number "23474" without prefix
console.log('[Test 4] Handling bare numeric invoice number "23474"...');
const invoicesT4 = [
  { id: 'inv-1', invoiceNumber: '23474', billingEntityId: 'ent-sn-1' }
];
const next4 = calculateNextInvoiceNumber({
  entity: entitySN,
  invoices: invoicesT4
});
console.log('Result for Test 4:', next4);
assert.strictEqual(next4, 'SN-23475', 'Should detect 23474 and increment to SN-23475');
console.log('✓ Test 4 passed: Extracted trailing digits from bare number\n');

// TEST 5: Another entity (HRP with prefix HRP and startingSequence 1)
console.log('[Test 5] Entity HRP with starting sequence 1...');
const entityHRP = {
  id: 'ent-hrp-1',
  name: 'Haripara',
  prefix: 'HRP',
  startingSequence: 1,
  currentSequence: 1
};
const year = new Date().getFullYear();
const nextHRP = calculateNextInvoiceNumber({ entity: entityHRP, invoices: [] });
console.log('Result for Test 5:', nextHRP);
assert.strictEqual(nextHRP, `HRP-${year}-0001`);
console.log('✓ Test 5 passed: Generated standard padded format for HRP\n');

console.log('======================================================');
console.log('ALL INVOICE SEQUENCE TESTS PASSED! 🎯');
console.log('======================================================');
