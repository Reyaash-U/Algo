import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { stripDangerous } from '../utils/sanitize.js';

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

  if (query.visibility) where.visibility = query.visibility;
  if (query.tag) where.patternTags = { has: query.tag };
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { contentMarkdown: { contains: query.q, mode: 'insensitive' } },
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

  return prisma.note.create({
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
