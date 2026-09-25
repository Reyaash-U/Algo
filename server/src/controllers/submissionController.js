import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { prisma } from '../config/db.js';
import { toSubmissionDTO } from '../models/Submission.js';
import { createSubmission } from '../services/submissionService.js';

export const create = asyncHandler(async (req, res) => {
  const { problemId, noteId, status, language, code, submittedAt } = req.body || {};
  const submission = await createSubmission(req.user.id, {
    problemId,
    noteId,
    status,
    language,
    code,
    submittedAt,
  });
  res.status(201).json(ok(toSubmissionDTO(submission)));
});

export const list = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const submissions = await prisma.submission.findMany({
    where: { userId: req.user.id },
    orderBy: { submittedAt: 'desc' },
    take: limit,
  });
  res.status(200).json(ok({ items: submissions.map(toSubmissionDTO), total: submissions.length }));
});
