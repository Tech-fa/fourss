<template>
    <div id="main-container" class="min-h-screen ">
        <!-- Header -->
        <BreadCrums :crumbs="breadcrumbCrumbs">
            <div class="flex items-center space-x-4">
                <div class="flex gap-4">
                    <Can
                        :subjects="[
                            'audit_activity_types',
                            'audit_roles',
                            'audit_personnels',
                            'audit_checklist_definitions',
                            'audit_programs'
                        ]"
                        :actions="['read']"
                    >
                        <IconTooltipButton
                            buttonStyle="secondary"
                            class="flex items-center gap-2"
                            href="/check/audits/settings"
                            test-id="settings-button"
                            :text="t('common.settings')"
                            icon-class="fa-solid fa-gear"
                        />
                    </Can>
              
                </div>
            </div>
        </BreadCrums>
        <main id="main-content" class="px-1 sm:px-6 lg:px-8 pt-6 pb-4">
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
                                :placeholder="t('audit.main.search_placeholder')"
                                class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                                test-id="audit-instances-search"
                            />
                        </div>
                    </div>
                    <div class="flex gap-2 items-center flex-wrap">
                        <span style="min-width: 150px">
                            <Select2
                                v-model="selectedStatus"
                                :values="statuses"
                                :display="displayStatusOption"
                                :placeholder="t('managementReview.allStatuses')"
                                :optional="true"
                            />
                        </span>
                        <span style="min-width: 200px">
                            <Select2
                                v-model="selectedProgram"
                                :values="auditPrograms"
                                :display="(program: any) => program?.title || ''"
                                :placeholder="t('audit.main.filter_all_programs')"
                                :optional="true"
                            />
                        </span>
                        <span style="min-width: 200px">
                            <AppInput
                                v-model="criteriaFilter"
                                @input="handleSearch"
                                type="text"
                                :placeholder="t('audit.main.filter_all_criteria')"
                                class="w-full px-4 py-2 border border-neutral-200 rounded-md"
                                test-id="audit-criteria-filter"
                            />
                        </span>

                        <div class="flex items-center space-x-2">
                            <div class="flex bg-neutral-100 rounded-lg p-1">
                                <button
                                    @click="viewMode = 'programs'"
                                    :class="[
                                        'px-3 py-1 text-sm rounded-md transition-colors',
                                        viewMode === 'programs'
                                            ? 'bg-white text-neutral-900 shadow-sm'
                                            : 'text-neutral-600 hover:text-neutral-900'
                                    ]"
                                    test-id="view-toggle-programs"
                                >
                                    <i class="fa-solid fa-calendar-days mr-1"></i>
                                    {{ t('audit.main.viewPrograms') }}
                                </button>
                                <button
                                    @click="viewMode = 'plans'"
                                    :class="[
                                        'px-3 py-1 text-sm rounded-md transition-colors',
                                        viewMode === 'plans'
                                            ? 'bg-white text-neutral-900 shadow-sm'
                                            : 'text-neutral-600 hover:text-neutral-900'
                                    ]"
                                    test-id="view-toggle-plans"
                                >
                                    <i class="fa-solid fa-table mr-1"></i>
                                    {{ t('audit.main.viewPlans') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AuditProgramCards
                v-if="viewMode === 'programs'"
                :programs="auditPrograms"
                :loading="programsLoading"
                @add-unplanned="openAmendmentModal"
            />
      
            <Table
            v-if="viewMode === 'plans'"
            test-id="audit-instances-table"
            :skip-padding="true"
                :cols="auditTableColumns"
                :column-labels="auditColumnLabels"
                :rows="auditTableRows"
                :entities="auditInstances"
                :page="currentPage"
                :total="totalAuditInstances"
                :perPage="perPage"
                :totalPages="totalPages"
                :loading="loading"
                :searchLoading="searchLoading"
                :onNextPage="handleNextPage"
                :onPreviousPage="handlePreviousPage"
                :setPage="handleSetPage"
                :onSuccess="fetchAuditInstances"
                :entityName="t('audit.main.entity_name')"
                :mapStatusStyle="getStatusClass"
                :subject="'audit_instances'"
                :view-path="getInstanceViewPath"
                :edit-path="getInstanceEditPath"
                :hideEdit="hideEditForCompletedOrCancelledOrOnHold"
                :handle-delete="handleDelete"
                :sorted-columns="['StartDate']"
                :on-sort="handleSort"
            >
            <template #extra-search>
                <Can
                :subjects="['audit_instances']"
                :actions="['create']"
            >
                <IconTooltipButton
                    buttonStyle="primary"
                    class="flex items-center gap-2"
                    :tooltip-placement="auditTableRows.length > 0 ? 'left' : 'right'"
                    href="/check/audits/instances/add"
                    test-id="create-audit-instance-button"
                    :text="t('audit.main.create_audit_instance')"
                    icon-class="fa-solid fa-plus"
                />
            </Can>
            </template>
            </Table>
        </main>
    </div>
</template>
<script setup lang="ts">
import AppButton from '../AppButton.vue'
import BreadCrums from '../breadCrums.vue'
import Can from '../Can.vue'
import { ref, h, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppInput from '../AppInput.vue'
import Spinner from '../Spinner.vue'
import Select2 from '../Select2.vue'
import Table from '../Table.vue'
import { apiGet, apiDelete } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { AUDIT_INSTANCE_STATUS_OPTIONS, type AuditInstance, AuditInstanceStatus, type AuditProgram } from '@/util/interfaces'
import { formatDateToDay, snakeToCamelCase, formatApiErrorMessage } from '@/util/util'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '../ConfirmDialog.vue'
import AuditProgramCards from './audit-program-cards.vue'
import AuditProgramAmendmentModal from './audit-program-amendment-modal.vue'
import IconTooltipButton from '../IconTooltipButton.vue'

const authStore = useAuthStore()
const toast = useToast()
const { t, locale } = useI18n()

const auditTableColumns: string[] = [
    'AuditId',
    'Criteria',
    'Program',
    'StartDate',
    'EndDate',
    'Status',
    'Location'
]

const auditColumnLabels = computed(() => {
    void locale.value
    return {
        AuditId: t('audit.main.col_audit_id'),
        Criteria: t('audit.main.col_criteria'),
        Program: t('audit.main.col_program'),
        StartDate: t('audit.main.col_start_date'),
        EndDate: t('audit.main.col_end_date'),
        Status: t('audit.main.col_status'),
        Location: t('audit.main.col_location')
    }
})

const naLabel = () => t('training.main.na')

const auditTableRows = computed(() => {
    void locale.value
    const na = naLabel()
    return auditInstances.value.map((instance) => ({
        id: instance.id,
        auditProgramId: instance.auditProgramId || instance.auditProgram?.id,
        AuditId: instance.auditId || na,
        Criteria: instance.criteria || na,
        Program: instance.auditProgram?.title || na,
        StartDate: instance.startDate ? formatDateToDay(instance.startDate) : t('audit.main.not_set'),
        EndDate: instance.endDate ? formatDateToDay(instance.endDate) : t('audit.main.not_set'),
        Status: instance.status ? t(`audit.main.status.${instance.status}`) : '',
        Location: instance.location || t('audit.main.location_not_specified')
    }))
})

const breadcrumbCrumbs = computed(() => {
    void locale.value
    return [{ name: t('reports.modules.audits'), path: '/check/audits', icon: 'fa-solid fa-chart-line' }]
})

const displayStatusOption = (val?: { id?: string; name?: string }) =>
    val?.id ? t(`audit.main.status.${val.id}`) : ''

const statusKeyFromTranslatedLabel = (label: string): AuditInstanceStatus | undefined =>
    Object.values(AuditInstanceStatus).find((key) => t(`audit.main.status.${key}`) === label)
const viewMode = ref<'programs' | 'plans'>('plans')
const searchQuery = ref('')
const searchLoading = ref(false)
const loading = ref(false)
const allAuditInstances = ref<AuditInstance[]>([])
const auditInstances = ref<AuditInstance[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const totalAuditInstances = ref(0)
const perPage = ref(10)
const selectedStatus = ref<any>(null)
const statuses = ref<any[]>(AUDIT_INSTANCE_STATUS_OPTIONS)
const selectedProgram = ref<AuditProgram | null>(null)
const criteriaFilter = ref('')
const auditPrograms = ref<AuditProgram[]>([])
const programsLoading = ref(false)
const searchTimeout = ref()
const dialog = useDialog()
const sortBy = ref('')
const sortDir = ref<'asc' | 'desc' | null>(null)

watch([selectedStatus, selectedProgram], async () => {
    currentPage.value = 1
    await fetchAuditInstances()
})

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }

    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1
        fetchAuditInstances()
    }, 300)
}

