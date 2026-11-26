import { describe, expect, it } from 'vitest'
import { dashboardRedirect, decodeLoginToken } from './session-handoff'

function encodeBase64Url(value: string) {
    const bytes = new TextEncoder().encode(value)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

describe('login token handoff', () => {
    it('reads the login response from a base64url token', () => {
        const token = encodeBase64Url(JSON.stringify({
            access_token: 'jwt',
            user: { id: '1', email: 'ada@example.com', fname: 'Adèle' },
        }))

        expect(decodeLoginToken(token)).toEqual({
            access_token: 'jwt',
            user: { id: '1', email: 'ada@example.com', fname: 'Adèle' },
        })
    })

    it('rejects a token that is not a login response', () => {
        expect(decodeLoginToken('not-base64')).toBeNull()
        expect(decodeLoginToken(encodeBase64Url(JSON.stringify({ user: { id: '1' } })))).toBeNull()
        expect(decodeLoginToken(encodeBase64Url('[]'))).toBeNull()
    })

    it('keeps an in-app redirect and drops an off-site one', () => {
        expect(dashboardRedirect('/plan/documents')).toBe('/plan/documents')
        expect(dashboardRedirect(['/plan/documents'])).toBe('/plan/documents')
        expect(dashboardRedirect('https://example.com')).toBe('/plan/documents')
        expect(dashboardRedirect('//example.com')).toBe('/plan/documents')
        expect(dashboardRedirect(undefined)).toBe('/plan/documents')
    })
})
