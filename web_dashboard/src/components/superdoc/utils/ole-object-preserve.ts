import JSZip from 'jszip'
import { DOCX_MIME, type SuperDocDocumentSource } from '../types/messages'

export const OLE_PRESERVE_MARKER_PREFIX = 'sd-ole-preserve:'

const IMAGE_REL_TYPE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'
const PACKAGE_REL_TYPE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/package'
const OLE_REL_TYPE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject'

const OBJECT_RE = /<w:object\b[\s\S]*?<\/w:object>/gi
const DRAWING_RE = /<w:drawing\b[\s\S]*?<\/w:drawing>/gi

type ZipRel = {
  id: string
  type: string
  target: string
}

export type OleRestoreEntry = {
  id: string
  objectXml: string
  image: {
    fileName: string
    bytes: Uint8Array
    contentType: string
  }
  embedding: {
    fileName: string
    bytes: Uint8Array
    contentType: string
    relationshipType: string
  }
}

export type OlePrepareResult = {
  document: SuperDocDocumentSource
  entries: OleRestoreEntry[]
  replacedCount: number
}

function markerFor(id: string) {
  return `${OLE_PRESERVE_MARKER_PREFIX}${id}`
}

function createOleId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ole-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function escapeXmlAttr(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function extensionOf(path: string) {
  const base = path.split('/').pop() || path
  const idx = base.lastIndexOf('.')
  return idx >= 0 ? base.slice(idx + 1).toLowerCase() : ''
}

function contentTypeForExtension(ext: string, fallback: string) {
  switch (ext) {
    case 'emf':
      return 'image/x-emf'
    case 'wmf':
      return 'image/x-wmf'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'vsdx':
      return 'application/vnd.ms-visio.drawing'
    case 'bin':
      return 'application/vnd.openxmlformats-officedocument.oleObject'
    default:
      return fallback
  }
}

async function sourceToArrayBuffer(source: File | Blob | string): Promise<ArrayBuffer> {
  if (typeof source === 'string') {
    const response = await fetch(source)
    if (!response.ok) {
      throw new Error(`Failed to fetch document (${response.status})`)
    }
    return response.arrayBuffer()
  }
  return source.arrayBuffer()
}

function parseRelationships(relsXml: string): ZipRel[] {
  const rels: ZipRel[] = []
  const re =
    /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bType="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/?>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(relsXml))) {
    rels.push({ id: match[1], type: match[2], target: match[3].replace(/\\/g, '/') })
  }
  // Attribute order can vary — also try Target before Type/Id permutations.
  if (rels.length === 0) {
    const loose = /<Relationship\b([^>]+?)\/?>/gi
    while ((match = loose.exec(relsXml))) {
      const attrs = match[1]
      const id = attrs.match(/\bId="([^"]+)"/i)?.[1]
      const type = attrs.match(/\bType="([^"]+)"/i)?.[1]
      const target = attrs.match(/\bTarget="([^"]+)"/i)?.[1]
      if (id && type && target) {
        rels.push({ id, type, target: target.replace(/\\/g, '/') })
      }
    }
  }
  return rels
}

function resolveWordPartPath(target: string) {
  const trimmed = target.replace(/^\/+/, '')
  if (trimmed.startsWith('word/')) return trimmed
  return `word/${trimmed}`
}

function ptToEmu(pt: number) {
  return Math.max(1, Math.round(pt * 12700))
}

function twipsToEmu(twips: number) {
  return Math.max(1, Math.round(twips * 635))
}

function extractObjectSizeEmu(objectXml: string): { cx: number; cy: number } {
  const style = objectXml.match(/\bstyle="([^"]*)"/i)?.[1] || ''
  const widthPt = Number(style.match(/\bwidth\s*:\s*([\d.]+)\s*pt/i)?.[1])
  const heightPt = Number(style.match(/\bheight\s*:\s*([\d.]+)\s*pt/i)?.[1])
  if (Number.isFinite(widthPt) && Number.isFinite(heightPt) && widthPt > 0 && heightPt > 0) {
    return { cx: ptToEmu(widthPt), cy: ptToEmu(heightPt) }
  }

  const dxa = Number(objectXml.match(/\bw:dxaOrig="(\d+)"/i)?.[1])
  const dya = Number(objectXml.match(/\bw:dyaOrig="(\d+)"/i)?.[1])
  if (Number.isFinite(dxa) && Number.isFinite(dya) && dxa > 0 && dya > 0) {
    return { cx: twipsToEmu(dxa), cy: twipsToEmu(dya) }
  }

  return { cx: ptToEmu(300), cy: ptToEmu(200) }
}

