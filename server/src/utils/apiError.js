import { ERROR_CODES } from '@algovault/shared';

// Throw these anywhere; errorHandler middleware turns them into the envelope.
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  static badRequest(msg = 'Invalid request', details) {
    return new ApiError(400, ERROR_CODES.VALIDATION, msg, details);
  }
  static unauthenticated(msg = 'Not authenticated') {
    return new ApiError(401, ERROR_CODES.UNAUTHENTICATED, msg);
  }
  static forbidden(msg = 'Forbidden') {
    return new ApiError(403, ERROR_CODES.FORBIDDEN, msg);
  }
  static notFound(msg = 'Not found') {
    return new ApiError(404, ERROR_CODES.NOT_FOUND, msg);
  }
  static conflict(msg = 'Conflict') {
    return new ApiError(409, ERROR_CODES.CONFLICT, msg);
  }
}

// Wrap async route handlers so thrown errors reach the error middleware.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
