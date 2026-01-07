import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div className={cn('prose prose-invert prose-sm max-w-none', className)}>
      <ReactMarkdown
        components={{
          code({ node, className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const isInline = !match && !codeClassName;
          
          if (isInline) {
            return (
              <code
                className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary"
                {...props}
              >
                {children}
              </code>
            );
          }
          
          return (
            <div className="relative group my-4">
              {match && (
                <span className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                  {match[1]}
                </span>
              )}
              <SyntaxHighlighter
                style={oneDark}
                language={match?.[1] || 'text'}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          );
        },
        p({ children }) {
          return <p className="text-foreground leading-relaxed mb-3 last:mb-0">{children}</p>;
        },
        ul({ children }) {
          return <ul className="list-disc list-inside space-y-1 mb-3 text-foreground">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside space-y-1 mb-3 text-foreground">{children}</ol>;
        },
        li({ children }) {
          return <li className="text-foreground">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="text-xl font-bold text-foreground mb-3 mt-4 first:mt-0">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-semibold text-foreground mb-2 mt-4 first:mt-0">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-semibold text-foreground mb-2 mt-3 first:mt-0">{children}</h3>;
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          );
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-3">
              {children}
            </blockquote>
          );
        },
        strong({ children }) {
          return <strong className="font-semibold text-foreground">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
        hr() {
          return <hr className="border-border my-4" />;
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse border border-border">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="border border-border px-3 py-2">{children}</td>;
        },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
