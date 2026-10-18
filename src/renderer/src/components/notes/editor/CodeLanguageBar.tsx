import type { Editor } from '@tiptap/react'
import { Code2 } from 'lucide-react'
import type React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { LANGUAGE_LABELS } from './CodeBlockView'

const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'html',
  'css',
  'rust',
  'go',
  'bash',
  'json',
  'sql',
  'java',
  'yaml'
]

export const CodeLanguageBar: React.FC<{ editor: Editor }> = ({ editor }) => (
  <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card p-1 pl-2.5 shadow-sm">
    <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground/70">
      <Code2 className="size-3.5" />
      Language
    </span>
    <Select
      value={editor.getAttributes('codeBlock').language || 'javascript'}
      onValueChange={(val) =>
        editor.chain().focus().updateAttributes('codeBlock', { language: val }).run()
      }
    >
      <SelectTrigger size="sm" className="h-7 w-28 text-xs font-medium">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((lang) => (
          <SelectItem key={lang} value={lang}>
            {LANGUAGE_LABELS[lang] ?? lang}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)
