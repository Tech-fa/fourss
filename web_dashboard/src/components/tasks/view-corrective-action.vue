<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs" />

        <main id="main-content" class="flex-1 p-6">
            <h2 class="text-2xl font-bold mb-6">{{ t('tasks.correctiveActionView.pageTitle') }}</h2>
            <div v-if="correctiveAction" class="mb-6">
                <div class="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm text-neutral-600 mb-1">{{
                                t('tasks.correctiveActionView.labelTitle')
                            }}</label>
                            <p class="text-neutral-900">{{ correctiveAction.title }}</p>
                        </div>
                        <div>
                            <label class="block text-sm text-neutral-600 mb-1">{{
                                t('tasks.correctiveActionView.labelStatus')
                            }}</label>
                            <p class="text-neutral-900">
                                {{ correctiveActionStatusLabel(correctiveAction.status) }}
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm text-neutral-600 mb-1">{{
                                t('tasks.correctiveActionView.labelAssignedTo')
                            }}</label>
                            <p class="text-neutral-900">
                                {{ correctiveAction.assignedTo?.fname }}
                                {{ correctiveAction.assignedTo?.lname }}
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm text-neutral-600 mb-1">{{
                                t('tasks.correctiveActionView.labelPriority')
                            }}</label>
                            <p class="text-neutral-900">
                                {{ getPriorityName(correctiveAction.priority) }}
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm text-neutral-600 mb-1">{{
                                t('tasks.correctiveActionView.labelDueDate')
                            }}</label>
                            <p class="text-neutral-900">
                                {{ formatDateToDay(correctiveAction.dueDate) }}
                            </p>
                        </div>
                    </div>
                    <div class="mt-4">
                        <label class="block text-sm text-neutral-600 mb-1">{{
                            t('tasks.correctiveActionView.labelDescription')
                        }}</label>
                        <p class="text-neutral-700">
                            {{ correctiveAction.description || t('tasks.correctiveActionView.noDescription') }}
                        </p>
                    </div>
                    <div class="mt-4">
                        <label class="block text-sm text-neutral-600 mb-1">{{
                            t('tasks.correctiveActionView.labelExpectedOutcome')
                        }}</label>
                        <p class="text-neutral-700">
                            {{
                                correctiveAction.expectedOutcome ||
                                t('tasks.correctiveActionView.noExpectedOutcome')
                            }}
                        </p>
                    </div>

                    <div
                        class="mt-4"
                        v-if="
                            correctiveAction?.rejectionExplanation &&
                            correctiveAction?.status == NCCorrectiveActionStatus.OPEN
                        "
                    >
                        <label class="block text-sm text-neutral-600 mb-1">{{
                            t('tasks.correctiveActionView.rejectionReason')
                        }}</label>
                        <div class="bg-red-50 border border-red-200 rounded-md p-3">
                            <p class="text-red-800">{{ correctiveAction.rejectionExplanation }}</p>
                        </div>
                    </div>

                    <div class="mt-6 flex flex-wrap gap-2">
                        <Can subject="ca_effectiveness_evidences" :actions="['create']">
                            <AppButton
                                v-if="
                                    showUploadSection &&
                                    hasNewEvidenceSinceApplied &&
                                    correctiveAction?.status === NCCorrectiveActionStatus.OPEN
                                "
                                :warn-before="t('tasks.correctiveActionView.warnApply')"
                                buttonStyle="secondary"
                                :loading="applyLoading"
                                :disabled="uploading || closeLoading || hasPendingChangeRequests"
                                @click="handleStatusChange(correctiveAction, NCCorrectiveActionStatus.APPLIED)"
                            >
                                {{ t('tasks.correctiveActionView.apply') }}
                            </AppButton>
                        </Can>

                        <template
                            v-if="
                                isCreatedByCurrentUser &&
                                correctiveAction.status === NCCorrectiveActionStatus.APPLIED
                            "
                        >
                            <Can subject="corrective_actions" :actions="['update']">
                                <AppButton
                                    buttonStyle="primary"
                                    :loading="verifyLoading"
                                    :disabled="rejectionLoading"
                                    :warn-before="t('tasks.correctiveActionView.warnVerify')"
                                    @click="
                                        handleStatusChange(
                                            correctiveAction,
                                            NCCorrectiveActionStatus.VERIFIED
                                        )
                                    "
                                >
                                    {{ t('tasks.correctiveActionView.verify') }}
                                </AppButton>
                            </Can>
                            <Can subject="corrective_actions" :actions="['update']">
                                <AppButton
                                    buttonStyle="danger"
                                    :loading="rejectionLoading"
                                    :disabled="verifyLoading"
                                    @click="openRejectModal"
                                >
                                    {{ t('tasks.correctiveActionView.reject') }}
                                </AppButton>
                            </Can>
                        </template>
                    </div>
                </div>

                <div class="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg text-neutral-900">{{
                            t('tasks.correctiveActionView.effectivenessEvidenceTitle')
                        }}</h3>
                        <Can subject="ca_effectiveness_evidences" :actions="['create']">
                            <div
                                v-if="showUploadSection"
                                class="flex items-center gap-2"
                            >
                                <input
                                    type="file"
                                    ref="fileInput"
                                    @change="handleFileChange"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    class="hidden"
                                    :disabled="uploading"
                                />
                                <AppButton
                                    buttonStyle="primary"
                                    @click="() => fileInput?.click()"
                                    :disabled="uploading || closeLoading"
                                >
                                    <i class="fa-solid fa-plus mr-2"></i>
                                    {{
                                        uploading
                                            ? t('tasks.uploading')
                                            : t('tasks.correctiveActionView.addEvidence')
                                    }}
                                </AppButton>
                            </div>
                        </Can>
                    </div>

                    <div v-if="effectivenessEvidences.length > 0">
                        <Table
                            :cols="evidenceTableCols"
                            :rows="evidenceTableRows"
                            :entities="effectivenessEvidences"
                            :entityName="t('tasks.correctiveActionView.entityEvidence')"
                            :subject="'ca_effectiveness_evidences'"
                            :page="1"
                            :total="effectivenessEvidences.length"
                            :perPage="effectivenessEvidences.length"
                            :totalPages="1"
                            :onNextPage="() => {}"
                            :onPreviousPage="() => {}"
                            :setPage="() => {}"
                            :onSuccess="() => {}"
                            :hideEdit="() => true"
                            :hideView="() => true"
                            :hideDelete="() => true"
                        >
                            <template #extra-field="{ entity }">
                                <Can
                                    subject="ca_effectiveness_evidences"
                                    :actions="['read']"
                                    show-if-no-permission
                                >
                                    <DownloadButton :file-path="entity.fileUrl" />
                                </Can>
                            </template>
                        </Table>
                    </div>
                    <div v-else class="text-center py-8">
                        <i class="fa-regular fa-folder-open text-4xl text-neutral-300 mb-2"></i>
                        <p class="text-neutral-500">{{
                            t('tasks.correctiveActionView.noEffectivenessEvidence')
                        }}</p>
                    </div>
                </div>

                <Can subject="ca_change_requests" :actions="['read']" show-if-no-permission>
                    <div class="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
                        <CaChangeRequest
                            :changeRequests="correctiveAction?.changeRequests"
                            :caDueDate="correctiveAction?.dueDate"
                            :caAssignee="correctiveAction?.assignedTo"
                            :createdById="correctiveAction?.createdById"
                            :caStatus="correctiveAction?.status"
                            :ncId="correctiveAction?.nonConformityId"
                            @changeRequestUpdated="fetchCorrectiveAction"
                        />
                    </div>
                </Can>

                <div class="flex gap-2">
                    <Can subject="corrective_actions" :actions="['update']">
                        <AppButton
                            v-if="isCreatedByCurrentUser && correctiveAction.status === NCCorrectiveActionStatus.VERIFIED"
                            buttonStyle="primary"
                            :loading="closeLoading"
                            :warn-before="t('tasks.correctiveActionView.warnClose')"
                            @click="handleStatusChange(correctiveAction, NCCorrectiveActionStatus.CLOSED)"
                        >
                            {{ t('tasks.correctiveActionView.close') }}
                        </AppButton>
                    </Can>
                </div>
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
import { useRoute, useRouter } from 'vue-router'
import AppButton from '../AppButton.vue'
import Spinner from '../Spinner.vue'
import Table from '../Table.vue'
import { apiGet, apiPost, apiPut } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import {
    formatDateToDay,
    getFileNameFromUrl,
    formatDate,
    snakeToCamelCase,
    formatApiErrorMessage
} from '@/util/util'
import Can from '../Can.vue'
import {
    type CorrectiveAction,
    NCCorrectiveActionPriorityOptions,
    NCCorrectiveActionStatus,
    NCCorrectiveActionStatusOptions,
    CaChangeRequestStatus,
    labelForStatusOption
} from '@/util/interfaces'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/stores/notification'
import DownloadButton from '../download-button.vue'
import { useDialog } from '@/stores/dialog'
import RejectEvidenceModal from '../non-conformities/RejectEvidenceModal.vue'
import CaChangeRequest from '../non-conformities/ca-change-request.vue'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from '../non-conformities/endpoints'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

