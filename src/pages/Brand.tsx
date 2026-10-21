import React, { useState } from "react";
import { Check, Copy, Download, FileArchive, Loader2, Mail, X } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import SectionHeader from "@/components/landing/SectionHeader";
import { btnPrimary, btnSecondary, focusRing } from "@/components/landing/styles";
import { copyText, fetchText, makeZip, saveBlob, svgToPng, type ZipEntry } from "@/lib/brandKit";

/*
 * Brand & press kit. Content follows the official brand guide in the platform
 * repo (adhar/docs/images/branding/README.md); the SVGs are served from
 * public/brand/ so each has a stable URL.
 */

type Bg = "light" | "dark";

interface Asset {
  file: string;
  name: string;
  use: string;
  bg: Bg;
  /** PNG widths offered; banners export at their native size. */
  pngWidths: number[];
}

const LOGOS: Asset[] = [
  { file: "adhar-logo.svg", name: "Logo", use: "Full logo, light backgrounds", bg: "light", pngWidths: [512, 1024, 2048] },
  { file: "adhar-logo-dark.svg", name: "Logo — dark", use: "Full logo, dark backgrounds", bg: "dark", pngWidths: [512, 1024, 2048] },
];
const SYMBOLS: Asset[] = [
  { file: "symbol-color.svg", name: "Symbol", use: "Primary gradient symbol — favicons, avatars", bg: "light", pngWidths: [256, 512, 1024] },
  { file: "symbol-light.svg", name: "Symbol — slate", use: "Monochrome, light backgrounds and one-colour print", bg: "light", pngWidths: [256, 512, 1024] },
  { file: "symbol-dark.svg", name: "Symbol — white", use: "Monochrome, dark backgrounds and one-colour print", bg: "dark", pngWidths: [256, 512, 1024] },
];
const WORDMARKS: Asset[] = [
  { file: "wordmark-color.svg", name: "Wordmark", use: "Primary gradient “ADHAR”", bg: "light", pngWidths: [800, 1600] },
  { file: "wordmark-light.svg", name: "Wordmark — slate", use: "Slate text for light backgrounds", bg: "light", pngWidths: [800, 1600] },
  { file: "wordmark-dark.svg", name: "Wordmark — white", use: "White text for dark backgrounds", bg: "dark", pngWidths: [800, 1600] },
];
const BANNERS: (Asset & { size: string; platform: string })[] = [
  { file: "banner-github-social.svg", name: "GitHub social preview", platform: "GitHub repository", size: "1280 × 640", use: "", bg: "dark", pngWidths: [1280] },
  { file: "banner-og.svg", name: "Open Graph", platform: "Link previews", size: "1200 × 630", use: "", bg: "dark", pngWidths: [1200] },
  { file: "banner-x-header.svg", name: "X header", platform: "X (Twitter) profile", size: "1500 × 500", use: "", bg: "dark", pngWidths: [1500] },
  { file: "banner-linkedin.svg", name: "LinkedIn banner", platform: "LinkedIn page", size: "1584 × 396", use: "", bg: "dark", pngWidths: [1584] },
];

const PALETTE = [
  { name: "Brand Blue", hex: "#3B82F6", use: "Gradient start, links, accents" },
  { name: "Brand Indigo", hex: "#6366F1", use: "Gradient midpoint" },
  { name: "Brand Violet", hex: "#8B5CF6", use: "Gradient end" },
  { name: "Ink", hex: "#0F172A", use: "Dark backgrounds, slate assets" },
  { name: "Slate", hex: "#1E293B", use: "Dark background gradient end" },
  { name: "Text on dark", hex: "#E2E8F0", use: "Headlines on dark" },
  { name: "Secondary on dark", hex: "#94A3B8", use: "Supporting text on dark" },
  { name: "Muted", hex: "#64748B", use: "Taglines, captions" },
];
const GRADIENT_CSS = "linear-gradient(90deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)";

const BOILERPLATE_SHORT =
  "Adhar is an open-source Internal Developer Platform. One command, adhar up, brings up 100+ curated cloud-native packages — GitOps, self-service infrastructure, single sign-on, secrets, a signed supply chain and observability — on a laptop, a public cloud or your own hosts.";
const BOILERPLATE_LONG = `${BOILERPLATE_SHORT} Adhar is licensed under Apache 2.0 and developed in the open at github.com/adhar-io/adhar. Learn more at adhar.io.`;

const PRESS_EMAIL = "press@adhar.io";
const SLACK = "https://join.slack.com/t/adharworkspace/shared_invite/zt-26586j9sx-QGrIejNigvzGJrnyH~IXww";

