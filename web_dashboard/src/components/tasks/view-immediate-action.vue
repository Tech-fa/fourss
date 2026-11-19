<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs" />

        <main id="main-content" class="flex-1 p-6">
            <h2 class="text-2xl font-bold mb-6">{{ t('tasks.immediateActionView.pageTitle') }}</h2>
            <div v-if="immediateAction" class="mb-6">
                <div class="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm text-neutral-600 mb-1">{{
                                t('tasks.immediateActionView.labelStatus')
                            }}</label>
                            <p class="text-neutral-900">
                                <span
                                    class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
                                    :class="immediateActionStatusClass(immediateAction.status)"
                                    test-id="immediate-action-status"
                                >
                                    {{ immediateActionStatusLabel(immediateAction.status) }}
                                </span>
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm text-neutral-600 mb-1">{{
                                t('tasks.immediateActionView.labelAssignedTo')
                            }}</label>
                            <p class="text-neutral-900">
                                {{ immediateAction.assignedTo?.fname }}
                                {{ immediateAction.assignedTo?.lname }}
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm text-neutral-600 mb-1">{{
                                t('tasks.immediateActionView.labelDueDate')
                            }}</label>
                            <p class="text-neutral-900">
                                {{
                                    immediateAction.dueDate
                                        ? formatDateToDay(immediateAction.dueDate)
                                        : t('immediateActions.notApplicable')
                                }}
                            </p>
                        </div>
                    </div>
                    <div class="mt-4">
                        <label class="block text-sm text-neutral-600 mb-1">{{
                            t('tasks.immediateActionView.labelDescription')
                        }}</label>
                        <p class="text-neutral-700">
                            {{
                                immediateAction.description || t('tasks.immediateActionView.noDescription')
                            }}
                        </p>
                    </div>

                    <div
                        class="mt-4"
                        v-if="
                            immediateAction?.rejectionExplanation &&
                            immediateAction?.status === ImmediateActionStatus.REJECTED
                        "
                    >
                        <label class="block text-sm text-neutral-600 mb-1">{{
                            t('tasks.immediateActionView.rejectionReason')
                        }}</label>
                        <div class="bg-red-50 border border-red-200 rounded-md p-3">
                            <p class="text-red-800">{{ immediateAction.rejectionExplanation }}</p>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 mt-4">
                        <Can :subject="permissionSubject" :actions="['update', 'update_own']">
                            <AppButton
                                v-if="
                                    isAssignedToCurrentUser &&
                                    !isChecklistAction &&
                                    hasNewEvidenceSinceApplied &&
                                    (immediateAction.status === ImmediateActionStatus.OPEN ||
                                        immediateAction.status === ImmediateActionStatus.REJECTED)
                                "
                                :warn-before="t('immediateActions.warnApply')"
                                buttonStyle="secondary"
                                :loading="applyLoading"
                                :disabled="uploading"
                                @click="
                                    handleStatusChange(
                                        immediateAction,
                                        ImmediateActionStatus.READY_FOR_VERIFICATION
                                    )
                                "
                            >
                                {{ t('immediateActions.readyForVerification') }}
                            </AppButton>
                        </Can>
                        <template
                            v-if="
                                isCreatedByCurrentUser &&
                                immediateAction.status === ImmediateActionStatus.READY_FOR_VERIFICATION
                            "
                        >
                            <Can :subject="permissionSubject" :actions="['update']">
                                <AppButton
                                    buttonStyle="primary"
                                    :loading="verifyLoading"
                                    :disabled="rejectionLoading"
                                    :warn-before="t('immediateActions.warnVerify')"
                                    @click="verifyAction"
                                >
                                    {{ t('immediateActions.verify') }}
                                </AppButton>
                            </Can>
                            <Can :subject="permissionSubject" :actions="['update']">
                                <AppButton
                                    buttonStyle="danger"
                                    :loading="rejectionLoading"
                                    :disabled="verifyLoading"
                                    @click="openRejectModal"
                                >
                                    {{ t('immediateActions.reject') }}
                                </AppButton>
                            </Can>
                        </template>
                    </div>
                </div>

                <div class="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg text-neutral-900">{{ t('tasks.immediateActionView.evidenceTitle') }}</h3>
                        <Can :subject="permissionSubject" :actions="['update', 'update_own']">
                            <div
                                v-if="
                                    isChecklistAction &&
                                    isAssignedToCurrentUser &&
                                    (immediateAction?.status === ImmediateActionStatus.OPEN ||
                                        immediateAction?.status === ImmediateActionStatus.REJECTED)
                                "
                            >
                                <AppButton buttonStyle="primary" @click="openFillChecklistModal">
                                    <i class="fa-solid fa-clipboard-check mr-2"></i>
                                    {{ t('immediateActions.answerChecklist') }}
                                </AppButton>
                            </div>

                            <div
                                v-else-if="showUploadSection"
                                class="flex items-center gap-2"
                            >
                                <input
                                    type="file"
                                    ref="fileInput"
                                    @change="handleFileChange"
                                    accept="*/*"
                                    class="hidden"
                                    :disabled="uploading"
                                />
                                <AppButton
                                    buttonStyle="primary"
                                    @click="() => fileInput?.click()"
                                    :disabled="uploading"
                                >
                                    <i class="fa-solid fa-plus mr-2"></i>
                                    {{
                                        uploading
                                            ? t('tasks.uploading')
                                            : t('tasks.immediateActionView.addEvidence')
                                    }}
                                </AppButton>
                            </div>
                        </Can>
                    </div>

                    <div v-if="isChecklistAction" class="text-center py-8">
                        <i
                            class="fa-solid text-4xl mb-2"
                            :class="immediateAction.checklistSignedAt ? 'fa-circle-check text-green-500' : 'fa-clipboard-list text-neutral-300'"
                        ></i>
                        <p v-if="!immediateAction.checklistSignedAt" class="text-neutral-500">
                            {{ t('immediateActions.checklistNotAnswered') }}
                        </p>
                    </div>
                    <div
                        v-if="immediateAction.evidences && immediateAction.evidences.length > 0"
                        class="space-y-2"
                        :class="isChecklistAction ? 'mt-4' : ''"
                    >
                        <div
                            v-for="evidence in immediateAction.evidences"
                            :key="evidence.id"
                            class="flex items-center justify-between gap-3 p-3 bg-neutral-50 rounded border border-neutral-200"
                            test-id="immediate-action-evidence"
                        >
                            <div class="min-w-0">
                                <div class="truncate text-neutral-900">
                                    {{ evidenceDisplayName(evidence.filename) }}
                                </div>
                                <div class="flex items-center space-x-2 text-xs text-neutral-500 mt-1">
                                    <span>{{ formatDateToDay(evidence.createdAt) }}</span>
                                    <span
                                        >{{ t('tasks.immediateActionView.evidenceBy') }}
                                        {{ evidence.createdBy?.fname }} {{ evidence.createdBy?.lname }}</span
                                    >
                                </div>
                            </div>
                            <Can
                                :subjects="evidenceDownloadSubjects"
                                :actions="['read', 'read_own', 'update', 'update_own']"
                            >
                                <a
                                    class="inline-flex shrink-0 items-center gap-1 text-sm px-3 py-1 rounded border border-neutral-300 text-neutral-900 hover:bg-neutral-200 transition"
                                    :href="evidenceDownloadHref(evidence.filename)"
                                    :download="evidenceDisplayName(evidence.filename)"
                                    target="_blank"
                                    rel="noopener"
                                    test-id="immediate-action-evidence-download"
                                >
                                    <i class="fa-solid fa-download"></i>
                                    {{ t('tasks.immediateActionView.downloadEvidence') }}
                                </a>
                            </Can>
                        </div>
                    </div>
                    <div v-else-if="!isChecklistAction" class="text-center py-8">
                        <i class="fa-regular fa-folder-open text-4xl text-neutral-300 mb-2"></i>
                        <p class="text-neutral-500">{{ t('tasks.immediateActionView.noEvidenceYet') }}</p>
                    </div>
                </div>

                <Comments
                    :comments-count="mappedComments.length"
                    :comments="mappedComments"
                    :loading="commentLoading"
                    @post-comment="postComment"
                    @on-delete="deleteComment"
                />
            </div>

            <div v-else>
                <div class="flex justify-center items-center h-full">
                    <Spinner width="5" />
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import BreadCrums from '../breadCrums.vue'
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '../AppButton.vue'
import Spinner from '../Spinner.vue'
import { apiGet, apiPut } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { formatDateToDay, snakeToCamelCase, formatApiErrorMessage } from '@/util/util'
import Can from '../Can.vue'
import { ImmediateActionEvidenceType, ImmediateActionStatus } from '@/util/interfaces'

