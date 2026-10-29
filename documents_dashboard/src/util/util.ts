import { isBefore, parse, startOfDay } from 'date-fns'
import { DateTime } from 'luxon'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import 'quill/dist/quill.snow.css'
import 'quill-table-better/dist/quill-table-better.css'
import { exportDocumentLayoutPdf } from '@/util/pdf-export'
import { parseDocumentLayoutPages } from '@/util/document-layout'
import { DOCUMENT_EDITOR_FONTS_CSS } from '@/util/document-font-stacks'

/** RTL list/block CSS for PDF export and read-only views (editor copy lives in RichText.vue). */
export const DOCUMENT_EDITOR_RTL_CSS = `
.ql-editor li[data-list] { list-style-type: none; position: relative; }
.ql-editor li[data-list] > .ql-ui:before { display: inline-block; white-space: nowrap; width: 1.2em; }
.ql-editor li[data-list]:not(.ql-direction-rtl):not([dir='rtl']) { padding-left: 1.5em; padding-right: 0; }
.ql-editor li[data-list]:not(.ql-direction-rtl):not([dir='rtl']) > .ql-ui:before { margin-left: -1.5em; margin-right: 0.3em; text-align: right; }
.ql-editor li[data-list].ql-direction-rtl, .ql-editor li[data-list][dir='rtl'] { padding-right: 1.5em; padding-left: 0; text-align: right; }
.ql-editor li[data-list].ql-direction-rtl > .ql-ui:before, .ql-editor li[data-list][dir='rtl'] > .ql-ui:before { margin-left: 0.3em; margin-right: -1.5em; text-align: left; }
.ql-editor ol { padding-left: 0; margin: 0.75em 0; }
.ql-editor blockquote.ql-direction-rtl, .ql-editor blockquote[dir='rtl'] { padding-left: 0; padding-right: 1em; border-left: none; border-right: 4px solid #e5e7eb; text-align: right; }
.ql-editor li[data-list].ql-direction-rtl.ql-indent-1, .ql-editor li[data-list][dir='rtl'].ql-indent-1 { padding-right: 4.5em; }
.ql-editor li[data-list].ql-direction-rtl.ql-indent-2, .ql-editor li[data-list][dir='rtl'].ql-indent-2 { padding-right: 7.5em; }
.ql-editor li[data-list].ql-direction-rtl.ql-indent-3, .ql-editor li[data-list][dir='rtl'].ql-indent-3 { padding-right: 10.5em; }
.ql-editor li[data-list].ql-direction-rtl.ql-indent-4, .ql-editor li[data-list][dir='rtl'].ql-indent-4 { padding-right: 13.5em; }
.ql-editor li[data-list].ql-direction-rtl.ql-indent-5, .ql-editor li[data-list][dir='rtl'].ql-indent-5 { padding-right: 16.5em; }
.ql-editor li[data-list].ql-direction-rtl.ql-indent-6, .ql-editor li[data-list][dir='rtl'].ql-indent-6 { padding-right: 19.5em; }
.ql-editor li[data-list].ql-direction-rtl.ql-indent-7, .ql-editor li[data-list][dir='rtl'].ql-indent-7 { padding-right: 22.5em; }
.ql-editor li[data-list].ql-direction-rtl.ql-indent-8, .ql-editor li[data-list][dir='rtl'].ql-indent-8 { padding-right: 25.5em; }
.ql-editor li[data-list].ql-direction-rtl.ql-indent-9, .ql-editor li[data-list][dir='rtl'].ql-indent-9 { padding-right: 28.5em; }
.document-content .ql-editor [dir='rtl'] ul, .document-content .ql-editor [dir='rtl'] ol,
.document-content .ql-editor .ql-direction-rtl ul, .document-content .ql-editor .ql-direction-rtl ol,
.document-content [dir='rtl'] ul, .document-content [dir='rtl'] ol { padding-left: 0; padding-right: 1.5em; }
`

let documentEditorRtlStylesInjected = false

/** Inject RTL styles for document view/compare (editor uses RichText.vue styles). */
export function injectDocumentEditorRtlStyles(): void {
    if (documentEditorRtlStylesInjected || typeof document === 'undefined') return
    documentEditorRtlStylesInjected = true
    const el = document.createElement('style')
    el.setAttribute('data-document-editor-rtl', '')
    el.textContent = DOCUMENT_EDITOR_RTL_CSS
    document.head.appendChild(el)
}

