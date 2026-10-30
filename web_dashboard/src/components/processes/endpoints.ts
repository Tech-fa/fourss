import { apiDelete, apiGet, apiPost, apiPut } from '@/util/api'

interface AuthStore {
    logout: Function
    setLoginState: Function
    renewToken: Function
    state: { token: string | null; expiryDate: number }
    hasPermissions: Function
}

export type ProcessStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'

export const ProcessStatusEnum = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE'
} as const satisfies Record<ProcessStatus, ProcessStatus>

export interface ProcessSummary {
    id: string
    name: string
    code?: string | null
    organizationUnits?: { id: number; name: string }[]
}

export interface ProcessLinkSummary {
    id: string | number
    name: string
}

export interface ProcessOwner {
    id: string
    fname: string
    lname: string
    email: string
}

export interface Process {
    id: string
    name: string
    code: string | null
    description: string | null
    inputs: string | null
    outputs: string | null
    sequenceOrder: number | null
    monitoringCriteria: string | null
    measurementMethods: string | null
    performanceTargets: string | null
    resources: string | null
    ownerUserId: string | null
    owner: ProcessOwner | null
    authority: string | null
    evaluationAndChanges: string | null
    improvementNotes: string | null
    status: ProcessStatus
    organizationUnits?: { id: number; name: string }[]
    createdBy: ProcessOwner | null
    createdAt: number
    updatedAt: number
}

export interface ProcessListResponse {
    data: Process[]
    total: number
    page: number
    limit: number
    lastPage: number
}

export type CreateProcessPayload = {
    name: string
    code?: string | null
    description?: string | null
    inputs?: string | null
    outputs?: string | null
    sequenceOrder?: number | null
    monitoringCriteria?: string | null
    measurementMethods?: string | null
    performanceTargets?: string | null
    resources?: string | null
    ownerUserId?: string | null
    authority?: string | null
    evaluationAndChanges?: string | null
    improvementNotes?: string | null
    riskAssessmentIds?: number[]
    ofiIds?: string[]
    nonConformityIds?: string[]
    documentIds?: string[]
    performanceIndicatorIds?: string[]
    objectiveIds?: string[]
    interactingProcessIds?: string[]
    organizationUnits?: { id: number | string }[]
    status?: ProcessStatus
}

export type UpdateProcessPayload = Partial<CreateProcessPayload>

export const PROCESSES_ERROR_I18N_PREFIX = 'errors.processes'

export const getProcesses = (
    authStore: AuthStore,
    filters?: {
        page?: number
        limit?: number
        perPage?: number
        search?: string
        status?: string
        interactingWithProcessId?: string
        organizationUnitId?: number | string
    }
) => {
    const params = new URLSearchParams()
    if (filters?.page) params.set('page', String(filters.page))
    const limit = filters?.limit ?? filters?.perPage
    if (limit) params.set('limit', String(limit))
    if (filters?.search) params.set('search', filters.search)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.interactingWithProcessId) {
        params.set('interactingWithProcessId', filters.interactingWithProcessId)
    }
    if (filters?.organizationUnitId) {
        params.set('organizationUnitId', String(filters.organizationUnitId))
    }
    const query = params.toString()
    return apiGet<ProcessListResponse>(`/processes${query ? `?${query}` : ''}`, authStore)
}

export const getProcessOptions = (
    authStore: AuthStore,
    filters?: { search?: string; excludeId?: string }
) => {
    const params = new URLSearchParams()
    if (filters?.search) params.set('search', filters.search)
    if (filters?.excludeId) params.set('excludeId', filters.excludeId)
    const query = params.toString()
    return apiGet<ProcessSummary[]>(`/processes/options${query ? `?${query}` : ''}`, authStore)
}

export const getProcess = (id: string, authStore: AuthStore) =>
    apiGet<Process>(`/processes/${id}`, authStore)

export const createProcess = (data: CreateProcessPayload, authStore: AuthStore) =>
    apiPost<Process>('/processes', data, authStore)

export const updateProcess = (id: string, data: UpdateProcessPayload, authStore: AuthStore) =>
    apiPut<Process>(`/processes/${id}`, data, authStore)

export const appendProcessLinks = (
    processId: string,
    payload: Pick<UpdateProcessPayload, 'ofiIds' | 'riskAssessmentIds' | 'interactingProcessIds'>,
    authStore: AuthStore
) => apiPost<Process>(`/processes/${processId}/links`, payload, authStore)

export const deleteProcess = (id: string, authStore: AuthStore) =>
    apiDelete(`/processes/${id}`, authStore)

export type ProcessChartNodeType =
    | 'input'
    | 'action'
    | 'decision'
    | 'control'
    | 'record'
    | 'output'

export interface ProcessChartNode {
    id: string
    type: ProcessChartNodeType
    label: string
    description: string | null
    positionX: number
    positionY: number
    linkedProcessId: string | null
    linkedProcess: ProcessSummary | null
}

export interface ProcessChartEdge {
    id: string
    fromNodeId: string
    toNodeId: string
    label: string | null
}

export interface ProcessChart {
    processId: string
    nodes: ProcessChartNode[]
    edges: ProcessChartEdge[]
    updatedAt: number | null
}

export type UpsertProcessChartPayload = {
    nodes: Array<{
        id: string
        type: ProcessChartNodeType
        label: string
        description?: string | null
        positionX: number
        positionY: number
        linkedProcessId?: string | null
    }>
    edges: Array<{
        id: string
        fromNodeId: string
        toNodeId: string
        label?: string | null
    }>
}

export const getProcessChart = (processId: string, authStore: AuthStore) =>
    apiGet<ProcessChart>(`/processes/${processId}/chart`, authStore)

export const saveProcessChart = (
    processId: string,
    data: UpsertProcessChartPayload,
    authStore: AuthStore
) => apiPut<ProcessChart>(`/processes/${processId}/chart`, data, authStore)

export type ProcessAssistMessage = {
    role: 'user' | 'assistant'
    content: string
}

export type ProcessAssistObject = {
    id: string | null
    isUpdate: boolean
    name: string
    code: string | null
    description: string | null
    inputs: string | null
    outputs: string | null
    sequenceOrder: number | null
    monitoringCriteria: string | null
    measurementMethods: string | null
    performanceTargets: string | null
    resources: string | null
    authority: string | null
    evaluationAndChanges: string | null
    improvementNotes: string | null
    status: ProcessStatus | null
    isoStandards: string[]
    explanation: string
}

export type ProcessAssistResponse = {
    model: string
    message: string
    objects: ProcessAssistObject[]
}

export const assistProcesses = (
    data: {
        prompt: string
        model?: string
        messages?: ProcessAssistMessage[]
        extraContext?: unknown
    },
    authStore: AuthStore
) => apiPost<ProcessAssistResponse>('/processes/agent/assist', data, authStore)
