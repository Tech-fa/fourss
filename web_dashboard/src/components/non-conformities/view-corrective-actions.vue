<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs">
            <Can
                subject="non_conformity_corrective_actions"
                v-if="showCloseButton"
                :actions="['update']"
            >
                <div class="flex gap-2">
                    <AppButton
                        warnBefore="Are you sure you want to close this corrective action?"
                        buttonStyle="primary"
                        :loading="closeLoading"
                        @click="
                            handleStatusChange(correctiveAction, NCCorrectiveActionStatus.CLOSED)
                        "
                        test-id="ca-close-button"
                    >
                        {{ $t('nc.ca.detail.closeButton') }}
                    </AppButton>
                </div>
            </Can>
        </BreadCrums>

        <main id="main-content" class="flex-1 p-6">
            <h2 class="text-2xl font-bold mb-6" test-id="ca-details-title">{{ $t('nc.ca.detail.title') }}</h2>
            <div v-if="correctiveAction" class="mb-6">
                <div class="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
                    <div class="grid grid-cols-3 gap-4">
                        <div test-id="ca-details-title-field">
                            <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.ca.detail.fieldTitle') }}</label>
                            <p class="text-neutral-900" test-id="ca-details-title-value">{{ correctiveAction.title }}</p>
                        </div>
                        <div test-id="ca-details-status-field">
                            <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.ca.detail.fieldStatus') }}</label>
                            <p class="text-neutral-900" test-id="ca-details-status-value">
                                {{ correctiveActionStatusLabel(correctiveAction.status) }}
                            </p>
                        </div>
                        <div test-id="ca-details-assigned-to-field">
                            <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.ca.detail.fieldAssignedTo') }}</label>
                            <p class="text-neutral-900" test-id="ca-details-assigned-to-value">
                                {{ correctiveAction.assignedTo?.fname }}
                                {{ correctiveAction.assignedTo?.lname }}
                            </p>
                        </div>
                        <div test-id="ca-details-priority-field">
                            <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.ca.detail.fieldPriority') }}</label>
                            <p class="text-neutral-900" test-id="ca-details-priority-value">
                                {{ getPriorityName(correctiveAction.priority) }}
                            </p>
                        </div>
                        <div test-id="ca-details-due-date-field">
                            <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.ca.detail.fieldDueDate') }}</label>
                            <p class="text-neutral-900" test-id="ca-details-due-date-value">
                                {{ formatDateToDay(correctiveAction.dueDate) }}
                            </p>
                        </div>
                    </div>
                    <div class="mt-4" test-id="ca-details-description-field">
                        <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.ca.detail.fieldDescription') }}</label>
                        <p class="text-neutral-700" test-id="ca-details-description-value">
                            {{ correctiveAction.description || $t('nc.ca.detail.noDescription') }}
                        </p>
                    </div>
                    <div class="mt-4" test-id="ca-details-expected-outcome-field">
                        <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.ca.detail.fieldExpectedOutcome') }}</label>
                        <p class="text-neutral-700" test-id="ca-details-expected-outcome-value">
                            {{ correctiveAction.expectedOutcome || $t('nc.ca.detail.noExpectedOutcome') }}
                        </p>
                    </div>
                    <div class="mt-4" v-if="linkedCauseLabels.length" test-id="ca-details-linked-causes-field">
                        <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.ca.detail.fieldLinkedCauses') }}</label>
                        <p class="text-neutral-900" test-id="ca-details-linked-causes-value">{{ linkedCauseLabels.join(', ') }}</p>
                    </div>

                    <div
                        class="mt-4"
                        v-if="
                            correctiveAction?.rejectionExplanation &&
                            correctiveAction?.status == NCCorrectiveActionStatus.OPEN
                        "
                    >
                        <label class="block text-sm text-neutral-600 mb-1">{{ $t('nc.ca.detail.fieldRejectionReason') }}</label>
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
                                :warn-before="t('nc.ca.detail.warnApply')"
                                buttonStyle="secondary"
                                :loading="applyLoading"
                                :disabled="uploading || closeLoading"
                                @click="handleStatusChange(correctiveAction, NCCorrectiveActionStatus.APPLIED)"
                                test-id="ca-apply-button"
                            >
                                {{ $t('nc.ca.detail.apply') }}
                            </AppButton>
                        </Can>

                        <template v-if="showVerifyRejectSection">
                            <Can
                                subject="non_conformity_corrective_actions"
                                :actions="['verify_corrective_action']"
                            >
                                <AppButton
                                    :warn-before="t('nc.ca.detail.warnVerify')"
                                    buttonStyle="primary"
                                    :loading="verifyLoading"
                                    :disabled="rejectionLoading"
                                    @click="
                                        handleStatusChange(
                                            correctiveAction,
                                            NCCorrectiveActionStatus.VERIFIED
                                        )
                                    "
                                    test-id="ca-verify-button"
                                >
                                    {{ $t('nc.ca.detail.verifyButton') }}
                                </AppButton>
                            </Can>

                            <Can subject="non_conformity_corrective_actions" :actions="['update']">
                                <AppButton
                                    buttonStyle="danger"
                                    :loading="rejectionLoading"
                                    :disabled="verifyLoading"
                                    @click="openRejectModal"
                                    test-id="ca-reject-button"
                                >
                                    {{ $t('nc.ca.detail.rejectButton') }}
                                </AppButton>
                            </Can>
                        </template>
                    </div>
                </div>

                <div class="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg text-neutral-900" test-id="ca-effectiveness-evidence-title">{{ $t('nc.ca.detail.effectivenessEvidence') }}</h3>
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
                                    test-id="ca-evidence-file-input"
                                />
                                <AppButton
                                    buttonStyle="primary"
                                    @click="() => fileInput?.click()"
                                    :disabled="uploading || closeLoading"
                                    test-id="ca-add-evidence-button"
                                >
                                    <i class="fa-solid fa-plus mr-2"></i>
                                    {{ uploading ? $t('nc.ca.detail.uploading') : $t('nc.ca.detail.addEvidence') }}
                                </AppButton>
                            </div>
                        </Can>
                    </div>

                    <!-- Evidence Table -->
                    <div v-if="effectivenessEvidences.length > 0" test-id="ca-effectiveness-evidence-table-container">
                        <Table
                            :cols="[$t('nc.ca.detail.tableFileName'), $t('nc.ca.detail.tableUploadedBy'), $t('nc.ca.detail.tableUploadDate')]"
                            :rows="evidenceTableRows"
                            :entities="effectivenessEvidences"
                            :entityName="$t('nc.ca.detail.entityEvidence')"
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
                                    <!-- <AppButton
                                        buttonStyle="neutral"
                                        size="sm"
                                        :href="entity.fileUrl"
                                        :download="getFileNameFromUrl(entity.fileUrl) || undefined"
                                        target="_blank"
                                    >
                                        <i class="fa-solid fa-download"></i>
                                    </AppButton> -->
                                    <DownloadButton :file-path="entity.fileUrl" />
                                </Can>
                            </template>
                        </Table>
                    </div>
                    <div v-else class="text-center py-8" test-id="ca-effectiveness-evidence-empty-state">
                        <i class="fa-regular fa-folder-open text-4xl text-neutral-300 mb-2"></i>
                        <p class="text-neutral-500" test-id="ca-effectiveness-evidence-empty-message">{{ $t('nc.ca.detail.noEvidence') }}</p>
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
                            @changeRequestUpdated="fetchCorrectiveAction"
                        />
                    </div>
                </Can>

                <div class="mb-6">
                    <CorrectiveActionTimeline :correctiveAction="correctiveAction" />
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
import { useRoute } from 'vue-router'
import AppButton from '../AppButton.vue'
import Spinner from '../Spinner.vue'
import Table from '../Table.vue'
import { apiGet, apiPost, apiPut } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { formatDateToDay, getFileNameFromUrl, formatDate, snakeToCamelCase, formatApiErrorMessage } from '@/util/util'
import CaChangeRequest from './ca-change-request.vue'
import CorrectiveActionTimeline from './corrective-action-timeline.vue'
import Can from '../Can.vue'
import {
    type CorrectiveAction,
    NCCorrectiveActionPriorityOptions,
    NCCorrectiveActionStatus,
    NCCorrectiveActionStatusOptions,
    CaChangeRequestStatus,
    labelForStatusOption
} from '@/util/interfaces'
import { useToast } from '@/stores/notification'
import { useDialog } from '@/stores/dialog'
import RejectEvidenceModal from './RejectEvidenceModal.vue'
import DownloadButton from '../download-button.vue'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'

