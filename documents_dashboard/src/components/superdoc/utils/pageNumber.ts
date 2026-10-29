export type PageNumberAlignment = 'left' | 'center' | 'right'

export type PageNumberInsertOption = PageNumberAlignment | 'custom'

const PAGE_NUMBER_CC_TAG = '4es:auto-page-number'

type ContentControlTarget = {
  kind: 'block'
  nodeType: 'sdt'
  nodeId: string
}

type ManagedPageNumber = {
  alignment: PageNumberAlignment
  target: ContentControlTarget
}

function mapStoredJustificationToAlignment(
  justification: string | undefined,
  isRtl?: boolean,
): PageNumberAlignment {
  if (!justification || justification === 'left' || justification === 'both') {
    return isRtl ? 'right' : 'left'
  }
  if (justification === 'center') return 'center'
  if (justification === 'right') return isRtl ? 'left' : 'right'
  return 'left'
}

function mapAlignmentToStoredJustification(
  alignment: PageNumberAlignment,
  isRtl?: boolean,
): PageNumberAlignment | 'right' | 'left' {
  if (!isRtl) return alignment
  if (alignment === 'left') return 'right'
  if (alignment === 'right') return 'left'
  return alignment
}

function getParagraphAtPos(doc: any, $pos: any) {
  for (let depth = $pos.depth; depth >= 0; depth--) {
    const node = $pos.node(depth)
    if (node?.type?.name === 'paragraph') {
      return {
        node,
        pos: depth > 0 ? $pos.before(depth) : 0,
      }
    }
  }
  return null
}

function paragraphHasSubstantiveText(paragraph: any) {
  const text = (paragraph?.textContent ?? '')
    .replace(/\u200b/g, '')
    .replace(/\ufffc/g, '')
    .trim()
  return text.length > 0
}

function readAlignmentFromSdtNode(sdtNode: any): PageNumberAlignment {
  let alignment: PageNumberAlignment = 'left'
  sdtNode.forEach((child: any) => {
    if (child.type?.name !== 'paragraph') return
    const props = child.attrs?.paragraphProperties ?? {}
    alignment = mapStoredJustificationToAlignment(props.justification, props.rightToLeft === true)
  })
  return alignment
}

function findSdtNodeById(doc: any, nodeId: string): { node: any; pos: number } | null {
  let found: { node: any; pos: number } | null = null
  doc.descendants((node: any, pos: number) => {
    if (found) return false
    if (node.type?.name !== 'structuredContentBlock') return undefined
    if (String(node.attrs?.id ?? '') !== nodeId) return undefined
    found = { node, pos }
    return false
  })
  return found
}

function findManagedPageNumber(editor: any): ManagedPageNumber | null {
  if (!editor?.doc?.contentControls?.selectByTag) return null

  try {
    const result = editor.doc.contentControls.selectByTag({ tag: PAGE_NUMBER_CC_TAG })
    const item = result?.items?.[0]
    if (!item?.target) return null

    const located = findSdtNodeById(editor.state.doc, item.target.nodeId)
    if (!located) return null

    return {
      alignment: readAlignmentFromSdtNode(located.node),
      target: item.target as ContentControlTarget,
    }
  } catch {
    return null
  }
}

function isInsideManagedPageNumberBlock(editor: any, pageNumberPos: number) {
  const $pos = editor.state.doc.resolve(pageNumberPos)
  for (let depth = $pos.depth; depth > 0; depth--) {
    const ancestor = $pos.node(depth)
    if (
      ancestor.type?.name === 'structuredContentBlock' &&
      ancestor.attrs?.tag === PAGE_NUMBER_CC_TAG
    ) {
      return true
    }
  }
  return false
}

function removeInlinePageNumbers(editor: any) {
  const toDelete: number[] = []

  editor.state.doc.descendants((node: any, pos: number) => {
    if (node.type?.name !== 'page-number') return undefined
    if (isInsideManagedPageNumberBlock(editor, pos)) return undefined
    toDelete.push(pos)
    return undefined
  })

  if (toDelete.length === 0) return

  const tr = editor.state.tr
  toDelete
    .sort((a, b) => b - a)
    .forEach((pos) => {
      const node = tr.doc.nodeAt(pos)
      if (node?.type?.name === 'page-number') tr.delete(pos, pos + node.nodeSize)
    })
  if (tr.docChanged) editor.view?.dispatch(tr)
}

