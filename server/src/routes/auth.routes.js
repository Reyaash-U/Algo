import { Router } from 'express';
import { register, login, refresh, logout, me } from '../controllers/authController.js';
import { verifyJWT } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { limiters } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema } from '../validators/auth.validators.js';

// REFERENCE ROUTE FILE — fully implemented, no stubs. Copy this pattern.
const router = Router();

router.post('/register', limiters.auth, validate(registerSchema), register);
router.post('/login', limiters.auth, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', verifyJWT, logout);
router.get('/me', verifyJWT, me);

export default router;
