import { readBrowserApiAccess } from './api-access'
import { SUBMIT_FORM_REFUSAL } from './confirmation'
import { includeDocumentEditPath } from './page-links'
import { runAgentPlayground } from './playground-program'

type ControlArgs = Record<string, unknown>

export function installHelperPageControl() {
    if (window.__appControl) return false
    const builtins = createBuiltins()
    window.__appControl = {
        __helperOwned: true,
        async call(name, args = {}) {
            const hook = window.__appControlHooks?.[name]
            if (typeof hook === 'function') return await hook(args)
            const builtin = builtins[name]
            if (!builtin) throw new Error(`Unknown tool ${name}.`)
            return await builtin(args)
        }
    }
    return true
}

export function removeHelperPageControl() {
    if (!window.__appControl?.__helperOwned) return
    delete window.__appControl
    delete window.__appControlHooks
}

function createBuiltins(): Record<string, (args: ControlArgs) => unknown> {
    return {
        list_pages() {
            return {
                pages: includeDocumentEditPath(
                    pagesFrom('nav a[href], header a[href], [role=navigation] a[href]', 80),
                    documentEditPath()
                )
            }
        },
        async describe_page() {
            const roots = formRoots()
            const described: {
                url: string
                path: string
                title: string
                forms: ReturnType<typeof describeRoot>[]
                dropdowns: ReturnType<typeof listDropdowns>
                links: Array<{ name: string; path: string }>
                document?: string
            } = {
                url: location.href,
                path: location.pathname + location.search + location.hash,
                title: document.title,
                forms: roots.map(describeRoot),
                dropdowns: listDropdowns(document),
                links: pagesFrom('a[href]', 40)
            }
            const read = window.__agentReadDocumentContent
            if (typeof read === 'function') {
                const result = await read()
                if (result && typeof result.markdown === 'string') {
                    described.document = result.markdown
                    window.__agentDocumentRead = {
                        complete: result.complete === true,
                        markdown: result.markdown
                    }
                }
            }
            return described
        },
        api_access() {
            return readBrowserApiAccess()
        },
        navigate(args) {
            const path = typeof args.path === 'string' ? args.path.trim() : ''
            if (!path) throw new Error('path is required.')
            const url = new URL(path, location.href)
            if (url.origin !== location.origin) throw new Error('That path is outside this app.')
            return { path: url.pathname + url.search + url.hash, navigateTo: url.href }
        },
        select_option(args) {
            return selectOption(args)
        },
        apply_playground(args) {
            return runAgentPlayground(args)
        },
        set_fields(args) {
            const fields = args.fields
            if (!isRecord(fields) || !Object.keys(fields).length) {
                throw new Error('fields must be an object of field names to values.')
            }
            const root = findRoot(args.form)
            const set: string[] = []
            const missing: string[] = []
            for (const key of Object.keys(fields)) {
                const el = findControl(root, key)
                if (!el) {
                    missing.push(key)
                    continue
                }
                setControl(root, el, fields[key])
                set.push(key)
            }
            if (!set.length) throw new Error('None of those fields are on this form.')
            return { set, missing, form: describeRoot(root, 0) }
        },
        submit_form() {
            throw new Error(SUBMIT_FORM_REFUSAL)
        }
    }
}

const DROPDOWN_ROOT = '[id="select2-dropdown"], [id="searcheable-select-dropdown"]'
const OPTION_LIMIT = 40

export function listDropdowns(root: ParentNode) {
    return dropdownRoots(root).map(describeDropdown)
}

export async function selectOption(args: ControlArgs) {
    const field = typeof args.field === 'string' ? args.field.trim() : ''
    const option = typeof args.option === 'string' ? args.option.trim() : ''
    if (!field) throw new Error('field is required.')
    if (!option) throw new Error('option is required.')

    const native = findControl(document.body, field)
    if (native instanceof HTMLSelectElement) {
        setControl(document.body, native, option)
        const selected = Array.from(native.options).find((item) => item.value === native.value)
        return { field, option, selected: clean(selected?.textContent) || native.value }
    }

    const dropdown = findDropdown(field)
    if (!dropdown) throw new Error(`No dropdown matches ${field}.`)
    openDropdown(dropdown)
    const match = await waitForOption(dropdown, option)
    match.click()
    return { field, option, selected: clean(match.textContent) }
}