function extractAttr(xml: string, tagHint: string, attr: string): string | null {
  const tagRe = new RegExp(`<${tagHint}\\b[^>]*>`, 'i')
  const tag = xml.match(tagRe)?.[0]
  if (!tag) return null
  return tag.match(new RegExp(`\\b${attr}="([^"]+)"`, 'i'))?.[1] ?? null
}

function buildPreviewDrawingXml(options: {
  imageRId: string
  marker: string
  cx: number
  cy: number
  docPrId: number
}) {
  const { imageRId, marker, cx, cy, docPrId } = options
  const safeMarker = escapeXmlAttr(marker)
  return (
    `<w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0" ` +
    `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${docPrId}" name="${safeMarker}" descr="${safeMarker}"/>` +
    `<wp:cNvGraphicFramePr>` +
    `<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>` +
    `</wp:cNvGraphicFramePr>` +
    `<a:graphic>` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic>` +
    `<pic:nvPicPr>` +
    `<pic:cNvPr id="0" name="${safeMarker}" descr="${safeMarker}"/>` +
    `<pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr>` +
    `</pic:nvPicPr>` +
    `<pic:blipFill>` +
    `<a:blip r:embed="${imageRId}"/>` +
    `<a:stretch><a:fillRect/></a:stretch>` +
    `</pic:blipFill>` +
    `<pic:spPr bwMode="auto">` +
    `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
    `</pic:spPr>` +
    `</pic:pic>` +
    `</a:graphicData>` +
    `</a:graphic>` +
    `</wp:inline>` +
    `</w:drawing>`
  )
}

function rewriteObjectRelationshipIds(
  objectXml: string,
  imageRId: string,
  embedRId: string,
) {
  let next = objectXml.replace(
    /(<v:imagedata\b[^>]*\br:id=")([^"]+)(")/i,
    `$1${imageRId}$3`,
  )
  next = next.replace(/(<o:OLEObject\b[^>]*\br:id=")([^"]+)(")/i, `$1${embedRId}$3`)
  return next
}

function nextRelationshipId(existingIds: Set<string>) {
  let n = 1
  while (existingIds.has(`rId${n}`)) n += 1
  const id = `rId${n}`
  existingIds.add(id)
  return id
}

function ensureContentTypeDefaults(contentTypesXml: string, defaults: Array<{ ext: string; type: string }>) {
  let xml = contentTypesXml
  for (const item of defaults) {
    const already = new RegExp(
      `<Default\\b[^>]*Extension="${item.ext}"[^>]*\\/?>`,
      'i',
    ).test(xml)
    if (already) continue
    xml = xml.replace(
      /<Types\b[^>]*>/i,
      (open) =>
        `${open}<Default Extension="${item.ext}" ContentType="${item.type}"/>`,
    )
  }
  return xml
}

function appendRelationships(relsXml: string, additions: ZipRel[]) {
  if (!additions.length) return relsXml
  const snippets = additions
    .map(
      (rel) =>
        `<Relationship Id="${rel.id}" Type="${rel.type}" Target="${rel.target}"/>`,
    )
    .join('')
  if (/<\/Relationships>/i.test(relsXml)) {
    return relsXml.replace(/<\/Relationships>/i, `${snippets}</Relationships>`)
  }
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `${snippets}</Relationships>`
  )
}

async function readZipBytes(zip: JSZip, path: string): Promise<Uint8Array | null> {
  const file = zip.file(path)
  if (!file) return null
  return file.async('uint8array')
}

