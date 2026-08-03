# Ownership

Two people, two lanes.

## The matrix

| Path | Owner | Others may... |
|---|---|---|
| `shared/contract/**` | **You (Tech Lead + Backend)** | teammate proposes changes via PR; never edits directly |
| `server/**` (models, middleware, routes, controllers, services, jobs, config) | **You (Tech Lead + Backend)** | teammate reads; never edits |
| `client/**` (everything) | **Teammate (Frontend)** | you read; don't edit — flag issues instead |
| `docs/**` | **You** | anyone may PR corrections |
| `.github/workflows/**` | **You** | — |

## The golden boundary

**Your teammate never edits anything under `server/` or `shared/contract/`.**
**You don't edit `client/`** — if something there needs to change, that's a
conversation with your teammate, not a unilateral fix.

If a task seems to require crossing this line, it's actually one of two things:

1. **The contract needs a change** (new field, new endpoint, new enum value).
   Your teammate can't edit `shared/contract/` directly — they tell you what
   they need, you add it (small, fast PR), they continue.
2. **A genuine cross-cutting decision** (e.g. "should status be an enum or a
   free string") — talk it through, don't just edit around each other.

This rule matters more with two people than three: there's no third person to
catch a boundary violation in review, so it's on both of you to hold the line.

## What each person needs to know before touching their area

**You (Backend), read before starting:**
- `docs/ARCHITECTURE.md` → "Backend" section
- `server/src/routes/note.routes.js` — the comment block explains the stub →
  real controller migration pattern every other route file follows
- `server/src/services/revisionService.js` — SM-2 is done and tested. Don't
  touch the math; call `applySm2()` from the revision controller
- Each `services/*.js` stub file has a comment describing exactly what it
  needs to do (e.g. `problemFetchService.js`'s cache-aside contract)

**Your teammate (Frontend), read before starting:**
- `docs/ARCHITECTURE.md` → "Frontend" section
- `client/src/features/vault/VaultPage.jsx` — the reference pattern
  (useQuery + api client + loading/error/empty states) every other feature
  page copies
- Each `features/<name>/README.md` — lists exactly what components that
  feature still needs
- `.env` → `VITE_USE_MOCKS=true` — build against mock data with zero backend
  running. Stays on `true` until you tell them a specific route is real.

## How you unblock each other

Your teammate doesn't wait on you — they build every screen against the
contract's mock data from day one. When you finish a real backend route,
tell them which one. They either flip that feature's calls or wait until
several routes are done and flip `VITE_USE_MOCKS=false` globally — either
way, zero code changes on their end, because the API client shape never
changes between mock and real.

## Escalation

If either of you is blocked on the other for more than a few hours, say so —
don't sit on it. A contract PR is cheap; a day of blocked work isn't.
