import { SuperDoc } from 'superdoc'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const READY_TIMEOUT_MS = 120_000
const HIDDEN_DOC_WIDTH = '1024px'
const HIDDEN_DOC_HEIGHT = '768px'

export interface SuperDocDiffUser {
    name: string
    email: string
}

export interface RedlineDiffSummary {
    hasChanges: boolean
    changedComponents: string[]
}

export interface RedlineDiffResult {
    blob: Blob
    summary: RedlineDiffSummary
}

type DocxSource = string | File | Blob

interface DiffSnapshot {
    version: string
    engine: string
    fingerprint: string
    coverage: {
        body: true
        comments: boolean
        styles: boolean
        numbering: boolean
        headerFooters: boolean
    }
    payload: Record<string, unknown>
}

interface DiffPayload {
    version: string
    engine: string
    baseFingerprint: string
    targetFingerprint: string
    coverage: DiffSnapshot['coverage']
    summary: {
        hasChanges: boolean
        changedComponents: string[]
    }
    payload: Record<string, unknown>
}

interface DiffApi {
    capture(input?: Record<string, unknown>): DiffSnapshot
    compare(input: { targetSnapshot: DiffSnapshot }): DiffPayload
    apply(
        input: { diff: DiffPayload },
        options?: { changeMode?: 'direct' | 'tracked' }
    ): { appliedOperations: number; diagnostics: string[] }
}

interface HiddenSuperDocSession {
    instance: SuperDoc
    cleanup: () => void
}

function requireDiffApi(editor: { doc?: { diff?: DiffApi } } | null | undefined): DiffApi {
    const diff = editor?.doc?.diff
    if (!diff) {
        throw new Error('SuperDoc diff API unavailable')
    }
    return diff
}

function openHiddenDocx(docxSource: DocxSource, user: SuperDocDiffUser): Promise<HiddenSuperDocSession> {
    const container = globalThis.document.createElement('div')
    container.setAttribute('aria-hidden', 'true')
    Object.assign(container.style, {
        position: 'fixed',
        left: '-9999px',
        top: '0',
        width: HIDDEN_DOC_WIDTH,
        height: HIDDEN_DOC_HEIGHT,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: '0',
    })
    globalThis.document.body.appendChild(container)

    return new Promise((resolve, reject) => {
        let instance: SuperDoc | null = null
        let settled = false

        const cleanup = () => {
            instance?.destroy()
            container.remove()
        }

        const fail = (error: Error) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            cleanup()
            reject(error)
        }

        const timer = setTimeout(() => {
            fail(new Error('SuperDoc init timeout'))
        }, READY_TIMEOUT_MS)

        try {
            instance = new SuperDoc({
                selector: container,
                document: docxSource,
                documentMode: 'viewing',
                role: 'viewer',
                contained: true,
                user,
                modules: {
                    comments: false,
                },
                onReady: () => {
                    if (settled) return
                    settled = true
                    clearTimeout(timer)
                    try {
                        requireDiffApi(instance?.activeEditor)
                        resolve({
                            instance: instance!,
                            cleanup,
                        })
                    } catch (error) {
                        cleanup()
                        reject(error instanceof Error ? error : new Error('SuperDoc diff API unavailable'))
                    }
                },
            })
        } catch (error) {
            fail(error instanceof Error ? error : new Error('SuperDoc init failed'))
        }
    })
}

async function exportDocxBlob(instance: SuperDoc): Promise<Blob> {
    const blobs = await instance.exportEditorsToDOCX({ commentsType: 'clean' })
    const blob = Array.isArray(blobs) ? blobs[0] : blobs
    if (!blob) {
        throw new Error('SuperDoc diff export produced no document')
    }
    if (blob.type === DOCX_MIME) return blob
    return new Blob([blob], { type: DOCX_MIME })
}

/**
 * File-to-file redline via Document API:
 * 1. target: editor.doc.diff.capture({})
 * 2. base: editor.doc.diff.compare({ targetSnapshot }) — non-mutating
 * 3. base: editor.doc.diff.apply({ diff }, { changeMode: 'tracked' })
 *
 * @see https://docs.superdoc.dev/document-api/reference/diff/capture
 * @see https://docs.superdoc.dev/document-api/reference/diff/compare
 * @see https://docs.superdoc.dev/document-api/reference/diff/apply
 */
export async function buildRedlinedDocx(
    original: DocxSource,
    revised: DocxSource,
    user: SuperDocDiffUser
): Promise<RedlineDiffResult> {
    const base = await openHiddenDocx(original, user)
    try {
        const target = await openHiddenDocx(revised, user)
        const targetDiff = requireDiffApi(target.instance.activeEditor)

        // diff.capture — snapshot revised doc (target session)
        const targetSnapshot = targetDiff.capture()
        target.cleanup()

        const baseDiff = requireDiffApi(base.instance.activeEditor)

        // diff.compare — base vs snapshot, returns DiffPayload, does not mutate
        const diffPayload = baseDiff.compare({ targetSnapshot })

        const summary: RedlineDiffSummary = {
            hasChanges: diffPayload.summary.hasChanges,
            changedComponents: [...diffPayload.summary.changedComponents],
        }

        // always apply — hasChanges may be false-negative; apply is no-op when no changes
        baseDiff.apply({ diff: diffPayload }, { changeMode: 'tracked' })

        const blob = await exportDocxBlob(base.instance)
        return { blob, summary }
    } finally {
        base.cleanup()
    }
}

export function redlinedDocxToObjectUrl(blob: Blob): string {
    return URL.createObjectURL(new Blob([blob], { type: DOCX_MIME }))
}
