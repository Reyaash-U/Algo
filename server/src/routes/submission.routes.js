import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { create, list } from '../controllers/submissionController.js';

const router = Router();
router.use(verifyJWT);

router.get('/', list);
router.post('/', create);

export default router;
