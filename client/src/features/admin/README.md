# features/admin

Owns: `/admin` — tag taxonomy management + reported-content queue. Route is
already gated to `role === 'admin'` by `ProtectedRoute`.

**Status:** implemented. `AdminPage.jsx` has a tag manager (add/delete,
`api.admin.listTags/createTag/deleteTag`) and an open-reports queue with
resolve/dismiss actions (`api.admin.reports/resolveReport`).

**Still open:** no pagination on the reports list; no bulk actions; tag
manager doesn't show which notes/sheets use a tag before deleting it.
