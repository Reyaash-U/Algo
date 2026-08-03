import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { signAccessToken, signRefreshToken, verifyRefresh } from '../utils/tokens.js';
import { toUserDTO } from '../models/User.js';

const BCRYPT_COST = 10;

export async function registerUser({ email, password, displayName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('Email already registered');

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await prisma.user.create({ data: { email, passwordHash, displayName } });
  return issueTokens(user);
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthenticated('Invalid credentials');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw ApiError.unauthenticated('Invalid credentials');

  return issueTokens(user);
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) throw ApiError.unauthenticated('Missing refresh token');
  let payload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    throw ApiError.unauthenticated('Invalid refresh token');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.refreshTokenVersion !== payload.ver) {
    throw ApiError.unauthenticated('Refresh token revoked');
  }
  return issueTokens(user);
}

// Logout-everywhere: bump the version so all existing refresh tokens die.
export async function revokeSessions(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenVersion: { increment: 1 } },
  });
}

function issueTokens(user) {
  return {
    user: toUserDTO(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}