import { useToast } from '@/stores/notification'
import { getRuntimeConfig } from '@/util/runtime-config'
import {
    uploadImmediateActionEvidence,
    createImmediateActionComment,
    deleteImmediateActionComment,
    IMMEDIATE_ACTION_ERROR_I18N_PREFIX,
    immediateActionItemPath,
    usesNestedImmediateActionRoutes
} from '../common/endpoints'
import { useDialog } from '@/stores/dialog'
import RejectEvidenceModal from '../non-conformities/RejectEvidenceModal.vue'
import Comments from '../knowledge/Comments.vue'
import type { ImmediateActionCommentResponseDTO } from '@/util/interfaces'
import { ImmediateActionCommentType } from '@/util/interfaces'

type ImmediateActionParentType = 'nc' | 'ofi' | 'universalControl' | 'risk' | 'managementReviewMeeting'

interface ImmediateActionResponse {
    id: string
    parentEntityId: string
    parentType?: ImmediateActionParentType
    description: string
    assignedTo?: { id: string; fname: string; lname: string }
    createdBy?: { id: string; fname: string; lname: string }
    dueDate?: number
    status: ImmediateActionStatus
    evidenceType?: ImmediateActionEvidenceType
    verifiedBy?: { id: string; fname: string; lname: string }
    verifiedAt?: number
    closedAt?: number
    appliedAt?: number
    rejectionExplanation?: string
    createdAt: number
    evidences: Array<{
        id: string
        filename: string
        createdAt: number
        createdBy?: { id: string; fname: string; lname: string }
    }>
    comments?: ImmediateActionCommentResponseDTO[]
    checklistDocumentId?: string
    checklistDocument?: { id: string; title: string; documentCode?: string }
    checklistSignedAt?: number
}

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const dialogStore = useDialog()
const { t, te } = useI18n()

