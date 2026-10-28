import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';

// BACKEND DEV: call Codeforces public API (user.rating, user.status),
// aggregate solvedByTag, upsert CfStats. Free official API, no key needed.
export async function syncCodeforces(userId, handle) {
  const normalizedHandle = normalizeHandle(handle);

  const [infoPayload, ratingPayload, statusPayload] = await Promise.all([
    fetchCodeforcesJson(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(normalizedHandle)}`),
    fetchCodeforcesJson(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(normalizedHandle)}`),
    fetchCodeforcesJson(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(normalizedHandle)}&from=1&count=500`),
  ]);

  if (infoPayload.status === 'FAILED') {
    throw ApiError.badRequest('Invalid Codeforces handle');
  }

  const userInfo = Array.isArray(infoPayload.result) && infoPayload.result[0] ? infoPayload.result[0] : null;
  if (!userInfo) {
    throw ApiError.badRequest('User not found on Codeforces');
  }

  const ratingRows = Array.isArray(ratingPayload.result) ? ratingPayload.result : [];
  const submissionRows = Array.isArray(statusPayload.result) ? statusPayload.result : [];

  const ratingHistory = ratingRows.map((entry) => ({
    contestId: entry.contestId,
    contestName: entry.contestName || `Contest #${entry.contestId}`,
    rank: entry.rank,
    ratingBefore: entry.oldRating,
    ratingAfter: entry.newRating,
    ratingChange: entry.newRating - entry.oldRating,
    at: new Date(entry.ratingUpdateTimeSeconds * 1000).toISOString(),
  }));

  const currentRating = userInfo.rating ?? (ratingRows.length > 0 ? Number(ratingRows[ratingRows.length - 1].newRating) || 0 : 0);
  const maxRating = userInfo.maxRating ?? (ratingRows.length > 0 ? Math.max(...ratingRows.map((entry) => Number(entry.newRating) || 0)) : 0);

  const solvedByTag = buildSolvedByTag(submissionRows);
  const problemStats = buildProblemStats(submissionRows);
  const recentSubmissions = buildRecentSubmissions(submissionRows);
  const dailyActivity = buildDailyActivity(submissionRows);

  const cfStats = await prisma.cfStats.upsert({
    where: { userId },
    create: {
      userId,
      handle: normalizedHandle,
      currentRating,
      maxRating,
      ratingHistory,
      solvedByTag,
      syncedAt: new Date(),
    },
    update: {
      handle: normalizedHandle,
      currentRating,
      maxRating,
      ratingHistory,
      solvedByTag,
      syncedAt: new Date(),
    },
  });

  await prisma.user.updateMany({
    where: { id: userId, NOT: { cfHandle: normalizedHandle } },
    data: { cfHandle: normalizedHandle },
  });

  return {
    ...cfStats,
    profile: {
      handle: userInfo.handle,
      avatar: userInfo.avatar || userInfo.titlePhoto,
      rank: userInfo.rank || 'unrated',
      maxRank: userInfo.maxRank || 'unrated',
      rating: currentRating,
      maxRating: maxRating,
      contribution: userInfo.contribution,
      organization: userInfo.organization,
    },
    problemStats,
    recentSubmissions,
    dailyActivity,
  };
}

function normalizeHandle(handle) {
  if (typeof handle !== 'string' || handle.trim() === '') {
    throw ApiError.badRequest('Codeforces handle is required');
  }
  return handle.trim();
}

async function fetchCodeforcesJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw ApiError.badRequest('Unable to reach Codeforces right now');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw ApiError.badRequest('Unexpected response from Codeforces');
  }

  if (!response.ok) {
    throw ApiError.badRequest('Codeforces API request failed');
  }
  return payload;
}

function buildSolvedByTag(submissions) {
  const solvedProblems = new Set();
  const tagCounts = new Map();

  for (const submission of submissions) {
    if (submission.verdict !== 'OK' || !submission.problem) continue;
    const problem = submission.problem;
    const key = `${problem.contestId ?? 'na'}:${problem.index ?? 'na'}:${problem.name ?? 'na'}`;
    if (solvedProblems.has(key)) continue;
    solvedProblems.add(key);

    const tags = Array.isArray(problem.tags) ? problem.tags : [];
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return [...tagCounts.entries()]
    .map(([tag, solved]) => ({ tag, solved }))
    .sort((a, b) => b.solved - a.solved || a.tag.localeCompare(b.tag));
}

function buildProblemStats(submissions) {
  const solvedProblems = new Set();
  const ratingBuckets = {}; // e.g. 800: count, 900: count
  let acceptedSubmissions = 0;
  const totalSubmissions = submissions.length;

  for (const submission of submissions) {
    const isOk = submission.verdict === 'OK';
    if (isOk) acceptedSubmissions += 1;

    if (!isOk || !submission.problem) continue;
    const problem = submission.problem;
    const key = `${problem.contestId ?? 'na'}:${problem.index ?? 'na'}:${problem.name ?? 'na'}`;
    if (solvedProblems.has(key)) continue;
    solvedProblems.add(key);

    if (typeof problem.rating === 'number' && problem.rating > 0) {
      ratingBuckets[problem.rating] = (ratingBuckets[problem.rating] || 0) + 1;
    }
  }

  // Distribution ranges: < 1000, 1000–1199, 1200–1399, 1400–1599, 1600–1799, 1800–1999, 2000+
  const ranges = [
    { label: '< 1000', min: 0, max: 999, count: 0 },
    { label: '1000–1199', min: 1000, max: 1199, count: 0 },
    { label: '1200–1399', min: 1200, max: 1399, count: 0 },
    { label: '1400–1599', min: 1400, max: 1599, count: 0 },
    { label: '1600–1799', min: 1600, max: 1799, count: 0 },
    { label: '1800–1999', min: 1800, max: 1999, count: 0 },
    { label: '2000+', min: 2000, max: 99999, count: 0 },
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

  // Sorted list of specific difficulties: [ { rating: 800, count: 120 }, ... ]
  const byDifficulty = Object.entries(ratingBuckets)
    .map(([rating, count]) => ({ rating: Number(rating), count }))
    .sort((a, b) => a.rating - b.rating);

  return {
    totalSolved: solvedProblems.size,
    totalSubmissions,
    acceptedSubmissions,
    acceptanceRate: totalSubmissions > 0 ? ((acceptedSubmissions / totalSubmissions) * 100).toFixed(1) : 0,
    byDifficulty,
    ranges,
  };
}

function buildRecentSubmissions(submissions) {
  return submissions.slice(0, 30).map((s) => ({
    id: s.id,
    contestId: s.contestId,
    problemIndex: s.problem?.index || '',
    problemName: s.problem?.name || 'Unknown Problem',
    problemRating: s.problem?.rating,
    verdict: s.verdict,
    language: s.programmingLanguage,
    timeConsumedMillis: s.timeConsumedMillis,
    memoryConsumedBytes: s.memoryConsumedBytes,
    submittedAt: new Date(s.creationTimeSeconds * 1000).toISOString(),
  }));
}

function buildDailyActivity(submissions) {
  const activityMap = {};
  for (const s of submissions) {
    if (!s.creationTimeSeconds) continue;
    const dateStr = new Date(s.creationTimeSeconds * 1000).toISOString().slice(0, 10);
    activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
  }
  return activityMap;
}
