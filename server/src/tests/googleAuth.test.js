import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/db.js';
import { googleLogin, verifyGoogleCredential } from '../services/authService.js';

const fakeClient = (result) => ({
  verifyIdToken: async ({ audience }) => {
    if (result instanceof Error) throw result;
    assert.equal(audience, 'client-123');
    return { getPayload: () => result };
  },
});

test('verifyGoogleCredential: rejects when not configured, bad token, or unverified email', async () => {
  await assert.rejects(() => verifyGoogleCredential('x'.repeat(30), { clientId: '' }), /not configured/);
  await assert.rejects(
    () => verifyGoogleCredential('x'.repeat(30), { clientId: 'client-123', client: fakeClient(new Error('bad sig')) }),
    /Invalid Google credential/,
  );
  await assert.rejects(
    () => verifyGoogleCredential('x'.repeat(30), { clientId: 'client-123', client: fakeClient({ email: 'a@b.com', email_verified: false }) }),
    /not verified/,
  );
  const ok = await verifyGoogleCredential('x'.repeat(30), {
    clientId: 'client-123',
    client: fakeClient({ email: 'Mixed@Case.com', email_verified: true, name: 'M C', picture: 'https://p/x.png' }),
  });
  assert.deepEqual(ok, { email: 'mixed@case.com', name: 'M C', picture: 'https://p/x.png' });
});

test('googleLogin creates a verified account for a new Google user', async () => {
  const email = `google-new-${Date.now()}@example.com`;
  let userId;
  try {
    const res = await googleLogin('cred', async () => ({ email, name: 'Goo Gle', picture: 'https://p/x.png' }));
    userId = res.user.id;
    assert.equal(res.user.email, email);
    assert.equal(res.user.emailVerified, true);
    assert.equal(res.user.displayName, 'Goo Gle');
    assert.ok(res.accessToken && res.refreshToken);
    const row = await prisma.user.findUnique({ where: { id: userId } });
    assert.ok(row.passwordHash.startsWith('$2')); // unguessable bcrypt hash, so no password login
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  }
});

test('googleLogin links to an existing unverified account instead of duplicating it', async () => {
  const email = `google-link-${Date.now()}@example.com`;
  let userId;
  try {
    const created = await prisma.user.create({
      data: { email, passwordHash: 'x', displayName: 'Existing', emailVerified: false, emailVerifyTokenHash: 'h' },
    });
    userId = created.id;
    const res = await googleLogin('cred', async () => ({ email: email.toUpperCase(), name: 'Other Name', picture: 'https://p/y.png' }));
    assert.equal(res.user.id, userId); // same account, case-insensitive match
    assert.equal(res.user.emailVerified, true);
    assert.equal(res.user.displayName, 'Existing'); // existing profile kept
    assert.equal(await prisma.user.count({ where: { email: { equals: email, mode: 'insensitive' } } }), 1);
    const row = await prisma.user.findUnique({ where: { id: userId } });
    assert.equal(row.emailVerifyTokenHash, null);
    assert.equal(row.avatarUrl, 'https://p/y.png');
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  }
});
