import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { CompletionRing } from '../../components/shared/CompletionRing.jsx';
import { SubmissionHeatmap } from '../../components/shared/SubmissionHeatmap.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import { PatternHeatmap } from './components/PatternHeatmap.jsx';
import { ConfidenceRadar } from './components/ConfidenceRadar.jsx';
import { StalenessAlerts } from './components/StalenessAlerts.jsx';
import { CodeforcesDashboard } from './components/CodeforcesDashboard.jsx';
import { SettingsPage } from '../settings/SettingsPage.jsx';
import { BarChart3, Flame, Zap, Trophy, Settings } from 'lucide-react';

export function DashboardPage() {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'codeforces';

  const { data: authData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.auth.me(),
  });

  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: () => api.dashboard.summary(),
  });

  const { data: dueData } = useQuery({
    queryKey: queryKeys.revisionsDue,
    queryFn: () => api.revisions.due(),
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
    <div className="av-dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart3 size={32} strokeWidth={2.5} style={{ color: 'var(--text-primary)' }} />
            Analytics & Progress Dashboard
          </h1>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
            Competitive programming tracking, problem solving streaks, and spaced repetition analytics.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '10px',
        }}
      >
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'codeforces' })}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '0.92rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'codeforces' ? 'var(--text-primary)' : 'transparent',
            color: activeTab === 'codeforces' ? 'var(--bg-primary)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Trophy size={16} />
          Codeforces Dashboard
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'overview' })}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '0.92rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'overview' ? 'var(--text-primary)' : 'transparent',
            color: activeTab === 'overview' ? 'var(--bg-primary)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <BarChart3 size={16} />
          AlgoVault & Streaks
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'settings' })}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '0.92rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'settings' ? 'var(--text-primary)' : 'transparent',
            color: activeTab === 'settings' ? 'var(--bg-primary)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Settings size={16} />
          Settings
        </button>
      </div>

      {/* Tab 1: Codeforces Dashboard */}
      {activeTab === 'codeforces' && (
        <CodeforcesDashboard defaultHandle={authData?.user?.cfHandle} />
      )}

      {/* Tab 2: AlgoVault & Streaks */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

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
          <StalenessAlerts alerts={summary?.stalenessAlerts || []} theme={theme} />
        </div>
      </div>
    </div>
  )}

      {/* Tab 3: Settings */}
      {activeTab === 'settings' && (
        <SettingsPage />
      )}
</div>
  );
}
