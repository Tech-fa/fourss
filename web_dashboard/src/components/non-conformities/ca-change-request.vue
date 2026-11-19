<template>
    <main id="main-content" class="p-0">
        <div>
            <div id="search-filter" class="mb-6">
                <div class="flex gap-4">
                    <div class="flex-1">
                        <div class="relative">
                            <span v-if="!searchLoading">
                                <component
                                    :is="
                                        h('i', {
                                            class: 'fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400'
                                        })
                                    "
                                />
                            </span>
                            <Spinner
                                v-if="searchLoading"
                                width="1"
                                class="absolute left-3 top-1/2 -translate-y-1/2"
                            />
                            <AppInput
                                v-model="searchQuery"
                                @input="handleSearch"
                                type="text"
                                :placeholder="$t('nc.changeRequest.searchPlaceholder')"
                                class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                                test-id="cr-search-input"
                            />
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <span style="min-width: 150px">
                            <Select2
                                v-model="selectedStatus"
                                :values="statusOptions"
                                :display="(val?: any) => labelForStatusOption(val, t)"
                                :placeholder="$t('nc.changeRequest.statusPlaceholder')"
                                @update:modelValue="handleStatusChange"
                                test-id="ca-change-request-status-select"
                            />
                        </span>
                        <span style="min-width: 150px">
                            <Select2
                                v-model="selectedType"
                                :values="typeOptions"
                                :display="(val?: any) => labelForStatusOption(val, t)"
                                :placeholder="$t('nc.changeRequest.typePlaceholder')"
                                @update:modelValue="handleTypeChange"
                                test-id="ca-change-request-type-select"
                            />
                        </span>
                        <div
                            v-if="props.caAssignee?.id === authStore.state.userDetails.id && props.caStatus === NCCorrectiveActionStatus.OPEN"
                        >
                            <Can subject="ca_change_requests" :actions="['create']">
                                <AppButton
                                    buttonStyle="primary"
                                    class="flex items-center gap-2"
                                    @click="openModal"
                                    test-id="cr-add-button"
                                >
                                    <i class="fa-solid fa-plus"></i>
                                    {{ $t('nc.changeRequest.addButton') }}
                                </AppButton>
                            </Can>
                        </div>
                    </div>
                </div>
            </div>

            <Table
                :cols="tableColumns"
                :column-labels="columnLabels"
                :rows="paginatedData"
                :entities="nonConformityTypesEntities"
                :total-pages="totalPages"
                :page="currentPage"
                :total="totalNonConformityTypes"
                :per-page="perPage"
                :on-next-page="handleNextPage"
                :on-previous-page="handlePreviousPage"
                :set-page="handleSetPage"
                :loading="isLoading"
                :search-loading="searchLoading"
                :on-success="() => {}"
                :entity-name="$t('nc.changeRequest.entityName')"
                subject="ca_change_requests"
                :hideView="(row) => true"
                :hideEdit="(row) => true"
                :hideDelete="
                    (row) =>
                        props.createdById !== authStore.state.userDetails.id ||
                        (props.createdById === authStore.state.userDetails.id &&
                            row.status === CaChangeRequestStatus.PENDING) ||
                        props.caStatus === NCCorrectiveActionStatus.CLOSED
                "
                :handle-delete="handleDelete"
                :skip-padding="true"
            >
                <template #extra-field="{ entity }">
                    <Can
                        :actions="['update']"
                        v-if="
                            props.createdById === authStore.state.userDetails.id &&
                            props.caStatus === NCCorrectiveActionStatus.OPEN
                        "
                    >
                        <div
                            v-if="entity.status === CaChangeRequestStatus.PENDING"
                            class="flex gap-2"
                        >
                            <AppButton
                                buttonStyle="success"
                                size="sm"
                                :warnBefore="$t('nc.changeRequest.approveConfirm')"
                                @click="handleApprove(entity, CaChangeRequestStatus.APPROVED)"
                                :test-id="`cr-approve-button-${entity.id}`"
                            >
                                <i class="fa-solid fa-check"></i>
                            </AppButton>
                            <AppButton
                                buttonStyle="danger"
                                size="sm"
                                :warnBefore="$t('nc.changeRequest.rejectConfirm')"
                                @click="handleApprove(entity, CaChangeRequestStatus.REJECTED)"
                                :test-id="`cr-reject-button-${entity.id}`"
                            >
                                <i class="fa-solid fa-xmark"></i>
                            </AppButton>
                        </div>
                    </Can>
                </template>
            </Table>
        </div>
    </main>
