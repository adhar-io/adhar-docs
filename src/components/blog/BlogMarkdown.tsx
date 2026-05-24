import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { Check, Copy } from "lucide-react";
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
    <div className="my-10 relative group">
      <div className="bg-[hsl(var(--blog-code-bg))] ring-1 ring-[hsl(var(--blog-border)/0.6)] rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-[hsl(var(--blog-border)/0.6)]">
          <span className="text-[10px] font-mono-display uppercase tracking-[0.25em] text-[hsl(var(--blog-subtle))]">
            {lang}
          </span>
          <button
            onClick={copy}
            className="text-[11px] inline-flex items-center gap-1.5 text-[hsl(var(--blog-subtle))] hover:text-[hsl(var(--blog-accent-soft))] transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="!m-0 !rounded-none !bg-transparent overflow-x-auto p-6 text-sm leading-relaxed">
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
            <h1 id={id} className="font-semibold text-5xl md:text-6xl text-[hsl(var(--blog-heading))] mt-16 mb-8 leading-[1.05] tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children, id }) => (
            <h2 id={id} className="font-semibold text-3xl md:text-4xl text-[hsl(var(--blog-heading))] mt-20 mb-8 pb-4 border-b border-[hsl(var(--blog-border)/0.7)] leading-tight">
              {children}
            </h2>
          ),
          h3: ({ children, id }) => (
            <h3 id={id} className="font-semibold text-2xl md:text-3xl text-[hsl(var(--blog-heading))] mt-14 mb-5 leading-snug">
              {children}
            </h3>
          ),
          h4: ({ children, id }) => (
            <h4 id={id} className="text-sm font-semibold uppercase tracking-[0.2em] text-[hsl(var(--blog-accent-soft))] mt-10 mb-4">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-[hsl(var(--blog-muted))] text-lg leading-[1.85] mb-7">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="text-[hsl(var(--blog-heading))] font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="text-[hsl(var(--blog-muted))]">{children}</em>,
          a: ({ href, children }) => {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="text-[hsl(var(--blog-heading))] underline decoration-[hsl(var(--blog-accent))] decoration-2 underline-offset-4 hover:decoration-[3px] transition-all"
              >
                {children}
              </a>
            );
          },
          ul: ({ children }) => (
            <ul className="my-6 space-y-3 text-[hsl(var(--blog-muted))] text-lg leading-relaxed">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-6 space-y-3 text-[hsl(var(--blog-muted))] text-lg leading-relaxed list-decimal list-outside ml-6 marker:text-[hsl(var(--blog-accent-soft))] marker:font-semibold">
              {children}
            </ol>
          ),
          li: ({ children, ordered }: any) =>
            ordered ? (
              <li className="pl-2">{children}</li>
            ) : (
              <li className="flex gap-4">
                <span className="text-[#4f46e5] font-bold mt-2 leading-none shrink-0">—</span>
                <span className="flex-1">{children}</span>
              </li>
            ),
          blockquote: ({ children }) => (
            <blockquote className="my-14 border-l-2 border-[#4f46e5] pl-10 [&>p]:font-semibold [&>p]:italic [&>p]:text-2xl md:[&>p]:text-3xl [&>p]:text-[hsl(var(--blog-heading))] [&>p]:leading-snug [&>p]:m-0">
              {children}
            </blockquote>
          ),
          hr: () => (
            <div className="my-16 flex items-center justify-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[hsl(var(--blog-border))]" />
              <span className="w-1 h-1 rounded-full bg-[hsl(var(--blog-accent))]" />
              <span className="w-1 h-1 rounded-full bg-[hsl(var(--blog-border))]" />
            </div>
          ),
          img: ({ src, alt }) => (
            <figure className="my-12">
              <img
                src={src}
                alt={alt}
                className="w-full ring-1 ring-[hsl(var(--blog-border))] dark:grayscale dark:hover:grayscale-0 transition-all duration-700"
              />
              {alt && (
                <figcaption className="text-center text-xs text-[hsl(var(--blog-subtle))] mt-4 italic">{alt}</figcaption>
              )}
            </figure>
          ),
          table: ({ children }) => (
            <div className="my-10 overflow-x-auto ring-1 ring-[hsl(var(--blog-border))]">
              <table className="min-w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-[hsl(var(--blog-surface))]">{children}</thead>,
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[hsl(var(--blog-border)/0.7)]">{children}</tbody>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--blog-accent-soft))]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-[hsl(var(--blog-muted))] align-top">{children}</td>
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
                "px-1.5 py-0.5 rounded bg-[hsl(var(--blog-inline-code-bg)/0.5)] text-[hsl(var(--blog-accent-soft))] text-[0.9em] font-mono",
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