export const capitalizeFirstLetter = (str: string) => {
    return `${str.charAt(0).toUpperCase()}${str.substring(1)}`
}
export const INPUT_CLASS = `block w-full rounded-md border-0  pl-1.5 py-1.5  text-black shadow-sm ring-1 ring-inset  ring-black/30  focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6`

export const exists = (value: string) => {
    if (!value) {
        return false
    }
    return true
}
export const isEmail = (value: string) => {
    return /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(value)
}
export const isPhoneWithCountryCode = (value: string) => {
    return (
        /^\+\d{1,3}\s?\d{1,14}(\s?\d{1,13})?$/.test(value) ||
        /^\(\d{3}\) \d{3}-\d{4}$/.test(value) ||
        /^[0-9]{10}$/.test(value)
    )
}

export const isPhone = (value: string) => {
    const phone = value.trim();

    const intlRegex = /^\+(\d{1,3})(?:[\s.-]?\(?\d{1,4}\)?)*\d{3,4}$/;
    const usRegex = /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
    const plainRegex = /^\d{3}[\s.-]?\d{3}[\s.-]?\d{4}$/;

    if (intlRegex.test(phone) || usRegex.test(phone) || plainRegex.test(phone)) {
        const digitsCount = phone.replace(/\D/g, '').length;
        return digitsCount >= 7 && digitsCount <= 15;
    }

    return false;
}

export const isValidDate = (value: any): boolean => {
    if (!value) {
        return false
    }
    
    let date: Date
    
    // Handle different input types
    if (value instanceof Date) {
        date = value
    } else if (typeof value === 'string' || typeof value === 'number') {
        date = new Date(value)
    } else {
        return false
    }
    
    // Check if date is valid and not Invalid Date
    if (!(date instanceof Date && !isNaN(date.getTime()))) {
        return false
    }
    
    // Check if date is not more than 50 years from now
    const now = new Date()
    const fiftyYearsFromNow = new Date()
    fiftyYearsFromNow.setFullYear(now.getFullYear() + 50)
    
    return date <= fiftyYearsFromNow
}

export const getVal = (num: number, unit: string, total: number) => {
    const val = unit == 'dollar' ? +num : +((total * +num) / 100).toFixed(2)
    return val
}
export const isValidPassword = (value: string) => {
    return (
        !!value &&
        value.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&-_])[A-Za-z\d@$!%*?&-_]{8,}$/)
    )
}

export const isValidHttpUrl = (value: string) => {
    if (!value?.trim()) {
        return false
    }

    try {
        const url = new URL(value.trim())
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

export const openFile = (url: string) => {
    window.open(`${url}`, '_blank')?.focus()
}
export function parseJwt(token: string) {
    var base64Url = token.split('.')[1]
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    var jsonPayload = decodeURIComponent(
        window
            .atob(base64)
            .split('')
            .map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            })
            .join('')
    )
    return JSON.parse(jsonPayload)
}

export const flattenTree = (unitTypes: any[]) => {
    const flatList: any[] = []
    const seenIds = new Set<number>()

    const traverse = (nodes: any[]) => {
        for (const node of nodes) {
            if (!seenIds.has(node.id)) {
                seenIds.add(node.id)
                flatList.push(node)
            }
            if (node.children && node.children.length) {
                traverse(node.children)
            }
        }
    }

    traverse(unitTypes)
    return flatList
}
export const getRootUnits = (organizationUnitIds: number[], organizationTree: any[]) => {
    let ids: number[] = []
    const getNestedIds = (unit: any): number[] => {
        let nestedIds = [unit.id]
        if (!unit.children) {
            return nestedIds
        }
        for (const child of unit.children) {
            nestedIds = [...nestedIds, ...getNestedIds(child)]
        }
        return nestedIds
    }

    for (const id of organizationUnitIds) {
        const unit = organizationTree.find((u) => u.id === id)
        if (unit) {
            ids = [...ids, ...getNestedIds(unit)]
        } else {
            ids.push(id)
        }
    }

    return [...new Set(ids)]
}
export const timeSince = (createdAt: number): string => {
    return DateTime.fromMillis(+createdAt).setZone('utc').toRelative() || ''
}
export const isInPast = (date: string): boolean => {
    const dueDateParsed = parse(date || '', 'yyyy-MM-dd', new Date())
    const today = startOfDay(new Date())
    if (isBefore(dueDateParsed, today)) {
        return true
    }
    return false
}

export const startOfTodayMs = (): number => startOfDay(new Date()).getTime()