function removeManagedPageNumber(editor: any, managed?: ManagedPageNumber | null) {
  const info = managed ?? findManagedPageNumber(editor)
  if (!info) {
    removeInlinePageNumbers(editor)
    return
  }

  try {
    editor.doc.contentControls.delete({ target: info.target })
  } catch {
    const located = findSdtNodeById(editor.state.doc, info.target.nodeId)
    if (located) {
      const tr = editor.state.tr.delete(located.pos, located.pos + located.node.nodeSize)
      editor.view?.dispatch(tr)
    }
  }

  removeInlinePageNumbers(editor)
}

function runCommand(editor: any, fn: () => unknown) {
  try {
    return fn() === true
  } catch {
    return false
  }
}

function restoreSelection(editor: any, from: number, to: number) {
  const size = editor.state.doc.content.size
  const anchor = Math.min(Math.max(from, 0), size)
  const head = Math.min(Math.max(to, 0), size)
  const TextSelection = editor.state.selection.constructor as {
    create: (doc: unknown, anchor: number, head?: number) => unknown
  }
  const tr = editor.state.tr.setSelection(TextSelection.create(editor.state.doc, anchor, head))
  editor.view?.dispatch(tr)
}

function prepareInsertSiteOnCurrentParagraph(editor: any) {
  if (editor.state.doc.childCount === 0) {
    const paragraphType = editor.schema?.nodes?.paragraph
    if (!paragraphType) return false
    const emptyParagraph = paragraphType.create({ paragraphProperties: {} })
    const tr = editor.state.tr.insert(0, emptyParagraph)
    const TextSelection = editor.state.selection.constructor as {
      create: (doc: unknown, anchor: number) => unknown
    }
    tr.setSelection(TextSelection.create(tr.doc, 1))
    editor.view?.dispatch(tr)
    return true
  }

  const { $from } = editor.state.selection
  const paragraph = getParagraphAtPos(editor.state.doc, $from)
  if (!paragraph) return runCommand(editor, () => editor.commands.createParagraphNear?.())

  if (paragraphHasSubstantiveText(paragraph.node)) return false

  return true
}

function prepareInsertSiteAfterParagraph(editor: any, paragraph: { node: any; pos: number }) {
  const paragraphType = editor.schema?.nodes?.paragraph
  if (!paragraphType) return false

  const afterPos = paragraph.pos + paragraph.node.nodeSize
  const insertPos = Math.min(Math.max(afterPos, 0), editor.state.doc.content.size)
  const $after = editor.state.doc.resolve(insertPos)
  const nextNode = $after.nodeAfter

  const TextSelection = editor.state.selection.constructor as {
    create: (doc: unknown, anchor: number) => unknown
  }

  if (nextNode?.type?.name === 'paragraph' && !paragraphHasSubstantiveText(nextNode)) {
    const tr = editor.state.tr.setSelection(TextSelection.create(editor.state.doc, insertPos + 1))
    editor.view?.dispatch(tr)
    return true
  }

  const emptyParagraph = paragraphType.create({ paragraphProperties: {} })
  const tr = editor.state.tr.insert(insertPos, emptyParagraph)
  tr.setSelection(TextSelection.create(tr.doc, insertPos + 1))
  editor.view?.dispatch(tr)
  return true
}

function findManagedPageNumberBlock(editor: any): { node: any; pos: number } | null {
  const managed = findManagedPageNumber(editor)
  if (!managed) return null
  return findSdtNodeById(editor.state.doc, managed.target.nodeId)
}

function inferDefaultParagraphProperties(editor: any, sdtPos: number) {
  const safePos = Math.min(Math.max(sdtPos, 0), editor.state.doc.content.size)
  const $at = editor.state.doc.resolve(safePos)
  const nodeBefore = $at.nodeBefore

  if (nodeBefore?.type?.name === 'paragraph') {
    const props = nodeBefore.attrs?.paragraphProperties ?? {}
    if (props.rightToLeft === true) {
      return { rightToLeft: true, justification: 'right' as const }
    }
  }

  const current = getParagraphAtPos(editor.state.doc, editor.state.selection.$from)
  if (current?.node?.attrs?.paragraphProperties?.rightToLeft === true) {
    return { rightToLeft: true, justification: 'right' as const }
  }

  return {}
}

function isSelectionOnManagedPageNumber(editor: any) {
  const located = findManagedPageNumberBlock(editor)
  if (!located) return false

  const { from, to } = editor.state.selection
  const sdtStart = located.pos
  const sdtEnd = located.pos + located.node.nodeSize

  if (from >= sdtStart && to <= sdtEnd) return true
  if (from === sdtEnd || to === sdtEnd) return true

  return false
}

