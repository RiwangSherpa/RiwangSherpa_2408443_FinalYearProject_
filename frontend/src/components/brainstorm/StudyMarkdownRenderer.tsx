import React, { memo, useMemo, useState } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'

type StudyMarkdownRendererProps = {
  content: string
  className?: string
}

type CodeRendererProps = {
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

class MarkdownErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

function normalizeMathMarkdown(content: string) {
  return content
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\r\n/g, '\n')
}

function CopyCodeButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function CodeRenderer({ inline, className, children }: CodeRendererProps) {
  const raw = String(children ?? '').replace(/\n$/, '')

  if (inline) {
    return <code className={className}>{raw}</code>
  }

  return (
    <div className="code-block-wrapper my-5 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
          {className?.replace('language-', '') || 'Code'}
        </span>
        <CopyCodeButton text={raw} />
      </div>
      <pre className="m-0 overflow-x-auto p-0">
        <code className={className}>{raw}</code>
      </pre>
    </div>
  )
}

const markdownComponents: Components = {
  code: CodeRenderer,
  pre: ({ children }) => <>{children}</>,
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
      <table>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="bg-neutral-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.04em] text-neutral-700 dark:bg-dark-bg-secondary dark:text-dark-text-secondary">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-t border-neutral-200 px-3 py-2 align-top text-sm text-neutral-700 dark:border-dark-border-primary dark:text-dark-text-secondary">
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-5 rounded-r-lg border-l-4 border-secondary bg-secondary/5 px-4 py-3 text-neutral-700 dark:border-secondary-dark dark:bg-secondary/10 dark:text-dark-text-secondary">
      {children}
    </blockquote>
  ),
}

function StudyMarkdownRenderer({ content, className }: StudyMarkdownRendererProps) {
  const normalizedContent = useMemo(() => normalizeMathMarkdown(content), [content])

  return (
    <MarkdownErrorBoundary
      fallback={
        <div className={className}>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-dark-border-primary dark:bg-dark-bg-tertiary dark:text-dark-text-secondary">
            {content}
          </pre>
        </div>
      }
    >
      <div className={className}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[
            rehypeHighlight,
            [rehypeKatex, { strict: 'ignore', throwOnError: false }],
          ]}
          components={markdownComponents}
        >
          {normalizedContent}
        </ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  )
}

export default memo(StudyMarkdownRenderer)
