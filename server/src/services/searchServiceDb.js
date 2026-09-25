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

export async function searchGlobalResources(q = '', userId = null) {
  const queryStr = (q || '').trim();

  const noteWhere = {
    deletedAt: null,
    ...(userId
      ? { OR: [{ ownerId: userId }, { visibility: 'public' }] }
      : { visibility: 'public' }),
  };

  const sheetWhere = {
    deletedAt: null,
    ...(userId
      ? { OR: [{ ownerId: userId }, { visibility: 'public' }] }
      : { visibility: 'public' }),
  };

  const problemWhere = {};

  if (queryStr) {
    const rawTag = queryStr.toLowerCase();
    const tagKebab = rawTag.replace(/\s+/g, '-');
    const tagVariations = Array.from(new Set([queryStr, rawTag, tagKebab]));

    noteWhere.AND = [
      {
        OR: [
          { title: { contains: queryStr, mode: 'insensitive' } },
          { contentMarkdown: { contains: queryStr, mode: 'insensitive' } },
          { patternTags: { hasSome: tagVariations } },
          { problem: { title: { contains: queryStr, mode: 'insensitive' } } },
        ],
      },
    ];

    sheetWhere.AND = [
      {
        OR: [
          { title: { contains: queryStr, mode: 'insensitive' } },
          { description: { contains: queryStr, mode: 'insensitive' } },
          { items: { some: { title: { contains: queryStr, mode: 'insensitive' } } } },
        ],
      },
    ];

    problemWhere.OR = [
      { title: { contains: queryStr, mode: 'insensitive' } },
      { externalId: { contains: queryStr, mode: 'insensitive' } },
      { tags: { hasSome: tagVariations } },
    ];
  }

  const [notes, sheets, problems] = await Promise.all([
    prisma.note.findMany({
      where: noteWhere,
      include: { problem: true },
      orderBy: { updatedAt: 'desc' },
      take: queryStr ? 20 : 6,
    }),
    prisma.sheet.findMany({
      where: sheetWhere,
      include: { items: { include: { problem: true } } },
      orderBy: { updatedAt: 'desc' },
      take: queryStr ? 15 : 4,
    }),
    prisma.problem.findMany({
      where: problemWhere,
      orderBy: { updatedAt: 'desc' },
      take: queryStr ? 15 : 5,
    }),
  ]);

  const mappedNotes = notes.map((n) => ({
    id: n.id,
    type: 'note',
    title: n.title,
    contentMarkdown: n.contentMarkdown ? n.contentMarkdown.slice(0, 140) : '',
    patternTags: n.patternTags || [],
    visibility: n.visibility,
    isMine: userId ? n.ownerId === userId : false,
    problemTitle: n.problem?.title || null,
    problemDifficulty: n.problem?.difficulty || null,
    platform: n.problem?.platform || null,
    updatedAt: n.updatedAt ? n.updatedAt.toISOString() : null,
  }));

  const mappedSheets = sheets.map((s) => ({
    id: s.id,
    type: 'sheet',
    title: s.title,
    description: s.description || '',
    visibility: s.visibility,
    isMine: userId ? s.ownerId === userId : false,
    problemCount: s.items?.length || 0,
    updatedAt: s.updatedAt ? s.updatedAt.toISOString() : null,
  }));

  const mappedProblems = problems.map((p) => ({
    id: p.id,
    type: 'problem',
    title: p.title,
    difficulty: p.difficulty,
    platform: p.platform,
    url: p.url,
    externalId: p.externalId,
    tags: p.tags || [],
  }));

  return {
    notes: mappedNotes,
    sheets: mappedSheets,
    problems: mappedProblems,
    results: [...mappedNotes, ...mappedSheets, ...mappedProblems],
  };
}
