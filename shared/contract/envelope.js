// The ONE response shape the entire API uses. Every controller returns this.
// Every frontend fetch expects this. No exceptions.
//
//   success:  { ok: true,  data: <payload>, meta?: {...} }
//   failure:  { ok: false, error: { code, message, details? } }
//
// Frontend switches on `error.code` (see enums.ERROR_CODES), NOT on message text.
// `meta` carries pagination and stub flags.

export function ok(data, meta) {
  const body = { ok: true, data };
  if (meta) body.meta = meta;
  return body;
}

export function fail(code, message, details) {
  const error = { code, message };
  if (details) error.details = details;
  return { ok: false, error };
}

// Pagination meta helper — use for every list endpoint.
export function pageMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
