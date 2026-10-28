import test from 'node:test';
import assert from 'node:assert/strict';
import { isDigestDue, isIdle, localParts, buildDigestEmail, escapeHtml } from '../utils/digestSchedule.js';

const base = { digestEnabled: true, digestHour: 8, timezone: 'UTC', lastDigestAt: null };

test('localParts converts to the user timezone', () => {
  const d = new Date('2026-10-28T03:00:00Z');
  assert.deepEqual(localParts(d, 'UTC'), { dateStr: '2026-10-28', hour: 3 });
  assert.deepEqual(localParts(d, 'Asia/Kolkata'), { dateStr: '2026-10-28', hour: 8 }); // UTC+5:30
  assert.deepEqual(localParts(d, 'America/Los_Angeles'), { dateStr: '2026-10-27', hour: 20 });
  assert.equal(localParts(d, 'Not/AZone').hour, 3); // invalid tz falls back to UTC
});

test('digest is due at/after the local hour, once per local day', () => {
  assert.equal(isDigestDue(base, new Date('2026-10-28T07:59:00Z')), false);
  assert.equal(isDigestDue(base, new Date('2026-10-28T08:00:00Z')), true);
  assert.equal(isDigestDue(base, new Date('2026-10-28T15:00:00Z')), true); // catch-up after a missed run
  const sent = { ...base, lastDigestAt: new Date('2026-10-28T08:00:00Z') };
  assert.equal(isDigestDue(sent, new Date('2026-10-28T15:00:00Z')), false);
  assert.equal(isDigestDue(sent, new Date('2026-10-29T08:00:00Z')), true);
});

test('digest respects timezone and opt-out', () => {
  const ist = { ...base, timezone: 'Asia/Kolkata' };
  assert.equal(isDigestDue(ist, new Date('2026-10-28T02:29:00Z')), false); // 07:59 IST
  assert.equal(isDigestDue(ist, new Date('2026-10-28T02:30:00Z')), true); // 08:00 IST
  assert.equal(isDigestDue({ ...base, digestEnabled: false }, new Date('2026-10-28T09:00:00Z')), false);
});

test('idle users (30+ days without activity) are skipped', () => {
  const now = new Date('2026-10-28T08:00:00Z');
  assert.equal(isIdle({ streakLastActiveDate: new Date('2026-10-20T00:00:00Z') }, now), false);
  assert.equal(isIdle({ streakLastActiveDate: new Date('2026-09-01T00:00:00Z') }, now), true);
  assert.equal(isIdle({ streakLastActiveDate: null, createdAt: new Date('2026-10-01T00:00:00Z') }, now), false);
  assert.equal(isIdle({ streakLastActiveDate: null, createdAt: new Date('2026-08-01T00:00:00Z') }, now), true);
});

test('email escapes HTML, links to the app and caps the list', () => {
  const titles = ['<script>alert(1)</script>', ...Array.from({ length: 14 }, (_, i) => `Note ${i}`)];
  const { subject, text, html } = buildDigestEmail({ displayName: 'A&B', titles, appUrl: 'https://app.test' });
  assert.equal(subject, '15 problems due for revision');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;') && html.includes('A&amp;B'));
  assert.ok(html.includes('href="https://app.test/revise"') && text.includes('https://app.test/settings'));
  assert.ok(text.includes('...and 5 more'));
  assert.equal(escapeHtml('"\''), '&quot;&#39;');
});
