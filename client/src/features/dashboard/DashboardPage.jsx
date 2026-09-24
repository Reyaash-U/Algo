import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { useAuth } from '../../lib/authContext.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { CompletionRing } from '../../components/shared/CompletionRing.jsx';
import { SubmissionHeatmap } from '../../components/shared/SubmissionHeatmap.jsx';
import { CodeforcesBadge } from '../../components/shared/CodeforcesBadge.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import { PatternHeatmap } from './components/PatternHeatmap.jsx';
import { ConfidenceRadar } from './components/ConfidenceRadar.jsx';
import { StalenessAlerts } from './components/StalenessAlerts.jsx';
import { BarChart3, Flame, Zap, RefreshCw } from 'lucide-react';

export function DashboardPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [handleInput, setHandleInput] = useState('');

  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: () => api.dashboard.summary(),
  });

  const { data: dueData } = useQuery({
    queryKey: queryKeys.revisionsDue,
    queryFn: () => api.revisions.due(),
  });

  const { data: revisionStats } = useQuery({
    queryKey: queryKeys.revisionStats,
    queryFn: () => api.revisions.stats(),
  });

  const { data: cfStats, isError: cfMissing } = useQuery({
    queryKey: queryKeys.cfStats,
    queryFn: () => api.cf.stats(),
    retry: false,
  });

  const syncCfMutation = useMutation({
    mutationFn: (handle) => api.cf.sync(handle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfStats });
      toast.push('Codeforces stats synced!', { type: 'success' });
      setHandleInput('');
    },
    onError: (err) => toast.push(`Sync failed: ${err.message}`, { type: 'error' }),
  });

  const handleSync = (e) => {
    e.preventDefault();
    const handle = (handleInput || user?.cfHandle || '').trim();
    if (!handle) return;
    syncCfMutation.mutate(handle);
  };

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

  const streakCurrent = summary?.streak?.current ?? 0;
  const streakLongest = summary?.streak?.longest ?? 0;

  return (
    <div className="av-dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart3 size={32} strokeWidth={2.5} style={{ color: 'var(--text-primary)' }} />
            Analytics & Progress Dashboard
          </h1>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
            Track problem solving streaks, Codeforces sync, and spaced repetition metrics.
          </p>
        </div>
        {cfStats && !cfMissing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ filter: theme === 'light' ? 'invert(1) hue-rotate(180deg)' : 'none' }}>
              <CodeforcesBadge handle={cfStats.handle} rating={cfStats.currentRating} />
            </div>
            <button
              onClick={() => syncCfMutation.mutate(cfStats.handle)}
              disabled={syncCfMutation.isPending}
              className="btn-mono-secondary"
              aria-label="Re-sync Codeforces stats"
              style={{ padding: '6px 8px' }}
            >
              <RefreshCw size={14} className={syncCfMutation.isPending ? 'animate-spin' : ''} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSync} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              placeholder="Codeforces handle"
              style={{ background: theme === 'light' ? '#ffffff' : '#050505', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', outline: 'none', fontSize: '0.85rem' }}
            />
            <button type="submit" className="btn-mono-primary" disabled={syncCfMutation.isPending} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              {syncCfMutation.isPending ? 'Syncing…' : 'Connect'}
            </button>
          </form>
        )}
      </div>

      {/* Top Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
        {/* Radial Completion Ring Widget */}
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <CompletionRing streak={streakCurrent} target={Math.max(streakLongest, 1)} current={streakCurrent} monochrome={true} theme={theme} />
        </div>

        {/* Revision Retention Widget */}
        {revisionStats && (
          <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                7-Day Retention
              </span>
              <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: '12px 0' }}>
                {Math.round((revisionStats.retention7d ?? 0) * 100)}%
              </div>
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {revisionStats.reviewedToday ?? 0} reviewed today • {revisionStats.dueToday ?? 0} due today
            </div>
          </div>
        )}

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
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={16} strokeWidth={2.5} style={{ color: '#ef4444' }} />
            Keep your streak alive by solving 1 problem today!
          </div>
        </div>

        {/* Due Revision Action Widget */}
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} strokeWidth={2.5} style={{ color: '#eab308' }} />
              DUE REVISIONS
            </span>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '12px 0' }}>
              {dueData?.count ?? 0} Problems
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

      {/* Pattern Heatmap Grid */}
      <div className="mono-card" style={{ padding: '24px' }}>
        <PatternHeatmap patternCounts={summary?.patternCounts || []} theme={theme} />
      </div>

      {/* Radar and Alerts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div className="mono-card" style={{ padding: '24px' }}>
          <ConfidenceRadar patternCounts={summary?.patternCounts || []} theme={theme} />
        </div>
        <div className="mono-card" style={{ padding: '24px' }}>
          <StalenessAlerts alerts={summary?.stalenessAlerts || []} />
        </div>
      </div>
    </div>
  );
}
