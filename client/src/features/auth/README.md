# features/auth

Owns: `/auth` route — login + register forms.

**Build here:**
- `AuthPage.jsx` (already scaffolded — login form wired to `useAuth().login()`)
- Register form / toggle
- Form validation (mirror `server/src/validators/auth.validators.js` rules:
  email format, password min 8 chars, displayName 2-60 chars) so the user
  sees errors before hitting the network.
- Google OAuth button (optional, v2 — backend doesn't implement this yet)

**Do not** call `api.auth.*` directly from components other than this
feature — route auth actions through `useAuth()` (`src/lib/authContext.jsx`)
so token state stays consistent app-wide.
