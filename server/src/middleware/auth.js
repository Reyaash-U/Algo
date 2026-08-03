import { ROLES } from '@algovault/shared';
import { ApiError, asyncHandler } from '../utils/apiError.js';
import { verifyAccess } from '../utils/tokens.js';
import { prisma } from '../config/db.js';

// Layer 1: verify the access JWT and attach the user row to req.user.
export const verifyJWT = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthenticated('Missing access token');

  let payload;
  try {
    payload = verifyAccess(token);
  } catch {
    throw ApiError.unauthenticated('Invalid or expired access token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw ApiError.unauthenticated('User no longer exists');

  req.user = user; // raw Prisma row; controllers map via toUserDTO() when responding
  next();
});

// Layer 2 (role): admin-only routes.
export function requireRole(role) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthenticated());
    if (role === ROLES.ADMIN && req.user.role !== ROLES.ADMIN) {
      return next(ApiError.forbidden('Admin access required'));
    }
    next();
  };
}
