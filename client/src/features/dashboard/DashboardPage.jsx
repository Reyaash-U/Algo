import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { CompletionRing } from '../../components/shared/CompletionRing.jsx';
import { SubmissionHeatmap } from '../../components/shared/SubmissionHeatmap.jsx';
import { CodeforcesBadge } from '../../components/shared/CodeforcesBadge.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';

export function DashboardPage() {
  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: () => api.dashboard.summary(),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) return <p className="av-form-error">Failed to load dashboard: {error.message}</p>;

  const streakCurrent = summary?.streak?.current ?? 7;
  const streakLongest = summary?.streak?.longest ?? 14;

  return (
    <div className="av-dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>📊 Analytics & Progress Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Track problem solving streaks, Codeforces sync, and spaced repetition metrics.
          </p>
        </div>
        <CodeforcesBadge handle="tourist" rating={1540} />
      </div>

      {/* Top Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {/* Radial Completion Ring Widget */}
        <div className="av-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <CompletionRing streak={streakCurrent} target={10} current={7} />
        </div>

        {/* Quick Stats Widget */}
        <div className="av-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Streak Record
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-warning)', margin: '8px 0' }}>
              {streakCurrent} Days <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 400 }}>(Max: {streakLongest})</span>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            🔥 Keep your streak alive by solving 1 problem today!
          </div>
        </div>

        {/* Due Revision Action Widget */}
        <div className="av-card av-card--glow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-warning)', fontWeight: 700, textTransform: 'uppercase' }}>
              ⚡ DUE REVISIONS
            </span>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', margin: '8px 0' }}>
              3 Problems
            </div>
          </div>
          <Link to="/revise" className="av-btn av-btn--primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
            Start Revision Session →
          </Link>
        </div>
      </div>

      {/* Activity Heatmap Grid */}
      <div className="av-card">
        <SubmissionHeatmap />
      </div>
    </div>
  );
}
