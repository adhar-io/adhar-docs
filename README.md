<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="src/assets/branding/adhar-logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="src/assets/branding/adhar-logo.svg">
  <img alt="Adhar — Open Cloud-Native Foundation" src="src/assets/branding/adhar-logo.svg" width="300">
</picture>

<h1>Adhar Docs - Website, documentation and tech blogs</h1>

[![Website](https://img.shields.io/badge/website-adhar.io-4f46e5?style=flat-square)](https://adhar.io)
[![Deploy](https://img.shields.io/github/actions/workflow/status/adhar-io/adhar-docs/deploy.yml?branch=main&label=deploy&style=flat-square&logo=netlify&logoColor=white)](https://github.com/adhar-io/adhar-docs/actions/workflows/deploy.yml)
[![Slack](https://img.shields.io/badge/slack-join_community-4A154B?style=flat-square&logo=slack)](https://join.slack.com/t/adharworkspace/shared_invite/zt-26586j9sx-QGrIejNigvzGJrnyH~IXww)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TanStack Start](https://img.shields.io/badge/TanStack_Start-SPA-FF4154?style=flat-square)](https://tanstack.com/start)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

<h3>Adhar • Built with ❤️ for developers!</h3>

</div>

---

## 🎯 What is this repository?

**Sanskrit: अधार (Adhāra) – Foundation**

[Adhar](https://github.com/adhar-io/adhar) is an open-source Internal Developer Platform: 100+ curated cloud-native packages, wired together and brought up with a single `adhar up`. This repository is everything you see at **[adhar.io](https://adhar.io)** — the marketing site, the platform documentation, the Adhar Kit documentation and the blog.

It is a **fully static site**. There is no server, database or sign-in: the build is plain files, served from Netlify. Docs and blog posts are Markdown, compiled in at build time, so publishing is a pull request.

> **Accuracy first.** Every page describes the real platform. Claims are checked against the source in [`adhar-io/adhar`](https://github.com/adhar-io/adhar) — commands against the CLI, fields against the schemas, "on in profile X" against the profile configs. If something can't be verified, it doesn't go on the site.

---

## 🧭 What's on the site

| Section | Path | Source |
|---|---|---|
| **Landing page** | [`/`](https://adhar.io) | [`src/components/landing/`](src/components/landing/), copy in [`src/data/landingPageData.ts`](src/data/landingPageData.ts) |
| **Platform docs** | [`/docs`](https://adhar.io/docs) | Markdown in [`src/content/docs/`](src/content/docs/) — getting started, core concepts, guides, operations, providers, security, platform engineering, reference |
| **Adhar Kit docs** | [`/adhar-kit`](https://adhar.io/adhar-kit) | Markdown in [`src/content/adhar-kit/`](src/content/adhar-kit/) |
| **Blog** | [`/blog`](https://adhar.io/blog) | Markdown in [`src/content/blog/`](src/content/blog/) |
| **Integrations** | [`/integrations`](https://adhar.io/integrations) | [`src/pages/Integrations.tsx`](src/pages/Integrations.tsx) |
| **Pricing, Contact, Support, …** | `/pricing`, `/contact`, `/support` | [`src/pages/`](src/pages/) |

**Docs features:** full-text search (<kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd> or <kbd>/</kbd>), a version picker backed by GitHub Releases, deep-linkable headings, 100 hand-built SVG diagrams, and light/dark themes.

---

## 🛠️ Tech Stack

| Concern | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) in SPA mode, on [Vite](https://vitejs.dev/) 8 |
| Routing | [TanStack Router](https://tanstack.com/router) — file-based, in [`src/routes/`](src/routes/), with typed links |
| UI | [React](https://react.dev/) 19 + [shadcn/ui](https://ui.shadcn.com/) (Radix) + [lucide](https://lucide.dev) icons |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 4 (`@tailwindcss/vite`) |
| Content | Markdown via `react-markdown` + GFM + highlight.js; front matter parsed at build time |
| Search | Client-side index over every docs page, split at headings ([`src/lib/docsSearch.ts`](src/lib/docsSearch.ts)) |
| Language | [TypeScript](https://www.typescriptlang.org/) (`strictNullChecks` on) |
| Hosting | [Netlify](https://www.netlify.com/), deployed by GitHub Actions |

---

## 🚀 Quick Start

**Prerequisites:** Node.js 22 (what CI and Netlify use) and npm.

```sh
git clone git@github.com:adhar-io/adhar-docs.git
cd adhar-docs
npm install
npm run dev        # http://localhost:8080
```

> **Apple Silicon note:** `node` on some Macs is a universal binary, so npm and the Vite build can run as different architectures. The `postinstall` script ([`scripts/place-darwin-x64-bindings.mjs`](scripts/place-darwin-x64-bindings.mjs)) places both the `darwin-x64` and `darwin-arm64` native bindings for rolldown, lightningcss and tailwind-oxide, so the build works either way. If a build fails with `Cannot find native binding`, run `node scripts/place-darwin-x64-bindings.mjs`.

### Environment

Optional. [`.env.development`](.env.development) (read by `npm run dev` only) sets:

```sh
VITE_ADHAR_UI_URL="http://localhost:5173/"   # shows the "Adhar UI" nav link
```

Production builds don't read it, so the Adhar UI link stays hidden unless `VITE_ADHAR_UI_URL` is set for the build. Never commit secrets — `.env` and `.env.local` are git-ignored.

---

## ✍️ Writing content

### Docs pages

Add a Markdown file under [`src/content/docs/<section>/`](src/content/docs/). Its path becomes its URL, and a leading `N-` number is dropped from each segment:

```text
src/content/docs/core-concepts/6-ds-framework.md  →  /docs/core-concepts/ds-framework
```

```markdown
---
title: "Platform Services"
section: "Core Concepts"
order: 3
---

# Platform Services
…
```

Two special fences are available:

- ` ```diagram <key> ` renders a registered SVG diagram (registry in [`src/components/docs/diagrams/`](src/components/docs/diagrams/)).
- ` ```terminal ` renders a command and its output in terminal chrome.

Link to other pages with site paths (`/docs/guides/onboard-a-team#how-access-is-granted`). Heading anchors use the same slugger as the renderer, so a link to a heading is checkable.

### Blog posts

Add `src/content/blog/<slug>.md`. The file name is the URL. Cover art is generated in the brand style ([`BlogCover.tsx`](src/components/blog/BlogCover.tsx)), so no image is needed: a new post uses its category's scene until you add its own entry to `SCENES`.

```markdown
---
title: "GitOps in practice with ArgoCD"
excerpt: "One or two sentences for cards and previews."
category: "DevOps"            # Platform Updates · DevOps · Security · AI/ML
author: "Adhar Team"
date: "2026-09-18"
featured: false
tags: ["GitOps", "ArgoCD"]
---
```

### House style

- Plain English, short sentences, active voice, British spelling (*organisation*, *licence*).
- Say what something is and why before how. Number steps, state prerequisites up front, and show how to verify each step.
- No invented metrics, customers, quotes or benchmarks. Say "100+ packages", not an exact count that drifts.
- Mark what is production-profile only versus on locally.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server on port 8080 |
| `npm run build` | Production build into `dist/client` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

**Quality checks** (the same ones CI runs):

```sh
npx tsc --noEmit -p tsconfig.app.json   # type-check (the root tsconfig.json only references the others)
npx eslint src                          # lint
npm run build                           # build
```

---

## 🌐 Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) type-checks, lints and builds on every push and pull request, then uploads `dist/client` with the Netlify CLI:

- **push to `main`** → production at [adhar.io](https://adhar.io)
- **pull request** → a preview URL, posted as a comment on the PR

It needs two repository secrets: `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`. [`netlify.toml`](netlify.toml) supplies the SPA fallback (`/* → /_shell.html`), long-lived caching for `/assets/*`, and the `www.adhar.io → adhar.io` redirect.

---

## 🗂️ Project Structure

```text
adhar-docs/
├── .github/workflows/      # CI + Netlify deploy
├── netlify.toml            # redirects and headers
├── scripts/                # postinstall native-binding placer (macOS)
├── public/                 # static files served as-is
├── src/
│   ├── routes/             # file-based routes (__root.tsx = document + providers)
│   ├── pages/              # page components
│   ├── components/
│   │   ├── landing/        #   landing-page sections
│   │   ├── docs/           #   docs shell, search, version picker, diagrams
│   │   ├── blog/           #   blog cards, covers, markdown
│   │   └── ui/             #   shadcn/ui primitives
│   ├── content/            # Markdown: docs/, adhar-kit/, blog/
│   ├── data/               # landing-page copy, blog loader
│   ├── lib/                # docs registry, search, versions, helpers
│   └── assets/branding/    # Adhar logos, wordmarks, banner and poster artwork
└── vite.config.ts          # tanstackStart (SPA) + tailwindcss + react
```

---

## 🔗 Related repositories

| Repository | What it is |
|---|---|
| [`adhar-io/adhar`](https://github.com/adhar-io/adhar) | The Adhar platform and the `adhar` CLI — the source of truth these docs describe |
| [`adhar-io/adhar-kit`](https://github.com/adhar-io/adhar-kit) | The Java toolkit documented under `/adhar-kit` |
| [`adhar-io/adhar-console`](https://github.com/adhar-io/adhar-console) | The Backstage-based developer console |
| [`adhar-io/adhar-templates`](https://github.com/adhar-io/adhar-templates) | Golden-path templates |
| [`adhar-io/adhar-ui`](https://github.com/adhar-io/adhar-ui) | The Adhar design system |

---

## 🤝 Contributing

1. Fork the repo and create a branch.
2. Make your change, checking any platform claim against [`adhar-io/adhar`](https://github.com/adhar-io/adhar).
3. Run the quality checks above.
4. Open a pull request — you'll get a preview URL to review the rendered page.

Questions? Join the [Slack community](https://join.slack.com/t/adharworkspace/shared_invite/zt-26586j9sx-QGrIejNigvzGJrnyH~IXww) or [open an issue](https://github.com/adhar-io/adhar-docs/issues).

