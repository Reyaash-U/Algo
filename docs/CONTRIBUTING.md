# Contributing

## Branching

`main` is protected — no direct pushes, everything through a PR.

Two lanes, two prefixes:

- `be/<thing>` — You: contract, models, middleware, routes, controllers, services, jobs, docs, CI
- `fe/<thing>` — Teammate: anything under `client/`

Examples: `be/revision-controller`, `be/problem-resolver-cache`,
`fe/note-editor-codemirror`, `fe/revision-flashcard-view`.

## PRs

- With just two of you, review each other's PRs — you review teammate's
  `fe/*` PRs for anything that looks like it crosses into contract
  assumptions; they review your `be/*` PRs when they touch anything the
  frontend depends on (response shapes, new endpoints). A quick skim is
  enough for pure-UI or pure-service-logic changes either of you doesn't
  touch — the point is a second pair of eyes on contract-adjacent changes,
  not a formal gate on everything.
- CI must be green (lint + SM-2 tests) before merge.
- Keep PRs scoped to one feature/fix. A PR that touches both `server/` and
  `client/` is a signal the contract should have changed first — split it.

## Commit messages

No strict convention enforced, but lead with the area for scanability:
`be: implement problemFetchService cache-aside logic`
`fe: wire NoteEditor autosave debounce`
`core: add targetDate validation to sheet contract`

## Before you open a PR

```bash
# Backend
cd server && npm test && npm run lint

# Frontend
cd client && npm run build && npm run lint
```

Both must pass locally — CI runs the same checks and will block merge
otherwise.

## Adding a new endpoint (the full loop)

1. **You** add it to `shared/contract/endpoints.js` (and a DTO/mock in
   `dto.js` if it's a new entity shape) — smallest possible commit, do this
   first so your teammate isn't blocked.
2. **You** add the route file (or extend an existing one), mounting the
   right middleware, and write the controller + service.
3. **Teammate** adds the method to the relevant namespace in
   `api/apiClient.js` if it isn't already there from step 1's registry, adds
   a mock handler in `api/mockLayer.js`, builds the UI against it.

Step 3 can start the moment step 1 merges — your teammate doesn't need to
wait for step 2 since they build against mocks either way.