function escapeFromManagedPageNumber(editor: any) {
  const located = findManagedPageNumberBlock(editor)
  if (!located) return false
  return focusFreshParagraphAfter(editor, located.pos, located.node)
}

function isCursorInsideSdt(editor: any, sdtPos: number, sdtNodeSize: number) {
  const { from, to } = editor.state.selection
  const sdtEnd = sdtPos + sdtNodeSize
  return from >= sdtPos && to <= sdtEnd
}

function applyFreshParagraphDefaults(
  tr: any,
  doc: any,
  cursorPos: number,
  defaultProps: Record<string, unknown>,
) {
  const paragraph = getParagraphAtPos(doc, doc.resolve(cursorPos))
  if (!paragraph) return tr

  return tr.setNodeMarkup(paragraph.pos, undefined, {
    ...paragraph.node.attrs,
    paragraphProperties: { ...defaultProps },
  })
}

function focusFreshParagraphAfter(editor: any, sdtPos: number, sdtNode: any) {
  const paragraphType = editor.schema?.nodes?.paragraph
  if (!paragraphType) return false

  const TextSelection = editor.state.selection.constructor as {
    create: (doc: unknown, anchor: number, head?: number) => unknown
  }
  const SelectionBase = Object.getPrototypeOf(TextSelection) as {
    near?: ($pos: unknown, bias?: number) => unknown
  }

  const afterPos = sdtPos + sdtNode.nodeSize
  const insertPos = Math.min(Math.max(afterPos, 0), editor.state.doc.content.size)
  const defaultProps = inferDefaultParagraphProperties(editor, sdtPos)

  let tr = editor.state.tr
  const $after = tr.doc.resolve(insertPos)
  const nextNode = $after.nodeAfter

  let cursorPos = insertPos
  if (!nextNode || nextNode.type?.name !== 'paragraph') {
    const emptyParagraph = paragraphType.create({ paragraphProperties: defaultProps })
    tr = tr.insert(insertPos, emptyParagraph)
    cursorPos = insertPos + 1
  } else {
    cursorPos = insertPos + 1
  }

  if (cursorPos <= afterPos) cursorPos = afterPos + 1

  tr = applyFreshParagraphDefaults(tr, tr.doc, cursorPos, defaultProps)

  const $cursor = tr.doc.resolve(Math.min(cursorPos, tr.doc.content.size))
  const selection =
    typeof SelectionBase?.near === 'function'
      ? SelectionBase.near($cursor, 1)
      : TextSelection.create(tr.doc, cursorPos)

  tr = tr.setSelection(selection).scrollIntoView()
  editor.view?.dispatch(tr)

  if (isCursorInsideSdt(editor, sdtPos, sdtNode.nodeSize)) {
    runCommand(editor, () =>
      editor.chain
        ? editor.chain().setTextSelection(afterPos).createParagraphNear().focus().run()
        : editor.commands.setTextSelection?.(afterPos) && editor.commands.createParagraphNear?.(),
    )
    if (!isCursorInsideSdt(editor, sdtPos, sdtNode.nodeSize)) {
      const escapedPos = editor.state.selection.from
      const tr = applyFreshParagraphDefaults(
        editor.state.tr,
        editor.state.doc,
        escapedPos,
        defaultProps,
      )
      if (tr.docChanged) editor.view?.dispatch(tr)
    }
  }

  editor.view?.focus?.()
  editor.presentationEditor?.focus?.()
  return !isCursorInsideSdt(editor, sdtPos, sdtNode.nodeSize)
}

function buildPageNumberParagraphJson(alignment: PageNumberAlignment, isRtl: boolean) {
  return {
    type: 'paragraph',
    attrs: {
      paragraphProperties: {
        justification: mapAlignmentToStoredJustification(alignment, isRtl),
      },
    },
    content: [{ type: 'page-number' }],
  }
}

export function insertInlinePageNumber(editor: any): boolean {
  if (!editor?.commands?.addAutoPageNumber) return false
  if (!editor.options?.isHeaderOrFooter) return false

  removeManagedPageNumber(editor)

  const inserted = runCommand(editor, () => editor.commands.addAutoPageNumber())
  if (!inserted) return false

  editor.view?.focus?.()
  editor.presentationEditor?.focus?.()
  return true
}

