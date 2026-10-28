# features/revise

Owns: `/revise` — the daily Revision Queue.

**Status:** implemented. `RevisePage.jsx` fetches the due queue
(`api.revisions.due()`), shows a flashcard (hidden → revealed on click), and
rates recall via `api.revisions.review(id, rating)` using `REVIEW_RATING`
from `@algovault/shared`. New notes are auto-enrolled into the revision
queue server-side on creation (`noteService.createNote`), so the queue fills
up without any extra "enroll" step in the UI.

The SM-2 math is entirely server-side (`server/src/services/revisionService.js`,
already implemented + tested) — this feature only sends a rating 0-3 and
displays the result. Don't reimplement scheduling logic in the frontend.

**Still open:** no `SessionSummary` screen once the queue empties — it just
falls through to the empty state.
