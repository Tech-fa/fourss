export interface LoginHandoff {
    access_token: string
    user: Record<string, unknown> & { locale?: 'en' | 'ar' | 'fr' }
}

export function decodeLoginToken(value: string): LoginHandoff | null {
    try {
        const parsed = JSON.parse(decodeBase64Url(value.trim()))
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
        const accessToken = (parsed as { access_token?: unknown }).access_token
        const user = (parsed as { user?: unknown }).user
        if (typeof accessToken !== 'string' || !accessToken) return null
        if (!user || typeof user !== 'object' || Array.isArray(user)) return null
        return {
            access_token: accessToken,
            user: user as LoginHandoff['user'],
        }
    } catch {
        return null
    }
}

export function dashboardRedirect(value: unknown, fallback = '/plan/documents') {
    const raw = Array.isArray(value) ? value[0] : value
    if (typeof raw !== 'string') return fallback
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || raw.includes('://')) return fallback
    return raw
}

function decodeBase64Url(value: string) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const pad = (4 - (normalized.length % 4)) % 4
    const binary = atob(normalized + '='.repeat(pad))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
}
