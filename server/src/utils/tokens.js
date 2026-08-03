import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TTL,
  });
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, ver: user.refreshTokenVersion },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TTL }
  );
}

export function verifyAccess(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefresh(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

// Refresh token rides in an httpOnly Secure cookie.
export const REFRESH_COOKIE = 'av_refresh';
export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  };
}
