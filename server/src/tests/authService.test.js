import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { registerUser, loginUser } from '../services/authService.js';

// bcryptjs.hashSync('correct-password', 10) — fixed so tests are deterministic.
const CORRECT_PASSWORD_HASH = '$2a$10$qDEOaAguH2ReiP/L8uAZzuf5YYeP96EfZrJScblWIYFnoDRFDMuDO';

test('registerUser rejects a duplicate email', async () => {
  const originalFind = prisma.user.findUnique;
  prisma.user.findUnique = async () => ({ id: 'existing-user' });
  try {
    await assert.rejects(
      () => registerUser({ email: 'dup@example.com', password: 'password123', displayName: 'Dup' }),
      (err) => err.status === 409,
    );
  } finally {
    prisma.user.findUnique = originalFind;
  }
});

test('loginUser rejects an unknown email without leaking whether the account exists', async () => {
  const originalFind = prisma.user.findUnique;
  prisma.user.findUnique = async () => null;
  try {
    await assert.rejects(
      () => loginUser({ email: 'nobody@example.com', password: 'whatever123' }),
      (err) => err.status === 401 && err.message === 'Invalid credentials',
    );
  } finally {
    prisma.user.findUnique = originalFind;
  }
});

test('loginUser rejects a wrong password with the same message as an unknown email', async () => {
  const originalFind = prisma.user.findUnique;
  prisma.user.findUnique = async () => ({ id: 'user-1', passwordHash: CORRECT_PASSWORD_HASH });
  try {
    await assert.rejects(
      () => loginUser({ email: 'user@example.com', password: 'wrong-password' }),
      (err) => err.status === 401 && err.message === 'Invalid credentials',
    );
  } finally {
    prisma.user.findUnique = originalFind;
  }
});

test('loginUser succeeds and issues tokens for the correct password', async () => {
  const originalFind = prisma.user.findUnique;
  prisma.user.findUnique = async () => ({
    id: 'user-1',
    email: 'user@example.com',
    displayName: 'Test User',
    role: 'user',
    cfHandle: null,
    passwordHash: CORRECT_PASSWORD_HASH,
    refreshTokenVersion: 0,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  });
  const previousAccessSecret = env.JWT_ACCESS_SECRET;
  const previousRefreshSecret = env.JWT_REFRESH_SECRET;
  env.JWT_ACCESS_SECRET = 'test-access-secret';
  env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  try {
    const { user, accessToken, refreshToken } = await loginUser({
      email: 'user@example.com',
      password: 'correct-password',
    });
    assert.equal(user.id, 'user-1');
    assert.equal(typeof accessToken, 'string');
    assert.equal(typeof refreshToken, 'string');
  } finally {
    prisma.user.findUnique = originalFind;
    env.JWT_ACCESS_SECRET = previousAccessSecret;
    env.JWT_REFRESH_SECRET = previousRefreshSecret;
  }
});
