import { DocumentStatus } from '@/util/interfaces'
import { normalizeDiagramMap, type DiagramMap } from '../superdoc/diagram/diagram-model'

type VersionWithDiagrams = {
  status?: string
  versionNumber?: number
  diagrams?: unknown
}

export function diagramsForEditorDocument(
  versions: VersionWithDiagrams[] | undefined,
  editingPending: boolean
): DiagramMap {
  const list = versions ?? []
  const byNewest = (status: string) =>
    list
      .filter((version) => version.status === status)
      .sort((left, right) => (right.versionNumber ?? 0) - (left.versionNumber ?? 0))[0]
  const pending = byNewest(DocumentStatus.PENDING)
  const published = byNewest(DocumentStatus.PUBLISHED) ?? byNewest(DocumentStatus.OBSOLETE)
  const chosen = editingPending ? pending ?? published : published ?? pending
  return normalizeDiagramMap(chosen?.diagrams)
}

export function appendDiagrams(form: FormData, diagrams: DiagramMap) {
  form.append('diagrams', JSON.stringify(diagrams))
}