function dropdownRoots(root: ParentNode) {
    return Array.from(root.querySelectorAll(DROPDOWN_ROOT))
}

function describeDropdown(el: Element) {
    const options = optionElements(el).map((item) => clean(item.textContent)).filter(Boolean)
    return {
        label: dropdownLabel(el),
        placeholder: dropdownPlaceholder(el),
        value: dropdownValue(el),
        options: options.slice(0, OPTION_LIMIT),
        optionCount: options.length
    }
}

function dropdownLabel(el: Element) {
    let node: Element | null = el
    while (node && node !== document.body) {
        let sibling = node.previousElementSibling
        while (sibling) {
            if (sibling.tagName === 'LABEL') return clean(sibling.textContent)
            const nested = sibling.querySelector('label')
            if (nested) return clean(nested.textContent)
            sibling = sibling.previousElementSibling
        }
        node = node.parentElement
    }
    return ''
}

function dropdownPlaceholder(el: Element) {
    const input = el.querySelector('input')
    if (input instanceof HTMLInputElement && input.placeholder) return clean(input.placeholder)
    return ''
}

function dropdownValue(el: Element) {
    const input = el.querySelector('input')
    if (input instanceof HTMLInputElement && input.value) return clean(input.value)
    const span = el.querySelector('button span')
    return clean(span?.textContent || '')
}

function findDropdown(key: string) {
    const wanted = norm(key)
    const matches = dropdownRoots(document).filter((el) => {
        const names = [
            dropdownLabel(el),
            dropdownPlaceholder(el),
            dropdownValue(el),
            el.parentElement?.getAttribute('test-id') || ''
        ]
        return names.some((name) => norm(name) === wanted)
    })
    if (matches.length > 1) throw new Error(`More than one dropdown matches ${key}.`)
    return matches[0] || null
}

function openDropdown(el: Element) {
    const input = el.querySelector('input')
    if (input instanceof HTMLInputElement) {
        input.focus()
        input.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
        return
    }
    const button = el.querySelector('button')
    if (button instanceof HTMLButtonElement) button.click()
}

function optionElements(el: Element) {
    return Array.from(el.querySelectorAll('li')).filter((item) => clean(item.textContent))
}

async function waitForOption(el: Element, option: string) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const match = matchOption(optionElements(el), option)
        if (match) return match
        await new Promise((resolve) => setTimeout(resolve, 30))
    }
    throw new Error(`No option matches ${option}.`)
}

function matchOption(options: Element[], option: string) {
    const wanted = norm(option)
    const exact = options.filter((item) => norm(item.textContent) === wanted)
    if (exact.length === 1) return exact[0]
    if (exact.length > 1) throw new Error(`More than one option matches ${option}.`)
    const partial = options.filter((item) => norm(item.textContent).includes(wanted))
    if (partial.length === 1) return partial[0]
    if (partial.length > 1) throw new Error(`More than one option matches ${option}.`)
    return null
}

function clean(text: unknown) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .replace(/\s*\*\s*$/, '')
        .trim()
}

function norm(text: unknown) {
    return clean(text).toLowerCase()
}

