import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { toNoteDTO } from '../models/Note.js';
import { listNotes, createNote, updateNote, softDeleteNote } from '../services/noteService.js';
import { forkNote } from '../services/forkService.js';

export const list = asyncHandler(async (req, res) => {
  const result = await listNotes(req.user.id, req.query);
  res.status(200).json(
    ok({
      items: result.items.map(toNoteDTO),
      total: result.total,
      page: result.page,
      limit: result.limit,
    }),
  );
});

export const create = asyncHandler(async (req, res) => {
  const note = await createNote(req.user.id, req.body);
  res.status(201).json(ok(toNoteDTO(note)));
});

export const update = asyncHandler(async (req, res) => {
  const note = await updateNote(req.resource.id, req.body);
  res.status(200).json(ok(toNoteDTO(note)));
});

export const remove = asyncHandler(async (req, res) => {
  const note = await softDeleteNote(req.resource.id);
  res.status(200).json(ok(toNoteDTO(note)));
});

export const fork = asyncHandler(async (req, res) => {
  const note = await forkNote(req.resource.id, req.user.id);
  res.status(201).json(ok(toNoteDTO(note)));
});
