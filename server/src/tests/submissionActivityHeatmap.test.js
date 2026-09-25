import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/db.js';
import {
  generateDateSequence,
  formatDateInTimezone,
  isValidTimezone,
  getDailySubmissionCounts,
  createSubmission,
} from '../services/submissionService.js';

let testUserA;
let testUserB;

before(async () => {
  // Create isolated test users for testing aggregation
  testUserA = await prisma.user.create({
    data: {
      email: `test_heat_a_${Date.now()}@example.com`,
      passwordHash: 'dummy',
      displayName: 'Heatmap User A',
      role: 'user',
    },
  });

  testUserB = await prisma.user.create({
    data: {
      email: `test_heat_b_${Date.now()}@example.com`,
      passwordHash: 'dummy',
      displayName: 'Heatmap User B',
      role: 'user',
    },
  });
});

after(async () => {
  if (testUserA) {
    await prisma.submission.deleteMany({ where: { userId: testUserA.id } });
    await prisma.user.delete({ where: { id: testUserA.id } }).catch(() => null);
  }
  if (testUserB) {
    await prisma.submission.deleteMany({ where: { userId: testUserB.id } });
    await prisma.user.delete({ where: { id: testUserB.id } }).catch(() => null);
  }
});

// ── 1. Sequence & Calendar Calculations ──────────────────────────────────────
test('generateDateSequence: exact bounds and counts', () => {
  const seq = generateDateSequence('2026-05-01', '2026-05-05');
  assert.deepEqual(seq, [
    '2026-05-01',
    '2026-05-02',
    '2026-05-03',
    '2026-05-04',
    '2026-05-05',
  ]);
});

test('generateDateSequence: month boundaries work correctly', () => {
  const seq = generateDateSequence('2026-01-30', '2026-02-02');
  assert.deepEqual(seq, [
    '2026-01-30',
    '2026-01-31',
    '2026-02-01',
    '2026-02-02',
  ]);
});

test('generateDateSequence: year boundaries work correctly', () => {
  const seq = generateDateSequence('2025-12-30', '2026-01-02');
  assert.deepEqual(seq, [
    '2025-12-30',
    '2025-12-31',
    '2026-01-01',
    '2026-01-02',
  ]);
});

test('generateDateSequence: leap year contains Feb 29 (2024)', () => {
  const seq = generateDateSequence('2024-02-27', '2024-03-01');
  assert.ok(seq.includes('2024-02-29'), 'Should include leap day 2024-02-29');
  assert.equal(seq.length, 4);
});

test('generateDateSequence: non-leap year does not contain Feb 29 (2025)', () => {
  const seq = generateDateSequence('2025-02-27', '2025-03-01');
  assert.ok(!seq.includes('2025-02-29'), 'Non-leap year must not include Feb 29');
  assert.equal(seq.length, 3);
});

// ── 2. Timezone Handling ───────────────────────────────────────────────────
test('isValidTimezone: validates real IANA timezones and rejects invalid strings', () => {
  assert.equal(isValidTimezone('UTC'), true);
  assert.equal(isValidTimezone('America/New_York'), true);
  assert.equal(isValidTimezone('Asia/Kolkata'), true);
  assert.equal(isValidTimezone('Europe/London'), true);

  assert.equal(isValidTimezone('Invalid/Zone'), false);
  assert.equal(isValidTimezone(''), false);
  assert.equal(isValidTimezone(null), false);
  assert.equal(isValidTimezone('; DROP TABLE submissions;'), false);
});

test('formatDateInTimezone: shifts calendar day across timezones without mutating timestamp', () => {
  // 2026-09-24T22:30:00Z is 2026-09-24 in UTC, but 2026-09-25 04:00 in Asia/Kolkata (UTC+5:30)
  const ts = new Date('2026-09-24T22:30:00Z');
  assert.equal(formatDateInTimezone(ts, 'UTC'), '2026-09-24');
  assert.equal(formatDateInTimezone(ts, 'Asia/Kolkata'), '2026-09-25');
  assert.equal(formatDateInTimezone(ts, 'America/New_York'), '2026-09-24');
});

// ── 3. Database Aggregation & User Activity ─────────────────────────────────
test('empty database: returns 0 for all days in range without crashing', async () => {
  const from = '2026-08-01';
  const to = '2026-08-05';
  const res = await getDailySubmissionCounts(testUserA.id, { from, to });

  assert.equal(res.from, from);
  assert.equal(res.to, to);
  assert.equal(res.total, 0);
  assert.equal(res.days.length, 5);
  for (const day of res.days) {
    assert.equal(day.count, 0);
  }
});

