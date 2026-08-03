import rateLimit from 'express-rate-limit';
import { fail, ERROR_CODES } from '@algovault/shared';

const handler = (_req, res) =>
  res.status(429).json(fail(ERROR_CODES.RATE_LIMITED, 'Too many requests, slow down'));

// Named buckets referenced by contract endpoints' `rateLimit` key.
export const limiters = {
  // Auth routes: brute-force protection.
  auth: rateLimit({ windowMs: 15 * 60 * 1000, max: 20, handler, standardHeaders: true }),
  // /problems/resolve and /cf/sync trigger outbound fetches — abusable.
  resolve: rateLimit({ windowMs: 60 * 1000, max: 15, handler, standardHeaders: true }),
  // PATCH /notes/:id autosave: abuse protection against runaway client autosave loops.
  autosave: rateLimit({ windowMs: 10 * 1000, max: 15, handler, standardHeaders: true }),
};
