import { prisma } from '../config/db.js';
import { toNoteDTO } from '../models/Note.js';
import { toSheetDTO } from '../models/Sheet.js';

export async function searchPublicResources(q = '') {
  const noteWhere = { visibility: 'public', deletedAt: null };
  const sheetWhere = { visibility: 'public', deletedAt: null };

  if (q) {
    noteWhere.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { contentMarkdown: { contains: q, mode: 'insensitive' } },
    ];
    sheetWhere.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [notes, sheets] = await Promise.all([
    prisma.note.findMany({
      where: noteWhere,
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
    prisma.sheet.findMany({
      where: sheetWhere,
      include: { items: true },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
  ]);

  const results = [
    ...notes.map((n) => ({ type: 'note', ...toNoteDTO(n) })),
    ...sheets.map((s) => ({ type: 'sheet', ...toSheetDTO(s) })),
  ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return results;
}
