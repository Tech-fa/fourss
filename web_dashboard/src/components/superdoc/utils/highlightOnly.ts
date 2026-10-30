import { Plugin, PluginKey } from 'prosemirror-state'

const HIGHLIGHT_ONLY_PLUGIN_KEY = new PluginKey('superdoc-highlight-only')

export const HIGHLIGHT_SWATCHES = [
  { color: '#FFFF00', label: 'Yellow' },
  { color: '#00FF00', label: 'Green' },
  { color: '#00FFFF', label: 'Cyan' },
  { color: '#FF00FF', label: 'Pink' },
  { color: '#0000FF', label: 'Blue' },
  { color: '#FF0000', label: 'Red' },
  { color: '#FCFCFC', label: 'Light gray' },
] as const

type HighlightableDocNode = {
  isText?: boolean
  marks?: Array<{ type?: { name?: string }; attrs?: Record<string, unknown> }>
}

type GuardableEditor = {
  registerPlugin?: (plugin: Plugin) => void
  state?: {
    doc?: {
      descendants?: (
        fn: (node: HighlightableDocNode, pos: number) => void
      ) => void
    }
    plugins?: Array<{ spec?: { key?: PluginKey } }>
    selection?: { empty?: boolean }
  }
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

function isHighlightMark(name: string) {
  return name === 'highlight' || name === 'textHighlight' || name.includes('highlight')
}

export function getHighlightSignature(editor: GuardableEditor | null | undefined): string {
  const doc = editor?.state?.doc
  if (!doc?.descendants) return ''

  const parts: string[] = []
  doc.descendants((node, pos) => {
    if (!node.isText) return
    for (const mark of node.marks ?? []) {
      const name = mark.type?.name ?? ''
      if (!isHighlightMark(name)) continue
      parts.push(`${pos}:${name}:${JSON.stringify(mark.attrs ?? {})}`)
    }
  })
  return parts.join('|')
}

export function wireHighlightOnlyGuard(editor: GuardableEditor | null | undefined) {
  if (!editor?.registerPlugin) return

  const isAlreadyRegistered = editor.state?.plugins?.some(
    (plugin) => plugin.spec?.key === HIGHLIGHT_ONLY_PLUGIN_KEY
  )
  if (isAlreadyRegistered) return

  editor.registerPlugin(
    new Plugin({
      key: HIGHLIGHT_ONLY_PLUGIN_KEY,
      filterTransaction(tr) {
        if (!tr.docChanged) return true
        const before = tr.before
        if (!before) return false
        return before.textContent === tr.doc.textContent
      },
    })
  )
}

export function hasHighlightableSelection(editor: GuardableEditor | null | undefined): boolean {
  const selection = editor?.state?.selection
  return Boolean(selection && !selection.empty)
}

export function applyTextHighlight(
  editor: GuardableEditor | null | undefined,
  color: string | null
): boolean {
  if (!editor?.commands) return false

  const chain = editor.chain?.()?.focus?.()
  if (color) {
    if (chain?.setHighlight) return chain.setHighlight(color).run?.() === true
    return editor.commands.setHighlight?.(color) === true
  }

  if (chain?.unsetHighlight) return chain.unsetHighlight().run?.() === true
  return editor.commands.unsetHighlight?.() === true
}
