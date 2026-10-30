import { describe, expect, it } from 'vitest'
import router from '@/router'
import { agentPages, linksOnPage, type AgentRoute } from './page-links'

const authNames = new Set(['Login', 'ForgotPassword'])

const routes: AgentRoute[] = [
    { name: 'Login', path: '/login' },
    { name: 'ForgotPassword', path: '/forgot-password' },
    { name: 'Documents', path: '/plan/documents', meta: { subject: 'documents', actions: ['read'] } },
    { name: 'Edit Document', path: '/plan/documents/:id/edit', meta: { subject: 'documents', actions: ['update'] } },
    { name: 'View Template', path: '/plan/documents/settings/templates/:id', meta: { subject: 'document_templates', actions: ['read'] } },
    { path: '/admin/users', meta: { subject: 'users', actions: ['read'] } },
    { name: 'Permission Group', path: '/admin/permissions/roles/:id', meta: { subject: 'permissions', actions: ['read'] } },
    { name: 'Profile', path: 'profile' },
    { path: '', redirect: '/plan/documents' },
    { name: 'NotFound', path: '/:catchAll(.*)' }
]

function pagesFor(options: {
    signedIn: boolean
    currentPath?: string
    currentParams?: Record<string, string>
    can?: (route: AgentRoute) => boolean
    pageLinks?: { name: string; path: string }[]
}) {
    return agentPages({
        routes,
        signedIn: options.signedIn,
        authRouteNames: authNames,
        can: options.can ?? (() => true),
        currentPath: options.currentPath ?? '/login',
        currentParams: options.currentParams ?? {},
        pageLinks: options.pageLinks ?? []
    })
}

describe('agentPages', () => {
    it('lists the sign-in pages before a user is signed in', () => {
        const paths = pagesFor({ signedIn: false }).map((page) => page.path)
        expect(paths).toEqual(['/login', '/forgot-password'])
    })

    it('lists every permitted page, including pages that are not on screen', () => {
        const pages = pagesFor({
            signedIn: true,
            currentPath: '/plan/documents',
            can: (route) => route.meta?.subject !== 'users'
        })
        expect(pages.map((page) => page.path)).toContain('/plan/documents')
        expect(pages.map((page) => page.path)).toContain('/profile')
        expect(pages.map((page) => page.path)).not.toContain('/admin/users')
        expect(pages.map((page) => page.path)).not.toContain('/plan/documents/:id/edit')
    })

    it('adds the other pages for the open record without borrowing that id', () => {
        const paths = pagesFor({
            signedIn: true,
            currentPath: '/plan/documents/9/content',
            currentParams: { id: '9' }
        }).map((page) => page.path)
        expect(paths).toContain('/plan/documents/9/edit')
        expect(paths).not.toContain('/admin/permissions/roles/9')
        expect(paths).not.toContain('/plan/documents/settings/templates/9')
    })

    it('keeps a link that is only present on the current page', () => {
        const pages = pagesFor({
            signedIn: true,
            currentPath: '/plan/documents',
            pageLinks: [{ name: 'Safety manual', path: '/plan/documents/42' }]
        })
        expect(pages).toContainEqual({ name: 'Safety manual', path: '/plan/documents/42' })
    })
})

describe('the app router', () => {
    it('publishes absolute paths for nested pages', () => {
        const paths = router.getRoutes().map((route) => route.path)
        expect(paths).toContain('/plan/documents')
        expect(paths).toContain('/profile')
    })
})

describe('linksOnPage', () => {
    it('reads same-site links and skips other sites', () => {
        document.body.innerHTML = `
            <a href="/plan/documents/drafts">Drafts</a>
            <a href="https://example.com/elsewhere">Elsewhere</a>
        `
        expect(linksOnPage(document, 'http://app.test/plan/documents')).toEqual([
            { name: 'Drafts', path: '/plan/documents/drafts' }
        ])
    })
})