</template>
<script setup lang="ts">
import { ref, h, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Spinner from '../Spinner.vue'
import AppInput from '../AppInput.vue'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import Select2 from '../Select2.vue'
import {
    CaChangeRequestType,
    NCCorrectiveActionStatus,
    CaChangeRequestStatusOptions,
    CaChangeRequestTypeOptions,
    labelForStatusOption
} from '@/util/interfaces'
import Table from '../Table.vue'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ModalForm from './change-request-modal.vue'
import { apiPost, apiGet, apiPut, apiDelete } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useRoute } from 'vue-router'
import { formatDateToDay, snakeToCamelCase, formatApiErrorMessage } from '@/util/util'
import { type CaChangeRequest, CaChangeRequestStatus } from '@/util/interfaces'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'

const dialogStore = useDialog()
const isLoading = ref(false)
const formLoading = ref(false)
const authStore = useAuthStore()
const toast = useToast()
const route = useRoute()
const { t } = useI18n()

const tableColumns: string[] = ['Title', 'Reason', 'Type', 'Status', 'Change']

const columnLabels = computed(() => ({
    Title: t('nc.changeRequest.tableTitle'),
    Reason: t('nc.changeRequest.tableReason'),
    Type: t('nc.changeRequest.tableType'),
    Status: t('nc.changeRequest.tableStatus'),
    Change: t('nc.changeRequest.tableChange')
}))

const searchQuery = ref('')
const searchLoading = ref(false)
const searchTimeout = ref()

// Filter states
const selectedStatus = ref<any>(null)
const selectedType = ref<any>(null)

// Filter options
const statusOptions = ref<any[]>(CaChangeRequestStatusOptions)
const typeOptions = ref<any[]>(CaChangeRequestTypeOptions)

const currentPage = ref(1)
const totalPages = ref(1)
const totalNonConformityTypes = ref(1)
const perPage = ref(5)

const nonConformityTypesEntities = ref<any[]>([])

const props = defineProps<{
    changeRequests?: any[]
    caDueDate?: number
    caAssignee?: any
    createdById?: string
    caStatus?: NCCorrectiveActionStatus
    ncId?: string
}>()

const emit = defineEmits<{
    (e: 'update:changeRequests', value: any[]): void
    (e: 'changeRequestUpdated'): void
}>()

const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * perPage.value
    const end = start + perPage.value
    return rows.value.slice(start, end)
})

const mapRows = (changeRequests: CaChangeRequest[]) => {
    if (!changeRequests || !Array.isArray(changeRequests)) {
        console.warn('No change request data or invalid data format received')
        return []
    }

    return changeRequests.map((changeRequest: CaChangeRequest) => {
        const typeOpt = CaChangeRequestTypeOptions.find((o) => o.id === changeRequest.type)
        const statusOpt = CaChangeRequestStatusOptions.find((o) => o.id === changeRequest.status)
        const row = {
            id: changeRequest.id,
            Title: changeRequest.title,
            Reason: changeRequest.reason,
            Type: typeOpt ? labelForStatusOption(typeOpt, t) : snakeToCamelCase(changeRequest.type),
            Status: statusOpt ? labelForStatusOption(statusOpt, t) : changeRequest.status,
            Change:
                changeRequest.type === CaChangeRequestType.DUE_DATE_CHANGE
                    ? formatDateToDay(changeRequest.newDueDate)
                    : changeRequest.newAssignee
                      ? changeRequest.newAssignee.fname + ' ' + changeRequest.newAssignee.lname
                      : null
        }
        return row
    })
}

const rows = computed(() => mapRows(nonConformityTypesEntities.value))

const updateLocalState = (data: CaChangeRequest[]) => {
    nonConformityTypesEntities.value = data
    totalNonConformityTypes.value = data.length
    totalPages.value = Math.ceil(data.length / perPage.value)
    isLoading.value = false
}

onMounted(() => {
    if (props.changeRequests && props.changeRequests.length > 0) {
        updateLocalState(props.changeRequests)
    } else {
        fetchChangeRequests()
    }
})

