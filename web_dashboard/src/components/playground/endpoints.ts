import { apiCall, apiDelete, apiGet, apiPost, apiPut, apiPutFormData, renewToken } from '@/util/api'

interface AuthStore {
    logout: Function
    setLoginState: Function
    renewToken: Function
    state: { token: string | null; expiryDate: number }
    hasPermissions: Function
}

export type PlaygroundPublisher = {
    id: string
    fname: string
    lname: string
    name: string
} | null

export type PlaygroundSummary = {
    id: string
    teamId: number
    name: string
    enabled: boolean
    revision: number
    lastPublishedAt: number | null
    publisher: PlaygroundPublisher
    updatedAt: number | null
}

export type PublishedPlayground = {
    id: string
    name: string
    enabled: boolean
    publisher: PlaygroundPublisher
    lastPublishedAt: number | null
}

export type PlaygroundDetail = PlaygroundSummary & {
    source: string
    createdById: string
}

export const listPlaygrounds = (teamId: number, authStore: AuthStore) =>
    apiGet<PlaygroundSummary[]>(`/playgrounds?teamId=${teamId}`, authStore)

export const listPublishedPlaygrounds = (teamId: number, authStore: AuthStore) =>
    apiGet<PublishedPlayground[]>(`/playgrounds/published?teamId=${teamId}`, authStore)

export const createPlayground = (
    data: { name: string; teamId: number },
    authStore: AuthStore
) => apiPost<PlaygroundDetail>('/playgrounds', data, authStore)

export const getPlayground = (id: string, authStore: AuthStore) =>
    apiGet<PlaygroundDetail>(`/playgrounds/${id}`, authStore)

export const deletePlayground = (id: string, authStore: AuthStore) =>
    apiDelete<{ id: string; deleted: boolean }>(`/playgrounds/${id}`, authStore)

export const putPlaygroundSource = (id: string, source: string, authStore: AuthStore) =>
    apiPut<PlaygroundDetail>(`/playgrounds/${id}/source`, { source }, authStore)

export type PlaygroundAppFiles = {
    'index.html': string
    'app.js': string
    'server.js': string
}

export type PlaygroundFileName = keyof PlaygroundAppFiles

export const getPlaygroundApp = (id: string, authStore: AuthStore) =>
    apiGet<PlaygroundAppFiles>(`/playgrounds/${id}/app`, authStore)

export const putPlaygroundFile = (id: string, name: PlaygroundFileName, text: string, authStore: AuthStore) =>
    apiPut<PlaygroundAppFiles>(`/playgrounds/${id}/app/${encodeURIComponent(name)}`, { text }, authStore)

export const runPlaygroundSql = (
    id: string,
    statement: string,
    params: unknown[] | undefined,
    authStore: AuthStore
) => apiPost(`/playgrounds/${id}/sql`, { statement, params: params || [] }, authStore)

export const callPlayground = (id: string, name: string, argument: unknown, authStore: AuthStore) =>
    apiPost(`/playgrounds/${id}/call/${encodeURIComponent(name)}`, { argument }, authStore)

export const callPlaygroundApi = async (
    id: string,
    request: { path: string; method?: string; body?: unknown; file?: Blob },
    authStore: AuthStore
) => {
    const method = String(request.method || 'GET').toUpperCase()
    const url = playgroundApiUrl(id, request.path)
    let data: FormData | unknown
    if (request.file) {
        const form = new FormData()
        if (request.body !== undefined) form.append('body', JSON.stringify(request.body ?? null))
        form.append('file', request.file, request.file instanceof File && request.file.name ? request.file.name : 'attachment')
        data = form
    } else if (method !== 'GET' && method !== 'HEAD') {
        data = request.body ?? null
    }
    try {
        await renewToken(authStore)
        const response = await apiCall.request<Blob>({
            url,
            method,
            data,
            responseType: 'blob',
            headers: { authorization: authStore.state.token }
        })
        return await readApiResponse(response.data, response.headers['content-type'])
    } catch (error) {
        await readBlobError(error)
        const message = (error as { message?: string })?.message || ''
        if (message.includes('401') || message.includes('403')) authStore.logout()
        throw error
    }
}

