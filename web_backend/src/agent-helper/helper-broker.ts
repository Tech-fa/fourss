import {
    API_ACCESS_DESCRIPTION,
    HELPER_OFF_MESSAGE,
    SUBMIT_FORM_REFUSAL,
    helperInstructions
} from './instructions'

export const HELPER_PREFIX = '/__agent-helper'

const KNOWN_TOOLS = new Set([
    'list_pages',
    'navigate',
    'describe_page',
    'api_access',
    'set_fields',
    'select_option',
    'submit_form'
])

export type HelperHttpRequest = {
    method: string
    path: string
    query: URLSearchParams
    host: string
    origin?: string
    site?: string
    body: unknown
    parseError?: boolean
    signal: AbortSignal
}

export type HelperHttpResponse = {
    status: number
    body: unknown | null
}

type AgentCall = {
    id: string
    name: string
    args: Record<string, unknown>
}

type PendingCall = {
    id: string
    done: (payload: unknown) => void
}

export function isLocalHostHeader(host: string): boolean {
    const trimmed = host.trim().toLowerCase()
    if (!trimmed) return false
    let name = trimmed
    if (name.startsWith('[')) {
        const end = name.indexOf(']')
        if (end === -1) return false
        name = name.slice(1, end)
    } else {
        name = name.split(':')[0]
    }
    return name === 'localhost' || name === '127.0.0.1' || name === '::1'
}

export function isDashboardRequest(input: { host: string; origin?: string; site?: string }): boolean {
    if (!isLocalHostHeader(input.host)) return false
    if (input.site === 'cross-site' || input.site === 'same-site') return false
    if (input.site === 'same-origin') return true
    if (!input.origin) return false
    try {
        return new URL(input.origin).host.toLowerCase() === input.host.trim().toLowerCase()
    } catch {
        return false
    }
}

export function isLocalAgentClient(input: { host: string; site?: string }): boolean {
    if (!isLocalHostHeader(input.host)) return false
    return input.site !== 'cross-site' && input.site !== 'same-site'
}

export class AgentHelperBroker {
    private owner: string | null = null
    private lastSeen = 0
    private queued: AgentCall | null = null
    private waiter: ((call: AgentCall | null) => void) | null = null
    private pending: PendingCall | null = null
    private callSerial = 0

    constructor(
        private readonly token: string,
        private readonly timing: {
            waitMs?: number
            callMs?: number
            staleMs?: number
            access?: 'local' | 'account'
        } = {}
    ) {}

    async handle(request: HelperHttpRequest): Promise<HelperHttpResponse> {
        const path = normalizePath(request.path)
        if (!path.startsWith(HELPER_PREFIX)) return { status: 404, body: null }
        if (request.method === 'OPTIONS') return { status: 204, body: null }
        if (!this.accountAccess && !isLocalHostHeader(request.host)) {
            return { status: 403, body: { error: 'The agent helper only listens on localhost.' } }
        }

        if (path === `${HELPER_PREFIX}/session` && request.method === 'GET') {
            if (!isDashboardRequest(request)) {
                return { status: 403, body: { error: 'Open this from the dashboard tab.' } }
            }
            return {
                status: 200,
                body: {
                    token: this.token,
                    mcpUrl: mcpUrl(request.host, this.token)
                }
            }
        }

        if (!tokensMatch(request.query.get('token') || '', this.token)) {
            return { status: 401, body: { error: 'Unauthorized.' } }
        }

        if (path === `${HELPER_PREFIX}/mcp` && (request.method === 'GET' || request.method === 'HEAD')) {
            if (!this.accountAccess && !isLocalAgentClient(request)) {
                return { status: 403, body: { error: 'The agent helper only listens on localhost.' } }
            }
            // Streamable HTTP opens a GET event stream after initialize.
            // 405 means this server does not offer that stream. Any other status fails the client connection.
            return { status: 405, body: null }
        }

        if (path === `${HELPER_PREFIX}/mcp` && request.method === 'POST') {
            if (!this.accountAccess && !isLocalAgentClient(request)) {
                return { status: 403, body: { error: 'The agent helper only listens on localhost.' } }
            }
            return this.mcp(request)
        }

        if (!this.accountAccess && !isDashboardRequest(request)) {
            return { status: 403, body: { error: 'Open this from the dashboard tab.' } }
        }
        if (request.parseError) return { status: 400, body: { error: 'The request could not be read.' } }

        if (path === `${HELPER_PREFIX}/wait` && request.method === 'POST') return this.wait(request)
        if (path === `${HELPER_PREFIX}/result` && request.method === 'POST') return this.finish(request)
        if (path === `${HELPER_PREFIX}/release` && request.method === 'POST') return this.releaseRequest(request)
        return { status: 404, body: null }
    }

