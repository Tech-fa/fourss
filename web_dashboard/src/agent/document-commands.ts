const WRITE_OPERATIONS = new Set([
    'create.paragraph',
    'create.heading',
    'create.table',
    'lists.create',
    'lists.insert',
    'insert',
    'replace',
    'blocks.delete',
    'tables.setCellText'
])

const DEFAULT_LIMIT = 40
const MAX_LIMIT = 80

export type DocumentOperation = {
    operationId: string
    input: Record<string, unknown>
}

export type DocumentApi = {
    blocks?: {
        list?: (input?: { offset?: number; limit?: number; includeText?: boolean }) => unknown
    }
    plan?: {
        execute?: (input: { entries: DocumentOperation[] }) => unknown
    }
    invoke?: (request: DocumentOperation) => unknown
}

export function documentBlockQuery(args: Record<string, unknown>) {
    return {
        offset: wholeNumber(args.offset, 0, 'offset'),
        limit: Math.min(MAX_LIMIT, wholeNumber(args.limit, DEFAULT_LIMIT, 'limit') || DEFAULT_LIMIT),
        includeText: true
    }
}

export function documentOperations(value: unknown): DocumentOperation[] {
    if (!Array.isArray(value) || !value.length) {
        throw new Error('operations must list at least one SuperDoc operation.')
    }
    if (value.length > 40) throw new Error('Apply at most 40 operations at a time.')
    return value.map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new Error(`Operation ${index + 1} must be an object.`)
        }
        const record = item as Record<string, unknown>
        const operationId = typeof record.operationId === 'string' ? record.operationId.trim() : ''
        if (!WRITE_OPERATIONS.has(operationId)) {
            throw new Error(
                `Operation ${operationId || index + 1} is not available. Use create.paragraph, create.heading, create.table, lists.create, lists.insert, insert, replace, blocks.delete, or tables.setCellText.`
            )
        }
        const input = record.input == null ? {} : record.input
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw new Error(`Operation ${operationId} input must be an object.`)
        }
        return { operationId, input: input as Record<string, unknown> }
    })
}

export function presentDocumentBlocks(result: unknown) {
    if (!result || typeof result !== 'object') throw new Error('The document did not return its blocks.')
    const value = result as { total?: unknown; blocks?: unknown }
    const blocks = Array.isArray(value.blocks) ? value.blocks.map(presentBlock).filter(Boolean) : []
    return {
        total: typeof value.total === 'number' ? value.total : blocks.length,
        blocks
    }
}

export function readDocumentBlocks(api: DocumentApi | null, args: Record<string, unknown>) {
    if (typeof api?.blocks?.list !== 'function') throw new Error('The document editor is not ready.')
    return presentDocumentBlocks(api.blocks.list(documentBlockQuery(args)))
}

export function applyDocumentOperations(api: DocumentApi | null, operations: unknown) {
    const entries = documentOperations(operations)
    if (typeof api?.plan?.execute === 'function') {
        const result = api.plan.execute({ entries })
        const failure = operationFailure(result)
        if (failure) throw new Error(failure)
        return result
    }
    if (typeof api?.invoke !== 'function') throw new Error('The document editor is not ready.')
    const results = []
    for (const entry of entries) {
        const result = api.invoke(entry)
        const failure = operationFailure(result)
        if (failure) throw new Error(failure)
        results.push(result)
    }
    return { results }
}

function operationFailure(result: unknown) {
    if (!result || typeof result !== 'object') return ''
    const value = result as { failure?: { message?: unknown; operationId?: unknown }; success?: unknown }
    if (value.success === false) {
        const message = value.failure?.message
        return typeof message === 'string' && message.trim() ? message : 'The document operation failed.'
    }
    const planFailure = (result as { failure?: { message?: unknown; operationId?: unknown } }).failure
    if (!planFailure) return ''
    const message = planFailure.message
    if (typeof message === 'string' && message.trim()) return message
    const operationId = typeof planFailure.operationId === 'string' ? planFailure.operationId : 'operation'
    return `${operationId} failed.`
}

function presentBlock(block: unknown) {
    if (!block || typeof block !== 'object') return null
    const value = block as Record<string, unknown>
    const numbering = value.numbering
    const marker =
        numbering && typeof numbering === 'object'
            ? (numbering as { marker?: unknown }).marker
            : undefined
    const text = typeof value.text === 'string' ? value.text : value.textPreview
    return {
        ordinal: value.ordinal,
        nodeId: value.nodeId,
        nodeType: value.nodeType,
        ...(typeof value.headingLevel === 'number' ? { headingLevel: value.headingLevel } : {}),
        text: typeof text === 'string' ? text : '',
        ...(typeof marker === 'string' && marker ? { marker } : {})
    }
}

function wholeNumber(value: unknown, fallback: number, name: string) {
    if (value == null || value === '') return fallback
    const number = typeof value === 'number' ? value : Number(value)
    if (!Number.isInteger(number) || number < 0) throw new Error(`${name} must be a whole number.`)
    return number
}
