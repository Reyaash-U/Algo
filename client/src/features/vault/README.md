# features/vault

Owns: `/vault` (note list) and `/note/:id` (editor).

**Build here:**
- `NoteList`, `NoteFilters`, `TagSidebar` (spec §10)
- `NoteEditor` (CodeMirror 6), `CodeBlockTabs`, `ComplexityFields`,
  `ProblemLinkCard`, `VersionHistoryDrawer`, `ShareModal`
- Autosave: debounce `api.notes.update` calls ~800ms (spec says 800ms to match
  backend's optimistic-mutation expectations)
- Cmd+K quick capture (`api.search.query`)

`VaultPage.jsx` and `NoteDetailPage.jsx` are scaffolded with working React
Query hooks (`useNotesList`, `useNote`) as the pattern to copy for every other
list/detail feature in this repo.