const BRAND_TXT = `ADHAR BRAND & PRESS KIT
https://adhar.io/brand

NAME
  Write "Adhar" (Sanskrit: अधार, Adhāra — foundation). All-caps "ADHAR" appears only in the wordmark.
  First mention: "Adhar, the open foundation for cloud-native platform engineering"
  Slogan: "Adhar • Built with ❤️ for developers!"

COLOURS
${PALETTE.map((c) => `  ${c.name.padEnd(18)} ${c.hex}  ${c.use}`).join("\n")}
  Brand gradient: Blue → Indigo → Violet, left to right. CSS: ${GRADIENT_CSS}

TYPOGRAPHY
  Inter (SIL OFL) — wordmark 800, headlines 600, body and captions 500.

USAGE
  Do: prefer the full logo; use the symbol alone when space is tight. Keep clear space of at least one
      hexagon's height. Use dark variants on dark backgrounds, light on light. Scale proportionally;
      minimum symbol size 24 px.
  Don't: recolour, rotate, outline or add effects. Place the gradient logo on mid-tone or clashing
      gradients. Alter the wordmark's font, weight or spacing. Imply endorsement of third-party products.

BOILERPLATE
  ${BOILERPLATE_LONG}

LICENCE
  These assets may be used to refer to the Adhar project (articles, talks, integrations).
  They are not licensed for use as your own product branding.

CONTACT
  ${PRESS_EMAIL}
`;

/* -------------------------------- UI bits ------------------------------- */

const previewBg: Record<Bg, string> = {
  light: "bg-white",
  dark: "bg-[#0F172A]",
};

function useFlash(): [string | null, (key: string) => void] {
  const [flash, setFlash] = useState<string | null>(null);
  return [
    flash,
    (key: string) => {
      setFlash(key);
      setTimeout(() => setFlash((k) => (k === key ? null : k)), 1600);
    },
  ];
}

