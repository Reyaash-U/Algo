# features/sheets

Owns: `/sheets` (list) and `/sheets/:id` (detail).

**Status:** implemented. `SheetsPage.jsx` lists sheets with an inline create
form (`api.sheets.create`) and delete (`api.sheets.remove`). `SheetDetailPage.jsx`
has the progress bar, a `CountdownBanner` from `targetDate`, inline edit
(title/description/target date via `api.sheets.update`), delete, a report
action for sheets you don't own, and item status cycling through
`SHEET_ITEM_STATUS` (`todo` → `in_progress` → `done`) via
`api.sheets.updateItem(id, itemId, {status})`.

**Still open:** no `ForkButton` on the detail page itself (forking currently
only happens from `/explore`); no UI for adding/removing individual items to
an existing sheet after creation.