export const isNonConformityOverdue = (nc?: {
    status?: string
    dueDate?: number | string | null
    isOverdue?: boolean
} | null): boolean => {
    if (!nc || nc.status === 'CLOSED') return false
    if (typeof nc.isOverdue === 'boolean') return nc.isOverdue
    const due = Number(nc.dueDate)
    return Number.isFinite(due) && due < startOfTodayMs()
}

export const ncDisplayStatus = (
    nc?: {
        status?: string
        dueDate?: number | string | null
        isOverdue?: boolean
    } | null
): 'OPEN' | 'CLOSED' | 'OVERDUE' => {
    if (!nc) return 'OPEN'
    if (nc.status === 'CLOSED') return 'CLOSED'
    if (isNonConformityOverdue(nc)) return 'OVERDUE'
    return 'OPEN'
}

export const canMutateNonConformity = (nc?: {
    status?: string
    dueDate?: number | string | null
    isOverdue?: boolean
} | null): boolean => {
    return !!nc && nc.status !== 'CLOSED' && !isNonConformityOverdue(nc)
}
/** Preserve day-first order (e.g. "15 May 2026") in RTL layouts. */
const wrapLtr = (text: string): string => `\u2066${text}\u2069`

export const formatDate = (date: number): string => {
    return wrapLtr(DateTime.fromMillis(+date).setZone('utc').toFormat('dd MMM yyyy HH:mm'))
}
export const formatDateToDay = (date: number): string => {
    return wrapLtr(DateTime.fromMillis(+date).setZone('utc').toFormat('dd MMM yyyy'))
}

export const isEpochTimestamp = (value: any): boolean => {
    // Check if value is a number or can be converted to a number
    const num = Number(value)
    if (isNaN(num)) return false
    
    // Epoch timestamps should be positive
    if (num <= 0) return false
    
    // Check if it's a reasonable timestamp (between 1970 and 2100)
    // Timestamps in milliseconds: 10 digits to 13 digits
    // Timestamps in seconds: 10 digits
    const minTimestamp = 946684800000 // Jan 1, 2000
    const maxTimestamp = 4102444800000 // Jan 1, 2100 in milliseconds
    
    // Try both milliseconds and seconds
    const inMillis = num
    const inSeconds = num * 1000
    
    return (inMillis >= minTimestamp && inMillis <= maxTimestamp) || 
           (inSeconds >= minTimestamp && inSeconds <= maxTimestamp)
}
export const formatDateToDayDate = (date: number): Date => {
    // Get the UTC date components and create a new Date as if they were local
    const utcDateTime = DateTime.fromMillis(+date).setZone('utc');
    return new Date(
        utcDateTime.year,
        utcDateTime.month - 1, // JavaScript months are 0-based
        utcDateTime.day,
        utcDateTime.hour,
        utcDateTime.minute,
        utcDateTime.second
    );
}
export const formatDateToInput = (date: number): string => {
    const newDate =  DateTime.fromMillis(+date).setZone('utc').toFormat('yyyy-MM-dd')
    return newDate;
}
export const formatDateToInputWithTime = (date: number): string => {
    return DateTime.fromMillis(+date).setZone('utc').toFormat("yyyy-MM-dd'T'HH:mm")
}
export const mapDocumentStatus = (status: string) => {
    switch (status) {
        case 'pending':
            return 'Pending'
        case 'ready_for_approval':
            return 'Ready for Approval'
        case 'published':
            return 'Published'
        case 'in_review':
            return 'In Review'
        case 'valid':
            return 'Valid'
        case 'invalid':
            return 'Invalid'
        case 'obsolete':
            return 'Expired'
        default:
            return status
    }
}

export function documentDueDateFormState(dueDate?: number | string | null): {
    dueDate: string
    neverExpires: boolean
} {
    const n = Number(dueDate)
    if (!Number.isFinite(n) || n <= 0) {
        return { dueDate: '', neverExpires: true }
    }
    try {
        return {
            dueDate: new Date(n).toISOString().split('T')[0],
            neverExpires: false
        }
    } catch {
        return { dueDate: '', neverExpires: true }
    }
}

export function appendDocumentDueDate(
    form: FormData,
    dueDate: string,
    neverExpires: boolean,
): void {
    if (neverExpires || !dueDate) {
        form.append('dueDate', '0')
        return
    }
    form.append('dueDate', String(new Date(dueDate).getTime()))
}
export const formatLocalDate = (date: number): string => {
    return wrapLtr(DateTime.fromMillis(+date).toLocal().toFormat('dd MMM yyyy HH:mm'))
}
export const formatTimeAgo = (timestamp: number) => {
    const now = new Date()
    const date = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return formatDate(timestamp)
}

