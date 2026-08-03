# features/revise

Owns: `/revise` — the daily Revision Queue.

**Build here:**
- `RevisionQueue` (list of due reviews, `api.revisions.due()`)
- `FlashcardView` (note hidden → revealed on click)
- `RatingBar` (Again/Hard/Good/Easy → `api.revisions.review(id, rating)`,
  rating values from `REVIEW_RATING` in `@algovault/shared`)
- `SessionSummary` after the queue is cleared

The SM-2 math is entirely server-side (`server/src/services/revisionService.js`,
already implemented + tested) — this feature only sends a rating 0-3 and
displays the result. Don't reimplement scheduling logic in the frontend.

`RevisePage.jsx` is scaffolded with the due-queue fetch wired.
