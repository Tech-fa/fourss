import { apiDelete, apiGet, apiPost, apiPut } from '@/util/api'

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

export const putPlaygroundSource = (id: string, source: string, authStore: AuthStore) =>
    apiPut<PlaygroundDetail>(`/playgrounds/${id}/source`, { source }, authStore)

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
