import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import {
  AlertTriangle, Check, CircleCheck, Copy, Info, Lightbulb, Link as LinkIcon, Activity, OctagonAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseStatus } from "@/lib/docsStatus";
import { DIAGRAMS } from "@/components/docs/diagrams/index";
import Terminal from "@/components/docs/Terminal";
import StatusPill from "@/components/docs/StatusPill";
import StatusSummary from "@/components/docs/StatusSummary";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function nodeToText(children: ReactNode): string {
  if (children === null || children === undefined || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(nodeToText).join("");
  // @ts-expect-error react element with props.children
  return nodeToText(children?.props?.children);
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
}

const HeadingAnchor = ({ id }: { id: string }) => {
  const [copied, setCopied] = useState(false);
  // The link still navigates to the heading; clicking also copies its URL.
  const copy = () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      },
      () => { /* clipboard unavailable — the link still works */ },
    );
  };
  return (
    <a
      href={`#${id}`}
      onClick={copy}
      aria-label={copied ? "Link copied" : "Copy link to this section"}
      title={copied ? "Link copied" : "Copy link to this section"}
      className="anchor-link no-min-tap inline-flex align-middle"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
    </a>
  );
};

/* Callouts: a blockquote that opens with a bold label — "> **Note:** …",
   "> **Warning:** …" — is drawn as a typed callout with its own icon and
   colour. Any other blockquote keeps the neutral style. */
