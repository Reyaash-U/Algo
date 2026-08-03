import { prisma } from '../config/db.js';
import { ok } from '../utils/apiResponse.js';
import { asyncHandler, ApiError } from '../utils/apiError.js';

export const createNoteReport = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const { reason } = req.body;

  if (typeof reason !== 'string' || reason.trim() === '') {
    throw ApiError.badRequest('Reason is required and must be a non-empty string');
  }

  const note = await prisma.note.findUnique({
    where: { id: noteId },
  });

  if (!note || note.deletedAt) {
    throw ApiError.notFound('Note not found');
  }

  const report = await prisma.report.create({
    data: {
      reporterId: req.user.id,
      targetType: 'note',
      targetId: noteId,
      reason: reason.trim(),
    },
  });

  res.status(201).json(ok(report));
});

export const createSheetReport = asyncHandler(async (req, res) => {
  const sheetId = req.params.id;
  const { reason } = req.body;

  if (typeof reason !== 'string' || reason.trim() === '') {
    throw ApiError.badRequest('Reason is required and must be a non-empty string');
  }

  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
  });

  if (!sheet || sheet.deletedAt) {
    throw ApiError.notFound('Sheet not found');
  }

  const report = await prisma.report.create({
    data: {
      reporterId: req.user.id,
      targetType: 'sheet',
      targetId: sheetId,
      reason: reason.trim(),
    },
  });

  res.status(201).json(ok(report));
});

export const listReports = asyncHandler(async (req, res) => {
  const reports = await prisma.report.findMany({
    where: { status: 'open' },
    include: {
      reporter: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const noteIds = reports.filter((r) => r.targetType === 'note').map((r) => r.targetId);
  const sheetIds = reports.filter((r) => r.targetType === 'sheet').map((r) => r.targetId);

  const [notes, sheets] = await Promise.all([
    prisma.note.findMany({
      where: { id: { in: noteIds } },
      select: { id: true, title: true, ownerId: true },
    }),
    prisma.sheet.findMany({
      where: { id: { in: sheetIds } },
      select: { id: true, title: true, ownerId: true },
    }),
  ]);

  const notesMap = new Map(notes.map((n) => [n.id, n]));
  const sheetsMap = new Map(sheets.map((s) => [s.id, s]));

  const items = reports.map((r) => {
    let target = null;
    if (r.targetType === 'note') {
      target = notesMap.get(r.targetId) || null;
    } else if (r.targetType === 'sheet') {
      target = sheetsMap.get(r.targetId) || null;
    }

    return {
      id: r.id,
      reporterId: r.reporterId,
      reporter: r.reporter,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      targetDetails: target ? { title: target.title, ownerId: target.ownerId } : null,
    };
  });

  res.status(200).json(ok({ reports: items }));
});

export const resolveReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'resolved' && status !== 'dismissed') {
    throw ApiError.badRequest("Status must be either 'resolved' or 'dismissed'");
  }

  try {
    const report = await prisma.report.update({
      where: { id },
      data: { status },
    });
    res.status(200).json(ok(report));
  } catch (err) {
    if (err.code === 'P2025') {
      throw ApiError.notFound('Report not found');
    }
    throw err;
  }
});
