import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { signAccessToken, signRefreshToken, verifyRefresh } from '../utils/tokens.js';
import { toUserDTO } from '../models/User.js';
import { isValidTimezone } from './submissionService.js';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { sendEmail } from '../utils/mailer.js';
import { createVerificationToken, buildVerificationEmail, hashToken } from '../utils/emailVerification.js';

const BCRYPT_COST = 10;

export async function registerUser({ email, password, displayName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('Email already registered');

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const { token, tokenHash, expiresAt } = createVerificationToken();
  const user = await prisma.user.create({
    data: { email, passwordHash, displayName, emailVerified: false, emailVerifyTokenHash: tokenHash, emailVerifyExpiresAt: expiresAt },
  });
  // Never fail sign-up because the mail server is down; the user can resend from Settings.
  // eslint-disable-next-line no-console
  await sendVerificationEmail(user, token).catch((err) => console.error('[auth] verification email failed:', err.message));
  return issueTokens(user);
}

// Verifies a Google Identity Services ID token (signature, expiry, audience) and
// returns the Google-asserted identity. Only accounts with a verified email pass.
export async function verifyGoogleCredential(credential, { client = new OAuth2Client(), clientId = env.GOOGLE_CLIENT_ID } = {}) {
  if (!clientId) throw ApiError.badRequest('Google sign-in is not configured on this server');
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthenticated('Invalid Google credential');
  }
  if (!payload?.email || !payload.email_verified) {
    throw ApiError.unauthenticated('Google account email is not verified');
  }
  return { email: payload.email.toLowerCase(), name: payload.name, picture: payload.picture };
}

// Sign in (or sign up) with Google. Google has already proven ownership of the
// email, so the account is marked verified. An existing password account with the
// same email is linked rather than duplicated.
export async function googleLogin(credential, verify = verifyGoogleCredential) {
  const { email, name, picture } = await verify(credential);

  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (existing) {
    const data = {};
    if (!existing.emailVerified) Object.assign(data, { emailVerified: true, emailVerifyTokenHash: null, emailVerifyExpiresAt: null });
    if (!existing.avatarUrl && picture) data.avatarUrl = picture;
    const user = Object.keys(data).length ? await prisma.user.update({ where: { id: existing.id }, data }) : existing;
    return issueTokens(user);
  }

  // Google-only accounts get an unguessable password hash so password login stays impossible.
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), BCRYPT_COST);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: (name || email.split('@')[0]).slice(0, 50),
      avatarUrl: picture || null,
      emailVerified: true,
    },
  });
  return issueTokens(user);
}

async function sendVerificationEmail(user, token) {
  const email = buildVerificationEmail({ displayName: user.displayName, appUrl: env.APP_URL, token });
  return sendEmail({ to: user.email, ...email });
}

// Marks the account behind a valid, unexpired token as verified (single use).
export async function verifyEmailToken(token) {
  const user = await prisma.user.findFirst({
    where: { emailVerifyTokenHash: hashToken(token), emailVerifyExpiresAt: { gt: new Date() } },
  });
  if (!user) throw ApiError.badRequest('Verification link is invalid or has expired');
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyTokenHash: null, emailVerifyExpiresAt: null },
  });
  return toUserDTO(updated);
}

export async function resendVerification(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  if (user.emailVerified) return { alreadyVerified: true };
  const { token, tokenHash, expiresAt } = createVerificationToken();
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifyTokenHash: tokenHash, emailVerifyExpiresAt: expiresAt },
  });
  await sendVerificationEmail(user, token);
  return { sent: true };
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

export async function updateUserProfile(userId, { displayName, avatarUrl, bio, digestEnabled, digestHour, timezone } = {}) {
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

  if (digestEnabled !== undefined) {
    if (typeof digestEnabled !== 'boolean') throw ApiError.badRequest('digestEnabled must be true or false');
    updateData.digestEnabled = digestEnabled;
  }
  if (digestHour !== undefined) {
    if (!Number.isInteger(digestHour) || digestHour < 0 || digestHour > 23) {
      throw ApiError.badRequest('digestHour must be an integer between 0 and 23');
    }
    updateData.digestHour = digestHour;
  }
  if (timezone !== undefined) {
    if (!isValidTimezone(timezone)) throw ApiError.badRequest('timezone must be a valid IANA timezone');
    updateData.timezone = timezone;
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

    for (const key of ['digestEnabled', 'digestHour', 'timezone']) {
      if (updateData[key] !== undefined) {
        const cast = key === 'digestEnabled' ? 'boolean' : key === 'digestHour' ? 'integer' : 'text';
        fields.push(`"${key}" = $${paramIdx++}::${cast}`);
        values.push(updateData[key]);
      }
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