export const mapChangeRequestStatus = (status: string) => {
    switch (status) {
        case 'active':
            return 'Active'
        case 'accepted':
            return 'Accepted'
        case 'rejected':
            return 'Rejected'
        default:
            return status
    }
}
export const mapActionTypeToMessage = (actionType: string) => {
    switch (actionType) {
        case 'reviewed':
            return 'Ready for Approval'
        case 'reviewed_rejected':
            return 'Request Changes'
        case 'approved':
            return 'Approved'
        case 'rejected':
            return 'Rejected'
        case 'send_for_review':
            return 'Send for Review'
        case 'published':
            return 'Published'
        case 'obsolete':
            return 'Expired'
        case 'ready_for_approval':
            return 'Send for Approval'
        case 'contributed':
            return 'Uploaded File'
    }
}

export function snakeToCamelCase(str: string): string {
    return str
        .toLowerCase()
        .split('_')
        .map((word, index) => {
            if (index === 0) {
                return word.charAt(0).toUpperCase() + word.slice(1)
            }
            return word.charAt(0).toUpperCase() + word.slice(1)
        })
        .join(' ')
}

export const getFileNameFromUrl = (url: string | null): string | null => {
    if (!url) return null;
    // First split by '/' to handle the UUID prefix
    const parts = url.split('/');
    // Get the last part which contains the filename
    const filename = parts[parts.length - 1];
    // Remove the UUID prefix (everything before the first underscore)
    return filename.substring(filename.indexOf('_') + 1);
}

export const sanitizeFileName = (name: string): string => {
    return (name || '')
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '-')
}

export const parseCSVContentWithErrors = (
    csvContent: string
): {
    recipients: Array<{ name: string; email: string; phone?: string; companyName?: string }>
    errors: string[]
} => {
    const lines = csvContent.split('\n').filter((line) => line.trim())

    if (lines.length < 2) {
        throw new Error('CSV file must contain headers and at least one data row')
    }

    // Parse headers (expected: name, email, phone, companyName)
    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
    const expectedHeaders = ['name', 'email', 'phone', 'companyName']

    // Validate headers and create header map
    const headerMap: { [key: string]: number } = {}
    expectedHeaders.forEach((expectedHeader) => {
        const headerIndex = headers.findIndex(
            (h) => h.toLowerCase() === expectedHeader.toLowerCase()
        )
        if (headerIndex === -1 && expectedHeader === 'email') {
            throw new Error(`Required header '${expectedHeader}' not found in CSV`)
        }
        if (headerIndex !== -1) {
            headerMap[expectedHeader] = headerIndex
        }
    })

    // Parse data rows
    const recipients: Array<{ name: string; email: string; phone?: string; companyName?: string }> =
        []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        try {
            // Parse CSV row (handle quoted fields)
            const values = parseCSVRow(line)

            if (values.length < Math.max(...Object.values(headerMap)) + 1) {
                errors.push(`Row ${i + 1}: Not enough columns`)
                continue
            }

            const name = headerMap.name !== undefined ? values[headerMap.name]?.trim() : ''
            const email = headerMap.email !== undefined ? values[headerMap.email]?.trim() : ''
            const phone = headerMap.phone !== undefined ? values[headerMap.phone]?.trim() : ''
            const companyName =
                headerMap.companyName !== undefined ? values[headerMap.companyName]?.trim() : ''

            if (!name || !email) {
                errors.push(`Row ${i + 1}: Name and email are required`)
                continue
            }

            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                errors.push(`Row ${i + 1}: Invalid email format: ${email}`)
                continue
            }

            recipients.push({
                name,
                email,
                phone: phone || undefined,
                companyName: companyName || undefined
            })
        } catch (error: any) {
            errors.push(`Row ${i + 1}: Error parsing row - ${error.message}`)
        }
    }

    return { recipients, errors }
}

const parseCSVRow = (row: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < row.length) {
        const char = row[i]

        if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {   
                current += '"'
                i++ // Skip the next quote
            } else {
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current)
            current = ''
        } else {
            current += char
        }
        i++
    }

    result.push(current)
    return result.map((field) => field.replace(/^"|"$/g, ''))
}

// Sorting helpers
export const sortValuesByDisplayWithEmptyIdFirst = (
    values: any[],
    display: (v: any) => string
): any[] => {
    if (!Array.isArray(values)) {
        return []
    }
    const rank = (v: any) => ((v as any)?.id === '' ? 0 : 1)
    const label = (v: any) => String(display(v) ?? '')
    return [...values].sort(
        (a, b) => rank(a) - rank(b) || label(a).localeCompare(label(b), undefined, { sensitivity: 'base' })
    )
}

