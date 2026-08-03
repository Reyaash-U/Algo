import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { loadResource, requireOwner, requireReadable } from '../middleware/resourceGuard.js';
import { stub } from '../utils/stub.js';
import { toNoteDTO } from '../models/Note.js';
import { list, create, update, remove, fork } from '../controllers/noteController.js';
import { createNoteReport } from '../controllers/reportController.js';
import { limiters } from '../middleware/rateLimit.js';

// ─────────────────────────────────────────────────────────────────────────
// BACKEND DEV: replace each `stub(...)` with a real controller import.
// The GUARDS are already correct — do not remove them. Your controller runs
// only after auth + ownership/visibility checks have passed, and it can read
// the loaded Prisma row from req.resource.
//
// Example migration:
//   before:  router.get('/:id', verifyJWT, loadResource('note'), requireReadable, stub(...));
//   after:   router.get('/:id', verifyJWT, loadResource('note'), requireReadable, getNote);
//   ...where getNote just does: res.json(ok(toNoteDTO(req.resource)))
// ─────────────────────────────────────────────────────────────────────────

const router = Router();
router.use(verifyJWT); // every notes route needs a logged-in user

router.get('/', list);
router.post('/', create);

router.get('/:id', loadResource('note'), requireReadable, stub((req) => toNoteDTO(req.resource)));
router.patch('/:id', loadResource('note'), requireOwner, limiters.autosave, update);
router.delete('/:id', loadResource('note'), requireOwner, remove);

router.post('/:id/fork', loadResource('note', { includeDeleted: true }), requireReadable, fork);
router.get('/:id/versions', loadResource('note'), requireOwner, stub(() => ({ versions: [] })));
router.post('/:id/report', loadResource('note'), requireReadable, createNoteReport);

export default router;
