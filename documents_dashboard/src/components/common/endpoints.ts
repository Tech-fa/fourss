import { apiDelete, apiGet, apiPost, apiPostFormData, apiPut } from '@/util/api'
import type {
    AuthStore,
    ImmediateActionChecklistResponse,
    OrganizationUnit,
    User
} from '@/util/interfaces'

export const IMMEDIATE_ACTION_ERROR_I18N_PREFIX = 'errors.immediate_action' as const

export const usesNestedImmediateActionRoutes = (parent: string) =>
    parent === 'universal-controls' || parent.startsWith('risks/assessments/')

export const immediateActionItemPath = (
    parent: string,
    actionId: string,
    parentId?: string
) => {
    if (usesNestedImmediateActionRoutes(parent) && parentId) {
        return `/${parent}/${parentId}/immediate-actions/${actionId}`
    }
    return `/${parent}/immediate-actions/${actionId}`
}

export const immediateActionEvidenceUploadPath = (
    parent: string,
    actionId: string,
    parentId?: string
) => {
    if (usesNestedImmediateActionRoutes(parent) && parentId) {
        return `/${parent}/${parentId}/immediate-actions/${actionId}/evidence`
    }
    return `/${parent}/immediate-actions/${actionId}/evidence`
}

export const immediateActionEvidenceDeletePath = (
    parent: string,
    evidenceId: string,
    parentId?: string,
    actionId?: string
) => {
    if (usesNestedImmediateActionRoutes(parent) && parentId && actionId) {
        return `/${parent}/${parentId}/immediate-actions/${actionId}/evidence/${evidenceId}`
    }
    return `/${parent}/immediate-action-evidence/${evidenceId}`
}

export const immediateActionChecklistPath = (
    parent: string,
    actionId: string,
    parentId?: string
) => {
    if (usesNestedImmediateActionRoutes(parent) && parentId) {
        return `/${parent}/${parentId}/immediate-actions/${actionId}/checklist`
    }
    return `/${parent}/immediate-actions/${actionId}/checklist`
}

export const immediateActionCommentCreatePath = (
    parent: string,
    actionId: string,
    parentId?: string
) => {
    if (usesNestedImmediateActionRoutes(parent) && parentId) {
        return `/${parent}/${parentId}/immediate-actions/${actionId}/comments`
    }
    return `/${parent}/immediate-actions/${actionId}/comments`
}

export const immediateActionCommentDeletePath = (
    parent: string,
    commentId: string,
    parentId?: string,
    actionId?: string
) => {
    if (usesNestedImmediateActionRoutes(parent) && parentId && actionId) {
        return `/${parent}/${parentId}/immediate-actions/${actionId}/comments/${commentId}`
    }
    return `/${parent}/immediate-action-comments/${commentId}`
}

export const getImmediateActionChecklist = async (
    actionId: string,
    parent: string,
    authStore: AuthStore,
    parentId?: string
) =>
    apiGet<ImmediateActionChecklistResponse>(
        immediateActionChecklistPath(parent, actionId, parentId),
        authStore
    )

export const signOffImmediateActionChecklist = async (
    actionId: string,
    parent: string,
    authStore: AuthStore,
    payload: {
        answers: { questionId: string; answer?: string }[]
        signatureName: string
        signatureFile: File
        files?: { questionId: string; file: File }[]
    },
    parentId?: string
) => {
    const path = `${immediateActionChecklistPath(parent, actionId, parentId)}/sign-off`
    const formData = new FormData()
    formData.append('answers', JSON.stringify(payload.answers))
    formData.append('signatureName', payload.signatureName)
    formData.append('signature', payload.signatureFile)
    for (const entry of payload.files ?? []) {
        formData.append(`question_${entry.questionId}`, entry.file)
    }
    return apiPostFormData<ImmediateActionChecklistResponse>(path, formData, authStore)
}

export const getMySignature = async (authStore: AuthStore) =>
    apiGet<{ imageUrl: string | null }>('/users/profile/signature', authStore)

export const saveMySignature = async (file: File, authStore: AuthStore) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiPostFormData<{ imageUrl: string }>('/users/profile/signature', formData, authStore)
}

export const getOrgUnits = async (subject: string, authStore: AuthStore) => {
    const teams = await apiPost<OrganizationUnit[]>(
        'permissions/teams/user',
        {
            subject
        },
        authStore
    )
    return teams
}

export const createImmediateAction = async (
    data: any,
    authStore: AuthStore,
    parent: string,
    parentId: string
) => {
    return apiPost(`/${parent}/${parentId}/immediate-actions`, data, authStore)
}

export const getAllImmediateActions = async (
    parent: string,
    parentId: string,
    authStore: AuthStore,
    filters?: {
        assigneeId?: string
        assigned_to_id?: string
        created_in_last_days?: number
    }
) => {
    const params: Record<string, string | number> = {}
    const assigneeId = filters?.assigneeId ?? filters?.assigned_to_id
    if (assigneeId) {
        params.assigneeId = assigneeId
    }
    if (filters?.created_in_last_days && filters.created_in_last_days > 0) {
        params.created_in_last_days = filters.created_in_last_days
    }
    return apiGet(`/${parent}/${parentId}/immediate-actions`, authStore, params)
}

export const deleteImmediateActionEvidence = async (
    id: string,
    parent: string,
    authStore: AuthStore,
    options?: { parentId?: string; actionId?: string }
) =>
    apiDelete(
        immediateActionEvidenceDeletePath(parent, id, options?.parentId, options?.actionId),
        authStore
    )

export const getImmediateAction = async (id: string, parent: string, authStore: AuthStore) => {
    return apiGet(`/${parent}immediate-actions/${id}`, authStore)
}

export const updateImmediateAction = async (
    id: string,
    data: any,
    parent: string,
    authStore: AuthStore,
    parentId?: string
) => apiPut(immediateActionItemPath(parent, id, parentId), data, authStore)

export const deleteImmediateAction = async (
    id: string,
    parent: string,
    authStore: AuthStore,
    parentId?: string
) => apiDelete(immediateActionItemPath(parent, id, parentId), authStore)

export const updateImmediateActionStatus = async (
    id: string,
    status: string,
    parent: string,
    authStore: AuthStore
) => {
    return apiPut(`/${parent}/immediate-actions/${id}/status`, { status }, authStore)
}

export const uploadImmediateActionEvidence = async (
    immediateActionId: string,
    file: File,
    parent: string,
    authStore: AuthStore,
    parentId?: string
) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiPost(
        immediateActionEvidenceUploadPath(parent, immediateActionId, parentId),
        formData,
        authStore
    )
}

export const createImmediateActionComment = async (
    actionId: string,
    text: string,
    parent: string,
    authStore: AuthStore,
    parentId?: string
) =>
    apiPost(
        immediateActionCommentCreatePath(parent, actionId, parentId),
        { text },
        authStore
    )

export const deleteImmediateActionComment = async (
    commentId: string,
    parent: string,
    authStore: AuthStore,
    options?: { parentId?: string; actionId?: string }
) =>
    apiDelete(
        immediateActionCommentDeletePath(
            parent,
            commentId,
            options?.parentId,
            options?.actionId
        ),
        authStore
    )

export const getUsersWithPermissions = async (
    subject: string,
    authStore: AuthStore,
    options: {
        teamIds?: number[]
        allTeamIds?: boolean
    } = {}
) => {
    const { teamIds = [], allTeamIds = true } = options

    const users = await apiPost<User[]>(
        '/permissions/teams/access',
        {
            teamIds,
            subject,
            allTeamIds
        },
        authStore
    )
    return users
}
