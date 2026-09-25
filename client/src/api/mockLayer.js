// MOCK LAYER — used when VITE_USE_MOCKS=true. Returns the exact same envelope
// shape the real API returns, built from shared/contract/dto.js factories.
// This is what lets Frontend Dev build every screen before the backend exists.
//
// Each entry is keyed by "METHOD /path/pattern" (with :params intact) and
// returns `{ok, data, meta?}`. apiClient.js matches the requested endpoint
// against this table when mocks are enabled.

import {
  mockUser,
  mockNote,
  mockProblem,
  mockRevision,
  mockSheet,
  mockDashboardSummary,
  mockCfStats,
  mockActivityHeatmap,
  mockSubmission,
} from '@algovault/shared';
import { ok, pageMeta } from '@algovault/shared';

// Small artificial delay so loading states are visible during dev — real
// network latency, not zero.
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export const mockHandlers = {
  'POST /auth/register': async () => ({ user: mockUser(), accessToken: 'mock-access-token' }),
  'POST /auth/login': async () => ({ user: mockUser(), accessToken: 'mock-access-token' }),
  'POST /auth/refresh': async () => ({ user: mockUser(), accessToken: 'mock-access-token-2' }),
  'GET /auth/me': async () => ({ user: mockUser() }),
  'PATCH /auth/profile': async (body) => ({ user: mockUser(body || {}) }),

  'GET /notes': async (_b, _p, query) => {
    let items = [
      mockNote({ title: 'Two Sum - Hash Map Approach', patternTags: ['array', 'hashmap', 'two-pointers'], visibility: 'public' }),
      mockNote({ title: 'Two Sum revisited', patternTags: ['array', 'hashmap'], visibility: 'private' }),
      mockNote({ title: 'Course Schedule (topo sort)', patternTags: ['graphs', 'topological-sort'], visibility: 'link' }),
      mockNote({ title: 'Longest Increasing Subsequence', patternTags: ['dp', 'binary-search'], visibility: 'public' }),
    ];
    if (query?.tag) {
      const t = query.tag.toLowerCase();
      items = items.filter((n) => n.patternTags?.some((tag) => tag.toLowerCase() === t));
    }
    if (query?.q) {
      const q = query.q.toLowerCase();
      items = items.filter((n) => n.title.toLowerCase().includes(q) || n.contentMarkdown?.toLowerCase().includes(q));
    }
    if (query?.visibility && query.visibility !== 'all') {
      items = items.filter((n) => n.visibility === query.visibility);
    }
    return { __meta: pageMeta({ page: 1, limit: 20, total: items.length }), items, total: items.length };
  },
  'POST /notes': async (body) => mockNote({ title: body?.title ?? 'Untitled' }),
  'GET /notes/:id': async (_body, params) => mockNote({ id: params.id }),
  'PATCH /notes/:id': async (body, params) => mockNote({ id: params.id, ...body }),
  'DELETE /notes/:id': async () => ({ deleted: true }),
  'POST /notes/:id/fork': async (_b, params) => mockNote({ forkOf: params.id, forkCount: 1 }),
  'GET /notes/:id/versions': async () => ({ versions: [] }),

  'POST /problems/resolve': async (body) => mockProblem({ url: body?.url ?? '' }),

  'POST /revisions': async (body) => mockRevision({ noteId: body?.noteId }),
  'GET /revisions/due': async () => ({
    items: [
      mockRevision({
        noteTitle: 'Two Sum - Hash Map Approach',
        patternTags: ['HashTable', 'Array'],
        contentMarkdown: '### Intuition\nUse a hash map to store `target - num` as we iterate.\n\n```python\ndef twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n```',
      }),
      mockRevision({
        noteTitle: '3Sum - Two Pointer Technique',
        patternTags: ['TwoPointers', 'Sorting'],
        contentMarkdown: '### Intuition\nSort the array first, fix one element, and run 2-pointer scan on the rest.\n\n```cpp\n// Time: O(N^2), Space: O(1)\n```',
      })
    ],
    count: 2
  }),
  'POST /revisions/:id/review': async (_b, params) => mockRevision({ id: params.id, repetitions: 1, intervalDays: 1 }),
  'GET /revisions/stats': async () => ({ retention7d: 0.82, dueToday: 5, reviewedToday: 3 }),

  'GET /sheets': async () => ({ items: [mockSheet()], total: 1 }),
  'POST /sheets': async (body) => mockSheet({ title: body?.title ?? 'New Sheet' }),
  'GET /sheets/:id': async (_b, params) => mockSheet({ id: params.id }),
  'PATCH /sheets/:id': async (body, params) => mockSheet({ id: params.id, ...body }),
  'DELETE /sheets/:id': async () => ({ deleted: true }),
  'PATCH /sheets/:id/items/:itemId': async (_b, params) => mockSheet({ id: params.id }),
  'POST /sheets/:id/fork': async (_b, params) => mockSheet({ forkOf: params.id, forkCount: 1 }),
  'POST /sheets/fork-github': async (body) => mockSheet({ title: 'Forked GitHub Sheet', description: `Imported from ${body?.url || ''}` }),

  'POST /cf/sync': async () => mockCfStats(),
  'GET /cf/stats': async () => mockCfStats(),
  'GET /dashboard/summary': async () => mockDashboardSummary(),
  'GET /dashboard/activity-heatmap': async () => mockActivityHeatmap(),
  'GET /submissions': async () => ({ items: [mockSubmission()], total: 1 }),
  'POST /submissions': async (body) => mockSubmission(body || {}),
  'GET /search': async (_b, _p, query) => ({
    query: query?.q ?? '',
    results: [
      { type: 'sheet', ...mockSheet({ title: "Striver's SDE Sheet", description: '180 must-do problems for top product based companies', visibility: 'public', forkCount: 1240 }) },
      { type: 'note', ...mockNote({ title: "Dijkstra's Algorithm - Priority Queue", contentMarkdown: '## Approach\nUse a min-heap to always expand the shortest path first.', visibility: 'public', patternTags: ['Graphs', 'ShortestPath'], forkCount: 89 }) }
    ]
  }),

  'GET /admin/tags': async () => ({ tags: ['dp', 'graphs', 'two-pointers'] }),
  'POST /admin/tags': async (body) => ({ tag: body?.tag ?? 'new-tag' }),
  'DELETE /admin/tags/:id': async () => ({ deleted: true }),
  'GET /admin/reports': async () => ({ reports: [] }),

  'GET /health': async () => ({ status: 'up (mock)', ts: Date.now() }),
};

export async function runMock(key, { body, params, query } = {}) {
  const handler = mockHandlers[key];
  if (!handler) {
    throw new Error(`[mock] No mock handler registered for "${key}". Add one in mockLayer.js.`);
  }
  await delay();
  const { __meta, ...data } = await handler(body, params, query);
  return ok(data, __meta);
}
