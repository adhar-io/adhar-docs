import { useMemo, type ReactNode } from "react";
import Logo from "@/components/ui/Logo";
import StatusPill from "@/components/docs/StatusPill";
import { cn } from "@/lib/utils";
import { DOC_STATUSES, type DocStatus } from "@/lib/docsStatus";
import { collectStatusGroups, countByStatus } from "@/lib/statusSummary";

/* Bars run from done to not started; the palette was validated in this order. */
const BAR_ORDER: DocStatus[] = ["complete", "in-progress", "planned", "blocked"];
const PENDING: DocStatus[] = ["in-progress", "blocked", "planned"];

/** "Phase 3 — Developer experience" → ["Phase 3", "Developer experience"]. */
function splitTitle(title: string): [string, string] {
  const i = title.indexOf(" — ");
  return i === -1 ? [title, ""] : [title.slice(0, i), title.slice(i + 3)];
}

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
);

/**
 * One part-to-whole bar. Segments are separated by a 2px surface gap, and
 * each one's hit area is taller than the mark so its tooltip is easy to reach.
 */
const StackedBar = ({ counts, size }: { counts: Record<DocStatus, number>; size: "lg" | "sm" }) => {
  const total = BAR_ORDER.reduce((n, s) => n + counts[s], 0);
  const parts = BAR_ORDER.filter((s) => counts[s] > 0);
  return (
    <div
      role="img"
      aria-label={parts.map((s) => `${DOC_STATUSES[s].label}: ${counts[s]} of ${total}`).join(", ")}
      className="flex w-full gap-0.5"
    >
      {parts.map((s, i) => (
        <div key={s} className="group/seg relative py-1.5" style={{ flex: `${counts[s]} 1 0`, minWidth: 6 }}>
          <div
            className={cn(
              size === "lg" ? "h-3" : "h-2",
              DOC_STATUSES[s].mark,
              i === 0 && "rounded-l-[4px]",
              i === parts.length - 1 && "rounded-r-[4px]",
            )}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-full left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border/60 bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover/seg:opacity-100"
          >
            <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full", DOC_STATUSES[s].mark)} />
            {DOC_STATUSES[s].label} · {counts[s]} of {total}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * The header of a status page: the Adhar logo, the page title, and a summary
 * of every status table on the page — overall progress, progress per group,
 * and the items still to do. It reads the page's own markdown, so it can never
 * disagree with the tables below it.
 */
const StatusSummary = ({ title, markdown }: { title: string; markdown: string }) => {
  const groups = useMemo(() => collectStatusGroups(markdown), [markdown]);
  const items = groups.flatMap((g) => g.items);
  const counts = countByStatus(items);
  const pct = items.length ? Math.round((counts.complete / items.length) * 100) : 0;
  const pending = PENDING.filter((s) => counts[s] > 0);
  const pendingTotal = pending.reduce((n, s) => n + counts[s], 0);

  return (
    <header className="status-summary mb-10">
      <Logo size="md" showTagline={false} linkTo={null} />
      <h1 className="mt-6 mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{title}</h1>

      <section
        aria-label={`${title}: status summary`}
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-5xl font-semibold leading-none tracking-tight text-foreground">{pct}%</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {counts.complete} of {items.length} capabilities complete
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {BAR_ORDER.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", DOC_STATUSES[s].mark)} aria-hidden />
                <span className="text-muted-foreground">{DOC_STATUSES[s].label}</span>
                <span className="font-semibold tabular-nums text-foreground">{counts[s]}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4">
          <StackedBar counts={counts} size="lg" />
        </div>

        <div className="mt-7">
          <Eyebrow>By phase</Eyebrow>
          <ul className="mt-2 divide-y divide-border/50">
            {groups.map((g) => {
              const c = countByStatus(g.items);
              const [label, name] = splitTitle(g.title);
              return (
                <li key={g.anchor}>
                  <a
                    href={`#${g.anchor}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-md py-2 hover:bg-muted/30 sm:grid-cols-[20rem_minmax(0,1fr)_5.5rem]"
                  >
                    <span className="col-start-1 row-start-1 min-w-0 text-sm sm:truncate">
                      <span className="font-semibold text-foreground">{label}</span>
                      {name && <span className="text-muted-foreground"> {name}</span>}
                    </span>
                    <span className="col-span-2 col-start-1 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                      <StackedBar counts={c} size="sm" />
                    </span>
                    <span className="col-start-2 row-start-1 text-right text-xs tabular-nums text-muted-foreground sm:col-start-3">
                      {c.complete === g.items.length ? "All done" : `${c.complete} of ${g.items.length} done`}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {pending.length > 0 && (
          <div className="mt-7">
            <Eyebrow>Still to do · {pendingTotal}</Eyebrow>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {pending.map((s) => (
                <div key={s} className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <StatusPill status={s} />
                    <span className="text-xs tabular-nums text-muted-foreground">{counts[s]}</span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {groups.flatMap((g) =>
                      g.items
                        .filter((i) => i.status === s)
                        .map((i) => (
                          <li key={`${g.anchor}/${i.name}`}>
                            <a
                              href={`#${g.anchor}`}
                              className="flex items-baseline justify-between gap-3 text-sm text-foreground/85 hover:text-foreground"
                            >
                              <span className="min-w-0">{i.name}</span>
                              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                                {splitTitle(g.title)[0]}
                              </span>
                            </a>
                          </li>
                        )),
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </header>
  );
};

export default StatusSummary;
