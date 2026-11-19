<template>
    <main id="main-content" class="p-3">
        <div class="bg-white rounded-lg border p-4">
         

            <div id="search-filter" class="mb-6" test-id="ca-search-filter-section">
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
                            <AppInput
                                v-model="searchQuery"
                                @input="handleSearch"
                                type="text"
                                :placeholder="$t('nc.ca.searchPlaceholder')"
                                class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                                test-id="ca-search-input"
                            />
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <span style="min-width: 150px" test-id="ca-status-selector">
                            <Select2
                                v-model="selectedStatus"
                                :values="statusOptions"
                                :display="(val?: any) => labelForStatusOption(val, t)"
                                :placeholder="$t('nc.ca.selectStatus')"
                                @update:modelValue="handleStatusChange"
                            />
                        </span>
                        <span style="min-width: 150px" test-id="ca-priority-selector">
                            <Select2
                                v-model="selectedPriority"
                                :values="priorityOptions"
                                :display="(val?: any) => labelForStatusOption(val, t)"
                                :placeholder="$t('nc.ca.selectPriority')"
                                @update:modelValue="handlePriorityChange"
                            />
                        </span>
                        <Can subject="non_conformity_corrective_actions" :actions="['create']" v-if="canMutateNonConformity(props.nonConformity)">
                            <AppButton
                                buttonStyle="primary"
                                class="flex items-center gap-2"
                                :href="`/act/non-conformities/${ncId}/add-corrective-actions?rcaId=${props.rcaId}`"
                                test-id="add-corrective-action-button"
                            >
                                <i class="fa-solid fa-plus"></i>
                                {{ $t('nc.ca.addButton') }}
                            </AppButton>
                        </Can>
                    </div>
                </div>
            </div>

            <Table
                :cols="tableColumns"
                :column-labels="columnLabels"
                :rows="paginatedData"
                :entities="correctiveActionsEntities"
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
                :entity-name="$t('nc.ca.entityName')"
                subject="non_conformity_corrective_actions"
                :skip-padding="true"
                :hide-edit="(row) => handleEditnDeleteCorrectiveAction(row)"
                :hide-delete="(row) => handleEditnDeleteCorrectiveAction(row)"
                :view-path="(row) => `/act/non-conformities/${ncId}/corrective-actions/${row.id}`"
                :edit-path="(row) => `/act/non-conformities/${ncId}/${row.id}/edit?rcaId=${props.rcaId}`"
                :handle-delete="handleDelete"
            />
        </div>
    </main>
</template>
<script setup lang="ts">
import { ref, h, computed, onMounted } from 'vue'
import AppInput from '../AppInput.vue'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import Select2 from '../Select2.vue'
import { type NonConformityResponseDTO, NCCorrectiveActionStatus } from '@/util/interfaces'
import Table from '../Table.vue'
import { apiGet, apiDelete } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { formatDateToDay, snakeToCamelCase, formatApiErrorMessage, canMutateNonConformity } from '@/util/util'
import {
    NCCorrectiveActionPriorityOptions,
    NCCorrectiveActionStatusOptions,
    labelForStatusOption
} from '@/util/interfaces'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '../ConfirmDialog.vue'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'

const isLoading = ref(false)
const authStore = useAuthStore()
const toast = useToast()
const dialog = useDialog()
const { t } = useI18n()

const tableColumns: string[] = ['Title', 'Description', 'Priority', 'Due Date', 'Assignee', 'Status']

const columnLabels = computed(() => ({
    Title: t('nc.ca.tableTitle'),
    Description: t('nc.ca.tableDescription'),
    Priority: t('nc.ca.tablePriority'),
    'Due Date': t('nc.ca.tableDueDate'),
    Assignee: t('nc.ca.tableAssignee'),
    Status: t('nc.ca.tableStatus')
}))

const searchQuery = ref('')
const searchLoading = ref(false)
const searchTimeout = ref()

// Filter states
const selectedStatus = ref<any>(null)
const selectedPriority = ref<any>(null)

// Filter options
const statusOptions = ref<any[]>(NCCorrectiveActionStatusOptions)
const priorityOptions = ref<any[]>(NCCorrectiveActionPriorityOptions)

const currentPage = ref(1)
const totalPages = ref(1)
const totalNonConformityTypes = ref(1)
const perPage = ref(5)

const correctiveActionsEntities = ref<any[]>([])

//take the ncId from the route
const route = useRoute()
const ncId = route.params.id

const props = defineProps<{
    correctiveActions?: any[]
    nonConformity: NonConformityResponseDTO
    rcaId?: string
}>()

