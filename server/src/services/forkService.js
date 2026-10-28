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
    include: { items: { include: { problem: true } } },
  });
  if (!original) throw ApiError.notFound('sheet not found');

  const sheetTitle = original.ownerId === userId ? `${original.title} (Copy)` : original.title;

  const [forked] = await prisma.$transaction([
    prisma.sheet.create({
      data: {
        ownerId: userId,
        title: sheetTitle,
        description: original.description,
        targetDate: original.targetDate,
        forkOfId: originalId,
        visibility: 'private',
        items: {
          create: (original.items ?? []).map((item) => ({
            title: item.title,
            ...(item.problemId ? { problemId: item.problemId } : {}),
            position: item.position,
            status: SHEET_ITEM_STATUS.TODO,
          })),
        },
      },
      include: { items: { include: { problem: true } } },
    }),
    prisma.sheet.update({
      where: { id: originalId },
      data: { forkCount: { increment: 1 } },
    }),
  ]);

  // Copy any notes written by the original sheet owner on these problems
  const problemIds = (original.items ?? []).map((i) => i.problemId).filter(Boolean);
  if (problemIds.length > 0) {
    try {
      const originalNotes = await prisma.note.findMany({
        where: {
          problemId: { in: problemIds },
          ownerId: original.ownerId,
          deletedAt: null,
        },
      });

      for (const note of originalNotes) {
        const existing = await prisma.note.findFirst({
          where: { ownerId: userId, problemId: note.problemId, deletedAt: null },
        });
        if (!existing) {
          await prisma.note.create({
            data: {
              ownerId: userId,
              title: note.title,
              contentMarkdown: note.contentMarkdown,
              codeBlocks: cloneJsonArray(note.codeBlocks),
              problemId: note.problemId,
              patternTags: [...(note.patternTags ?? [])],
              visibility: 'private',
              confidence: note.confidence,
              forkOfId: note.id,
            },
          });
          await prisma.note.update({
            where: { id: note.id },
            data: { forkCount: { increment: 1 } },
          });
        }
      }
    } catch {
      // Notes copying is best-effort and shouldn't block sheet forking
    }
  }

  return forked;
}

function cloneJsonArray(value) {
  if (!Array.isArray(value)) return [];
  return JSON.parse(JSON.stringify(value));
}
