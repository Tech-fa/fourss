<template>
    <div class="text-start">
        <Breadcrumb :crumbs="breadcrumbCrumbs" />

        <main id="main-content" class="p-6">
            <div
                class="bg-white rounded-lg shadow-sm border border-neutral-200 w-full max-w-5xl mx-auto"
                test-id="change-request-page"
            >
        <div class="p-6 border-b">
            <div class="flex items-center justify-between" test-id="change-request-dialog-header">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-file-circle-plus text-neutral-700 text-xl"></i>
                    <h2 class="text-lg font-semibold">
                        {{
                            isViewMode
                                ? t('document.change_requests.dialog.title_view')
                                : t('document.change_requests.dialog.title_create')
                        }}
                    </h2>
                </div>
                <button
                    type="button"
                    @click="handleCancel"
                    class="text-neutral-400 hover:text-neutral-600"
                    :aria-label="t('document.change_requests.dialog.close')"
                >
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
        </div>

        <div class="p-6">
            <div v-if="isViewMode" class="space-y-6">
                <div v-if="isFetchingChangeRequest" class="flex justify-center py-8">
                    <div
                        class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
                    ></div>
                </div>
                <template v-else-if="changeRequest">
                    <div>
                        <label class="block text-sm font-medium text-neutral-700 mb-2">{{
                            t('document.change_requests.dialog.label_status')
                        }}</label>
                        <div class="flex items-center gap-2">
                            <span
                                :class="[
                                    'px-2 py-1 rounded-full text-sm font-medium',
                                    changeRequest.status === 'active'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : changeRequest.status === 'accepted'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-red-100 text-red-800'
                                ]"
                            >
                                {{
                                    changeRequest.status === 'active'
                                        ? t('document.change_requests.status_active')
                                        : changeRequest.status === 'accepted'
                                          ? t('document.change_requests.status_accepted')
                                          : t('document.change_requests.status_rejected')
                                }}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-neutral-700 mb-2">{{
                            t('document.change_requests.dialog.label_requested_by')
                        }}</label>
                        <p class="text-neutral-900">
                            {{ changeRequest.requestedBy?.fname }}
                            {{ changeRequest.requestedBy?.lname }}
                        </p>
                    </div>
                    <div v-if="changeRequest.organizationUnit">
                        <label class="block text-sm font-medium text-neutral-700 mb-2">{{
                            t('document.change_requests.dialog.label_organization_unit')
                        }}</label>
                        <p class="text-neutral-900">
                            {{ orgUnitLabel(changeRequest.organizationUnit) }}
                        </p>
                    </div>
                    <div v-if="changeRequest.documentIds && changeRequest.documentIds.length">
                        <label class="block text-sm font-medium text-neutral-700 mb-2">{{
                            t('document.change_requests.dialog.label_documents')
                        }}</label>
                        <div class="bg-neutral-50 p-3 rounded-md">
                            <ul class="list-disc list-inside space-y-1">
                                <li
                                    v-for="document in changeRequest.documents"
                                    :key="document.id"
                                    class="text-blue-900 underline cursor-pointer"
                                    @click="()=>{
                                        $router.push(`/plan/documents/${document.id}`);
                                    }"
                                >
                                    {{ t('document.change_requests.dialog.document_prefix') }}
                                    {{ document.title || t('document.change_requests.no_title') }}
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-neutral-700 mb-2">{{
                            t('document.change_requests.dialog.label_reason')
                        }}</label>
                        <div class="bg-neutral-50 p-3 rounded-md">
                            <p class="text-neutral-900 whitespace-pre-wrap">
                                {{ changeRequest.reason || t('document.change_requests.no_reason') }}
                            </p>
                        </div>
                    </div>
                    <div v-if="changeRequest.justification">
                        <label class="block text-sm font-medium text-neutral-700 mb-2">{{
                            t('document.change_requests.dialog.label_justification')
                        }}</label>
                        <div class="bg-neutral-50 p-3 rounded-md">
                            <p class="text-neutral-900 whitespace-pre-wrap">
                                {{ changeRequest.justification }}
                            </p>
                        </div>
                    </div>
                    <div v-if="changeRequest.riskIdentified">
                        <label class="block text-sm font-medium text-neutral-700 mb-2">{{
                            t('document.change_requests.dialog.label_risk_effects')
                        }}</label>
                        <div class="bg-neutral-50 p-3 rounded-md">
                            <p class="text-neutral-900 whitespace-pre-wrap">
                                {{ changeRequest.riskIdentified }}
                            </p>
                        </div>
                    </div>
                    <div v-if="changeRequest.reviewedBy">
                        <label class="block text-sm font-medium text-neutral-700 mb-2">{{
                            t('document.change_requests.dialog.label_reviewed_by')
                        }}</label>
                        <p class="text-neutral-900">
                            {{ changeRequest.reviewedBy?.fname }}
                            {{ changeRequest.reviewedBy?.lname }}
                        </p>
                    </div>
                    <div v-if="changeRequest.reviewComment">
                        <label class="block text-sm font-medium text-neutral-700 mb-2">{{
                            t('document.change_requests.dialog.label_review_comment')
                        }}</label>
                        <div class="bg-neutral-50 p-3 rounded-md">
                            <p class="text-neutral-900 whitespace-pre-wrap">
                                {{ changeRequest.reviewComment }}
                            </p>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-neutral-700 mb-2">{{
                            t('document.change_requests.dialog.label_created')
                        }}</label>
                        <p class="text-neutral-900">
                            {{ formatDate(changeRequest.createdAt || 0) }}
                        </p>
                    </div>
                </template>
                <div class="p-6 border-t bg-neutral-50 flex justify-end gap-3" v-if="changeRequest">
                    <Can
                        subject="change_requests"
                        :actions="['update']"
                        v-if="changeRequest.status === 'active'"
                    >
                        <AppButton
                            type="button"
                            buttonStyle="warning"
                            @click="openRejectDialog"
                            :loading="isLoading"
                        >
                            <i class="fa-solid fa-ban me-2"></i>
                            {{ t('document.change_requests.dialog.reject') }}
                        </AppButton>
                    </Can>
                    <Can
                        subject="change_requests"
                        :actions="['update']"
                        v-if="changeRequest.status === 'active'"
                    >
                        <AppButton
                            type="button"
                            buttonStyle="success"
                            @click="openApproveDialog"
                            :loading="isLoading"
                        >
                            <i class="fa-solid fa-check me-2"></i>
                            {{ t('document.change_requests.dialog.approve') }}
                        </AppButton>
                    </Can>
                    <Can
                        subject="change_requests"
                        :actions="['delete']"
                        v-if="
                            changeRequest.status === 'active' &&
                            changeRequest.requestedBy?.id === authStore.state.userDetails.id
                        "
                    >
                        <AppButton
                            type="button"
                            buttonStyle="danger"
                            @click="deleteChangeRequest"
                            :loading="isLoading"
                        >
                            <i class="fa-solid fa-trash me-2"></i>
                            {{ t('document.change_requests.dialog.delete') }}
                        </AppButton>
                    </Can>
                    <AppButton type="button" buttonStyle="secondary" @click="handleCancel">
                        {{ t('document.change_requests.dialog.close') }}
                    </AppButton>
                </div>
            </div>
            <Form
                v-else
                @submit="submitChangeRequest"
                class="space-y-6"
                test-id="change-request-form"
            >
                <div v-if="showTeamPicker(organizationUnits.length)" test-id="change-request-organization-unit-field">
                    <label class="block text-sm font-medium text-neutral-700 mb-2">
                        {{ t('document.change_requests.dialog.org_unit_required_label') }}
                        <span class="text-red-600">*</span>
                    </label>
                    <Select2
                        v-model="formData.organizationUnit"
                        required
                        :values="organizationUnits"
                        :display="orgUnitDisplay"
                        :placeholder="t('document.change_requests.dialog.org_unit_placeholder')"
                        test-id="change-request-organization-unit-select"
                    />
                </div>

                <div test-id="change-request-reason-field">
                    <AppTextareaForm
                        name="reason"
                        :label="t('document.change_requests.dialog.field_changes')"
                        :required="true"
                        :rules="reasonFieldRule"
                        rows="3"
                        :placeholder="t('document.change_requests.dialog.reason_placeholder')"
                        test-id="change-request-reason-textarea"
                    />
                </div>

                <div test-id="change-request-justification-field">
                    <AppTextareaForm
                        name="justification"
                        :label="t('document.change_requests.dialog.label_justification')"
                        :required="false"
                        rows="3"
                        :placeholder="t('document.change_requests.dialog.justification_placeholder')"
                    />
                </div>

                <div test-id="change-request-risks-field">
                    <AppTextareaForm
                        name="risks"
                        :label="t('document.change_requests.dialog.label_risk_effects')"
                        :required="false"
                        rows="3"
                        :placeholder="t('document.change_requests.dialog.risk_placeholder')"
                    />
                </div>

                <div v-if="formData.organizationUnit" test-id="change-request-documents-field">
                    <label class="block text-sm font-medium text-neutral-700 mb-2">
                        {{ t('document.change_requests.dialog.documents_affected_label')
                        }}<span class="text-red-600">*</span>
                    </label>
                    <SearcheableApiMultiSelect
                        v-model="selectedDocuments"
                        :results="documentSearchResults"
                        :placeholder="t('document.change_requests.dialog.documents_search_placeholder')"
                        :display="documentOptionDisplay"
                        :changeQuery="searchDocuments"
                        test-id="change-request-documents-multiselect"
                    />
                </div>

                <div
                    class="p-6 border-t bg-neutral-50 flex justify-end gap-3"
                    test-id="change-request-form-actions"
                >
                    <AppButton
                        type="button"
                        buttonStyle="secondary"
                        @click="handleCancel"
                        :disabled="isLoading"
                    >
                        {{ t('common.cancel') }}
                    </AppButton>
                    <AppButton type="submit" buttonStyle="primary" :loading="isLoading">
                        <i class="fa-solid fa-plus me-2"></i>
                        {{ t('document.change_requests.dialog.submit_create') }}
                    </AppButton>
                </div>
            </Form>
        </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import { apiPost, apiDelete, apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import AppTextareaForm from '../AppTextareaForm.vue'
import { Form } from 'vee-validate'
import type { ChangeRequest, OrganizationUnit } from '@/util/interfaces'
import { ChangeRequestStatus } from '@/util/interfaces'
import Can from '../Can.vue'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '../ConfirmDialog.vue'
import ChangeRequestReviewModal from './ChangeRequestReviewModal.vue'
import { formatApiErrorMessage } from '@/util/util'
import { getOrgUnits } from '@/components/common/endpoints'
import { showTeamPicker, resolveSelectedTeam } from '@/util/teams-feature'
import Select2 from '../Select2.vue'
import SearcheableApiMultiSelect from '../SearcheableApiMultiSelect.vue'
import Breadcrumb from '../breadCrums.vue'
import { useRoute, useRouter } from 'vue-router'

export interface Props {
    changeRequestId?: number
    isViewMode?: boolean
    onConfirm?: () => void
    onCancel?: () => void
}

const props = defineProps<Props>()

const { t, locale } = useI18n()
const isRtl = computed(() => locale.value === 'ar')
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const dialogStore = useDialog()
const isLoading = ref(false)
const isFetchingChangeRequest = ref(false)
const organizationUnits = ref<OrganizationUnit[]>([])
const changeRequest = ref<ChangeRequest | null>(null)
const documentSearchResults = ref<any[]>([])
const selectedDocuments = ref<any[]>([])

const routeChangeRequestId = computed(() => {
    const id = route.params.changeRequestId
    return id ? Number(id) : undefined
})
const changeRequestId = computed(() => props.changeRequestId || routeChangeRequestId.value)
const isViewMode = computed(() => props.isViewMode || Boolean(changeRequestId.value))
const returnTo = computed(() => {
    const value = route.query.returnTo
    return typeof value === 'string' && value.startsWith('/') ? value : '/plan/documents/change-requests'
})
const breadcrumbCrumbs = computed(() => [
    {
        name: t('nav.documents'),
        path: '/plan/documents',
        icon: 'fa-solid fa-file-alt'
    },
    {
        name: t('document.change_requests.breadcrumb'),
        path: '/plan/documents/change-requests',
        icon: 'fa-solid fa-file-circle-plus'
    },
    {
        name: isViewMode.value
            ? t('document.change_requests.dialog.title_view')
            : t('document.change_requests.dialog.title_create'),
        path: '',
        icon: ''
    }
])

const formData = reactive({
    organizationUnit: undefined as OrganizationUnit | undefined,
    reason: '',
    justification: '',
    risks: '',
    documentIds: []
})

const orgUnitTitle = (unit?: OrganizationUnit) => {
    return unit?.name || t('document.change_requests.not_applicable')
}

const orgUnitLabel = (unit?: OrganizationUnit) => orgUnitTitle(unit)

const orgUnitDisplay = (unit: OrganizationUnit) => orgUnitTitle(unit)

const documentOptionDisplay = (doc: { title?: string,documentCode?: string }) =>
   !!doc.title &&`${doc.documentCode}:${doc.title}` || t('document.change_requests.dialog.untitled_document')

const reasonFieldRule = (v: string | undefined) =>
    v?.trim() ? true : t('document.change_requests.dialog.validation_reason_required')

const handleCancel = () => {
    if (isLoading.value) return
    if (props.onCancel) {
        props.onCancel()
        return
    }
    router.push(returnTo.value)
}

const handleConfirm = () => {
    if (props.onConfirm) {
        props.onConfirm()
        return
    }
    router.push(returnTo.value)
}

const fetchChangeRequest = async () => {
    if (!changeRequestId.value) return

    isFetchingChangeRequest.value = true
    try {
        const response = await apiGet<ChangeRequest>(
            `/documents/change-requests/${changeRequestId.value}`,
            authStore
        )
        changeRequest.value = response
    } catch (error: any) {
        console.error('Error fetching change request:', error)
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            raw || t('document.change_requests.dialog.toast_fetch_detail_failed'),
            'error'
        )
    } finally {
        isFetchingChangeRequest.value = false
    }
}

