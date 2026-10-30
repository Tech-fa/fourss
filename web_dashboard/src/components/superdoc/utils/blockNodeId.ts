export type PresentationEditor = {
  hitTest?: (x: number, y: number) => { blockId?: string; pos?: number } | null
  getActiveEditor?: () => PmEditor | null
  scrollToPositionAsync?: (
    pos: number,
    options?: { behavior?: string; block?: string }
  ) => Promise<boolean>
}

export type PmEditor = {
  state?: {
    doc: {
      content: { size: number }
      descendants: (
        fn: (node: PmNode, pos: number, parent: PmNode | null, index: number) => void | boolean
      ) => void
      textBetween: (from: number, to: number, blockSeparator?: string, leafText?: string) => string
      nodesBetween: (
        from: number,
        to: number,
        fn: (node: PmNode, pos: number) => void | boolean
      ) => void
    }
  }
  posAtCoords?: (coords: { left: number; top: number }) => { pos?: number } | null
}

export type BlockPointerTarget = {
  nodeId: string
  offset: number
}

export type SuperdocInstance = {
  activeEditor?: unknown
  superdocStore?: {
    documents?: Array<{
      getPresentationEditor?: () => unknown
      getEditor?: () => PmEditor
      presentationEditor?: unknown
    }>
  }
} | null

type PmNode = {
  isBlock?: boolean
  isText?: boolean
  isLeaf?: boolean
  text?: string
  type?: { name?: string }
  attrs?: Record<string, unknown>
  nodeSize?: number
}

type BlockMatch = { canonicalId: string; contentPos: number; contentEnd: number }

type BlockCtx = { node: PmNode; pos: number; path: number[]; nodeType: string }

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const FALLBACK_PREFIX: Record<string, string> = {
  paragraph: 'para-auto',
  heading: 'heading-auto',
  listItem: 'list-auto',
}

