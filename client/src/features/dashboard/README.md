# features/dashboard

Owns: `/dashboard` — the weakness dashboard.

**Build here:** `PatternHeatmap`, `ConfidenceRadar`, `StreakWidget`,
`CFRatingGraph` (recharts), `StalenessAlerts`. Data source:
`api.dashboard.summary()` — shape is `DashboardSummary` in
`shared/contract/dto.js` (`mockDashboardSummary`).

`DashboardPage.jsx` fetches the summary; build the visualizations on top.
