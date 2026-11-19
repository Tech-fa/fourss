export type DiagramKind = 'org' | 'process'

export type DiagramNodeKind = 'person' | 'step' | 'decision' | 'terminator'

export type DiagramNode = {
  id: string
  kind: DiagramNodeKind
  label: string
  subtitle: string
  x: number
  y: number
}

export type DiagramEdge = {
  id: string
  from: string
  to: string
  label: string
}

export type Diagram = {
  kind: DiagramKind
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

export type DiagramMap = Record<string, Diagram>

export const DIAGRAM_TITLE_PREFIX = 'fourss-diagram:'

export function diagramImageTitle(id: string) {
  return `${DIAGRAM_TITLE_PREFIX}${id}`
}

export function diagramIdFromImageTitle(title: unknown) {
  if (typeof title !== 'string' || !title.startsWith(DIAGRAM_TITLE_PREFIX)) return null
  const id = title.slice(DIAGRAM_TITLE_PREFIX.length)
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null
}

export function normalizeDiagramMap(value: unknown): DiagramMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const map: DiagramMap = {}
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) continue
    const diagram = normalizeDiagram(raw)
    if (diagram) map[id] = diagram
  }
  return map
}

function normalizeDiagram(value: unknown): Diagram | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as { kind?: unknown; nodes?: unknown; edges?: unknown }
  if (raw.kind !== 'org' && raw.kind !== 'process') return null
  if (!Array.isArray(raw.nodes) || raw.nodes.length === 0 || raw.nodes.length > 80) return null
  if (!Array.isArray(raw.edges) || raw.edges.length > 120) return null
  const nodes = raw.nodes.map(normalizeNode).filter((node): node is DiagramNode => node != null)
  if (nodes.length !== raw.nodes.length) return null
  const edges = raw.edges.map(normalizeEdge).filter((edge): edge is DiagramEdge => edge != null)
  if (edges.length !== raw.edges.length) return null
  return { kind: raw.kind, nodes, edges }
}

function normalizeNode(value: unknown): DiagramNode | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<DiagramNode>
  if (raw.kind !== 'person' && raw.kind !== 'step' && raw.kind !== 'decision' && raw.kind !== 'terminator') {
    return null
  }
  if (typeof raw.id !== 'string' || typeof raw.label !== 'string' || typeof raw.subtitle !== 'string') return null
  if (!Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return null
  return {
    id: raw.id,
    kind: raw.kind,
    label: raw.label,
    subtitle: raw.subtitle,
    x: raw.x as number,
    y: raw.y as number,
  }
}

function normalizeEdge(value: unknown): DiagramEdge | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<DiagramEdge>
  if (typeof raw.id !== 'string' || typeof raw.from !== 'string' || typeof raw.to !== 'string') return null
  if (typeof raw.label !== 'string') return null
  return { id: raw.id, from: raw.from, to: raw.to, label: raw.label }
}

export type OrgStarterCopy = {
  director: string
  directorRole: string
  operations: string
  operationsRole: string
  quality: string
  qualityRole: string
}

export type ProcessStarterCopy = {
  start: string
  work: string
  decision: string
  finish: string
  revise: string
  yes: string
  no: string
}

export const DEFAULT_ORG_COPY: OrgStarterCopy = {
  director: 'Director',
  directorRole: 'Leads the team',
  operations: 'Operations',
  operationsRole: 'Day to day',
  quality: 'Quality',
  qualityRole: 'Standards',
}

export const DEFAULT_PROCESS_COPY: ProcessStarterCopy = {
  start: 'Start',
  work: 'Do the work',
  decision: 'Approved?',
  finish: 'Finish',
  revise: 'Revise',
  yes: 'Yes',
  no: 'No',
}

export const NODE_SIZE: Record<DiagramNodeKind, { w: number; h: number }> = {
  person: { w: 188, h: 68 },
  step: { w: 160, h: 56 },
  decision: { w: 150, h: 92 },
  terminator: { w: 128, h: 44 },
}

const DIAGRAM_FONT = "Arial, 'Noto Sans Arabic', Cairo, Helvetica, sans-serif"

