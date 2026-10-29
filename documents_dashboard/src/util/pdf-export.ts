import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
    A4_HEIGHT_PX,
    A4_WIDTH_PX,
    createEmptyPage,
    parseDocumentLayoutPages,
    type DocumentPageLayout
} from '@/util/document-layout'
import {
    applyEditorBlockDirections,
    DOCUMENT_EDITOR_RTL_CSS,
    syncHeaderFooterBlockDirections,
} from '@/util/util'
import { DOCUMENT_EDITOR_FONTS_CSS } from '@/util/document-font-stacks'

export type { DocumentPageLayout }

/** @deprecated Use DocumentPageLayout — kept for callers expecting flat layout. */
export interface DocumentLayoutData extends DocumentPageLayout {
    type: 'document-layout'
}

export function parseDocumentLayout(content: string): DocumentLayoutData | null {
    const pages = parseDocumentLayoutPages(content)
    if (!pages?.length) return null
    return { type: 'document-layout', ...pages[0] }
}

const A4_W_PX = A4_WIDTH_PX
const A4_H_PX = A4_HEIGHT_PX
const A4_W_MM = 210
const A4_H_MM = 297
const SCALE = 2

const QUILL_STYLES = `
/* Headings */
.ql-editor h1 { font-size: 2em !important; font-weight: 700; margin: 0.67em 0; line-height: 1.2; }
.ql-editor h2 { font-size: 1.5em !important; font-weight: 700; margin: 0.75em 0; line-height: 1.3; }
.ql-editor h3 { font-size: 1.25em !important; font-weight: 600; margin: 0.83em 0; line-height: 1.4; }
.ql-editor h4 { font-size: 1em !important; font-weight: 600; margin: 1em 0; }
.ql-editor p  { margin: 0; line-height: inherit; }
.ql-editor ul, .ql-editor ol { margin: 0; padding-left: 1.5em; }
.ql-editor li { margin: 0; line-height: inherit; }
.ql-editor blockquote { margin: 1em 0; padding-left: 1em; border-left: 4px solid #e5e7eb; }
.ql-editor pre, .ql-editor .ql-code-block-container { margin: 0; background: #f3f4f6; padding: 1em; border-radius: 4px; font-family: monospace; }
/* Fonts */
${DOCUMENT_EDITOR_FONTS_CSS}
/* Sizes */
.ql-size-small  { font-size: 0.75em !important; }
.ql-size-large  { font-size: 1.5em  !important; }
.ql-size-huge   { font-size: 2.5em  !important; }
/* Alignment */
.ql-align-center { text-align: center; }
.ql-align-right  { text-align: right; }
.ql-align-justify { text-align: justify; }
.ql-direction-rtl, [dir="rtl"] { direction: rtl; text-align: right; }
/* Indents (LTR) */
.ql-indent-1:not(.ql-direction-rtl):not([dir="rtl"]) { padding-left: 3em; }
.ql-indent-2:not(.ql-direction-rtl):not([dir="rtl"]) { padding-left: 6em; }
.ql-indent-3:not(.ql-direction-rtl):not([dir="rtl"]) { padding-left: 9em; }
.ql-indent-4:not(.ql-direction-rtl):not([dir="rtl"]) { padding-left: 12em; }
.ql-indent-5:not(.ql-direction-rtl):not([dir="rtl"]) { padding-left: 15em; }
/* Indents (RTL, non-list blocks) */
.ql-indent-1.ql-direction-rtl, .ql-indent-1[dir="rtl"] { padding-right: 3em; padding-left: 0; }
.ql-indent-2.ql-direction-rtl, .ql-indent-2[dir="rtl"] { padding-right: 6em; padding-left: 0; }
.ql-indent-3.ql-direction-rtl, .ql-indent-3[dir="rtl"] { padding-right: 9em; padding-left: 0; }
.ql-indent-4.ql-direction-rtl, .ql-indent-4[dir="rtl"] { padding-right: 12em; padding-left: 0; }
.ql-indent-5.ql-direction-rtl, .ql-indent-5[dir="rtl"] { padding-right: 15em; padding-left: 0; }
/* Inline */
.ql-editor strong, .ql-editor b { font-weight: 700; }
.ql-editor em, .ql-editor i { font-style: italic; }
.ql-editor u  { text-decoration: underline; }
.ql-editor s  { text-decoration: line-through; }
.ql-editor a  { color: #2563eb; text-decoration: underline; }
`

