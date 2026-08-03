# AlgoVault

Problem-linked prep platform for competitive programming & placement students.
PERN (PostgreSQL · Express · React/Vite · Node), via Prisma ORM.

> **This repo is a foundation, not a finished app.** It exists so two people can
> build in parallel without colliding or blocking each other. Read
> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
> [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md) **before writing any code.**

---

## The one rule that makes parallel work possible

**The API contract in [`shared/contract/`](shared/contract) is the boundary between frontend and backend.**
Both sides import it. If you change a response shape, change it there — and both
sides find out immediately instead of at integration time.

- Backend implements the logic *behind* the contract.
- Frontend builds *against* the contract (using mocks until the backend is live).
- Nobody waits on anybody. The contract is the handshake.

Do **not** invent ad-hoc response shapes in a controller or hard-code a JSON
shape in a React component. If the contract doesn't cover your case, add it to
the contract *first*, ping the team, then implement.

---

## Quick start

This repo uses **npm workspaces** — one install at the root wires up `shared/`,
`server/`, and `client/` together (including the `@algovault/shared` link both
packages depend on).

You'll need a PostgreSQL database — either running locally, or a free hosted
one (Supabase, Neon, Render Postgres all work).

```bash
# From the repo root — installs all three packages in one shot
npm install

# Backend
cd server
cp .env.example .env         # fill in DATABASE_URL + JWT secrets (see below)
npm run db:push              # creates the tables from prisma/schema.prisma
npm run dev                  # http://localhost:5000  (nodemon)

# Frontend  (new terminal)
cd client
cp .env.example .env
npm run dev                  # http://localhost:5173  (vite)
```

Convenience scripts also work from the root without `cd`ing in:
`npm run dev:server`, `npm run dev:client`, `npm run test:server`,
`npm run build:client`, `npm run seed`, `npm run lint`.

The backend boots with **every route stubbed**. Hit `GET /api/health` to confirm
it's alive. Every other endpoint returns realistic mock data with a
`X-Stub: true` header until the owning dev replaces the stub with a real service.

The frontend runs entirely on mocks by default (`VITE_USE_MOCKS=true`) — you
can build and click through every screen with zero backend running. Flip
that flag to `false` once you want to hit the real server.

Both `npm run build` (client) and `npm test` (server) are verified working
in this repo as delivered.

---

## Who owns what (see docs/OWNERSHIP.md for the full matrix)

| Area | Owner |
|---|---|
| Shared contract, `server/` (models, auth, middleware, routes, controllers, services) | **You** |
| `client/` — all React screens, components, API client, state | **Your teammate** |

**Golden boundary:** your teammate never edits anything under `server/` or
`shared/contract/`. You don't edit `client/`. If you need something across
the line, it goes through the **contract** — see `docs/OWNERSHIP.md`.

---

## Read next

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the contract, backend, and frontend fit together
- [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md) — who owns what, the golden boundary rule
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — branching, PR rules, adding a new endpoint end-to-end

## Repo layout

```
algovault/
├── shared/contract/     ← THE handshake. Endpoints, DTO shapes, error codes, enums.
├── server/              ← Express API (layered: routes→controllers→services→models) + prisma/schema.prisma
├── client/              ← React SPA (Vite), feature-folder structure
├── docs/                ← ARCHITECTURE, OWNERSHIP, CONTRIBUTING
└── .github/workflows/   ← CI (Postgres service + SM-2 unit tests on every push)
```

## Branching & PRs

- `main` is protected. No direct pushes.
- Branch naming: `be/<thing>`, `fe/<thing>`.
- Review each other's PRs — see `docs/CONTRIBUTING.md` for what needs a closer look.
- CI (lint + tests, real Postgres in CI) must be green to merge.

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).
