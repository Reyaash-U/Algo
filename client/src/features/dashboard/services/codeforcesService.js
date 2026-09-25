// Service to fetch and process Codeforces profile, contest rating history,
// submissions, and problem-solving analytics.
// Uses direct Codeforces public API with fallback to AlgoVault backend /api/cf/sync.

import { api } from '../../../api/apiClient.js';

export const CF_RANKS = [
  { min: 0, max: 1199, name: 'Newbie', color: '#9ca3af', bgColor: 'rgba(156, 163, 175, 0.12)', border: '#6b7280' },
  { min: 1200, max: 1399, name: 'Pupil', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.12)', border: '#16a34a' },
  { min: 1400, max: 1599, name: 'Specialist', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)', border: '#0891b2' },
  { min: 1600, max: 1899, name: 'Expert', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.12)', border: '#2563eb' },
  { min: 1900, max: 2199, name: 'Candidate Master', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.12)', border: '#9333ea' },
  { min: 2200, max: 2299, name: 'Master', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.12)', border: '#ea580c' },
  { min: 2300, max: 2399, name: 'International Master', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.12)', border: '#ea580c' },
  { min: 2400, max: 2599, name: 'Grandmaster', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.12)', border: '#dc2626' },
  { min: 2600, max: 2999, name: 'International Grandmaster', color: '#dc2626', bgColor: 'rgba(220, 38, 38, 0.12)', border: '#b91c1c' },
  { min: 3000, max: 99999, name: 'Legendary Grandmaster', color: '#b91c1c', bgColor: 'rgba(185, 28, 28, 0.15)', border: '#991b1b', isLegendary: true },
];

export function getRankTier(rating) {
  const r = typeof rating === 'number' && !isNaN(rating) ? rating : 0;
  for (let i = 0; i < CF_RANKS.length; i++) {
    const tier = CF_RANKS[i];
    if (r <= tier.max) {
      const nextTier = CF_RANKS[i + 1] || null;
      let progressPercent = 100;
      let pointsNeeded = 0;

      if (nextTier) {
        const range = tier.max - tier.min + 1;
        const currentProgress = Math.max(0, r - tier.min);
        progressPercent = Math.min(100, Math.round((currentProgress / range) * 100));
        pointsNeeded = Math.max(0, nextTier.min - r);
      }

      return {
        ...tier,
        currentRating: r,
        nextRank: nextTier ? nextTier.name : null,
        nextMin: nextTier ? nextTier.min : null,
        progressPercent,
        pointsNeeded,
      };
    }
  }
  return {
    ...CF_RANKS[0],
    currentRating: r,
    nextRank: CF_RANKS[1].name,
    nextMin: CF_RANKS[1].min,
    progressPercent: 0,
    pointsNeeded: 1200 - r,
  };
}

