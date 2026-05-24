
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from "@/lib/utils";
import CodeExample from './CodeExample';

interface EnhancedMarkdownRendererProps {
  content: string;
  className?: string;
}

const EnhancedMarkdownRenderer = ({ content, className }: EnhancedMarkdownRendererProps) => {
  return (
    <div className={cn("prose prose-gray dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-3xl font-semibold mt-12 mb-6 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-6 text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
              {children}
            </p>
          ),
          code: ({ children, className, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            
            return isInline ? (
              <code 
                className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 rounded-md text-sm font-mono border border-gray-200 dark:border-gray-700" 
                {...props}
              >
                {children}
              </code>
            ) : (
              <div className="my-6">
                <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-6 rounded-lg overflow-x-auto text-sm font-mono border border-gray-800 shadow-lg">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          pre: ({ children }) => (
            <>{children}</>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-6 py-4 mb-6 bg-blue-50 dark:bg-blue-900/20 text-gray-700 dark:text-gray-300 italic rounded-r-lg">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-6 mb-6 space-y-2 text-gray-700 dark:text-gray-300 text-lg">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-6 mb-6 space-y-2 text-gray-700 dark:text-gray-300 text-lg">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="mb-1 leading-relaxed">{children}</li>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-8 rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 dark:bg-gray-800">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline underline-offset-2 transition-colors"
              target={href?.startsWith('http') ? '_blank' : '_self'}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800 dark:text-gray-200">
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default EnhancedMarkdownRenderer;
