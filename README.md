# Astro Starter Kit: Vite PWA

[![Netlify Status](https://api.netlify.com/api/v1/badges/d9a36b8e-535f-4cd0-ae48-73d669a13fcc/deploy-status)](https://app.netlify.com/sites/adhar/deploys)

```sh
npm create astro@latest -- --template with-vite-plugin-pwa
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/with-vite-plugin-pwa)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/with-vite-plugin-pwa)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/with-vite-plugin-pwa/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## :battery: Technology Stack

This repository comes 🔋 packed with:

- **Astro**;
- **TypeScript**;
- **TailwindCSS**;
- **SASS**;
- **PostCSS**;
- **Playwright**;
- **Vite**;

And with tools that enhance the development experience:

- **ESLint**;
- **Prettier**;
- **Husky**;
- **Commitlint**;

[Back to:arrow_up:](#astro-vanilla-typescript--template "Back to 'Table of contents' section")

## :globe_with_meridians: Browsers support

The provided configuration ensures **92.3%** coverage for all browsers, in particular of the following:

|            Chrome             |             Firefox              |             Edge             |        Opera         | Safari                       |
| :---------------------------: | :------------------------------: | :--------------------------: | :------------------: | ---------------------------- |
| ![Google Chrome][chrome-icon] | ![Mozilla Firefox][firefox-icon] | ![Microsoft Edge][edge-icon] | ![Opera][opera-icon] | ![Apple Safari][safari-icon] |

**\*** In order to support a wider percentage of browsers, update the `./.browserslistrc` configuration file:

1. `last 3 versions`: browser version;
2. `> 0.2%`: browser usage statistics;
3. `not dead`: whether the browser is officially supported;

Update the configuration [here][browserslist] and check in real-time the **global browsers support**.

**\* The more versions to support, larger JS and CSS bundles size will be.**

[Back to:arrow_up:](#astro-vanilla-typescript--template "Back to 'Table of contents' section")
