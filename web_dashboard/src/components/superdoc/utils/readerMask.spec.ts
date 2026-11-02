import { describe, expect, it } from 'vitest'
import {
  READER_MASK_COLOR,
  READER_MASK_HIDDEN_CLASS,
  READER_MASK_MARKED_CLASS,
  isReaderMaskColor,
  paintReaderMasks,
  redactMaskedSelection,
  selectionIsFullyMasked,
  toggleReaderMask,
  type ReaderMaskEditor,
} from './readerMask'

describe('isReaderMaskColor', () => {
  it('matches the stored mask color in hex and rgb forms', () => {
    expect(isReaderMaskColor(READER_MASK_COLOR)).toBe(true)
    expect(isReaderMaskColor('#6d28d9')).toBe(true)
    expect(isReaderMaskColor('rgb(109, 40, 217)')).toBe(true)
    expect(isReaderMaskColor('#FFFF00')).toBe(false)
    expect(isReaderMaskColor(null)).toBe(false)
  })
})

function textNode(text: string, color?: string) {
  const marks = color ? [{ type: highlightType, attrs: { color } }] : []
  return { isText: true, text, nodeSize: text.length, marks }
}

const highlightType = {
  create(attrs: { color: string }) {
    return { type: highlightType, attrs }
  },
  isInSet(marks: unknown[]) {
    const match = marks.find(
      (mark): mark is { type?: unknown; attrs?: { color?: string } } =>
        !!mark && typeof mark === 'object' && (mark as { type?: unknown }).type === highlightType
    )
    return match ?? null
  },
}

function editorWith(nodes: ReturnType<typeof textNode>[], from: number, to: number) {
  let dispatched: { kind: string; from: number; to: number; color?: string } | null = null
  const doc = {
    nodesBetween(start: number, end: number, fn: (node: ReturnType<typeof textNode>, pos: number) => void) {
      let pos = 0
      for (const node of nodes) {
        const nodeStart = pos
        const nodeEnd = pos + node.nodeSize
        if (nodeStart < end && nodeEnd > start) fn(node, nodeStart)
        pos = nodeEnd
      }
    },
  }
  const editor: ReaderMaskEditor = {
    state: {
      selection: { from, to, empty: from === to },
      schema: { marks: { highlight: highlightType } },
      doc,
      get tr() {
        return {
          docChanged: false,
          addMark(start: number, end: number, mark: unknown) {
            this.docChanged = true
            const color =
              mark && typeof mark === 'object' && 'attrs' in mark
                ? (mark as { attrs?: { color?: string } }).attrs?.color
                : undefined
            dispatched = { kind: 'add', from: start, to: end, color }
            return this
          },
          removeMark(start: number, end: number) {
            this.docChanged = true
            dispatched = { kind: 'remove', from: start, to: end }
            return this
          },
        }
      },
    },
    view: { dispatch() {} },
  }
  return {
    editor,
    dispatched: () => dispatched,
  }
}

describe('toggleReaderMask', () => {
  it('masks the current selection without requiring the whole paragraph', () => {
    const { editor, dispatched } = editorWith(
      [textNode('hello world', '#FFFF00')],
      6,
      11
    )
    expect(selectionIsFullyMasked(editor)).toBe(false)
    expect(toggleReaderMask(editor)).toBe(true)
    expect(dispatched()).toEqual({ kind: 'add', from: 6, to: 11, color: READER_MASK_COLOR })
  })

  it('clears the mask when the selection is already masked', () => {
    const { editor, dispatched } = editorWith(
      [textNode('secret', READER_MASK_COLOR), textNode(' visible', '#FFFF00')],
      0,
      6
    )
    expect(selectionIsFullyMasked(editor)).toBe(true)
    expect(toggleReaderMask(editor)).toBe(true)
    expect(dispatched()).toEqual({ kind: 'remove', from: 0, to: 6 })
  })
})

describe('paintReaderMasks', () => {
  it('hides masked runs in read-only mode and keeps them readable while editing', () => {
    const root = document.createElement('div')
    const masked = document.createElement('span')
    masked.className = 'superdoc-text-run'
    masked.textContent = 'secret'
    masked.style.backgroundColor = READER_MASK_COLOR
    const plain = document.createElement('span')
    plain.className = 'superdoc-text-run'
    plain.textContent = 'visible'
    plain.style.backgroundColor = '#FFFF00'
    root.append(masked, plain)

    paintReaderMasks(root, { hidden: true, hiddenLabel: 'Hidden' })
    expect(masked.classList.contains(READER_MASK_HIDDEN_CLASS)).toBe(true)
    expect(masked.getAttribute('aria-label')).toBe('Hidden')
    expect(masked.textContent).toBe('\u2588'.repeat('secret'.length))
    expect(plain.classList.contains(READER_MASK_HIDDEN_CLASS)).toBe(false)
    expect(plain.textContent).toBe('visible')

    const editing = document.createElement('span')
    editing.className = 'superdoc-text-run'
    editing.textContent = 'secret'
    editing.style.backgroundColor = READER_MASK_COLOR
    const editingRoot = document.createElement('div')
    editingRoot.append(editing)
    paintReaderMasks(editingRoot, { hidden: false, hiddenLabel: 'Hidden' })
    expect(editing.classList.contains(READER_MASK_MARKED_CLASS)).toBe(true)
    expect(editing.getAttribute('aria-label')).toBeNull()
    expect(editing.textContent).toBe('secret')
  })
})

describe('redactMaskedSelection', () => {
  it('drops masked words from a copied selection and leaves other text', () => {
    const root = document.createElement('div')
    root.append('Pay is ')
    const masked = document.createElement('span')
    masked.className = READER_MASK_HIDDEN_CLASS
    masked.textContent = '9000'
    root.append(masked, document.createTextNode(' per year'))
    document.body.append(root)

    const range = document.createRange()
    range.setStart(root.firstChild as Text, 0)
    range.setEnd(root.lastChild as Text, ' per year'.length)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    expect(redactMaskedSelection(root, selection)).toBe('Pay is  per year')
    root.remove()
  })
})
