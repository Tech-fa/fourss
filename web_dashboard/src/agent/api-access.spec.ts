import { describe, expect, it } from 'vitest'
import { browserApiAccess } from './api-access'

const auth = JSON.stringify({
    token: 'Bearer browser-token',
    isLoggedIn: true,
    userDetails: { email: 'person@example.com' }
})

describe('api_access', () => {
    it('names the swagger document and returns the localStorage token', () => {
        expect(browserApiAccess({ apiUrl: 'http://127.0.0.1:3012/', authJson: auth })).toEqual({
            apiUrl: 'http://127.0.0.1:3012',
            openApiUrl: 'http://127.0.0.1:3012/docs-json',
            swaggerUrl: 'http://127.0.0.1:3012/docs',
            authorization: 'Bearer browser-token'
        })
    })

    it('does not invent a token when the browser is signed out', () => {
        expect(() => browserApiAccess({ apiUrl: 'http://127.0.0.1:3012', authJson: '{}' })).toThrow(/localStorage/)
        expect(() => browserApiAccess({ apiUrl: 'not a url', authJson: auth })).toThrow(/not configured/)
    })
})