export const sortValuesByAttributeWithEmptyIdFirst = (values: any[], attribute: string): any[] => {
    if (!Array.isArray(values)) {
        return []
    }
    const rank = (v: any) => ((v as any)?.id === '' ? 0 : 1)
    const key = (v: any) => v?.[attribute]
    return [...values].sort((a, b) => {
        const rankDiff = rank(a) - rank(b)
        if (rankDiff !== 0) {
            return rankDiff
        }
        const aVal = key(a)
        const bVal = key(b)
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return aVal - bVal
        }
        return String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, { sensitivity: 'base' })
    })
}

const PDF_CONTENT_STYLES = `
.ql-editor { direction: auto; unicode-bidi: plaintext; font-family: Arial, Tahoma, "Segoe UI", "Noto Naskh Arabic", "Noto Sans Arabic", Helvetica, sans-serif; }
.ql-editor * { font-kerning: normal; text-rendering: optimizeLegibility; }
.ql-editor h1, h1 { font-size: 32px !important; font-weight: 700; margin: 0.67em 0; line-height: 1.2; }
.ql-editor h2, h2 { font-size: 24px !important; font-weight: 700; margin: 0.75em 0; line-height: 1.3; }
.ql-editor h3, h3 { font-size: 20px !important; font-weight: 600; margin: 0.83em 0; line-height: 1.4; }
.ql-editor h4, h4 { font-size: 18px !important; font-weight: 600; margin: 1em 0; }
.ql-editor h5, h5 { font-size: 16px !important; font-weight: 600; margin: 1em 0; }
.ql-editor h6, h6 { font-size: 14px !important; font-weight: 600; margin: 1em 0; }
.ql-editor p { margin: 0.75em 0; line-height: 1.7; }
.ql-editor ul, .ql-editor ol { margin: 0.75em 0; padding-left: 1.5em; }
.ql-editor li { margin: 0.3em 0; line-height: 1.7; }
.ql-editor blockquote { margin: 1em 0; padding-left: 1em; border-left: 4px solid #e5e7eb; }
.ql-editor pre, .ql-editor .ql-code-block-container { margin: 0.75em 0; }
.ql-editor img { max-width: 100%; height: auto; }
.ql-editor img.ql-align-center { display: block; margin-left: auto; margin-right: auto; }
.ql-editor img.ql-align-right { display: block; margin-left: auto; margin-right: 0; }
.ql-editor img.ql-align-justify { display: block; width: 100%; max-width: 100%; }
.ql-editor [dir="rtl"] img.ql-align-right, .ql-editor .ql-direction-rtl img.ql-align-right { margin-left: 0; margin-right: auto; }
${DOCUMENT_EDITOR_FONTS_CSS}
.ql-size-small { font-size: 0.75em !important; }
.ql-size-large { font-size: 1.5em !important; }
.ql-size-huge { font-size: 2.5em !important; }
.ql-align-center { text-align: center; }
.ql-align-right { text-align: right; }
.ql-align-justify { text-align: justify; }
.ql-direction-rtl { direction: rtl; unicode-bidi: embed; }
.ql-indent-1 { padding-left: 3em; }
.ql-indent-2 { padding-left: 6em; }
.ql-indent-3 { padding-left: 9em; }
.ql-indent-4 { padding-left: 12em; }
.ql-indent-5 { padding-left: 15em; }
.ql-page-break { display: none; }
.ql-direction-rtl, .ql-editor [dir="rtl"] { direction: rtl; text-align: right; }
.ql-editor [dir="rtl"] ul, .ql-editor [dir="rtl"] ol,
.ql-editor .ql-direction-rtl ul, .ql-editor .ql-direction-rtl ol {
  padding-left: 0; padding-right: 1.5em;
}
.ql-editor [dir="rtl"] blockquote, .ql-editor .ql-direction-rtl blockquote {
  padding-left: 0; padding-right: 1em; border-left: none; border-right: 4px solid #e5e7eb;
}
`

const PDF_EXPORT_WIDTH_PX = 794
const PDF_EXPORT_SCALE = 2



export function applyEditorBlockDirections(root: HTMLElement): void {
    root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li[data-list]').forEach((el) => {
        syncBlockDirectionFromText(el as HTMLElement)
    })
}



