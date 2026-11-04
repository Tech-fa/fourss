/**
 * The open dashboard tab tells the agent which API this UI uses and
 * gives it the login token already stored in localStorage.
 * The token is not copied into the handoff. The agent asks for it while the helper is on.
 */

export const API_ACCESS_DESCRIPTION =
    'Tell the agent which API this app uses and give it the login token from this browser. Returns the OpenAPI document URL, the Swagger URL, and the authorization value stored in localStorage under auth. Look up the operation in the OpenAPI document, then call that API with the authorization header. The value already includes Bearer when the page stored it. This does not submit the page.'

export function browserApiAccess(input: { apiUrl: string; authJson: string | null }) {
    const apiUrl = apiBase(input.apiUrl)
    const authorization = tokenFrom(input.authJson)
    return {
        apiUrl,
        openApiUrl: `${apiUrl}/docs-json`,
        swaggerUrl: `${apiUrl}/docs`,
        authorization
    }
}

function apiBase(apiUrl: string) {
    const trimmed = apiUrl.trim().replace(/\/+$/, '')
    let url: URL
    try {
        url = new URL(trimmed)
    } catch {
        throw new Error('The app API URL is not configured.')
    }
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
        throw new Error('The app API URL is not configured.')
    }
    return url.origin + url.pathname.replace(/\/+$/, '')
}

function tokenFrom(authJson: string | null) {
    let parsed: unknown
    try {
        parsed = JSON.parse(authJson || '')
    } catch {
        throw new Error('Sign in on this tab first. The login token is not in localStorage.')
    }
    const token = parsed && typeof parsed === 'object' && 'token' in parsed ? parsed.token : ''
    if (typeof token !== 'string' || !token.trim()) {
        throw new Error('Sign in on this tab first. The login token is not in localStorage.')
    }
    return token
}