export function insertManagedPageNumber(editor: any, alignment: PageNumberAlignment): boolean {
  if (!editor?.commands?.insertStructuredContentBlock) return false
  if (!editor.options?.isHeaderOrFooter) return false

  const existing = findManagedPageNumber(editor)
  if (existing?.alignment === alignment) {
    removeInlinePageNumbers(editor)
    return false
  }

  removeManagedPageNumber(editor, existing)

  const { from: savedFrom, to: savedTo } = editor.state.selection
  const sourceParagraph = getParagraphAtPos(editor.state.doc, editor.state.selection.$from)
  if (!sourceParagraph) return false

  const insertingAfterTextLine = paragraphHasSubstantiveText(sourceParagraph.node)
  const isRtl = sourceParagraph.node?.attrs?.paragraphProperties?.rightToLeft === true

  const prepared = insertingAfterTextLine
    ? prepareInsertSiteAfterParagraph(editor, sourceParagraph)
    : prepareInsertSiteOnCurrentParagraph(editor)
  if (!prepared) return false

  const inserted = runCommand(editor, () =>
    editor.commands.insertStructuredContentBlock({
      attrs: {
        tag: PAGE_NUMBER_CC_TAG,
        lockMode: 'contentLocked',
        alias: 'Page number',
      },
      json: buildPageNumberParagraphJson(alignment, isRtl),
    }),
  )
  if (!inserted) return false

  const managed = findManagedPageNumber(editor)
  if (!managed) return false

  const located = findSdtNodeById(editor.state.doc, managed.target.nodeId)
  if (!located) return false

  if (insertingAfterTextLine) {
    restoreSelection(editor, savedFrom, savedTo)
  } else {
    focusFreshParagraphAfter(editor, located.pos, located.node)
  }

  editor.view?.focus?.()
  editor.presentationEditor?.focus?.()
  return true
}

export function canInsertPageNumber(editor: any, canMutate: boolean) {
  if (!canMutate) return false
  if (!editor?.options?.isHeaderOrFooter) return false
  return Boolean(
    editor.commands?.addAutoPageNumber || editor.commands?.insertStructuredContentBlock,
  )
}

const keyboardEscapeWired = new WeakSet<object>()
const keyboardEscapeHandlers = new WeakMap<object, (event: KeyboardEvent) => void>()
const keyboardEscapeEditors = new Set<any>()

export function attachPageNumberKeyboardEscape(editor: any) {
  if (!editor?.options?.isHeaderOrFooter) return
  if (!editor.view?.dom) return
  if (keyboardEscapeWired.has(editor)) return

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (!findManagedPageNumber(editor)) return
    if (!isSelectionOnManagedPageNumber(editor)) return

    event.preventDefault()
    event.stopImmediatePropagation()
    escapeFromManagedPageNumber(editor)
  }

  editor.view.dom.addEventListener('keydown', onKeyDown, true)
  keyboardEscapeWired.add(editor)
  keyboardEscapeHandlers.set(editor, onKeyDown)
  keyboardEscapeEditors.add(editor)

  editor.on?.('destroy', () => {
    editor.view?.dom?.removeEventListener('keydown', onKeyDown, true)
    keyboardEscapeWired.delete(editor)
    keyboardEscapeHandlers.delete(editor)
    keyboardEscapeEditors.delete(editor)
  })
}

export function wirePageNumberKeyboardEscape(superdoc: any): () => void {
  const onEditorCreate = ({ editor }: { editor: any }) => attachPageNumberKeyboardEscape(editor)
  const onReady = () => {
    if (superdoc.activeEditor) attachPageNumberKeyboardEscape(superdoc.activeEditor)
  }
  const onEditorUpdate = (params: { surface?: string; sourceEditor?: any; editor?: any } = {}) => {
    if (params.surface !== 'header' && params.surface !== 'footer') return
    const hfEditor = params.sourceEditor ?? params.editor
    attachPageNumberKeyboardEscape(hfEditor)
  }

  superdoc.on('editorCreate', onEditorCreate)
  superdoc.on('ready', onReady)
  superdoc.on?.('editor-update', onEditorUpdate)

  if (superdoc.activeEditor) attachPageNumberKeyboardEscape(superdoc.activeEditor)

  return () => {
    superdoc.off('editorCreate', onEditorCreate)
    superdoc.off('ready', onReady)
    superdoc.off?.('editor-update', onEditorUpdate)
    keyboardEscapeEditors.forEach((editor) => {
      const onKeyDown = keyboardEscapeHandlers.get(editor)
      if (onKeyDown) editor.view?.dom?.removeEventListener('keydown', onKeyDown, true)
    })
    keyboardEscapeEditors.clear()
  }
}