const AssetCard = ({ asset, wide }: { asset: Asset & { size?: string; platform?: string }; wide?: boolean }) => {
  const [width, setWidth] = useState(asset.pngWidths[Math.min(1, asset.pngWidths.length - 1)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = `/brand/${asset.file}`;
  const base = asset.file.replace(/\.svg$/, "");

  const downloadPng = async () => {
    setBusy(true);
    setError(null);
    try {
      const png = await svgToPng(await fetchText(src), width);
      saveBlob(png, `${base}-${width}.png`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PNG export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-xs)]">
      <div className={`${previewBg[asset.bg]} flex items-center justify-center ${wide ? "aspect-[2/1] p-0" : "aspect-[16/10] p-8"} border-b border-border/70`}>
        <img src={src} alt={`${asset.name} preview`} className={wide ? "h-full w-full object-cover" : "max-h-40 max-w-[75%] object-contain"} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold tracking-tight text-foreground">{asset.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{asset.platform ? `${asset.platform} · ${asset.size}` : asset.use}</p>
        <div className="mt-auto pt-5 flex flex-wrap items-center gap-2">
          <a
            href={src}
            download={asset.file}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-border/70 px-3.5 text-sm font-medium text-foreground hover:bg-muted transition-colors ${focusRing}`}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            SVG
          </a>
          <div className="inline-flex h-9 items-center overflow-hidden rounded-full border border-border/70">
            <button
              type="button"
              onClick={downloadPng}
              disabled={busy}
              className={`inline-flex h-full items-center gap-1.5 pl-3.5 pr-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60 ${focusRing}`}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}
              PNG
            </button>
            {asset.pngWidths.length > 1 ? (
              <select
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                aria-label={`PNG width for ${asset.name}`}
                className={`h-full border-l border-border/70 bg-transparent pl-2 pr-1 text-xs text-muted-foreground ${focusRing}`}
              >
                {asset.pngWidths.map((w) => (
                  <option key={w} value={w}>
                    {w}px
                  </option>
                ))}
              </select>
            ) : (
              <span className="border-l border-border/70 px-2 text-xs text-muted-foreground">{width}px</span>
            )}
          </div>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </article>
  );
};

const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const [flash, trigger] = useFlash();
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) trigger("ok");
        else trigger("fail");
      }}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors ${focusRing}`}
    >
      {flash === "ok" ? <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {flash === "ok" ? "Copied" : flash === "fail" ? "Copy blocked — select the text" : label}
      <span className="sr-only" aria-live="polite">{flash === "ok" ? `${label} copied` : ""}</span>
    </button>
  );
};

/* ------------------------------- the page -------------------------------- */

const ALL_ASSETS: Asset[] = [...LOGOS, ...SYMBOLS, ...WORDMARKS, ...BANNERS];

const Brand = () => {
  const [zipState, setZipState] = useState<"idle" | "busy" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [swatchFlash, flashSwatch] = useFlash();

  const downloadAll = async () => {
    setZipState("busy");
    setProgress(0);
    try {
      const enc = new TextEncoder();
      const entries: ZipEntry[] = [{ name: "adhar-brand-kit/BRAND.txt", data: enc.encode(BRAND_TXT) }];
      let done = 0;
      for (const a of ALL_ASSETS) {
        const svg = await fetchText(`/brand/${a.file}`);
        const base = a.file.replace(/\.svg$/, "");
        const folder = BANNERS.includes(a as (typeof BANNERS)[number]) ? "banners" : "logos";
        entries.push({ name: `adhar-brand-kit/svg/${folder}/${a.file}`, data: enc.encode(svg) });
        const w = a.pngWidths[a.pngWidths.length - 1];
        const png = await svgToPng(svg, w);
        entries.push({ name: `adhar-brand-kit/png/${folder}/${base}-${w}.png`, data: new Uint8Array(await png.arrayBuffer()) });
        done++;
        setProgress(Math.round((done / ALL_ASSETS.length) * 100));
      }
      saveBlob(makeZip(entries), "adhar-brand-kit.zip");
      setZipState("idle");
    } catch {
      setZipState("error");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative section-padding container-padding overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
          <div className="max-width-content relative text-center">
            <span className="eyebrow mb-5">Brand &amp; press</span>
            <h1 className="section-heading mt-5 text-foreground">
              The Adhar brand,
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">ready to use.</span>
            </h1>
            <p className="section-subheading mt-6">
              Logos, colours, typography and press copy for writing about Adhar, giving a talk, or showing an
              integration. Everything is vector, free to download, and linkable.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button type="button" onClick={downloadAll} disabled={zipState === "busy"} className={`${btnPrimary} disabled:opacity-70`}>
                {zipState === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileArchive className="h-4 w-4" aria-hidden />}
                <span>{zipState === "busy" ? `Preparing… ${progress}%` : "Download the full kit (.zip)"}</span>
              </button>
              <a href={`mailto:${PRESS_EMAIL}?subject=${encodeURIComponent("Press enquiry")}`} className={btnSecondary}>
                <Mail className="h-4 w-4" aria-hidden />
                <span>Press contact</span>
              </a>
            </div>
            <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
              {zipState === "error"
                ? "Couldn't build the zip — download the files individually below."
                : "SVG and PNG of every asset, plus a one-page brand summary."}
            </p>
          </div>
        </section>

        {/* Logos */}
        <section id="logos" aria-labelledby="logos-heading" className="relative section-padding container-padding bg-muted/30">
          <div className="max-width-content">
            <SectionHeader id="logos-heading" eyebrow="Logos" title="Logo, symbol" titleMuted="and wordmark.">
              Prefer the full logo. Use the symbol alone when space is tight, such as favicons and avatars. Pick the
              variant that matches your background.
            </SectionHeader>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Full logo</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              {LOGOS.map((a) => <AssetCard key={a.file} asset={a} />)}
            </div>
            <h3 className="mt-12 mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Symbol</h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {SYMBOLS.map((a) => <AssetCard key={a.file} asset={a} />)}
            </div>
            <h3 className="mt-12 mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Wordmark</h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {WORDMARKS.map((a) => <AssetCard key={a.file} asset={a} />)}
            </div>
          </div>
        </section>

        {/* Banners */}
        <section id="banners" aria-labelledby="banners-heading" className="relative section-padding container-padding">
          <div className="max-width-content">
            <SectionHeader id="banners-heading" eyebrow="Social" title="Banners for" titleMuted="social and link previews.">
              Sized for each platform. PNG downloads export at the platform's exact size.
            </SectionHeader>
            <div className="grid gap-5 md:grid-cols-2">
              {BANNERS.map((a) => <AssetCard key={a.file} asset={a} wide />)}
            </div>
          </div>
        </section>

        {/* Colours */}
        <section id="colours" aria-labelledby="colours-heading" className="relative section-padding container-padding bg-muted/30">
          <div className="max-width-content">
            <SectionHeader id="colours-heading" eyebrow="Colour" title="The brand" titleMuted="palette.">
              The brand gradient runs Blue → Indigo → Violet, left to right (top-left to bottom-right on the symbol).
              Click a colour to copy its hex value.
            </SectionHeader>

            <div className="mb-6 overflow-hidden rounded-2xl border border-border/70 bg-card">
              <div className="h-24" style={{ backgroundImage: GRADIENT_CSS }} aria-hidden />
              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-semibold text-foreground">Brand gradient</p>
                  <code className="text-xs text-muted-foreground break-all">{GRADIENT_CSS}</code>
                </div>
                <CopyButton text={GRADIENT_CSS} label="Copy CSS" />
              </div>
            </div>

            <ul className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {PALETTE.map((c) => (
                <li key={c.hex}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (await copyText(c.hex)) flashSwatch(c.hex);
                    }}
                    className={`group w-full overflow-hidden rounded-2xl border border-border/70 bg-card text-left transition-shadow hover:shadow-[var(--shadow-sm)] ${focusRing}`}
                    aria-label={`Copy ${c.name} ${c.hex}`}
                  >
                    <span className="block h-20 border-b border-border/70" style={{ backgroundColor: c.hex }} aria-hidden />
                    <span className="block p-4">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">{c.name}</span>
                        {swatchFlash === c.hex ? (
                          <Check className="h-4 w-4 text-emerald-500" aria-hidden />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                        )}
                      </span>
                      <span className="mt-1 block font-mono text-xs text-muted-foreground">{swatchFlash === c.hex ? "Copied" : c.hex}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{c.use}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Typography */}
        <section id="typography" aria-labelledby="type-heading" className="relative section-padding container-padding">
          <div className="max-width-content">
            <SectionHeader id="type-heading" eyebrow="Typography" title="Set in" titleMuted="Inter.">
              Inter is open source under the SIL Open Font License.{" "}
              <a href="https://rsms.me/inter/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                Get Inter
              </a>
              .
            </SectionHeader>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60 md:grid-cols-3" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
              {[
                { w: 800, label: "Wordmark", sample: "ADHAR", cls: "text-5xl tracking-tight" },
                { w: 600, label: "Headlines", sample: "Open foundation", cls: "text-3xl tracking-tight" },
                { w: 500, label: "Body and captions", sample: "Built with care for developers.", cls: "text-lg" },
              ].map((t) => (
                <div key={t.label} className="bg-card p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t.label} · {t.w}
                  </p>
                  <p className={`mt-4 text-foreground ${t.cls}`} style={{ fontWeight: t.w }}>
                    {t.sample}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Usage */}
        <section id="usage" aria-labelledby="usage-heading" className="relative section-padding container-padding bg-muted/30">
          <div className="max-width-content">
            <SectionHeader id="usage-heading" eyebrow="Usage" title="Using the logo" titleMuted="well." />
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><Check className="h-3.5 w-3.5" aria-hidden /></span>
                  Do
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li>Prefer the full logo; use the symbol alone when space is tight.</li>
                  <li>Keep clear space around the logo of at least the height of one hexagon.</li>
                  <li>Use dark variants on dark backgrounds and light variants on light ones.</li>
                  <li>Scale proportionally. The minimum symbol size is 24&nbsp;px.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400"><X className="h-3.5 w-3.5" aria-hidden /></span>
                  Don't
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li>Recolour, rotate, outline or add effects to the logo.</li>
                  <li>Place the gradient logo on mid-tone or clashing gradient backgrounds.</li>
                  <li>Alter the wordmark's font, weight or spacing.</li>
                  <li>Use the logo to imply endorsement of third-party products.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Naming & boilerplate */}
        <section id="press" aria-labelledby="press-heading" className="relative section-padding container-padding">
          <div className="max-width-content">
            <SectionHeader id="press-heading" eyebrow="Press" title="Naming and" titleMuted="boilerplate." />
            <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h3 className="font-semibold text-foreground">How to write the name</h3>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li>
                    Write <strong className="text-foreground">Adhar</strong> — from the Sanskrit अधार (<em>Adhāra</em>),
                    “foundation”. All-caps <strong className="text-foreground">ADHAR</strong> appears only in the wordmark.
                  </li>
                  <li>
                    First mention: <em>“Adhar, the open foundation for cloud-native platform engineering.”</em>
                  </li>
                  <li>
                    Slogan: <em>“Adhar • Built with ❤️ for developers!”</em>
                  </li>
                </ul>
              </div>
              <div className="space-y-5">
                {[
                  { label: "Short boilerplate", text: BOILERPLATE_SHORT },
                  { label: "Long boilerplate", text: BOILERPLATE_LONG },
                ].map((b) => (
                  <div key={b.label} className="rounded-2xl border border-border/70 bg-card p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-foreground">{b.label}</h3>
                      <CopyButton text={b.text} label="Copy" />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground select-all">{b.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-border/70 bg-card p-6 sm:p-8 text-center">
              <h3 className="text-lg font-semibold text-foreground">Press and partnership enquiries</h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
                These assets may be used to refer to the Adhar project — in articles, talks and integrations. They are
                not licensed for use as your own product branding.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <a href={`mailto:${PRESS_EMAIL}?subject=${encodeURIComponent("Press enquiry")}`} className={btnPrimary}>
                  <Mail className="h-4 w-4" aria-hidden />
                  <span>{PRESS_EMAIL}</span>
                </a>
                <a href={SLACK} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                  <span>Ask in Slack</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Brand;
