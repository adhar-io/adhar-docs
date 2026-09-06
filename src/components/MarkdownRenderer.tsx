import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

const HeadingAnchor = ({ id }: { id: string }) => (
  <a href={`#${id}`} aria-label="Anchor" className="anchor-link inline-flex">
    <LinkIcon className="w-3.5 h-3.5" />
  </a>
);

const CodeBlock = ({ className, children }: { className?: string; children: ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const lang = /language-(\w+)/.exec(className || "")?.[1];
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
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border border-b-0 border-border/50 rounded-t-xl">
        <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          {lang || "text"}
        </span>
        <button
          onClick={copy}
          className="text-[11px] inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="!mt-0 !rounded-t-none !border-t-0">
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
              className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-foreground"
            >
              {children}
            </h1>
          ),
          h2: ({ children, id }) => {
            const safeId = id || slugify(nodeToText(children));
            return (
              <h2
                id={safeId}
                className="group text-2xl font-semibold mt-12 mb-4 pb-2 border-b border-border/50 text-foreground flex items-center"
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
                className="group text-lg font-semibold mt-8 mb-3 text-foreground flex items-center"
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
          blockquote: ({ children }) => (
            <blockquote className="my-6 border-l-2 border-primary pl-4 py-3 pr-4 bg-primary/5 rounded-r-lg text-foreground/85 [&>p]:mb-0">
              {children}
            </blockquote>
          ),
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
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-foreground/85 align-top">{children}</td>
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
            const codeEl: any = Array.isArray(children) ? children[0] : children;
            const codeClassName: string | undefined = codeEl?.props?.className;
            const codeChildren: ReactNode = codeEl?.props?.children;
            return <CodeBlock className={codeClassName}>{codeChildren}</CodeBlock>;
          },
          code: ({ className, children }) => {
            // Inline only — block code is intercepted by `pre`
            return <code className={className}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
