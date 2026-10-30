export function normalizeLabel(text: string) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .replace(/\s*\*\s*$/, '')
        .trim()
        .toLowerCase()
}

function labelOf(el: Element) {
    const node = el as HTMLElement
    return normalizeLabel(
        node.innerText ||
            el.textContent ||
            el.getAttribute('aria-label') ||
            el.getAttribute('title') ||
            el.getAttribute('data-tooltip') ||
            ''
    )
}

function isDisabled(el: Element) {
    const node = el as HTMLButtonElement
    return Boolean(node.disabled) || el.getAttribute('aria-disabled') === 'true'
}

function collect(root: ParentNode): Element[] {
    const nodes = Array.from(
        root.querySelectorAll(
            'button, input[type=submit], [role="button"], [role="option"], [role="menuitem"], li, [aria-label]'
        )
    )
    const host = root as Document | Element
    if (typeof host.querySelectorAll === 'function') {
        for (const el of Array.from(host.querySelectorAll('*'))) {
            const shadow = (el as HTMLElement).shadowRoot
            if (shadow) nodes.push(...collect(shadow))
        }
    }
    return nodes
}

function rank(el: Element) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'button' || tag === 'input') return 0
    const role = el.getAttribute('role')
    if (role === 'option' || role === 'button' || role === 'menuitem') return 1
    if (tag === 'li') return 2
    return 3
}

export function clickLabeled(label: string, root: ParentNode = document): string | null {
    const wanted = normalizeLabel(label)
    if (!wanted) return null
    const matches = collect(root)
        .filter((el) => !isDisabled(el) && labelOf(el) === wanted)
        .sort((left, right) => rank(left) - rank(right))
    const el = matches[0] as HTMLElement | undefined
    if (!el) return null
    el.click()
    return labelOf(el)
}
