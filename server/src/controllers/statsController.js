import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { toCfStatsDTO } from '../models/CfStats.js';
import { syncCodeforces } from '../services/cfSyncService.js';
import { buildDashboardSummary } from '../services/statsService.js';

export const syncCf = asyncHandler(async (req, res) => {
  const cfStats = await syncCodeforces(req.user.id, req.body?.handle);
  res.status(200).json(ok(toCfStatsDTO(cfStats)));
});

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await buildDashboardSummary(req.user.id);
  res.status(200).json(ok(summary));
});
