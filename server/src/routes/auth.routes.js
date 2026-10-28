import { Router } from 'express';
import { register, login, refresh, logout, me, updateMe, updateProfile, verifyEmail, resendVerification, googleLogin } from '../controllers/authController.js';
import { verifyJWT } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { limiters } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema, updateMeSchema, verifyEmailSchema, googleLoginSchema } from '../validators/auth.validators.js';

// REFERENCE ROUTE FILE — fully implemented, no stubs. Copy this pattern.
const router = Router();

router.post('/register', limiters.auth, validate(registerSchema), register);
router.post('/login', limiters.auth, validate(loginSchema), login);
router.post('/google', limiters.auth, validate(googleLoginSchema), googleLogin);
router.post('/refresh', refresh);
router.post('/verify-email', limiters.auth, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', verifyJWT, limiters.auth, resendVerification);
router.post('/logout', verifyJWT, logout);
router.get('/me', verifyJWT, me);
router.patch('/me', verifyJWT, validate(updateMeSchema), updateMe);
router.patch('/profile', verifyJWT, updateProfile);
router.put('/profile', verifyJWT, updateProfile);

export default router;
