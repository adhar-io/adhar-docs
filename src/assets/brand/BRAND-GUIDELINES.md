# Adhar Brand & Identity Kit

This folder is the single source of truth for the Adhar visual identity.
Use these assets across the website, app, social media, banners, partner decks,
press, swag, and OSS GitHub presence.

```
src/assets/brand/
├── BRAND-GUIDELINES.md      ← you are here
├── logos/                   ← all logo lockup variations (PNG + SVG)
├── favicons/                ← app icons, favicons, PWA, Apple touch, maskable
└── social/                  ← ready-to-post banners for every major platform
```

---

## 1. Brand Foundation

- **Name:** ADHAR (always set in uppercase wordmark)
- **Tagline:** Open Cloud-Native Foundation
- **Promise:** Open Internal Developer Platform — 50+ services, 10-min provisioning via `adhar up`.
- **Personality:** Premium, expressive, technical. Confident, never noisy.

---

## 2. Color System

All colors are defined as HSL design tokens in `src/index.css`. Use the token,
never raw hex, in product code.

| Role | Hex | HSL | Token |
|---|---|---|---|
| Primary (Adhar Blue) | `#3B82F6` | `217 91% 60%` | `--primary` |
| Accent (Adhar Violet) | `#8B5CF6` | `262 83% 58%` | `--accent` |
| Spectrum Cyan | `#0FCEF7` | — | logo gradient start |
| Spectrum Magenta | `#B41DED` | — | logo gradient end |
| Ink (Foreground dark) | `#0F172A` | `222 84% 5%` | `--foreground` |
| Surface (Background dark) | `#0B1120` | `222 84% 5%` | `--background` (dark) |
| Surface (Background light) | `#FFFFFF` | `0 0% 100%` | `--background` (light) |
| Muted text | `#94A3B8` | `215 20% 65%` | `--muted-foreground` |

**Primary brand gradient** (use for wordmark, CTAs, highlights):
```
linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)
```

**Spectrum gradient** (use sparingly for hero motion / orbital effects):
```
linear-gradient(135deg, #0FCEF7 0%, #B41DED 100%)
```

---

## 3. Typography

| Use | Family | Weight | Tracking |
|---|---|---|---|
| Wordmark "ADHAR" | Inter | 800 ExtraBold | `-0.02em` |
| Headings (H1–H3) | Inter | 700 Bold | `-0.02em → -0.015em` |
| Body | Inter | 400 / 500 | normal |
| Tagline / eyebrow | Inter | 500 Medium | `0.18em` uppercase |
| Code & terminals | JetBrains Mono | 400 / 600 | normal |

---

## 4. Logo System

### When to use which lockup

| Scenario | File |
|---|---|
| Default on dark UI | `logos/logo-horizontal-gradient-dark.png` / `.svg` |
| Default on light UI | `logos/logo-horizontal-gradient-light.png` |
| Press / partner deck w/ tagline | `logos/logo-horizontal-tagline-dark.png` (or `-light`) |
| Single-color print, dark bg | `logos/logo-horizontal-mono-white.png` / `.svg` |
| Single-color print, light bg | `logos/logo-horizontal-mono-black.png` / `.svg` |
| Vertical / square placements (avatar, t-shirt center) | `logos/logo-stacked-gradient-*.png` |
| App tile, profile photo, favicon | `logos/app-icon-*-1024.png` |
| Tiny placements (≤32px) | `logos/symbol-gradient-*.png` |
| Embed in articles / READMEs | any `*-transparent.png` |
| Legacy spectrum palette | `logos/logo-horizontal-cyan-magenta.png` |

### Symbol exports
Pre-rendered at `64`, `128`, `256`, `512`, `1024` px.

### SVGs
All horizontal, stacked, and symbol-only lockups ship as SVG too — use these
in code and on the web for crisp, infinite scaling.

### Clear space & minimum size
- **Clear space:** at least the height of the "A" in the wordmark on all sides.
- **Minimum size:** horizontal lockup ≥ 96 px wide on screen / 24 mm in print.
  Below that, use the symbol-only mark.

### Don'ts
- Don't recolor the gradient. Pick gradient or mono — never invent new colors.
- Don't add drop shadows, outlines, or bevels in static assets.
- Don't rotate, skew, or vertically squash.
- Don't typeset "ADHAR" in any font other than Inter ExtraBold.
- Don't place the gradient mark on a busy photo — use mono white instead.

---

## 5. Favicons & App Icons

Drop-in ready in `favicons/`:

| File | Use |
|---|---|
| `favicon-16.png`, `favicon-32.png`, `favicon-48.png` | Browser tab |
| `favicon-180.png`, `apple-touch-icon.png` | iOS home screen |
| `favicon-192.png`, `favicon-512.png` | PWA manifest |
| `maskable-512.png` | Android adaptive icon (safe area baked in) |

Suggested `<head>` block:
```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#0B1120" />
```

---

## 6. Social Media Kit

All exports already match each platform's exact spec.

| Platform | File | Spec |
|---|---|---|
| Open Graph (og:image) | `social/og-image-1200x630.png` | 1200×630 |
| Twitter/X large card | `social/twitter-card-1600x900.png` | 1600×900 |
| Twitter/X header | `social/twitter-header-1500x500.png` | 1500×500 |
| LinkedIn personal banner | `social/linkedin-banner-1584x396.png` | 1584×396 |
| LinkedIn company cover | `social/linkedin-company-cover-1128x191.png` | 1128×191 |
| Instagram square post | `social/instagram-square-1080.png` | 1080×1080 |
| Instagram story / Reel | `social/instagram-story-1080x1920.png` | 1080×1920 |
| YouTube thumbnail | `social/youtube-thumbnail-1280x720.png` | 1280×720 |
| GitHub social preview | `social/github-social-1280x640.png` | 1280×640 |

To set the OG image globally, add to `index.html`:
```html
<meta property="og:image" content="/og-image-1200x630.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="/og-image-1200x630.png" />
```

---

## 7. Voice & Tone

- **Direct, technical, no marketing fluff.** Speak to platform engineers.
- **Show, don't promise.** Lead with commands (`adhar up`), metrics, demos.
- **Open by default.** Mention OSS, contributors, transparency.
- **Sentence case** for UI; **Title Case** only for proper nouns and headings.
- Numbers as digits (`50+ services`, `10-min provisioning`).

---

## 8. Regenerating the kit

Source script: `/tmp/build_brand.py` (re-run to refresh after symbol changes).
All raster assets are generated from `src/assets/adhar-symbol.png` + Inter.
