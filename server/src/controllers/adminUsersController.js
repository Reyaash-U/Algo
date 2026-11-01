import { ok } from '../utils/apiResponse.js';
import { asyncHandler, ApiError } from '../utils/apiError.js';
import { prisma } from '../config/db.js';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

/**
 * GET /admin/users — paginated list of all users with per-user progress stats.
 *
 * Admin-only. Each row aggregates the data an admin needs at a glance: counts of
 * notes, sheets and revisions, current streak, connected platform handles, when
 * they last reviewed something, and how many submissions they've made this week.
 *
 * We deliberately return aggregated numbers (not raw notes/revisions) so a large
 * users table stays cheap to render and does not leak content.
 *
 * Query params:
 *   q      — case-insensitive search over email + displayName
 *   page   — 1-indexed page number (default 1)
 *   limit  — rows per page (default 25, max 100)
 *   sort   — "recent" (default, by streakLastActiveDate desc then createdAt desc) |
 *            "newest" (createdAt desc) | "name" (displayName asc)
 */
export const listUsersWithProgress = asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE));
  const sortKey = ['recent', 'newest', 'name'].includes(req.query.sort) ? req.query.sort : 'recent';

  const where = q
    ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }] }
    : {};
  const orderBy = {
    recent: [{ streakLastActiveDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    newest: { createdAt: 'desc' },
    name: { displayName: 'asc' },
  }[sortKey];

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, email: true, displayName: true, role: true, avatarUrl: true,
        createdAt: true, emailVerified: true,
        cfHandle: true, lcHandle: true, ccHandle: true,
        streakCurrent: true, streakLongest: true, streakLastActiveDate: true,
        cfStats: { select: { currentRating: true, maxRating: true } },
        lcStats: { select: { solved: true, contest: true } },
        ccStats: { select: { rating: true, stars: true } },
        _count: { select: { notes: { where: { deletedAt: null } }, sheets: { where: { deletedAt: null } }, revisions: true } },
      },
    }),
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const [reviewed, submitted7d] = await Promise.all([
    prisma.revision.groupBy({ by: ['userId'], where: { userId: { in: users.map((u) => u.id) } }, _max: { lastReviewedAt: true } }),
    prisma.submission.groupBy({ by: ['userId'], where: { userId: { in: users.map((u) => u.id) }, submittedAt: { gte: sevenDaysAgo } }, _count: { _all: true } }),
  ]);
  const lastReviewByUser = new Map(reviewed.map((r) => [r.userId, r._max.lastReviewedAt]));
  const submits7dByUser = new Map(submitted7d.map((r) => [r.userId, r._count._all]));

  const items = users.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    avatarUrl: u.avatarUrl ?? null,
    emailVerified: !!u.emailVerified,
    joinedAt: u.createdAt.toISOString(),
    streakCurrent: u.streakCurrent,
    streakLongest: u.streakLongest,
    lastActiveAt: u.streakLastActiveDate?.toISOString() ?? null,
    lastReviewAt: lastReviewByUser.get(u.id)?.toISOString() ?? null,
    noteCount: u._count.notes,
    sheetCount: u._count.sheets,
    revisionCount: u._count.revisions,
    submissions7d: submits7dByUser.get(u.id) ?? 0,
    platforms: {
      codeforces: u.cfHandle ? { handle: u.cfHandle, currentRating: u.cfStats?.currentRating ?? null, maxRating: u.cfStats?.maxRating ?? null } : null,
      leetcode: u.lcHandle ? { handle: u.lcHandle, solved: u.lcStats?.solved ?? null, contestRating: u.lcStats?.contest?.rating ?? null } : null,
      codechef: u.ccHandle ? { handle: u.ccHandle, rating: u.ccStats?.rating ?? null, stars: u.ccStats?.stars ?? 0 } : null,
    },
  }));

  res.status(200).json(ok({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }));
});

/**
 * GET /admin/users/:id — one user's detailed activity.
 *
 * Admin-only. Returns the summary from the list PLUS the user's 10 most recent
 * notes (titles only, not content) and 10 most recent reviews. No note content,
 * no code, no private material — admins see what each user is doing, not what
 * they wrote.
 */
export const getUserProgress = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, email: true, displayName: true, role: true, avatarUrl: true, bio: true,
      createdAt: true, emailVerified: true,
      cfHandle: true, lcHandle: true, ccHandle: true,
      streakCurrent: true, streakLongest: true, streakLastActiveDate: true,
      cfStats: { select: { currentRating: true, maxRating: true, syncedAt: true } },
      lcStats: { select: { solved: true, totals: true, contest: true, syncedAt: true } },
      ccStats: { select: { rating: true, highestRating: true, stars: true, totalSolved: true, syncedAt: true } },
      _count: { select: { notes: { where: { deletedAt: null } }, sheets: { where: { deletedAt: null } }, revisions: true } },
    },
  });
  if (!user) throw ApiError.notFound('User not found');

  const [recentNotes, recentReviews, dueCount] = await Promise.all([
    prisma.note.findMany({
      where: { ownerId: user.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { id: true, title: true, patternTags: true, visibility: true, updatedAt: true, createdAt: true },
    }),
    prisma.revision.findMany({
      where: { userId: user.id, lastReviewedAt: { not: null } },
      orderBy: { lastReviewedAt: 'desc' },
      take: 10,
      select: { id: true, lastReviewedAt: true, intervalDays: true, easeFactor: true, note: { select: { title: true } } },
    }),
    prisma.revision.count({ where: { userId: user.id, nextReviewAt: { lte: new Date() }, note: { deletedAt: null } } }),
  ]);

  res.status(200).json(ok({
    user: {
      id: user.id, email: user.email, displayName: user.displayName, role: user.role,
      avatarUrl: user.avatarUrl ?? null, bio: user.bio ?? '',
      emailVerified: !!user.emailVerified, joinedAt: user.createdAt.toISOString(),
    },
    streak: {
      current: user.streakCurrent, longest: user.streakLongest,
      lastActiveAt: user.streakLastActiveDate?.toISOString() ?? null,
    },
    counts: {
      notes: user._count.notes,
      sheets: user._count.sheets,
      revisions: user._count.revisions,
      dueNow: dueCount,
    },
    platforms: {
      codeforces: user.cfHandle ? { handle: user.cfHandle, ...user.cfStats, syncedAt: user.cfStats?.syncedAt?.toISOString() ?? null } : null,
      leetcode: user.lcHandle ? { handle: user.lcHandle, ...user.lcStats, syncedAt: user.lcStats?.syncedAt?.toISOString() ?? null } : null,
      codechef: user.ccHandle ? { handle: user.ccHandle, ...user.ccStats, syncedAt: user.ccStats?.syncedAt?.toISOString() ?? null } : null,
    },
    recentNotes: recentNotes.map((n) => ({ ...n, updatedAt: n.updatedAt.toISOString(), createdAt: n.createdAt.toISOString() })),
    recentReviews: recentReviews.map((r) => ({
      id: r.id,
      noteTitle: r.note?.title ?? 'Deleted note',
      reviewedAt: r.lastReviewedAt?.toISOString() ?? null,
      intervalDays: r.intervalDays,
      easeFactor: r.easeFactor,
    })),
  }));
});