function correctiveActionStatusLabel(status: string | undefined) {
    if (!status) return ''
    const opt = NCCorrectiveActionStatusOptions.find((o) => o.id === status)
    return opt ? labelForStatusOption(opt, t) : snakeToCamelCase(status)
}

function toastMessageForCaStatus(status: NCCorrectiveActionStatus): string {
    switch (status) {
        case NCCorrectiveActionStatus.APPLIED:
            return t('tasks.correctiveActionView.toastApplied')
        case NCCorrectiveActionStatus.VERIFIED:
            return t('tasks.correctiveActionView.toastVerified')
        case NCCorrectiveActionStatus.CLOSED:
            return t('tasks.correctiveActionView.toastClosed')
        default:
            return t('tasks.correctiveActionView.toastApplied')
    }
}
const dialog = useDialog()
const id = route.params.id as string
const correctiveAction = ref<CorrectiveAction>()
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const applyLoading = ref(false)
const closeLoading = ref(false)
const verifyLoading = ref(false)
const rejectionLoading = ref(false)

const crumbs = computed(() => [
    {
        name: t('tasks.breadcrumb'),
        path: '/tasks',
        icon: 'fa-solid fa-tasks'
    },
    {
        name: t('tasks.correctiveActionView.crumbDetail'),
        path: `/tasks/corrective-actions/${id}`
    }
])

