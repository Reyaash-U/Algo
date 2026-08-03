export function toProblemDTO(row) {
  return {
    id: row.id,
    platform: row.platform,
    externalId: row.externalId,
    title: row.title,
    url: row.url,
    difficulty: row.difficulty,
    tags: row.tags,
    fetchedAt: row.fetchedAt.toISOString(),
  };
}
