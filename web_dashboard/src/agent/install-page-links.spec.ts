import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { installAgentPageLinks } from './install-page-links'

function fakeRouter(): Router {
    return {
        currentRoute: { value: { path: '/login', params: {} } },
        getRoutes: () => []
    } as unknown as Router
}

describe('installAgentPageLinks', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        delete window.__bindAgentPageLinks
        delete window.__appControl
        delete window.__appControlHooks
    })

    it('does nothing in a browser until the shell installs page control', () => {
        const queued: Array<() => void> = []
        vi.spyOn(window, 'queueMicrotask').mockImplementation((fn) => {
            queued.push(fn as () => void)
        })
        const interval = vi.spyOn(window, 'setInterval')

        installAgentPageLinks(fakeRouter())
        window.__bindAgentPageLinks?.()

        expect(window.__appControl).toBeUndefined()
        expect(window.__appControlHooks).toBeUndefined()
        expect(queued).toEqual([])
        expect(interval).not.toHaveBeenCalled()
    })

    it('attaches when the shell has already installed page control', async () => {
        setActivePinia(createPinia())
        const calls: string[] = []
        window.__appControl = {
            call: (name) => {
                calls.push(name)
                return { from: 'shell' }
            }
        }

        installAgentPageLinks(fakeRouter())

        const listed = window.__appControlHooks?.list_pages?.({}) as { pages: unknown[] }
        expect(listed.pages).toEqual([])
        expect(await window.__appControl?.call('navigate', { path: '/login' })).toEqual({ from: 'shell' })
        expect(calls).toEqual(['navigate'])
    })

    it('attaches when the shell calls back after the page has loaded', () => {
        installAgentPageLinks(fakeRouter())
        expect(window.__appControlHooks).toBeUndefined()

        window.__appControl = {
            call: () => ({ from: 'shell' })
        }
        window.__bindAgentPageLinks?.()

        expect(typeof window.__appControlHooks?.list_pages).toBe('function')
        expect(window.__appControl?.__agentPatched).toBe(true)
    })
})
