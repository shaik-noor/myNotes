import type { NodeViewProps } from '@tiptap/react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { Check, Copy } from 'lucide-react'
import type React from 'react'
import { useCallback, useState } from 'react'

export const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  html: 'HTML',
  css: 'CSS',
  rust: 'Rust',
  go: 'Go',
  bash: 'Shell',
  sh: 'Shell',
  json: 'JSON',
  sql: 'SQL',
  java: 'Java',
  yaml: 'YAML',
  xml: 'XML',
  markdown: 'Markdown',
  md: 'Markdown',
  tsx: 'TSX',
  jsx: 'JSX',
  cpp: 'C++',
  c: 'C',
  cs: 'C#',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  r: 'R',
  dockerfile: 'Dockerfile',
  toml: 'TOML',
  ini: 'INI'
}

export const CodeBlockView: React.FC<NodeViewProps> = ({ node }) => {
  const [copied, setCopied] = useState(false)

  const language: string = node.attrs.language ?? ''
  const label = language ? (LANGUAGE_LABELS[language.toLowerCase()] ?? language) : 'Plain text'

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(node.textContent).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [node])

  return (
    <NodeViewWrapper className="mydesk-code-block not-prose">
      <div className="mydesk-code-header" contentEditable={false}>
        <span className="mydesk-code-lang">{label}</span>
        <button
          type="button"
          className={`mydesk-code-copy${copied ? ' is-copied' : ''}`}
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy code'}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre>
        {/* @ts-ignore */}
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  )
}

