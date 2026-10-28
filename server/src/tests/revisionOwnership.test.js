import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/db.js';
import { submitReview } from '../services/revisionServiceDb.js';

// Regression test for the ownership bug: submitReview used to trust the
// revisionId alone, so any logged-in user could rate (and reschedule)
// another user's revision just by guessing/enumerating IDs.

const fakeRevision = {
  id: 'rev-1',
  userId: 'owner-1',
  noteId: 'note-1',
  repetitions: 0,
  intervalDays: 0,
  easeFactor: 2.5,
  history: [],
};

test('submitReview rejects a review for a revision owned by another user', async () => {
  const originalFind = prisma.revision.findUnique;
  prisma.revision.findUnique = async () => fakeRevision;
  try {
    await assert.rejects(
      () => submitReview('attacker-2', 'rev-1', 2),
      (err) => err.status === 404,
    );
  } finally {
    prisma.revision.findUnique = originalFind;
  }
});

test('submitReview rejects a review for a revision that does not exist', async () => {
  const originalFind = prisma.revision.findUnique;
  prisma.revision.findUnique = async () => null;
  try {
    await assert.rejects(
      () => submitReview('owner-1', 'missing-id', 2),
      (err) => err.status === 404,
    );
  } finally {
    prisma.revision.findUnique = originalFind;
  }
});

test('submitReview succeeds when the requesting user owns the revision', async () => {
  const originalFind = prisma.revision.findUnique;
  const originalUpdate = prisma.revision.update;
  const originalUserFind = prisma.user.findUnique;
  const originalUserUpdate = prisma.user.update;

  prisma.revision.findUnique = async () => fakeRevision;
  prisma.revision.update = async ({ data }) => ({ ...fakeRevision, ...data });
  prisma.user.findUnique = async () => ({
    streakCurrent: 0,
    streakLongest: 0,
    streakLastActiveDate: null,
  });
  prisma.user.update = async ({ data }) => data;

  try {
    const result = await submitReview('owner-1', 'rev-1', 2);
    assert.equal(result.repetitions, 1);
    assert.equal(result.intervalDays, 1);
  } finally {
    prisma.revision.findUnique = originalFind;
    prisma.revision.update = originalUpdate;
    prisma.user.findUnique = originalUserFind;
    prisma.user.update = originalUserUpdate;
  }
});