    private mcp(request: HelperHttpRequest): Promise<HelperHttpResponse> | HelperHttpResponse {
        if (request.parseError) {
            return { status: 400, body: rpcError(null, -32700, 'Parse error') }
        }
        if (Array.isArray(request.body)) return this.mcpBatch(request.body)
        return this.mcpOne(request.body)
    }

    private async mcpBatch(items: unknown[]): Promise<HelperHttpResponse> {
        const replies: unknown[] = []
        for (const item of items) {
            const reply = await this.mcpOne(item)
            if (reply.status === 202) continue
            replies.push(reply.body)
        }
        if (!replies.length) return { status: 202, body: null }
        return { status: 200, body: replies }
    }

    private async mcpOne(body: unknown): Promise<HelperHttpResponse> {
        if (!isRecord(body)) return { status: 200, body: rpcError(null, -32600, 'Invalid request') }
        const id = 'id' in body ? body.id : null
        const method = typeof body.method === 'string' ? body.method : ''
        if (method.startsWith('notifications/')) return { status: 202, body: null }
        if (method === 'initialize') {
            return { status: 200, body: rpcResult(id, initializeResult(body)) }
        }
        if (method === 'ping') return { status: 200, body: rpcResult(id, {}) }
        if (method === 'tools/list') return { status: 200, body: rpcResult(id, { tools: toolDefinitions() }) }
        if (method === 'tools/call') return this.toolsCall(body)
        if (!method) return { status: 200, body: rpcError(id, -32600, 'Invalid request') }
        return { status: 200, body: rpcError(id, -32601, 'Method not found') }
    }

    private async toolsCall(body: Record<string, unknown>): Promise<HelperHttpResponse> {
        const rpcId = body.id ?? null
        const params = isRecord(body.params) ? body.params : {}
        const name = typeof params.name === 'string' ? params.name : ''
        const args = isRecord(params.arguments) ? params.arguments : {}
        if (!KNOWN_TOOLS.has(name)) {
            return { status: 200, body: rpcError(rpcId, -32602, `Unknown tool ${name}.`) }
        }
        const invalid = invalidArguments(name, args)
        if (invalid) return { status: 200, body: rpcResult(rpcId, toolError(invalid)) }
        if (name === 'submit_form') return { status: 200, body: rpcResult(rpcId, toolError(SUBMIT_FORM_REFUSAL)) }
        this.releaseIfStale()
        if (!this.owner) return { status: 200, body: rpcResult(rpcId, toolError(HELPER_OFF_MESSAGE)) }
        if (this.pending) {
            return {
                status: 200,
                body: rpcResult(rpcId, toolError('The dashboard is still working on the previous action.'))
            }
        }

        const id = `c${++this.callSerial}`
        const call: AgentCall = { id, name, args }
        const payload = await new Promise<unknown>((resolve) => {
            const timer = setTimeout(() => {
                if (this.pending?.id !== id) return
                this.pending = null
                resolve(toolError('The dashboard did not answer. Leave the tab open and try again.'))
            }, this.callMs)
            this.pending = {
                id,
                done: (value) => {
                    clearTimeout(timer)
                    resolve(value)
                }
            }
            this.deliver(call)
        })
        return { status: 200, body: rpcResult(rpcId, payload) }
    }

    private async wait(request: HelperHttpRequest): Promise<HelperHttpResponse> {
        const requested = isRecord(request.body) && typeof request.body.pageId === 'string' ? request.body.pageId : ''
        const claimed = this.claim(requested)
        if (typeof claimed !== 'string') return { status: 409, body: { error: claimed.error } }
        if (request.signal.aborted) {
            this.release(claimed)
            return { status: 499, body: null }
        }
        const onAbort = () => this.release(claimed)
        request.signal.addEventListener('abort', onAbort, { once: true })
        try {
            const call = await this.waitForCall(request.signal)
            if (request.signal.aborted || this.owner !== claimed) return { status: 499, body: null }
            this.lastSeen = Date.now()
            if (!call) return { status: 200, body: { idle: true, pageId: claimed } }
            return { status: 200, body: { pageId: claimed, call } }
        } finally {
            request.signal.removeEventListener('abort', onAbort)
        }
    }

