import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { limiters } from '../middleware/rateLimit.js';

import { syncCf, getCfStats, disconnectCf, getDashboardSummary, getActivityHeatmap } from '../controllers/statsController.js';
import { query } from '../controllers/searchController.js';

// BACKEND DEV: cfSyncService (Codeforces public API) + statsService (dashboard
// aggregations via $unwind/$group over notes). See docs/ARCHITECTURE.md.
const router = Router();
router.use(verifyJWT);

router.post('/cf/sync', limiters.resolve, syncCf);
router.get('/cf/stats', getCfStats);
router.delete('/cf/disconnect', disconnectCf);
router.get('/dashboard/summary', getDashboardSummary);
router.get('/dashboard/activity-heatmap', getActivityHeatmap);
router.get('/search', query);

export default router;
