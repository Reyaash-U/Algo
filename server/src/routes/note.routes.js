import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { loadResource, requireOwner, requireReadable } from '../middleware/resourceGuard.js';
import { list, create, get, update, remove, fork, versions } from '../controllers/noteController.js';
import { createNoteReport } from '../controllers/reportController.js';
import { limiters } from '../middleware/rateLimit.js';

const router = Router();
router.use(verifyJWT); // every notes route needs a logged-in user

router.get('/', list);
router.post('/', create);

router.get('/:id', loadResource('note', { include: { problem: true } }), requireReadable, get);
router.patch('/:id', loadResource('note'), requireOwner, limiters.autosave, update);
router.delete('/:id', loadResource('note'), requireOwner, remove);

router.post('/:id/fork', loadResource('note', { includeDeleted: true }), requireReadable, fork);
router.get('/:id/versions', loadResource('note'), requireOwner, versions);
router.post('/:id/report', loadResource('note'), requireReadable, createNoteReport);

export default router;
