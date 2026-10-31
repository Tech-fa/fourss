import type { Router } from 'vue-router'
import { AuthRoutes } from '@/components/auth/routes'
import { useAuthStore } from '@/stores/auth'
import { clickLabeled } from './click-labeled'
import { agentPages, linksOnPage, type AgentRoute } from './page-links'

const authRouteNames = new Set(AuthRoutes.map((route) => String(route.name)))
const DOCUMENT_BODY_FIELDS = new Set(['document body', 'editor content'])

export function installAgentPageLinks(router: Router) {
    window.__bindAgentPageLinks = () => {
        bindAgentPageLinks(router)
    }
    bindAgentPageLinks(router)
}

function bindAgentPageLinks(router: Router) {
    const control = window.__appControl
    if (!control) return false
    if (control.__agentPatched) return true

    const hooks = (window.__appControlHooks ??= {})
    hooks.list_pages = () => {
        const auth = useAuthStore()
        const current = router.currentRoute.value
        const params: Record<string, string> = {}
        for (const [key, value] of Object.entries(current.params)) {
            if (typeof value === 'string' && value) params[key] = value
            else if (Array.isArray(value) && typeof value[0] === 'string' && value[0]) params[key] = value[0]
        }
        return {
            pages: agentPages({
                routes: router.getRoutes().map(toAgentRoute),
                signedIn: auth.state.isLoggedIn,
                authRouteNames,
                can: (route) => allowed(route, auth.hasPermissions),
                currentPath: current.path,
                currentParams: params,
                pageLinks: linksOnPage(document, window.location.href)
            })
        }
    }
    if (!control.__agentOriginalCall) {
        control.__agentOriginalCall = control.call.bind(control)
    }
    const originalCall = control.__agentOriginalCall
    control.__agentPatched = true
    control.call = async (name, args = {}) => {
        if (name === 'submit_form' && typeof args.button === 'string' && args.button.trim()) {
            const clicked = clickLabeled(args.button)
            if (clicked) return { submitted: true, button: clicked }
        }
        if (name === 'set_fields' && args.fields && typeof args.fields === 'object') {
            const fields = { ...(args.fields as Record<string, unknown>) }
            let insertedBody = false
            for (const key of Object.keys(fields)) {
                if (!DOCUMENT_BODY_FIELDS.has(key.trim().toLowerCase())) continue
                const markdown = fields[key]
                delete fields[key]
                if (typeof markdown === 'string' && markdown.trim()) {
                    const insert = window.__agentInsertDocumentContent
                    if (!insert) throw new Error('The document editor is not ready.')
                    await insert(markdown)
                    insertedBody = true
                }
            }
            if (!Object.keys(fields).length) {
                if (insertedBody) return { set: ['Document body'], missing: [] }
                throw new Error('fields must include at least one field.')
            }
            args = { ...args, fields }
        }
        return originalCall(name, args)
    }
    return true
}

function toAgentRoute(route: {
    name?: AgentRoute['name']
    path: string
    redirect?: unknown
    meta?: unknown
}): AgentRoute {
    return {
        name: route.name,
        path: route.path,
        redirect: route.redirect,
        meta: readMeta(route.meta)
    }
}

function readMeta(meta: unknown): AgentRoute['meta'] {
    if (!meta || typeof meta !== 'object') return {}
    const value = meta as Record<string, unknown>
    return {
        subject: typeof value.subject === 'string' ? value.subject : undefined,
        subjects: stringList(value.subjects),
        actions: stringList(value.actions)
    }
}

function stringList(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined
    const items = value.filter((item): item is string => typeof item === 'string')
    return items.length ? items : undefined
}

function allowed(
    route: AgentRoute,
    hasPermissions: (check: { subject: string; actions: string[] }) => boolean
): boolean {
    const actions = route.meta?.actions
    if (!actions?.length) return true
    const subjects = route.meta?.subjects?.length
        ? route.meta.subjects
        : route.meta?.subject
          ? [route.meta.subject]
          : []
    return subjects.some((subject) => hasPermissions({ subject, actions }))
}

declare global {
    interface Window {
        __bindAgentPageLinks?: () => void
        __appControlHooks?: Record<string, (args: Record<string, unknown>) => unknown>
        __appControl?: {
            call: (name: string, args?: Record<string, unknown>) => Promise<unknown> | unknown
            __agentOriginalCall?: (name: string, args?: Record<string, unknown>) => Promise<unknown> | unknown
            __agentPatched?: boolean
        }
        __agentInsertDocumentContent?: (markdown: string) => Promise<boolean | void> | boolean | void
    }
}