const HF_PDF_STYLES = `
.doc-hf-pdf-text {
  flex: 1;
  font-size: 13px;
  line-height: 1.5;
  color: #444;
  unicode-bidi: plaintext;
  min-width: 0;
  overflow-wrap: anywhere;
}
.doc-hf-pdf-text > p,
.doc-hf-pdf-text > div {
  unicode-bidi: plaintext;
  display: block;
  margin: 0;
}
.doc-hf-pdf-text table {
  width: 100%;
}
.doc-hf-pdf-text td,
.doc-hf-pdf-text th {
  border: 1px solid #cbd5e1;
  padding: 0px 5px 15px;
  vertical-align: top;
  min-width: 48px;
}
.doc-hf-pdf-text th {
  background: #f8fafc;
}
.doc-hf-pdf-text[dir='rtl'],
.doc-hf-pdf-text > p[dir='rtl'],
.doc-hf-pdf-text > div[dir='rtl'],
.doc-hf-pdf-text [dir='rtl'] {
  direction: rtl;
  text-align: right;
}
`

function buildHeaderFooterTextEl(html: string): HTMLElement {
    const text = document.createElement('div')
    text.className = 'doc-hf-pdf-text'
    text.innerHTML = html
    syncHeaderFooterBlockDirections(text)
    return text
}

function buildHeaderEl(layout: DocumentPageLayout): HTMLElement {
    const hdr = document.createElement('div')
    Object.assign(hdr.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        borderBottom: '1.5px solid #dee2e6',
        minHeight: '80px',
        flexShrink: '0',
        background: 'white',
    })

    if (layout.logos.hdrLeft) {
        const img = document.createElement('img')
        img.src = layout.logos.hdrLeft
        Object.assign(img.style, { maxWidth: '90px', maxHeight: '58px', objectFit: 'contain' })
        hdr.appendChild(img)
    }

    if (layout.headerHtml) {
        hdr.appendChild(buildHeaderFooterTextEl(layout.headerHtml))
    } else {
        const spacer = document.createElement('div')
        spacer.style.flex = '1'
        hdr.appendChild(spacer)
    }

    if (layout.logos.hdrRight) {
        const img = document.createElement('img')
        img.src = layout.logos.hdrRight
        Object.assign(img.style, { maxWidth: '90px', maxHeight: '58px', objectFit: 'contain' })
        hdr.appendChild(img)
    }

    return hdr
}

function buildFooterEl(layout: DocumentPageLayout): HTMLElement {
    const ftr = document.createElement('div')
    Object.assign(ftr.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        borderTop: '1.5px solid #dee2e6',
        minHeight: '80px',
        flexShrink: '0',
        background: 'white',
    })

    if (layout.logos.ftrLeft) {
        const img = document.createElement('img')
        img.src = layout.logos.ftrLeft
        Object.assign(img.style, { maxWidth: '90px', maxHeight: '58px', objectFit: 'contain' })
        ftr.appendChild(img)
    }

    if (layout.footerHtml) {
        ftr.appendChild(buildHeaderFooterTextEl(layout.footerHtml))
    } else {
        const spacer = document.createElement('div')
        spacer.style.flex = '1'
        ftr.appendChild(spacer)
    }

    if (layout.logos.ftrRight) {
        const img = document.createElement('img')
        img.src = layout.logos.ftrRight
        Object.assign(img.style, { maxWidth: '90px', maxHeight: '58px', objectFit: 'contain' })
        ftr.appendChild(img)
    }

    return ftr
}

