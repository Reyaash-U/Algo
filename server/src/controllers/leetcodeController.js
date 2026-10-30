import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { prisma } from '../config/db.js';
import { toLcStatsDTO } from '../models/LcStats.js';
import { syncLeetCode, disconnectLeetCode } from '../services/leetcodeSyncService.js';

export const syncLc = asyncHandler(async (req, res) => {
  const username = req.body?.username || req.user?.lcHandle;
  const row = await syncLeetCode(req.user.id, username);
  res.status(200).json(ok(toLcStatsDTO(row)));
});

// Returns null (not an error) when the user hasn't connected LeetCode yet.
export const getLcStats = asyncHandler(async (req, res) => {
  const row = await prisma.lcStats.findUnique({ where: { userId: req.user.id } });
  res.status(200).json(ok(row ? toLcStatsDTO(row) : null));
});

export const disconnectLc = asyncHandler(async (req, res) => {
  await disconnectLeetCode(req.user.id);
  res.status(200).json(ok({ disconnected: true }));
});