const effectivenessEvidences = computed(() => {
    return correctiveAction.value?.effectivenessEvidences || []
})

const hasNewEvidenceSinceApplied = computed(() => {
    const lastAppliedAt = correctiveAction.value?.appliedAt || 0
    return effectivenessEvidences.value.some((e) => (e.uploadedAt || 0) > lastAppliedAt)
})

const hasPendingChangeRequests = computed(() => {
    const pendingChangeRequests = correctiveAction.value?.changeRequests?.filter(
        (cr: any) => cr.status === CaChangeRequestStatus.PENDING
    ) || []
    return pendingChangeRequests.length > 0
})

const isAssignedToCurrentUser = computed(
    () => correctiveAction.value?.assignedTo?.id === authStore.state.userDetails.id
)

const isCreatedByCurrentUser = computed(
    () => correctiveAction.value?.createdById === authStore.state.userDetails.id
)

const isOpen = computed(() => correctiveAction.value?.status === NCCorrectiveActionStatus.OPEN)

const showUploadSection = computed(
    () => isAssignedToCurrentUser.value && isOpen.value
)

const evidenceTableCols = computed(() => [
    t('tasks.correctiveActionView.colFileName'),
    t('tasks.correctiveActionView.colUploadedBy'),
    t('tasks.correctiveActionView.colUploadDate')
])

const evidenceTableRows = computed(() => {
    const cFile = t('tasks.correctiveActionView.colFileName')
    const cBy = t('tasks.correctiveActionView.colUploadedBy')
    const cDate = t('tasks.correctiveActionView.colUploadDate')
    return effectivenessEvidences.value.map((evidence) => ({
        [cFile]: getFileNameFromUrl(evidence.fileUrl),
        [cBy]: evidence.uploadedBy?.fname + ' ' + evidence.uploadedBy?.lname,
        [cDate]: formatDate(evidence.uploadedAt),
        id: evidence.id
    }))
})