function immediateActionStatusLabel(status: string | undefined) {
    if (!status) return ''
    const key = `immediateActions.status.${status}`
    return te(key) ? t(key) : snakeToCamelCase(status)
}

function immediateActionStatusClass(status: string | undefined) {
    switch (status) {
        case ImmediateActionStatus.OPEN:
            return 'bg-blue-100 text-blue-800'
        case ImmediateActionStatus.READY_FOR_VERIFICATION:
            return 'bg-amber-100 text-amber-900'
        case ImmediateActionStatus.VERIFIED:
            return 'bg-green-100 text-green-800'
        case ImmediateActionStatus.REJECTED:
            return 'bg-red-100 text-red-800'
        default:
            return 'bg-neutral-100 text-neutral-800'
    }
}

function evidenceDisplayName(filename: string) {
    const base = filename.split('/').pop() || filename
    const parts = base.split('_')
    return parts.length > 1 ? parts.slice(1).join('_') : base
}

function evidenceDownloadHref(filename: string) {
    if (/^https?:\/\//i.test(filename)) return filename
    const base = getRuntimeConfig().apiUrl.replace(/\/$/, '')
    return `${base}/files/${encodeURIComponent(filename)}`
}

function toastMessageForIaStatus(status: ImmediateActionStatus): string {
    switch (status) {
        case ImmediateActionStatus.READY_FOR_VERIFICATION:
            return t('immediateActions.toastReadyForVerification')
        case ImmediateActionStatus.VERIFIED:
            return t('immediateActions.toastVerified')
        case ImmediateActionStatus.REJECTED:
            return t('immediateActions.toastRejected')
        default:
            return t('immediateActions.toastUpdated')
    }
}
const id = route.params.id as string
const immediateAction = ref<ImmediateActionResponse>()
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const applyLoading = ref(false)
const buttonLoading = ref(false)
const verifyLoading = ref(false)
const rejectionLoading = ref(false)
const commentLoading = ref(false)

const resolveParentEntity = (action?: ImmediateActionResponse | null) => {
    const parentType =
        action?.parentType ||
        (action?.evidenceType === ImmediateActionEvidenceType.CHECKLIST
            ? 'universalControl'
            : 'nc')

    switch (parentType) {
        case 'universalControl':
            return {
                parentEntity: 'universal-controls',
                parentId: action?.parentEntityId,
                permissionSubject: 'universal_control_immediate_actions'
            }
        case 'ofi':
            return {
                parentEntity: 'opportunities-for-improvement',
                parentId: action?.parentEntityId,
                permissionSubject: 'ofi_immediate_actions'
            }
        case 'managementReviewMeeting':
            return {
                parentEntity: 'management-reviews',
                parentId: action?.parentEntityId,
                permissionSubject: 'management_review_immediate_actions'
            }
        case 'risk':
            return {
                parentEntity: 'risks',
                parentId: action?.parentEntityId,
                permissionSubject: 'risk_immediate_actions'
            }
        case 'nc':
        default:
            return {
                parentEntity: 'non-conformities',
                parentId: action?.parentEntityId,
                permissionSubject: 'immediate_action_evidence'
            }
    }
}

const parentContext = computed(() => resolveParentEntity(immediateAction.value))
const permissionSubject = computed(() => parentContext.value.permissionSubject)
const evidenceDownloadSubjects = computed(() =>
    [...new Set(['immediate_actions', permissionSubject.value])]
)
const parentEntity = computed(() => parentContext.value.parentEntity)
const parentId = computed(() => parentContext.value.parentId)

const crumbs = computed(() => [
    route.query.from === 'monitor'
        ? {
              name: t('monitor.breadcrumb'),
              path: '/monitor',
              icon: 'fa-solid fa-desktop'
          }
        : {
              name: t('tasks.breadcrumb'),
              path: '/tasks',
              icon: 'fa-solid fa-tasks'
          },
    {
        name: t('tasks.immediateActionView.crumbDetail'),
        path: `/tasks/immediate-actions/${id}`
    }
])

const isAssignedToCurrentUser = computed(
    () => immediateAction.value?.assignedTo?.id === authStore.state.userDetails.id
)

const isCreatedByCurrentUser = computed(
    () => immediateAction.value?.createdBy?.id === authStore.state.userDetails.id
)

const isChecklistAction = computed(
    () => immediateAction.value?.evidenceType === ImmediateActionEvidenceType.CHECKLIST
)

const showUploadSection = computed(
    () => isAssignedToCurrentUser.value &&
    (immediateAction.value?.status === ImmediateActionStatus.OPEN ||
        immediateAction.value?.status === ImmediateActionStatus.REJECTED) &&
    !isChecklistAction.value
)

const hasNewEvidenceSinceApplied = computed(() => {
    const lastAppliedAt = immediateAction.value?.appliedAt || 0
    const evidences = immediateAction.value?.evidences || []
    return evidences.some((e) => (e.createdAt || 0) > lastAppliedAt)
})

const mappedComments = computed(() =>
    (immediateAction.value?.comments || []).map((comment) => ({
        id: comment.id,
        fname: comment.createdBy?.fname || '',
        lname: comment.createdBy?.lname || '',
        comment: comment.text,
        createdDate: comment.createdAt,
        type: comment.type,
        canDelete:
            comment.type !== ImmediateActionCommentType.REJECTION &&
            comment.createdBy?.id === authStore.state.userDetails?.id
    }))
)

const actionApiPath = (actionId: string) =>
    immediateActionItemPath(parentEntity.value, actionId, parentId.value)

onMounted(async () => {
    await fetchImmediateAction()
})

const fetchImmediateAction = async () => {
    try {
        const response = await apiGet<ImmediateActionResponse>(
            `/non-conformities/immediate-actions/${id}`,
            authStore
        )
        immediateAction.value = response
    } catch (error: any) {
        console.error('Error fetching immediate action:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, IMMEDIATE_ACTION_ERROR_I18N_PREFIX) ||
                t('tasks.immediateActionView.toastFetchFailed'),
            'error'
        )
        router.push('/tasks')
    }
}

const handleFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (file && immediateAction.value) {
        uploading.value = true
        try {
            await uploadImmediateActionEvidence(
                immediateAction.value.id,
                file,
                parentEntity.value,
                authStore,
                parentId.value
            )
            toast.showToast(
                t('common.success'),
                t('tasks.immediateActionView.toastEvidenceUploaded'),
                'success'
            )
            await fetchImmediateAction()

            if (fileInput.value) {
                fileInput.value.value = ''
            }
        } catch (err: any) {
            toast.showToast(
                t('common.error'),
                formatApiErrorMessage(err?.response?.data, t, IMMEDIATE_ACTION_ERROR_I18N_PREFIX) ||
                    err.message,
                'error'
            )
        } finally {
            uploading.value = false
        }
    }
}