const fetchOrganizationUnits = async () => {
    try {
        organizationUnits.value = (await getOrgUnits('change_requests', authStore)) || []
        if (!formData.organizationUnit) {
            formData.organizationUnit =
                resolveSelectedTeam(organizationUnits.value) ?? formData.organizationUnit
        }
    } catch (error: any) {
        console.error('Error fetching organization units:', error)
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            raw || t('document.change_requests.dialog.toast_fetch_org_units_failed'),
            'error'
        )
    }
}

const searchDocuments = async (query: string) => {
    try {
        const response = await apiGet<any>(
            `/documents?search=${encodeURIComponent(query.trim())}&limit=20&organizationUnit=${formData.organizationUnit?.id}`,
            authStore
        )
        documentSearchResults.value = response.data
    } catch (error: any) {
        console.error('Error searching documents:', error)
        documentSearchResults.value = []
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            raw || t('document.change_requests.dialog.toast_search_documents_failed'),
            'error'
        )
    }
}

const submitChangeRequest = async (values: any) => {
    if (!formData.organizationUnit?.id) {
        toast.showToast(t('common.error'), t('document.change_requests.dialog.toast_select_org_unit'), 'error')
        return
    }

    if (!selectedDocuments.value.length) {
        toast.showToast(t('common.error'), t('document.change_requests.dialog.toast_select_documents'), 'error')
        return
    }

    isLoading.value = true

    try {
        const payload = {
            reason: values.reason?.trim() || undefined,
            justification: values.justification?.trim() || undefined,
            risks: values.risks?.trim() || undefined,
            organizationUnitId: Number(formData.organizationUnit?.id),
            documentIds: selectedDocuments.value.map((doc: any) => doc.id)
        }

        await apiPost('/documents/change-requests', payload, authStore)

        toast.showToast(t('common.success'), t('document.change_requests.dialog.toast_created_ok'), 'success')

        handleConfirm()
    } catch (error: any) {
        console.error('Error creating change request:', error)
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            raw || t('document.change_requests.dialog.toast_create_failed'),
            'error'
        )
    } finally {
        isLoading.value = false
    }
}

