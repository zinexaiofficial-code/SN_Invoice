import assert from 'node:assert';

console.log('--- STARTING CHEQUE NOTIFICATION & DATE ON CHEQUE TEST SUITE ---');

export function calculateChequeAlertState(cheque) {
  if (cheque.status === 'cleared') return 'cleared';
  if (cheque.status === 'cancelled' || cheque.status === 'replaced') return 'normal';
  if (cheque.status === 'returned') return 'action_required';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDateStr = cheque.chequeDate || cheque.expectedActionDate;
  if (!targetDateStr) return 'normal';

  const targetDate = new Date(targetDateStr);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'due_today';
  if (diffDays <= 7) return 'upcoming';

  return 'normal';
}

export function generateChequeReminders(cheque, existingReminders = []) {
  if (!cheque.isReminderEnabled) return [];
  if (cheque.status === 'cleared' || cheque.status === 'cancelled' || cheque.status === 'replaced') return [];

  const existingMap = new Map(existingReminders.map(r => [r.reminderType, r]));
  const targetDateStr = cheque.chequeDate || cheque.expectedActionDate;
  if (!targetDateStr) return [];

  const targetDate = new Date(targetDateStr);
  targetDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const reminders = [];

  const isIncoming = cheque.type === 'incoming';
  const partyLabel = isIncoming ? `Client: ${cheque.payerOrPayeeName}` : `Payee: ${cheque.payerOrPayeeName}`;
  const amountStr = `Rs. ${Number(cheque.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  // 1. Returned Cheque Action Required
  if (cheque.status === 'returned') {
    const prev = existingMap.get('returned_action');
    reminders.push({
      id: prev?.id || `rem-${cheque.id}-ret`,
      chequeId: cheque.id,
      reminderDate: cheque.followUpDate || targetDateStr,
      reminderType: 'returned_action',
      title: `🚨 RETURNED CHEQUE ACTION: Cheque #${cheque.chequeNumber}`,
      message: `Cheque #${cheque.chequeNumber} for ${amountStr} (${partyLabel}) was returned. Reason: ${cheque.returnReason || 'Refer to Drawer'}. Follow up required!`,
      priority: 'urgent',
      isRead: prev?.isRead || false,
      isDismissed: prev?.isDismissed || false,
      snoozedUntil: prev?.snoozedUntil,
      deliveryStatus: 'delivered',
      createdAt: prev?.createdAt || new Date().toISOString()
    });
    return reminders;
  }

  // 2. Overdue Alert (Date on Cheque has passed)
  if (diffDays < 0) {
    const prev = existingMap.get('overdue');
    reminders.push({
      id: prev?.id || `rem-${cheque.id}-od`,
      chequeId: cheque.id,
      reminderDate: targetDateStr,
      reminderType: 'overdue',
      title: `⚠️ OVERDUE: Cheque #${cheque.chequeNumber} (${partyLabel})`,
      message: `${isIncoming ? 'Incoming cheque' : 'Outgoing cheque'} #${cheque.chequeNumber} of ${amountStr} is overdue by ${Math.abs(diffDays)} day(s)! Date on Cheque: ${targetDateStr}. Please ${isIncoming ? 'deposit' : 'verify account balance'} immediately.`,
      priority: 'urgent',
      isRead: prev?.isRead || false,
      isDismissed: prev?.isDismissed || false,
      snoozedUntil: prev?.snoozedUntil,
      deliveryStatus: 'delivered',
      createdAt: prev?.createdAt || new Date().toISOString()
    });
  }

  // 3. Due Today (Date on Cheque is today)
  if (diffDays === 0) {
    const prev = existingMap.get('due_today');
    reminders.push({
      id: prev?.id || `rem-${cheque.id}-today`,
      chequeId: cheque.id,
      reminderDate: targetDateStr,
      reminderType: 'due_today',
      title: `🔔 DUE TODAY: Cheque #${cheque.chequeNumber}`,
      message: `${isIncoming ? 'Deposit incoming cheque' : 'Outgoing cheque presentation due today'} #${cheque.chequeNumber} for ${amountStr} (${partyLabel}). Date on Cheque: ${targetDateStr}.`,
      priority: 'high',
      isRead: prev?.isRead || false,
      isDismissed: prev?.isDismissed || false,
      snoozedUntil: prev?.snoozedUntil,
      deliveryStatus: 'delivered',
      createdAt: prev?.createdAt || new Date().toISOString()
    });
  }

  // 4. Due Tomorrow (Date on Cheque is exactly tomorrow: diffDays === 1)
  if (diffDays === 1) {
    const prev = existingMap.get('due_1_day');
    reminders.push({
      id: prev?.id || `rem-${cheque.id}-1d`,
      chequeId: cheque.id,
      reminderDate: targetDateStr,
      reminderType: 'due_1_day',
      title: `📅 DUE TOMORROW: Cheque #${cheque.chequeNumber}`,
      message: `Cheque #${cheque.chequeNumber} of ${amountStr} is due tomorrow (${targetDateStr}). ${partyLabel}.`,
      priority: 'high',
      isRead: prev?.isRead || false,
      isDismissed: prev?.isDismissed || false,
      snoozedUntil: prev?.snoozedUntil,
      deliveryStatus: 'delivered',
      createdAt: prev?.createdAt || new Date().toISOString()
    });
  }

  // 5. Due in 3 Days (2 to 3 days before Date on Cheque)
  if (diffDays === 2 || diffDays === 3) {
    const prev = existingMap.get('due_3_days');
    reminders.push({
      id: prev?.id || `rem-${cheque.id}-3d`,
      chequeId: cheque.id,
      reminderDate: targetDateStr,
      reminderType: 'due_3_days',
      title: `⏳ Due in ${diffDays} days: Cheque #${cheque.chequeNumber}`,
      message: `Cheque #${cheque.chequeNumber} for ${amountStr} is scheduled for ${targetDateStr}. ${partyLabel}.`,
      priority: 'medium',
      isRead: prev?.isRead || false,
      isDismissed: prev?.isDismissed || false,
      snoozedUntil: prev?.snoozedUntil,
      deliveryStatus: 'delivered',
      createdAt: prev?.createdAt || new Date().toISOString()
    });
  }

  // 6. Due in 7 Days (4 to 7 days before Date on Cheque)
  if (diffDays >= 4 && diffDays <= 7) {
    const prev = existingMap.get('due_7_days');
    reminders.push({
      id: prev?.id || `rem-${cheque.id}-7d`,
      chequeId: cheque.id,
      reminderDate: targetDateStr,
      reminderType: 'due_7_days',
      title: `🗓️ Upcoming Cheque in ${diffDays} days: #${cheque.chequeNumber}`,
      message: `Cheque #${cheque.chequeNumber} of ${amountStr} scheduled on ${targetDateStr}. ${partyLabel}.`,
      priority: 'low',
      isRead: prev?.isRead || false,
      isDismissed: prev?.isDismissed || false,
      snoozedUntil: prev?.snoozedUntil,
      deliveryStatus: 'delivered',
      createdAt: prev?.createdAt || new Date().toISOString()
    });
  }

  return reminders;
}

