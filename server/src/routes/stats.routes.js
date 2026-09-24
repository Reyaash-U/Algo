import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { limiters } from '../middleware/rateLimit.js';
import { syncCf, getCfStats, getDashboardSummary } from '../controllers/statsController.js';
import { query } from '../controllers/searchController.js';

const router = Router();
router.use(verifyJWT);

router.post('/cf/sync', limiters.resolve, syncCf);
router.get('/cf/stats', getCfStats);
router.get('/dashboard/summary', getDashboardSummary);
router.get('/search', query);

export default router;