onMounted(async () => {
    fetchCorrectiveAction()
})

const fetchCorrectiveAction = async () => {
    try {
        const response = await apiGet<CorrectiveAction>(
            `/non-conformities/corrective-actions/${id}`,
            authStore
        )
        correctiveAction.value = response
    } catch (error: any) {
        console.error('Error fetching corrective action:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) ||
                t('tasks.correctiveActionView.toastFetchFailed'),
            'error'
        )
        router.push('/tasks')
    }
}

const handleFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (file && correctiveAction.value) {
        uploading.value = true
        const formData = new FormData()
        formData.append('file', file)

        try {
            await apiPost(
                `/non-conformities/effectiveness-evidences?caId=${correctiveAction.value.id}`,
                formData,
                authStore
            )

            toast.showToast(
                t('common.success'),
                t('tasks.correctiveActionView.toastEvidenceUploaded'),
                'success'
            )
            await fetchCorrectiveAction()

            if (fileInput.value) {
                fileInput.value.value = ''
            }
        } catch (err: any) {
            toast.showToast(
                t('common.error'),
                formatApiErrorMessage(err?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) ||
                    err.message,
                'error'
            )
        } finally {
            uploading.value = false
        }
    }
}

const handleStatusChange = async (entity: any, status: NCCorrectiveActionStatus) => {
    if (status === NCCorrectiveActionStatus.APPLIED) {
        const pendingChangeRequests = correctiveAction.value?.changeRequests?.filter(
            (cr: any) => cr.status === CaChangeRequestStatus.PENDING
        ) || []
        if (pendingChangeRequests.length > 0) {
            toast.showToast(t('common.error'), t('tasks.correctiveActionView.toastCannotApplyPendingCr'), 'error')
            return
        }
    }

    switch (status) {
        case NCCorrectiveActionStatus.CLOSED:
            closeLoading.value = true
            break
        case NCCorrectiveActionStatus.VERIFIED:
            verifyLoading.value = true
            break
        case NCCorrectiveActionStatus.APPLIED:
            applyLoading.value = true
            break
    }
    
    try {
        const payload = {
            id: entity.id,
            status: status
        }
        await apiPut(`/non-conformities/corrective-actions/${entity.id}`, payload, authStore)
        toast.showToast(t('common.success'), toastMessageForCaStatus(status), 'success')
        await fetchCorrectiveAction()
    } catch (error: any) {
        console.error(`Error ${status} corrective action:`, error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) ||
                t('tasks.correctiveActionView.toastStatusChangeFailed'),
            'error'
        )
    } finally {
        applyLoading.value = false
        verifyLoading.value = false
        closeLoading.value = false
    }
}

const openRejectModal = () => {
    if (!correctiveAction.value) return
    
    dialog.openDialog(RejectEvidenceModal, {
        loading: rejectionLoading.value,
        onClose: () => {
            dialog.closeDialog()
        },
        onSubmit: async (reason: string) => {
            try {
                rejectionLoading.value = true
                const payload = {
                    id: correctiveAction.value!.id,
                    status: NCCorrectiveActionStatus.OPEN,
                    rejectionExplanation: reason
                }
                await apiPut(
                    `/non-conformities/corrective-actions/${correctiveAction.value!.id}`,
                    payload,
                    authStore
                )
                toast.showToast(
                    t('common.success'),
                    t('tasks.correctiveActionView.toastRejected'),
                    'success'
                )
                dialog.closeDialog()
                await fetchCorrectiveAction()
            } catch (error: any) {
                console.error('Error rejecting corrective action:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) ||
                        t('tasks.correctiveActionView.toastRejectFailed'),
                    'error'
                )
            } finally {
                rejectionLoading.value = false
            }
        }
    })
}

const getPriorityName = (priorityValue: number) => {
    const found = NCCorrectiveActionPriorityOptions.find((opt) => opt.id === priorityValue)
    return found ? labelForStatusOption(found, t) : String(priorityValue)
}
</script>
