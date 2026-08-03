import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { loadResource, requireOwner, requireReadable } from '../middleware/resourceGuard.js';
import { list, create, get, update, remove, updateItem, fork } from '../controllers/sheetController.js';
import { createSheetReport } from '../controllers/reportController.js';

// BACKEND DEV: same pattern as notes. Guards are wired; swap stubs for
// controllers. loadResource('sheet', { include: { items: true } }) pulls in
// the SheetItem child rows needed by toSheetDTO().
const router = Router();
router.use(verifyJWT);

const withItems = { include: { items: true } };

router.get('/', list);
router.post('/', create);
router.get('/:id', loadResource('sheet', withItems), requireReadable, get);
router.patch('/:id', loadResource('sheet', withItems), requireOwner, update);
router.delete('/:id', loadResource('sheet'), requireOwner, remove);
router.patch('/:id/items/:itemId', loadResource('sheet', withItems), requireOwner, updateItem);
router.post('/:id/fork', loadResource('sheet', { ...withItems, includeDeleted: true }), requireReadable, fork);
router.post('/:id/report', loadResource('sheet'), requireReadable, createSheetReport);

export default router;
