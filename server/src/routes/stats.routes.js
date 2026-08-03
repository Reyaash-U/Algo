import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { limiters } from '../middleware/rateLimit.js';
import { stub } from '../utils/stub.js';
import { mockCfStats } from '@algovault/shared';
import { syncCf, getDashboardSummary } from '../controllers/statsController.js';

// BACKEND DEV: cfSyncService (Codeforces public API) + statsService (dashboard
// aggregations via $unwind/$group over notes). See docs/ARCHITECTURE.md.
const router = Router();
router.use(verifyJWT);

router.post('/cf/sync', limiters.resolve, syncCf);
router.get('/cf/stats', stub(() => mockCfStats()));
router.get('/dashboard/summary', getDashboardSummary);
router.get('/search', stub((req) => ({ query: req.query?.q ?? '', results: [] })));

export default router;
