import { applyTextHighlight, hasHighlightableSelection } from './highlightOnly'

/**
 * Stored as a highlight color that is not a Word highlight keyword, so it
 * round-trips through docx shading and comes back as the same color.
 * Read-only views paint over runs with this color. Editing views keep the
 * words readable and mark them so they can be cleared.
 */
export const READER_MASK_COLOR = '#6D28D9'

export const READER_MASK_MARKED_CLASS = 'sd-reader-mask-marked'
export const READER_MASK_HIDDEN_CLASS = 'sd-reader-mask-hidden'

const MASKED_TEXT_ATTR = 'data-reader-mask'
const REDACTION_CHAR = '\u2588'

function isRedactionText(value: string) {
  let sawBar = false
  for (const char of value) {
    if (char === REDACTION_CHAR) {
      sawBar = true
      continue
    }
    if (char === ' ' || char === '\n' || char === '\t' || char === '\u00a0') continue
    return false
  }
  return sawBar
}

function redactElementText(node: HTMLElement) {
  const text = node.textContent ?? ''
  if (!text || isRedactionText(text)) return
  const next = [...text]
    .map((char) => (char === ' ' || char === '\n' || char === '\t' || char === '\u00a0' ? char : REDACTION_CHAR))
    .join('')
  if (next !== text) node.textContent = next
}

type MaskMark = { attrs?: { color?: string | null } }

type MaskTextNode = {
  isText?: boolean
  nodeSize: number
  marks?: unknown[]
}

type MaskTransaction = {
  docChanged: boolean
  addMark: (from: number, to: number, mark: unknown) => unknown
  removeMark: (from: number, to: number, mark: unknown) => unknown
}

type HighlightMarkType = {
  create: (attrs: { color: string }) => unknown
  isInSet: (marks: unknown[]) => MaskMark | null | undefined
}

export type ReaderMaskEditor = {
  state?: {
    selection?: { from: number; to: number; empty?: boolean }
    schema?: { marks?: { highlight?: HighlightMarkType } }
    doc?: {
      nodesBetween?: (from: number, to: number, fn: (node: MaskTextNode, pos: number) => void) => void
      descendants?: (
        fn: (
          node: { isText?: boolean; marks?: Array<{ type?: { name?: string }; attrs?: Record<string, unknown> }> },
          pos: number
        ) => void
      ) => void
    }
    tr?: MaskTransaction
  }
  view?: { dispatch?: (tr: MaskTransaction) => void }
  commands?: {
    setHighlight?: (color: string) => boolean
    unsetHighlight?: () => boolean
  }
  chain?: () => {
    focus?: () => {
      setHighlight?: (color: string) => { run?: () => boolean }
      unsetHighlight?: () => { run?: () => boolean }
    }
  }
}

export function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  const rgb = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgb) {
    const hex = [rgb[1], rgb[2], rgb[3]]
      .map((channel) => Number(channel).toString(16).padStart(2, '0'))
      .join('')
    return `#${hex.toUpperCase()}`
  }

  let hex = trimmed.replace(/^#/, '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null
  if (hex.length === 3) hex = hex.split('').map((channel) => channel + channel).join('')
  return `#${hex.toUpperCase()}`
}

export function isReaderMaskColor(value: string | null | undefined): boolean {
  return normalizeHexColor(value) === READER_MASK_COLOR
}

function highlightType(editor: ReaderMaskEditor | null | undefined): HighlightMarkType | null {
  return editor?.state?.schema?.marks?.highlight ?? null
}

function forEachSelectedText(
  editor: ReaderMaskEditor,
  visit: (node: MaskTextNode, start: number, end: number) => void
) {
  const selection = editor.state?.selection
  const doc = editor.state?.doc
  if (!selection || !doc?.nodesBetween || selection.from === selection.to) return
  doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (!node.isText) return
    const start = Math.max(pos, selection.from)
    const end = Math.min(pos + node.nodeSize, selection.to)
    if (start < end) visit(node, start, end)
  })
}

export function selectionIsFullyMasked(editor: ReaderMaskEditor | null | undefined): boolean {
  if (!editor || !hasHighlightableSelection(editor)) return false
  const highlight = highlightType(editor)
  if (!highlight) return false

  let sawText = false
  let allMasked = true
  forEachSelectedText(editor, (node) => {
    sawText = true
    const mark = highlight.isInSet(node.marks ?? [])
    if (!isReaderMaskColor(mark?.attrs?.color)) allMasked = false
  })
  return sawText && allMasked
}

