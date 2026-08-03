import { Router } from 'express';
import { ROLES } from '@algovault/shared';
import { verifyJWT, requireRole } from '../middleware/auth.js';
import { listTags, createTag, deleteTag } from '../controllers/adminController.js';
import { listReports, resolveReport } from '../controllers/reportController.js';

// BACKEND DEV: taxonomy CRUD + reported-content queue. requireRole('admin') is
// already enforcing the role-check authorization layer.
const router = Router();
router.use(verifyJWT, requireRole(ROLES.ADMIN));

router.get('/tags', listTags);
router.post('/tags', createTag);
router.delete('/tags/:id', deleteTag);
router.get('/reports', listReports);
router.patch('/reports/:id', resolveReport);

export default router;