const CALLOUTS = [
  {
    match: /^(note|info|active development)\b/i,
    Icon: Info,
    box: "border-primary/60 bg-primary/[0.06]",
    icon: "text-primary",
  },
  {
    match: /^(tip|hint|good to know)\b/i,
    Icon: Lightbulb,
    box: "border-emerald-500/60 bg-emerald-500/[0.07]",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  {
    match: /^(check|result|expected)\b/i,
    Icon: CircleCheck,
    box: "border-emerald-500/60 bg-emerald-500/[0.07]",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  {
    match: /^(warning|caution|careful)\b/i,
    Icon: AlertTriangle,
    box: "border-amber-500/70 bg-amber-500/[0.08]",
    icon: "text-amber-600 dark:text-amber-400",
  },
  {
    match: /^(important|danger|do not)\b/i,
    Icon: OctagonAlert,
    box: "border-rose-500/60 bg-rose-500/[0.07]",
    icon: "text-rose-600 dark:text-rose-400",
  },
  {
    match: /^status\b/i,
    Icon: Activity,
    box: "border-sky-500/60 bg-sky-500/[0.07]",
    icon: "text-sky-600 dark:text-sky-400",
  },
] as const;

const Callout = ({ children }: { children: ReactNode }) => {
  const lead = nodeToText(children).trimStart().slice(0, 40);
  const kind = CALLOUTS.find((c) => c.match.test(lead));
  if (!kind) {
    return (
      <blockquote className="my-6 border-l-2 border-border pl-4 py-3 pr-4 bg-muted/30 rounded-r-lg text-foreground/85 [&>p]:mb-2 [&>p:last-child]:mb-0">
        {children}
      </blockquote>
    );
  }
  const { Icon } = kind;
  return (
    <blockquote
      className={cn(
        "docs-callout my-6 flex gap-3 rounded-lg border-l-[3px] py-3.5 pl-4 pr-4 text-foreground/85",
        kind.box,
      )}
    >
      <Icon aria-hidden="true" className={cn("mt-[3px] h-4 w-4 shrink-0", kind.icon)} />
      <div className="min-w-0 flex-1 [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:my-2 [&>ol]:my-2">
        {children}
      </div>
    </blockquote>
  );
};

const LANG_LABEL: Record<string, string> = {
  bash: "shell", sh: "shell", shell: "shell", zsh: "shell", console: "shell",
  yaml: "yaml", yml: "yaml", json: "json", go: "go", ts: "typescript",
  tsx: "tsx", js: "javascript", py: "python", python: "python", java: "java",
  dockerfile: "dockerfile", hcl: "hcl", toml: "toml", ini: "ini", sql: "sql",
  text: "text", plaintext: "text", diff: "diff",
};

const CodeBlock = ({ className, children }: { className?: string; children: ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const lang = /language-([\w-]+)/.exec(className || "")?.[1];
  const label = (lang && LANG_LABEL[lang]) || lang || "text";
  const raw = nodeToText(children);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };

  return (
    <div className="relative group my-6">
      <div className="flex items-center justify-between px-4 py-0.5 sm:py-2 bg-muted/40 border border-b-0 border-border/50 rounded-t-xl">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="no-min-tap text-[11px] inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre tabIndex={0} className="!mt-0 !rounded-t-none !border-t-0">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
};

const MarkdownRenderer = ({ content, className }: MarkdownRendererProps) => {
  return (
    <div className={cn("docs-prose max-w-none text-foreground/90", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={{
          h1: ({ children, id }) => (
            <h1
              id={id}
              className="text-3xl sm:text-[2.5rem] sm:leading-[1.15] font-bold tracking-tight mb-5 text-foreground text-balance"
            >
              {children}
            </h1>
          ),
          h2: ({ children, id }) => {
            const safeId = id || slugify(nodeToText(children));
            return (
              <h2
                id={safeId}
                className="group text-2xl font-semibold mt-12 mb-4 pb-2 border-b border-border/50 text-foreground"
              >
                {children}
                <HeadingAnchor id={safeId} />
              </h2>
            );
          },
          h3: ({ children, id }) => {
            const safeId = id || slugify(nodeToText(children));
            return (
              <h3
                id={safeId}
                className="group text-lg font-semibold mt-8 mb-3 text-foreground"
              >
                {children}
                <HeadingAnchor id={safeId} />
              </h3>
            );
          },
          h4: ({ children, id }) => (
            <h4 id={id} className="text-base font-semibold mt-6 mb-2 text-foreground">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-foreground/80 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-foreground/90">{children}</em>,
          blockquote: ({ children }) => <Callout>{children}</Callout>,
          ul: ({ children }) => (
            <ul className="my-4 space-y-2 list-none [&>li]:relative [&>li]:pl-5 [&>li:before]:content-[''] [&>li:before]:absolute [&>li:before]:left-0 [&>li:before]:top-[0.6em] [&>li:before]:w-1.5 [&>li:before]:h-1.5 [&>li:before]:rounded-full [&>li:before]:bg-gradient-to-br [&>li:before]:from-primary [&>li:before]:to-accent">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 space-y-2 list-decimal list-outside ml-5 marker:text-primary marker:font-semibold">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground/80 leading-relaxed">{children}</li>
          ),
          hr: () => <hr className="my-10 border-border/50" />,
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-border/50">
              <table className="min-w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/40">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/50">{children}</tbody>
          ),
          tr: ({ children }) => <tr className="hover:bg-muted/20 transition-colors">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 sm:px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 sm:px-4 py-2.5 text-foreground/85 align-top">{children}</td>
          ),
          a: ({ href, children }) => {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
              >
                {children}
              </a>
            );
          },
          pre: ({ children }) => {
            const codeEl = (Array.isArray(children) ? children[0] : children) as
              | { props?: { className?: string; children?: ReactNode } }
              | undefined;
            const codeClassName: string | undefined = codeEl?.props?.className;
            const codeChildren: ReactNode = codeEl?.props?.children;
            // A ```diagram fence names an SVG architecture diagram rather than
            // holding code; render the component instead of a code block.
            if (/\blanguage-diagram\b/.test(codeClassName || "")) {
              const key = nodeToText(codeChildren).trim();
              const Diagram = DIAGRAMS[key];
              if (Diagram) return <Diagram />;
            }
            // A ```terminal fence holds real CLI output; render it in terminal
            // chrome rather than as a plain code block.
            if (/\blanguage-terminal\b/.test(codeClassName || "")) {
              return <Terminal content={nodeToText(codeChildren)} />;
            }
            // A ```status-summary fence holds the page title; it renders the
            // title and a summary of the page's status tables.
            if (/\blanguage-status-summary\b/.test(codeClassName || "")) {
              return <StatusSummary title={nodeToText(codeChildren).trim()} markdown={content} />;
            }
            return <CodeBlock className={codeClassName}>{codeChildren}</CodeBlock>;
          },
          code: ({ className, children }) => {
            // Inline only — block code is intercepted by `pre`.
            // `status:<key>` is a status pill, not code.
            const status = typeof children === "string" ? parseStatus(children) : null;
            if (status) return <StatusPill status={status} />;
            return <code className={className}>{children}</code>;
          },
          // Screenshots and figures. `title` (the quoted part of a markdown
          // image) becomes the caption: ![alt](/img/x.png "Caption text")
          img: ({ src, alt, title }) => (
            <figure className="my-7">
              <img
                src={typeof src === "string" ? src : undefined}
                alt={alt || ""}
                loading="lazy"
                decoding="async"
                className="w-full rounded-xl border border-border/60 bg-card"
              />
              {(title || alt) && (
                <figcaption className="mt-2 text-center text-[13px] text-muted-foreground">
                  {title || alt}
                </figcaption>
              )}
            </figure>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
