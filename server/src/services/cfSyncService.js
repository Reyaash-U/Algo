import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';

// BACKEND DEV: call Codeforces public API (user.rating, user.status),
// aggregate solvedByTag, upsert CfStats. Free official API, no key needed.
export async function syncCodeforces(userId, handle) {
  const normalizedHandle = normalizeHandle(handle);

  const [ratingPayload, statusPayload] = await Promise.all([
    fetchCodeforcesJson(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(normalizedHandle)}`),
    fetchCodeforcesJson(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(normalizedHandle)}`),
  ]);

  if (ratingPayload.status === 'FAILED' || statusPayload.status === 'FAILED') {
    throw ApiError.badRequest('Invalid Codeforces handle');
  }

  const ratingRows = Array.isArray(ratingPayload.result) ? ratingPayload.result : null;
  const submissionRows = Array.isArray(statusPayload.result) ? statusPayload.result : null;
  if (!ratingRows || !submissionRows) {
    throw ApiError.badRequest('Unexpected response from Codeforces');
  }

  const ratingHistory = ratingRows.map((entry) => ({
    contestId: entry.contestId,
    ratingAfter: entry.newRating,
    at: new Date(entry.ratingUpdateTimeSeconds * 1000).toISOString(),
  }));

  const currentRating = ratingRows.length > 0 ? Number(ratingRows[ratingRows.length - 1].newRating) || 0 : 0;
  const maxRating =
    ratingRows.length > 0 ? Math.max(...ratingRows.map((entry) => Number(entry.newRating) || 0)) : 0;

  const solvedByTag = buildSolvedByTag(submissionRows);

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

  return cfStats;
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
