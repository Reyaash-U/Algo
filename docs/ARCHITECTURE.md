# Architecture

## The core idea

Two people (Backend Dev, Frontend Dev) build in parallel without blocking each
other because they share one frozen contract: **`shared/contract/`**.

```
shared/contract/
  enums.js      ← every enumerated value (roles, visibility, ratings, error codes)
  envelope.js   ← the ONE response shape: {ok,data,meta} success / {ok,error} failure
  endpoints.js  ← registry of every route: method, path, auth level
  dto.js        ← output shapes + mock*() factories per entity
```

Both `server/` and `client/` import this package as `@algovault/shared`
(`file:../shared` in each `package.json`). Change a response shape here and
both sides find out at import/compile time, not at integration time three
weeks before demo day.

## Backend (`server/`)

Layered: **routes → controllers → services → models**.

- `routes/` — thin. Attaches middleware (auth, guards, validation, rate limit)
  then hands off to a controller. Every route file is stub-wired: guards are
  real, the handler is `stub(mockFn)` until Backend Dev swaps it for a real
  controller. Same URL, same shape, before and after.
- `controllers/` — validate (done by middleware already) → call service →
  respond with `ok(data)`/`fail(code,msg)` from the shared envelope.
- `services/` — business logic. **This is where the actual work happens.**
  `revisionService.js` (SM-2) is a pure function, already implemented and
  unit-tested — don't reimplement it, import it.
- `models/` — no DB classes here (Prisma doesn't use them). Each file exports
  a `toXDTO(row)` function mapping a Prisma row to the contract's output
  shape. Controllers never send a raw Prisma row to the client. The actual
  schema lives in `prisma/schema.prisma`; the query client is the singleton
  exported from `config/db.js` (`import { prisma } from '../config/db.js'`).
- `middleware/` — `auth.js` (JWT verify + role check), `resourceGuard.js`
  (ownership + visibility check — the two other authz layers), `validate.js`
  (zod), `rateLimit.js`, `errorHandler.js` (turns any error into the envelope).

### Authorization — three layers, enforced as middleware, not ad hoc

1. **Role** — `requireRole('admin')` on admin routes.
2. **Ownership** — `requireOwner` — you can only edit your own notes/sheets.
3. **Visibility** — `requireReadable` — reading someone else's note requires
   `visibility: 'link'|'public'`.

These are reusable middleware in `resourceGuard.js`. Don't hand-roll a check
in a controller — attach the guard in the route file instead.

## Frontend (`client/`)

Feature-folder layout. Each feature owns one URL area and never reaches into
another feature's folder.

```
client/src/
  api/            ← generated client (see below) + mock layer + axios instance
  lib/            ← authContext (session state), queryClient (React Query)
  components/shared/  ← ProtectedRoute, Navbar, Toast, EmptyState, MarkdownRenderer
  features/<name>/    ← one folder per nav item, each with its own README
  routes/AppRouter.jsx ← the one file mapping paths to feature pages
```

### The generated API client

`api/apiClient.js` walks `shared/contract/endpoints.js` and exposes one
method per endpoint (`api.notes.list()`, `api.revisions.review(id, rating)`,
etc). It never hard-codes a URL — `buildPath()` fills `:params` from the
registry. Adding a route to the contract makes it callable here without
retyping the path.

### Mock/real toggle

`VITE_USE_MOCKS=true` (`.env`) routes every `api.*` call through
`api/mockLayer.js`, which returns the same envelope shape built from the
contract's `mock*()` factories — **before the backend exists or is running**.
Flip to `false` and the exact same `api.*` calls hit the real Express server.
Zero component code changes either way. This is what lets Frontend Dev start
on day one.

### Auth state

The access token lives in `api/httpClient.js` module scope (memory only,
never localStorage — an XSS payload shouldn't be able to read it). The
refresh token is an httpOnly cookie the browser sends automatically
(`withCredentials: true`). `lib/authContext.jsx` wraps this in a React
context (`useAuth()`) and wires a silent-refresh-on-401 interceptor so an
expired access token doesn't kick the user to the login screen mid-session.

## Data flow example: loading the note list

1. `VaultPage.jsx` calls `useQuery({ queryFn: () => api.notes.list() })`.
2. `api.notes.list()` → `apiClient.js`'s `call(ENDPOINTS.notes.list)`.
3. If `VITE_USE_MOCKS=true`: `mockLayer.js` returns `mockNote()` items,
   wrapped in the shared `ok()` envelope, after an artificial delay.
4. If `false`: axios hits `GET http://localhost:5000/api/notes` with the
   bearer token attached, the request passes `verifyJWT` on the backend, and
   the stub or real controller responds with the identical envelope shape.
5. Either way, `VaultPage.jsx` reads `data.items` — it cannot tell whether the
   data was mocked or real. That's the point.

## Why this split (not something else)

With two people, the split that avoids collisions is **backend+contract vs.
frontend** — a hard filesystem boundary (`server/` + `shared/` vs. `client/`)
that's easy to enforce even without a third person to catch violations in
review. You own the interface (the contract, and everything behind it); your
teammate owns everything in front of it. Neither of you needs to touch the
other's files to keep moving, because the contract's mock layer means the
frontend never actually needs the backend running to build against it. See
`OWNERSHIP.md` for the enforcement rules.
