export function toSubmissionDTO(row) {
  return {
    id: row.id,
    userId: row.userId,
    problemId: row.problemId,
    noteId: row.noteId,
    status: row.status,
    language: row.language,
    code: row.code,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
