# features/auth

Owns: `/auth` route — login + register forms.

**Status:** implemented. `AuthPage.jsx` has login and register forms wired
through `useAuth()`.

**Still open:**
- Client-side validation mirroring `server/src/validators/auth.validators.js`
  (email format, password min 8 chars, displayName 2-60 chars) so errors
  show before hitting the network — currently the server's 400 is the only
  feedback.
- A profile/settings screen. `PATCH /auth/me` (`api.auth.updateMe`) exists on
  the backend for editing `displayName`/`cfHandle` but has no UI yet —
  `cfHandle` can currently only be set as a side effect of a successful sync
  on the Dashboard.
- Google OAuth button (optional, v2 — backend doesn't implement this yet).

**Do not** call `api.auth.*` directly from components other than this
feature — route auth actions through `useAuth()` (`src/lib/authContext.jsx`)
so token state stays consistent app-wide.
