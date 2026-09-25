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

export async function updateUserProfile(userId, { displayName, avatarUrl, bio } = {}) {
  if (displayName !== undefined) {
    const trimmed = typeof displayName === 'string' ? displayName.trim() : '';
    if (trimmed.length < 2 || trimmed.length > 50) {
      throw ApiError.badRequest('Display name must be between 2 and 50 characters');
    }
  }

  const updateData = {};
  if (displayName !== undefined) {
    const trimmed = String(displayName).trim();
    if (!trimmed) {
      throw ApiError.badRequest('Display name is required');
    }
    if (trimmed.length < 2 || trimmed.length > 50) {
      throw ApiError.badRequest('Display name must be between 2 and 50 characters');
    }
    updateData.displayName = trimmed;
  }

  if (avatarUrl !== undefined) {
    updateData.avatarUrl = avatarUrl ? String(avatarUrl).trim() : null;
  }

  if (bio !== undefined) {
    const trimmedBio = typeof bio === 'string' ? bio.trim() : '';
    if (trimmedBio.length > 500) {
      throw ApiError.badRequest('Bio must not exceed 500 characters');
    }
    updateData.bio = trimmedBio;
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    return toUserDTO(user);
  } catch (err) {
    // Fallback: robust raw SQL query with explicit PostgreSQL type casting
    const fields = [];
    const values = [];
    let paramIdx = 1;

    if (updateData.displayName !== undefined) {
      fields.push(`"displayName" = $${paramIdx++}::text`);
      values.push(updateData.displayName);
    }
    if (updateData.avatarUrl !== undefined) {
      fields.push(`"avatarUrl" = $${paramIdx++}::text`);
      values.push(updateData.avatarUrl);
    }
    if (updateData.bio !== undefined) {
      fields.push(`"bio" = $${paramIdx++}::text`);
      values.push(updateData.bio);
    }

    fields.push('"updatedAt" = NOW()');
    values.push(userId);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIdx}::text RETURNING *`;
    const rows = await prisma.$queryRawUnsafe(sql, ...values);

    if (rows && rows.length > 0) {
      return toUserDTO(rows[0]);
    }
    throw err;
  }
}

function issueTokens(user) {
  return {
    user: toUserDTO(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}