const verifyAction = async () => {
    if (!immediateAction.value) return
    verifyLoading.value = true
    try {
        const payload = { status: ImmediateActionStatus.VERIFIED }
        if (usesNestedImmediateActionRoutes(parentEntity.value)) {
            await apiPut(actionApiPath(immediateAction.value.id), payload, authStore)
        } else {
            await apiPut(`${actionApiPath(immediateAction.value.id)}/status`, payload, authStore)
        }
        toast.showToast(t('common.success'), t('immediateActions.toastVerified'), 'success')
        await fetchImmediateAction()
    } catch (error: any) {
        console.error('Error verifying immediate action:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, IMMEDIATE_ACTION_ERROR_I18N_PREFIX) ||
                t('immediateActions.toastStatusChangeFailed'),
            'error'
        )
    } finally {
        verifyLoading.value = false
    }
}

const handleStatusChange = async (action: ImmediateActionResponse, status: ImmediateActionStatus) => {
    switch (status) {
        case ImmediateActionStatus.VERIFIED:
            verifyLoading.value = true
            break
        case ImmediateActionStatus.READY_FOR_VERIFICATION:
            applyLoading.value = true
            break
        case ImmediateActionStatus.REJECTED:
            buttonLoading.value = true
            break
    }
    
    try {
        const payload = {
            status: status
        }
        if (usesNestedImmediateActionRoutes(parentEntity.value)) {
            await apiPut(actionApiPath(action.id), payload, authStore)
        } else {
            await apiPut(`${actionApiPath(action.id)}/status`, payload, authStore)
        }
        
        toast.showToast(t('common.success'), toastMessageForIaStatus(status), 'success')
        await fetchImmediateAction()
    } catch (error: any) {
        console.error(`Error ${status} immediate action:`, error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, IMMEDIATE_ACTION_ERROR_I18N_PREFIX) ||
                t('immediateActions.toastStatusChangeFailed'),
            'error'
        )
    } finally {
        applyLoading.value = false
        verifyLoading.value = false
        buttonLoading.value = false
    }
}

