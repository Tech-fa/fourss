import type { Editor, SuperDoc } from 'superdoc'
import type { Node as PmNode } from 'prosemirror-model'
import type { Transaction } from 'prosemirror-state'

/** Matches SuperDoc mixed-bidi strong RTL detection. */
const STRONG_RTL_RE = /[\u0590-\u08FF\p{Script=Hebrew}\p{Script=Arabic}]/u
const STRONG_LTR_RE = /[A-Za-z\u00C0-\u024F]/

export type BaseDirection = 'ltr' | 'rtl'

export function detectBaseDirection(text: string): BaseDirection | null {
  const sample = text.replace(/\u200b/g, '')
  for (const char of sample) {
    if (STRONG_RTL_RE.test(char)) return 'rtl'
    if (STRONG_LTR_RE.test(char)) return 'ltr'
  }
  return null
}

function paragraphPositionsInRange(doc: PmNode, from: number, to: number): number[] {
  const positions: number[] = []
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === 'paragraph') positions.push(pos)
    return true
  })
  return positions
}

function changedDocRange(transaction: Transaction): { from: number; to: number } | null {
  if (!transaction.docChanged) return null
  let from = Infinity
  let to = 0
  for (const step of transaction.steps) {
    step.getMap().forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      from = Math.min(from, newStart)
      to = Math.max(to, newEnd)
    })
  }
  return from === Infinity ? null : { from, to }
}

function applyDirectionToParagraph(
  paragraphProperties: Record<string, unknown>,
  direction: BaseDirection | null,
): Record<string, unknown> {
  const next = { ...paragraphProperties }
  const currentRtl = next.rightToLeft === true

  if (direction === 'rtl') {
    if (currentRtl) return paragraphProperties
    next.rightToLeft = true
    const j = next.justification
    if (j === 'left') next.justification = 'right'
  } else if (direction === 'ltr') {
    if (!currentRtl) return paragraphProperties
    delete next.rightToLeft
    const j = next.justification
    if (j === 'right') next.justification = 'left'
  } else {
    if (next.rightToLeft === undefined) return paragraphProperties
    delete next.rightToLeft
  }

  return next
}

const syncing = new WeakSet<Editor>()

export function syncAutoParagraphDirection(editor: Editor, transaction: Transaction): void {
  if (syncing.has(editor)) return

  const range = changedDocRange(transaction)
  const { from: selFrom, to: selTo } = editor.state.selection
  let scanFrom = selFrom
  let scanTo = selTo
  if (range) {
    scanFrom = Math.min(scanFrom, range.from)
    scanTo = Math.max(scanTo, range.to)
  }

  const positions = new Set(paragraphPositionsInRange(editor.state.doc, scanFrom, scanTo))
  if (positions.size === 0) return

  const tr = editor.state.tr
  let touched = false

  for (const pos of positions) {
    const node = editor.state.doc.nodeAt(pos)
    if (!node || node.type.name !== 'paragraph') continue

    const existing = (node.attrs.paragraphProperties as Record<string, unknown> | undefined) ?? {}
    const detected = detectBaseDirection(node.textContent)
    const updated = applyDirectionToParagraph(existing, detected)
    if (updated === existing) continue

    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      paragraphProperties: updated,
    })
    touched = true
  }

  if (!touched) return

  syncing.add(editor)
  try {
    editor.dispatch(tr)
  } finally {
    syncing.delete(editor)
  }
}

const wiredEditors = new WeakSet<Editor>()

function bootstrapAutoParagraphDirection(editor: Editor): void {
  if (syncing.has(editor)) return

  const tr = editor.state.tr
  let touched = false

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'paragraph') return true

    const existing = (node.attrs.paragraphProperties as Record<string, unknown> | undefined) ?? {}
    const detected = detectBaseDirection(node.textContent)
    const updated = applyDirectionToParagraph(existing, detected)
    if (updated === existing) return true

    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      paragraphProperties: updated,
    })
    touched = true
    return true
  })

  if (!touched) return

  syncing.add(editor)
  try {
    editor.dispatch(tr)
  } finally {
    syncing.delete(editor)
  }
}

export function attachAutoParagraphDirection(
  editor: Editor,
  options?: { bootstrap?: boolean },
): void {
  if (wiredEditors.has(editor)) {
    if (options?.bootstrap) bootstrapAutoParagraphDirection(editor)
    return
  }

  wiredEditors.add(editor)
  editor.on('update', ({ editor: ed, transaction }) => {
    syncAutoParagraphDirection(ed, transaction)
  })

  if (options?.bootstrap) bootstrapAutoParagraphDirection(editor)
}

type EditorUpdatePayload = {
  editor?: Editor
  sourceEditor?: Editor
  surface?: string
}

export function wireAutoParagraphDirection(superdoc: SuperDoc): () => void {
  const onEditorCreate = ({ editor }: { editor: Editor }) => attachAutoParagraphDirection(editor)
  const onReady = () => {
    if (superdoc.activeEditor) attachAutoParagraphDirection(superdoc.activeEditor)
  }
  const onEditorUpdate = (params: EditorUpdatePayload = {}) => {
    if (params.surface !== 'header' && params.surface !== 'footer') return
    const hfEditor = params.sourceEditor ?? params.editor
    if (hfEditor) attachAutoParagraphDirection(hfEditor, { bootstrap: true })
  }

  superdoc.on('editorCreate', onEditorCreate)
  superdoc.on('ready', onReady)
  superdoc.on?.('editor-update', onEditorUpdate)

  if (superdoc.activeEditor) attachAutoParagraphDirection(superdoc.activeEditor)

  return () => {
    superdoc.off('editorCreate', onEditorCreate)
    superdoc.off('ready', onReady)
    superdoc.off?.('editor-update', onEditorUpdate)
  }
}
