import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applySm2, nextReviewDate, MIN_EASE, DEFAULT_EASE } from '../services/revisionService.js';

const fresh = { repetitions: 0, intervalDays: 0, easeFactor: DEFAULT_EASE };

test('first "Good" review → interval 1 day, repetitions 1', () => {
  const s = applySm2(fresh, 2);
  assert.equal(s.repetitions, 1);
  assert.equal(s.intervalDays, 1);
});

test('first "Easy" review skips 1-day queue → interval 4 days', () => {
  const s = applySm2(fresh, 3);
  assert.equal(s.intervalDays, 4);
});

test('second consecutive pass → interval 6 days', () => {
  let s = applySm2(fresh, 2);
  s = applySm2(s, 2);
  assert.equal(s.repetitions, 2);
  assert.equal(s.intervalDays, 6);
});

test('second "Easy" pass → interval 10 days', () => {
  let s = applySm2(fresh, 3);
  s = applySm2(s, 3);
  assert.equal(s.repetitions, 2);
  assert.equal(s.intervalDays, 10);
});

test('third pass → interval grows geometrically based on easeFactor', () => {
  let s = applySm2(fresh, 3); // Easy
  s = applySm2(s, 3); // Easy
  const before = s.intervalDays;
  s = applySm2(s, 3);
  assert.ok(s.intervalDays > before, 'interval should grow');
  assert.equal(s.intervalDays, Math.round(before * s.easeFactor));
});

test('a lapse (Again) resets repetitions and interval to 1', () => {
  let s = applySm2(fresh, 2);
  s = applySm2(s, 2);
  s = applySm2(s, 0); // Again
  assert.equal(s.repetitions, 0);
  assert.equal(s.intervalDays, 1);
});

test('easeFactor never drops below the 1.3 floor', () => {
  let s = fresh;
  for (let i = 0; i < 20; i++) s = applySm2(s, 0); // repeated failures
  assert.ok(s.easeFactor >= MIN_EASE);
  assert.equal(s.easeFactor, MIN_EASE);
});

test('Easy raises ease faster than Good', () => {
  const easy = applySm2(fresh, 3);
  const good = applySm2(fresh, 2);
  assert.ok(easy.easeFactor > good.easeFactor);
});

test('rating is clamped to 0..3', () => {
  const hi = applySm2(fresh, 99);
  const lo = applySm2(fresh, -5);
  assert.ok(hi.easeFactor <= 3);
  assert.equal(lo.intervalDays, 1); // treated as lapse
});

test('nextReviewDate adds interval days without mutating input', () => {
  const now = new Date('2025-01-01T00:00:00Z');
  const next = nextReviewDate(6, now);
  assert.equal(now.toISOString(), '2025-01-01T00:00:00.000Z');
  assert.equal(next.toISOString().slice(0, 10), '2025-01-07');
});
