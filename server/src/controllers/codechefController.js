import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { prisma } from '../config/db.js';
import { toCcStatsDTO } from '../models/CcStats.js';
import { syncCodeChef, disconnectCodeChef } from '../services/codechefSyncService.js';

export const syncCc = asyncHandler(async (req, res) => {
  const username = req.body?.username || req.user?.ccHandle;
  const row = await syncCodeChef(req.user.id, username);
  res.status(200).json(ok(toCcStatsDTO(row)));
});

// Returns null (not an error) when the user hasn't connected CodeChef yet.
export const getCcStats = asyncHandler(async (req, res) => {
  const row = await prisma.ccStats.findUnique({ where: { userId: req.user.id } });
  res.status(200).json(ok(row ? toCcStatsDTO(row) : null));
});

export const disconnectCc = asyncHandler(async (req, res) => {
  await disconnectCodeChef(req.user.id);
  res.status(200).json(ok({ disconnected: true }));
});
