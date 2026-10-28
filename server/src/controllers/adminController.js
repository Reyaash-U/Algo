import { prisma } from '../config/db.js';
import { ok } from '../utils/apiResponse.js';
import { asyncHandler, ApiError } from '../utils/apiError.js';

export const listTags = asyncHandler(async (req, res) => {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
  });
  const tagNames = tags.map((t) => t.name);

  const notes = await prisma.note.findMany({
    where: { deletedAt: null },
    select: { patternTags: true },
  });

  const tagCounts = {};
  for (const name of tagNames) {
    tagCounts[name] = 0;
  }
  for (const note of notes) {
    if (Array.isArray(note.patternTags)) {
      for (const t of note.patternTags) {
        if (tagCounts[t] !== undefined) {
          tagCounts[t] += 1;
        }
      }
    }
  }

  res.status(200).json(ok({ tags: tagNames, tagCounts }));
});

export const getTagUsage = asyncHandler(async (req, res) => {
  const name = req.params.id;
  if (!name) {
    throw ApiError.badRequest('Tag name is required');
  }
  const targetName = name.trim().toLowerCase();

  const noteCount = await prisma.note.count({
    where: {
      patternTags: { has: targetName },
      deletedAt: null,
    },
  });

  res.status(200).json(ok({ tag: targetName, noteCount }));
});

export const createTag = asyncHandler(async (req, res) => {
  const rawTag = req.body?.tag;
  if (typeof rawTag !== 'string' || rawTag.trim() === '') {
    throw ApiError.badRequest('Tag name is required and must be a non-empty string');
  }
  const name = rawTag.trim().toLowerCase();

  const existing = await prisma.tag.findUnique({
    where: { name },
  });
  if (existing) {
    throw ApiError.conflict('Tag already exists');
  }

  const tag = await prisma.tag.create({
    data: { name },
  });
  res.status(201).json(ok({ tag: tag.name }));
});

export const deleteTag = asyncHandler(async (req, res) => {
  const name = req.params.id;
  if (!name) {
    throw ApiError.badRequest('Tag name is required');
  }
  const targetName = name.trim().toLowerCase();

  try {
    await prisma.tag.delete({
      where: { name: targetName },
    });
    res.status(200).json(ok({ deleted: true }));
  } catch (err) {
    if (err.code === 'P2025') {
      throw ApiError.notFound('Tag not found');
    }
    throw err;
  }
});
