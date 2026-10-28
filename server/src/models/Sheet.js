// `items` on a Sheet row is expected to be the included SheetItem[] relation
// (prisma.sheet.findUnique({ include: { items: true } })) — this file does
// NOT query the DB, it only shapes whatever rows the service already loaded.
export function sheetProgressPct(items = []) {
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.status === 'done' || i.status === 'solved').length;
  return Math.round((done / items.length) * 100);
}

export function toSheetDTO(row) {
  const items = row.items ?? [];
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    targetDate: row.targetDate ? row.targetDate.toISOString() : null,
    items: items.map((i) => ({
      itemId: i.id,
      problemId: i.problemId,
      title: i.title,
      status: i.status,
      difficulty: i.problem?.difficulty || 'Medium',
      platform: i.problem?.platform || 'LeetCode',
      url: i.problem?.url || null,
      tags: i.problem?.tags || [],
    })),
    forkOf: row.forkOfId,
    forkCount: row.forkCount,
    progressPct: sheetProgressPct(items),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
