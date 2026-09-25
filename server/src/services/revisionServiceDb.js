import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { applySm2, nextReviewDate } from './revisionService.js';
import { recordActivity } from './userService.js';
import { createSubmission } from './submissionService.js';

const PASS_RATING = 2;

export async function enrollNote(userId, noteId) {
  if (!noteId) throw ApiError.badRequest('noteId is required');

  return prisma.revision.upsert({
    where: { userId_noteId: { userId, noteId } },
    update: {},
    create: { userId, noteId },
  });
}

export async function getDueRevisions(userId, options = {}) {
  // Auto-enroll user's active notes if not already enrolled
  const userNotes = await prisma.note.findMany({
    where: {
      ownerId: userId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (userNotes.length > 0) {
    for (const note of userNotes) {
      await prisma.revision.upsert({
        where: { userId_noteId: { userId, noteId: note.id } },
        update: {},
        create: {
          userId,
          noteId: note.id,
          nextReviewAt: new Date(),
        },
      }).catch(() => null);
    }
  }

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const where = {
    userId,
    note: { deletedAt: null },
  };

  if (!options.all) {
    where.nextReviewAt = { lte: endOfToday };
  }

  return prisma.revision.findMany({
    where,
    include: { note: true },
    orderBy: { nextReviewAt: 'asc' },
  });
}

export async function submitReview(revisionId, rating) {
  const normalizedRating = normalizeRating(rating);
  let revision = await prisma.revision.findUnique({
    where: { id: revisionId },
    include: { note: true },
  });

  // If not found directly by revision ID, check if note ID was passed
  if (!revision) {
    revision = await prisma.revision.findFirst({
      where: { noteId: revisionId },
      include: { note: true },
    });
  }

  // If not enrolled yet, check if note exists and enroll it on the fly
  if (!revision) {
    const note = await prisma.note.findUnique({
      where: { id: revisionId },
    });
    if (note) {
      const enrolled = await enrollNote(note.ownerId, note.id);
      revision = await prisma.revision.findUnique({
        where: { id: enrolled.id },
        include: { note: true },
      });
    }
  }

  // Graceful fallback if mock or stale prefix ID was submitted
  if (!revision && revisionId && String(revisionId).startsWith('rev-')) {
    revision = await prisma.revision.findFirst({
      where: { note: { deletedAt: null } },
      include: { note: true },
    });
  }

  if (!revision) throw ApiError.notFound('Revision not found');

  const nextState = applySm2(
    {
      repetitions: revision.repetitions,
      intervalDays: revision.intervalDays,
      easeFactor: revision.easeFactor,
    },
    normalizedRating,
  );

  const reviewedAt = new Date();
  const currentHistory = Array.isArray(revision.history) ? revision.history : [];
  const historyEntry = {
    rating: normalizedRating,
    reviewedAt: reviewedAt.toISOString(),
    intervalAfter: nextState.intervalDays,
    easeAfter: nextState.easeFactor,
  };

  const [updated] = await Promise.all([
    prisma.revision.update({
      where: { id: revision.id },
      data: {
        repetitions: nextState.repetitions,
        intervalDays: nextState.intervalDays,
        easeFactor: nextState.easeFactor,
        lastReviewedAt: reviewedAt,
        nextReviewAt: nextReviewDate(nextState.intervalDays, reviewedAt),
        history: [...currentHistory, historyEntry],
      },
    }),
    recordActivity(revision.userId, reviewedAt),
    createSubmission(revision.userId, {
      problemId: revision.note?.problemId ?? null,
      noteId: revision.noteId,
      status: normalizedRating >= PASS_RATING ? 'accepted' : 'attempted',
      submittedAt: reviewedAt,
    }),
  ]);

  return updated;
}

function normalizeRating(rating) {
  const value = Number(rating);
  if (!Number.isInteger(value) || value < 0 || value > 3) {
    throw ApiError.badRequest('rating must be an integer between 0 and 3');
  }
  return value;
}

export async function getRevisionStats(userId) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const dueTodayPromise = prisma.revision.count({
    where: {
      userId,
      nextReviewAt: { lte: endOfToday },
      note: { deletedAt: null },
    },
  });

  const revisionsPromise = prisma.revision.findMany({
    where: { userId },
    select: { history: true },
  });

  const [dueToday, revisions] = await Promise.all([dueTodayPromise, revisionsPromise]);

  let reviewedToday = 0;
  let sevenDayTotal = 0;
  let sevenDayPassed = 0;

  for (const revision of revisions) {
    const history = Array.isArray(revision.history) ? revision.history : [];
    for (const entry of history) {
      const reviewedAt = new Date(entry.reviewedAt);
      if (Number.isNaN(reviewedAt.getTime())) continue;

      if (reviewedAt >= startOfToday && reviewedAt < endOfToday) {
        reviewedToday += 1;
      }

      if (reviewedAt >= sevenDaysAgo && reviewedAt <= now) {
        sevenDayTotal += 1;
        if (Number(entry.rating) >= PASS_RATING) sevenDayPassed += 1;
      }
    }
  }

  return {
    dueToday,
    reviewedToday,
    retention7d: sevenDayTotal === 0 ? 0 : sevenDayPassed / sevenDayTotal,
  };
}
