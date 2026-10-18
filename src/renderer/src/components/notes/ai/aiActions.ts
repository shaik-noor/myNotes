export const PLAIN_ENGLISH_STYLE = `[WRITING STYLE — ALWAYS APPLY]
Write in simple, plain English. Use short, common words and short sentences — never a long or fancy word where a plain one works ("use" not "utilize", "help" not "facilitate", "about" not "regarding", "start" not "commence"). Say what you mean directly and get to the point.
Keep a calm, professional, neutral tone. Do not be chatty or overly friendly: skip filler openers ("Thanks for reaching out", "Great question!", "I hope you're well"), hype and cheer ("Good news!", "Awesome!"), exclamation marks, and emojis. Lead with the answer, then the reason, then the next step.`

export const AI_SYSTEM_PROMPT = `You are a professional note editing and writing assistant.
You are given content in Markdown format.
You MUST output ONLY clean Markdown. Do NOT wrap your whole answer in a code fence, and do NOT write explanations or preamble.
Use standard Markdown: # headings, - bullet lists, 1. numbered lists, - [ ] task lists, > blockquotes, **bold**, *italic*, \`inline code\`, fenced code blocks, tables, and [links](url).
Preserve images (![alt](src)) and emojis exactly as they are.
Return only the Markdown content.

${PLAIN_ENGLISH_STYLE}`

export const REWRITE_LABEL = 'Improve writing'

export function buildRewritePrompt(selectionMarkdown: string): string {
  return `Polish and refine the language, grammar, spelling, and tone of the following selection to read as professional, clear, and well-written. Keep the original structure. Here is the content:\n\n${selectionMarkdown}`
}

export function stripCodeFences(response: string): string {
  const cleaned = response.trim()
  const match = cleaned.match(/^```(markdown|md|html|text)?\s*\n([\s\S]*?)\n?```$/i)
  if (match && !match[2].includes('```')) {
    return match[2].trim()
  }
  return cleaned
}