export function starterOrgChart(copy: OrgStarterCopy = DEFAULT_ORG_COPY): Diagram {
  return {
    kind: 'org',
    nodes: [
      { id: 'n1', kind: 'person', label: copy.director, subtitle: copy.directorRole, x: 360, y: 36 },
      { id: 'n2', kind: 'person', label: copy.operations, subtitle: copy.operationsRole, x: 120, y: 180 },
      { id: 'n3', kind: 'person', label: copy.quality, subtitle: copy.qualityRole, x: 560, y: 180 },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', label: '' },
      { id: 'e2', from: 'n1', to: 'n3', label: '' },
    ],
  }
}

export function starterProcessFlow(copy: ProcessStarterCopy = DEFAULT_PROCESS_COPY): Diagram {
  return {
    kind: 'process',
    nodes: [
      { id: 'n1', kind: 'terminator', label: copy.start, subtitle: '', x: 40, y: 88 },
      { id: 'n2', kind: 'step', label: copy.work, subtitle: '', x: 230, y: 82 },
      { id: 'n3', kind: 'decision', label: copy.decision, subtitle: '', x: 450, y: 64 },
      { id: 'n4', kind: 'terminator', label: copy.finish, subtitle: '', x: 680, y: 88 },
      { id: 'n5', kind: 'step', label: copy.revise, subtitle: '', x: 450, y: 230 },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', label: '' },
      { id: 'e2', from: 'n2', to: 'n3', label: '' },
      { id: 'e3', from: 'n3', to: 'n4', label: copy.yes },
      { id: 'e4', from: 'n3', to: 'n5', label: copy.no },
    ],
  }
}

export function nextDiagramId(prefix: 'n' | 'e', existing: string[]) {
  const taken = new Set(existing)
  let index = 1
  while (taken.has(`${prefix}${index}`)) index += 1
  return `${prefix}${index}`
}

export function addDiagramNode(
  diagram: Diagram,
  kind: DiagramNodeKind,
  label: string,
  selectedId: string | null,
  connectLabel = ''
): Diagram {
  const selected = diagram.nodes.find((node) => node.id === selectedId) ?? null
  const id = nextDiagramId('n', diagram.nodes.map((node) => node.id))
  const position = positionForNewNode(diagram, selected)
  const node: DiagramNode = { id, kind, label, subtitle: '', x: position.x, y: position.y }
  const nodes = [...diagram.nodes, node]
  if (!selected) return { ...diagram, nodes }
  const edgeId = nextDiagramId('e', diagram.edges.map((edge) => edge.id))
  return {
    ...diagram,
    nodes,
    edges: [...diagram.edges, { id: edgeId, from: selected.id, to: id, label: connectLabel }],
  }
}

export function connectDiagramNodes(diagram: Diagram, from: string, to: string, label = ''): Diagram {
  if (from === to) return diagram
  if (!diagram.nodes.some((node) => node.id === from) || !diagram.nodes.some((node) => node.id === to)) {
    return diagram
  }
  if (diagram.edges.some((edge) => edge.from === from && edge.to === to)) return diagram
  const kept = diagram.kind === 'org' ? diagram.edges.filter((edge) => edge.to !== to) : diagram.edges
  const id = nextDiagramId('e', kept.map((edge) => edge.id))
  return { ...diagram, edges: [...kept, { id, from, to, label }] }
}

export function removeDiagramSelection(
  diagram: Diagram,
  nodeId: string | null,
  edgeId: string | null
): Diagram {
  if (nodeId) {
    return {
      ...diagram,
      nodes: diagram.nodes.filter((node) => node.id !== nodeId),
      edges: diagram.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId),
    }
  }
  if (edgeId) {
    return { ...diagram, edges: diagram.edges.filter((edge) => edge.id !== edgeId) }
  }
  return diagram
}

export function arrangeDiagram(diagram: Diagram): Diagram {
  return diagram.kind === 'org' ? arrangeOrg(diagram) : arrangeProcess(diagram)
}

export function nodeBox(node: DiagramNode) {
  const size = NODE_SIZE[node.kind]
  return { x: node.x, y: node.y, w: size.w, h: size.h }
}

