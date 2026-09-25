import { Router } from 'express';
import { ok } from '@algovault/shared';
import authRoutes from './auth.routes.js';
import noteRoutes from './note.routes.js';
import problemRoutes from './problem.routes.js';
import revisionRoutes from './revision.routes.js';
import sheetRoutes from './sheet.routes.js';
import statsRoutes from './stats.routes.js';
import adminRoutes from './admin.routes.js';
import submissionRoutes from './submission.routes.js';

// Single mount table. Matches shared/contract/endpoints.js prefixes.
const router = Router();

router.get('/health', (_req, res) => res.json(ok({ status: 'up', ts: Date.now() })));

router.use('/auth', authRoutes);
router.use('/notes', noteRoutes);
router.use('/problems', problemRoutes);
router.use('/revisions', revisionRoutes);
router.use('/sheets', sheetRoutes);
router.use('/submissions', submissionRoutes);
router.use('/admin', adminRoutes);
// stats routes carry their own sub-prefixes (/cf, /dashboard, /search)
router.use('/', statsRoutes);

export default router;
