import { describe, expect, it } from 'vitest'
import {
  NODE_SIZE,
  addDiagramNode,
  arrangeDiagram,
  connectDiagramNodes,
  diagramIdFromImageTitle,
  diagramImageTitle,
  normalizeDiagramMap,
  removeDiagramSelection,
  renderDiagramSvg,
  starterOrgChart,
  starterProcessFlow,
  wrapText,
} from './diagram-model'

describe('diagram model', () => {
  it('starts an organization chart with a manager and two reports', () => {
    const diagram = starterOrgChart()
    expect(diagram.kind).toBe('org')
    expect(diagram.nodes.map((node) => node.label)).toEqual(['Director', 'Operations', 'Quality'])
    expect(diagram.edges).toEqual([
      expect.objectContaining({ from: 'n1', to: 'n2' }),
      expect.objectContaining({ from: 'n1', to: 'n3' }),
    ])
  })

  it('adds a report under the selected person', () => {
    const next = addDiagramNode(starterOrgChart(), 'person', 'New person', 'n1')
    expect(next.nodes.map((node) => node.label)).toContain('New person')
    expect(next.edges).toContainEqual(expect.objectContaining({ from: 'n1', to: 'n4', label: '' }))
  })

  it('gives an organization-chart box one manager', () => {
    const next = connectDiagramNodes(starterOrgChart(), 'n2', 'n3')
    expect(next.edges.filter((edge) => edge.to === 'n3')).toEqual([
      expect.objectContaining({ from: 'n2', to: 'n3' }),
    ])
  })

  it('keeps a process flow free to branch', () => {
    const next = connectDiagramNodes(starterProcessFlow(), 'n5', 'n4', 'Later')
    expect(next.edges.filter((edge) => edge.to === 'n4')).toEqual([
      expect.objectContaining({ from: 'n3', label: 'Yes' }),
      expect.objectContaining({ from: 'n5', to: 'n4', label: 'Later' }),
    ])
  })

  it('arranges an organization chart below its manager without overlapping boxes', () => {
    const arranged = arrangeDiagram(starterOrgChart())
    const director = arranged.nodes.find((node) => node.id === 'n1')!
    const operations = arranged.nodes.find((node) => node.id === 'n2')!
    const quality = arranged.nodes.find((node) => node.id === 'n3')!
    expect(operations.y).toBeGreaterThan(director.y + NODE_SIZE.person.h)
    expect(quality.y).toBeGreaterThan(director.y + NODE_SIZE.person.h)
    expect(operations.x + NODE_SIZE.person.w).toBeLessThan(quality.x)
  })

  it('arranges a process branch below the main flow', () => {
    const arranged = arrangeDiagram(starterProcessFlow())
    const work = arranged.nodes.find((node) => node.id === 'n2')!
    const finish = arranged.nodes.find((node) => node.id === 'n4')!
    const revise = arranged.nodes.find((node) => node.id === 'n5')!
    expect(finish.x).toBeGreaterThan(work.x)
    expect(revise.y).toBeGreaterThan(work.y + 20)
  })

  it('removes a box and the connectors attached to it', () => {
    const next = removeDiagramSelection(starterOrgChart(), 'n1', null)
    expect(next.nodes.map((node) => node.id)).toEqual(['n2', 'n3'])
    expect(next.edges).toEqual([])
  })

  it('draws the chart as an svg picture and escapes text', () => {
    const diagram = starterOrgChart()
    diagram.nodes[0].label = 'A & B <C>'
    const { svg, width, height } = renderDiagramSvg(diagram)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    expect(svg).toContain('A &amp; B &lt;C&gt;')
    expect(svg).toContain('marker-end="url(#diagram-arrow)"')
    expect(svg).not.toContain('<C>')
    expect(new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror')).toBeNull()
  })

  it('drops organization chart lines from the manager to the reports', () => {
    const { svg } = renderDiagramSvg(starterOrgChart())
    expect(svg).toContain('M 454 104')
  })

  it('keeps a saved diagram map and reads its id from the picture title', () => {
    const id = '6f1e8a0e-9c3b-4d2a-8f7e-1b2c3d4e5f60'
    const map = normalizeDiagramMap({
      [id]: starterOrgChart(),
      'not-an-id': starterOrgChart(),
    })
    expect(Object.keys(map)).toEqual([id])
    expect(diagramIdFromImageTitle(diagramImageTitle(id))).toBe(id)
    expect(diagramIdFromImageTitle('Organization chart')).toBeNull()
  })

  it('wraps long labels and marks the cutoff', () => {
    expect(wrapText('Review the incoming batch', 12, 2)).toEqual(['Review the', 'incoming…'])
  })
})
