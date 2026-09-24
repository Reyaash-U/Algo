# features/dashboard

Owns: `/dashboard` — the weakness dashboard.

**Status:** implemented. `PatternHeatmap`, `ConfidenceRadar`, `StalenessAlerts`
render from `api.dashboard.summary()`. Streak and 7-day revision retention
widgets use real data (`summary.streak`, `api.revisions.stats()`). Codeforces
connect/sync is wired (`api.cf.sync`/`api.cf.stats`) — shows a "Connect"
form when no handle is synced yet, otherwise the real handle/rating badge
with a re-sync button.

**Still open:**
- `CFRatingGraph` — `cfStats.ratingHistory` is available from the backend but
  not yet charted (recharts is already a dependency).
- `SubmissionHeatmap` renders a deterministic placeholder grid — there's no
  per-day activity log on the backend to drive it yet.
