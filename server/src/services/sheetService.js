import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';

export async function listSheets(userId) {
  return prisma.sheet.findMany({
    where: { ownerId: userId, deletedAt: null },
    include: { items: true },
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
  return prisma.sheet.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
      ...(data.targetDate !== undefined
        ? { targetDate: data.targetDate ? new Date(data.targetDate) : null }
        : {}),
    },
    include: { items: true },
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
  });
}
