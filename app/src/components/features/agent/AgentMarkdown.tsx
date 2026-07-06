"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Markdown renderer for assistant bubbles — Kimi answers with GFM (bold,
 * lists, tables). Loaded lazily by AgentDock so the ~60KB parser only ships
 * once the chat is actually used. Tables get a compact navy-header style and
 * scroll horizontally inside the bubble instead of overflowing it.
 */
export default function AgentMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="my-1 leading-relaxed first:mt-0 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-brand-900">{children}</strong>
        ),
        ul: ({ children }) => <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>,
        ol: ({ children }) => <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>,
        li: ({ children }) => <li className="leading-snug">{children}</li>,
        a: ({ href, children }) => (
          <a
            href={href}
            target={href?.startsWith("/") ? undefined : "_blank"}
            rel="noreferrer"
            className="font-medium text-primary-700 underline underline-offset-2"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[12px]">
            {children}
          </code>
        ),
        table: ({ children }) => (
          <div className="my-2 max-w-full overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full border-collapse text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-brand-900 text-white">{children}</thead>,
        th: ({ children }) => (
          <th className="whitespace-nowrap px-2.5 py-1.5 text-left font-semibold">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border-t border-slate-100 px-2.5 py-1.5 align-top">{children}</td>
        ),
        tr: ({ children }) => <tr className="even:bg-slate-50/60">{children}</tr>,
        h1: ({ children }) => <p className="mt-2 font-bold text-brand-900">{children}</p>,
        h2: ({ children }) => <p className="mt-2 font-bold text-brand-900">{children}</p>,
        h3: ({ children }) => <p className="mt-2 font-semibold text-brand-900">{children}</p>,
        hr: () => <hr className="my-2 border-slate-200" />,
        blockquote: ({ children }) => (
          <blockquote className="my-1 border-l-2 border-accent-400 pl-2 text-slate-600">
            {children}
          </blockquote>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