const openModal = () => {
    const ncId = props.ncId || route.params.ncId
    if (!ncId) {
        toast.showToast(t('common.error'), t('nc.changeRequest.ncIdRequired'), 'error')
        return
    }
    
    dialogStore.openDialog(ModalForm, {
        loading: formLoading,
        ncId: ncId as string,
        currentDueDate: Number(props.caDueDate),
        currentAssignee: props.caAssignee,
        onClose: dialogStore.closeDialog,
        onSubmit: async (data: any) => {
            try {
                formLoading.value = true
                const payload = {
                    title: data.name,
                    reason: data.reason,
                    type: data.type,
                    newDueDate: data.dueDate ? data.dueDate : null,
                    newAssigneeId: data.assignee ? data.assignee.id : null,
                    caId: route.params.id
                }
                await apiPost('/non-conformities/change-request', payload, authStore)
                toast.showToast(t('common.success'), t('nc.changeRequest.createSuccess'), 'success')
                dialogStore.closeDialog()
                await fetchChangeRequests()
            } catch (error: any) {
                console.error('Error saving change request:', error)
                toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.changeRequest.saveError'), 'error')
            } finally {
                formLoading.value = false
            }
        }
    })
}

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1
        fetchChangeRequests(true)
    }, 300)
}

const handleStatusChange = () => {
    currentPage.value = 1
    fetchChangeRequests(true)
}

const handleTypeChange = () => {
    currentPage.value = 1
    fetchChangeRequests(true)
}

const handleDelete = async (item: any) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('nc.changeRequest.deleteConfirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/non-conformities/change-request/${item.id}`, authStore)
                toast.showToast(t('common.success'), t('nc.changeRequest.deleteSuccess'), 'success')
                await fetchChangeRequests()
            } catch (error: any) {
                console.error('Error deleting change request:', error)
                toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.changeRequest.deleteError'), 'error')
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

const fetchChangeRequests = async (fromSearch = false) => {
    if (fromSearch) {
        searchLoading.value = true
    } else {
        isLoading.value = true
    }
    try {
        // Build query parameters
        const params = new URLSearchParams()

        if (searchQuery.value) {
            params.append('search', searchQuery.value)
        }

        if (selectedStatus.value?.id) {
            params.append('status', selectedStatus.value.id)
        }

        if (selectedType.value?.id) {
            params.append('type', selectedType.value.id)
        }

        // Add caId parameter
        params.append('caId', route.params.id as string)

        const response = await apiGet<CaChangeRequest[]>(
            `/non-conformities/change-request?${params.toString()}`,
            authStore
        )
        if (!response) {
            console.error('Invalid response format:', response)
            toast.showToast(t('common.error'), t('common.invalidResponseFormat'), 'error')
            return
        }
        updateLocalState(response)
        emit('update:changeRequests', response)
    } catch (err) {
        console.error('Error fetching change requests:', err)
    } finally {
        if (fromSearch) {
            searchLoading.value = false
        } else {
            isLoading.value = false
        }
    }
}

const handleNextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++
        fetchChangeRequests()
    }
}

const handlePreviousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
        fetchChangeRequests()
    }
}

const handleSetPage = (page: number) => {
    if (page !== currentPage.value) {
        currentPage.value = page
        fetchChangeRequests()
    }
}

function changeRequestStatusLabel(status: CaChangeRequestStatus | string) {
    const opt = CaChangeRequestStatusOptions.find((o) => o.id === status)
    return opt ? labelForStatusOption(opt, t) : snakeToCamelCase(String(status))
}

const handleApprove = async (entity: any, status: CaChangeRequestStatus) => {
    try {
        const payload = {
            id: entity.id,
            status: status
        }
        if (status === CaChangeRequestStatus.APPROVED) {
            await apiPut(`/non-conformities/change-request/${entity.id}`, payload, authStore)
        } else {
            await apiPut(`/non-conformities/change-request/${entity.id}`, payload, authStore)
        }
        toast.showToast(
            t('common.success'),
            t('nc.changeRequest.statusSuccess', { status: changeRequestStatusLabel(status) }),
            'success'
        )
        await fetchChangeRequests()
        emit('changeRequestUpdated')
    } catch (error: any) {
        console.error('Error approving change request:', error)
        toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.changeRequest.approveError'), 'error')
    }
}
</script>