function id(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function fallbackHash(nodeType: string, pos: number, path: number[]): string | null {
  const prefix = FALLBACK_PREFIX[nodeType]
  if (!prefix) return null
  const key = path.length ? `path:${path.join('.')}` : `pos:${pos}`
  let hash = 2166136261
  const input = `${nodeType}:${key}`
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function blockNodeType(node: PmNode): string | null {
  if (!node.isBlock || node.type?.name !== 'paragraph') return null
  const attrs = node.attrs ?? {}
  const styleId = (attrs.paragraphProperties as { styleId?: string } | undefined)?.styleId
  if (styleId && /heading\s*[1-6]/i.test(styleId)) return 'heading'
  const numbering = (attrs.paragraphProperties as { numberingProperties?: unknown } | undefined)
    ?.numberingProperties
  const listRendering = attrs.listRendering as { markerText?: string; path?: unknown[] } | undefined
  if (
    numbering ||
    listRendering?.markerText ||
    (Array.isArray(listRendering?.path) && listRendering.path.length > 0)
  ) {
    return 'listItem'
  }
  return 'paragraph'
}

function canonicalId(node: PmNode, pos: number, nodeType: string, path: number[]): string | null {
  const attrs = node.attrs ?? {}
  const paraId = id(attrs.paraId)
  if (paraId) return paraId
  const sdBlockId = id(attrs.sdBlockId)
  if (sdBlockId && !UUID.test(sdBlockId)) return sdBlockId
  return fallbackHash(nodeType, pos, path)
}

function nodeAliases(attrs: Record<string, unknown>): string[] {
  return [attrs.paraId, attrs.sdBlockId, attrs.blockId, attrs.id, attrs.uuid]
    .map(id)
    .filter(Boolean) as string[]
}

function walkBlocks(
  doc: NonNullable<NonNullable<PmEditor['state']>['doc']>,
  visit: (ctx: BlockCtx) => void | false | undefined
) {
  const pathByNode = new WeakMap<object, number[]>()
  pathByNode.set(doc as object, [])
  doc.descendants((node, pos, parent, index) => {
    const parentPath = parent ? (pathByNode.get(parent) ?? []) : []
    const path =
      typeof index === 'number' && Number.isInteger(index) && index >= 0
        ? [...parentPath, index]
        : parentPath
    pathByNode.set(node, path)
    const nodeType = blockNodeType(node)
    if (nodeType) return visit({ node, pos, path, nodeType })
    return undefined
  })
}

function canonicalAtPos(editor: PmEditor, pos: number): string | null {
  const doc = editor.state?.doc
  if (!doc || !Number.isFinite(pos)) return null
  const clamped = Math.max(0, Math.min(pos, doc.content.size))
  let match: string | null = null
  walkBlocks(doc, ({ node, pos: nodePos, path, nodeType }) => {
    const size = node.nodeSize ?? 1
    if (clamped >= nodePos && clamped < nodePos + size) {
      match = canonicalId(node, nodePos, nodeType, path)
    }
  })
  return match
}

function findBlock(editor: PmEditor, nodeId: string): BlockMatch | null {
  const doc = editor.state?.doc
  if (!doc) return null
  let found: BlockMatch | null = null
  walkBlocks(doc, ({ node, pos, path, nodeType }) => {
    if (found) return false
    const blockId = canonicalId(node, pos, nodeType, path)
    if (!blockId) return undefined
    const aliases = nodeAliases(node.attrs ?? {})
    if (blockId !== nodeId && !aliases.includes(nodeId)) return undefined
    const size = node.nodeSize ?? 1
    found = { canonicalId: blockId, contentPos: pos + 1, contentEnd: pos + size - 1 }
    return false
  })
  return found
}

function resolvePosFromPointer(
  clientX: number,
  clientY: number,
  editor: PmEditor | null,
  presentationEditor: PresentationEditor | null
): number | null {
  if (!editor) return null

  const hit = presentationEditor?.hitTest?.(clientX, clientY)
  if (typeof hit?.pos === 'number') return hit.pos

  const coords = editor.posAtCoords?.({ left: clientX, top: clientY })
  if (typeof coords?.pos === 'number') return coords.pos

  return null
}

function pmPosAtBlockTextOffset(
  editor: PmEditor,
  contentPos: number,
  contentEnd: number,
  offset: number
): number {
  if (offset <= 0) return contentPos

  const doc = editor.state?.doc
  if (!doc) return contentPos

  let seen = 0
  let target = contentPos
  doc.nodesBetween(contentPos, contentEnd, (node, pos) => {
    if (node.isText && node.text) {
      const len = node.text.length
      if (seen + len >= offset) {
        target = pos + (offset - seen)
        return false
      }
      seen += len
      return undefined
    }

    if (node.isLeaf && !node.isText) {
      if (seen >= offset) {
        target = pos
        return false
      }
      seen += 1
    }

    return undefined
  })
  return target
}

export function getPresentationEditorFromSuperdoc(superdoc: SuperdocInstance): PresentationEditor | null {
  if (!superdoc) return null
  const active = superdoc.activeEditor as
    | { presentationEditor?: unknown; _presentationEditor?: unknown }
    | null
    | undefined
  const fromActive = active?.presentationEditor ?? active?._presentationEditor
  if (fromActive) return fromActive as PresentationEditor
  const doc = superdoc.superdocStore?.documents?.[0]
  const fromStore =
    doc?.getPresentationEditor?.() ??
    (doc as { presentationEditor?: unknown } | undefined)?.presentationEditor
  return (fromStore as PresentationEditor) ?? null
}

export function getActiveEditorFromSuperdoc(superdoc: SuperdocInstance): PmEditor | null {
  return (
    (superdoc?.activeEditor as PmEditor | null | undefined) ??
    getPresentationEditorFromSuperdoc(superdoc)?.getActiveEditor?.() ??
    (superdoc?.superdocStore?.documents?.[0]?.getEditor?.() as PmEditor | null | undefined) ??
    null
  )
}

export function findCanonicalNodeIdInDoc(editor: PmEditor, nodeId: string): string | null {
  return findBlock(editor, nodeId)?.canonicalId ?? null
}

export function findBlockContentPos(editor: PmEditor, nodeId: string): number | null {
  return findBlock(editor, nodeId)?.contentPos ?? null
}

export function getBlockTextOffset(editor: PmEditor, pos: number): number | null {
  const doc = editor.state?.doc
  if (!doc || !Number.isFinite(pos)) return null

  const clamped = Math.max(0, Math.min(pos, doc.content.size))
  let offset: number | null = null

  walkBlocks(doc, ({ node, pos: nodePos }) => {
    const size = node.nodeSize ?? 1
    if (clamped < nodePos || clamped >= nodePos + size) return undefined

    const contentStart = nodePos + 1
    const contentEnd = nodePos + size - 1
    const innerPos = Math.max(contentStart, Math.min(clamped, contentEnd))
    offset = doc.textBetween(contentStart, innerPos, '', '\ufffc').length
    return false
  })

  return offset
}

export function findBlockScrollPos(
  editor: PmEditor,
  nodeId: string,
  offset?: number | null
): number | null {
  const block = findBlock(editor, nodeId)
  if (!block) return null
  if (offset == null || offset <= 0) return block.contentPos
  return pmPosAtBlockTextOffset(editor, block.contentPos, block.contentEnd, offset)
}

export function getBlockTargetFromPointer(
  clientX: number,
  clientY: number,
  editor: PmEditor | null,
  presentationEditor: PresentationEditor | null
): BlockPointerTarget | null {
  if (!editor) return null

  const hit = presentationEditor?.hitTest?.(clientX, clientY)
  const pos = resolvePosFromPointer(clientX, clientY, editor, presentationEditor)
  if (pos != null) {
    const nodeId = canonicalAtPos(editor, pos)
    if (nodeId) {
      return {
        nodeId,
        offset: getBlockTextOffset(editor, pos) ?? 0,
      }
    }
  }

  if (hit?.blockId?.trim()) {
    const nodeId = findCanonicalNodeIdInDoc(editor, hit.blockId.trim())
    if (nodeId) return { nodeId, offset: 0 }
  }

  return null
}

export function resolveStableNodeIdFromDom(el: Element, editor: PmEditor | null): string | null {
  const blockEl = el.closest('[data-block-id], [data-sd-block-id], [data-pm-start]')
  if (!blockEl || !editor) return null

  const pmStart = Number(blockEl.getAttribute('data-pm-start'))
  if (Number.isFinite(pmStart)) {
    const fromPm = canonicalAtPos(editor, pmStart + 1)
    if (fromPm) return fromPm
  }

  const domId =
    blockEl.getAttribute('data-block-id')?.trim() ||
    blockEl.getAttribute('data-sd-block-id')?.trim()
  if (!domId) return null

  const canonical = findCanonicalNodeIdInDoc(editor, domId)
  if (canonical) return canonical
  return UUID.test(domId) ? null : domId
}

export function getNodeIdFromPointer(
  clientX: number,
  clientY: number,
  editor: PmEditor | null,
  presentationEditor: PresentationEditor | null
): string | null {
  return getBlockTargetFromPointer(clientX, clientY, editor, presentationEditor)?.nodeId ?? null
}
