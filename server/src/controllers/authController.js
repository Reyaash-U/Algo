import { ok } from '@algovault/shared';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/apiError.js';
import { REFRESH_COOKIE, refreshCookieOptions } from '../utils/tokens.js';
import { toUserDTO } from '../models/User.js';
import {
  registerUser,
  loginUser,
  refreshSession,
  revokeSessions,
  updateUserProfile,
} from '../services/authService.js';

// Controllers are THIN: validate (done by middleware) → call service → respond.
// This file is the template every other controller should imitate.

export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await registerUser(req.body);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.status(201).json(ok({ user, accessToken }));
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await loginUser(req.body);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.status(200).json(ok({ user, accessToken }));
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  const { user, accessToken, refreshToken } = await refreshSession(token);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.status(200).json(ok({ user, accessToken }));
});

export const logout = asyncHandler(async (req, res) => {
  await revokeSessions(req.user.id);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(200).json(ok({ loggedOut: true }));
});

export const me = asyncHandler(async (req, res) => {
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM users WHERE id = $1', req.user.id);
  const userRow = rows?.[0] || req.user;
  res.status(200).json(ok({ user: toUserDTO(userRow) }));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await updateUserProfile(req.user.id, req.body);
  res.status(200).json(ok({ user: updatedUser }));
});