const splitHtmlByPageBreaks = (html: string): string[] => {
    const parser = document.createElement('div')
    parser.innerHTML = html

    const sections: HTMLDivElement[] = [document.createElement('div')]
    Array.from(parser.childNodes).forEach((node) => {
        if (node instanceof HTMLElement && node.classList.contains('ql-page-break')) {
            sections.push(document.createElement('div'))
            return
        }
        sections[sections.length - 1].appendChild(node.cloneNode(true))
    })

    return sections
        .map((section) => section.innerHTML)
        .filter((section, index) => index === 0 || section.trim())
}

const waitForPdfContent = async (container: HTMLElement): Promise<void> => {
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
                })
        )
    )

    if (document.fonts?.ready) {
        await document.fonts.ready
    }

    await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
    )
}

const renderPdfSection = async (html: string): Promise<HTMLCanvasElement> => {
    const container = document.createElement('div')
    container.style.cssText =
        `position:fixed;top:0;left:-10000px;width:${PDF_EXPORT_WIDTH_PX}px;padding:40px 40px 60px;background:#fff;font-family:Arial,Tahoma,"Segoe UI","Noto Naskh Arabic","Noto Sans Arabic",Helvetica,sans-serif;font-size:16px;line-height:1.6;overflow:visible`
    container.innerHTML =
        `<style>${PDF_CONTENT_STYLES}</style>` +
        `<div class="ql-editor ql-container ql-snow" style="border:none;padding:0;font-size:16px;padding-bottom:20px;">${html}</div>`
    document.body.appendChild(container)

    try {
        await waitForPdfContent(container)

        const scrollHeight = container.scrollHeight
        const scrollWidth = container.scrollWidth
        return await html2canvas(container, {
            scale: PDF_EXPORT_SCALE,
            useCORS: true,
            width: scrollWidth,
            height: scrollHeight,
            windowWidth: scrollWidth,
            windowHeight: Math.max(scrollHeight, window.innerHeight),
            scrollX: 0,
            scrollY: 0,
            logging: false
        })
    } finally {
        document.body.removeChild(container)
    }
}

const addCanvasPagesToPdf = (
    pdf: jsPDF,
    canvas: HTMLCanvasElement,
    addNewPageBeforeFirstPage: boolean
): void => {
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const pageHeightOnCanvas = Math.floor((pageH * canvas.width) / pageW)
    const pageCanvas = document.createElement('canvas')
    const pageContext = pageCanvas.getContext('2d')

    if (!pageContext || pageHeightOnCanvas <= 0) return

    pageCanvas.width = canvas.width

    for (let sourceY = 0, pageIndex = 0; sourceY < canvas.height; sourceY += pageHeightOnCanvas, pageIndex++) {
        const sliceHeight = Math.min(pageHeightOnCanvas, canvas.height - sourceY)
        pageCanvas.height = sliceHeight

        pageContext.fillStyle = '#ffffff'
        pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
        pageContext.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
        )

        if (addNewPageBeforeFirstPage || pageIndex > 0) {
            pdf.addPage()
        }

        const imgH = (sliceHeight * pageW) / canvas.width
        pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH)
    }
}

export const generatePdfFromHtml = async (html: string, title: string): Promise<void> => {
    const pages = parseDocumentLayoutPages(html)

    if (pages?.length) {
        return exportDocumentLayoutPdf(html, title)
    }

    const pdf = new jsPDF({ unit: 'px', format: 'a4' })
    const sections = splitHtmlByPageBreaks(html)

    for (let i = 0; i < sections.length; i++) {
        const canvas = await renderPdfSection(sections[i])
        addCanvasPagesToPdf(pdf, canvas, i > 0)
    }

    pdf.save(`${title || 'document'}.pdf`)
}

export type ApiErrorBody = {
    message?: string | string[]
    key?: string
    params?: Record<string, string | number>
    statusCode?: number
}

export function parseApiErrorBody(data: unknown): ApiErrorBody | null {
    if (data == null) return null
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data) as unknown
            if (parsed !== null && typeof parsed === 'object') {
                return parsed as ApiErrorBody
            }
            return { message: data }
        } catch {
            return { message: data }
        }
    }
    if (typeof data === 'object') {
        return data as ApiErrorBody
    }
    return null
}

export function formatApiErrorMessage(
    data: unknown,
    t: (key: string, ...args: unknown[]) => string,
    localeKeyPrefix: string
): string {
    const body = parseApiErrorBody(data)
    if (!body) return ''

    const prefix = localeKeyPrefix.replace(/\.+$/, '')
    const key = body.key
    if (prefix && typeof key === 'string' && key.length > 0) {
        const path = `${prefix}.${key}`
        const translated = t(path, (body.params ?? {}) as Record<string, unknown>)
        if (translated !== path) return translated
    }

    if (Array.isArray(body.message)) return body.message.join(', ')
    if (typeof body.message === 'string') return body.message
    return ''
}

