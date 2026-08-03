export function toNoteDTO(row) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    contentMarkdown: row.contentMarkdown,
    codeBlocks: row.codeBlocks,
    problemId: row.problemId,
    patternTags: row.patternTags,
    visibility: row.visibility,
    confidence: row.confidence,
    forkOf: row.forkOfId,
    forkCount: row.forkCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
