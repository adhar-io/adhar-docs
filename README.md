# ADHAR Docs

> The Open Foundation for Cloud-Native Development

The source for [adhar.io](https://adhar.io): ADHAR's product pages, documentation, Adhar Kit guides and blog. It is a **fully static site**. There is no server, database or sign-in, so the whole build is plain files served from Netlify.

## Tech Stack

| Concern | Technology |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (SPA mode) on [Vite](https://vitejs.dev/) 8 |
| Routing | [TanStack Router](https://tanstack.com/router) (file-based, `src/routes/`) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| UI | [React](https://react.dev/) 19 + [shadcn/ui](https://ui.shadcn.com/) (Radix) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 4 (`@tailwindcss/vite`) |
| Content | Markdown in `src/content/`, compiled in at build time |
| Hosting | [Netlify](https://www.netlify.com/), deployed by GitHub Actions |

## How content works

- **Docs** — Markdown files under [`src/content/docs/`](src/content/docs/) (and `src/content/adhar-kit/` for the Kit) are bundled at build time. A file's path becomes its URL; a leading number and dash is dropped, so `core-concepts/6-ds-framework.md` is served at `/docs/core-concepts/ds-framework`.
- **Blog** — posts live in [`src/data/blogData.ts`](src/data/blogData.ts). Add or edit a post there and redeploy. Claps and bookmarks are stored in each visitor's browser.
- **Landing page** — copy and data are in [`src/data/landingPageData.ts`](src/data/landingPageData.ts); sections are in [`src/components/landing/`](src/components/landing/).
- **Contact and support** — email (`support@adhar.io`) and GitHub links. There are no forms.

## Getting Started

Requires **Node.js 22** (the same version CI and Netlify use) and **npm**.

```sh
git clone git@github.com:adhar-io/adhar-docs.git
cd adhar-docs
npm install
npm run dev        # http://localhost:8080
```

> **Apple Silicon note:** `node` on some Macs is a universal binary, so npm and the Vite build can run as different architectures. The `postinstall` script (`scripts/place-darwin-x64-bindings.mjs`) places both the `darwin-x64` and `darwin-arm64` native bindings (rolldown, lightningcss, tailwind-oxide) so the build works either way. It is macOS-only and idempotent. If a build ever fails with `Cannot find native binding`, run `node scripts/place-darwin-x64-bindings.mjs`.

### Environment

Optional. `.env.development` (used by `npm run dev` only) sets:

```sh
VITE_ADHAR_UI_URL="http://localhost:5173/"   # shows the "Adhar UI" nav link
```

Production builds don't read it, so the Adhar UI link is hidden unless `VITE_ADHAR_UI_URL` is set for the build. Never commit secrets: `.env` and `.env.local` are git-ignored.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/client` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

Type-check with `npx tsc --noEmit -p tsconfig.app.json`. (The root `tsconfig.json` only references the other configs and checks nothing on its own.)

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) type-checks, lints and builds on every push and pull request, then uploads `dist/client` with the Netlify CLI:

- **push to `main`** → production at [adhar.io](https://adhar.io)
- **pull request** → a preview URL, posted as a comment on the PR

It needs two repository secrets: `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`. [`netlify.toml`](netlify.toml) supplies the SPA fallback (`/* → /_shell.html`), long-lived caching for `/assets/*`, and the `www.adhar.io → adhar.io` redirect.

## Project Structure

```text
adhar-docs/
├── .github/workflows/      # CI + Netlify deploy
├── netlify.toml            # redirects and headers
├── scripts/                # postinstall native-binding placer (macOS)
├── src/
│   ├── routes/             # file-based routes (__root.tsx = document + providers)
│   ├── pages/              # page components
│   ├── components/         # UI (landing/, docs/, blog/, ui/ = shadcn)
│   ├── content/            # Markdown docs and Kit guides
│   ├── data/               # landing-page copy, blog posts
│   ├── lib/                # docs registry, search, versions, helpers
│   └── router.tsx          # router factory
└── vite.config.ts          # tanstackStart (SPA) + tailwindcss + react
```

## License

Proprietary — © ADHAR. All rights reserved.
