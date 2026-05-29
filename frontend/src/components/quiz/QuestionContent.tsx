import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'

type QuestionLike = {
  question: string
  code_snippet?: string | null
  codeBlock?: string | null
  code?: string | null
}

function questionReferencesCode(question: string) {
  const lowered = question.toLowerCase()
  return [
    'following code',
    'code snippet',
    'program below',
    'following program',
    'given code',
    'output of this code',
    'output of the code',
  ].some((phrase) => lowered.includes(phrase))
}

function splitQuestion(question: QuestionLike) {
  const explicitCode = question.code_snippet || question.codeBlock || question.code || ''
  const fenceMatch = question.question.match(/```(?:[a-zA-Z0-9_+-]+)?\s*([\s\S]*?)```/)
  const code = (explicitCode || fenceMatch?.[1] || '').trim()
  const text = question.question
    .replace(/```(?:[a-zA-Z0-9_+-]+)?\s*[\s\S]*?```/g, '')
    .trim()

  return { text, code }
}

export default function QuestionContent({ question }: { question: QuestionLike }) {
  const { text, code } = splitQuestion(question)
  const missingRequiredCode = questionReferencesCode(text) && !code

  if (missingRequiredCode) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
        This generated question referenced code, but no code snippet was included. Please regenerate the quiz.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="prose-custom">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeHighlight]}
        >
          {text}
        </ReactMarkdown>
      </div>
      {code && (
        <pre className="max-w-full overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-950 p-4 text-sm leading-6 text-neutral-50 shadow-inner dark:border-dark-border-primary">
          <code className="font-mono">{code}</code>
        </pre>
      )}
    </div>
  )
}
