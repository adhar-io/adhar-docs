import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText, Hash, CornerDownLeft } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { DocEntry } from "@/lib/docsRegistry";
import { buildIndex, search, type SearchHit } from "@/lib/docsSearch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: DocEntry[];
  /** Text to start with, e.g. what was typed in the sidebar box */
  initialQuery?: string;
  /** Pages to suggest before anything is typed */
  suggestions: DocEntry[];
  /** Portal name for the placeholder, e.g. "Adhar docs" */
  label: string;
}

/** Open on ⌘K / Ctrl+K anywhere, or "/" when focus is not in a text field. */
export function useSearchHotkey(open: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
}

const DocsSearch = ({ open, onOpenChange, entries, initialQuery = "", suggestions, label }: Props) => {
  const navigate = useNavigate();
  const index = useMemo(() => buildIndex(entries), [entries]);
  const [query, setQuery] = useState(initialQuery);

  // Re-seed the query each time the dialog opens (adjusting state during render).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setQuery(initialQuery);
  }

  const hits = useMemo(() => search(index, query), [index, query]);

  // Group hits by page, keeping the ranked order of each page's best hit.
  const groups = useMemo(() => {
    const m = new Map<string, SearchHit[]>();
    for (const h of hits) {
      const k = h.chunk.path;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(h);
    }
    return Array.from(m.values());
  }, [hits]);

  const go = (path: string, anchor?: string) => {
    onOpenChange(false);
    navigate({ to: path, hash: anchor });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} commandProps={{ shouldFilter: false, label: `Search ${label}` }}>
      {/* We rank results ourselves; cmdk's fuzzy filter would re-order and drop them. */}
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={`Search ${label}…`}
        aria-label={`Search ${label}`}
      />
      <CommandList className="max-h-[min(60vh,520px)]">
        {query.trim() ? (
          <>
            <CommandEmpty>
              No results for “{query.trim()}”. Try fewer or different words.
            </CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g[0].chunk.path} heading={`${g[0].chunk.section} › ${g[0].chunk.pageTitle}`}>
                {g.map((h) => (
                  <CommandItem
                    key={`${h.chunk.path}#${h.chunk.anchor ?? ""}`}
                    value={`${h.chunk.path}#${h.chunk.anchor ?? ""}`}
                    onSelect={() => go(h.chunk.path, h.chunk.anchor)}
                    className="flex items-start gap-3 aria-selected:bg-primary/10"
                  >
                    {h.chunk.heading ? (
                      <Hash className="mt-0.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <FileText className="mt-0.5 shrink-0 text-primary" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {h.chunk.heading ?? h.chunk.pageTitle}
                      </span>
                      {h.snippet.length > 0 && (
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                          {h.snippet.map((p, i) =>
                            p.hit ? (
                              <mark key={i} className="rounded-sm bg-primary/20 px-0.5 text-foreground">
                                {p.text}
                              </mark>
                            ) : (
                              <span key={i}>{p.text}</span>
                            ),
                          )}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </>
        ) : (
          <CommandGroup heading="Start here">
            {suggestions.map((e) => (
              <CommandItem
                key={e.path}
                value={e.path}
                onSelect={() => go(e.path)}
                className="flex items-center gap-3 aria-selected:bg-primary/10"
              >
                <FileText className="shrink-0 text-primary" />
                <span className="truncate text-sm">{e.meta.title}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{e.meta.section}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <div className="flex items-center gap-4 border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border/60 px-1 font-mono">↑</kbd>
          <kbd className="rounded border border-border/60 px-1 font-mono">↓</kbd> to move
        </span>
        <span className="inline-flex items-center gap-1">
          <CornerDownLeft className="h-3 w-3" /> to open
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border/60 px-1 font-mono">esc</kbd> to close
        </span>
        {query.trim() && <span className="ml-auto">{hits.length} result{hits.length === 1 ? "" : "s"}</span>}
      </div>
    </CommandDialog>
  );
};

export default DocsSearch;
