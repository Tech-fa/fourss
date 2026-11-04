import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import * as runtime from '@/util/runtime-config'
import { installAgentPageLinks } from './install-page-links'
import { SUBMIT_FORM_REFUSAL } from './confirmation'

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
        localStorage.removeItem('auth')
        document.body.innerHTML = ''
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

    it('refuses to submit so the user confirms the change', async () => {
        document.body.innerHTML = '<button type="button">Save</button>'
        let clicked = false
        document.querySelector('button')?.addEventListener('click', () => {
            clicked = true
        })
        const calls: string[] = []
        window.__appControl = {
            call: (name) => {
                calls.push(name)
                return { submitted: true }
            }
        }

        installAgentPageLinks(fakeRouter())

        await expect(window.__appControl?.call('submit_form', { button: 'Save' })).rejects.toThrow(SUBMIT_FORM_REFUSAL)
        expect(clicked).toBe(false)
        expect(calls).toEqual([])
    })

    it('gives the agent the swagger document and the token in localStorage', async () => {
        vi.spyOn(runtime, 'getRuntimeConfig').mockReturnValue({
            apiUrl: 'http://127.0.0.1:3012',
            docUrl: ''
        })
        localStorage.setItem(
            'auth',
            JSON.stringify({ token: 'Bearer browser-token', userDetails: { email: 'person@example.com' } })
        )
        window.__appControl = {
            call: () => ({ from: 'shell' })
        }
        installAgentPageLinks(fakeRouter())

        const result = await window.__appControl?.call('api_access', {})

        expect(result).toEqual({
            apiUrl: 'http://127.0.0.1:3012',
            openApiUrl: 'http://127.0.0.1:3012/docs-json',
            swaggerUrl: 'http://127.0.0.1:3012/docs',
            authorization: 'Bearer browser-token'
        })
        expect(JSON.stringify(result)).not.toContain('person@example.com')
        localStorage.removeItem('auth')
    })

    it('chooses a dropdown on the page instead of asking the shell', async () => {
        document.body.innerHTML = `
            <label>Category</label>
            <div id="select2-dropdown">
                <button type="button"><span>Select category</span></button>
                <ul><li>Policy</li></ul>
            </div>
        `
        const calls: string[] = []
        window.__appControl = {
            call: (name) => {
                calls.push(name)
                return { forms: [] }
            }
        }
        installAgentPageLinks(fakeRouter())

        const selected = (await window.__appControl?.call('select_option', {
            field: 'Category',
            option: 'Policy'
        })) as { selected: string }
        const described = (await window.__appControl?.call('describe_page')) as { dropdowns: Array<{ label: string }> }

        expect(selected.selected).toBe('Policy')
        expect(described.dropdowns[0].label).toBe('Category')
        expect(calls).toEqual(['describe_page'])
    })
})
