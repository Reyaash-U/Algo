import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { loadResource, requireOwner, requireReadable } from '../middleware/resourceGuard.js';
import { ok } from '../utils/apiResponse.js';
import { toNoteDTO } from '../models/Note.js';
import { list, create, update, remove, fork } from '../controllers/noteController.js';
import { createNoteReport } from '../controllers/reportController.js';
import { limiters } from '../middleware/rateLimit.js';

const router = Router();
router.use(verifyJWT); // every notes route needs a logged-in user

router.get('/', list);
router.post('/', create);

router.get('/:id', loadResource('note'), requireReadable, (req, res) => res.status(200).json(ok(toNoteDTO(req.resource))));
router.patch('/:id', loadResource('note'), requireOwner, limiters.autosave, update);
router.delete('/:id', loadResource('note'), requireOwner, remove);

router.post('/:id/fork', loadResource('note', { includeDeleted: true }), requireReadable, fork);
router.get('/:id/versions', loadResource('note'), requireOwner, (_req, res) => res.status(200).json(ok({ versions: [] })));
router.post('/:id/report', loadResource('note'), requireReadable, createNoteReport);

export default router;