export function contentBounds(diagram: Diagram, pad: number) {
  if (diagram.nodes.length === 0) return { x: 0, y: 0, width: 320, height: 180 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of diagram.nodes) {
    const box = nodeBox(node)
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.w)
    maxY = Math.max(maxY, box.y + box.h)
  }
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  }
}

export function diamondPoints(node: DiagramNode) {
  const box = nodeBox(node)
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  return `${cx},${box.y} ${box.x + box.w},${cy} ${cx},${box.y + box.h} ${box.x},${cy}`
}

export type DrawnText = {
  text: string
  x: number
  y: number
  size: number
  weight: number
  fill: string
}

export function nodeTexts(node: DiagramNode): DrawnText[] {
  const box = nodeBox(node)
  const caption = nodeCaption(node)
  const cx = box.x + box.w / 2
  if (node.kind === 'person') {
    const texts: DrawnText[] = caption.lines
      .filter((line) => line.length > 0)
      .map((text, index) => ({
        text,
        x: cx,
        y: box.y + 28 + index * 16,
        size: 14,
        weight: 600,
        fill: '#0f172a',
      }))
    if (caption.subtitle) {
      texts.push({
        text: fitLine(caption.subtitle, 26),
        x: cx,
        y: box.y + 48,
        size: 11,
        weight: 400,
        fill: '#64748b',
      })
    }
    return texts
  }
  const lines = caption.lines.filter((line) => line.length > 0)
  const positions = lineCenters(box.y + box.h / 2, lines.length, 15)
  return lines.map((text, index) => ({
    text,
    x: cx,
    y: positions[index],
    size: node.kind === 'decision' ? 12 : 13,
    weight: 600,
    fill: node.kind === 'terminator' ? '#ffffff' : '#0f172a',
  }))
}

export function edgeRoute(from: DiagramNode, to: DiagramNode, direction: 'auto' | 'vertical' = 'auto') {
  const start = nodeBox(from)
  const end = nodeBox(to)
  const startX = start.x + start.w / 2
  const endX = end.x + end.w / 2
  const dx = endX - startX
  const dy = end.y + end.h / 2 - (start.y + start.h / 2)
  const downward = end.y >= start.y
  if (direction === 'auto' && dx < -24) {
    const below = Math.max(start.y + start.h, end.y + end.h) + 28
    const d = `M ${round(startX)} ${round(start.y + start.h)} L ${round(startX)} ${round(below)} L ${round(endX)} ${round(below)} L ${round(endX)} ${round(end.y + end.h)}`
    return { d, labelX: (startX + endX) / 2, labelY: below - 10 }
  }
  let x1 = startX
  let y1 = start.y
  let x2 = endX
  let y2 = end.y
  const vertical = direction === 'vertical' || Math.abs(dy) >= Math.abs(dx)
  if (vertical) {
    y1 = downward ? start.y + start.h : start.y
    y2 = downward ? end.y : end.y + end.h
    x1 = startX
    x2 = endX
  } else if (dx >= 0) {
    x1 = start.x + start.w
    x2 = end.x
    y1 = start.y + start.h / 2
    y2 = end.y + end.h / 2
  } else {
    x1 = start.x
    x2 = end.x + end.w
    y1 = start.y + start.h / 2
    y2 = end.y + end.h / 2
  }
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const d = vertical
    ? `M ${round(x1)} ${round(y1)} L ${round(x1)} ${round(midY)} L ${round(x2)} ${round(midY)} L ${round(x2)} ${round(y2)}`
    : `M ${round(x1)} ${round(y1)} L ${round(midX)} ${round(y1)} L ${round(midX)} ${round(y2)} L ${round(x2)} ${round(y2)}`
  return { d, labelX: midX, labelY: midY - 8 }
}

