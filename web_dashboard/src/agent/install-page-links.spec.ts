import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { installAgentPageLinks } from './install-page-links'

vi.mock('@/util/runtime-config', () => ({
    getRuntimeConfig: () => ({ apiUrl: 'http://127.0.0.1:3012', docUrl: '' })
}))

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
        delete window.__agentApplyPlayground
        delete window.__agentInsertDocumentContent
        delete window.__agentReadDocumentContent
        delete window.__agentDocumentEditPath
        delete window.__agentDocumentRead
        localStorage.removeItem('auth')
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

    it('sends a playground program to the open page and does not ask the shell', async () => {
        const calls: string[] = []
        window.__appControl = {
            call: (name) => {
                calls.push(name)
                return { from: 'shell' }
            }
        }
        window.__agentApplyPlayground = async (input) => {
            const source = typeof input === 'string' ? input : input.source
            expect(source).toBe('function render() {}')
            return { id: 'pg-1', name: 'Notes', revision: 2 }
        }
        installAgentPageLinks(fakeRouter())

        const result = await window.__appControl?.call('apply_playground', { source: 'function render() {}' })
        expect(result).toMatchObject({ id: 'pg-1', revision: 2 })
        expect(calls).toEqual([])
        delete window.__agentApplyPlayground
    })

    it('returns the browser token and replaces one section of the open document', async () => {
        const policy = '# Policy\n\n## Purpose\n\nKeep this purpose.\n\n## Scope\n\nOld scope.\n'
        let written = ''
        window.__appControl = { call: () => ({ from: 'shell' }) }
        window.__agentReadDocumentContent = async () => ({ markdown: policy, complete: true })
        window.__agentInsertDocumentContent = async (markdown) => {
            written = markdown
            return true
        }
        window.__agentDocumentEditPath = () =>
            '/plan/documents/doc-9/edit-version?redirect=/plan/documents/doc-9&fillPendingVersion=15'
        localStorage.setItem('auth', JSON.stringify({ token: 'Bearer browser-token' }))
        setActivePinia(createPinia())
        installAgentPageLinks(fakeRouter())

        const listed = window.__appControlHooks?.list_pages?.({}) as { pages: Array<{ path: string }> }
        expect(listed.pages.map((page) => page.path)).toContain(
            '/plan/documents/doc-9/edit-version?redirect=/plan/documents/doc-9&fillPendingVersion=15'
        )

        await expect(window.__appControl?.call('api_access')).resolves.toMatchObject({
            openApiUrl: 'http://127.0.0.1:3012/docs-json',
            authorization: 'Bearer browser-token'
        })

        await expect(
            window.__appControl?.call('set_fields', {
                fields: { 'document body': '# Policy\n\n## Purpose\n\nGone.\n\n## Scope\n\nGone.\n' }
            })
        ).rejects.toThrow(/complete markdown/)

        window.__agentDocumentRead = { complete: true, markdown: policy }
        const filled = (await window.__appControl?.call('set_fields', {
            fields: { 'editor content': '## Scope\n\nNew scope.\n' }
        })) as { set: string[] }
        expect(filled.set).toEqual(['Document body'])
        expect(written).toContain('Keep this purpose.')
        expect(written).toContain('New scope.')
        expect(written).not.toContain('Old scope.')
    })
})