type NcProblemStatementPayload = {
    key?: string
    params?: Record<string, unknown>
}

function parseNcProblemStatementPayload(
    raw?: string | null
): NcProblemStatementPayload | null {
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw) as NcProblemStatementPayload
        if (parsed && typeof parsed.key === 'string' && parsed.key.length > 0) {
            return parsed
        }
    } catch {
        // plain text
    }
    return null
}

/** Resolve NC problem statement via i18n when payload embeds a key (PI-triggered). */
export function formatNcProblemStatement(
    nc: {
        problemStatement?: string
        performanceIndicatorId?: string | null
    },
    t: (key: string, ...args: unknown[]) => string
): string {
    const raw = nc.problemStatement || ''
    if (!raw) return ''

    const parsed = parseNcProblemStatementPayload(raw)
    if (parsed?.key) {
        const params = { ...(parsed.params || {}) }
        const trigger = params.triggerCondition
        if (typeof trigger === 'string' && trigger.length > 0) {
            const triggerKey = `pi.form.triggerConditionOption.${trigger}`
            const translatedTrigger = t(triggerKey)
            if (translatedTrigger !== triggerKey) {
                params.triggerCondition = translatedTrigger
            }
        }
        const translated = t(parsed.key, params)
        if (translated !== parsed.key) return translated
    }

    return raw
}

/** True when NC was raised from a performance indicator. */
export function isNcCreatedFromPi(nc: {
    performanceIndicatorId?: string | null
    problemStatement?: string
}): boolean {
    return (
        Boolean(nc.performanceIndicatorId) ||
        Boolean(parseNcProblemStatementPayload(nc.problemStatement))
    )
}

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur', 'yi', 'dv', 'ps', 'sd'])

/** True when the UI locale should use right-to-left layout (modals, forms, selects). */
export function isLocaleRtl(locale: string | undefined | null): boolean {
    if (!locale) return false
    const tag = locale.toLowerCase().split('-')[0]
    return RTL_LOCALES.has(tag)
}

/** Arabic, Hebrew, Syriac, Thaana, N'Ko, and related RTL scripts. */
const RTL_STRONG =
    /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

/** Latin, Greek, Cyrillic, and other common LTR letters. */
const LTR_STRONG =
    /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u1E00-\u1EFF]/

/** First-strong-character direction (Unicode bidi), ignoring neutral chars. */
export function getStrongDirection(text: string): 'rtl' | 'ltr' | null {
    for (const char of text) {
        if (/\s/.test(char)) continue
        if (RTL_STRONG.test(char)) return 'rtl'
        if (LTR_STRONG.test(char)) return 'ltr'
    }
    return null
}

/** Apply RTL/LTR to a Quill block (p, li, headings, blockquote) including list marker classes. */
export function syncBlockDirectionFromText(el: HTMLElement): void {
    const detected = getStrongDirection(el.textContent || '')
    const isListItem = el.tagName === 'LI' && el.hasAttribute('data-list')

    if (detected === 'rtl') {
        el.setAttribute('dir', 'rtl')
        el.classList.add('ql-direction-rtl')
        if (isListItem || el.tagName === 'P' || /^H[1-6]$/i.test(el.tagName) || el.tagName === 'BLOCKQUOTE') {
            el.classList.add('ql-align-right')
        }
    } else if (detected === 'ltr') {
        el.removeAttribute('dir')
        el.classList.remove('ql-direction-rtl')
        if (el.classList.contains('ql-align-right')) {
            el.classList.remove('ql-align-right')
        }
    }
}

/** @alias syncBlockDirectionFromText */
export function syncParagraphDirectionFromText(el: HTMLElement): void {
    syncBlockDirectionFromText(el)
}

/** Per-line RTL in header/footer contenteditable (same idea as Quill body paragraphs). */
export function syncHeaderFooterBlockDirections(container: HTMLElement): void {
    container.removeAttribute('dir')
    container.style.textAlign = ''

    const blockTags = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'])
    const children = Array.from(container.children).filter(
        (n): n is HTMLElement => n instanceof HTMLElement && blockTags.has(n.tagName),
    )

    const blocks: HTMLElement[] =
        children.length > 0
            ? children
            : container.textContent?.replace(/\u00a0/g, ' ').trim()
              ? [container]
              : []

    for (const block of blocks) {
        if (!block.textContent?.replace(/\u00a0/g, ' ').trim()) {
            block.removeAttribute('dir')
            block.style.textAlign = ''
            continue
        }
        syncBlockDirectionFromText(block)
        block.style.textAlign = block.getAttribute('dir') === 'rtl' ? 'right' : ''
    }
}

