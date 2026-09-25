import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { resolveProblem } from './problemFetchService.js';

export async function listSheets(userId) {
  return prisma.sheet.findMany({
    where: { ownerId: userId, deletedAt: null },
    include: { items: { include: { problem: true } } },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function createSheet(userId, data = {}) {
  if (data.items !== undefined && !Array.isArray(data.items)) {
    throw ApiError.badRequest('items must be an array');
  }

  const itemsToCreate =
    data.items?.map((item, index) => ({
      ...(item.problemId !== undefined ? { problemId: item.problemId } : {}),
      ...(item.title !== undefined ? { title: item.title } : {}),
      ...(item.status !== undefined ? { status: item.status } : {}),
      ...(item.position !== undefined ? { position: item.position } : { position: index }),
    })) ?? [];

  return prisma.sheet.create({
    data: {
      ownerId: userId,
      title: data.title ?? 'New Sheet',
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
      ...(data.targetDate !== undefined
        ? { targetDate: data.targetDate ? new Date(data.targetDate) : null }
        : {}),
      ...(itemsToCreate.length > 0 ? { items: { create: itemsToCreate } } : {}),
    },
    include: { items: true },
  });
}

export async function updateSheet(id, data = {}) {
  const updateData = {
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
    ...(data.targetDate !== undefined
      ? { targetDate: data.targetDate ? new Date(data.targetDate) : null }
      : {}),
  };

  if (Array.isArray(data.items)) {
    return prisma.$transaction(async (tx) => {
      await tx.sheetItem.deleteMany({ where: { sheetId: id } });
      if (data.items.length > 0) {
        await tx.sheetItem.createMany({
          data: data.items.map((item, index) => ({
            sheetId: id,
            problemId: item.problemId || null,
            title: item.title || 'Untitled Problem',
            status: item.status || 'todo',
            position: item.position !== undefined ? item.position : index,
          })),
        });
      }
      return tx.sheet.update({
        where: { id },
        data: updateData,
        include: { items: { include: { problem: true } } },
      });
    });
  }

  return prisma.sheet.update({
    where: { id },
    data: updateData,
    include: { items: { include: { problem: true } } },
  });
}

export async function softDeleteSheet(id) {
  return prisma.sheet.update({
    where: { id },
    data: { deletedAt: new Date() },
    include: { items: true },
  });
}

export async function updateSheetItem(sheetId, itemId, data = {}) {
  const existing = await prisma.sheetItem.findUnique({ where: { id: itemId } });
  if (!existing || existing.sheetId !== sheetId) {
    throw ApiError.notFound('Sheet item not found');
  }

  return prisma.sheetItem.update({
    where: { id: itemId },
    data: {
      ...(data.problemId !== undefined ? { problemId: data.problemId } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.position !== undefined ? { position: data.position } : {}),
    },
    include: { problem: true },
  });
}

export async function addSheetItem(sheetId, data = {}) {
  const title = (data.title || '').trim();
  if (!title) {
    throw ApiError.badRequest('Problem title is required');
  }

  let problemId = data.problemId || null;
  const problemUrl = data.url ? data.url.trim() : null;
  const difficulty = (data.difficulty || 'Medium').toLowerCase();
  const platform = (data.platform || 'LeetCode').toLowerCase();

  if (problemUrl) {
    try {
      const resolved = await resolveProblem(problemUrl);
      if (resolved?.id) {
        problemId = resolved.id;
      }
    } catch {
      // If resolver fails (e.g. offline/custom URL), find or create Problem record
      const existingProblem = await prisma.problem.findFirst({
        where: { url: problemUrl },
      });
      if (existingProblem) {
        problemId = existingProblem.id;
      } else {
        const slug = problemUrl.split('/').filter(Boolean).pop() || title.toLowerCase().replace(/\s+/g, '-');
        const createdProb = await prisma.problem.create({
          data: {
            title,
            url: problemUrl,
            difficulty,
            platform,
            externalId: slug,
            tags: [],
          },
        });
        problemId = createdProb.id;
      }
    }
  } else if (!problemId) {
    // If no URL given, try to match existing problem in DB by title
    const existingProblem = await prisma.problem.findFirst({
      where: { title: { equals: title, mode: 'insensitive' } },
    });
    if (existingProblem) {
      problemId = existingProblem.id;
    }
  }

  // Determine next position
  const maxPosItem = await prisma.sheetItem.findFirst({
    where: { sheetId },
    orderBy: { position: 'desc' },
  });
  const nextPosition = maxPosItem ? maxPosItem.position + 1 : 0;

  // Create sheet item
  const item = await prisma.sheetItem.create({
    data: {
      sheetId,
      title,
      problemId,
      status: data.status || 'todo',
      position: nextPosition,
    },
    include: { problem: true },
  });

  // Touch sheet's updatedAt
  await prisma.sheet.update({
    where: { id: sheetId },
    data: { updatedAt: new Date() },
  });

  return item;
}

export async function removeSheetItem(sheetId, itemId) {
  const existing = await prisma.sheetItem.findUnique({
    where: { id: itemId },
  });
  if (!existing || existing.sheetId !== sheetId) {
    throw ApiError.notFound('Sheet item not found on this sheet');
  }

  await prisma.sheetItem.delete({
    where: { id: itemId },
  });

  await prisma.sheet.update({
    where: { id: sheetId },
    data: { updatedAt: new Date() },
  });

  return { success: true, itemId };
}
