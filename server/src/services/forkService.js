import { SHEET_ITEM_STATUS } from '@algovault/shared';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';

// BACKEND DEV: deep-copy content → set forkOfId pointer → atomically increment
// forkCount on the original (Prisma: `prisma.note.update({ where, data: {
// forkCount: { increment: 1 } } })` — atomic at the DB level, same guarantee
// the old Mongo $inc gave us). Handle deleted originals gracefully: because
// deletion is a soft delete (deletedAt set, row not removed), forkOfId can
// keep pointing at a "deleted" note/sheet without a foreign-key violation —
// that's the tombstone, GitHub-style.
export async function forkNote(originalId, userId) {
  const original = await prisma.note.findUnique({ where: { id: originalId } });
  if (!original) throw ApiError.notFound('note not found');

  const [forked] = await prisma.$transaction([
    prisma.note.create({
      data: {
        ownerId: userId,
        title: original.title,
        contentMarkdown: original.contentMarkdown,
        codeBlocks: cloneJsonArray(original.codeBlocks),
        patternTags: [...(original.patternTags ?? [])],
        forkOfId: originalId,
      },
    }),
    prisma.note.update({
      where: { id: originalId },
      data: { forkCount: { increment: 1 } },
    }),
  ]);

  return forked;
}

export async function forkSheet(originalId, userId) {
  const original = await prisma.sheet.findUnique({
    where: { id: originalId },
    include: { items: true },
  });
  if (!original) throw ApiError.notFound('sheet not found');

  const [forked] = await prisma.$transaction([
    prisma.sheet.create({
      data: {
        ownerId: userId,
        title: original.title,
        description: original.description,
        targetDate: original.targetDate,
        forkOfId: originalId,
        items: {
          create: (original.items ?? []).map((item) => ({
            title: item.title,
            ...(item.problemId ? { problemId: item.problemId } : {}),
            position: item.position,
            status: SHEET_ITEM_STATUS.TODO,
          })),
        },
      },
      include: { items: true },
    }),
    prisma.sheet.update({
      where: { id: originalId },
      data: { forkCount: { increment: 1 } },
    }),
  ]);

  return forked;
}

function cloneJsonArray(value) {
  if (!Array.isArray(value)) return [];
  return JSON.parse(JSON.stringify(value));
}
