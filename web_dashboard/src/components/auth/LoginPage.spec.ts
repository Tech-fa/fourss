import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import LoginPage from './LoginPage.vue'

const routeQuery: Record<string, string> = {}
const replace = vi.fn()

vi.mock('vue-router', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace,
        currentRoute: { value: { query: routeQuery } },
    }),
}))

vi.mock('@/util/api', () => ({
    apiPostPublic: vi.fn(),
    apiCall: { patch: vi.fn().mockResolvedValue({}) },
}))

function encodeBase64Url(value: string) {
    const bytes = new TextEncoder().encode(value)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function jwt(payload: object) {
    const part = (value: object) =>
        btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    return `${part({ alg: 'none', typ: 'JWT' })}.${part(payload)}.sig`
}

function mountLogin() {
    return mount(LoginPage, {
        global: {
            plugins: [createPinia(), i18n],
            stubs: {
                Form: true,
                AppInputForm: true,
                AppButton: true,
                Select2: true,
                RouterLink: true,
            },
        },
    })
}

describe('login token handoff', () => {
    beforeEach(() => {
        for (const key of Object.keys(routeQuery)) delete routeQuery[key]
        replace.mockClear()
        window.localStorage.clear()
    })

    it('stores the login response in localStorage auth and opens the redirect', () => {
        const accessToken = jwt({ exp: 1_900_000_000 })
        routeQuery.token = encodeBase64Url(JSON.stringify({
            access_token: accessToken,
            user: {
                id: 'user-1',
                email: 'ada@example.com',
                fname: 'Ada',
                lname: 'Lovelace',
                permissions: [{ subject: 'documents', action: 'read' }],
                teams: [],
                locale: 'en',
            },
        }))
        routeQuery.redirect = '/plan/documents'

        mountLogin()

        const stored = JSON.parse(window.localStorage.getItem('auth') || '{}')
        expect(stored.isLoggedIn).toBe(true)
        expect(stored.token).toBe(`Bearer ${accessToken}`)
        expect(stored.userDetails.email).toBe('ada@example.com')
        expect(stored.expiryDate).toBe(1_900_000_000)
        expect(replace).toHaveBeenCalledWith('/plan/documents')
    })

    it('leaves the login form in place when the token is not a session', () => {
        routeQuery.token = encodeBase64Url(JSON.stringify({ nope: true }))

        const wrapper = mountLogin()

        expect(window.localStorage.getItem('auth')).toBeNull()
        expect(wrapper.get('#login-page').exists()).toBe(true)
        expect(replace).toHaveBeenCalledWith({ name: 'Login', query: {} })
    })
})
