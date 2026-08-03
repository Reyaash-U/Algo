// GENERATED-STYLE API CLIENT.
//
// Walks shared/contract/endpoints.js and produces a matching call() function
// per endpoint. This means the endpoint registry is the ONLY place a route is
// ever typed out — add a route there and it's automatically callable here.
//
// Toggle: VITE_USE_MOCKS=true routes every call through mockLayer.js instead
// of the real HTTP client. Same call signature either way, so switching is a
// one-line env change, not a code change.

import { ENDPOINTS, buildPath } from '@algovault/shared';
import { http } from './httpClient.js';
import { runMock } from './mockLayer.js';
import { toApiError } from './apiError.js';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

/**
 * Low-level call matching one entry from ENDPOINTS.
 * @param {{method:string, path:string}} endpoint
 * @param {{params?:object, body?:object, query?:object}} opts
 */
async function call(endpoint, { params = {}, body, query } = {}) {
  const path = buildPath(endpoint.path, params);

  try {
    if (USE_MOCKS) {
      const mockKey = `${endpoint.method} ${endpoint.path}`; // unresolved path, e.g. "/notes/:id"
      const envelope = await runMock(mockKey, { body, params, query });
      return envelope.data;
    }

    const res = await http.request({
      method: endpoint.method,
      url: path,
      data: body,
      params: query,
    });

    const envelope = res.data;
    if (!envelope?.ok) {
      throw toApiError({ response: { data: envelope, status: res.status } });
    }
    return envelope.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// ---------------------------------------------------------------------------
// Namespaced client. One method per endpoint, thin and explicit.
// Frontend Dev: call these from React Query hooks in each feature folder.
// Never call `http` or `runMock` directly from a component.
// ---------------------------------------------------------------------------

export const api = {
  auth: {
    register: (body) => call(ENDPOINTS.auth.register, { body }),
    login: (body) => call(ENDPOINTS.auth.login, { body }),
    refresh: () => call(ENDPOINTS.auth.refresh),
    logout: () => call(ENDPOINTS.auth.logout),
    me: () => call(ENDPOINTS.auth.me),
  },

  notes: {
    list: (query) => call(ENDPOINTS.notes.list, { query }),
    create: (body) => call(ENDPOINTS.notes.create, { body }),
    get: (id) => call(ENDPOINTS.notes.get, { params: { id } }),
    update: (id, body) => call(ENDPOINTS.notes.update, { params: { id }, body }),
    remove: (id) => call(ENDPOINTS.notes.remove, { params: { id } }),
    fork: (id) => call(ENDPOINTS.notes.fork, { params: { id } }),
    versions: (id) => call(ENDPOINTS.notes.versions, { params: { id } }),
  },

  problems: {
    resolve: (url) => call(ENDPOINTS.problems.resolve, { body: { url } }),
  },

  revisions: {
    enroll: (noteId) => call(ENDPOINTS.revisions.enroll, { body: { noteId } }),
    due: () => call(ENDPOINTS.revisions.due),
    review: (id, rating) => call(ENDPOINTS.revisions.review, { params: { id }, body: { rating } }),
    stats: () => call(ENDPOINTS.revisions.stats),
  },

  sheets: {
    list: () => call(ENDPOINTS.sheets.list),
    create: (body) => call(ENDPOINTS.sheets.create, { body }),
    get: (id) => call(ENDPOINTS.sheets.get, { params: { id } }),
    update: (id, body) => call(ENDPOINTS.sheets.update, { params: { id }, body }),
    remove: (id) => call(ENDPOINTS.sheets.remove, { params: { id } }),
    updateItem: (id, itemId, body) =>
      call(ENDPOINTS.sheets.updateItem, { params: { id, itemId }, body }),
    fork: (id) => call(ENDPOINTS.sheets.fork, { params: { id } }),
  },

  cf: {
    sync: () => call(ENDPOINTS.cf.sync),
    stats: () => call(ENDPOINTS.cf.stats),
  },

  dashboard: {
    summary: () => call(ENDPOINTS.dashboard.summary),
  },

  search: {
    query: (q) => call(ENDPOINTS.search.query, { query: { q } }),
  },

  admin: {
    listTags: () => call(ENDPOINTS.admin.listTags),
    createTag: (tag) => call(ENDPOINTS.admin.createTag, { body: { tag } }),
    deleteTag: (id) => call(ENDPOINTS.admin.deleteTag, { params: { id } }),
    reports: () => call(ENDPOINTS.admin.reports),
  },

  health: {
    check: () => call(ENDPOINTS.health.check),
  },
};