async function replaceObjectsInXmlPart(options: {
  zip: JSZip
  xmlPath: string
  relsPath: string
  entries: OleRestoreEntry[]
  docPrIdStart: number
}): Promise<{ replaced: number; nextDocPrId: number }> {
  const { zip, xmlPath, relsPath, entries } = options
  const xmlFile = zip.file(xmlPath)
  if (!xmlFile) return { replaced: 0, nextDocPrId: options.docPrIdStart }

  const xml = await xmlFile.async('string')
  if (!OBJECT_RE.test(xml)) {
    OBJECT_RE.lastIndex = 0
    return { replaced: 0, nextDocPrId: options.docPrIdStart }
  }
  OBJECT_RE.lastIndex = 0

  const relsFile = zip.file(relsPath)
  const relsXml = relsFile ? await relsFile.async('string') : ''
  const rels = parseRelationships(relsXml)
  const relById = new Map(rels.map((rel) => [rel.id, rel]))

  let docPrId = options.docPrIdStart
  let replaced = 0
  const nextXml = xml.replace(OBJECT_RE, (objectXml) => {
    const imageRId =
      extractAttr(objectXml, 'v:imagedata', 'r:id') ||
      extractAttr(objectXml, 'v:imagedata', 'r:embed')
    const embedRId = extractAttr(objectXml, 'o:OLEObject', 'r:id')
    if (!imageRId || !embedRId) return objectXml

    const imageRel = relById.get(imageRId)
    const embedRel = relById.get(embedRId)
    if (!imageRel || !embedRel) return objectXml

    const imagePath = resolveWordPartPath(imageRel.target)
    const embedPath = resolveWordPartPath(embedRel.target)

    // Synchronous placeholder — filled after async reads below via queue.
    replaced += 1
    const id = createOleId()
    const marker = markerFor(id)
    const size = extractObjectSizeEmu(objectXml)
    const drawing = buildPreviewDrawingXml({
      imageRId,
      marker,
      cx: size.cx,
      cy: size.cy,
      docPrId: docPrId++,
    })

    entries.push({
      id,
      objectXml,
      image: {
        fileName: imagePath.split('/').pop() || `preview-${id}.${extensionOf(imagePath) || 'emf'}`,
        bytes: new Uint8Array(),
        contentType: contentTypeForExtension(extensionOf(imagePath), 'image/x-emf'),
      },
      embedding: {
        fileName: embedPath.split('/').pop() || `embedding-${id}.${extensionOf(embedPath) || 'bin'}`,
        bytes: new Uint8Array(),
        contentType: contentTypeForExtension(
          extensionOf(embedPath),
          'application/vnd.openxmlformats-officedocument.oleObject',
        ),
        relationshipType:
          embedRel.type.includes('oleObject') ? OLE_REL_TYPE : PACKAGE_REL_TYPE,
      },
    })

    // Stash paths on the entry via temporary fields by mutating last pushed entry.
    const entry = entries[entries.length - 1] as OleRestoreEntry & {
      _imagePath?: string
      _embedPath?: string
    }
    entry._imagePath = imagePath
    entry._embedPath = embedPath

    return drawing
  })

  // Load binary parts for entries created from this XML part.
  const pending = entries.filter((entry) => {
    const withPaths = entry as OleRestoreEntry & {
      _imagePath?: string
      _embedPath?: string
    }
    return Boolean(withPaths._imagePath && withPaths._embedPath)
  })

  for (const entry of pending) {
    const withPaths = entry as OleRestoreEntry & {
      _imagePath?: string
      _embedPath?: string
    }
    const imageBytes = await readZipBytes(zip, withPaths._imagePath!)
    const embedBytes = await readZipBytes(zip, withPaths._embedPath!)
    if (!imageBytes || !embedBytes) {
      // Leave drawing in place but drop restore entry — cannot preserve without bytes.
      const idx = entries.indexOf(entry)
      if (idx >= 0) entries.splice(idx, 1)
      continue
    }
    entry.image.bytes = imageBytes
    entry.embedding.bytes = embedBytes
    delete withPaths._imagePath
    delete withPaths._embedPath
  }

  if (replaced > 0) {
    zip.file(xmlPath, nextXml)
  }
  return { replaced, nextDocPrId: docPrId }
}

/**
 * Rewrite `w:object` (OLE/Visio) nodes to DrawingML image previews SuperDoc can render,
 * while capturing enough data to restore the original OLE object on export.
 */
export async function prepareDocxWithOlePreviews(
  source: SuperDocDocumentSource,
): Promise<OlePrepareResult> {
  if (!source) {
    return { document: new Blob([], { type: DOCX_MIME }), entries: [], replacedCount: 0 }
  }

  const originalName = source instanceof File ? source.name : 'document.docx'
  const passthrough = (document: SuperDocDocumentSource): OlePrepareResult => ({
    document,
    entries: [],
    replacedCount: 0,
  })

  let buffer: ArrayBuffer
  try {
    buffer = await sourceToArrayBuffer(source)
  } catch {
    return passthrough(source)
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    return passthrough(new File([buffer], originalName, { type: DOCX_MIME }))
  }

  const entries: OleRestoreEntry[] = []
  let docPrId = 1000

  const parts: Array<{ xmlPath: string; relsPath: string }> = [
    { xmlPath: 'word/document.xml', relsPath: 'word/_rels/document.xml.rels' },
  ]

  for (const path of Object.keys(zip.files)) {
    if (/^word\/header\d+\.xml$/i.test(path) || /^word\/footer\d+\.xml$/i.test(path)) {
      const base = path.split('/').pop()!
      parts.push({
        xmlPath: path,
        relsPath: `word/_rels/${base}.rels`,
      })
    }
  }

  for (const part of parts) {
    const result = await replaceObjectsInXmlPart({
      zip,
      xmlPath: part.xmlPath,
      relsPath: part.relsPath,
      entries,
      docPrIdStart: docPrId,
    })
    docPrId = result.nextDocPrId
  }

  if (entries.length === 0) {
    return passthrough(new File([buffer], originalName, { type: DOCX_MIME }))
  }

  const out = await zip.generateAsync({ type: 'blob', mimeType: DOCX_MIME })
  return {
    document: new File([out], originalName, { type: DOCX_MIME }),
    entries,
    replacedCount: entries.length,
  }
}