    private finish(request: HelperHttpRequest): HelperHttpResponse {
        const body = isRecord(request.body) ? request.body : {}
        const pageId = typeof body.pageId === 'string' ? body.pageId : ''
        const id = typeof body.id === 'string' ? body.id : ''
        if (!this.owner || pageId !== this.owner) {
            return { status: 409, body: { error: 'This tab does not have the agent helper.' } }
        }
        if (!this.pending || this.pending.id !== id) {
            return { status: 404, body: { error: 'That action is no longer waiting.' } }
        }
        const pending = this.pending
        this.pending = null
        this.lastSeen = Date.now()
        pending.done(body.ok === true ? toolResult(body.result ?? null) : toolError(errorText(body.error)))
        return { status: 200, body: { ok: true } }
    }

    private releaseRequest(request: HelperHttpRequest): HelperHttpResponse {
        const pageId = isRecord(request.body) && typeof request.body.pageId === 'string' ? request.body.pageId : ''
        if (pageId) this.release(pageId)
        return { status: 204, body: null }
    }

    private claim(requested: string): string | { error: string } {
        this.releaseIfStale()
        if (this.owner && requested === this.owner) {
            this.lastSeen = Date.now()
            return this.owner
        }
        if (this.owner) return { error: 'The agent helper is already on in another tab.' }
        const pageId = requested || createPageId()
        this.owner = pageId
        this.lastSeen = Date.now()
        return pageId
    }

    close() {
        if (this.owner) {
            this.release(this.owner)
            return
        }
        this.queued = null
        if (this.pending) {
            const pending = this.pending
            this.pending = null
            pending.done(toolError('The dashboard tab closed. Turn the agent helper back on.'))
        }
        if (this.waiter) {
            const waiter = this.waiter
            this.waiter = null
            waiter(null)
        }
    }

    private get accountAccess() {
        return this.timing.access === 'account'
    }

    private release(pageId: string) {
        if (this.owner !== pageId) return
        this.owner = null
        this.queued = null
        if (this.pending) {
            const pending = this.pending
            this.pending = null
            pending.done(toolError('The dashboard tab closed. Turn the agent helper back on.'))
        }
        if (this.waiter) {
            const waiter = this.waiter
            this.waiter = null
            waiter(null)
        }
    }

    private releaseIfStale() {
        if (!this.owner || this.waiter) return
        if (Date.now() - this.lastSeen <= this.staleMs) return
        this.release(this.owner)
    }

    private waitForCall(signal: AbortSignal): Promise<AgentCall | null> {
        if (signal.aborted) return Promise.resolve(null)
        if (this.queued) {
            const call = this.queued
            this.queued = null
            return Promise.resolve(call)
        }
        return new Promise((resolve) => {
            let settled = false
            const finish = (call: AgentCall | null) => {
                if (settled) return
                settled = true
                clearTimeout(timer)
                signal.removeEventListener('abort', onAbort)
                if (this.waiter === finish) this.waiter = null
                resolve(call)
            }
            const onAbort = () => finish(null)
            const timer = setTimeout(() => finish(null), this.waitMs)
            signal.addEventListener('abort', onAbort)
            this.waiter = finish
        })
    }

    private deliver(call: AgentCall) {
        if (this.waiter) {
            const waiter = this.waiter
            this.waiter = null
            waiter(call)
        } else {
            this.queued = call
        }
    }

    private get waitMs() {
        return this.timing.waitMs ?? 25_000
    }

    private get callMs() {
        return this.timing.callMs ?? 20_000
    }

    private get staleMs() {
        return this.timing.staleMs ?? 40_000
    }
}

function normalizePath(path: string) {
    if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
    return path
}

export function mcpUrl(host: string, token: string) {
    return `http://${host}${HELPER_PREFIX}/mcp?token=${encodeURIComponent(token)}`
}

