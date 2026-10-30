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

export const get = asyncHandler(async (req, res) => {
  res.status(200).json(ok(toNoteDTO(req.resource)));
});

export const versions = asyncHandler(async (req, res) => {
  res.status(200).json(ok({ versions: req.resource.versions ?? [] }));
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
  const { note, created } = await forkNote(req.resource.id, req.user.id);
  // 201 for a new copy; 200 plus alreadyForked when the user already had one.
  res.status(created ? 201 : 200).json(ok({ ...toNoteDTO(note), alreadyForked: !created }));
});
