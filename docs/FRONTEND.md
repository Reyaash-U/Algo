# Frontend Integration Guide

For whoever's building `client/`. This is the practical "how do I actually
call this API" reference — see `docs/ARCHITECTURE.md` for the bigger picture
and `docs/AlgoVault.postman_collection.json` to test endpoints by hand before
wiring them into a component.

> **Status note:** this reflects the original API contract
> (`shared/contract/endpoints.js`). Backend implementation is complete as of
> this writing, but if anything was added or changed during implementation
> (new endpoints, changed shapes), it should be reflected here — check with
> whoever owns `server/` if something in this doc doesn't match what you get
> back from a real call.

## You don't need the backend running to start

Set `VITE_USE_MOCKS=true` in `client/.env` (the default) and every `api.*`
call returns realistic mock data built from `shared/contract/dto.js`. Build
every screen this way first. Flip to `false` (and set `VITE_API_BASE_URL` to
wherever the backend is running/deployed) once you want to test against real
data — no component code changes either way.

## Response envelope

Every endpoint returns one of two shapes. Always check `ok` first.

```js
// success
{ "ok": true, "data": { ... }, "meta": { ... } }   // meta only on list endpoints (pagination)

// failure
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {...} } }
```

**Switch on `error.code`, never on `error.message`.** Message text can change
wording without warning; the code won't. Codes in use:
`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
`RATE_LIMITED`, `INTERNAL_ERROR`. Full list: `shared/contract/enums.js`.

You never touch this envelope directly — `client/src/api/apiClient.js`
unwraps it and either returns `data` or throws an `ApiError` with `.code`,
`.message`, `.details`. Catch that, not the raw response.

## Auth

**Login:**
```
POST /auth/login
Body: { "email": "...", "password": "..." }
Returns: { user: {id, email, displayName, role, cfHandle, createdAt}, accessToken }
```

Don't call this directly — use `useAuth().login(email, password)` from
`client/src/lib/authContext.jsx`. It stores the access token correctly (in
memory, not localStorage — deliberate, XSS protection) and keeps a refresh
cookie the browser handles automatically.

**Every authenticated request** needs `Authorization: Bearer <accessToken>`.
The shared `http` client (`client/src/api/httpClient.js`) attaches this
automatically once you're logged in via `useAuth()` — you never set this
header yourself in a component.

**Token expiry is handled for you.** A 401 triggers a silent
`/auth/refresh` call and retries the original request. You don't need to
catch 401s specifically for this — just handle the eventual failure like any
other error if refresh itself fails (session truly expired, user needs to
log in again).

## Endpoint reference

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | none | rate-limited |
| POST | `/auth/login` | none | rate-limited |
| POST | `/auth/refresh` | none | uses httpOnly cookie |
| POST | `/auth/logout` | user | |
| GET | `/auth/me` | user | |
| GET | `/notes` | user | own notes; supports `?tag=&search=&page=` |
| POST | `/notes` | user | |
| GET | `/notes/:id` | user | visibility-checked (owner or link/public) |
| PATCH | `/notes/:id` | user | autosave hits this; debounce ~800ms client-side |
| DELETE | `/notes/:id` | user | soft delete |
| POST | `/notes/:id/fork` | user | |
| GET | `/notes/:id/versions` | user | stub — always `{ versions: [] }` |
| POST | `/notes/:id/report` | user | `{reason}` → file a report; caller needs read access |
| POST | `/problems/resolve` | user | `{url}` → cached-or-fetched problem metadata; rate-limited |
| POST | `/revisions` | user | `{noteId}` → enroll |
| GET | `/revisions/due` | user | today's queue |
| POST | `/revisions/:id/review` | user | `{rating: 0-3}` → 0=Again 1=Hard 2=Good 3=Easy |
| GET | `/revisions/stats` | user | |
| GET | `/sheets` | user | |
| POST | `/sheets` | user | |
| GET | `/sheets/:id` | user | |
| PATCH | `/sheets/:id` | user | |
| DELETE | `/sheets/:id` | user | soft delete |
| PATCH | `/sheets/:id/items/:itemId` | user | status update |
| POST | `/sheets/:id/fork` | user | |
| POST | `/sheets/:id/report` | user | `{reason}` → file a report; caller needs read access |
| POST | `/cf/sync` | user | `{handle}`; rate-limited |
| GET | `/cf/stats` | user | stub — mock data |
| GET | `/dashboard/summary` | user | real aggregation: patternCounts, difficultyDistribution, streak, stalenessAlerts |
| GET | `/search` | user | stub — `?q=` → `{ query, results: [] }` |
| GET/POST/DELETE | `/admin/tags` | admin | `:id` on delete is the tag name, not a UUID |
| GET | `/admin/reports` | admin | open reports queue, includes `reporter` + `targetDetails` |
| PATCH | `/admin/reports/:id` | admin | `{status: 'resolved'\|'dismissed'}` |
| GET | `/health` | none | |

Full request/response bodies with working examples: import
`docs/AlgoVault.postman_collection.json` into Postman and hit them directly
against a running backend.

## Calling the API from a component — the pattern

Never call `fetch`/`axios` directly, and never call the low-level `http`
client. Always go through `client/src/api/apiClient.js`'s `api` object,
inside a React Query hook:

```jsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';

const { data, isLoading, isError, error } = useQuery({
  queryKey: queryKeys.notes(),
  queryFn: () => api.notes.list(),
});
```

See `client/src/features/vault/VaultPage.jsx` for the full reference
pattern (loading/error/empty states included) — copy this shape for every
new list/detail screen.

## Testing against the real backend

1. Get the backend URL from whoever owns `server/` (local `http://localhost:5000/api`
   or a deployed Render URL).
2. Set `client/.env`: `VITE_API_BASE_URL=<that-url>/api`, `VITE_USE_MOCKS=false`.
3. Register a real account through your own UI (don't reuse the seeded demo
   account for anything you plan to leave in a weird state — it's shared
   dev data).
4. If something 401s immediately and shouldn't, check `CLIENT_ORIGIN` in the
   backend's `.env` actually matches where your frontend is running (CORS).

## Something doesn't match this doc

This file can drift from the real implementation, especially around admin/
reports (added after the original contract) and search (may be `ILIKE` or
full-text depending on what got implemented). If a response shape surprises
you, check `shared/contract/dto.js` first, then ask the backend owner —
don't guess and build around undocumented behavior, since that's exactly
the kind of thing that breaks quietly later.
