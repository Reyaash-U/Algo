# features/sheets

Owns: `/sheets` (list) and `/sheets/:id` (detail).

**Build here:** `SheetList`, `SheetDetail`, `ProgressBar`, `CountdownBanner`
(from `targetDate`), `ForkButton` (`api.sheets.fork(id)`). Item status updates
go through `api.sheets.updateItem(id, itemId, {status})` using
`SHEET_ITEM_STATUS` enum values from `@algovault/shared`.

`SheetsPage.jsx` and `SheetDetailPage.jsx` are scaffolded with the list/detail
fetch pattern (copy from `features/vault`).