function tokensMatch(left: string, right: string) {
    if (!left || left.length !== right.length) return false
    let mismatch = 0
    for (let index = 0; index < left.length; index += 1) {
        mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
    }
    return mismatch === 0
}

function createPageId() {
    const bytes = new Uint8Array(16)
    globalThis.crypto.getRandomValues(bytes)
    return `p${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function initializeResult(body: unknown) {
    return {
        protocolVersion: requestedProtocol(body),
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'app-helper', version: '0.1.0' },
        instructions: helperInstructions()
    }
}

function requestedProtocol(body: unknown) {
    const params = isRecord(body) && isRecord(body.params) ? body.params : {}
    const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : ''
    if (requested.startsWith('2024-') || requested.startsWith('2025-')) return requested
    return '2024-11-05'
}

function toolDefinitions() {
    return [
        tool('list_pages', 'List the pages this app can open. Use a path from this list with navigate.', {
            type: 'object',
            properties: {},
            additionalProperties: false
        }),
        tool(
            'navigate',
            'Open a page in the dashboard tab. path is an app path such as /profile, or a URL on the same site.',
            {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'App path or same-site URL.' }
                },
                required: ['path'],
                additionalProperties: false
            }
        ),
        tool('describe_page', 'Read the page that is open: its path, forms, fields, dropdowns, and submit buttons.', {
            type: 'object',
            properties: {},
            additionalProperties: false
        }),
        tool('api_access', API_ACCESS_DESCRIPTION, {
            type: 'object',
            properties: {},
            additionalProperties: false
        }),
        tool(
            'set_fields',
            'Set values on the form that is open. fields maps a field name, id, or label to the new value. Pass form when the page has more than one form. Document body and editor content are written into the open document editor.',
            {
                type: 'object',
                properties: {
                    form: {
                        type: 'string',
                        description: 'Form id, name, or index. Omit when the page has one form.'
                    },
                    fields: {
                        type: 'object',
                        description: 'Field name, id, or label to the value to set.',
                        additionalProperties: true
                    }
                },
                required: ['fields'],
                additionalProperties: false
            }
        ),
        tool(
            'select_option',
            'Choose an option in a dropdown on the open page. field is the label or placeholder, such as Category. option is the visible option text. This opens the dropdown and selects that option. It does not submit the form.',
            {
                type: 'object',
                properties: {
                    field: { type: 'string', description: 'Dropdown label or placeholder.' },
                    option: { type: 'string', description: 'Visible option text to select.' }
                },
                required: ['field', 'option'],
                additionalProperties: false
            }
        ),
        tool('submit_form', SUBMIT_FORM_REFUSAL, {
            type: 'object',
            properties: {
                form: {
                    type: 'string',
                    description: 'Form id, name, or index. Omit when the page has one form.'
                },
                button: { type: 'string', description: 'Button label. The user clicks this.' }
            },
            additionalProperties: false
        })
    ]
}

function tool(name: string, description: string, inputSchema: unknown) {
    return { name, description, inputSchema }
}

function invalidArguments(name: string, args: Record<string, unknown>) {
    if (name === 'navigate') {
        const path = typeof args.path === 'string' ? args.path.trim() : ''
        if (!path) return 'path is required.'
    }
    if (name === 'set_fields') {
        if (!isRecord(args.fields) || !Object.keys(args.fields).length) {
            return 'fields must be an object of field names to values.'
        }
    }
    if (name === 'select_option') {
        const field = typeof args.field === 'string' ? args.field.trim() : ''
        const option = typeof args.option === 'string' ? args.option.trim() : ''
        if (!field) return 'field is required.'
        if (!option) return 'option is required.'
    }
    return ''
}

function toolResult(value: unknown) {
    return {
        content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
        structuredContent: value,
        isError: false
    }
}

function toolError(message: string) {
    return {
        content: [{ type: 'text', text: message }],
        isError: true
    }
}

function errorText(value: unknown) {
    return typeof value === 'string' && value.trim() ? value : 'The app tool failed.'
}

function rpcResult(id: unknown, result: unknown) {
    return { jsonrpc: '2.0', id: id ?? null, result }
}

function rpcError(id: unknown, code: number, message: string) {
    return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