// Mock a cheque with Date on Cheque in the future: 2026-12-30 (44 days away from 2026-11-16)
const futureCheque = {
  id: 'chq-future-1',
  chequeNumber: '024770',
  type: 'outgoing',
  drawerBank: 'Bank of Ceylon (BOC)',
  amount: 501500,
  currency: 'LKR',
  chequeDate: '2026-12-30', // Date on Cheque
  receivedOrIssuedDate: '2026-11-16',
  expectedActionDate: '2026-12-30',
  payerOrPayeeName: 'Sri Lanka Rupavahini Corporation',
  status: 'issued',
  isReminderEnabled: true,
  reminders: []
};

// [Test 1] Future Cheque (2026-12-30) must have NO premature reminders today
console.log('\n[Test 1] Testing Future Cheque (2026-12-30)...');
const alertState = calculateChequeAlertState(futureCheque);
console.log(`✓ calculateChequeAlertState: ${alertState}`);
assert.strictEqual(alertState, 'normal', 'Future cheque must have alertState "normal"');

const reminders = generateChequeReminders(futureCheque);
console.log(`✓ generateChequeReminders returned: ${reminders.length} reminder(s)`);
assert.strictEqual(reminders.length, 0, 'Cheque 44 days away must NOT generate any premature reminders today');

// [Test 2] Due Tomorrow Cheque (when Date on Cheque is tomorrow)
console.log('\n[Test 2] Testing Cheque Due Tomorrow...');
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

const tomorrowCheque = {
  ...futureCheque,
  id: 'chq-tomorrow',
  chequeNumber: '990001',
  chequeDate: tomorrowStr,
};
const tomorrowReminders = generateChequeReminders(tomorrowCheque);
console.log(`✓ tomorrowReminders count: ${tomorrowReminders.length}`);
assert.strictEqual(tomorrowReminders.length, 1, 'Should have exactly 1 reminder for tomorrow');
assert.strictEqual(tomorrowReminders[0].reminderType, 'due_1_day');
assert.ok(tomorrowReminders[0].title.includes('DUE TOMORROW'), 'Title must say DUE TOMORROW');
assert.ok(tomorrowReminders[0].message.includes(tomorrowStr), 'Message must state the exact Date on Cheque');

// [Test 3] Due Today Cheque
console.log('\n[Test 3] Testing Cheque Due Today...');
const todayStr = new Date().toISOString().split('T')[0];
const todayCheque = {
  ...futureCheque,
  id: 'chq-today',
  chequeNumber: '990002',
  chequeDate: todayStr,
};
const todayReminders = generateChequeReminders(todayCheque);
console.log(`✓ todayReminders count: ${todayReminders.length}`);
assert.strictEqual(todayReminders.length, 1, 'Should have exactly 1 reminder for today');
assert.strictEqual(todayReminders[0].reminderType, 'due_today');
assert.ok(todayReminders[0].title.includes('DUE TODAY'), 'Title must say DUE TODAY');

// [Test 4] Overdue Cheque (5 days past Date on Cheque)
console.log('\n[Test 4] Testing Overdue Cheque...');
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 5);
const pastDateStr = pastDate.toISOString().split('T')[0];

const overdueCheque = {
  ...futureCheque,
  id: 'chq-overdue',
  chequeNumber: '990003',
  chequeDate: pastDateStr,
};
const overdueReminders = generateChequeReminders(overdueCheque);
console.log(`✓ overdueReminders count: ${overdueReminders.length}`);
assert.strictEqual(overdueReminders.length, 1, 'Should have exactly 1 overdue reminder');
assert.strictEqual(overdueReminders[0].reminderType, 'overdue');
assert.ok(overdueReminders[0].title.includes('OVERDUE'), 'Title must say OVERDUE');

// [Test 5] Cleared Cheque should NEVER emit reminders
console.log('\n[Test 5] Testing Cleared Cheque...');
const clearedCheque = {
  ...overdueCheque,
  status: 'cleared'
};
const clearedReminders = generateChequeReminders(clearedCheque);
console.log(`✓ clearedReminders count: ${clearedReminders.length}`);
assert.strictEqual(clearedReminders.length, 0, 'Cleared cheque must have 0 reminders');

console.log('\n======================================================');
console.log('ALL CHEQUE NOTIFICATION TESTS PASSED SUCCESSFULLY! 🎯');
console.log('======================================================');