test('one submission on one day → count = 1', async () => {
  const targetDate = '2026-08-10';
  await createSubmission(testUserA.id, {
    submittedAt: new Date(`${targetDate}T12:00:00Z`),
  });

  const res = await getDailySubmissionCounts(testUserA.id, {
    from: '2026-08-09',
    to: '2026-08-11',
  });

  assert.equal(res.total, 1);
  const day10 = res.days.find((d) => d.date === targetDate);
  assert.ok(day10);
  assert.equal(day10.count, 1);

  const day09 = res.days.find((d) => d.date === '2026-08-09');
  assert.equal(day09.count, 0);
});

test('multiple submissions on the same day → correct aggregated count', async () => {
  const targetDate = '2026-08-15';
  await createSubmission(testUserA.id, { submittedAt: new Date(`${targetDate}T09:00:00Z`) });
  await createSubmission(testUserA.id, { submittedAt: new Date(`${targetDate}T14:30:00Z`) });
  await createSubmission(testUserA.id, { submittedAt: new Date(`${targetDate}T20:15:00Z`) });

  const res = await getDailySubmissionCounts(testUserA.id, {
    from: '2026-08-14',
    to: '2026-08-16',
  });

  const day15 = res.days.find((d) => d.date === targetDate);
  assert.ok(day15);
  assert.equal(day15.count, 3);
});

test('multiple different days → separate counts', async () => {
  await createSubmission(testUserA.id, { submittedAt: new Date('2026-08-20T10:00:00Z') });
  await createSubmission(testUserA.id, { submittedAt: new Date('2026-08-20T11:00:00Z') });
  await createSubmission(testUserA.id, { submittedAt: new Date('2026-08-22T08:00:00Z') });

  const res = await getDailySubmissionCounts(testUserA.id, {
    from: '2026-08-19',
    to: '2026-08-23',
  });

  const map = new Map(res.days.map((d) => [d.date, d.count]));
  assert.equal(map.get('2026-08-19'), 0);
  assert.equal(map.get('2026-08-20'), 2);
  assert.equal(map.get('2026-08-21'), 0);
  assert.equal(map.get('2026-08-22'), 1);
  assert.equal(map.get('2026-08-23'), 0);
});

test('date range boundaries: submissions outside range are excluded', async () => {
  await createSubmission(testUserA.id, { submittedAt: new Date('2026-07-31T23:59:59Z') }); // before
  await createSubmission(testUserA.id, { submittedAt: new Date('2026-08-01T00:00:01Z') }); // inside
  await createSubmission(testUserA.id, { submittedAt: new Date('2026-08-03T23:59:59Z') }); // inside
  await createSubmission(testUserA.id, { submittedAt: new Date('2026-08-04T00:00:01Z') }); // after

  const res = await getDailySubmissionCounts(testUserA.id, {
    from: '2026-08-01',
    to: '2026-08-03',
  });

  assert.equal(res.total, 2);
  assert.equal(res.days.length, 3);
  assert.equal(res.days[0].date, '2026-08-01');
  assert.equal(res.days[0].count, 1);
  assert.equal(res.days[1].date, '2026-08-02');
  assert.equal(res.days[1].count, 0);
  assert.equal(res.days[2].date, '2026-08-03');
  assert.equal(res.days[2].count, 1);
});

test('user isolation / authorization: user A submissions do not leak to user B', async () => {
  const resB = await getDailySubmissionCounts(testUserB.id, {
    from: '2026-08-01',
    to: '2026-08-25',
  });

  assert.equal(resB.total, 0, 'User B must have 0 total submissions despite User A having submissions');
  for (const day of resB.days) {
    assert.equal(day.count, 0);
  }
});

test('data consistency: creating a new submission immediately updates the day count', async () => {
  const testDay = '2026-08-28';
  const beforeRes = await getDailySubmissionCounts(testUserA.id, {
    from: testDay,
    to: testDay,
  });
  const beforeCount = beforeRes.total;

  await createSubmission(testUserA.id, {
    submittedAt: new Date(`${testDay}T16:00:00Z`),
  });

  const afterRes = await getDailySubmissionCounts(testUserA.id, {
    from: testDay,
    to: testDay,
  });
  assert.equal(afterRes.total, beforeCount + 1);
  assert.equal(afterRes.days[0].count, beforeCount + 1);
});
