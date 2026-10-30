export type AgentPage = {
    name: string
    path: string
}

export type AgentRoute = {
    name?: string | symbol | null
    path: string
    redirect?: unknown
    meta?: {
        subject?: string
        subjects?: string[]
        actions?: string[]
    }
}

const PAGE_LINK_LIMIT = 80

export function agentPages(input: {
    routes: AgentRoute[]
    signedIn: boolean
    authRouteNames: ReadonlySet<string>
    can: (route: AgentRoute) => boolean
    currentPath: string
    currentParams: Record<string, string>
    pageLinks: AgentPage[]
}): AgentPage[] {
    const pages: AgentPage[] = []
    const seen = new Set<string>()

    const add = (name: string, path: string) => {
        const cleaned = path.trim()
        if (!cleaned || seen.has(cleaned)) return
        seen.add(cleaned)
        pages.push({ name: name.trim() || cleaned, path: cleaned })
    }

    for (const route of input.routes) {
        if (route.redirect) continue
        if (!routeVisible(route, input.signedIn, input.authRouteNames, input.can)) continue
        const path = concretePath(route.path, input.currentPath, input.currentParams)
        if (!path) continue
        add(routeName(route, path), path)
    }

    let extras = 0
    for (const link of input.pageLinks) {
        if (extras >= PAGE_LINK_LIMIT) break
        const before = seen.size
        add(link.name, link.path)
        if (seen.size > before) extras += 1
    }

    return pages
}

export function linksOnPage(doc: Document, href: string): AgentPage[] {
    let here: URL
    try {
        here = new URL(href)
    } catch {
        return []
    }
    const pages: AgentPage[] = []
    const seen = new Set<string>()
    for (const anchor of doc.querySelectorAll('a[href]')) {
        const raw = anchor.getAttribute('href')
        if (!raw || raw.startsWith('#')) continue
        let url: URL
        try {
            url = new URL(raw, here.href)
        } catch {
            continue
        }
        if (url.origin !== here.origin) continue
        const path = `${url.pathname}${url.search}${url.hash}`
        if (seen.has(path)) continue
        seen.add(path)
        const name = (anchor.textContent || '').replace(/\s+/g, ' ').trim()
        pages.push({ name: name || path, path })
    }
    return pages
}

function routeVisible(
    route: AgentRoute,
    signedIn: boolean,
    authRouteNames: ReadonlySet<string>,
    can: (route: AgentRoute) => boolean
): boolean {
    if (route.name === 'NotFound') return false
    if (!signedIn) {
        return typeof route.name === 'string' && authRouteNames.has(route.name)
    }
    return can(route)
}

function concretePath(
    routePath: string,
    currentPath: string,
    params: Record<string, string>
): string | null {
    if (!routePath || routePath.includes('*')) return null
    if (!routePath.includes(':')) {
        return routePath.startsWith('/') ? routePath : `/${routePath}`
    }
    if (!paramRouteMatchesCurrent(routePath, currentPath, params)) return null

    let missing = false
    const filled = routePath.replace(/:([A-Za-z_][A-Za-z0-9_]*)\??/g, (_token, name: string) => {
        const value = params[name]
        if (!value) {
            missing = true
            return ''
        }
        return encodeURIComponent(value)
    })
    if (missing || filled.includes(':')) return null
    return filled.startsWith('/') ? filled : `/${filled}`
}

function paramRouteMatchesCurrent(
    routePath: string,
    currentPath: string,
    params: Record<string, string>
): boolean {
    const prefixEnd = routePath.search(/:[A-Za-z_]/)
    const prefix = prefixEnd === -1 ? routePath : routePath.slice(0, prefixEnd)
    const current = currentPath.split('?')[0].split('#')[0]
    if (!current.startsWith(prefix)) return false

    const routeParts = routePath.split('/').filter(Boolean)
    const currentParts = current.split('/').filter(Boolean)
    for (let index = 0; index < routeParts.length; index += 1) {
        const token = routeParts[index].match(/^:([A-Za-z_][A-Za-z0-9_]*)\??$/)
        if (!token) continue
        if (currentParts[index] !== params[token[1]]) return false
    }
    return true
}

function routeName(route: AgentRoute, path: string): string {
    if (typeof route.name === 'string' && route.name.trim()) return route.name.trim()
    if (path === '/') return 'Home'
    const words = path
        .split('?')[0]
        .split('#')[0]
        .split('/')
        .filter(Boolean)
        .map((word) => word.replace(/-/g, ' '))
    if (!words.length) return path
    return words.join(' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