const emit = defineEmits<{
    (e: 'update:correctiveActions', value: any[]): void
}>()

const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * perPage.value
    const end = start + perPage.value
    return rows.value.slice(start, end)
})

const getPriorityName = (priorityValue: number) => {
    const found = NCCorrectiveActionPriorityOptions.find((opt) => opt.id === priorityValue)
    return found ? labelForStatusOption(found, t) : String(priorityValue)
}

function correctiveActionStatusLabel(status: string | undefined) {
    const opt = NCCorrectiveActionStatusOptions.find((o) => o.id === status)
    return opt ? labelForStatusOption(opt, t) : snakeToCamelCase(status ?? '')
}

const mapRows = (ncCorrectiveActions: any[]) => {
    if (!ncCorrectiveActions || !Array.isArray(ncCorrectiveActions)) {
        console.warn('No corrective actions data or invalid data format received')
        return []
    }

    return ncCorrectiveActions.map((action: any) => {
        const row = {
            id: action.id,
            Title: action.title,
            Description: action.description || t('nc.ca.noDescription'),
            Priority: getPriorityName(action.priority),
            'Due Date': formatDateToDay(action.dueDate),
            Assignee: action.assignedTo
                ? `${action.assignedTo.fname} ${action.assignedTo.lname}`
                : '',
            Status: correctiveActionStatusLabel(action.status)
        }
        return row
    })
}

const rows = computed(() => mapRows(correctiveActionsEntities.value))

const updateLocalState = (data: any[]) => {
    correctiveActionsEntities.value = data
    totalNonConformityTypes.value = data.length
    totalPages.value = Math.ceil(data.length / perPage.value)
    isLoading.value = false
}

onMounted(() => {
    if (props.correctiveActions && props.correctiveActions.length > 0) {
        updateLocalState(props.correctiveActions)
    } else {
        fetchNCCorrectiveActions()
    }
})

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1
        fetchNCCorrectiveActions(true)
    }, 300)
}

const handleStatusChange = () => {
    currentPage.value = 1
    fetchNCCorrectiveActions(true)
}

const handlePriorityChange = () => {
    currentPage.value = 1
    fetchNCCorrectiveActions(true)
}

const fetchNCCorrectiveActions = async (fromSearch = false) => {
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

        if (selectedPriority.value?.id) {
            params.append('priority', selectedPriority.value.id.toString())
        }

        params.append('nonConformityId', ncId as string)

        const response = await apiGet<any[]>(
            `/non-conformities/corrective-actions?${params.toString()}`,
            authStore
        )
        if (!response) {
            console.error('Invalid response format:', response)
            toast.showToast(t('common.error'), t('common.invalidResponseFormat'), 'error')
            return
        }
        updateLocalState(response)
        emit('update:correctiveActions', response)
    } catch (err) {
        console.error('Error fetching corrective actions:', err)
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
        fetchNCCorrectiveActions()
    }
}

const handlePreviousPage = () => {  
    if (currentPage.value > 1) {
        currentPage.value--
        fetchNCCorrectiveActions()
    }
}

const handleSetPage = (page: number) => {
    if (page !== currentPage.value) {
        currentPage.value = page
        fetchNCCorrectiveActions()
    }
}

const handleEditnDeleteCorrectiveAction = (entity: any): boolean => {
    // If entity doesn't have the fields we need, try to find it in correctiveActionsEntities
    let actualEntity = entity
    if (entity?.id && (!entity?.createdBy && !entity?.createdById || !entity?.status)) {
        actualEntity = correctiveActionsEntities.value.find((e: any) => e.id === entity.id) || entity
    }
    
    const createdById = actualEntity?.createdBy?.id || actualEntity?.createdById
    const isCreatedByUser = createdById === authStore.state.userDetails.id
    
    const isOpen = actualEntity?.status === NCCorrectiveActionStatus.OPEN

    if (!canMutateNonConformity(props.nonConformity)) return true

    return !isCreatedByUser || !isOpen
}

const handleDelete = (correctiveAction: any) => {
    dialog.openDialog(ConfirmDialog, {
        message: t('nc.ca.deleteConfirm', { title: correctiveAction.title }),
        onConfirm: async () => {
            try {
                await apiDelete(`/non-conformities/corrective-actions/${correctiveAction.id}`, authStore)
                toast.showToast(t('common.success'), t('nc.ca.deleteSuccess'), 'success')
                await fetchNCCorrectiveActions()
            } catch (error: any) {
                console.error('Error deleting corrective action:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.ca.deleteError'),
                    'error'
                )
            } finally {
                dialog.closeDialog()
            }
        },
        onCancel: dialog.closeDialog
    })
}
</script>
