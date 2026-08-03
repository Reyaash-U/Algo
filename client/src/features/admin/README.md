# features/admin

Owns: `/admin` — tag taxonomy management + reported-content queue. Route is
already gated to `role === 'admin'` by `ProtectedRoute`.

**Build here:** `TagManager` (`api.admin.listTags/createTag/deleteTag`),
`ReportQueue` (`api.admin.reports`).

`AdminPage.jsx` is a minimal working tag list to copy the pattern from.
