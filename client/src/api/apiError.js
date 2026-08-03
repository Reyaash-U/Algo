// Frontend mirror of the backend's error envelope. Components switch on
// `.code` (from shared ERROR_CODES), never on `.message` text — messages can
// change wording without breaking UI logic.

export class ApiError extends Error {
  constructor(code, message, details, status) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

// Normalizes any axios error (or a raw envelope failure) into an ApiError.
export function toApiError(err) {
  const envelope = err?.response?.data;
  if (envelope && envelope.ok === false && envelope.error) {
    return new ApiError(envelope.error.code, envelope.error.message, envelope.error.details, err.response.status);
  }
  if (err instanceof ApiError) return err;
  return new ApiError('NETWORK_ERROR', err?.message ?? 'Network error', undefined, err?.response?.status);
}
