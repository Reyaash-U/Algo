# features/explore

Owns: `/explore` — public sheets/notes browsing + forking.

**Build here:** `PublicSheets`, `PublicNotes` (forkable). Both hit the same
`api.notes.list()` / `api.sheets.list()` endpoints server-side filtered to
`visibility: public` — coordinate with Backend Dev on whether that filter is
a query param or a separate endpoint once they implement it for real
(currently stubbed to return the requesting user's own items).

`ExplorePage.jsx` is a placeholder — build out once the backend's public
listing filter exists.
