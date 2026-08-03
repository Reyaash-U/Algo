// THE ENDPOINT REGISTRY.
// Every route in the system, declared once. Backend mounts these.
// Frontend builds its API client from these. Change a path here → both update.
//
// `auth`: 'none' | 'user' | 'admin'  — what verifyJWT/requireRole enforces.
// `rateLimit`: optional key into middleware/rateLimit.js buckets.

export const API_BASE = '/api';

export const ENDPOINTS = Object.freeze({
  // ---- Auth ----
  auth: {
    register: { method: 'POST', path: '/auth/register', auth: 'none', rateLimit: 'auth' },
    login:    { method: 'POST', path: '/auth/login',    auth: 'none', rateLimit: 'auth' },
    refresh:  { method: 'POST', path: '/auth/refresh',  auth: 'none' },
    logout:   { method: 'POST', path: '/auth/logout',   auth: 'user' },
    me:       { method: 'GET',  path: '/auth/me',       auth: 'user' },
  },

  // ---- Notes ----
  notes: {
    list:     { method: 'GET',    path: '/notes',             auth: 'user' },
    create:   { method: 'POST',   path: '/notes',             auth: 'user' },
    get:      { method: 'GET',    path: '/notes/:id',         auth: 'user' }, // visibility-checked
    update:   { method: 'PATCH',  path: '/notes/:id',         auth: 'user', rateLimit: 'autosave' }, // autosave
    remove:   { method: 'DELETE', path: '/notes/:id',         auth: 'user' },
    fork:     { method: 'POST',   path: '/notes/:id/fork',    auth: 'user' },
    versions: { method: 'GET',    path: '/notes/:id/versions',auth: 'user' },
    report:   { method: 'POST',   path: '/notes/:id/report',  auth: 'user' },
  },

  // ---- Problems ----
  problems: {
    resolve: { method: 'POST', path: '/problems/resolve', auth: 'user', rateLimit: 'resolve' },
  },

  // ---- Revision (SM-2) ----
  revisions: {
    enroll: { method: 'POST', path: '/revisions',            auth: 'user' },
    due:    { method: 'GET',  path: '/revisions/due',        auth: 'user' },
    review: { method: 'POST', path: '/revisions/:id/review', auth: 'user' },
    stats:  { method: 'GET',  path: '/revisions/stats',      auth: 'user' },
  },

  // ---- Sheets ----
  sheets: {
    list:       { method: 'GET',    path: '/sheets',                    auth: 'user' },
    create:     { method: 'POST',   path: '/sheets',                    auth: 'user' },
    get:        { method: 'GET',    path: '/sheets/:id',                auth: 'user' },
    update:     { method: 'PATCH',  path: '/sheets/:id',                auth: 'user' },
    remove:     { method: 'DELETE', path: '/sheets/:id',                auth: 'user' },
    updateItem: { method: 'PATCH',  path: '/sheets/:id/items/:itemId',  auth: 'user' },
    fork:       { method: 'POST',   path: '/sheets/:id/fork',           auth: 'user' },
    report:     { method: 'POST',   path: '/sheets/:id/report',         auth: 'user' },
  },

  // ---- Stats & misc ----
  cf: {
    sync:  { method: 'POST', path: '/cf/sync',  auth: 'user', rateLimit: 'resolve' },
    stats: { method: 'GET',  path: '/cf/stats', auth: 'user' },
  },
  dashboard: {
    summary: { method: 'GET', path: '/dashboard/summary', auth: 'user' },
  },
  search: {
    query: { method: 'GET', path: '/search', auth: 'user' },
  },

  // ---- Admin ----
  admin: {
    listTags:   { method: 'GET',    path: '/admin/tags',       auth: 'admin' },
    createTag:  { method: 'POST',   path: '/admin/tags',       auth: 'admin' },
    deleteTag:     { method: 'DELETE', path: '/admin/tags/:id',    auth: 'admin' },
    reports:       { method: 'GET',    path: '/admin/reports',     auth: 'admin' },
    resolveReport: { method: 'PATCH',  path: '/admin/reports/:id', auth: 'admin' },
  },

  // ---- Health ----
  health: { check: { method: 'GET', path: '/health', auth: 'none' } },
});

// Helper: fill :params in a path. buildPath('/notes/:id', {id:'abc'}) → '/notes/abc'
export function buildPath(path, params = {}) {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
    if (params[key] == null) throw new Error(`Missing path param: ${key}`);
    return encodeURIComponent(params[key]);
  });
}