function cssEscape(value: string) {
    if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(value)
    return String(value).replace(/(["\\])/g, '\\$1')
}

function labelFor(el: Element) {
    if (el.id) {
        const label = document.querySelector(`label[for="${cssEscape(el.id)}"]`)
        if (label) return clean(label.textContent)
    }
    const wrapped = el.closest('label')
    if (wrapped) return clean(wrapped.textContent)
    return clean(el.getAttribute('aria-label') || '')
}

function controls(root: ParentNode) {
    return Array.from(root.querySelectorAll('input, textarea, select')).filter((el) => {
        const type = (el.getAttribute('type') || '').toLowerCase()
        return type !== 'hidden' && type !== 'submit' && type !== 'button' && type !== 'file'
    })
}

function readField(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
    const type = (el.getAttribute('type') || el.tagName).toLowerCase()
    let value: string | boolean = 'value' in el ? el.value : ''
    if ((type === 'checkbox' || type === 'radio') && el instanceof HTMLInputElement) {
        value = el.checked ? el.value || true : false
    }
    return {
        name: el.getAttribute('name') || el.id || labelFor(el),
        label: labelFor(el),
        type,
        value,
        required: Boolean((el as HTMLInputElement).required),
        disabled: Boolean((el as HTMLInputElement).disabled),
        placeholder: (el as HTMLInputElement).placeholder || ''
    }
}

function buttonText(button: Element) {
    return clean(button.textContent || button.getAttribute('value') || button.getAttribute('aria-label') || '')
}

function formRoots(): Array<HTMLFormElement | HTMLElement> {
    const forms = Array.from(document.forms)
    return forms.length ? forms : [document.body]
}

function findRoot(formKey: unknown): HTMLFormElement | HTMLElement {
    const roots = formRoots()
    if (formKey == null || String(formKey).trim() === '') {
        if (roots.length === 1) return roots[0]
        throw new Error('This page has more than one form. Pass form.')
    }
    const key = String(formKey)
    const byId = document.getElementById(key)
    if (byId && (byId.tagName === 'FORM' || byId === document.body)) return byId
    const named = roots.find((form) => form.getAttribute('name') === key || form.id === key || form.getAttribute('aria-label') === key)
    if (named) return named
    const index = Number(key)
    if (String(index) === key && roots[index]) return roots[index]
    throw new Error(`No form matches ${key}.`)
}

function describeRoot(root: HTMLFormElement | HTMLElement, index: number) {
    return {
        id: root.id || '',
        name: root.getAttribute('name') || '',
        index,
        fields: controls(root).map((el) => readField(el as HTMLInputElement)),
        buttons: Array.from(root.querySelectorAll('button, input[type=submit]'))
            .map(buttonText)
            .filter(Boolean)
    }
}

function documentEditPath() {
    const read = window.__agentDocumentEditPath
    if (typeof read !== 'function') return ''
    try {
        const value = read()
        return typeof value === 'string' ? value : ''
    } catch {
        return ''
    }
}

function pagesFrom(selector: string, limit: number) {
    const pages: Array<{ name: string; path: string }> = []
    const seen = new Set<string>()
    for (const anchor of Array.from(document.querySelectorAll(selector))) {
        if (pages.length >= limit) break
        if (!(anchor instanceof HTMLAnchorElement)) continue
        const url = sameOrigin(anchor.href)
        if (!url) continue
        const path = url.pathname + url.search
        if (seen.has(path)) continue
        seen.add(path)
        pages.push({ name: clean(anchor.textContent) || path, path })
    }
    return pages
}

function sameOrigin(href: string) {
    try {
        const url = new URL(href, location.href)
        if (url.origin !== location.origin) return null
        return url
    } catch {
        return null
    }
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
    const prototype = Object.getPrototypeOf(el) as object
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
    if (descriptor?.set) descriptor.set.call(el, value)
    else el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
}

function findControl(root: ParentNode, key: string) {
    const all = controls(root).filter((el) => !(el as HTMLInputElement).disabled)
    const exact = all.find((el) => el.getAttribute('name') === key || el.id === key)
    if (exact) return exact
    const wanted = norm(key)
    return (
        all.find((el) => norm(labelFor(el)) === wanted || norm(el.getAttribute('placeholder') || '') === wanted) ||
        null
    )
}

function setControl(root: ParentNode, el: Element, value: unknown) {
    const type = (el.getAttribute('type') || '').toLowerCase()
    if (type === 'checkbox' && el instanceof HTMLInputElement) {
        el.checked = value === true || value === 'true' || value === 'on' || value === 1 || value === '1'
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        return
    }
    if (type === 'radio' && el instanceof HTMLInputElement) {
        const group = Array.from(root.querySelectorAll(`input[type="radio"][name="${cssEscape(el.name)}"]`))
        const match = group.find((radio) => radio instanceof HTMLInputElement && radio.value === String(value))
        if (!(match instanceof HTMLInputElement)) throw new Error(`No choice matches ${String(value)}.`)
        match.checked = true
        match.dispatchEvent(new Event('input', { bubbles: true }))
        match.dispatchEvent(new Event('change', { bubbles: true }))
        return
    }
    if (el instanceof HTMLSelectElement) {
        const wanted = String(value)
        const option = Array.from(el.options).find((item) => item.value === wanted || clean(item.textContent) === wanted)
        if (!option) throw new Error(`No option matches ${wanted}.`)
        setNativeValue(el, option.value)
        return
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        setNativeValue(el, value == null ? '' : String(value))
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