const getStatusClass = (statusLabel: string) => {
    const key =
        statusKeyFromTranslatedLabel(statusLabel) ??
        Object.values(AuditInstanceStatus).find((k) => snakeToCamelCase(k) === statusLabel)
    switch (key) {
        case AuditInstanceStatus.SCHEDULED:
            return 'bg-blue-100 text-blue-800'
        case AuditInstanceStatus.IN_PROGRESS:
            return 'bg-yellow-100 text-yellow-800'
        case AuditInstanceStatus.COMPLETED:
            return 'bg-green-100 text-green-800'
        case AuditInstanceStatus.CANCELLED:
            return 'bg-red-100 text-red-800'
        case AuditInstanceStatus.ON_HOLD:
            return 'bg-orange-100 text-orange-800'
        default:
            return ''
    }
}

const fetchAuditInstances = async () => {
    loading.value = true
    try {
        const params = new URLSearchParams()
        if (searchQuery.value.trim()) {
            params.append('search', searchQuery.value.trim())
        }
        if (selectedStatus.value?.id) {
            params.append('status', selectedStatus.value.id)
        }
        if (selectedProgram.value?.id) {
            params.append('auditProgramId', selectedProgram.value.id)
        }
        if (criteriaFilter.value.trim()) {
            params.append('criteria', criteriaFilter.value.trim())
        }
        // Exclude draft instances and instances whose audit program is draft
        params.append('excludedraft', 'true')
        if (sortBy.value && sortDir.value) {
            params.append('sortBy', sortBy.value)
            params.append('sortDir', sortDir.value)
        }

        const response = await apiGet<AuditInstance[]>(
            `/audits/instances?${params.toString()}`,
            authStore
        )
        allAuditInstances.value = response || []
        totalAuditInstances.value = allAuditInstances.value.length
        totalPages.value = Math.ceil(totalAuditInstances.value / perPage.value)
        updateCurrentPageData()
    } catch (error: any) {
        console.error('Error fetching audit instances:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') || t('audit.main.toast_fetch_failed'),
            'error'
        )
    } finally {
        loading.value = false
    }
}

