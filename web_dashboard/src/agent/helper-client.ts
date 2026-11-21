import { installHelperPageControl, removeHelperPageControl } from './page-control'
import { SUBMIT_FORM_REFUSAL } from './confirmation'
import { getRuntimeConfig } from '@/util/runtime-config'

const STORAGE_KEY = 'fourss.agentHelper'
const MCP_TOKEN_KEY = 'fourss.agentHelper.mcp'
const HELPER_UNAVAILABLE = 'Could not reach the agent helper. Turn it on to try again.'

export type AgentHelperStatus = 'off' | 'connecting' | 'connected' | 'unavailable'

export type AgentHelperState = {
    enabled: boolean
    status: AgentHelperStatus
    mcpUrl: string
    message: string
}

type AgentRouter = {
    push: (path: string) => Promise<unknown>
}

type AgentCall = {
    id?: string
    name?: string
    args?: Record<string, unknown>
}

const listeners = new Set<(state: AgentHelperState) => void>()
let state: AgentHelperState = { enabled: false, status: 'off', mcpUrl: '', message: '' }
let activeRouter: AgentRouter | null = null
let generation = 0
let abortController: AbortController | null = null
let sessionToken = ''
let currentPageId = ''
let hideBound = false
let retryTimer = 0
let failedToken = ''

export function agentHelperState() {
    return state
}

export function subscribeAgentHelper(listener: (next: AgentHelperState) => void) {
    listeners.add(listener)
    listener(state)
    return () => listeners.delete(listener)
}

export function agentHelperEnabled() {
    return sessionStorage.getItem(STORAGE_KEY) === 'on'
}

export function bootAgentHelper(router: AgentRouter) {
    activeRouter = router
    if (!hideBound) {
        hideBound = true
        window.addEventListener('pagehide', () => {
            stopBecausePageIsLeaving()
        })
        window.addEventListener('pageshow', (event) => {
            if (!(event instanceof PageTransitionEvent) || !event.persisted) return
            if (hostedByBuho() || agentHelperEnabled()) void start()
        })
    }
    if (hostedByBuho() || agentHelperEnabled()) void start()
}

export function setAgentHelperEnabled(enabled: boolean): Promise<void> {
    if (!enabled) {
        if (hostedByBuho()) return Promise.resolve()
        disconnect()
        return Promise.resolve()
    }
    sessionStorage.setItem(STORAGE_KEY, 'on')
    return start()
}

export function endAgentHelperSession() {
    const headers = authHeader()
    localStorage.removeItem(MCP_TOKEN_KEY)
    if (headers.authorization && apiBase()) {
        void fetch(helperPath('session/end'), {
            method: 'POST',
            keepalive: true,
            headers: { ...headers, 'content-type': 'application/json' },
            body: '{}'
        }).catch(() => undefined)
    }
    disconnect()
}

export function agentHelperAuthChanged() {
    if (!hostedByBuho()) return
    const token = authToken()
    if (!token) {
        failedToken = ''
        clearRetry()
        if (state.status === 'connected' || state.status === 'connecting') disconnect()
        return
    }
    if (state.status === 'connected' || state.status === 'connecting') return
    if (token === failedToken) return
    void start()
}

export async function executeAgentCall(call: AgentCall, router: AgentRouter | null) {
    const name = typeof call.name === 'string' ? call.name : ''
    const args = call.args && typeof call.args === 'object' ? call.args : {}
    if (name === 'submit_form') return { ok: false as const, error: SUBMIT_FORM_REFUSAL }
    const control = window.__appControl
    if (!control) return { ok: false as const, error: 'The dashboard is not ready.' }
    try {
        let result = await control.call(name, args)
        if (name === 'navigate' && isRecord(result) && typeof result.navigateTo === 'string') {
            if (!router) return { ok: false as const, error: 'The dashboard is not ready.' }
            const url = new URL(result.navigateTo, window.location.href)
            if (url.origin !== window.location.origin) {
                return { ok: false as const, error: 'That path is outside this app.' }
            }
            await router.push(url.pathname + url.search + url.hash)
            const rest = { ...result }
            delete rest.navigateTo
            result = rest
        }
        return { ok: true as const, result }
    } catch (error) {
        return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
    }
}