export function formatRankName(rankStr) {
  if (!rankStr) return 'Unrated';
  return rankStr
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export async function fetchCodeforcesData(handle) {
  if (!handle || typeof handle !== 'string' || handle.trim() === '') {
    throw new Error('Codeforces handle is required');
  }

  const cleanHandle = handle.trim();

  // Try direct Codeforces API calls first
  try {
    const [infoRes, ratingRes, statusRes] = await Promise.all([
      fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(cleanHandle)}`).then((r) => r.json()),
      fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(cleanHandle)}`).then((r) => r.json()),
      fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(cleanHandle)}&from=1&count=1000`).then((r) => r.json()),
    ]);

    if (infoRes.status !== 'OK' || !Array.isArray(infoRes.result) || infoRes.result.length === 0) {
      const msg = infoRes.comment || 'User not found on Codeforces';
      throw new Error(msg);
    }

    const rawUser = infoRes.result[0];
    const rawContests = Array.isArray(ratingRes.result) ? ratingRes.result : [];
    const rawSubmissions = Array.isArray(statusRes.result) ? statusRes.result : [];

    return processCodeforcesPayload(rawUser, rawContests, rawSubmissions);
  } catch (directErr) {
    // If direct fetch fails (e.g. CORS or network blocking), fall back to backend sync endpoint
    try {
      const backendResult = await api.cf.sync({ handle: cleanHandle });
      if (backendResult) {
        return normalizeBackendResult(backendResult, cleanHandle);
      }
    } catch {
      // Re-throw original or helpful error
      throw new Error(directErr.message || 'Unable to load Codeforces profile. Please check the handle.');
    }
    throw directErr;
  }
}

function processCodeforcesPayload(user, contests, submissions) {
  const ratingHistory = contests.map((c, index) => {
    const ratingChange = c.newRating - c.oldRating;
    const dateObj = new Date(c.ratingUpdateTimeSeconds * 1000);
    return {
      contestId: c.contestId,
      contestName: c.contestName || `Contest #${c.contestId}`,
      rank: c.rank,
      ratingBefore: c.oldRating,
      ratingAfter: c.newRating,
      ratingChange,
      date: dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      timestamp: c.ratingUpdateTimeSeconds * 1000,
      contestNumber: index + 1,
    };
  });

  const currentRating = user.rating ?? (ratingHistory.length > 0 ? ratingHistory[ratingHistory.length - 1].ratingAfter : 0);
  const maxRating = user.maxRating ?? (ratingHistory.length > 0 ? Math.max(...ratingHistory.map((c) => c.ratingAfter)) : currentRating);

  const latestContest = ratingHistory.length > 0 ? ratingHistory[ratingHistory.length - 1] : null;

  // Process unique solved problems
  const solvedProblems = new Map();
  const ratingBuckets = {};
  let acceptedSubmissions = 0;
  const dailyActivity = {};

  for (const s of submissions) {
    if (s.creationTimeSeconds) {
      const dayKey = new Date(s.creationTimeSeconds * 1000).toISOString().slice(0, 10);
      dailyActivity[dayKey] = (dailyActivity[dayKey] || 0) + 1;
    }

    const isOk = s.verdict === 'OK';
    if (isOk) acceptedSubmissions += 1;

    if (!isOk || !s.problem) continue;
    const p = s.problem;
    const key = `${p.contestId ?? 'na'}:${p.index ?? 'na'}:${p.name ?? 'na'}`;

    if (!solvedProblems.has(key)) {
      solvedProblems.set(key, {
        contestId: p.contestId,
        index: p.index,
        name: p.name,
        rating: p.rating,
        tags: p.tags || [],
      });

      if (typeof p.rating === 'number' && p.rating > 0) {
        ratingBuckets[p.rating] = (ratingBuckets[p.rating] || 0) + 1;
      }
    }
  }

  // Distribution ranges: < 1000, 1000–1199, 1200–1399, 1400–1599, 1600–1799, 1800–1999, 2000+
  const ranges = [
    { label: '< 1000', min: 0, max: 999, count: 0, color: '#9ca3af' },
    { label: '1000–1199', min: 1000, max: 1199, count: 0, color: '#22c55e' },
    { label: '1200–1399', min: 1200, max: 1399, count: 0, color: '#06b6d4' },
    { label: '1400–1599', min: 1400, max: 1599, count: 0, color: '#3b82f6' },
    { label: '1600–1799', min: 1600, max: 1799, count: 0, color: '#8b5cf6' },
    { label: '1800–1999', min: 1800, max: 1999, count: 0, color: '#f97316' },
    { label: '2000+', min: 2000, max: 99999, count: 0, color: '#ef4444' },
  ];

  for (const [rStr, count] of Object.entries(ratingBuckets)) {
    const r = Number(rStr);
    for (const range of ranges) {
      if (r >= range.min && r <= range.max) {
        range.count += count;
        break;
      }
    }
  }

  const byDifficulty = Object.entries(ratingBuckets)
    .map(([rating, count]) => ({ rating: Number(rating), count }))
    .sort((a, b) => a.rating - b.rating);

  const recentSubmissions = submissions.slice(0, 25).map((s) => ({
    id: s.id,
    contestId: s.contestId,
    problemIndex: s.problem?.index || '',
    problemName: s.problem?.name || 'Problem',
    problemRating: s.problem?.rating,
    verdict: s.verdict,
    language: s.programmingLanguage,
    timeConsumedMillis: s.timeConsumedMillis,
    memoryConsumedBytes: s.memoryConsumedBytes,
    submittedAt: s.creationTimeSeconds ? new Date(s.creationTimeSeconds * 1000).toISOString() : null,
  }));

  const totalSubmissions = submissions.length;
  const acceptanceRate = totalSubmissions > 0 ? ((acceptedSubmissions / totalSubmissions) * 100).toFixed(1) : 0;

  return {
    codeforcesId: user.handle,
    profile: {
      handle: user.handle,
      avatar: user.avatar || user.titlePhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.handle}`,
      rating: currentRating,
      maxRating,
      rank: formatRankName(user.rank),
      maxRank: formatRankName(user.maxRank),
      organization: user.organization || null,
      country: user.country || null,
      profileUrl: `https://codeforces.com/profile/${user.handle}`,
    },
    ratingHistory,
    contestsCount: ratingHistory.length,
    latestContest,
    problemStats: {
      totalSolved: solvedProblems.size,
      totalSubmissions,
      acceptedSubmissions,
      acceptanceRate,
      byDifficulty,
      ranges,
    },
    recentSubmissions,
    dailyActivity,
  };
}

function normalizeBackendResult(backendResult, handle) {
  const profile = backendResult.profile || {};
  const history = Array.isArray(backendResult.ratingHistory) ? backendResult.ratingHistory : [];

  const ratingHistory = history.map((c, index) => {
    const dateObj = c.at ? new Date(c.at) : new Date();
    return {
      contestId: c.contestId,
      contestName: c.contestName || `Contest #${c.contestId}`,
      rank: c.rank,
      ratingBefore: c.ratingBefore || 0,
      ratingAfter: c.ratingAfter || 0,
      ratingChange: c.ratingChange || (c.ratingAfter - c.ratingBefore),
      date: dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      timestamp: dateObj.getTime(),
      contestNumber: index + 1,
    };
  });

  const currentRating = backendResult.currentRating || profile.rating || 0;
  const maxRating = backendResult.maxRating || profile.maxRating || currentRating;
  const latestContest = ratingHistory.length > 0 ? ratingHistory[ratingHistory.length - 1] : null;

  return {
    codeforcesId: backendResult.handle || handle,
    profile: {
      handle: backendResult.handle || handle,
      avatar: profile.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${handle}`,
      rating: currentRating,
      maxRating,
      rank: formatRankName(profile.rank),
      maxRank: formatRankName(profile.maxRank),
      organization: profile.organization || null,
      country: profile.country || null,
      profileUrl: `https://codeforces.com/profile/${backendResult.handle || handle}`,
    },
    ratingHistory,
    contestsCount: ratingHistory.length,
    latestContest,
    problemStats: backendResult.problemStats || {
      totalSolved: 0,
      totalSubmissions: 0,
      acceptedSubmissions: 0,
      acceptanceRate: 0,
      byDifficulty: [],
      ranges: [],
    },
    recentSubmissions: backendResult.recentSubmissions || [],
    dailyActivity: backendResult.dailyActivity || {},
  };
}
