import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { toCfStatsDTO } from '../models/CfStats.js';
import { syncCodeforces } from '../services/cfSyncService.js';
import { buildDashboardSummary } from '../services/statsService.js';
import { getDailySubmissionCounts } from '../services/submissionService.js';

import { prisma } from '../config/db.js';

export const syncCf = asyncHandler(async (req, res) => {
  const handle = req.body?.handle || req.query?.handle || req.user?.cfHandle;
  const cfResult = await syncCodeforces(req.user.id, handle);
  res.status(200).json(ok(cfResult));
});

export const getCfStats = asyncHandler(async (req, res) => {
  const handle = req.query?.handle || req.user?.cfHandle;
  if (!handle) {
    const existing = await prisma.cfStats.findUnique({ where: { userId: req.user.id } });
    if (!existing) return res.status(200).json(ok(null));
    return res.status(200).json(ok(existing));
  }
  const cfResult = await syncCodeforces(req.user.id, handle);
  res.status(200).json(ok(cfResult));
});

export const disconnectCf = asyncHandler(async (req, res) => {
  await prisma.cfStats.deleteMany({ where: { userId: req.user.id } });
  await prisma.user.update({ where: { id: req.user.id }, data: { cfHandle: null } });
  res.status(200).json(ok({ disconnected: true }));
});

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await buildDashboardSummary(req.user.id);
  res.status(200).json(ok(summary));
});

export const getActivityHeatmap = asyncHandler(async (req, res) => {
  const { from, to, tz } = req.query;
  const heatmap = await getDailySubmissionCounts(req.user.id, { from, to, tz });
  res.status(200).json(ok(heatmap));
});