function playgroundApiUrl(id: string, path: string) {
    const clean = String(path || '/').split('#')[0]
    const queryAt = clean.indexOf('?')
    const pathname = queryAt >= 0 ? clean.slice(0, queryAt) : clean
    const search = queryAt >= 0 ? clean.slice(queryAt) : ''
    const parts = pathname.split('/').filter(Boolean).map((part) => encodeURIComponent(part))
    return `/playgrounds/${encodeURIComponent(id)}/api${parts.length ? `/${parts.join('/')}` : ''}${search}`
}

async function readApiResponse(data: Blob, contentType: unknown) {
    const type = String(contentType || '')
    if (type.includes('json') || type.startsWith('text/')) {
        const text = await data.text()
        if (!text) return null
        if (type.includes('json')) return JSON.parse(text) as unknown
        return text
    }
    return data
}

export const fetchPlaygroundPath = (
    id: string,
    path: string,
    method: string | undefined,
    body: unknown,
    authStore: AuthStore
) => apiPost(`/playgrounds/${id}/fetch`, { path, method: method || 'GET', body }, authStore)

export const readPlaygroundFile = async (id: string, name: string, authStore: AuthStore) => {
    try {
        return await apiGet<Blob>(`/playgrounds/${id}/file`, authStore, { name }, 'blob')
    } catch (error) {
        await readBlobError(error)
        throw error
    }
}

export const writePlaygroundFile = (id: string, name: string, file: Blob, authStore: AuthStore) => {
    const form = new FormData()
    form.append('name', name)
    form.append('file', file, file instanceof File && file.name ? file.name : 'attachment')
    return apiPutFormData<{ name: string }>(`/playgrounds/${id}/file`, form, authStore)
}

async function readBlobError(error: unknown) {
    const response = (error as { response?: { data?: unknown } })?.response
    if (!response || !(response.data instanceof Blob)) return
    const text = await response.data.text()
    try {
        response.data = text ? JSON.parse(text) : { message: '' }
    } catch {
        response.data = { message: text }
    }
}

export const publishPlayground = (id: string, authStore: AuthStore) =>
    apiPost<PlaygroundDetail>(`/playgrounds/${id}/publish`, {}, authStore)

export const setPlaygroundEnabled = (id: string, enabled: boolean, authStore: AuthStore) =>
    apiPost<PlaygroundDetail>(`/playgrounds/${id}/enabled`, { enabled }, authStore)

export const resolvePlaygroundTarget = (
    id: string,
    entityType: string,
    entityId: string,
    authStore: AuthStore
) =>
    apiGet(`/playgrounds/${id}/resolve`, authStore, { entityType, entityId })

export const readEntitySchema = (entity: string | undefined, authStore: AuthStore) =>
    apiGet(entity ? `/playgrounds/schema/${encodeURIComponent(entity)}` : '/playgrounds/schema', authStore)

export const readEntityQuery = (query: Record<string, unknown>, authStore: AuthStore) =>
    apiPost('/playgrounds/query', query, authStore)

export const listPlaygroundTargets = (
    id: string,
    entityType: string,
    authStore: AuthStore,
    query: { limit?: number; cursor?: string } = {}
) => apiGet(`/playgrounds/${id}/list`, authStore, { entityType, ...query })

export const createPlaygroundRecord = (
    id: string,
    body: Record<string, unknown>,
    authStore: AuthStore
) => apiPost(`/playgrounds/${id}/records`, body, authStore)

export const deletePlaygroundRecord = (id: string, recordId: string, authStore: AuthStore) =>
    apiDelete(`/playgrounds/${id}/records/${recordId}`, authStore)
