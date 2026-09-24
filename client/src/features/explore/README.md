# features/explore

Owns: `/explore` — public sheets/notes browsing + forking.

**Status:** implemented. `ExplorePage.jsx` lists public notes/sheets via
`api.search.query('')` (backend: `searchServiceDb.js`, filters to
`visibility: 'public'`), with fork (`api.notes.fork`/`api.sheets.fork`) and
report (`api.notes.report`/`api.sheets.report`) actions per card.

**Still open:** no search input wired up yet — it always queries with an
empty string and relies on the backend's default ordering/limit (30 items
per type). No tag/platform filtering.