const openFillChecklistModal = () => {
    if (!immediateAction.value) return

    if (parentEntity.value === 'universal-controls' && parentId.value) {
        router.push({
            path: `/act/controls/${parentId.value}/immediate-actions/${immediateAction.value.id}/checklist`,
            query: { returnTo: route.fullPath }
        })
        return
    }
}

const openRejectModal = () => {
    if (!immediateAction.value) return
    
    dialogStore.openDialog(RejectEvidenceModal, {
        loading: rejectionLoading.value,
        onClose: () => {
            dialogStore.closeDialog()
        },
        onSubmit: async (reason: string) => {
            try {
                rejectionLoading.value = true
                const payload = {
                    id: immediateAction.value!.id,
                    status: ImmediateActionStatus.REJECTED,
                    rejectionExplanation: reason
                }
                await apiPut(actionApiPath(immediateAction.value!.id), payload, authStore)
                toast.showToast(
                    t('common.success'),
                    t('tasks.immediateActionView.toastRejected'),
                    'success'
                )
                dialogStore.closeDialog()
                await fetchImmediateAction()
            } catch (error: any) {
                console.error('Error rejecting immediate action:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error?.response?.data, t, IMMEDIATE_ACTION_ERROR_I18N_PREFIX) ||
                        t('immediateActions.toastRejectFailed'),
                    'error'
                )
            } finally {
                rejectionLoading.value = false
            }
        }
    })
}

const postComment = async (text: string) => {
    if (!immediateAction.value || !text.trim()) return
    try {
        commentLoading.value = true
        await createImmediateActionComment(
            immediateAction.value.id,
            text.trim(),
            parentEntity.value,
            authStore,
            parentId.value
        )
        toast.showToast(
            t('common.success'),
            t('immediateActions.toastCommentCreated'),
            'success'
        )
        await fetchImmediateAction()
    } catch (error: any) {
        console.error('Error posting immediate action comment:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, IMMEDIATE_ACTION_ERROR_I18N_PREFIX) ||
                t('immediateActions.toastCommentFailed'),
            'error'
        )
    } finally {
        commentLoading.value = false
    }
}

const deleteComment = async (commentId: number | string) => {
    if (!immediateAction.value) return
    try {
        commentLoading.value = true
        await deleteImmediateActionComment(String(commentId), parentEntity.value, authStore, {
            parentId: parentId.value,
            actionId: immediateAction.value.id
        })
        toast.showToast(
            t('common.success'),
            t('immediateActions.toastCommentDeleted'),
            'success'
        )
        await fetchImmediateAction()
    } catch (error: any) {
        console.error('Error deleting immediate action comment:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, IMMEDIATE_ACTION_ERROR_I18N_PREFIX) ||
                t('immediateActions.toastCommentDeleteFailed'),
            'error'
        )
    } finally {
        commentLoading.value = false
    }
}
</script>
