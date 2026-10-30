import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';

// LeetCode has no official API; this uses the same public GraphQL endpoint the
// website itself calls for profile pages (no key needed, public profiles only).
const GRAPHQL_URL = 'https://leetcode.com/graphql';
const USERNAME_RE = /^[A-Za-z0-9_-]{1,40}$/;
const MAX_TOPICS = 15;
const MAX_RECENT = 15;

const PROFILE_QUERY = `
query lcProfile($u: String!) {
  matchedUser(username: $u) {
    username
    profile { ranking userAvatar realName countryName }
    submitStats: submitStatsGlobal { acSubmissionNum { difficulty count } }
    badges { displayName icon }
    submissionCalendar
    tagProblemCounts {
      advanced { tagName problemsSolved }
      intermediate { tagName problemsSolved }
      fundamental { tagName problemsSolved }
    }
  }
  allQuestionsCount { difficulty count }
  userContestRanking(username: $u) { attendedContestsCount rating globalRanking topPercentage badge { name } }
  userContestRankingHistory(username: $u) { attended rating ranking contest { title startTime } }
  recentAcSubmissionList(username: $u, limit: ${MAX_RECENT}) { id title titleSlug timestamp }
}`;

export function normalizeLeetCodeUsername(username) {
  const value = typeof username === 'string' ? username.trim() : '';
  if (!value) throw ApiError.badRequest('LeetCode username is required');
  if (!USERNAME_RE.test(value)) throw ApiError.badRequest('That is not a valid LeetCode username');
  return value;
}

export async function fetchLeetCode(username, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com', 'User-Agent': 'AlgoVault/1.0' },
      body: JSON.stringify({ query: PROFILE_QUERY, variables: { u: username } }),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw ApiError.badRequest('Unable to reach LeetCode right now');
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw ApiError.badRequest('Unexpected response from LeetCode');
  }
  // LeetCode reports an unknown user as a GraphQL error with matchedUser null.
  if (!payload?.data?.matchedUser) throw ApiError.badRequest('User not found on LeetCode');
  return payload.data;
}

const toInt = (n) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : 0);

function countsByDifficulty(rows = [], key = 'count') {
  const pick = (name) => toInt(rows.find((r) => r.difficulty === name)?.[key]);
  return { easy: pick('Easy'), medium: pick('Medium'), hard: pick('Hard'), total: pick('All') };
}

// LeetCode's calendar is a JSON string {"<unix seconds at UTC midnight>": count}.
function parseCalendar(raw) {
  let obj = {};
  try {
    obj = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
  } catch {
    obj = {};
  }
  const out = {};
  for (const [ts, count] of Object.entries(obj)) {
    const day = new Date(Number(ts) * 1000).toISOString().slice(0, 10);
    out[day] = (out[day] ?? 0) + toInt(count);
  }
  return out;
}

const absoluteUrl = (u) => (u && u.startsWith('/') ? `https://leetcode.com${u}` : u || null);

// Pure: GraphQL `data` -> the fields stored in lc_stats. Tested without network.
export function parseLeetCodeData(data) {
  const user = data.matchedUser;
  const tagGroups = user.tagProblemCounts || {};
  const topics = [...(tagGroups.fundamental || []), ...(tagGroups.intermediate || []), ...(tagGroups.advanced || [])]
    .filter((t) => t.problemsSolved > 0)
    .map((t) => ({ tag: t.tagName, solved: toInt(t.problemsSolved) }))
    .sort((a, b) => b.solved - a.solved)
    .slice(0, MAX_TOPICS);

  const ranking = data.userContestRanking;
  const contest = ranking
    ? {
        rating: Math.round(Number(ranking.rating) || 0),
        globalRanking: toInt(ranking.globalRanking),
        attended: toInt(ranking.attendedContestsCount),
        topPercentage: Number(ranking.topPercentage) || null,
        badge: ranking.badge?.name || null,
      }
    : null;

  const contestHistory = (data.userContestRankingHistory || [])
    .filter((c) => c?.attended && c.contest)
    .map((c) => ({
      title: c.contest.title,
      rating: Math.round(Number(c.rating) || 0),
      ranking: toInt(c.ranking),
      at: new Date(Number(c.contest.startTime) * 1000).toISOString(),
    }));

  const recent = (data.recentAcSubmissionList || []).slice(0, MAX_RECENT).map((s) => ({
    id: String(s.id),
    title: s.title,
    slug: s.titleSlug,
    url: `https://leetcode.com/problems/${s.titleSlug}/`,
    at: new Date(Number(s.timestamp) * 1000).toISOString(),
  }));

  return {
    handle: user.username,
    ranking: toInt(user.profile?.ranking),
    solved: countsByDifficulty(user.submitStats?.acSubmissionNum),
    totals: countsByDifficulty(data.allQuestionsCount),
    contest,
    contestHistory,
    topics,
    calendar: parseCalendar(user.submissionCalendar),
    recent,
    badges: (user.badges || []).map((b) => ({ name: b.displayName, icon: absoluteUrl(b.icon) })),
    profile: {
      avatar: user.profile?.userAvatar || null,
      realName: user.profile?.realName || null,
      country: user.profile?.countryName || null,
    },
  };
}

export async function syncLeetCode(userId, username, fetchImpl) {
  const normalized = normalizeLeetCodeUsername(username);
  const stats = parseLeetCodeData(await fetchLeetCode(normalized, fetchImpl));
  const syncedAt = new Date();

  const row = await prisma.lcStats.upsert({
    where: { userId },
    create: { userId, ...stats, syncedAt },
    update: { ...stats, syncedAt },
  });
  await prisma.user.updateMany({
    where: { id: userId, OR: [{ lcHandle: null }, { NOT: { lcHandle: stats.handle } }] },
    data: { lcHandle: stats.handle },
  });
  return row;
}

export async function disconnectLeetCode(userId) {
  await prisma.lcStats.deleteMany({ where: { userId } });
  await prisma.user.update({ where: { id: userId }, data: { lcHandle: null } });
}
