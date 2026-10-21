// biome-ignore-all lint/suspicious/noArrayIndexKey: Parsed text tokens use source positions because they have no persistent IDs.
import type { Element as HastElement, Root as HastRoot, RootContent } from 'hast'
import { common, createLowlight } from 'lowlight'
import { Check, Copy } from 'lucide-react'
import React, { useMemo } from 'react'
import { externalLink } from '../../services/links'
import { toast } from './toast'
import { cn } from './utils'

const lowlight = createLowlight(common)

const renderHastNode = (node: RootContent, key: number): React.ReactNode => {
  if (node.type === 'text') return node.value
  if (node.type === 'element') {
    const el = node as HastElement
    const className = Array.isArray(el.properties?.className)
      ? el.properties.className.join(' ')
      : undefined
    return (
      <span key={key} className={className}>
        {el.children.map((child, i) => renderHastNode(child, i))}
      </span>
    )
  }
  return null
}

const renderHastRoot = (root: HastRoot): React.ReactNode[] =>
  root.children.map((child, i) => renderHastNode(child, i))

interface MarkdownRendererProps {
  content: string
  compact?: boolean
  className?: string
}

const CodeBlock: React.FC<{ code: string; lang: string; compact?: boolean }> = ({
  code,
  lang,
  compact
}) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  const highlightedNodes = useMemo(() => {
    if (lang && lowlight.registered(lang)) {
      try {
        return renderHastRoot(lowlight.highlight(lang, code))
      } catch {
        // fallback
      }
    }
    try {
      return renderHastRoot(lowlight.highlightAuto(code))
    } catch {
      return null
    }
  }, [code, lang])

  const lineCount = code.split('\n').length

  return (
    <div
      className={
        compact
          ? 'my-2 overflow-hidden rounded-lg border border-border/70 bg-card/80 backdrop-blur-xs shadow-xs'
          : 'my-3 overflow-hidden rounded-xl border border-border/80 bg-card/90 dark:bg-card/70 backdrop-blur-md shadow-md'
      }
    >
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/60 px-3 py-1.5 text-2xs">
        <div className="flex items-center gap-2 font-mono">
          <span className="font-semibold uppercase tracking-wider text-primary">
            {lang || 'code'}
          </span>
          <span className="text-muted-foreground/70">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Copy code"
          aria-label="Copy code"
        >
          {copied ? (
            <span className="text-emerald-500 font-medium flex items-center gap-1">
              <Check className="size-3" /> Copied!
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Copy className="size-3" /> Copy
            </span>
          )}
        </button>
      </div>
      <pre
        className={
          compact
            ? 'p-3 font-mono text-2xs overflow-x-auto text-foreground select-text m-0'
            : 'p-4 font-mono text-xs leading-relaxed overflow-x-auto text-foreground select-text m-0'
        }
      >
        {highlightedNodes ? (
          <code className="hljs bg-transparent! p-0!">{highlightedNodes}</code>
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  )
}

const BlockquoteBlock: React.FC<{
  children: React.ReactNode
  compact?: boolean
  textContent: string
}> = ({ children, compact, textContent }) => {
  const [copied, setCopied] = React.useState(false)

  const isEmailOrReply = useMemo(() => {
    const trimmed = textContent.trim()
    return (
      /^(?:hi\b|dear\b|hello\b|good\s+(?:morning|afternoon)|thanks\b|thank\s+you\b)/i.test(
        trimmed
      ) ||
      /(?:regards|best\s+regards|sincerely|thanks\s+and\s+regards|warm\s+regards|cheers),?\s*$/i.test(
        trimmed
      )
    )
  }, [textContent])

  const handleCopy = async (): Promise<void> => {
    try {
      const clean = textContent
        .split('\n')
        .map((l) => l.replace(/^>\s?/, ''))
        .join('\n')
        .trim()
      await navigator.clipboard.writeText(clean)
      setCopied(true)
      toast.success(
        isEmailOrReply ? 'Email draft copied to clipboard' : 'Quote copied to clipboard'
      )
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <blockquote
      className={cn(
        'group relative my-3 rounded-r-xl border-l-[3.5px] border-notes bg-muted/30 dark:bg-muted/15 border border-border/40 border-l-transparent transition-all hover:bg-muted/40',
        compact ? 'pl-3.5 pr-3 py-2 text-xs my-2' : 'pl-4 pr-3.5 py-3 text-[0.9375rem] shadow-2xs'
      )}
    >
      <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
        {isEmailOrReply && (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-3xs font-medium uppercase tracking-wider text-notes bg-notes/10 border border-notes/20">
            Email Draft
          </span>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium text-muted-foreground hover:text-foreground bg-background/90 hover:bg-background border border-border/60 shadow-2xs cursor-pointer transition-colors"
          title={isEmailOrReply ? 'Copy email draft' : 'Copy quote'}
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-500" />
              <span className="text-emerald-500 text-3xs font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span className="text-3xs">Copy</span>
            </>
          )}
        </button>
      </div>

      <div
        className={cn(
          'space-y-2.5 text-foreground/95 font-normal not-italic leading-relaxed',
          compact && 'space-y-1.5 text-xs'
        )}
      >
        {children}
      </div>
    </blockquote>
  )
}

const parseInlineMarkdown = (text: string, compact = false): React.ReactNode[] => {
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
  const tokens = text.split(regex)

  return tokens.map((token, i) => {
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code
          key={i}
          className={
            compact
              ? 'px-1.5 py-0.5 rounded-md bg-muted/80 font-mono text-2xs text-notes font-medium border border-border/40 break-words'
              : 'px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-primary font-semibold break-words'
          }
        >
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={i} className="italic text-foreground/90">
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const closeBracketIdx = token.indexOf('](')
      const linkText = token.slice(1, closeBracketIdx)
      const url = externalLink(token.slice(closeBracketIdx + 2, -1))
      if (!url) return linkText
      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-semibold"
        >
          {linkText}
        </a>
      )
    }
    return token
  })
}

