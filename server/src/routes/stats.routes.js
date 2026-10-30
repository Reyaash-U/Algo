import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { limiters } from '../middleware/rateLimit.js';
import { syncCf, getCfStats, disconnectCf, getDashboardSummary, getActivityHeatmap } from '../controllers/statsController.js';
import { syncLc, getLcStats, disconnectLc } from '../controllers/leetcodeController.js';
import { syncCc, getCcStats, disconnectCc } from '../controllers/codechefController.js';
import { query } from '../controllers/searchController.js';

const router = Router();
router.use(verifyJWT);

router.post('/cf/sync', limiters.resolve, syncCf);
router.get('/cf/stats', getCfStats);
router.delete('/cf/disconnect', disconnectCf);
router.post('/lc/sync', limiters.resolve, syncLc);
router.get('/lc/stats', getLcStats);
router.delete('/lc/disconnect', disconnectLc);
router.post('/cc/sync', limiters.resolve, syncCc);
router.get('/cc/stats', getCcStats);
router.delete('/cc/disconnect', disconnectCc);
router.get('/dashboard/summary', getDashboardSummary);
router.get('/dashboard/activity-heatmap', getActivityHeatmap);
router.get('/search', query);

export default router;
