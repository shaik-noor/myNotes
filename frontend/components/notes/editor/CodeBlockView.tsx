import type { NodeViewProps } from '@tiptap/react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { Check, Copy } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

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

import { toast } from '../../ui/toast'

export const CodeBlockView: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  const language: string = node.attrs.language ?? ''
  const label = language ? (LANGUAGE_LABELS[language.toLowerCase()] ?? language) : 'Plain text'

  const handleCopy = useCallback(() => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(node.textContent)
        if (!mounted.current) return
        setCopied(true)
        if (resetTimer.current) clearTimeout(resetTimer.current)
        resetTimer.current = setTimeout(() => setCopied(false), 2000)
      } catch {
        if (mounted.current) toast.error('Could not copy code. Try again.')
      }
    })()
  }, [node])

  return (
    <NodeViewWrapper className="mydesk-code-block not-prose">
      <div className="mydesk-code-header" contentEditable={false}>
        <select
          aria-label="Code language"
          value={language}
          onChange={(event) => updateAttributes({ language: event.target.value || null })}
          className="min-w-0 max-w-[60%] cursor-pointer rounded bg-transparent py-1 pr-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <option value="">Plain text</option>
          {language && !LANGUAGE_LABELS[language] && <option value={language}>{label}</option>}
          {Object.entries(LANGUAGE_LABELS)
            .filter(([value]) => !['sh', 'md'].includes(value) || value === language)
            .map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
        </select>
        <button
          type="button"
          className={`mydesk-code-copy${copied ? ' is-copied' : ''}`}
          onClick={handleCopy}
          title={copied ? 'Copied' : 'Copy code'}
          aria-label={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre>
        {/* @ts-ignore */}
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  )
}
