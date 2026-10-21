import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, ExternalLink, GitBranch } from "lucide-react";
import { githubUrls, useReleases, type VersionSource } from "@/lib/docsVersions";

interface Props {
  source: VersionSource;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * Version selector for a docs portal.
 *
 * This site always documents the latest release, so the latest one is
 * "where you are". Each earlier release opens that tag's docs on GitHub in a
 * new tab — the honest way to serve an older version without pretending this
 * site holds a rebuilt copy of it.
 */
const DocsVersionSelector = ({ source }: Props) => {
  const { releases } = useReleases(source);
  const urls = githubUrls(source);
  const stable = releases.filter((r) => !r.prerelease);
  const latest = stable[0] ?? releases[0];
  const earlier = releases.filter((r) => r !== latest);

  if (!latest) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Documentation version: ${latest.tag} (latest). Change version`}
          className="w-full justify-between bg-gradient-to-r from-muted/40 to-muted/10 border-border/60 hover:border-primary/50 hover:bg-primary/[0.04] h-9"
        >
          <span className="flex items-center gap-2 min-w-0">
            <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-mono text-xs truncate">{latest.tag}</span>
            <Badge
              variant="outline"
              className="h-4 px-1.5 text-[9px] uppercase tracking-wider border bg-primary/15 text-primary border-primary/30"
            >
              latest
            </Badge>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[280px] bg-popover/95 backdrop-blur-xl border-border/60">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Documentation version
        </DropdownMenuLabel>

        <DropdownMenuItem
          className="flex items-center justify-between gap-2 py-2 cursor-default focus:bg-primary/10"
          onSelect={(e) => e.preventDefault()}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Check className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-xs">{latest.tag}</span>
            <span className="text-[10px] text-muted-foreground">you're reading this</span>
          </span>
          {latest.date && (
            <span className="text-[10px] text-muted-foreground font-mono">{formatDate(latest.date)}</span>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
          {earlier.length
            ? "Earlier releases open that version's docs on GitHub"
            : "No earlier releases yet"}
        </DropdownMenuLabel>

        {earlier.map((r) => (
          <DropdownMenuItem key={r.tag} asChild className="cursor-pointer focus:bg-primary/10">
            <a
              href={urls.docsAt(r.tag)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 py-1.5"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-3.5" aria-hidden />
                <span className="font-mono text-xs">{r.tag}</span>
                {r.prerelease && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 text-[9px] uppercase tracking-wider border bg-accent/15 text-accent border-accent/30"
                  >
                    pre-release
                  </Badge>
                )}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                {formatDate(r.date)}
                <ExternalLink className="w-3 h-3" aria-label="opens in a new tab" />
              </span>
            </a>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
          <a
            href={source.fallback.length && !earlier.length ? urls.repo : urls.release(latest.tag)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {earlier.length ? `${latest.tag} release notes` : "Source on GitHub"}
          </a>
          <a href={urls.releases} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            All releases →
          </a>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DocsVersionSelector;
