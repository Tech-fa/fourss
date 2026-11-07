import { afterEach, describe, expect, it, vi } from 'vitest'
import { installHelperPageControl, removeHelperPageControl } from './page-control'
import { SUBMIT_FORM_REFUSAL } from './confirmation'

vi.mock('@/util/runtime-config', () => ({
    getRuntimeConfig: () => ({ apiUrl: 'http://127.0.0.1:3012', docUrl: '' })
}))

describe('helper page control', () => {
    afterEach(() => {
        delete window.__appControl
        delete window.__appControlHooks
        delete window.__agentApplyPlayground
        delete window.__agentReadDocumentContent
        delete window.__agentDocumentEditPath
        delete window.__agentDocumentRead
        localStorage.removeItem('auth')
        document.body.innerHTML = ''
    })

    it('lists same-site pages and fills a labeled field', async () => {
        document.body.innerHTML = `
            <nav>
                <a href="/plan/documents">Documents</a>
                <a href="https://example.com/other">Other</a>
            </nav>
            <form>
                <label for="title">Title</label>
                <input id="title" name="title" />
                <button type="submit">Save</button>
            </form>
        `
        expect(installHelperPageControl()).toBe(true)

        const listed = (await window.__appControl?.call('list_pages')) as { pages: Array<{ path: string }> }
        expect(listed.pages.map((page) => page.path)).toEqual(['/plan/documents'])

        const filled = (await window.__appControl?.call('set_fields', { fields: { Title: 'Policy' } })) as {
            set: string[]
        }
        expect(filled.set).toEqual(['Title'])
        expect((document.getElementById('title') as HTMLInputElement).value).toBe('Policy')
    })

    it('opens a labeled dropdown and chooses the named option', async () => {
        document.body.innerHTML = `
            <div>
                <div>
                    <label>Category *</label>
                </div>
                <div test-id="category-select">
                    <div id="select2-dropdown">
                        <button type="button"><span>Select category</span></button>
                    </div>
                </div>
            </div>
            <label for="kind">Kind</label>
            <select id="kind">
                <option value="">Choose</option>
                <option value="policy">Policy</option>
            </select>
        `
        const button = document.querySelector('#select2-dropdown button') as HTMLButtonElement
        const list = document.createElement('ul')
        list.innerHTML = '<li>Procedure</li><li>Policy</li>'
        let chosen = ''
        list.querySelectorAll('li').forEach((item) => {
            item.addEventListener('click', () => {
                chosen = item.textContent || ''
            })
        })
        button.addEventListener('click', () => {
            if (!button.parentElement?.querySelector('li')) button.parentElement?.append(list)
        })
        installHelperPageControl()

        const described = (await window.__appControl?.call('describe_page')) as {
            dropdowns: Array<{ label: string; optionCount: number }>
        }
        expect(described.dropdowns.map((dropdown) => dropdown.label)).toEqual(['Category'])
        expect(described.dropdowns[0].optionCount).toBe(0)

        const selected = (await window.__appControl?.call('select_option', {
            field: 'Category',
            option: 'Policy'
        })) as { selected: string }
        expect(selected.selected).toBe('Policy')
        expect(chosen).toBe('Policy')

        await window.__appControl?.call('select_option', { field: 'Category', option: 'Procedure' })
        expect(chosen).toBe('Procedure')

        const native = (await window.__appControl?.call('select_option', {
            field: 'Kind',
            option: 'Policy'
        })) as { selected: string }
        expect(native.selected).toBe('Policy')
        expect((document.getElementById('kind') as HTMLSelectElement).value).toBe('policy')
    })

    it('refuses to submit and does not replace the shell control', async () => {
        document.body.innerHTML = '<button type="submit">Save</button>'
        let clicked = false
        document.querySelector('button')?.addEventListener('click', () => {
            clicked = true
        })
        installHelperPageControl()
        await expect(window.__appControl?.call('submit_form', { button: 'Save' })).rejects.toThrow(SUBMIT_FORM_REFUSAL)
        expect(clicked).toBe(false)

        removeHelperPageControl()
        expect(window.__appControl).toBeUndefined()

        window.__appControl = { call: () => 'shell' }
        expect(installHelperPageControl()).toBe(false)
        removeHelperPageControl()
        expect(await window.__appControl?.call('list_pages')).toBe('shell')
    })

    it('returns the full open document and the browser api token', async () => {
        document.body.innerHTML = `
            <form>
                <label for="comment">Comment</label>
                <textarea id="comment" name="comment"></textarea>
                <button type="submit">Save comment</button>
            </form>
        `
        const markdown = '# Policy\n\n## Purpose\n\nKeep this purpose.\n\n## Scope\n\nOld scope.\n'
        window.__agentReadDocumentContent = async () => ({ markdown, complete: true })
        window.__agentDocumentEditPath = () =>
            '/plan/documents/doc-9/edit-version?redirect=/plan/documents/doc-9&fillPendingVersion=15'
        localStorage.setItem('auth', JSON.stringify({ token: 'Bearer browser-token' }))
        installHelperPageControl()

        const described = (await window.__appControl?.call('describe_page')) as { document?: string }
        expect(described.document).toContain('## Purpose')
        expect(described.document).toContain('## Scope')
        expect(window.__agentDocumentRead).toEqual({ complete: true, markdown })

        const listed = (await window.__appControl?.call('list_pages')) as { pages: Array<{ path: string }> }
        expect(listed.pages.map((page) => page.path)).toContain(
            '/plan/documents/doc-9/edit-version?redirect=/plan/documents/doc-9&fillPendingVersion=15'
        )

        await expect(window.__appControl?.call('api_access')).resolves.toEqual({
            apiUrl: 'http://127.0.0.1:3012',
            openApiUrl: 'http://127.0.0.1:3012/docs-json',
            swaggerUrl: 'http://127.0.0.1:3012/docs',
            authorization: 'Bearer browser-token'
        })
    })

    it('asks the playground page to show html', async () => {
        installHelperPageControl()
        await expect(window.__appControl?.call('apply_playground', { html: '<p>Hi</p>' })).rejects.toThrow(
            'Open the Playground page first.'
        )
        window.__agentApplyPlayground = async () => ({ id: 'pg-1', name: 'Notes', revision: 1 })
        await expect(window.__appControl?.call('apply_playground', { html: '<p>Hi</p>' })).resolves.toMatchObject({
            id: 'pg-1'
        })
        delete window.__agentApplyPlayground
    })
})
