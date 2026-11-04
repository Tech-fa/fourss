import { afterEach, describe, expect, it, vi } from 'vitest'
import { installHelperPageControl, removeHelperPageControl } from './page-control'
import { SUBMIT_FORM_REFUSAL } from './confirmation'

describe('helper page control', () => {
    afterEach(() => {
        delete window.__appControl
        delete window.__appControlHooks
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
})