function splitHtmlBySections(quillHtml: string): DocumentFragment[] {
    const container = document.createElement('div')
    container.innerHTML = quillHtml

    const sections: DocumentFragment[] = [document.createDocumentFragment()]
    for (const child of Array.from(container.children)) {
        if ((child as HTMLElement).classList.contains('ql-page-break')) {
            sections.push(document.createDocumentFragment())
        } else {
            sections[sections.length - 1].appendChild(child.cloneNode(true))
        }
    }
    return sections
}

function buildCaptureRoot(): HTMLDivElement {
    const wrap = document.createElement('div')
    Object.assign(wrap.style, {
        position: 'fixed',
        left: '-9999px',
        top: '0',
        width: `${A4_W_PX}px`,
        background: 'white',
        overflow: 'visible',
        fontFamily: 'Georgia, "Times New Roman", serif',
    })

    const styleEl = document.createElement('style')
    styleEl.textContent = QUILL_STYLES + HF_PDF_STYLES + DOCUMENT_EDITOR_RTL_CSS
    wrap.appendChild(styleEl)

    return wrap
}

function buildBodyEl(
    sectionFragment: DocumentFragment,
    layout: DocumentPageLayout,
): HTMLDivElement {
    const body = document.createElement('div')
    body.className = 'ql-editor'
    Object.assign(body.style, {
        width: `${A4_W_PX}px`,
        boxSizing: 'border-box',
        overflow: 'visible',
        paddingTop: '24px',
        paddingBottom: '24px',
        paddingLeft: `${layout.marginLeft}px`,
        paddingRight: `${layout.marginRight}px`,
        fontSize: '13.5px',
        lineHeight: '1.75',
        color: '#212529',
    })
    body.appendChild(sectionFragment)
    applyEditorBlockDirections(body)
    return body
}

async function waitForPdfContent(container: HTMLElement): Promise<void> {
    const images = container.querySelectorAll('img')
    await Promise.all(
        Array.from(images).map(
            (img) =>
                new Promise<void>((resolve) => {
                    if (img.complete) return resolve()
                    const timeout = setTimeout(resolve, 5000)
                    img.onload = img.onerror = () => {
                        clearTimeout(timeout)
                        resolve()
                    }
                }),
        ),
    )

    if (document.fonts?.ready) {
        await document.fonts.ready
    }

    await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
}

async function renderElementCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
    await waitForPdfContent(element)

    const renderHeight = Math.max(element.scrollHeight, element.offsetHeight, 1)

    return html2canvas(element, {
        scale: SCALE,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: A4_W_PX,
        height: renderHeight,
        windowWidth: A4_W_PX,
        windowHeight: renderHeight,
    })
}

function buildDocumentPageCanvases(
    bodyCanvas: HTMLCanvasElement,
    headerCanvas: HTMLCanvasElement | null,
    footerCanvas: HTMLCanvasElement | null,
): HTMLCanvasElement[] {
    const pageCanvasWidth = A4_W_PX * SCALE
    const pageCanvasHeight = A4_H_PX * SCALE
    const headerHeight = headerCanvas?.height ?? 0
    const footerHeight = footerCanvas?.height ?? 0
    const bodyTop = headerHeight
    const bodyHeightOnPage = pageCanvasHeight - headerHeight - footerHeight
    const pages: HTMLCanvasElement[] = []

    if (bodyHeightOnPage <= 0) return pages

    for (
        let sourceY = 0;
        sourceY < bodyCanvas.height;
        sourceY += bodyHeightOnPage
    ) {
        const pageCanvas = document.createElement('canvas')
        const pageContext = pageCanvas.getContext('2d')
        if (!pageContext) continue

        pageCanvas.width = pageCanvasWidth
        pageCanvas.height = pageCanvasHeight

        pageContext.fillStyle = '#ffffff'
        pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height)

        if (headerCanvas) {
            pageContext.drawImage(headerCanvas, 0, 0)
        }

        const sliceHeight = Math.min(bodyHeightOnPage, bodyCanvas.height - sourceY)
        if (sliceHeight > 0) {
            pageContext.drawImage(
                bodyCanvas,
                0,
                sourceY,
                bodyCanvas.width,
                sliceHeight,
                0,
                bodyTop,
                pageCanvas.width,
                sliceHeight,
            )
        }

        if (footerCanvas) {
            pageContext.drawImage(footerCanvas, 0, pageCanvasHeight - footerHeight)
        }

        pages.push(pageCanvas)
    }

    return pages
}

