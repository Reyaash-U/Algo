import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/db.js';
import { parseLeetCodeData, normalizeLeetCodeUsername, syncLeetCode, disconnectLeetCode } from '../services/leetcodeSyncService.js';

const sample = {
  matchedUser: {
    username: 'someone',
    profile: { ranking: 102875, userAvatar: 'https://a/x.png', realName: 'Some One', countryName: 'India' },
    submitStats: {
      acSubmissionNum: [
        { difficulty: 'All', count: 692 },
        { difficulty: 'Easy', count: 127 },
        { difficulty: 'Medium', count: 414 },
        { difficulty: 'Hard', count: 151 },
      ],
    },
    badges: [{ displayName: 'Guardian', icon: '/static/images/badges/guardian.png' }, { displayName: '365', icon: 'https://x/365.png' }],
    submissionCalendar: '{"1767398400": 3, "1767484800": 2, "1767500000": 4}',
    tagProblemCounts: {
      fundamental: [{ tagName: 'Array', problemsSolved: 50 }, { tagName: 'Unused', problemsSolved: 0 }],
      intermediate: [{ tagName: 'Dynamic Programming', problemsSolved: 70 }],
      advanced: [{ tagName: 'Segment Tree', problemsSolved: 5 }],
    },
  },
  allQuestionsCount: [
    { difficulty: 'All', count: 3650 }, { difficulty: 'Easy', count: 900 },
    { difficulty: 'Medium', count: 1900 }, { difficulty: 'Hard', count: 850 },
  ],
  userContestRanking: { attendedContestsCount: 3, rating: 1650.4, globalRanking: 50000, topPercentage: 12.5, badge: { name: 'Knight' } },
  userContestRankingHistory: [
    { attended: true, rating: 1500.2, ranking: 4000, contest: { title: 'Weekly 1', startTime: 1767398400 } },
    { attended: false, rating: 1500, ranking: 0, contest: { title: 'Weekly 2', startTime: 1767998400 } },
    { attended: true, rating: 1650.4, ranking: 2000, contest: { title: 'Weekly 3', startTime: 1768598400 } },
  ],
  recentAcSubmissionList: [{ id: '9', title: 'Two Sum', titleSlug: 'two-sum', timestamp: '1767398400' }],
};

test('parseLeetCodeData maps the GraphQL payload to stored stats', () => {
  const s = parseLeetCodeData(sample);
  assert.equal(s.handle, 'someone');
  assert.equal(s.ranking, 102875);
  assert.deepEqual(s.solved, { easy: 127, medium: 414, hard: 151, total: 692 });
  assert.deepEqual(s.totals, { easy: 900, medium: 1900, hard: 850, total: 3650 });
  assert.deepEqual(s.contest, { rating: 1650, globalRanking: 50000, attended: 3, topPercentage: 12.5, badge: 'Knight' });
  assert.equal(s.contestHistory.length, 2); // un-attended contest dropped
  assert.equal(s.contestHistory[0].rating, 1500);
  assert.deepEqual(s.topics.map((t) => t.tag), ['Dynamic Programming', 'Array', 'Segment Tree']); // sorted, zero-count dropped
  assert.equal(s.recent[0].url, 'https://leetcode.com/problems/two-sum/');
  assert.equal(s.badges[0].icon, 'https://leetcode.com/static/images/badges/guardian.png');
  assert.equal(s.profile.country, 'India');
});

test('calendar converts unix days to dates and sums the same day', () => {
  const s = parseLeetCodeData(sample);
  assert.equal(s.calendar['2026-01-03'], 3);
  assert.equal(s.calendar['2026-01-04'], 6); // 2 + 4 fall on the same UTC day
});

test('a user with no contests has contest = null and an empty history', () => {
  const s = parseLeetCodeData({ ...sample, userContestRanking: null, userContestRankingHistory: null });
  assert.equal(s.contest, null);
  assert.deepEqual(s.contestHistory, []);
});

test('normalizeLeetCodeUsername validates input', () => {
  assert.equal(normalizeLeetCodeUsername('  lee215 '), 'lee215');
  assert.throws(() => normalizeLeetCodeUsername(''), /required/);
  assert.throws(() => normalizeLeetCodeUsername('bad name!'), /valid LeetCode username/);
  assert.throws(() => normalizeLeetCodeUsername('a'.repeat(41)), /valid LeetCode username/);
});

const fakeFetch = (body) => async () => ({ json: async () => body });

test('syncLeetCode stores stats, links the username, re-syncs in place, and disconnects', async () => {
  let userId;
  try {
    const user = await prisma.user.create({
      data: { email: `lc-test-${Date.now()}@example.com`, passwordHash: 'x', displayName: 'LC Test' },
    });
    userId = user.id;

    const row = await syncLeetCode(userId, 'someone', fakeFetch({ data: sample }));
    assert.equal(row.handle, 'someone');
    assert.deepEqual(row.solved, { easy: 127, medium: 414, hard: 151, total: 692 });
    assert.equal((await prisma.user.findUnique({ where: { id: userId } })).lcHandle, 'someone');

    // Re-sync updates the same row (one per user).
    const changed = { ...sample, matchedUser: { ...sample.matchedUser, profile: { ...sample.matchedUser.profile, ranking: 5 } } };
    await syncLeetCode(userId, 'someone', fakeFetch({ data: changed }));
    assert.equal(await prisma.lcStats.count({ where: { userId } }), 1);
    assert.equal((await prisma.lcStats.findUnique({ where: { userId } })).ranking, 5);

    await disconnectLeetCode(userId);
    assert.equal(await prisma.lcStats.count({ where: { userId } }), 0);
    assert.equal((await prisma.user.findUnique({ where: { id: userId } })).lcHandle, null);
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  }
});

test('syncLeetCode rejects an unknown LeetCode user without writing anything', async () => {
  await assert.rejects(
    () => syncLeetCode('00000000-0000-0000-0000-000000000000', 'nobody', fakeFetch({ data: { matchedUser: null }, errors: [{}] })),
    /User not found on LeetCode/,
  );
});
