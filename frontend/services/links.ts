const EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

export function externalLink(value: string): string | null {
  const trimmed = value.trim()
  if (
    !trimmed ||
    Array.from(trimmed).some(
      (character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127
    )
  )
    return null
  try {
    const url = new URL(trimmed)
    return EXTERNAL_PROTOCOLS.has(url.protocol) && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}