export function renderDiagramSvg(diagram: Diagram) {
  const bounds = contentBounds(diagram, 28)
  const width = Math.max(1, Math.ceil(bounds.width))
  const height = Math.max(1, Math.ceil(bounds.height))
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]))
  const edges = diagram.edges
    .map((edge) => {
      const from = nodes.get(edge.from)
      const to = nodes.get(edge.to)
      if (!from || !to) return ''
      const route = edgeRoute(from, to, diagram.kind === 'org' ? 'vertical' : 'auto')
      const label = edge.label.trim()
      const labelMarkup = label
        ? `<rect x="${round(route.labelX - label.length * 3.6 - 6)}" y="${round(route.labelY - 10)}" width="${round(label.length * 7.2 + 12)}" height="16" rx="3" fill="#ffffff"/><text x="${round(route.labelX)}" y="${round(route.labelY)}" text-anchor="middle" dominant-baseline="middle" font-family="${DIAGRAM_FONT}" font-size="11" fill="#334155">${escapeXml(label)}</text>`
        : ''
      return `<path d="${route.d}" fill="none" stroke="#334155" stroke-width="1.5" marker-end="url(#diagram-arrow)"/>${labelMarkup}`
    })
    .join('')
  const shapes = diagram.nodes.map(renderNodeSvg).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${round(bounds.x)} ${round(bounds.y)} ${width} ${height}"><rect x="${round(bounds.x)}" y="${round(bounds.y)}" width="${width}" height="${height}" fill="#ffffff"/><defs><marker id="diagram-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#334155"/></marker></defs>${edges}${shapes}</svg>`
  return { svg, width, height }
}

export function wrapText(text: string, maxChars: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0 || maxLines < 1) return ['']
  const lines: string[] = []
  let current = ''
  let index = 0
  while (index < words.length && lines.length < maxLines) {
    const word = words[index]
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars) {
      current = next
      index += 1
      continue
    }
    if (current) {
      lines.push(current)
      current = ''
      continue
    }
    lines.push(fitLine(word, maxChars))
    index += 1
    current = ''
  }
  if (current && lines.length < maxLines) lines.push(current)
  if (index < words.length && lines.length > 0) {
    lines[lines.length - 1] = fitLine(`${lines[lines.length - 1]}…`, maxChars)
  }
  return lines.length > 0 ? lines : ['']
}

export function fitLine(text: string, maxChars: number) {
  const value = text.trim()
  if (value.length <= maxChars) return value
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function positionForNewNode(diagram: Diagram, selected: DiagramNode | null) {
  if (!selected) {
    const bounds = contentBounds(diagram, 0)
    return { x: 48, y: Math.max(48, bounds.y + bounds.height + 36) }
  }
  const size = NODE_SIZE[selected.kind]
  const children = diagram.edges.filter((edge) => edge.from === selected.id).length
  if (diagram.kind === 'org') {
    return {
      x: selected.x + children * (NODE_SIZE.person.w + 28),
      y: selected.y + size.h + 56,
    }
  }
  if (children === 0) return { x: selected.x + size.w + 48, y: selected.y }
  return { x: selected.x, y: selected.y + size.h + 64 }
}

function arrangeOrg(diagram: Diagram): Diagram {
  const nodes = diagram.nodes.map((node) => ({ ...node }))
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const children = new Map<string, string[]>()
  const hasParent = new Set<string>()
  for (const node of nodes) children.set(node.id, [])
  for (const edge of diagram.edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to) || edge.from === edge.to) continue
    children.get(edge.from)?.push(edge.to)
    hasParent.add(edge.to)
  }
  const placed = new Set<string>()

  function widthOf(id: string, stack: Set<string>): number {
    const own = byId.get(id) ? NODE_SIZE[byId.get(id)!.kind].w : NODE_SIZE.person.w
    if (stack.has(id)) return own
    const kids = (children.get(id) ?? []).filter((kid) => !stack.has(kid))
    if (kids.length === 0) return own
    const next = new Set(stack)
    next.add(id)
    const sum = kids.reduce((total, kid) => total + widthOf(kid, next), 0) + 28 * (kids.length - 1)
    return Math.max(own, sum)
  }

  function place(id: string, left: number, top: number, stack: Set<string>) {
    const node = byId.get(id)
    if (!node || placed.has(id) || stack.has(id)) return
    placed.add(id)
    const subtree = widthOf(id, stack)
    const size = NODE_SIZE[node.kind]
    node.x = Math.round(left + (subtree - size.w) / 2)
    node.y = top
    const next = new Set(stack)
    next.add(id)
    let cursor = left
    for (const kid of children.get(id) ?? []) {
      const kidWidth = widthOf(kid, next)
      place(kid, cursor, top + size.h + 56, next)
      cursor += kidWidth + 28
    }
  }

  let left = 48
  for (const root of nodes.filter((node) => !hasParent.has(node.id))) {
    const width = widthOf(root.id, new Set())
    place(root.id, left, 40, new Set())
    left += width + 56
  }
  let extraX = left
  for (const node of nodes) {
    if (placed.has(node.id)) continue
    node.x = extraX
    node.y = 40
    extraX += NODE_SIZE[node.kind].w + 28
  }
  return { ...diagram, nodes }
}

