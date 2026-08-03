import { ok } from '@algovault/shared';
import { env } from '../config/env.js';

// Wrap a mock-producing function into an Express handler. Adds X-Stub: true so
// the frontend (and you) can see at a glance which endpoints aren't real yet.
//
// Backend Dev's job = delete the stub line in the route file and point it at the
// real controller. Nothing else changes: same URL, same response shape.
export function stub(mockFn) {
  return (req, res) => {
    res.setHeader('X-Stub', 'true');
    const payload = typeof mockFn === 'function' ? mockFn(req) : mockFn;
    res.status(200).json(ok(payload));
  };
}

// Guard used inside real controllers that aren't finished: if stubs are on,
// short-circuit to mock; else run the real implementation.
export function notImplemented(res) {
  return res.status(501).json({
    ok: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Endpoint not implemented yet' },
  });
}

export const stubsEnabled = env.ENABLE_STUBS;
