import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { toRevisionDTO } from '../models/Revision.js';
import {
  enrollNote,
  getDueRevisions,
  submitReview,
  getRevisionStats,
} from '../services/revisionServiceDb.js';

export const enroll = asyncHandler(async (req, res) => {
  const revision = await enrollNote(req.user.id, req.body?.noteId);
  res.status(200).json(ok(toRevisionDTO(revision)));
});

export const due = asyncHandler(async (req, res) => {
  const items = await getDueRevisions(req.user.id, { all: req.query?.all === 'true' });
  res.status(200).json(
    ok({
      items: items.map(toRevisionDTO),
      count: items.length,
    }),
  );
});

export const review = asyncHandler(async (req, res) => {
  const revision = await submitReview(req.params.id, req.body?.rating);
  res.status(200).json(ok(toRevisionDTO(revision)));
});

export const stats = asyncHandler(async (req, res) => {
  const result = await getRevisionStats(req.user.id);
  res.status(200).json(ok(result));
});
