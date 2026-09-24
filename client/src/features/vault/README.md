# features/vault

Owns: `/vault` (note list) and `/note/:id` (editor).

**Status:** implemented. `VaultPage.jsx` lists notes with delete
(`api.notes.remove`). `NoteFormPage.jsx` has the editor (title, pattern tags,
one code block with time/space complexity, markdown content) plus a
`ProblemLinkCard`-style resolver: paste a LeetCode/Codeforces/GfG URL, hit
Resolve (`api.problems.resolve`), and the problem gets linked
(`problemId`) and auto-fills title/tags if empty. `NoteDetailPage.jsx` shows
the linked problem, a `VersionHistoryDrawer` (`api.notes.versions` — the
backend snapshots the previous title/content on every edit), edit/delete for
the owner, and a report action for notes you don't own.

**Still open:**
- `CodeBlockTabs` — only a single code block is supported in the form, even
  though the DTO (`codeBlocks: []`) and backend support multiple.
- `TagSidebar` / filter UI — `api.notes.list({ tag, q, visibility })` already
  supports server-side filtering, nothing in the UI calls it with params yet.
- `ShareModal` — visibility is fixed at creation; no UI to change
  private/link/public after the fact.
- Cmd+K quick capture (`api.search.query`).
- Autosave — `PATCH /notes/:id` has its own rate-limit bucket sized for an
  ~800ms debounce, but the form currently only saves on explicit submit.