declare global {
    interface Window {
        __buhoHost?: boolean
        __buhoOffer?: { mcp?: { name?: string; url?: string } }
    }
}

export function hostedByBuho() {
    return window.__buhoHost === true
}

function setBuhoOffer(mcpUrl: string) {
    if (mcpUrl) {
        window.__buhoOffer = { mcp: { name: 'fourss', url: mcpUrl } }
        return
    }
    delete window.__buhoOffer
}

function publish(next: AgentHelperState) {
    state = next
    if (next.status === 'connected' && next.mcpUrl) setBuhoOffer(next.mcpUrl)
    else if (next.status !== 'connecting') setBuhoOffer('')
    for (const listener of listeners) listener(state)
}

function stopLoop() {
    abortController?.abort()
    abortController = null
}

function clearRetry() {
    window.clearTimeout(retryTimer)
    retryTimer = 0
}

function scheduleHostRetry() {
    if (!hostedByBuho() || !authToken()) return
    clearRetry()
    retryTimer = window.setTimeout(() => {
        retryTimer = 0
        if (!hostedByBuho() || state.status === 'connected' || state.status === 'connecting') return
        void start()
    }, 2000)
}

function disconnect() {
    clearRetry()
    const token = sessionToken
    const pageId = currentPageId
    sessionToken = ''
    currentPageId = ''
    stopLoop()
    generation += 1
    removeHelperPageControl()
    sessionStorage.removeItem(STORAGE_KEY)
    if (token && pageId) void release(token, pageId)
    publish({ enabled: false, status: 'off', mcpUrl: '', message: '' })
}

function stopBecausePageIsLeaving() {
    clearRetry()
    const token = sessionToken
    const pageId = currentPageId
    sessionToken = ''
    currentPageId = ''
    stopLoop()
    generation += 1
    removeHelperPageControl()
    if (token && pageId) void release(token, pageId)
    publish({ enabled: agentHelperEnabled(), status: 'off', mcpUrl: '', message: '' })
}

async function start() {
    clearRetry()
    stopLoop()
    const current = ++generation
    const controller = new AbortController()
    abortController = controller
    publish({ enabled: true, status: 'connecting', mcpUrl: '', message: '' })
    let session: Response
    try {
        if (!apiBase()) {
            fail(HELPER_UNAVAILABLE, true)
            return
        }
        const remembered = rememberedToken()
        session = await fetch(helperPath('session'), {
            method: 'POST',
            cache: 'no-store',
            headers: { ...authHeader(), 'content-type': 'application/json' },
            body: remembered ? JSON.stringify({ token: remembered }) : '{}',
            signal: controller.signal
        })
    } catch (error) {
        if (current !== generation || isAbort(error)) return
        fail(HELPER_UNAVAILABLE, true)
        return
    }
    if (current !== generation || controller.signal.aborted) return
    if (session.status === 401) {
        fail(signInMessage())
        return
    }
    if (!session.ok) {
        fail(HELPER_UNAVAILABLE, true)
        return
    }
    const payload = await readJson(session)
    const token = typeof payload.token === 'string' ? payload.token : ''
    if (!token) {
        fail(HELPER_UNAVAILABLE, true)
        return
    }
    failedToken = ''
    sessionToken = token
    rememberToken(token)
    installHelperPageControl()
    window.__bindAgentPageLinks?.()
    publish({ enabled: true, status: 'connected', mcpUrl: helperPath('mcp', token), message: '' })
    void pump(current, controller.signal, token)
}

