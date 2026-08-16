import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { CompletionRing } from '../../components/shared/CompletionRing.jsx';
import { SubmissionHeatmap } from '../../components/shared/SubmissionHeatmap.jsx';
import { CodeforcesBadge } from '../../components/shared/CodeforcesBadge.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useTheme } from '../../lib/themeContext.jsx';

export function DashboardPage() {
  const { theme } = useTheme();
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
    <div className="av-dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em' }}>
            📊 Analytics & Progress Dashboard
          </h1>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
            Track problem solving streaks, Codeforces sync, and spaced repetition metrics.
          </p>
        </div>
        <div style={{ filter: theme === 'light' ? 'invert(1) hue-rotate(180deg)' : 'none' }}>
          <CodeforcesBadge handle="tourist" rating={1540} />
        </div>
      </div>

      {/* Top Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
        {/* Radial Completion Ring Widget */}
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <CompletionRing streak={streakCurrent} target={10} current={7} monochrome={true} theme={theme} />
        </div>

        {/* Quick Stats Widget */}
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Streak Record
            </span>
            <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: '12px 0' }}>
              {streakCurrent} Days <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400 }}>(Max: {streakLongest})</span>
            </div>
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            🔥 Keep your streak alive by solving 1 problem today!
          </div>
        </div>

        {/* Due Revision Action Widget */}
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ DUE REVISIONS
            </span>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '12px 0' }}>
              3 Problems
            </div>
          </div>
          <Link to="/revise" className="btn-mono-primary" style={{ textDecoration: 'none', textAlign: 'center', width: '100%', justifyContent: 'center' }}>
            Start Revision Session →
          </Link>
        </div>
      </div>

      {/* Activity Heatmap Grid */}
      <div className="mono-card" style={{ padding: '24px' }}>
        <SubmissionHeatmap monochrome={true} theme={theme} />
      </div>
    </div>
  );
}
