import type React from 'react'
import { useLayoutEffect, useRef } from 'react'

interface TitleInputProps {
  value: string
  onChange: (value: string) => void
}

export const TitleInput: React.FC<TitleInputProps> = ({ value, onChange }) => {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.preventDefault()
      }}
      rows={1}
      placeholder="Untitled"
      aria-label="Page title"
      className="mt-1 w-full resize-none overflow-hidden border-none bg-transparent p-0 text-3xl font-bold leading-[1.15] tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30 md:text-4xl"
    />
  )
}

