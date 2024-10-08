import path from 'node:path';
import { fileURLToPath } from 'node:url';

import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwind from '@astrojs/tailwind';
import compress from 'astro-compress';
import icon from 'astro-icon';
import { defineConfig, squooshImageService } from 'astro/config';
import { VitePWA } from 'vite-plugin-pwa';

import { ANALYTICS, SITE } from './src/utils/config.ts';
import { readingTimeRemarkPlugin } from './src/utils/frontmatter.mjs';
import tasks from './src/utils/tasks';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const whenExternalScripts = (items = []) =>
  ANALYTICS.vendors.googleAnalytics.id &&
  ANALYTICS.vendors.googleAnalytics.partytown
    ? Array.isArray(items)
      ? items.map((item) => item())
      : [items()]
    : [];

// https://astro.build/config
export default defineConfig({
  site: SITE.site,
  base: SITE.base,
  trailingSlash: SITE.trailingSlash ? 'always' : 'never',
  output: 'static',
  integrations: [
    tailwind({
      applyBaseStyles: false
    }),
    starlight({
      title: 'Adhar.io',
      social: {
        github: 'https://github.com/adhar-io/adhar'
      },
      sidebar: [
        {
          label: 'Guides',
          items: [
            // Each item here is one entry in the navigation menu.
            // {
            //   label: 'Example Guide',
            //   slug: 'guides/example'
            // }
          ]
        },
        {
          label: 'Reference',
          autogenerate: {
            directory: 'reference'
          }
        }
      ]
    }),
    sitemap(),
    mdx(),
    icon({
      include: {
        tabler: ['*'],
        'flat-color-icons': [
          'template',
          'gallery',
          'approval',
          'document',
          'advertising',
          'currency-exchange',
          'voice-presentation',
          'business-contact',
          'database'
        ]
      }
    }),
    ...whenExternalScripts(() =>
      partytown({
        config: {
          forward: ['dataLayer.push']
        }
      })
    ),
    tasks(),
    compress({
      CSS: true,
      HTML: false,
      Image: false,
      JavaScript: true,
      SVG: true,
      Logger: 1
    }),
    react()
  ],
  image: {
    service: squooshImageService()
  },
  markdown: {
    remarkPlugins: [readingTimeRemarkPlugin]
  },
  vite: {
    plugins: [VitePWA()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  }
});
