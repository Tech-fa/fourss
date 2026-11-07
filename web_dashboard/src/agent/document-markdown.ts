export type AgentDocumentRead = {
    markdown: string
    complete: boolean
}

const FULL_DOCUMENT_REPLACE =
    'A full document replace needs describe_page to return the complete markdown first.'

type Heading = {
    level: number
    title: string
    index: number
}

type SectionReplacement =
    | { status: 'replaced'; markdown: string; entireDocument: boolean }
    | { status: 'missing' }
    | { status: 'ambiguous' }
    | { status: 'not-section' }

export function documentEditContentPath(documentId: string, versionId: string | number) {
    return `/plan/documents/${documentId}/edit-version?redirect=/plan/documents/${documentId}&fillPendingVersion=${versionId}`
}

export function markdownCoversText(markdown: string, plainText: string) {
    const words = plainText
        .split(/\s+/)
        .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLowerCase())
        .filter((word) => word.length > 2)
    if (!words.length) return true
    const haystack = markdown.toLowerCase()
    const step = Math.max(1, Math.ceil(words.length / 40))
    const sample = words.filter((_, index) => index % step === 0).slice(0, 40)
    const found = sample.filter((word) => haystack.includes(word)).length
    return found >= Math.ceil(sample.length * 0.8)
}

export function planDocumentBodyWrite(input: {
    current: string | null
    incoming: string
    readComplete: boolean
}) {
    const incoming = normalize(input.incoming).trim()
    if (!incoming) throw new Error('The document body is empty.')
    const section = singleSection(incoming)
    if (section) {
        if (input.current == null) {
            throw new Error('Read the document with describe_page before replacing a section.')
        }
        const replaced = replaceSection(input.current, incoming)
        if (replaced.status === 'missing') throw new Error(`No section matches "${section.title}".`)
        if (replaced.status === 'ambiguous') {
            throw new Error(`More than one section matches "${section.title}".`)
        }
        if (replaced.status === 'replaced') {
            if (replaced.entireDocument && !input.readComplete) throw new Error(FULL_DOCUMENT_REPLACE)
            return { markdown: replaced.markdown }
        }
    }
    if (!input.readComplete) throw new Error(FULL_DOCUMENT_REPLACE)
    return { markdown: incoming }
}

function replaceSection(current: string, incoming: string): SectionReplacement {
    const section = singleSection(incoming)
    if (!section) return { status: 'not-section' }
    const document = normalize(current)
    const matches = headings(document).filter(
        (heading) => heading.level === section.level && sameTitle(heading.title, section.title)
    )
    if (!matches.length) return { status: 'missing' }
    if (matches.length > 1) return { status: 'ambiguous' }
    const all = headings(document)
    const start = matches[0].index
    let end = document.length
    for (const heading of all) {
        if (heading.index <= start) continue
        if (heading.level <= section.level) {
            end = heading.index
            break
        }
    }
    const prefix = document.slice(0, start)
    const suffix = document.slice(end)
    const entireDocument = !prefix.trim() && !suffix.trim()
    return {
        status: 'replaced',
        markdown: joinParts(prefix, incoming.trim(), suffix),
        entireDocument
    }
}

function singleSection(markdown: string) {
    const found = headings(markdown.trim())
    if (!found.length || found[0].index !== 0) return null
    const top = Math.min(...found.map((heading) => heading.level))
    const tops = found.filter((heading) => heading.level === top)
    if (tops.length !== 1) return null
    return { level: tops[0].level, title: tops[0].title }
}

function headings(markdown: string): Heading[] {
    const found: Heading[] = []
    let offset = 0
    let fence = false
    for (const line of markdown.split('\n')) {
        if (/^```/.test(line.trim())) {
            fence = !fence
        } else if (!fence) {
            const match = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line)
            if (match) found.push({ level: match[1].length, title: match[2].trim(), index: offset })
        }
        offset += line.length + 1
    }
    return found
}

function joinParts(prefix: string, middle: string, suffix: string) {
    let next = prefix
    if (next && !next.endsWith('\n')) next += '\n'
    next += middle.trim()
    if (!suffix) return next.endsWith('\n') ? next : `${next}\n`
    if (!next.endsWith('\n\n')) next = next.replace(/\n*$/, '\n\n')
    return `${next}${suffix.replace(/^\n+/, '')}`
}

function sameTitle(left: string, right: string) {
    return left.replace(/\s+/g, ' ').trim().toLowerCase() === right.replace(/\s+/g, ' ').trim().toLowerCase()
}

function normalize(value: string) {
    return value.replace(/\r\n/g, '\n')
}
