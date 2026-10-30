/** A4 at 96dpi — matches Word print layout and PDF export. */
export const A4_WIDTH_PX = 794
export const A4_HEIGHT_PX = 1123
export const DOC_BODY_PADDING_Y_PX = 48

export interface DocumentPageLogos {
    hdrLeft: string
    hdrRight: string
    ftrLeft: string
    ftrRight: string
}

export interface DocumentPageLayout {
    quillHtml: string
    headerVisible: boolean
    footerVisible: boolean
    marginLeft: number
    marginRight: number
    logos: DocumentPageLogos
    headerHtml: string
    footerHtml: string
}

/** Legacy single-page shape (still supported when loading). */
export interface DocumentLayoutLegacy {
    type: 'document-layout'
    quillHtml?: string
    headerVisible?: boolean
    footerVisible?: boolean
    marginLeft?: number
    marginRight?: number
    logos?: DocumentPageLogos
    headerHtml?: string
    footerHtml?: string
}

export interface DocumentLayoutMulti {
    type: 'document-layout'
    version: 2
    pages: DocumentPageLayout[]
}

export type DocumentLayoutSaved = DocumentLayoutLegacy | DocumentLayoutMulti

const emptyLogos = (): DocumentPageLogos => ({
    hdrLeft: '',
    hdrRight: '',
    ftrLeft: '',
    ftrRight: ''
})

function hasPlainText(html?: string): boolean {
    return Boolean(html?.replace(/<[^>]*>/g, '').trim())
}

function hasHeaderContent(page: { headerHtml?: string; logos?: Partial<DocumentPageLogos> }): boolean {
    return Boolean(hasPlainText(page.headerHtml) || page.logos?.hdrLeft || page.logos?.hdrRight)
}

function hasFooterContent(page: { footerHtml?: string; logos?: Partial<DocumentPageLogos> }): boolean {
    return Boolean(hasPlainText(page.footerHtml) || page.logos?.ftrLeft || page.logos?.ftrRight)
}

export function createEmptyPage(): DocumentPageLayout {
    return {
        quillHtml: '',
        headerVisible: false,
        footerVisible: false,
        marginLeft: 40,
        marginRight: 40,
        logos: emptyLogos(),
        headerHtml: '',
        footerHtml: ''
    }
}

function normalizePageLayout(page: Partial<DocumentPageLayout>): DocumentPageLayout {
    const logos = { ...emptyLogos(), ...(page.logos ?? {}) }
    const normalized = {
        ...createEmptyPage(),
        ...page,
        logos
    }

    return {
        ...normalized,
        headerVisible:
            typeof page.headerVisible === 'boolean'
                ? page.headerVisible
                : hasHeaderContent(normalized),
        footerVisible:
            typeof page.footerVisible === 'boolean'
                ? page.footerVisible
                : hasFooterContent(normalized)
    }
}

function legacyToPage(legacy: DocumentLayoutLegacy): DocumentPageLayout {
    return normalizePageLayout({
        quillHtml: legacy.quillHtml ?? '',
        headerVisible: legacy.headerVisible,
        footerVisible: legacy.footerVisible,
        marginLeft: legacy.marginLeft ?? 40,
        marginRight: legacy.marginRight ?? 40,
        logos: { ...emptyLogos(), ...legacy.logos },
        headerHtml: legacy.headerHtml ?? '',
        footerHtml: legacy.footerHtml ?? ''
    })
}

export function parseLayoutJson(parsed: unknown): DocumentPageLayout[] | null {
    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as Record<string, unknown>
    if (obj.type !== 'document-layout') return null

    if (Array.isArray(obj.pages) && obj.pages.length > 0) {
        return (obj.pages as Partial<DocumentPageLayout>[]).map((p) => normalizePageLayout(p))
    }

    if ('quillHtml' in obj || 'headerHtml' in obj || 'logos' in obj) {
        return [legacyToPage(obj as unknown as DocumentLayoutLegacy)]
    }

    return [createEmptyPage()]
}

export function parseDocumentLayoutPages(content: string): DocumentPageLayout[] | null {
    if (!content?.trim()) return null
    try {
        const parsed = JSON.parse(content)
        return parseLayoutJson(parsed)
    } catch {
        return null
    }
}

export function serializeDocumentLayout(pages: DocumentPageLayout[]): string {
    return JSON.stringify({
        type: 'document-layout',
        version: 2,
        pages
    } satisfies DocumentLayoutMulti)
}

export function isQuillHtmlEmpty(html: string): boolean {
    const t = html?.trim() || ''
    if (!t) return true
    return t === '<p><br></p>' || t === '<p></p>'
}

export function isDocumentLayoutEmpty(content: string): boolean {
    const pages = parseDocumentLayoutPages(content)
    if (!pages) {
        const t = content?.trim() || ''
        return !t || t === '<p><br></p>'
    }
    return pages.every(
        (p) =>
            isQuillHtmlEmpty(p.quillHtml) &&
            !(p.headerHtml?.replace(/<[^>]*>/g, '').trim()) &&
            !(p.footerHtml?.replace(/<[^>]*>/g, '').trim())
    )
}

export function documentLayoutHasReadonlyBlocks(content: string): boolean {
    return /data-readonly=["']true["']/.test(content || '')
}
