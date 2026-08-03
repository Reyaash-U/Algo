import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';

export function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: () => api.dashboard.summary(),
  });

  if (isLoading) return <p>Loading dashboard…</p>;
  if (isError) return <p className="av-form-error">Failed to load dashboard: {error.message}</p>;

  return (
    <div className="av-dashboard-page">
      <h1>Dashboard</h1>
      <p>Streak: {data.streak?.current} days (longest {data.streak?.longest})</p>
      {/* TODO(Frontend Dev): PatternHeatmap, ConfidenceRadar, StreakWidget,
          CFRatingGraph (recharts), StalenessAlerts — see README.md */}
    </div>
  );
}