const authStore = useAuthStore()
const route = useRoute()
const dialog = useDialog()
const { t } = useI18n()
const id = route.params.id
const correctiveAction = ref<CorrectiveAction>()
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const rejectionLoading = ref(false)
const closeLoading = ref(false)
const verifyLoading = ref(false)
const applyLoading = ref(false)

const crumbs = computed(() => [
    {
        name: t('nc.breadcrumbs.nonConformities'),
        path: '/act/non-conformities',
        icon: 'fa-solid fa-exclamation-triangle'
    },
    { name: t('nc.breadcrumbs.viewNonConformity'), path: `/act/non-conformities/${route.params.ncId}?tab=3`, icon: 'fa-solid fa-eye' },
    {
        name: t('nc.breadcrumbs.viewCorrectiveActions'),
        path: `/act/non-conformities/${route.params.ncId}/${route.params.id}`
    }
])

const toast = useToast()

const effectivenessEvidences = computed(() => {
    return correctiveAction.value?.effectivenessEvidences || []
})

const hasNewEvidenceSinceApplied = computed(() => {
    const lastAppliedAt = correctiveAction.value?.appliedAt || 0
    return effectivenessEvidences.value.some((e) => (e.uploadedAt || 0) > lastAppliedAt)
})

const isCreatedByCurrentUser = computed(
    () => correctiveAction.value?.createdById === authStore.state.userDetails.id
)
const isAssignedToCurrentUser = computed(
    () => correctiveAction.value?.assignedTo?.id === authStore.state.userDetails.id
)
const isOpen = computed(() => correctiveAction.value?.status === NCCorrectiveActionStatus.OPEN)
const isApplied = computed(
    () => correctiveAction.value?.status === NCCorrectiveActionStatus.APPLIED
)
const isVerified = computed(
    () => correctiveAction.value?.status === NCCorrectiveActionStatus.VERIFIED
)

