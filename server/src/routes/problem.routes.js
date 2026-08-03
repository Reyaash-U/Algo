import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { limiters } from '../middleware/rateLimit.js';
import { resolve } from '../controllers/problemController.js';

// BACKEND DEV: problemFetchService.js should implement the cache-aside resolver:
// parse URL → detect platform → normalize → check Problem cache → fetch on miss.
// The rate limiter is already attached (outbound fetches are abusable).
const router = Router();
router.use(verifyJWT);

router.post('/resolve', limiters.resolve, resolve);

export default router;
