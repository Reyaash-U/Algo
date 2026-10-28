import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import {
  createVerificationToken,
  hashToken,
  buildVerificationEmail,
  VERIFY_TTL_MS,
} from '../utils/emailVerification.js';
import { registerUser, verifyEmailToken, resendVerification } from '../services/authService.js';

// Never send real mail from tests: with no SMTP host the mailer only logs.
env.SMTP_HOST = '';
env.SMTP_USER = '';

test('token helper: random, hashed, 24h expiry', () => {
  const now = new Date('2026-10-28T00:00:00Z');
  const a = createVerificationToken(now);
  const b = createVerificationToken(now);
  assert.notEqual(a.token, b.token);
  assert.equal(a.tokenHash, hashToken(a.token));
  assert.notEqual(a.tokenHash, a.token);
  assert.equal(a.expiresAt.getTime() - now.getTime(), VERIFY_TTL_MS);
});

test('verification email links to the app and escapes the name', () => {
  const { text, html } = buildVerificationEmail({ displayName: '<b>X</b>', appUrl: 'https://app.test', token: 'abc' });
  assert.ok(text.includes('https://app.test/verify-email?token=abc'));
  assert.ok(!html.includes('<b>X</b>') && html.includes('&lt;b&gt;'));
});

test('register -> unverified -> verify with token -> verified (single use)', async () => {
  const email = `verify-test-${Date.now()}@example.com`;
  let userId;
  try {
    const { user } = await registerUser({ email, password: 'password123', displayName: 'Verify Test' });
    userId = user.id;
    assert.equal(user.emailVerified, false);

    const row = await prisma.user.findUnique({ where: { id: userId } });
    assert.ok(row.emailVerifyTokenHash && row.emailVerifyExpiresAt > new Date());

    // A wrong token is rejected.
    await assert.rejects(() => verifyEmailToken('0'.repeat(64)), /invalid or has expired/);

    // Resend issues a fresh token; the old one stops working.
    const oldHash = row.emailVerifyTokenHash;
    assert.deepEqual(await resendVerification(userId), { sent: true });
    const refreshed = await prisma.user.findUnique({ where: { id: userId } });
    assert.notEqual(refreshed.emailVerifyTokenHash, oldHash);

    // Simulate the emailed token: store a known token's hash, then verify with it.
    const { token, tokenHash, expiresAt } = createVerificationToken();
    await prisma.user.update({ where: { id: userId }, data: { emailVerifyTokenHash: tokenHash, emailVerifyExpiresAt: expiresAt } });
    const verified = await verifyEmailToken(token);
    assert.equal(verified.emailVerified, true);
    await assert.rejects(() => verifyEmailToken(token), /invalid or has expired/); // single use
    assert.deepEqual(await resendVerification(userId), { alreadyVerified: true });
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  }
});

test('expired tokens are rejected', async () => {
  const email = `verify-exp-${Date.now()}@example.com`;
  let userId;
  try {
    const { user } = await registerUser({ email, password: 'password123', displayName: 'Expired Test' });
    userId = user.id;
    const { token, tokenHash } = createVerificationToken();
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifyTokenHash: tokenHash, emailVerifyExpiresAt: new Date(Date.now() - 1000) },
    });
    await assert.rejects(() => verifyEmailToken(token), /invalid or has expired/);
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  }
});