const parseMarkdownTable = (
  tableLines: string[],
  key: string | number,
  compact: boolean
): React.ReactNode => {
  const cleanCells = (row: string): string[] => {
    const cells = row.split('|').map((c) => c.trim())
    if (cells[0] === '') cells.shift()
    if (cells[cells.length - 1] === '') cells.pop()
    return cells
  }

  const headerCells = cleanCells(tableLines[0])
  const alignments: ('left' | 'center' | 'right')[] = []
  if (tableLines[1]) {
    const alignCells = cleanCells(tableLines[1])
    alignCells.forEach((cell) => {
      const left = cell.startsWith(':')
      const right = cell.endsWith(':')
      if (left && right) alignments.push('center')
      else if (right) alignments.push('right')
      else alignments.push('left')
    })
  }

  const bodyRows = tableLines.slice(2).map((row) => cleanCells(row))

  return (
    <div
      key={`table-wrapper-${key}`}
      className={
        compact
          ? 'my-2 overflow-x-auto w-full max-w-full rounded-xl border border-border/80 bg-card/60 backdrop-blur-md shadow-xs first:mt-0 last:mb-0'
          : 'my-4 overflow-x-auto w-full max-w-full rounded-xl border border-border/80 bg-card/60 backdrop-blur-md shadow-sm first:mt-0 last:mb-0'
      }
    >
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="bg-muted/80 border-b border-border/60 font-semibold">
            {headerCells.map((header, i) => {
              const align = alignments[i] || 'left'
              return (
                <th
                  key={i}
                  className="px-4 py-2.5 font-bold text-foreground uppercase tracking-wider text-2xs border-r border-border/20 last:border-r-0"
                  style={{ textAlign: align }}
                >
                  {parseInlineMarkdown(header, compact)}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
              {headerCells.map((_, cIdx) => {
                const cellContent = row[cIdx] || ''
                const align = alignments[cIdx] || 'left'
                return (
                  <td
                    key={cIdx}
                    className="px-4 py-2 text-foreground/80 border-r border-border/10 last:border-r-0 font-medium"
                    style={{ textAlign: align }}
                  >
                    {parseInlineMarkdown(cellContent, compact)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const MarkdownRendererImpl: React.FC<MarkdownRendererProps> = ({
  content,
  compact = false,
  className
}) => {
  const elements = useMemo(() => {
    const rawLines = content.split('\n')

    const parseBlocks = (lines: string[], keyPrefix = '', depth = 0): React.ReactNode[] => {
      if (depth > 4) {
        return lines.map((l, i) => (
          <p key={`${keyPrefix}overflow-${i}`} className="my-1.5">
            {parseInlineMarkdown(l, compact)}
          </p>
        ))
      }

      const result: React.ReactNode[] = []
      let currentList: string[] = []
      let listType: 'bullet' | 'ordered' | null = null
      let listStart = 1
      let currentTableLines: string[] = []
      let currentBlockquoteLines: string[] = []
      let inCodeBlock = false
      let codeBlockLanguage = ''
      let codeBlockLines: string[] = []

      const flushList = (key: string | number): void => {
        if (currentList.length > 0) {
          if (listType === 'ordered') {
            result.push(
              <ol
                key={`${keyPrefix}list-${key}`}
                start={listStart}
                className={
                  compact
                    ? 'list-decimal list-outside pl-5 space-y-1.5 my-2 text-xs leading-relaxed first:mt-0 last:mb-0'
                    : 'list-decimal list-outside pl-6 space-y-2 my-2.5 text-[0.9375rem] leading-relaxed first:mt-0 last:mb-0'
                }
              >
                {currentList.map((item, i) => (
                  <li key={i} className="break-words">
                    {parseInlineMarkdown(item, compact)}
                  </li>
                ))}
              </ol>
            )
          } else {
            result.push(
              <ul
                key={`${keyPrefix}list-${key}`}
                className={
                  compact
                    ? 'list-disc list-outside pl-5 space-y-1.5 my-2 text-xs leading-relaxed first:mt-0 last:mb-0'
                    : 'list-disc list-outside pl-6 space-y-2 my-2.5 text-[0.9375rem] leading-relaxed first:mt-0 last:mb-0'
                }
              >
                {currentList.map((item, i) => (
                  <li key={i} className="break-words">
                    {parseInlineMarkdown(item, compact)}
                  </li>
                ))}
              </ul>
            )
          }
          currentList = []
          listType = null
          listStart = 1
        }
      }

      const flushTable = (key: string | number): void => {
        if (currentTableLines.length > 0) {
          result.push(parseMarkdownTable(currentTableLines, `${keyPrefix}tbl-${key}`, compact))
          currentTableLines = []
        }
      }

      const flushBlockquote = (key: string | number): void => {
        if (currentBlockquoteLines.length > 0) {
          const innerLines = currentBlockquoteLines.map((l) => l.replace(/^>\s?/, ''))
          const textContent = innerLines.join('\n')
          currentBlockquoteLines = []
          const innerNodes = parseBlocks(innerLines, `${keyPrefix}bq-${key}-`, depth + 1)
          result.push(
            <BlockquoteBlock
              key={`${keyPrefix}quote-${key}`}
              compact={compact}
              textContent={textContent}
            >
              {innerNodes}
            </BlockquoteBlock>
          )
        }
      }

      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx]
        const trimmed = line.trim()

        if (inCodeBlock) {
          if (trimmed.startsWith('```')) {
            const codeText = codeBlockLines.join('\n')
            result.push(
              <CodeBlock
                key={`${keyPrefix}code-${idx}`}
                code={codeText}
                lang={codeBlockLanguage}
                compact={compact}
              />
            )
            inCodeBlock = false
            codeBlockLines = []
            codeBlockLanguage = ''
          } else {
            codeBlockLines.push(line)
          }
          continue
        }

        if (trimmed.startsWith('```')) {
          flushList(idx)
          flushTable(idx)
          flushBlockquote(idx)
          inCodeBlock = true
          codeBlockLanguage = trimmed.slice(3).trim()
          continue
        }

        if (trimmed.startsWith('>')) {
          flushList(idx)
          flushTable(idx)
          currentBlockquoteLines.push(line.replace(/^\s+/, ''))
          continue
        } else {
          flushBlockquote(idx)
        }

        if (trimmed === '') {
          if (currentList.length > 0) {
            let continuesList = false
            for (let look = idx + 1; look < lines.length; look++) {
              const nextTrim = lines[look].trim()
              if (!nextTrim) continue
              const nextBullet = nextTrim.startsWith('- ') || nextTrim.startsWith('* ')
              const nextOrdered = /^\d+\.\s+/.test(nextTrim)
              if (
                (listType === 'bullet' && nextBullet) ||
                (listType === 'ordered' && nextOrdered)
              ) {
                continuesList = true
              }
              break
            }
            if (continuesList) {
              continue
            }
          }
          flushList(idx)
          continue
        }

        const isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1
        if (isTableLine) {
          flushList(idx)
          currentTableLines.push(trimmed)
          continue
        } else {
          flushTable(idx)
        }

        const bulletMatch = trimmed.startsWith('- ') || trimmed.startsWith('* ')
        const orderedMatch = /^(\d+)\.\s+(.*)$/.exec(trimmed)

        if (bulletMatch || orderedMatch) {
          const type = bulletMatch ? 'bullet' : 'ordered'
          const itemContent = bulletMatch ? trimmed.slice(2) : (orderedMatch?.[2] ?? '')

          if (listType && listType !== type) {
            flushList(idx)
          }

          if (currentList.length === 0 && orderedMatch) {
            listStart = parseInt(orderedMatch[1], 10) || 1
          }

          listType = type
          currentList.push(itemContent)
          continue
        } else if (currentList.length > 0 && (line.startsWith('  ') || line.startsWith('\t'))) {
          currentList[currentList.length - 1] += ` ${trimmed}`
          continue
        } else {
          flushList(idx)
        }

        if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
          result.push(
            <hr
              key={`${keyPrefix}hr-${idx}`}
              className={
                compact
                  ? 'my-2 border-t border-border/60 w-full'
                  : 'my-4 border-t border-border/60 w-full'
              }
            />
          )
          continue
        }

        if (trimmed.startsWith('#')) {
          const match = trimmed.match(/^(#{1,6})\s+(.*)$/)
          if (match) {
            const level = match[1].length
            const headerText = match[2]
            let className = ''
            let Tag: 'h2' | 'h3' | 'h4' | 'h5' | 'h6' = 'h4'

            switch (level) {
              case 1:
                Tag = 'h2'
                className = compact
                  ? 'text-sm font-bold text-foreground mt-3 mb-1.5 border-b border-border/30 pb-1 first:mt-0 last:mb-0'
                  : 'text-lg font-black text-foreground mt-8 mb-3 first:mt-0 last:mb-0'
                break
              case 2:
                Tag = 'h3'
                className = compact
                  ? 'text-xs font-bold text-notes mt-2.5 mb-1 first:mt-0 last:mb-0'
                  : 'text-base font-bold text-foreground mt-6 mb-2 first:mt-0 last:mb-0'
                break
              case 3:
                Tag = 'h4'
                className = compact
                  ? 'text-xs font-semibold text-foreground mt-2 mb-1 first:mt-0 last:mb-0'
                  : 'text-sm font-bold text-foreground mt-5 mb-2 border-b border-border/40 pb-1 first:mt-0 last:mb-0'
                break
              default:
                Tag = 'h4'
                className = compact
                  ? 'text-xs font-medium text-foreground/90 mt-1.5 mb-0.5 first:mt-0 last:mb-0'
                  : 'text-xs font-bold text-foreground/90 mt-4 mb-2 first:mt-0 last:mb-0'
                break
            }

            result.push(
              <Tag key={`${keyPrefix}h-${idx}`} className={className}>
                {parseInlineMarkdown(headerText, compact)}
              </Tag>
            )
            continue
          }
        }

        result.push(
          <p
            key={`${keyPrefix}p-${idx}`}
            className={
              compact
                ? 'my-1.5 leading-relaxed text-foreground/95 first:mt-0 last:mb-0'
                : 'my-2 leading-relaxed text-foreground/95 first:mt-0 last:mb-0'
            }
          >
            {parseInlineMarkdown(line, compact)}
          </p>
        )
      }

      flushList('final')
      flushTable('final')
      flushBlockquote('final')

      if (inCodeBlock && codeBlockLines.length > 0) {
        result.push(
          <CodeBlock
            key={`${keyPrefix}code-final`}
            code={codeBlockLines.join('\n')}
            lang={codeBlockLanguage}
            compact={compact}
          />
        )
      }

      return result
    }

    return parseBlocks(rawLines)
  }, [content, compact])

  return (
    <div
      className={
        className ||
        (compact
          ? 'space-y-2 text-xs leading-relaxed tracking-normal text-foreground select-text w-full max-w-full break-words overflow-x-hidden'
          : 'space-y-3 text-[0.9375rem] leading-[1.7] tracking-normal text-foreground select-text w-full max-w-full break-words overflow-x-hidden')
      }
    >
      {elements}
    </div>
  )
}

export const MarkdownRenderer = React.memo(MarkdownRendererImpl)
