import { QueryClient } from '@tanstack/react-query';

// Central React Query client. Sensible defaults for a mostly-personal-data app:
// don't refetch aggressively, but don't go stale forever either.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Central query key registry — avoids typo'd cache keys scattered across
// feature folders. Add a key here when a feature needs a new cache entry.
export const queryKeys = {
  me: ['auth', 'me'],
  notes: (query) => ['notes', 'list', query ?? {}],
  note: (id) => ['notes', 'detail', id],
  revisionsDue: ['revisions', 'due'],
  revisionStats: ['revisions', 'stats'],
  sheets: ['sheets', 'list'],
  sheet: (id) => ['sheets', 'detail', id],
  dashboardSummary: ['dashboard', 'summary'],
  activityHeatmap: (params) => ['dashboard', 'activityHeatmap', params ?? {}],
  submissions: (query) => ['submissions', 'list', query ?? {}],
  cfStats: ['cf', 'stats'],
  adminTags: ['admin', 'tags'],
  adminReports: ['admin', 'reports'],
};
