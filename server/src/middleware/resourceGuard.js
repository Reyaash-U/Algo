import { VISIBILITY } from '@algovault/shared';
import { ApiError } from '../utils/apiError.js';
import { prisma } from '../config/db.js';

// The three authorization layers from the spec, as reusable middleware.
// Backend Dev attaches these to routes; they never rewrite the logic per-route.
//
// Usage:
//   loadResource('note')          → puts row on req.resource (404 if missing)
//   loadResource('sheet', { include: { items: true } })  → with a relation
//   requireOwner                  → 403 unless req.user owns req.resource
//   requireReadable                → owner OR visibility link/public
//
// `resourceType` is the Prisma client delegate name ('note', 'sheet', ...) —
// this keeps the guard generic across entities without Mongoose's shared
// Model interface.

export function loadResource(resourceType, { idParam = 'id', includeDeleted = false, include } = {}) {
  const delegate = prisma[resourceType];
  if (!delegate) throw new Error(`loadResource: unknown resource type "${resourceType}"`);

  return async (req, _res, next) => {
    try {
      const doc = await delegate.findUnique({
        where: { id: req.params[idParam] },
        ...(include ? { include } : {}),
      });
      if (!doc || (!includeDeleted && doc.deletedAt)) {
        return next(ApiError.notFound(`${resourceType} not found`));
      }
      req.resource = doc;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireOwner(req, _res, next) {
  if (!req.resource) return next(ApiError.notFound());
  if (req.resource.ownerId !== req.user.id) {
    return next(ApiError.forbidden('You do not own this resource'));
  }
  next();
}

export function requireReadable(req, _res, next) {
  if (!req.resource) return next(ApiError.notFound());
  const isOwner = req.resource.ownerId === req.user.id;
  const isShared =
    req.resource.visibility === VISIBILITY.LINK || req.resource.visibility === VISIBILITY.PUBLIC;
  if (!isOwner && !isShared) {
    return next(ApiError.forbidden('This resource is private'));
  }
  next();
}
