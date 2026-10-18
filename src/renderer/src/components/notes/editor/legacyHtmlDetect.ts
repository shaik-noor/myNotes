/**
 * Dependency-free legacy-HTML detection.
 */

export function looksLikeLegacyHtml(content: string): boolean {
  const trimmed = content.trimStart()
  if (!trimmed) return false
  return (
    /^<(h[1-6]|p|ul|ol|li|blockquote|pre|table|div|strong|em|hr|img|a)\b[^>]*>/i.test(trimmed) ||
    /^&lt;(h[1-6]|p|ul|ol|li|blockquote|pre|table|div|strong|em|hr|img|a)\b/i.test(trimmed)
  )
}

/** Decode a double-escaped HTML string (`&lt;h1&gt;` → `<h1>`) if present. */
export function decodeHtmlEntities(content: string): string {
  if (!content.includes('&lt;') && !content.includes('&gt;') && !content.includes('&amp;')) {
    return content
  }
  const el = document.createElement('textarea')
  el.innerHTML = content
  return el.value
}