export function toggleReaderMask(editor: ReaderMaskEditor | null | undefined): boolean {
  const selection = editor?.state?.selection
  if (!editor || !selection || selection.empty || selection.from >= selection.to) return false
  const mask = !selectionIsFullyMasked(editor)
  const highlight = highlightType(editor)
  const tr = editor.state?.tr
  if (highlight?.create && tr && editor.view?.dispatch) {
    try {
      if (mask) tr.addMark(selection.from, selection.to, highlight.create({ color: READER_MASK_COLOR }))
      else tr.removeMark(selection.from, selection.to, highlight)
      if (!tr.docChanged) return false
      editor.view.dispatch(tr)
      return true
    } catch {
      // Fall through to the highlight command when the editor cannot take a transaction.
    }
  }

  return applyTextHighlight(editor, mask ? READER_MASK_COLOR : null)
}

export function paintReaderMasks(
  root: ParentNode | null | undefined,
  options: { hidden: boolean; hiddenLabel: string }
) {
  if (!root || !('querySelectorAll' in root)) return
  const want = options.hidden ? READER_MASK_HIDDEN_CLASS : READER_MASK_MARKED_CLASS
  const other = options.hidden ? READER_MASK_MARKED_CLASS : READER_MASK_HIDDEN_CLASS
  const mode = options.hidden ? 'hidden' : 'marked'

  root.querySelectorAll('.superdoc-text-run, mark[data-color]').forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    const masked =
      isReaderMaskColor(node.style.backgroundColor) ||
      isReaderMaskColor(node.getAttribute('data-color'))

    if (!masked) {
      node.classList.remove(READER_MASK_MARKED_CLASS, READER_MASK_HIDDEN_CLASS)
      if (node.getAttribute(MASKED_TEXT_ATTR)) {
        if (node.getAttribute('role') === 'img') node.removeAttribute('role')
        node.removeAttribute('aria-label')
        node.removeAttribute(MASKED_TEXT_ATTR)
      }
      return
    }

    // Only the painted page text. The editor's own mark nodes stay intact so the
    // saved document still has the original words.
    if (options.hidden && node.classList.contains('superdoc-text-run')) redactElementText(node)

    if (node.classList.contains(want) && !node.classList.contains(other) && node.getAttribute(MASKED_TEXT_ATTR) === mode) {
      return
    }

    node.classList.add(want)
    node.classList.remove(other)
    node.setAttribute(MASKED_TEXT_ATTR, mode)
    if (options.hidden) {
      node.setAttribute('role', 'img')
      node.setAttribute('aria-label', options.hiddenLabel)
      return
    }
    if (node.getAttribute('role') === 'img') node.removeAttribute('role')
    node.removeAttribute('aria-label')
  })
}

function selectedText(node: Text, range: Range): string {
  const value = node.nodeValue ?? ''
  const start = node === range.startContainer ? range.startOffset : 0
  const end = node === range.endContainer ? range.endOffset : value.length
  return value.slice(start, Math.max(start, end))
}

function isHiddenMaskNode(node: Node): boolean {
  const element = node instanceof Element ? node : node.parentElement
  return Boolean(element?.closest(`.${READER_MASK_HIDDEN_CLASS}`))
}

function textNodesInRange(range: Range): Text[] {
  const ancestor = range.commonAncestorContainer
  if (ancestor.nodeType === Node.TEXT_NODE) return [ancestor as Text]

  const scope = ancestor instanceof Element ? ancestor : ancestor.parentElement
  const doc = scope?.ownerDocument
  if (!scope || !doc) return []

  const walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let current = walker.nextNode()
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      try {
        if (range.intersectsNode(current)) nodes.push(current as Text)
      } catch {
        // Detached nodes are not part of the copy.
      }
    }
    current = walker.nextNode()
  }
  return nodes
}

/** Returns redacted plain text when the selection includes a read-only mask, otherwise null. */
export function redactMaskedSelection(root: HTMLElement, selection: Selection | null): string | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null
  const range = selection.getRangeAt(0)
  const ancestor = range.commonAncestorContainer
  if (ancestor !== root && !root.contains(ancestor)) return null

  const parts: string[] = []
  let sawMask = false
  for (const node of textNodesInRange(range)) {
    if (!root.contains(node)) continue
    const text = selectedText(node, range)
    if (!text) continue
    if (isHiddenMaskNode(node)) {
      sawMask = true
      continue
    }
    parts.push(text)
  }
  return sawMask ? parts.join('') : null
}