async function renderDocumentLayoutPageCanvases(layout: DocumentPageLayout): Promise<HTMLCanvasElement[]> {
    const sections = splitHtmlBySections(layout.quillHtml)
    const pages: HTMLCanvasElement[] = []

    for (let i = 0; i < sections.length; i++) {
        const captureRoot = buildCaptureRoot()
        const headerEl = layout.headerVisible ? buildHeaderEl(layout) : null
        const bodyEl = buildBodyEl(sections[i], layout)
        const footerEl = layout.footerVisible ? buildFooterEl(layout) : null

        if (headerEl) captureRoot.appendChild(headerEl)
        captureRoot.appendChild(bodyEl)
        if (footerEl) captureRoot.appendChild(footerEl)
        document.body.appendChild(captureRoot)

        const headerCanvas = headerEl ? await renderElementCanvas(headerEl) : null
        const bodyCanvas = await renderElementCanvas(bodyEl)
        const footerCanvas = footerEl ? await renderElementCanvas(footerEl) : null

        document.body.removeChild(captureRoot)

        pages.push(...buildDocumentPageCanvases(bodyCanvas, headerCanvas, footerCanvas))
    }

    return pages
}

export async function renderDocumentLayoutPageImages(layout: DocumentLayoutData): Promise<string[]> {
    const pages = await renderDocumentLayoutPageCanvases(layout)
    return pages.map((page) => page.toDataURL('image/jpeg', 0.97))
}

/** Preview images for full saved content — same page pipeline as exportDocumentLayoutPdf. */
export async function renderDocumentContentPreviewImages(content: string): Promise<string[]> {
    const trimmed = content.trim()
    if (!trimmed) return []

    const sheets = parseDocumentLayoutPages(trimmed)
    if (sheets?.length) {
        const images: string[] = []
        for (const sheet of sheets) {
            const pageImages = await renderDocumentLayoutPageImages({
                type: 'document-layout',
                ...sheet,
            })
            images.push(...pageImages)
        }
        return images
    }

    return renderDocumentLayoutPageImages({
        type: 'document-layout',
        ...createEmptyPage(),
        quillHtml: trimmed,
    })
}

function resolveExportPages(layout: DocumentLayoutData | string): DocumentPageLayout[] {
    if (typeof layout === 'string') {
        return parseDocumentLayoutPages(layout) ?? [createEmptyPage()]
    }
    const fromString = parseDocumentLayoutPages(JSON.stringify(layout))
    if (fromString?.length) return fromString
    const page = { ...layout } as Partial<DocumentLayoutData>
    delete page.type
    return [page as DocumentPageLayout]
}

/** Export all sheets (and optional in-sheet page breaks) to a multi-page PDF. */
export async function exportDocumentLayoutPdf(
    layout: DocumentLayoutData | string,
    title: string,
): Promise<void> {
    const sheets = resolveExportPages(layout)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    let pdfPageIndex = 0

    for (const sheet of sheets) {
        const canvases = await renderDocumentLayoutPageCanvases(sheet)
        for (const canvas of canvases) {
            if (pdfPageIndex > 0) pdf.addPage()
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, A4_W_MM, A4_H_MM)
            pdfPageIndex++
        }
    }

    pdf.save(`${title || 'document'}.pdf`)
}
