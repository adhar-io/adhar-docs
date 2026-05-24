import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bold, Italic, Heading1, Heading2, Heading3, Link as LinkIcon,
  Image as ImageIcon, Code, Quote, List, ListOrdered, Minus, Table as TableIcon,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}

interface Action {
  icon: ReactNode;
  label: string;
  /** wrap selection */
  wrap?: [string, string];
  /** prepend to current line */
  linePrefix?: string;
  /** insert block at cursor */
  block?: string;
}

const actions: Action[] = [
  { icon: <Heading1 className="w-3.5 h-3.5" />, label: "H1", linePrefix: "# " },
  { icon: <Heading2 className="w-3.5 h-3.5" />, label: "H2", linePrefix: "## " },
  { icon: <Heading3 className="w-3.5 h-3.5" />, label: "H3", linePrefix: "### " },
  { icon: <Bold className="w-3.5 h-3.5" />, label: "Bold", wrap: ["**", "**"] },
  { icon: <Italic className="w-3.5 h-3.5" />, label: "Italic", wrap: ["*", "*"] },
  { icon: <Code className="w-3.5 h-3.5" />, label: "Inline code", wrap: ["`", "`"] },
  { icon: <LinkIcon className="w-3.5 h-3.5" />, label: "Link", wrap: ["[", "](https://)"] },
  { icon: <ImageIcon className="w-3.5 h-3.5" />, label: "Image", block: "\n![alt text](https://images.unsplash.com/photo-... )\n" },
  { icon: <Quote className="w-3.5 h-3.5" />, label: "Quote", linePrefix: "> " },
  { icon: <List className="w-3.5 h-3.5" />, label: "Bullet list", linePrefix: "- " },
  { icon: <ListOrdered className="w-3.5 h-3.5" />, label: "Numbered list", linePrefix: "1. " },
  { icon: <Minus className="w-3.5 h-3.5" />, label: "Divider", block: "\n\n---\n\n" },
  {
    icon: <span className="text-[10px] font-mono font-bold">{}</span>,
    label: "Code block",
    block: "\n```yaml\n# your code\n```\n",
  },
  {
    icon: <TableIcon className="w-3.5 h-3.5" />,
    label: "Table",
    block: "\n| Column A | Column B |\n|----------|----------|\n| Row 1    | Value    |\n| Row 2    | Value    |\n",
  },
];

const MarkdownToolbar = ({ value, onChange, placeholder, minHeight = 600 }: Props) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [stats, setStats] = useState({ words: 0, chars: 0, read: "1 min read" });

  useEffect(() => {
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    setStats({
      words,
      chars: value.length,
      read: `${Math.max(1, Math.ceil(words / 200))} min read`,
    });
  }, [value]);

  const apply = (a: Action) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end);

    let next = value;
    let cursor = end;

    if (a.wrap) {
      const [l, r] = a.wrap;
      const text = sel || a.label.toLowerCase();
      next = value.slice(0, start) + l + text + r + value.slice(end);
      cursor = start + l.length + text.length + r.length;
    } else if (a.linePrefix) {
      // Find start of current line
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      next = value.slice(0, lineStart) + a.linePrefix + value.slice(lineStart);
      cursor = end + a.linePrefix.length;
    } else if (a.block) {
      next = value.slice(0, start) + a.block + value.slice(end);
      cursor = start + a.block.length;
    }

    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      apply(actions.find((a) => a.label === "Bold")!);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      apply(actions.find((a) => a.label === "Italic")!);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      apply(actions.find((a) => a.label === "Link")!);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const ta = ref.current!;
      const start = ta.selectionStart;
      const next = value.slice(0, start) + "  " + value.slice(ta.selectionEnd);
      onChange(next);
      requestAnimationFrame(() => ta.setSelectionRange(start + 2, start + 2));
    }
  };

  const groups = useMemo(() => {
    const g1 = actions.slice(0, 3);   // headings
    const g2 = actions.slice(3, 7);   // inline
    const g3 = actions.slice(7, 12);  // blocks
    const g4 = actions.slice(12);     // code+table
    return [g1, g2, g3, g4];
  }, []);

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--blog-bg))] ring-1 ring-[hsl(var(--blog-border))]">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-1 px-3 py-2 border-b border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-surface))]">
        {groups.map((group, gi) => (
          <div key={gi} className="flex items-center">
            {group.map((a) => (
              <button
                key={a.label}
                title={a.label}
                onClick={() => apply(a)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-sm text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-heading))] hover:bg-[hsl(var(--blog-border)/0.5)] transition-colors"
                type="button"
              >
                {a.icon}
              </button>
            ))}
            {gi < groups.length - 1 && <div className="w-px h-5 bg-[hsl(var(--blog-border))] mx-2" />}
          </div>
        ))}
        <div className="ml-auto text-[10px] uppercase tracking-wider text-[hsl(var(--blog-subtle))] font-mono">
          {stats.words}w · {stats.read}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? "Start writing in Markdown…\n\n# Your title\n\nIntroduce your story here."}
        spellCheck
        style={{ minHeight }}
        className="flex-1 w-full bg-transparent text-[hsl(var(--blog-muted))] placeholder:text-[hsl(var(--blog-subtle)/0.7)] font-mono text-sm leading-relaxed px-6 py-5 focus:outline-none resize-none"
      />
    </div>
  );
};

export default MarkdownToolbar;
