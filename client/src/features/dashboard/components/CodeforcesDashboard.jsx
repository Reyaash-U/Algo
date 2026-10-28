import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../../lib/themeContext.jsx';
import { api } from '../../../api/apiClient.js';
import { useToast } from '../../../components/shared/Toast.jsx';
import {
  fetchCodeforcesData,
  getRankTier,
} from '../services/codeforcesService.js';
import { CodeforcesRatingEmptyCard } from './CodeforcesRatingEmptyCard.jsx';
import { CodeforcesConnectModal } from './CodeforcesConnectModal.jsx';
import { CodeforcesRatingChart } from './CodeforcesRatingChart.jsx';
import { CodeforcesRecentContests } from './CodeforcesRecentContests.jsx';
import { CodeforcesProblemStats } from './CodeforcesProblemStats.jsx';
import { CodeforcesSubmissions } from './CodeforcesSubmissions.jsx';
import { CodeforcesActivityHeatmap } from './CodeforcesActivityHeatmap.jsx';
import { SkeletonCard } from '../../../components/shared/Skeleton.jsx';
import {
  ExternalLink,
  RefreshCw,
  LogOut,
  Edit2,
  AlertCircle,
} from 'lucide-react';

const STORAGE_KEY = 'algovault_cf_handle';

export function CodeforcesDashboard({ defaultHandle = null }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const toast = useToast();

  // Primary state machine
  const [codeforcesId, setCodeforcesId] = useState(() => {
    return defaultHandle || localStorage.getItem(STORAGE_KEY) || '';
  });

  const [cfData, setCfData] = useState({
    profile: null,
    ratingHistory: [],
    contestsCount: 0,
    latestContest: null,
    problemStats: null,
    recentSubmissions: [],
    dailyActivity: {},
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch function for a specific handle
  const loadData = useCallback(async (handleToLoad) => {
    if (!handleToLoad || !handleToLoad.trim()) {
      setLoading(false);
      setError(null);
      setCfData({
        profile: null,
        ratingHistory: [],
        contestsCount: 0,
        latestContest: null,
        problemStats: null,
        recentSubmissions: [],
        dailyActivity: {},
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCodeforcesData(handleToLoad);
      setCfData(data);
      setCodeforcesId(data.codeforcesId);
      localStorage.setItem(STORAGE_KEY, data.codeforcesId);

      // Silently sync with backend if user is logged in
      api.cf.sync({ handle: data.codeforcesId }).catch(() => null);

      setLoading(false);
    } catch (err) {
      console.error('Failed to load Codeforces profile:', err);
      setError(err.message || 'Unable to load Codeforces profile. Please check the handle.');
      setLoading(false);
    }
  }, []);

  // Initial load effect
  useEffect(() => {
    if (codeforcesId) {
      loadData(codeforcesId);
    }
  }, [codeforcesId, loadData]);

  // Disconnect handler
  const handleDisconnect = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setCodeforcesId('');
    setCfData({
      profile: null,
      ratingHistory: [],
      contestsCount: 0,
      latestContest: null,
      problemStats: null,
      recentSubmissions: [],
      dailyActivity: {},
    });
    setError(null);
    try {
      await api.cf.disconnect();
    } catch {
      // Ignore network errors on disconnect
    }
    toast.push('Codeforces account disconnected.', { type: 'info' });
  };

  // Connect handler from modal
  const handleConnect = async (newHandle) => {
    setIsModalOpen(false);
    loadData(newHandle);
  };

  // -------------------------------------------------------------
  // RENDER STATE: Loading
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="av-cf-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: isLight ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <RefreshCw size={18} className="animate-spin" style={{ color: '#3b82f6' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Loading Codeforces profile for "{codeforcesId}"...
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STATE: Error
  // -------------------------------------------------------------
  if (error && codeforcesId) {
    return (
      <div
        className="mono-card"
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
          }}
        >
          <AlertCircle size={24} />
        </div>

        <div>
          <h3 className="text-mono-title" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 850 }}>
            Unable to load Codeforces profile.
          </h3>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            Check the Codeforces handle <strong>"{codeforcesId}"</strong> and try again.
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#ef4444' }}>
            {error}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => loadData(codeforcesId)}
            className="btn-mono-secondary"
            style={{ padding: '8px 18px', fontSize: '0.88rem' }}
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-mono-primary"
            style={{ padding: '8px 18px', fontSize: '0.88rem' }}
          >
            Change Codeforces ID
          </button>
        </div>

        <CodeforcesConnectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConnect={handleConnect}
          initialHandle={codeforcesId}
          isLoading={loading}
          error={error}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STATE: State 1 — Codeforces ID is NOT provided
  // -------------------------------------------------------------
  if (!codeforcesId || !cfData.profile) {
    return (
      <>
        <CodeforcesRatingEmptyCard onConnectClick={() => setIsModalOpen(true)} />
        <CodeforcesConnectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConnect={handleConnect}
          isLoading={loading}
          error={error}
        />
      </>
    );
  }

  // -------------------------------------------------------------
  // RENDER STATE: State 2 — Codeforces ID IS provided
  // -------------------------------------------------------------
  const { profile, ratingHistory, contestsCount, latestContest, problemStats, recentSubmissions, dailyActivity } = cfData;
  const currentTier = getRankTier(profile.rating);
  const maxTier = getRankTier(profile.maxRating);

  return (
    <div className="av-cf-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Profile Header */}
      <div
        className="mono-card"
        style={{
          padding: '24px 28px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          background: isLight ? '#ffffff' : '#0c0c0e',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Avatar with rank border */}
          <div
            style={{
              position: 'relative',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              padding: '2px',
              border: `2px solid ${currentTier.color}`,
              boxShadow: `0 0 16px ${currentTier.color}30`,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <img
              src={profile.avatar}
              alt={profile.handle}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              onError={(e) => {
                e.target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.handle}`;
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2
                className="text-mono-title"
                style={{
                  margin: 0,
                  fontSize: '1.65rem',
                  fontWeight: 900,
                  color: currentTier.color,
                  letterSpacing: '-0.02em',
                }}
              >
                {profile.handle}
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: currentTier.bgColor,
                  color: currentTier.color,
                  border: `1px solid ${currentTier.color}40`,
                }}
              >
                {currentTier.name}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>
                Rating: <strong style={{ color: currentTier.color }}>{profile.rating}</strong>
              </span>
              <span>•</span>
              <span>
                Max Rating: <strong style={{ color: maxTier.color }}>{profile.maxRating}</strong> ({maxTier.name})
              </span>
              {profile.organization && (
                <>
                  <span>•</span>
                  <span>{profile.organization}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadData(codeforcesId)}
            className="btn-mono-secondary"
            title="Refresh statistics from Codeforces"
            style={{ padding: '8px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-mono-secondary"
            title="Change Codeforces handle"
            style={{ padding: '8px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit2 size={14} /> Change ID
          </button>

          <a
            href={profile.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-mono-primary"
            style={{
              padding: '8px 14px',
              fontSize: '0.82rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            View Codeforces Profile <ExternalLink size={13} />
          </a>

          <button
            type="button"
            onClick={handleDisconnect}
            className="btn-mono-secondary"
            title="Disconnect handle"
            style={{ padding: '8px 10px', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* 2. Rating Overview Cards (4 primary + 4 secondary) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Rating */}
        <div className="mono-card" style={{ padding: '20px', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 750, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Rating
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: currentTier.color, margin: '6px 0 2px' }}>
            {profile.rating}
          </div>
          <span style={{ fontSize: '0.78rem', color: currentTier.color, fontWeight: 700 }}>
            {currentTier.name}
          </span>
        </div>

        {/* Max Rating */}
        <div className="mono-card" style={{ padding: '20px', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 750, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Max Rating
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: maxTier.color, margin: '6px 0 2px' }}>
            {profile.maxRating}
          </div>
          <span style={{ fontSize: '0.78rem', color: maxTier.color, fontWeight: 700 }}>
            {maxTier.name}
          </span>
        </div>

        {/* Rank */}
        <div className="mono-card" style={{ padding: '20px', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 750, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Rank
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: currentTier.color, margin: '8px 0 4px' }}>
            {currentTier.name}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Max: {maxTier.name}
          </span>
        </div>

        {/* Contests Count */}
        <div className="mono-card" style={{ padding: '20px', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 750, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Contests
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '6px 0 2px' }}>
            {contestsCount}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Rounds participated
          </span>
        </div>

        {/* Latest Contest Delta */}
        <div className="mono-card" style={{ padding: '20px', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 750, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Latest Contest Change
          </span>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: latestContest
                ? latestContest.ratingChange >= 0
                  ? '#10b981'
                  : '#ef4444'
                : 'var(--text-secondary)',
              margin: '6px 0 2px',
            }}
          >
            {latestContest
              ? latestContest.ratingChange >= 0
                ? `+${latestContest.ratingChange}`
                : latestContest.ratingChange
              : '—'}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {latestContest ? `#${latestContest.rank} in ${latestContest.contestName}` : 'No contests yet'}
          </span>
        </div>

        {/* Total Problems Solved */}
        <div className="mono-card" style={{ padding: '20px', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 750, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Problems Solved
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#3b82f6', margin: '6px 0 2px' }}>
            {problemStats?.totalSolved ?? 0}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Unique solved tasks
          </span>
        </div>

        {/* Total Submissions */}
        <div className="mono-card" style={{ padding: '20px', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 750, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Submissions
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '6px 0 2px' }}>
            {problemStats?.totalSubmissions ?? 0}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {problemStats?.acceptedSubmissions ?? 0} accepted solutions
          </span>
        </div>

        {/* Acceptance Rate */}
        <div className="mono-card" style={{ padding: '20px', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 750, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Acceptance Rate
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', margin: '6px 0 2px' }}>
            {problemStats?.acceptanceRate ?? 0}%
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Ratio of OK verdicts
          </span>
        </div>
      </div>

      {/* 3. Rank Progression Progress Card */}
      {currentTier.nextRank && (
        <div
          className="mono-card"
          style={{
            padding: '20px 24px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 750, color: 'var(--text-primary)' }}>
              Rank Progression: <span style={{ color: currentTier.color }}>{currentTier.name}</span> ({profile.rating}) →{' '}
              <span style={{ color: getRankTier(currentTier.nextMin).color }}>{currentTier.nextRank}</span> ({currentTier.nextMin})
            </span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 650 }}>
              {currentTier.pointsNeeded} points needed
            </span>
          </div>

          <div
            style={{
              height: '10px',
              borderRadius: '6px',
              background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${currentTier.progressPercent}%`,
                background: `linear-gradient(90deg, ${currentTier.color}, ${getRankTier(currentTier.nextMin).color})`,
                borderRadius: '6px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* 4. Rating Chart (Main Visualization) */}
      <CodeforcesRatingChart ratingHistory={ratingHistory} />

      {/* 5. Recent Contests Table */}
      <CodeforcesRecentContests contests={ratingHistory} />

      {/* 6. Problem Solving Overview & Rating Distribution */}
      <CodeforcesProblemStats problemStats={problemStats} />

      {/* 7. Recent Submissions Section */}
      <CodeforcesSubmissions submissions={recentSubmissions} />

      {/* 8. Submission Activity Heatmap */}
      <CodeforcesActivityHeatmap dailyActivity={dailyActivity} />

      {/* Connect / Edit Modal */}
      <CodeforcesConnectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleConnect}
        initialHandle={codeforcesId}
        isLoading={loading}
        error={error}
      />
    </div>
  );
}
