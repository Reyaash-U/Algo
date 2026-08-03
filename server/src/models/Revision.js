export function toRevisionDTO(row) {
  return {
    id: row.id,
    userId: row.userId,
    noteId: row.noteId,
    repetitions: row.repetitions,
    intervalDays: row.intervalDays,
    easeFactor: row.easeFactor,
    lastReviewedAt: row.lastReviewedAt ? row.lastReviewedAt.toISOString() : null,
    nextReviewAt: row.nextReviewAt.toISOString(),
  };
}