/**
 * Replace preview drawings marked during prepare with the original `w:object` OLE markup,
 * and re-inject preview + embedding binaries into the exported package.
 */
export async function restoreOleObjectsInDocx(
  exported: Blob,
  entries: OleRestoreEntry[],
): Promise<Blob> {
  if (!entries.length) return exported

  const zip = await JSZip.loadAsync(await exported.arrayBuffer())

  const xmlParts = ['word/document.xml']
  for (const path of Object.keys(zip.files)) {
    if (/^word\/header\d+\.xml$/i.test(path) || /^word\/footer\d+\.xml$/i.test(path)) {
      xmlParts.push(path)
    }
  }

  const partState = new Map<
    string,
    { xml: string; relsPath: string; relsXml: string; existingIds: Set<string>; additions: ZipRel[] }
  >()

  for (const xmlPath of xmlParts) {
    const xmlFile = zip.file(xmlPath)
    if (!xmlFile) continue
    const base = xmlPath.split('/').pop()!
    const relsPath = `word/_rels/${base}.rels`
    const relsFile = zip.file(relsPath)
    const relsXml = relsFile
      ? await relsFile.async('string')
      : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
    const xml = await xmlFile.async('string')
    partState.set(xmlPath, {
      xml,
      relsPath,
      relsXml,
      existingIds: new Set(parseRelationships(relsXml).map((rel) => rel.id)),
      additions: [],
    })
  }

  let restoredAny = false

  for (const entry of entries) {
    const marker = markerFor(entry.id)
    let hostPath: string | null = null
    for (const [xmlPath, state] of partState) {
      if (state.xml.includes(marker)) {
        hostPath = xmlPath
        break
      }
    }
    if (!hostPath) {
      // Preview was deleted in the editor — do not restore that OLE object.
      continue
    }

    const state = partState.get(hostPath)!
    const imageExt = extensionOf(entry.image.fileName) || 'emf'
    const embedExt = extensionOf(entry.embedding.fileName) || 'bin'
    const imageTarget = `media/sd-ole-${entry.id}.${imageExt}`
    const embedTarget = `embeddings/sd-ole-${entry.id}.${embedExt}`
    const imageRId = nextRelationshipId(state.existingIds)
    const embedRId = nextRelationshipId(state.existingIds)

    zip.file(`word/${imageTarget}`, entry.image.bytes)
    zip.file(`word/${embedTarget}`, entry.embedding.bytes)

    state.additions.push(
      { id: imageRId, type: IMAGE_REL_TYPE, target: imageTarget },
      {
        id: embedRId,
        type: entry.embedding.relationshipType || PACKAGE_REL_TYPE,
        target: embedTarget,
      },
    )

    const objectXml = rewriteObjectRelationshipIds(entry.objectXml, imageRId, embedRId)
    let replaced = false
    state.xml = state.xml.replace(DRAWING_RE, (drawing) => {
      if (replaced || !drawing.includes(marker)) return drawing
      replaced = true
      return objectXml
    })
    if (replaced) restoredAny = true
  }

  if (!restoredAny) return exported

  for (const [xmlPath, state] of partState) {
    if (!state.additions.length) continue
    zip.file(xmlPath, state.xml)
    zip.file(state.relsPath, appendRelationships(state.relsXml, state.additions))
  }

  const contentTypesPath = '[Content_Types].xml'
  const contentTypesFile = zip.file(contentTypesPath)
  if (contentTypesFile) {
    const defaults = new Map<string, string>()
    for (const entry of entries) {
      const imageExt = extensionOf(entry.image.fileName) || 'emf'
      const embedExt = extensionOf(entry.embedding.fileName) || 'bin'
      defaults.set(imageExt, entry.image.contentType)
      defaults.set(embedExt, entry.embedding.contentType)
    }
    const updated = ensureContentTypeDefaults(
      await contentTypesFile.async('string'),
      [...defaults.entries()].map(([ext, type]) => ({ ext, type })),
    )
    zip.file(contentTypesPath, updated)
  }

  return zip.generateAsync({ type: 'blob', mimeType: DOCX_MIME })
}
