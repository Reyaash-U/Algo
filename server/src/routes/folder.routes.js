import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import {
  getTree,
  createFolder,
  updateFolder,
  deleteFolder,
  createFile,
  getFile,
  updateFile,
  updateFileStatus,
  deleteFile,
} from '../controllers/folderController.js';

const router = Router();
router.use(verifyJWT);

// Dynamic hierarchy tree
router.get('/folders/tree', getTree);

// Folders
router.post('/folders', createFolder);
router.patch('/folders/:id', updateFolder);
router.delete('/folders/:id', deleteFolder);

// Files
router.post('/files', createFile);
router.get('/files/:id', getFile);
router.patch('/files/:id', updateFile);
router.patch('/files/:id/status', updateFileStatus);
router.delete('/files/:id', deleteFile);

export default router;
