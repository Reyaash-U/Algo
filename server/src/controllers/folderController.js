import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { folderTreeService } from '../services/folderTreeService.js';

// ---- Tree ----
export const getTree = asyncHandler(async (req, res) => {
  const tree = await folderTreeService.getTree(req.user.id);
  res.status(200).json(ok(tree));
});

// ---- Folders ----
export const createFolder = asyncHandler(async (req, res) => {
  const folder = await folderTreeService.createFolder(req.user.id, req.body);
  res.status(201).json(ok(folder));
});

export const updateFolder = asyncHandler(async (req, res) => {
  const folder = await folderTreeService.updateFolder(req.user.id, req.params.id, req.body);
  res.status(200).json(ok(folder));
});

export const deleteFolder = asyncHandler(async (req, res) => {
  const result = await folderTreeService.deleteFolder(req.user.id, req.params.id);
  res.status(200).json(ok(result));
});

// ---- Files ----
export const createFile = asyncHandler(async (req, res) => {
  const file = await folderTreeService.createFile(req.user.id, req.body);
  res.status(201).json(ok(file));
});

export const getFile = asyncHandler(async (req, res) => {
  const file = await folderTreeService.getFile(req.user.id, req.params.id);
  res.status(200).json(ok(file));
});

export const updateFile = asyncHandler(async (req, res) => {
  const file = await folderTreeService.updateFile(req.user.id, req.params.id, req.body);
  res.status(200).json(ok(file));
});

export const updateFileStatus = asyncHandler(async (req, res) => {
  const file = await folderTreeService.updateFileStatus(req.user.id, req.params.id, req.body.status);
  res.status(200).json(ok(file));
});

export const deleteFile = asyncHandler(async (req, res) => {
  const result = await folderTreeService.deleteFile(req.user.id, req.params.id);
  res.status(200).json(ok(result));
});
