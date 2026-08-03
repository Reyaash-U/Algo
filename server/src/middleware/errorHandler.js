import { fail, ERROR_CODES } from '@algovault/shared';
import { ApiError } from '../utils/apiError.js';
import { isDev } from '../config/env.js';

// Every error in the app funnels through here and leaves as the standard
// envelope. Controllers never format errors themselves.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json(fail(err.code, err.message, err.details));
  }

  // Prisma unique constraint violation → conflict (was Mongo's err.code 11000)
  if (err.code === 'P2002') {
    return res.status(409).json(fail(ERROR_CODES.CONFLICT, 'Resource already exists', { fields: err.meta?.target }));
  }

  // Prisma "record not found" on update/delete → 404
  if (err.code === 'P2025') {
    return res.status(404).json(fail(ERROR_CODES.NOT_FOUND, 'Resource not found'));
  }

  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  return res
    .status(500)
    .json(fail(ERROR_CODES.INTERNAL, 'Internal server error', isDev ? { stack: err.stack } : undefined));
}

// 404 fallthrough for unmatched routes.
export function notFoundHandler(req, res) {
  res.status(404).json(fail(ERROR_CODES.NOT_FOUND, `No route for ${req.method} ${req.originalUrl}`));
}