async function pump(current: number, signal: AbortSignal, token: string) {
    let pageId = ''
    while (current === generation && !signal.aborted) {
        let response: Response
        try {
            response = await fetch(helperPath('wait', token), {
                method: 'POST',
                headers: { ...authHeader(), 'content-type': 'application/json' },
                body: JSON.stringify({ pageId }),
                cache: 'no-store',
                signal
            })
        } catch (error) {
            if (current !== generation || isAbort(error)) return
            fail(HELPER_UNAVAILABLE, true)
            return
        }
        if (current !== generation || signal.aborted) return
        if (response.status === 409) {
            const payload = await readJson(response)
            fail(
                typeof payload.error === 'string'
                    ? payload.error
                    : 'The agent helper is already on in another tab.'
            )
            return
        }
        if (response.status === 401) {
            fail(signInMessage())
            return
        }
        if (!response.ok) {
            fail(HELPER_UNAVAILABLE, true)
            return
        }
        const payload = await readJson(response)
        if (typeof payload.pageId === 'string') {
            pageId = payload.pageId
            currentPageId = pageId
        }
        if (!isRecord(payload.call) || typeof payload.call.id !== 'string') continue
        const answer = await executeAgentCall(
            {
                id: payload.call.id,
                name: typeof payload.call.name === 'string' ? payload.call.name : '',
                args: isRecord(payload.call.args) ? payload.call.args : {}
            },
            activeRouter
        )
        if (current !== generation || signal.aborted) return
        let posted: Response
        try {
            posted = await fetch(helperPath('result', token), {
                method: 'POST',
                headers: { ...authHeader(), 'content-type': 'application/json' },
                body: JSON.stringify({ pageId, id: payload.call.id, ...answer }),
                cache: 'no-store',
                signal
            })
        } catch (error) {
            if (current !== generation || isAbort(error)) return
            fail(HELPER_UNAVAILABLE, true)
            return
        }
        if (posted.status === 401 && current === generation && !signal.aborted) {
            fail(signInMessage())
            return
        }
        if (!posted.ok && current === generation && !signal.aborted) {
            fail(HELPER_UNAVAILABLE, true)
            return
        }
    }
}

function signInMessage() {
    return hostedByBuho() ? 'Sign in to connect the agent helper.' : 'Sign in, then turn the agent helper on.'
}

function fail(message: string, retry = false) {
    const token = sessionToken
    const pageId = currentPageId
    sessionToken = ''
    currentPageId = ''
    sessionStorage.removeItem(STORAGE_KEY)
    if (token && pageId) void release(token, pageId)
    failedToken = authToken()
    publish({ enabled: false, status: 'unavailable', mcpUrl: '', message })
    if (retry) scheduleHostRetry()
}

function helperPath(name: string, token = '') {
    const path = `${apiBase()}/__agent-helper/${name}`
    if (!token) return path
    return `${path}?token=${encodeURIComponent(token)}`
}

function apiBase() {
    return (getRuntimeConfig().apiUrl || '').trim().replace(/\/+$/, '')
}

function authRecord() {
    try {
        const parsed = JSON.parse(localStorage.getItem('auth') || '')
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
    } catch {
        return null
    }
}

function authUserId() {
    const details = authRecord()?.userDetails
    if (!details || typeof details !== 'object') return ''
    const id = (details as { id?: unknown }).id
    return typeof id === 'string' ? id : ''
}

function rememberedToken() {
    const userId = authUserId()
    if (!userId) return ''
    try {
        const parsed = JSON.parse(localStorage.getItem(MCP_TOKEN_KEY) || '')
        if (
            parsed &&
            typeof parsed === 'object' &&
            parsed.userId === userId &&
            typeof parsed.token === 'string' &&
            parsed.token.trim()
        ) {
            return parsed.token.trim()
        }
    } catch {
        return ''
    }
    return ''
}

function rememberToken(token: string) {
    const userId = authUserId()
    if (!userId || !token) return
    localStorage.setItem(MCP_TOKEN_KEY, JSON.stringify({ userId, token }))
}

function authToken() {
    const token = authRecord()?.token
    return typeof token === 'string' ? token.trim() : ''
}

function authHeader(): Record<string, string> {
    const token = authToken()
    return token ? { authorization: token } : {}
}

function release(token: string, pageId: string) {
    return fetch(helperPath('release', token), {
        method: 'POST',
        keepalive: true,
        headers: { ...authHeader(), 'content-type': 'application/json' },
        body: JSON.stringify({ pageId })
    }).catch(() => undefined)
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
    try {
        const payload = await response.json()
        return isRecord(payload) ? payload : {}
    } catch {
        return {}
    }
}

function isAbort(error: unknown) {
    return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
