import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { stripDangerous } from '../utils/sanitize.js';
import { createSubmission } from './submissionService.js';
import { enrollNote } from './revisionServiceDb.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function listNotes(userId, query = {}) {
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const skip = (page - 1) * limit;

  const where = {
    ownerId: userId,
    deletedAt: null,
  };

  if (query.visibility && query.visibility !== 'all') {
    where.visibility = query.visibility;
  }
  if (query.tag && query.tag.trim()) {
    const rawTag = query.tag.trim();
    const tagLower = rawTag.toLowerCase();
    const tagKebab = tagLower.replace(/\s+/g, '-');
    const variations = Array.from(new Set([rawTag, tagLower, tagKebab]));
    where.patternTags = { hasSome: variations };
  }
  if (query.q && query.q.trim()) {
    const q = query.q.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { contentMarkdown: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.note.count({ where }),
  ]);

  return { items, total, page, limit };
}

export async function createNote(userId, data = {}) {
  if (data.codeBlocks !== undefined && !Array.isArray(data.codeBlocks)) {
    throw ApiError.badRequest('codeBlocks must be an array');
  }
  if (data.patternTags !== undefined && !Array.isArray(data.patternTags)) {
    throw ApiError.badRequest('patternTags must be an array');
  }

  const note = await prisma.note.create({
    data: {
      ownerId: userId,
      title: data.title ?? 'Untitled',
      ...(data.contentMarkdown !== undefined ? { contentMarkdown: stripDangerous(data.contentMarkdown) } : {}),
      ...(data.codeBlocks !== undefined ? { codeBlocks: data.codeBlocks } : {}),
      ...(data.problemId !== undefined ? { problemId: data.problemId } : {}),
      ...(data.patternTags !== undefined ? { patternTags: data.patternTags } : {}),
      ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
      ...(data.confidence !== undefined ? { confidence: data.confidence } : {}),
    },
  });

  await enrollNote(userId, note.id).catch(() => null);

  await createSubmission(userId, {
    problemId: note.problemId ?? null,
    noteId: note.id,
    status: 'accepted',
    submittedAt: note.createdAt,
  }).catch(() => null);

  return note;
}

export async function updateNote(id, data = {}) {
  if (data.codeBlocks !== undefined && !Array.isArray(data.codeBlocks)) {
    throw ApiError.badRequest('codeBlocks must be an array');
  }
  if (data.patternTags !== undefined && !Array.isArray(data.patternTags)) {
    throw ApiError.badRequest('patternTags must be an array');
  }

  return prisma.note.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.contentMarkdown !== undefined ? { contentMarkdown: stripDangerous(data.contentMarkdown) } : {}),
      ...(data.codeBlocks !== undefined ? { codeBlocks: data.codeBlocks } : {}),
      ...(data.problemId !== undefined ? { problemId: data.problemId } : {}),
      ...(data.patternTags !== undefined ? { patternTags: data.patternTags } : {}),
      ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
      ...(data.confidence !== undefined ? { confidence: data.confidence } : {}),
      ...(data.versions !== undefined ? { versions: data.versions } : {})
    },
  });
}

export async function softDeleteNote(id) {
  return prisma.note.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

function normalizePage(page) {
  const value = Number.parseInt(page, 10);
  if (!Number.isFinite(value) || value < 1) return DEFAULT_PAGE;
  return value;
}

function normalizeLimit(limit) {
  const value = Number.parseInt(limit, 10);
  if (!Number.isFinite(value) || value < 1) return DEFAULT_LIMIT;
  return Math.min(value, MAX_LIMIT);
}
