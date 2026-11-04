import { afterEach, describe, expect, it, vi } from 'vitest'
import { SUBMIT_FORM_REFUSAL } from './confirmation'
import {
    agentHelperState,
    bootAgentHelper,
    executeAgentCall,
    setAgentHelperEnabled
} from './helper-client'

vi.mock('@/util/runtime-config', () => ({
    getRuntimeConfig: () => ({ apiUrl: 'https://api.example.com', docUrl: '' })
}))

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' }
    })
}

function abortError() {
    return Object.assign(new Error('aborted'), { name: 'AbortError' })
}

function hang(signal?: AbortSignal) {
    return new Promise<Response>((_resolve, reject) => {
        const abort = () => reject(abortError())
        if (signal?.aborted) {
            abort()
            return
        }
        signal?.addEventListener('abort', abort)
    })
}

describe('agent helper client', () => {
    afterEach(async () => {
        await setAgentHelperEnabled(false)
        sessionStorage.clear()
        localStorage.removeItem('auth')
        vi.unstubAllGlobals()
        delete window.__appControl
        delete window.__appControlHooks
        delete window.__bindAgentPageLinks
        document.body.innerHTML = ''
    })

    it('restores a turned-on helper after reload', async () => {
        sessionStorage.setItem('fourss.agentHelper', 'on')
        localStorage.setItem('auth', JSON.stringify({ token: 'Bearer browser-token' }))
        const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input)
            if (url.includes('/session')) {
                return Promise.resolve(jsonResponse({ token: 'secret' }))
            }
            if (url.includes('/wait')) return hang(init?.signal ?? undefined)
            return Promise.resolve(jsonResponse({ ok: true }))
        })
        vi.stubGlobal('fetch', fetchMock)

        bootAgentHelper({ push: async () => undefined })

        await vi.waitFor(() => expect(agentHelperState().status).toBe('connected'))
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.example.com/__agent-helper/session',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ authorization: 'Bearer browser-token' })
            })
        )
        expect(agentHelperState().mcpUrl).toBe('https://api.example.com/__agent-helper/mcp?token=secret')
        expect(agentHelperState().enabled).toBe(true)
    })

    it('fills the open page and refuses to confirm it', async () => {
        document.body.innerHTML = '<button type="button">Save</button>'
        let clicked = false
        document.querySelector('button')?.addEventListener('click', () => {
            clicked = true
        })
        const calls: string[] = []
        window.__appControl = {
            call: (name) => {
                calls.push(name)
                return { set: [name] }
            }
        }
        const results: Array<{ ok?: boolean; error?: string }> = []
        let waits = 0
        vi.stubGlobal(
            'fetch',
            vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
                const url = String(input)
                if (url.includes('/session')) {
                    return Promise.resolve(
                        jsonResponse({
                            token: 'secret',
                            mcpUrl: 'http://127.0.0.1:3003/__agent-helper/mcp?token=secret'
                        })
                    )
                }
                if (url.includes('/result')) {
                    results.push(JSON.parse(String(init?.body)))
                    return Promise.resolve(jsonResponse({ ok: true }))
                }
                if (url.includes('/wait')) {
                    waits += 1
                    if (waits === 1) {
                        return Promise.resolve(
                            jsonResponse({
                                pageId: 'p1',
                                call: { id: 'c1', name: 'submit_form', args: { button: 'Save' } }
                            })
                        )
                    }
                    if (waits === 2) {
                        return Promise.resolve(
                            jsonResponse({
                                pageId: 'p1',
                                call: { id: 'c2', name: 'set_fields', args: { fields: { Title: 'Policy' } } }
                            })
                        )
                    }
                    return hang(init?.signal ?? undefined)
                }
                return Promise.resolve(jsonResponse({ ok: true }))
            })
        )

        bootAgentHelper({ push: async () => undefined })
        await setAgentHelperEnabled(true)

        await vi.waitFor(() => expect(results).toHaveLength(2))
        expect(results[0]).toMatchObject({ ok: false, error: SUBMIT_FORM_REFUSAL })
        expect(results[1]).toMatchObject({ ok: true })
        expect(calls).toEqual(['set_fields'])
        expect(clicked).toBe(false)
    })

    it('opens a page inside the app and does not leave the navigation target for the agent', async () => {
        const router = { push: vi.fn(async () => undefined) }
        window.__appControl = {
            call: () => ({
                path: '/plan/documents',
                navigateTo: `${window.location.origin}/plan/documents`
            })
        }

        const answer = await executeAgentCall({ name: 'navigate', args: { path: '/plan/documents' } }, router)

        expect(router.push).toHaveBeenCalledWith('/plan/documents')
        expect(answer.ok).toBe(true)
        if (answer.ok) expect(answer.result).not.toHaveProperty('navigateTo')
    })

    it('turns the switch off when the dev server has no helper', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'missing' }, 404)))
        bootAgentHelper({ push: async () => undefined })

        await setAgentHelperEnabled(true)

        expect(agentHelperState().enabled).toBe(false)
        expect(agentHelperState().status).toBe('unavailable')
        expect(agentHelperState().message).toContain('Turn it on to try again')
        expect(sessionStorage.getItem('fourss.agentHelper')).toBeNull()
    })

    it('stops driving the tab when the page closes', async () => {
        const calls: string[] = []
        let waits = 0
        vi.stubGlobal(
            'fetch',
            vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
                const url = String(input)
                calls.push(url)
                if (url.includes('/session')) {
                    return Promise.resolve(
                        jsonResponse({
                            token: 'secret',
                            mcpUrl: 'http://127.0.0.1:3003/__agent-helper/mcp?token=secret'
                        })
                    )
                }
                if (url.includes('/release')) return Promise.resolve(jsonResponse({ ok: true }))
                if (url.includes('/wait')) {
                    waits += 1
                    if (waits === 1) return Promise.resolve(jsonResponse({ pageId: 'p1', idle: true }))
                    return hang(init?.signal ?? undefined)
                }
                return Promise.resolve(jsonResponse({ ok: true }))
            })
        )
        bootAgentHelper({ push: async () => undefined })
        await setAgentHelperEnabled(true)
        await vi.waitFor(() => expect(waits).toBeGreaterThan(1))

        window.dispatchEvent(new Event('pagehide'))

        await vi.waitFor(() => expect(calls.some((url) => url.includes('/release'))).toBe(true))
        expect(agentHelperState().status).toBe('off')
        expect(sessionStorage.getItem('fourss.agentHelper')).toBe('on')

        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
        await vi.waitFor(() => expect(agentHelperState().status).toBe('connected'))
    })
})
