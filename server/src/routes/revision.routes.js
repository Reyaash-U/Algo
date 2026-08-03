import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { enroll, due, review, stats } from '../controllers/revisionController.js';

// ─────────────────────────────────────────────────────────────────────────
// BACKEND DEV: the SM-2 algorithm is ALREADY DONE and tested in
// services/revisionService.js (applySm2 + nextReviewDate). Your controllers
// here just: load the Revision doc → call applySm2(state, rating) →
// persist repetitions/intervalDays/easeFactor/nextReviewAt → push to history.
// Do NOT reimplement the math. Import it.
// ─────────────────────────────────────────────────────────────────────────

const router = Router();
router.use(verifyJWT);

router.post('/', enroll);
router.get('/due', due);
router.post('/:id/review', review);
router.get('/stats', stats);

export default router;