/** @deprecated Use syncHeaderFooterBlockDirections for multi-line fields. */
export function applyDirectionToEditable(el: HTMLElement): void {
    syncHeaderFooterBlockDirections(el)
}

/** Prefix for app-defined enum/code labels (status, type codes) — not user-entered DB text. */
export const KNOWN_DATA_VALUES_PREFIX = 'reports.data_values'

const KNOWN_DATA_LOOKUP_PREFIXES = [
    KNOWN_DATA_VALUES_PREFIX,
    'pi.status',
    'statuses',
    'objectives.status',
] as const

/** Normalize backend labels into stable i18n key segments (e.g. "OPEN" → "open"). */
export function normalizeKnownDataLookupKey(raw: string): string {
    return String(raw).trim().toLowerCase().replace(/\s+/g, '_')
}

/** If a translation exists for this known enum/code, return it; otherwise return the original value. */
export function translateKnownDataValue(
    raw: string | null | undefined,
    t: (key: string) => string,
    te: (key: string) => boolean
): string {
    if (raw == null || raw === '') return ''
    const s = String(raw)
    const norm = normalizeKnownDataLookupKey(s)
    const segments = [norm, s]
    for (const prefix of KNOWN_DATA_LOOKUP_PREFIXES) {
        for (const segment of segments) {
            const key = `${prefix}.${segment}`
            if (te(key)) return t(key)
        }
    }
    return s
}

/** Returns null when no translation key exists (for report fallbacks). */
export function tryTranslateKnownDataValue(
    raw: string | null | undefined,
    t: (key: string) => string,
    te: (key: string) => boolean
): string | null {
    if (raw == null || raw === '') return null
    const s = String(raw)
    const translated = translateKnownDataValue(s, t, te)
    return translated !== s ? translated : null
}

export function dashboardChartLabelsAreKnownEnums(configId: string): boolean {
    return configId.endsWith('_by_status')
}

export function translateDashboardChartLabel(
    raw: string | null | undefined,
    t: (key: string) => string,
    te: (key: string) => boolean
): string {
    return translateKnownDataValue(raw, t, te)
}

export function translateDashboardCategoryLabel(
    configId: string,
    raw: string | null | undefined,
    t: (key: string) => string,
    te: (key: string) => boolean
): string {
    if (!dashboardChartLabelsAreKnownEnums(configId)) {
        return raw == null || raw === '' ? '' : String(raw)
    }
    return translateKnownDataValue(raw, t, te)
}

export function translateDashboardSeriesLabel(
    configId: string,
    seriesKey: string,
    t: (key: string) => string,
    te: (key: string) => boolean
): string {
    const widgetSeriesKey = `dashboard_widgets.items.${configId}.series.${seriesKey}`
    if (te(widgetSeriesKey)) return t(widgetSeriesKey)
    return translateKnownDataValue(seriesKey, t, te)
}

export const REPORT_COLUMNS_ENUM_DATA_LOOKUP = new Set([
    'status',
    'current_status',
    'nc_status',
    'risk_status'
])

export function cellColumnAllowsEnumDataLookup(rawColumn: string): boolean {
    return REPORT_COLUMNS_ENUM_DATA_LOOKUP.has(rawColumn)
}

/** Permission subject from notification config API (`label` is the human permission label key). */
export function translateNotificationConfigSubject(
    notification: { subject: string; label?: string },
    t: (key: string) => string,
    te: (key: string) => boolean
): string {
    if (notification.label) {
        const key = `admin_permission_groups.permission_labels.${notification.label}`
        if (te(key)) return t(key)
    }
    return snakeToCamelCase(notification.subject)
}

/** Permission action code from notification config API. */
export function translateNotificationConfigAction(
    action: string,
    t: (key: string) => string,
    te: (key: string) => boolean
): string {
    if (!action) return action
    const key = `admin_permission_groups.permission_actions.${action}`
    if (te(key)) return t(key)
    return snakeToCamelCase(action)
}

export function getSuperdocUserFromAuth(userDetails?: {
    fname?: string
    lname?: string
    email?: string
    companyName?: string
}): { name: string; email: string } {
    const displayName = [userDetails?.fname, userDetails?.lname]
        .filter((part) => Boolean(part?.trim()))
        .join(' ')
        .trim()

    return {
        name: displayName || userDetails?.companyName || 'User',
        email: userDetails?.email || '',
    }
}