const formatDate = (timestamp: number | string) => {
    if (!timestamp) return ''

    const numericTimestamp = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp
    if (isNaN(numericTimestamp)) {
        console.error('Invalid timestamp:', timestamp)
        return t('document.change_requests.dialog.invalid_date')
    }
    const date = new Date(numericTimestamp)
    if (isNaN(date.getTime())) {
        console.error('Invalid date created from timestamp:', numericTimestamp)
        return t('document.change_requests.dialog.invalid_date')
    }

    return date.toLocaleDateString(locale.value === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

const openApproveDialog = () => {
    dialogStore.openDialog(ChangeRequestReviewModal, {
        mode: 'approve',
        onClose: () => {
            dialogStore.closeDialog()
        },
        onSubmit: async (comment: string) => {
            if (!changeRequest.value) return

            try {
                isLoading.value = true
                await apiPost(
                    `/documents/change-requests/${changeRequest.value.id}/review`,
                    {
                        status: ChangeRequestStatus.ACCEPTED,
                        reviewComment:
                            comment ||
                            t('document.change_requests.dialog.default_approve_comment')
                    },
                    authStore
                )

                toast.showToast(
                    t('common.success'),
                    t('document.change_requests.dialog.toast_approved_ok'),
                    'success'
                )
                dialogStore.closeDialog()
                handleConfirm()
            } catch (error: any) {
                console.error('Error approving change request:', error)
                const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
                toast.showToast(
                    t('common.error'),
                    raw || t('document.change_requests.dialog.toast_approve_failed'),
                    'error'
                )
            } finally {
                isLoading.value = false
            }
        }
    })
}

const openRejectDialog = () => {
    dialogStore.openDialog(ChangeRequestReviewModal, {
        mode: 'reject',
        onClose: () => {
            dialogStore.closeDialog()
        },
        onSubmit: async (comment: string) => {
            if (!changeRequest.value) return

            try {
                isLoading.value = true
                await apiPost(
                    `/documents/change-requests/${changeRequest.value.id}/review`,
                    {
                        status: ChangeRequestStatus.REJECTED,
                        reviewComment: comment
                    },
                    authStore
                )

                toast.showToast(
                    t('common.success'),
                    t('document.change_requests.dialog.toast_rejected_ok'),
                    'success'
                )
                dialogStore.closeDialog()
                handleConfirm()
            } catch (error: any) {
                console.error('Error rejecting change request:', error)
                const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
                toast.showToast(
                    t('common.error'),
                    raw || t('document.change_requests.dialog.toast_reject_failed'),
                    'error'
                )
            } finally {
                isLoading.value = false
            }
        }
    })
}

const deleteChangeRequest = async () => {
    if (!changeRequest.value) return

    dialogStore.openDialog(ConfirmDialog, {
        message: t('document.change_requests.dialog.delete_confirm'),
        onConfirm: async () => {
            try {
                isLoading.value = true
                await apiDelete(`/documents/change-requests/${changeRequest.value!.id}`, authStore)
                toast.showToast(t('common.success'), t('document.change_requests.dialog.toast_deleted_ok'), 'success')
                handleConfirm()
            } catch (error: any) {
                console.error('Error deleting change request:', error)
                const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
                toast.showToast(
                    t('common.error'),
                    raw || t('document.change_requests.dialog.toast_delete_failed'),
                    'error'
                )
            } finally {
                isLoading.value = false
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

onMounted(() => {
    if (isViewMode.value && changeRequestId.value) {
        fetchChangeRequest()
    } else if (!isViewMode.value) {
        fetchOrganizationUnits()
    }
})

// Clear selected documents when organization unit changes
watch(
    () => formData.organizationUnit,
    (newOU, oldOU) => {
        // Only clear if the OU actually changed (not on initial mount)
        if (oldOU !== undefined && newOU?.id !== oldOU?.id) {
            selectedDocuments.value = []
            documentSearchResults.value = []
        }
    }
)
</script>
