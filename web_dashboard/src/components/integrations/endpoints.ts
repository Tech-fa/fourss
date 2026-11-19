import { apiGet, apiPost } from '@/util/api'

interface AuthStore {
    logout: Function
    setLoginState: Function
    renewToken: Function
    state: { token: string | null; expiryDate: number }
    hasPermissions: Function
}

export type IntegrationSummary = {
    id: string
    name: string
    status: string
    updatedAt: number
}

export type IntegrationField = {
    key: string
    label: string
    description: string
    required: boolean
    secret: boolean
    filled: boolean
    value?: string
}

export type IntegrationStep = {
    id: string
    title: string
    instruction: string
    link: { label: string; url: string } | null
    fields: string[]
    doneWhen: 'manual' | 'fields_saved'
    copy: { kind: string; key?: string } | null
    copyValue: string | null
    done: boolean
}

export type IntegrationDetail = {
    id: string
    name: string
    status: string
    pageHtml: string
    pageJs: string
    hookBase: string
    inputs: IntegrationField[]
    steps: IntegrationStep[]
    otherKeys: string[]
    latestFailure: { hook: string; message: string; createdAt: number } | null
}

export function listIntegrations(auth: AuthStore) {
    return apiGet<IntegrationSummary[]>('integrations', auth)
}

export function createIntegration(name: string, auth: AuthStore) {
    return apiPost<IntegrationDetail>('integrations', { name }, auth)
}

export function readIntegration(id: string, auth: AuthStore) {
    return apiGet<IntegrationDetail>(`integrations/${id}`, auth)
}

export function saveIntegrationValues(id: string, values: Record<string, string>, stepId: string | undefined, auth: AuthStore) {
    return apiPost<IntegrationDetail>(`integrations/${id}/values`, { values, stepId }, auth)
}

export function markIntegrationStep(id: string, stepId: string, auth: AuthStore) {
    return apiPost<IntegrationDetail>(`integrations/${id}/steps/${stepId}/done`, {}, auth)
}

export function callIntegration(id: string, path: string, method: string, body: unknown, auth: AuthStore) {
    return apiPost<unknown>(`integrations/${id}/call`, { path, method, body }, auth)
}

export function setIntegrationStatus(id: string, status: string, auth: AuthStore) {
    return apiPost<IntegrationDetail>(`integrations/${id}/status`, { status }, auth)
}
