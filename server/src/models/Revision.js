export function toRevisionDTO(row) {
  return {
    id: row.id,
    userId: row.userId,
    noteId: row.noteId,
    problemId: row.note?.problemId || null,
    noteTitle: row.note?.title,
    patternTags: row.note?.patternTags || [],
    contentMarkdown: row.note?.contentMarkdown || '',
    repetitions: row.repetitions,
    intervalDays: row.intervalDays,
    easeFactor: row.easeFactor,
    lastReviewedAt: row.lastReviewedAt ? row.lastReviewedAt.toISOString() : null,
    nextReviewAt: row.nextReviewAt.toISOString(),
  };
}
