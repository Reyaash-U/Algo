import { prisma } from '../config/db.js';
import { DIFFICULTY } from '@algovault/shared';

const STALE_AFTER_DAYS = 14;
const DAY_MS = 86400000;

async function getPatternCounts(userId) {
  const rows = await prisma.$queryRaw`
    SELECT tag, COUNT(*)::int as count, AVG(confidence)::float as "avgConfidence", MAX("updatedAt") as "lastPracticed"
    FROM notes, unnest("patternTags") as tag
    WHERE "ownerId" = ${userId} AND "deletedAt" IS NULL
    GROUP BY tag
  `;

  const now = Date.now();
  return rows.map((row) => ({
    tag: row.tag,
    count: row.count,
    avgConfidence: Math.round(row.avgConfidence * 10) / 10,
    daysSinceLastPracticed: Math.floor((now - new Date(row.lastPracticed).getTime()) / DAY_MS),
  }));
}

async function getDifficultyDistribution(userId) {
  const notes = await prisma.note.findMany({
    where: { ownerId: userId, deletedAt: null, problemId: { not: null } },
    select: { problem: { select: { difficulty: true } } },
  });

  const distribution = { easy: 0, medium: 0, hard: 0 };
  for (const note of notes) {
    const difficulty = note.problem?.difficulty;
    if (difficulty === DIFFICULTY.EASY || difficulty === DIFFICULTY.MEDIUM || difficulty === DIFFICULTY.HARD) {
      distribution[difficulty] += 1;
    }
  }
  return distribution;
}

async function getStreak(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakCurrent: true, streakLongest: true, streakLastActiveDate: true },
  });

  return {
    current: user?.streakCurrent ?? 0,
    longest: user?.streakLongest ?? 0,
    lastActiveDate: user?.streakLastActiveDate ? user.streakLastActiveDate.toISOString() : null,
  };
}

export async function buildDashboardSummary(userId) {
  const [patternCounts, difficultyDistribution, streak] = await Promise.all([
    getPatternCounts(userId),
    getDifficultyDistribution(userId),
    getStreak(userId),
  ]);

  const stalenessAlerts = patternCounts
    .filter((p) => p.daysSinceLastPracticed > STALE_AFTER_DAYS)
    .map((p) => ({ tag: p.tag, daysSinceLastPracticed: p.daysSinceLastPracticed, confidence: p.avgConfidence }));

  return { patternCounts, difficultyDistribution, streak, stalenessAlerts };
}
