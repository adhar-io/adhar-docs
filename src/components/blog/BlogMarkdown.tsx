import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { Check, Copy, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
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

const CodeBlock = ({ className, children }: { className?: string; children: ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const lang = /language-(\w+)/.exec(className || "")?.[1] || "text";
  const raw = nodeToText(children);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };

  return (
    <div className="my-8 relative group">
      <div className="bg-muted/40 ring-1 ring-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/60">
          <span className="text-xs font-medium text-muted-foreground tabular">
            {lang}
          </span>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="!m-0 !rounded-none !bg-transparent overflow-x-auto p-5 text-[13.5px] leading-relaxed">
          <code className={className}>{children}</code>
        </pre>
      </div>
    </div>
  );
};

const BlogMarkdown = ({ content, className }: Props) => {
  return (
    <div className={cn("blog-prose blog-article-body max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={{
          h1: ({ children, id }) => (
            <h1 id={id} className="group relative font-semibold text-3xl md:text-4xl text-foreground mt-14 mb-6 leading-[1.1] tracking-[-0.02em] scroll-mt-28">
              {id && (
                <a href={`#${id}`} aria-label="Anchor link" className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hidden md:inline-flex">
                  <Link2 className="w-4 h-4" />
                </a>
              )}
              {children}
            </h1>
          ),
          h2: ({ children, id }) => (
            <h2 id={id} className="group relative font-semibold text-2xl md:text-3xl text-foreground mt-14 mb-5 leading-tight tracking-[-0.02em] scroll-mt-28">
              {id && (
                <a href={`#${id}`} aria-label="Anchor link" className="absolute -left-6 top-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hidden md:inline-flex">
                  <Link2 className="w-3.5 h-3.5" />
                </a>
              )}
              {children}
            </h2>
          ),
          h3: ({ children, id }) => (
            <h3 id={id} className="group relative font-semibold text-lg md:text-xl text-foreground mt-10 mb-3 leading-snug tracking-tight scroll-mt-28">
              {id && (
                <a href={`#${id}`} aria-label="Anchor link" className="absolute -left-5 top-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hidden md:inline-flex">
                  <Link2 className="w-3 h-3" />
                </a>
              )}
              {children}
            </h3>
          ),
          h4: ({ children, id }) => (
            <h4 id={id} className="text-sm font-semibold text-foreground mt-8 mb-2 scroll-mt-28">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-foreground/85 text-[17px] leading-[1.75] mb-5">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="text-foreground font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="text-foreground/85">{children}</em>,
          a: ({ href, children }) => {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="text-primary underline decoration-primary/40 underline-offset-[3px] hover:decoration-primary transition-all"
              >
                {children}
              </a>
            );
          },
          ul: ({ children }) => (
            <ul className="my-5 space-y-2 text-foreground/85 text-[17px] leading-relaxed">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-5 space-y-2 text-foreground/85 text-[17px] leading-relaxed list-decimal list-outside ml-6 marker:text-muted-foreground marker:font-medium">
              {children}
            </ol>
          ),
          li: ({ children, ordered }: { children?: ReactNode; ordered?: boolean }) =>
            ordered ? (
              <li className="pl-2">{children}</li>
            ) : (
              <li className="flex gap-3">
                <span className="text-primary mt-2.5 leading-none shrink-0 w-1.5 h-1.5 rounded-full bg-primary/70" />
                <span className="flex-1">{children}</span>
              </li>
            ),
          blockquote: ({ children }) => (
            <blockquote className="my-10 border-l-2 border-primary/60 pl-6 [&>p]:text-lg md:[&>p]:text-xl [&>p]:text-foreground [&>p]:leading-relaxed [&>p]:m-0 [&>p]:font-medium">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-12 border-border" />,
          img: ({ src, alt }) => (
            <figure className="my-10">
              <img
                src={src}
                alt={alt}
                className="w-full rounded-xl ring-1 ring-border"
              />
              {alt && (
                <figcaption className="text-center text-xs text-muted-foreground mt-3">{alt}</figcaption>
              )}
            </figure>
          ),
          table: ({ children }) => (
            <div className="my-8 overflow-x-auto rounded-xl ring-1 ring-border">
              <table className="min-w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">{children}</tbody>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-foreground/85 align-top">{children}</td>
          ),
          pre: ({ children }) => {
            const codeEl: any = Array.isArray(children) ? children[0] : children;
            return (
              <CodeBlock className={codeEl?.props?.className}>
                {codeEl?.props?.children}
              </CodeBlock>
            );
          },
          code: ({ className, children }) => (
            <code
              className={cn(
                className,
                "px-1.5 py-0.5 rounded bg-muted text-foreground text-[0.88em] font-mono ring-1 ring-border",
              )}
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default BlogMarkdown;
