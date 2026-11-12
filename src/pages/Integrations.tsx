import React, { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ArrowRight, ArrowUpRight, X, BookOpen, Layers, Boxes, Check, Minus, Terminal } from "lucide-react";
import { Github } from "@/components/brand-icons";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import Reveal from "@/components/Reveal";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { INTEGRATIONS, INTEGRATIONS_SOURCE, type Integration, type IntegrationCategory } from "@/data/integrations";

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES: IntegrationCategory[] = ["Foundation", "Core", "Infrastructure", "Security", "Observability", "Delivery", "Data", "AI"];

const CATEGORY_STYLE: Record<IntegrationCategory, { dot: string; chip: string; grad: string; layer: string }> = {
  Foundation: { dot: "bg-sky-500", chip: "text-sky-600 dark:text-sky-400 bg-sky-500/10 ring-sky-500/20", grad: "from-sky-500 to-blue-600", layer: "Installed by adhar up" },
  Core: { dot: "bg-blue-500", chip: "text-blue-600 dark:text-blue-400 bg-blue-500/10 ring-blue-500/20", grad: "from-blue-500 to-cyan-500", layer: "Clusters and fleet" },
  Infrastructure: { dot: "bg-slate-500", chip: "text-slate-600 dark:text-slate-300 bg-slate-500/10 ring-slate-500/20", grad: "from-slate-500 to-slate-700", layer: "Infrastructure" },
  Security: { dot: "bg-rose-500", chip: "text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-rose-500/20", grad: "from-rose-500 to-orange-500", layer: "Platform services" },
  Observability: { dot: "bg-amber-500", chip: "text-amber-600 dark:text-amber-400 bg-amber-500/10 ring-amber-500/20", grad: "from-amber-500 to-yellow-500", layer: "Platform services" },
  Delivery: { dot: "bg-violet-500", chip: "text-violet-600 dark:text-violet-400 bg-violet-500/10 ring-violet-500/20", grad: "from-violet-500 to-purple-500", layer: "Delivery and applications" },
  Data: { dot: "bg-emerald-500", chip: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 ring-emerald-500/20", grad: "from-emerald-500 to-teal-500", layer: "Data platform" },
  AI: { dot: "bg-indigo-500", chip: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 ring-indigo-500/20", grad: "from-indigo-500 to-fuchsia-500", layer: "AI platform" },
};

const PLANE: Record<string, string> = { "control-plane": "Control plane", "data-plane": "Data plane", both: "Control and data planes" };

const BY_ID = new Map(INTEGRATIONS.map((t) => [t.id, t]));

/** Packages that list this one as a dependency. */
const USED_BY = (() => {
  const m = new Map<string, Integration[]>();
  for (const t of INTEGRATIONS) {
    for (const d of t.pkg?.dependencies ?? []) {
      const list = m.get(d.name) ?? [];
      list.push(t);
      m.set(d.name, list);
    }
  }
  return m;
})();

const ON_IN_PRODUCTION = INTEGRATIONS.filter((t) => !t.pkg || t.pkg.profiles.production).length;

/* ------------------------------------------------------------------ */
/* Logo with graceful monogram fallback                                */
/* ------------------------------------------------------------------ */

function ToolLogo({ tool, size = 44 }: { tool: Integration; size?: number }) {
  const [failed, setFailed] = useState(false);
  const monogram = tool.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  if (!tool.logo || failed) {
    return (
      <div
        className={`grid place-items-center rounded-xl bg-gradient-to-br ${CATEGORY_STYLE[tool.category].grad} text-white font-bold shrink-0`}
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        aria-hidden
      >
        {monogram}
      </div>
    );
  }
  return (
    <div className="grid place-items-center rounded-xl bg-white ring-1 ring-black/5 shadow-sm shrink-0" style={{ width: size, height: size }}>
      <img src={tool.logo} alt={`${tool.name} logo`} loading="lazy" decoding="async"
        style={{ width: size * 0.62, height: size * 0.62 }} className="object-contain"
        onError={() => setFailed(true)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail drawer                                                       */
/* ------------------------------------------------------------------ */

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{children}</div>
);

function ToolChip({ tool, note, onOpen }: { tool: Integration; note?: string; onOpen: (t: Integration) => void }) {
  return (
    <button type="button" onClick={() => onOpen(tool)}
      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card pl-1 pr-3 h-9 text-sm text-foreground hover:border-primary/50 hover:bg-muted/40 transition-colors">
      <ToolLogo tool={tool} size={28} />
      {tool.name}
      {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
    </button>
  );
}

function ToolDetails({ tool, onOpen }: { tool: Integration; onOpen: (t: Integration) => void }) {
  const s = CATEGORY_STYLE[tool.category];
  const pkg = tool.pkg;
  const dependsOn = (pkg?.dependencies ?? [])
    .map((d) => ({ tool: BY_ID.get(d.name), optional: d.optional }))
    .filter((d): d is { tool: Integration; optional: boolean } => Boolean(d.tool));
  const usedBy = USED_BY.get(tool.id) ?? [];

  const facts: [string, React.ReactNode][] = pkg
    ? [
        ["Version", pkg.version ? <code className="font-mono text-[13px]">{pkg.version}</code> : "—"],
        ["Licence", pkg.license ?? "—"],
        ["Runs on", pkg.plane ? PLANE[pkg.plane] ?? pkg.plane : "—"],
        ["Fits on a laptop", pkg.localSafe == null ? "—" : pkg.localSafe ? "Yes" : "No, needs a larger cluster"],
        ["Upstream chart", pkg.upstreamChart ? <code className="font-mono text-[13px] break-all">{pkg.upstreamChart}</code> : "Plain manifests"],
        ["Stability", pkg.stability ? pkg.stability[0].toUpperCase() + pkg.stability.slice(1) : "—"],
      ]
    : [];

  return (
    <div className="flex flex-col min-h-full">
      <div className={`-mx-6 -mt-6 px-6 pt-10 pb-6 bg-gradient-to-br ${s.grad}`}>
        <div className="flex items-center gap-4">
          <ToolLogo tool={tool} size={60} />
          <div className="min-w-0">
            <SheetTitle className="text-2xl font-semibold tracking-tight text-white drop-shadow">{tool.name}</SheetTitle>
            <SheetDescription className="text-sm text-white/85 mt-0.5">{tool.tagline}</SheetDescription>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-7 flex-1">
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${s.chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{tool.category}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ring-border text-muted-foreground">
            <Layers className="w-3 h-3" />{s.layer}
          </span>
        </div>

        <div>
          <Label>How Adhar uses it</Label>
          <p className="text-[15px] text-foreground leading-relaxed">{tool.usage}</p>
        </div>

        {pkg ? (
          <>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/60">
              {facts.map(([k, v]) => (
                <div key={k} className="bg-card px-3.5 py-3">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                  <dd className="mt-1 text-sm text-foreground">{v}</dd>
                </div>
              ))}
            </dl>

            <div>
              <Label>On by default</Label>
              <div className="grid grid-cols-3 gap-2">
                {([["local", "Local"], ["production", "Production"], ["gitops", "GitOps"]] as const).map(([key, label]) => {
                  const on = pkg.profiles[key];
                  return (
                    <div key={key} className={`rounded-xl border px-3 py-2.5 text-center ${on ? "border-emerald-500/30 bg-emerald-500/10" : "border-border/70 bg-muted/30"}`}>
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className={`mt-1 inline-flex items-center gap-1 text-sm font-medium ${on ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {on ? <Check className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        {on ? "On" : "Off"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(() => {
              // On in every profile already: the useful command is the other one.
              const verb = pkg.profiles.local && pkg.profiles.production && pkg.profiles.gitops ? "disable" : "enable";
              return (
                <div>
                  <Label>{verb === "enable" ? "Turn it on" : "Turn it off"}</Label>
                  <pre className="rounded-xl bg-zinc-950 text-zinc-100 px-4 py-3 text-[13px] font-mono overflow-x-auto"><span className="text-emerald-400">$</span> adhar stack {verb} {tool.id}{"\n"}<span className="text-emerald-400">$</span> adhar upgrade</pre>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    <Terminal className="inline w-3 h-3 mr-1 -mt-0.5" />
                    <code className="font-mono">stack {verb}</code> edits the profile in Git and checks dependencies and conflicts.
                    Nothing reaches the cluster until <code className="font-mono">adhar upgrade</code>.
                    {verb === "enable" && " Enabling in local also enables in production."}
                  </p>
                </div>
              );
            })()}
          </>
        ) : (
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed">
            Part of the foundation: <code className="font-mono text-foreground">adhar up</code> installs it before any package, in
            every profile, and it cannot be turned off.
          </div>
        )}

        {dependsOn.length > 0 && (
          <div>
            <Label>Depends on</Label>
            <div className="flex flex-wrap gap-2">
              {dependsOn.map((d) => <ToolChip key={d.tool.id} tool={d.tool} note={d.optional ? "optional" : undefined} onOpen={onOpen} />)}
            </div>
          </div>
        )}

        {usedBy.length > 0 && (
          <div>
            <Label>Used by</Label>
            <div className="flex flex-wrap gap-2">
              {usedBy.map((t) => <ToolChip key={t.id} tool={t} onOpen={onOpen} />)}
            </div>
          </div>
        )}

        {pkg && pkg.keywords.length > 0 && (
          <div>
            <Label>Keywords</Label>
            <div className="flex flex-wrap gap-1.5">
              {pkg.keywords.map((k) => (
                <span key={k} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{k}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-2">
        {tool.homepage && (
          <a href={tool.homepage} target="_blank" rel="noopener noreferrer"
            className="btn-primary-modern inline-flex items-center justify-center gap-2 rounded-full h-11 px-5 text-sm font-medium">
            Visit {tool.name} <ArrowUpRight className="w-4 h-4" />
          </a>
        )}
        {pkg && (
          <a href={`https://github.com/adhar-io/adhar/tree/main/${pkg.path}`} target="_blank" rel="noopener noreferrer"
            className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full h-11 px-5 text-sm font-medium">
            <Github className="w-4 h-4" /> The package in the Adhar repository
          </a>
        )}
        <Link to="/docs/$" params={{ _splat: "core-concepts/platform-services" }}
          className="btn-secondary-modern inline-flex items-center justify-center gap-2 rounded-full h-11 px-5 text-sm font-medium">
          <BookOpen className="w-4 h-4" /> How packages work
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const Integrations = () => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<IntegrationCategory | "All">("All");
  const [selected, setSelected] = useState<Integration | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: INTEGRATIONS.length };
    for (const cat of CATEGORIES) c[cat] = INTEGRATIONS.filter((t) => t.category === cat).length;
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTEGRATIONS.filter((t) => {
      const matchesCat = active === "All" || t.category === active;
      const haystack = [t.name, t.id, t.tagline, t.usage, t.category, ...(t.pkg?.keywords ?? [])].join(" ").toLowerCase();
      return matchesCat && (!q || haystack.includes(q));
    });
  }, [query, active]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navigation />

      {/* Hero */}
      <section className="relative section-padding container-padding overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-70 pointer-events-none" />
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 dark:opacity-25 pointer-events-none" />
        <div className="max-width-content relative">
          <Reveal className="text-center">
            <span className="eyebrow mb-5"><Boxes className="w-3 h-3 mr-1" />Integrations & ecosystem</span>
            <h1 className="section-heading mt-5 text-foreground">
              Every tool Adhar runs
              {' '}
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">under the hood.</span>
            </h1>
            <p className="section-subheading mt-6">
              The {INTEGRATIONS.length} open-source projects in the Adhar {INTEGRATIONS_SOURCE.release} platform, each wired in
              as a GitOps package. Search, filter, and open any tool to see how Adhar uses it and which profiles turn it on.
            </p>
          </Reveal>

          <Reveal className="mt-10 flex flex-wrap justify-center gap-3" delay={80}>
            {[
              { value: String(INTEGRATIONS.length), label: "tools" },
              { value: String(ON_IN_PRODUCTION), label: "on in production" },
              { value: String(CATEGORIES.length), label: "categories" },
              { value: "100%", label: "open source" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border/70 bg-card/70 backdrop-blur px-5 py-3 text-center">
                <div className="text-2xl font-semibold tracking-tight tabular">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Sticky controls */}
      <div className="sticky top-16 z-30 border-y border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-width-content container-padding py-4">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools — try 'gitops', 'secrets', 'kafka'…"
              className="w-full rounded-full border border-border bg-card/70 backdrop-blur pl-11 pr-11 h-11 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
              aria-label="Search tools"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 scrollbar-hide">
            {(["All", ...CATEGORIES] as const).map((cat) => {
              const isActive = active === cat;
              return (
                <button key={cat} type="button" onClick={() => setActive(cat)}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 h-8 text-[13px] font-medium transition-all duration-300 ring-1 ${
                    isActive ? "bg-primary text-primary-foreground ring-primary shadow-[var(--shadow-sm)]"
                    : "bg-card/60 text-muted-foreground ring-border hover:text-foreground hover:ring-foreground/20"}`}>
                  {cat !== "All" && <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-primary-foreground" : CATEGORY_STYLE[cat as IntegrationCategory].dot}`} />}
                  {cat}
                  <span className={`text-[11px] tabular ${isActive ? "text-primary-foreground/80" : "text-muted-foreground/70"}`}>{counts[cat]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="container-padding py-12">
        <div className="max-width-content">
          <p className="text-center text-xs text-muted-foreground">
            Showing <span className="text-foreground font-medium">{filtered.length}</span> of {INTEGRATIONS.length} tools
          </p>

          {filtered.length === 0 ? (
            <div className="mt-16 text-center text-muted-foreground">
              No tools match “{query}”. <button className="text-primary hover:underline" onClick={() => { setQuery(""); setActive("All"); }}>Reset</button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((tool, i) => {
                const s = CATEGORY_STYLE[tool.category];
                const onInProd = !tool.pkg || tool.pkg.profiles.production;
                return (
                  <button key={tool.id} type="button" onClick={() => setSelected(tool)}
                    style={{ animationDelay: `${Math.min(i, 14) * 30}ms` }}
                    className="animate-fade-in-up group relative text-left rounded-2xl border border-border/70 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                    <div className="flex items-start gap-4">
                      <div className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                        <ToolLogo tool={tool} size={44} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground tracking-tight truncate">{tool.name}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">{tool.tagline}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed line-clamp-2">{tool.usage}</p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${s.chip}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{tool.category}
                        </span>
                        {tool.pkg?.version && (
                          <span className="rounded-full px-2 py-1 text-[11px] font-mono text-muted-foreground ring-1 ring-inset ring-border">{tool.pkg.version}</span>
                        )}
                        {!onInProd && (
                          <span className="rounded-full px-2 py-1 text-[11px] text-muted-foreground ring-1 ring-inset ring-border">Opt-in</span>
                        )}
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary sm:opacity-0 sm:-translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                        Details <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selected && <ToolDetails key={selected.id} tool={selected} onOpen={setSelected} />}
        </SheetContent>
      </Sheet>

      {/* CTA */}
      <section className="container-padding pb-24">
        <div className="max-width-content">
          <div className="surface-modern p-8 sm:p-12 text-center">
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">One command wires them all together</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Every tool here ships pre-integrated, secured and observable. <code className="px-1.5 py-0.5 rounded bg-muted text-sm">adhar up</code> brings
                the platform up in about 30 minutes, with the profile's packages turned on.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/docs/$" params={{ _splat: "getting-started/quick-start" }} className="btn-primary-modern inline-flex items-center gap-2 rounded-full h-11 px-6 text-sm font-medium">
                  Get started <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/docs" className="btn-secondary-modern inline-flex items-center gap-2 rounded-full h-11 px-6 text-sm font-medium">
                  <BookOpen className="w-4 h-4" /> Read the docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Integrations;