const showCloseButton = computed(() => isCreatedByCurrentUser.value && isVerified.value)
const showVerifyRejectSection = computed(() => isCreatedByCurrentUser.value && isApplied.value)
const showUploadSection = computed(
    () => isAssignedToCurrentUser.value && isOpen.value
)

const evidenceTableRows = computed(() => {
    return effectivenessEvidences.value.map((evidence) => ({
        [t('nc.ca.detail.tableFileName')]: getFileNameFromUrl(evidence.fileUrl),
        [t('nc.ca.detail.tableUploadedBy')]: evidence.uploadedBy?.fname + ' ' + evidence.uploadedBy?.lname,
        [t('nc.ca.detail.tableUploadDate')]: formatDate(evidence.uploadedAt),
        id: evidence.id
    }))
})

const linkedCauseLabels = computed(() => {
    const ca: any = correctiveAction.value as any
    const links = ca?.ncCorrectiveActionCauses || []
    const labels: string[] = []
    for (const link of links) {
        if (link.rcaFiveWhyStep) {
            const s = link.rcaFiveWhyStep
            labels.push(`${s.becauseAnswer}`)
        } else if (link.rcaCause) {
            labels.push(link.rcaCause.text)
        }
    }
    return labels
})

onMounted(async () => {
    fetchCorrectiveAction()
})

const fetchCorrectiveAction = async () => {
    const response = await apiGet<CorrectiveAction>(
        `/non-conformities/corrective-actions/${id}`,
        authStore
    )
    correctiveAction.value = response
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

            toast.showToast(t('common.success'), t('nc.ca.detail.uploadSuccess'), 'success')
            await fetchCorrectiveAction()

            // Reset the file input
            if (fileInput.value) {
                fileInput.value.value = ''
            }
        } catch (err: any) {
            toast.showToast(t('common.error'), formatApiErrorMessage(err?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || err.message, 'error')
        } finally {
            uploading.value = false
        }
    }
}

const handleStatusChange = async (entity: any, status: NCCorrectiveActionStatus) => {
    // Check if trying to apply CA while there are pending change requests
    if (status === NCCorrectiveActionStatus.APPLIED) {
        const pendingChangeRequests = correctiveAction.value?.changeRequests?.filter(
            (cr: any) => cr.status === CaChangeRequestStatus.PENDING
        ) || []
        if (pendingChangeRequests.length > 0) {
            toast.showToast(t('common.error'), t('nc.ca.detail.pendingChangeRequestsError'), 'error')
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
        default:
            break
    }
    
    try {
        const payload = {
            id: entity.id,
            status: status
        }
        await apiPut(`/non-conformities/corrective-actions/${entity.id}`, payload, authStore)
        toast.showToast(
            t('common.success'),
            t('nc.ca.detail.statusSuccess', { status: correctiveActionStatusLabel(status) }),
            'success'
        )
        await fetchCorrectiveAction()
    } catch (error: any) {
        console.error(`Error ${status} corrective action:`, error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) ||
                t('nc.ca.detail.statusError', { status: t(`nc.enum.caStatus.${String(status).toLowerCase()}`) }),
            'error'
        )
    } finally {
        closeLoading.value = false
        verifyLoading.value = false
        applyLoading.value = false
    }
}

const openRejectModal = () => {
    dialog.openDialog(RejectEvidenceModal, {
        loading: rejectionLoading.value,
        onClose: () => {
            dialog.closeDialog()
        },
        onSubmit: async (reason: string) => {
            try {
                rejectionLoading.value = true
                const payload = {
                    id: correctiveAction.value?.id,
                    status: NCCorrectiveActionStatus.OPEN,
                    rejectionExplanation: reason
                }
                await apiPut(
                    `/non-conformities/corrective-actions/${correctiveAction.value?.id}`,
                    payload,
                    authStore
                )
                toast.showToast(t('common.success'), t('nc.ca.detail.rejectSuccess'), 'success')
                dialog.closeDialog()
                await fetchCorrectiveAction()
            } catch (error: any) {
                console.error('Error rejecting evidence:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.ca.detail.rejectError'),
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

function correctiveActionStatusLabel(status: string | undefined) {
    const opt = NCCorrectiveActionStatusOptions.find((o) => o.id === status)
    return opt ? labelForStatusOption(opt, t) : snakeToCamelCase(status ?? '')
}
</script>
