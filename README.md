# ADHAR Docs

> The Open Foundation for Cloud-Native Development

The ADHAR documentation and marketing site — a **full-stack TanStack Start application** with a built-in API and a **PostgreSQL** database (via Drizzle ORM). It hosts ADHAR's product pages, documentation, API reference, Adhar Kit guides, and a Postgres-backed blog with authentication.

## Tech Stack

| Concern | Technology |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (SPA mode) on [Vite](https://vitejs.dev/) 8 |
| Routing | [TanStack Router](https://tanstack.com/router) (file-based, `src/routes/`) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| UI | [React](https://react.dev/) 19 + [shadcn/ui](https://ui.shadcn.com/) (Radix) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 4 (`@tailwindcss/vite`) |
| Data fetching | [TanStack Query](https://tanstack.com/query) |
| API | TanStack Start **server routes** (`src/routes/api/**`) |
| Database | [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | JWT bearer tokens ([jose](https://github.com/panva/jose)) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| Validation | [Zod](https://zod.dev/) |

> Previously built on Vite + React Router + Supabase — both **React Router** and **Supabase** have been fully removed.

## Architecture

```text
Browser ──fetch──▶  /api/*  (TanStack Start server routes)  ──▶  Drizzle  ──▶  Postgres
   ▲                         src/routes/api/**                    src/server/db
   └── React app (TanStack Router, SPA) ── JWT in localStorage ──┘
```

- **Frontend** — file-based routes in [`src/routes/`](src/routes/) render the page components in [`src/pages/`](src/pages/). Global providers (Query, theme, auth, toasts) live in [`src/routes/__root.tsx`](src/routes/__root.tsx).
- **API** — server routes under [`src/routes/api/`](src/routes/api/) handle auth, posts (CRUD + moderation), profiles, and roles. They run on the server only and talk to Postgres via Drizzle.
- **Server logic** — framework-agnostic DB schema, auth, and helpers in [`src/server/`](src/server/).
- **Auth** — `POST /api/auth/login|signup` returns a JWT; the client stores it in `localStorage` and sends it as `Authorization: Bearer …`. Roles (`user`, `moderator`) gate posting and moderation.

## Prerequisites

- **Node.js** 20+ — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **Docker** (for local Postgres) — or any reachable PostgreSQL 16 instance
- **npm**

## Getting Started

### 1. Install

```sh
git clone <YOUR_GIT_URL>
cd adhar-docs
npm install
```

> **Apple Silicon note:** a `postinstall` script (`scripts/place-darwin-x64-bindings.mjs`) places `darwin-x64` native binaries (rolldown / lightningcss / tailwind-oxide) needed because the universal `node` runs the Vite build under Rosetta. It is macOS-only and idempotent.

### 2. Configure environment

Create a `.env` in the project root:

```sh
# Postgres (matches docker-compose.yml; host port 5433 avoids a local 5432)
DATABASE_URL=postgres://adhar:adhar@localhost:5433/adhar_docs

# Auth
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d

# Emails granted the moderator role on signup (comma-separated)
MODERATOR_EMAILS=you@example.com

# Seed admin (used by `npm run db:seed`)
SEED_ADMIN_EMAIL=you@example.com
SEED_ADMIN_PASSWORD=change-me

# Front-end links
VITE_ADHAR_UI_URL=http://localhost:5173/
VITE_ADHAR_CONSOLE_LOGIN_URL=http://localhost:5100/login
```

### 3. Start Postgres, migrate, and seed

```sh
docker compose up -d postgres   # Postgres 16 on localhost:5433
npm run db:migrate              # apply Drizzle migrations
npm run db:seed                 # create admin user + seed blog posts
```

### 4. Run the app

```sh
npm run dev
```

The app and API run on the same server at [http://localhost:8080](http://localhost:8080).

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the TanStack Start dev server (app + API) |
| `npm run build` | Production build (client + server + SPA shell) |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate a Drizzle migration from the schema |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed the admin user and blog posts |
| `npm run db:studio` | Open Drizzle Studio |

## API

All routes are under `/api`. Auth-gated routes require `Authorization: Bearer <token>`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Create an account → `{ token, user, roles }` |
| `POST` | `/api/auth/login` | Log in → `{ token, user, roles }` |
| `GET` | `/api/auth/me` | Current user + profile + roles |
| `GET` | `/api/posts` | List published posts (`?mine=true`, `?status=` for moderators) |
| `POST` | `/api/posts` | Create a post (auth) |
| `GET` | `/api/posts/:slug` | Get a post by slug or id |
| `PATCH` | `/api/posts/:id` | Update (author draft/rejected; moderators any) |
| `DELETE` | `/api/posts/:id` | Delete (author non-published; moderators any) |
| `POST` | `/api/posts/:id/moderate` | Approve / reject / publish (moderator) |
| `GET`/`PATCH` | `/api/profiles/me` | Read / update own profile |
| `GET` | `/api/profiles/:id` | Public profile subset |
| `GET`/`POST`/`DELETE` | `/api/roles` | Manage roles (moderator) |

## Project Structure

```text
adhar-docs/
├── docker-compose.yml      # Local Postgres 16
├── drizzle/                # Generated SQL migrations
├── drizzle.config.ts       # Drizzle Kit config
├── scripts/                # postinstall darwin-x64 binding placer
├── src/
│   ├── routes/             # File-based routes
│   │   ├── __root.tsx       #   root document + providers
│   │   ├── *.tsx            #   page routes
│   │   └── api/**           #   server-route API
│   ├── pages/              # Page components
│   ├── components/         # UI components (incl. shadcn/ui)
│   ├── server/             # DB schema, client, auth, serializers, helpers
│   ├── lib/api.ts          # Browser API client
│   ├── hooks/useAuth.tsx   # JWT auth context
│   ├── content/            # Markdown docs
│   └── router.tsx          # Router factory
└── vite.config.ts          # tanstackStart + tailwindcss + react
```

## Database

Schema lives in [`src/server/db/schema.ts`](src/server/db/schema.ts) (`users`, `profiles`, `user_roles`, `posts`). To change it: edit the schema, then `npm run db:generate` and `npm run db:migrate`.

## License

Proprietary — © ADHAR. All rights reserved.
