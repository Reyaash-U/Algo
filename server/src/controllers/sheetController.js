import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { toSheetDTO } from '../models/Sheet.js';
import {
  listSheets,
  createSheet,
  updateSheet,
  softDeleteSheet,
  updateSheetItem,
} from '../services/sheetService.js';
import { forkSheet } from '../services/forkService.js';
import { forkSheetFromGithub } from '../services/githubSheetService.js';
import { ApiError } from '../utils/apiError.js';

export const list = asyncHandler(async (req, res) => {
  const items = await listSheets(req.user.id);
  res.status(200).json(
    ok({
      items: items.map(toSheetDTO),
      total: items.length,
    }),
  );
});

export const create = asyncHandler(async (req, res) => {
  const sheet = await createSheet(req.user.id, req.body);
  res.status(201).json(ok(toSheetDTO(sheet)));
});

export const get = asyncHandler(async (req, res) => {
  res.status(200).json(ok(toSheetDTO(req.resource)));
});

export const update = asyncHandler(async (req, res) => {
  const sheet = await updateSheet(req.resource.id, req.body);
  res.status(200).json(ok(toSheetDTO(sheet)));
});

export const remove = asyncHandler(async (req, res) => {
  const sheet = await softDeleteSheet(req.resource.id);
  res.status(200).json(ok(toSheetDTO(sheet)));
});

export const updateItem = asyncHandler(async (req, res) => {
  const updatedItem = await updateSheetItem(req.resource.id, req.params.itemId, req.body);
  const items = (req.resource.items ?? []).map((item) =>
    item.id === updatedItem.id ? updatedItem : item,
  );
  res.status(200).json(ok(toSheetDTO({ ...req.resource, items })));
});

export const fork = asyncHandler(async (req, res) => {
  const sheet = await forkSheet(req.resource.id, req.user.id);
  res.status(201).json(ok(toSheetDTO(sheet)));
});

export const forkGithub = asyncHandler(async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw ApiError.badRequest('GitHub URL is required');
  }
  const sheet = await forkSheetFromGithub(req.user.id, url.trim());
  res.status(201).json(ok(toSheetDTO(sheet)));
});
