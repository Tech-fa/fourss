export type AiWriteContentType = 'markdown' | 'html' | 'text'

export const AI_WRITE_OUTPUT_FORMAT: AiWriteContentType = 'markdown'

export const AI_WRITE_MAX_CONTEXT_CHARS = 12000

/**
 * Instructions the host LLM must follow so SuperDoc can insert the result
 * as Word-compatible document content.
 *
 * SuperDoc does not include a model. Generate content, then insert it:
 * `editor.doc.insert({ value, type: 'markdown' | 'html' })`
 * Sources:
 * - https://docs.superdoc.dev/getting-started/ai
 * - https://docs.superdoc.dev/document-api/reference/insert
 * - https://docs.superdoc.dev/ai/agents/integrations
 */
export const AI_WRITE_OUTPUT_INSTRUCTIONS = [
  'Return GitHub-flavored Markdown that SuperDoc will insert into a Word (.docx) document with editor.doc.insert({ value, type: "markdown" }).',
  'Output only the document content. No preamble, no explanation, no wrapping markdown code fences.',
  'Use headings, paragraphs, bullet and numbered lists, tables, bold, italic, and links as needed so the result looks like a professional Word document.',
  'Do not use HTML, XML, OOXML, or JSON. Do not invent comments, tracked changes, headers, footers, or page numbers.',
].join('\n')

export function normalizeAiContent(raw: string | null | undefined): string {
  if (!raw) return ''
  let text = raw.trim()
  const fenced = text.match(/^```(?:markdown|md|html)?\s*\n([\s\S]*?)\n```$/i)
  if (fenced?.[1]) text = fenced[1].trim()
  return text
}

export function truncateAiContext(value: string, maxChars = AI_WRITE_MAX_CONTEXT_CHARS): string {
  const trimmed = value.trim()
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, maxChars)}\n…`
}

export function getSelectedText(editor: any): string {
  const selection = editor?.state?.selection
  const doc = editor?.state?.doc
  if (!selection || !doc || selection.empty) return ''
  try {
    return truncateAiContext(doc.textBetween(selection.from, selection.to, '\n', '\n'))
  } catch {
    return ''
  }
}

export function getDocumentPlainText(editor: any): string {
  const doc = editor?.state?.doc
  if (!doc) return ''
  try {
    return truncateAiContext(doc.textBetween(0, doc.content.size, '\n', '\n'))
  } catch {
    return ''
  }
}

function receiptLooksApplied(receipt: unknown): boolean {
  if (receipt == null) return true
  if (typeof receipt !== 'object') return Boolean(receipt)
  const value = receipt as { success?: unknown; outcome?: unknown }
  if (value.success === false) return false
  if (value.outcome === 'NO_OP') return false
  return true
}

/**
 * Insert model output into the live SuperDoc editor.
 * Prefer the Document API (`doc.insert`); fall back to SuperEditor `insertContent` at the cursor.
 */
export function insertAiContent(
  editor: any,
  content: string,
  contentType: AiWriteContentType = 'markdown',
): boolean {
  const value = normalizeAiContent(content)
  if (!value || !editor) return false

  if (typeof editor.commands?.insertContent === 'function') {
    try {
      editor.view?.focus?.()
      const inserted = editor.commands.insertContent(value, { contentType })
      if (inserted !== false) return true
    } catch {
      // Fall through to Document API append.
    }
  }

  if (typeof editor.doc?.insert === 'function') {
    try {
      const receipt = editor.doc.insert({ value, type: contentType })
      if (receiptLooksApplied(receipt)) return true
    } catch {
      return false
    }
  }

  return false
}
