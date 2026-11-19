import { apiDelete, apiGet, apiPost, apiPut } from '@/util/api'
import type { CreateRootCauseAnalysisDto, NonConformityRiskLevelResponseDTO } from '@/util/interfaces'

export const NON_CONFORMITY_ERROR_I18N_PREFIX = 'errors.non_conformity'

interface AuthStore {
    logout: Function
    setLoginState: Function
    renewToken: Function
    state: { token: string | null; expiryDate: number }
    hasPermissions: Function
}

// Root Cause Analysis APIs
export const createRootCauseAnalysis = async (
    data: CreateRootCauseAnalysisDto,
    authStore: AuthStore
) => {
    return apiPost('/non-conformities/root-cause-analysis', data, authStore)
}

export const getAllRootCauseAnalyses = async (ncId: string, authStore: AuthStore) => {
    return apiGet(`/non-conformities/${ncId}/root-cause-analysis`, authStore)
}

export const updateRootCauseAnalysis = async (id: string, data: any, authStore: AuthStore) => {
    return apiPut(`/non-conformities/root-cause-analysis/${id}`, data, authStore)
}

export const getRootCauseAnalysis = async (id: string, authStore: AuthStore) => {
    return apiGet(`/non-conformities/root-cause-analysis/${id}`, authStore)
}

export const deleteRootCauseAnalysis = async (id: string, authStore: AuthStore) => {
    return apiDelete(`/non-conformities/root-cause-analysis/${id}`, authStore)
}

export const bulkCreateRCAFiveWhySteps = async (data: any, authStore: AuthStore) => {
    return apiPost('/non-conformities/rca-five-why-steps', data, authStore)
}

export const fetchRCAFiveWhySteps = async (rcaId: string, authStore: AuthStore) => {
    return apiGet(`/non-conformities/rca-five-why-steps/${rcaId}`, authStore)
}

// Fishbone Analysis APIs
export const createFishbone = async (ncId: string, data: any, authStore: AuthStore) => {
    return apiPost(`/non-conformities/${ncId}/rca-fishbone`, data, authStore)
}

export const updateFishbone = async (id: string, data: any, authStore: AuthStore) => {
    return apiPut(`/non-conformities/rca-fishbone/${id}`, data, authStore)
}

// Investigation APIs
export const createInvestigation = async (data: any, authStore: AuthStore) => {
    return apiPost('/non-conformities/investigation', data, authStore)
}

export const getAllInvestigations = async (ncId: string, authStore: AuthStore) => {
    return apiGet(`/non-conformities/${ncId}/investigation`, authStore)
}

export const getInvestigation = async (id: string, authStore: AuthStore) => {
    return apiGet(`/non-conformities/investigation/${id}`, authStore)
}

export const updateInvestigation = async (id: string, data: any, authStore: AuthStore) => {
    return apiPut(`/non-conformities/investigation/${id}`, data, authStore)
}

export const deleteInvestigation = async (id: string, authStore: AuthStore) => {
    return apiDelete(`/non-conformities/investigation/${id}`, authStore)
}



export const getAllCorrectiveActions = async (ncId: string, authStore: AuthStore) => {
    return apiGet(`/non-conformities/corrective-actions?nonConformityId=${ncId}`, authStore)
}

/** Close NC via dedicated backend route (not generic PUT /:id). */
export const closeNonConformity = async (
    id: string,
    authStore: AuthStore,
    closingComment?: string
) => {
    const payload: { closingComment?: string } = {}
    if (closingComment && closingComment.trim()) {
        payload.closingComment = closingComment.trim()
    }
    return apiPut(`/non-conformities/${id}/close`, payload, authStore)
}

export const amendNonConformityDueDate = async (
    id: string,
    dueDate: string,
    authStore: AuthStore
) => {
    return apiPut(`/non-conformities/${id}/amend-due-date`, { dueDate }, authStore)
}

// RCA Cause & Effect Category APIs
export const getRcaCeCategories = async (ncId: string, authStore: AuthStore) => {
    return apiGet(`/non-conformities/${ncId}/rca-ce-categories`, authStore)
}

export const bulkSaveRcaCeCategories = async (
    rcaId: string,
    payload: any,
    authStore: AuthStore
) => {
    return apiPost(`/non-conformities/${rcaId}/rca-ce-categories/bulk`, payload, authStore)
}

export const deleteRcaCeCategory = async (categoryId: string, authStore: AuthStore) => {
    return apiDelete(`/non-conformities/rca-ce-categories/${categoryId}`, authStore)
}

// Non-Conformity Risk Level APIs
export const bulkUpsertNonConformityRiskLevels = async (data: NonConformityRiskLevelResponseDTO[], authStore: AuthStore) => {
    return apiPost<NonConformityRiskLevelResponseDTO[]>('/non-conformities/risk-levels/bulk', { riskLevels: data }, authStore)
}
