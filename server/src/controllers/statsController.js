import { ok } from '../utils/apiResponse.js';
import { asyncHandler, ApiError } from '../utils/apiError.js';
import { prisma } from '../config/db.js';
import { toCfStatsDTO } from '../models/CfStats.js';
import { syncCodeforces } from '../services/cfSyncService.js';
import { buildDashboardSummary } from '../services/statsService.js';

export const syncCf = asyncHandler(async (req, res) => {
  const cfStats = await syncCodeforces(req.user.id, req.body?.handle);
  res.status(200).json(ok(toCfStatsDTO(cfStats)));
});

export const getCfStats = asyncHandler(async (req, res) => {
  const cfStats = await prisma.cfStats.findUnique({ where: { userId: req.user.id } });
  if (!cfStats) throw ApiError.notFound('No Codeforces stats synced yet');
  res.status(200).json(ok(toCfStatsDTO(cfStats)));
});

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await buildDashboardSummary(req.user.id);
  res.status(200).json(ok(summary));
});
