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
import { Check, ChevronDown, GitBranch } from "lucide-react";
import { useState } from "react";

export interface DocsVersion {
  value: string;
  label: string;
  channel?: "stable" | "lts" | "preview" | "legacy";
  date?: string;
}

interface Props {
  versions: DocsVersion[];
  defaultVersion?: string;
  onChange?: (version: string) => void;
}

const channelStyles: Record<NonNullable<DocsVersion["channel"]>, string> = {
  stable: "bg-primary/15 text-primary border-primary/30",
  lts: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  preview: "bg-accent/15 text-accent border-accent/30",
  legacy: "bg-muted text-muted-foreground border-border",
};

const DocsVersionSelector = ({ versions, defaultVersion, onChange }: Props) => {
  const [selected, setSelected] = useState(defaultVersion ?? versions[0]?.value);
  const current = versions.find((v) => v.value === selected) ?? versions[0];

  const pick = (v: string) => {
    setSelected(v);
    onChange?.(v);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between bg-gradient-to-r from-muted/40 to-muted/10 border-border/60 hover:border-primary/50 hover:bg-primary/[0.04] h-9"
        >
          <span className="flex items-center gap-2 min-w-0">
            <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-mono text-xs truncate">{current?.value}</span>
            {current?.channel && (
              <Badge
                variant="outline"
                className={`h-4 px-1.5 text-[9px] uppercase tracking-wider border ${channelStyles[current.channel]}`}
              >
                {current.channel}
              </Badge>
            )}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[260px] bg-popover/95 backdrop-blur-xl border-border/60"
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Documentation version
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {versions.map((v) => (
          <DropdownMenuItem
            key={v.value}
            onClick={() => pick(v.value)}
            className="flex items-center justify-between gap-2 py-2 cursor-pointer focus:bg-primary/10"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Check
                className={`w-3.5 h-3.5 text-primary ${
                  selected === v.value ? "opacity-100" : "opacity-0"
                }`}
              />
              <span className="font-mono text-xs">{v.value}</span>
              {v.channel && (
                <Badge
                  variant="outline"
                  className={`h-4 px-1.5 text-[9px] uppercase tracking-wider border ${channelStyles[v.channel]}`}
                >
                  {v.channel}
                </Badge>
              )}
            </span>
            {v.date && (
              <span className="text-[10px] text-muted-foreground font-mono">{v.date}</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
          Older versions: <a href="#" className="text-primary hover:underline">archive →</a>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DocsVersionSelector;
