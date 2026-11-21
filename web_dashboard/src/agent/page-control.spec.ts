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

        await expect(
            window.__appControl?.call('select_option', { field: 'Category', option: 'Missing' })
        ).rejects.toThrow('Visible options: Procedure, Policy')
    })

    it('chooses search, API search, and multi-select options', async () => {
        document.body.innerHTML = `
            <div>
                <label>Standard *</label>
                <div test-id="standard-select">
                    <div id="searcheable-select-dropdown">
                        <input type="text" placeholder="Search standard" />
                        <button type="button"></button>
                    </div>
                </div>
            </div>
            <div>
                <label>Linked non-conformity</label>
                <div id="searcheable-api-select2-dropdown" test-id="linked-nc-selector">
                    <input type="text" placeholder="Search non-conformities" />
                    <button type="button"></button>
                </div>
            </div>
            <div>
                <label>Teams</label>
                <div test-id="teams-select">
                    <div id="team-chips"></div>
                    <div id="multi-select-dropdown">
                        <button type="button"><span class="text-neutral-500">Select teams</span></button>
                    </div>
                </div>
            </div>
            <div>
                <label>Checklists</label>
                <div>
                    <div id="checklist-chips"></div>
                    <div id="searcheable-multi-select-dropdown">
                        <input type="text" placeholder="Search checklists" />
                        <button type="button"></button>
                    </div>
                </div>
            </div>
        `
        const standards = ['ISO 9001', 'ISO 14001', 'ISO 27001']
        const standardRoot = document.getElementById('searcheable-select-dropdown') as HTMLElement
        const standardInput = standardRoot.querySelector('input') as HTMLInputElement
        const standardList = document.createElement('ul')
        const renderStandards = () => {
            const query = standardInput.value.toLowerCase().replace(/\s+/g, '')
            const shown = query
                ? standards.filter((item) => item.toLowerCase().replace(/\s+/g, '').includes(query))
                : standards
            standardList.innerHTML = shown.map((item) => `<li>${item}</li>`).join('')
            if (!standardRoot.contains(standardList)) standardRoot.append(standardList)
        }
        standardInput.addEventListener('focus', renderStandards)
        standardInput.addEventListener('input', renderStandards)
        let standard = ''
        standardRoot.addEventListener('click', (event) => {
            const item = (event.target as Element).closest('li')
            if (!item) return
            standard = item.textContent || ''
            standardInput.value = standard
        })

        const apiRoot = document.getElementById('searcheable-api-select2-dropdown') as HTMLElement
        const apiInput = apiRoot.querySelector('input') as HTMLInputElement
        let linked = ''
        apiInput.addEventListener('input', () => {
            window.setTimeout(() => {
                apiRoot.querySelector('ul')?.remove()
                const list = document.createElement('ul')
                list.innerHTML = `<li>${apiInput.value}</li>`
                apiRoot.append(list)
            }, 40)
        })
        apiRoot.addEventListener('click', (event) => {
            const item = (event.target as Element).closest('li')
            if (!item) return
            linked = item.textContent || ''
            apiInput.value = linked
        })

        const teams = document.getElementById('multi-select-dropdown') as HTMLElement
        const teamChips = document.getElementById('team-chips') as HTMLElement
        const teamButton = teams.querySelector('button') as HTMLButtonElement
        teamButton.addEventListener('click', () => {
            if (teams.querySelector('ul')) {
                teams.querySelector('ul')?.remove()
                return
            }
            const list = document.createElement('ul')
            list.innerHTML = '<li>Quality</li><li>Safety</li>'
            teams.append(list)
        })
        teams.addEventListener('click', (event) => {
            const item = (event.target as Element).closest('li')
            if (!item) return
            const chip = document.createElement('div')
            chip.textContent = item.textContent || ''
            teamChips.append(chip)
            teams.querySelector('ul')?.remove()
        })

        const checks = document.getElementById('searcheable-multi-select-dropdown') as HTMLElement
        const checkChips = document.getElementById('checklist-chips') as HTMLElement
        const checkInput = checks.querySelector('input') as HTMLInputElement
        const checkList = document.createElement('ul')
        const checkOptions = ['Internal audit', 'Supplier audit']
        checkInput.addEventListener('input', () => {
            const query = checkInput.value.toLowerCase().replace(/\s+/g, '')
            checkList.innerHTML = checkOptions
                .filter((item) => item.toLowerCase().replace(/\s+/g, '').includes(query))
                .map((item) => `<li>${item}</li>`)
                .join('')
            if (!checks.contains(checkList)) checks.append(checkList)
        })
        checks.addEventListener('click', (event) => {
            const item = (event.target as Element).closest('li')
            if (!item) return
            const chip = document.createElement('div')
            chip.textContent = item.textContent || ''
            checkChips.append(chip)
            checkList.remove()
        })

        installHelperPageControl()
        const described = (await window.__appControl?.call('describe_page')) as {
            dropdowns: Array<{
                label: string
                placeholder: string
                value: string
                testId: string
                multiple: boolean
                searchable: boolean
                remote: boolean
                selected: string[]
            }>
        }
        expect(described.dropdowns.map((dropdown) => dropdown.label)).toEqual([
            'Standard',
            'Linked non-conformity',
            'Teams',
            'Checklists'
        ])
        expect(described.dropdowns.map((dropdown) => dropdown.multiple)).toEqual([false, false, true, true])
        expect(described.dropdowns.map((dropdown) => dropdown.searchable)).toEqual([true, true, false, true])
        expect(described.dropdowns.map((dropdown) => dropdown.remote)).toEqual([false, true, false, false])
        expect(described.dropdowns[2].placeholder).toBe('Select teams')
        expect(described.dropdowns[2].value).toBe('')
        expect(described.dropdowns[2].selected).toEqual([])
        expect(described.dropdowns[0].testId).toBe('standard-select')

        const selected = (await window.__appControl?.call('select_option', {
            field: 'Standard',
            option: 'ISO 14001'
        })) as { selected: string }
        expect(selected.selected).toBe('ISO 14001')
        expect(standard).toBe('ISO 14001')

        const linkedResult = (await window.__appControl?.call('select_option', {
            field: 'linked-nc-selector',
            option: 'NC-14'
        })) as { selected: string }
        expect(linkedResult.selected).toBe('NC-14')
        expect(linked).toBe('NC-14')

        const firstTeam = (await window.__appControl?.call('select_option', {
            field: 'Teams',
            option: 'Quality'
        })) as { values: string[] }
        const secondTeam = (await window.__appControl?.call('select_option', {
            field: 'Teams',
            option: 'Safety'
        })) as { values: string[] }
        expect(firstTeam.values).toEqual(['Quality'])
        expect(secondTeam.values).toEqual(['Quality', 'Safety'])

        const checklist = (await window.__appControl?.call('select_option', {
            field: 'Search checklists',
            option: 'Supplier'
        })) as { selected: string; values: string[] }
        expect(checklist.selected).toBe('Supplier audit')
        expect(checklist.values).toEqual(['Supplier audit'])
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