function arrangeProcess(diagram: Diagram): Diagram {
  const nodes = diagram.nodes.map((node) => ({ ...node }))
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, number>()
  for (const node of nodes) {
    outgoing.set(node.id, [])
    incoming.set(node.id, 0)
  }
  for (const edge of diagram.edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to) || edge.from === edge.to) continue
    outgoing.get(edge.from)?.push(edge.to)
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1)
  }
  const placed = new Set<string>()

  function place(id: string, column: number, row: number) {
    if (placed.has(id)) return
    const node = byId.get(id)
    if (!node) return
    placed.add(id)
    const size = NODE_SIZE[node.kind]
    node.x = 40 + column * 210 + Math.round((180 - size.w) / 2)
    node.y = 36 + row * 150 + Math.round((100 - size.h) / 2)
    const children = (outgoing.get(id) ?? []).filter((child) => !placed.has(child))
    children.forEach((child, index) => {
      if (index === 0) place(child, column + 1, row)
      else place(child, column, row + index)
    })
  }

  let column = 0
  const roots = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0)
  const start = roots.length > 0 ? roots : nodes.slice(0, 1)
  for (const root of start) {
    place(root.id, column, 0)
    column += 1
  }
  let extraRow = 0
  for (const node of nodes) {
    if (placed.has(node.id)) continue
    place(node.id, 0, 3 + extraRow)
    extraRow += 1
  }
  return { ...diagram, nodes }
}

function nodeCaption(node: DiagramNode) {
  if (node.kind === 'person') return { lines: wrapText(node.label, 22, 1), subtitle: node.subtitle.trim() }
  if (node.kind === 'decision') return { lines: wrapText(node.label, 14, 2), subtitle: '' }
  if (node.kind === 'terminator') return { lines: wrapText(node.label, 16, 1), subtitle: '' }
  return { lines: wrapText(node.label, 18, 2), subtitle: '' }
}

function lineCenters(center: number, count: number, gap: number) {
  if (count <= 0) return []
  const start = center - ((count - 1) * gap) / 2
  return Array.from({ length: count }, (_, index) => start + index * gap)
}

function renderNodeSvg(node: DiagramNode) {
  const box = nodeBox(node)
  const shape =
    node.kind === 'decision'
      ? `<polygon points="${diamondPoints(node)}" fill="#ffffff" stroke="#64748b" stroke-width="1.5"/>`
      : `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${node.kind === 'terminator' ? box.h / 2 : 8}" fill="${node.kind === 'terminator' ? '#0f172a' : '#ffffff'}" stroke="${node.kind === 'terminator' ? '#0f172a' : '#64748b'}" stroke-width="1.5"/>${node.kind === 'person' ? `<rect x="${box.x + 1}" y="${box.y + 10}" width="4" height="${box.h - 20}" fill="#1d4ed8"/>` : ''}`
  const texts = nodeTexts(node)
    .map(
      (text) =>
        `<text x="${round(text.x)}" y="${round(text.y)}" text-anchor="middle" dominant-baseline="middle" font-family="${DIAGRAM_FONT}" font-size="${text.size}" font-weight="${text.weight}" fill="${text.fill}">${escapeXml(text.text)}</text>`
    )
    .join('')
  return `${shape}${texts}`
}

function round(value: number) {
  return Math.round(value * 10) / 10
}