const updateCurrentPageData = () => {
    const start = (currentPage.value - 1) * perPage.value
    const end = start + perPage.value
    auditInstances.value = allAuditInstances.value.slice(start, end)
}

const handleNextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++
        updateCurrentPageData()
    }
}

const handlePreviousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
        updateCurrentPageData()
    }
}

const handleSetPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
        updateCurrentPageData()
    }
}

const handleSort = (col: string, direction: 'asc' | 'desc' | null) => {
    if (col !== 'StartDate') return
    sortBy.value = 'startDate'
    sortDir.value = direction
    currentPage.value = 1
    fetchAuditInstances()
}

const getInstanceViewPath = (row: any) => {
    const programId = row.auditProgramId
    return `/check/audits/${programId}/instances/${row.id}?source=main`
}

const getInstanceEditPath = (row: any) => {
    const programId = row.auditProgramId
    return `/check/audits/instances/${row.id}/edit`
}

const hideEditForCompletedOrCancelledOrOnHold = (entity: AuditInstance) => {
    return (
        entity.status === AuditInstanceStatus.COMPLETED ||
        entity.status === AuditInstanceStatus.CANCELLED ||
        entity.status === AuditInstanceStatus.ON_HOLD
    )
}

const handleDelete = async (item: AuditInstance) => {
    if (!item?.id) return
    
    dialog.openDialog(ConfirmDialog, {
        message: t('audit.main.delete_confirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/audits/instances/${item.id}`, authStore)
                toast.showToast(t('common.success'), t('audit.main.toast_deleted'), 'success')
                await fetchAuditInstances()
            } catch (error: any) {
                console.error('Error deleting audit instance:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error?.response?.data, t, 'errors.audit') || t('audit.main.toast_delete_failed'),
                    'error'
                )
            } finally {
                dialog.closeDialog()
            }
        },
        onCancel: dialog.closeDialog
    })
}

onMounted(async () => {
    fetchAuditPrograms()
    fetchAuditInstances()
})

const fetchAuditPrograms = async () => {
    programsLoading.value = true
    try {
        const response = await apiGet<AuditProgram[]>(`/audits/programs?excludeDraft=true`, authStore)
        auditPrograms.value = response || []
    } catch (error) {
        console.error('Error fetching audit programs for filter:', error)
        auditPrograms.value = []
    } finally {
        programsLoading.value = false
    }
}

const openAmendmentModal = (program: AuditProgram) => {
    dialog.openDialog(AuditProgramAmendmentModal, {
        program,
        onSaved: fetchAuditPrograms
    })
}
</script>
