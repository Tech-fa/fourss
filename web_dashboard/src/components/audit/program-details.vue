<template>
    <div id="main-container" class="min-h-screen bg-neutral-50">
        <!-- Header -->
        <BreadCrums :crumbs="crums" />

        <!-- Main Content -->
        <main class="mx-auto lg:p-12 p-6 max-w-7xl">
            <!-- Program Information Section -->
            <section id="program-info" class="mb-8 border rounded-lg p-6 bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl" test-id="audit-program-info-title">{{ t('audit.program_details.info_title') }}</h2>
                </div>

                <div class="grid grid-cols-2 gap-6" v-if="auditProgram">
                    <div class="space-y-2" test-id="audit-program-title-field">
                        <label class="block text-sm font-medium">{{ t('audit.program_details.program_label') }}</label>
                        <AppInput
                            :value="auditProgram.title"
                            hide-icon
                            readonly
                            class="bg-neutral-100"
                        />
                    </div>
                    <div class="space-y-2" test-id="audit-program-activity-type-field">
                        <label class="block text-sm font-medium">{{ t('audit.program_details.activity_type_label') }}</label>
                        <AppInput
                            :value="auditProgram.auditActivityType?.name || t('training.main.na')"
                            hide-icon
                            readonly
                            class="bg-neutral-100"
                        />
                    </div>
                    <div class="space-y-2" test-id="audit-program-status-field">
                        <label class="block text-sm font-medium">{{ t('audit.program_details.status_label') }}</label>
                        <AppInput
                            :value="programStatusDisplay"
                            hide-icon
                            readonly
                            class="bg-neutral-100"
                        />
                    </div>
                    <div class="space-y-2" test-id="audit-program-start-date-field">
                        <label class="block text-sm font-medium">{{ t('audit.program_details.start_date_label') }}</label>
                        <AppInput
                            :value="auditProgram.startDate ? formatDateToDay(auditProgram.startDate) : t('training.main.na')"
                            hide-icon
                            readonly
                            class="bg-neutral-100"
                        />
                    </div>
                    <div class="space-y-2" test-id="audit-program-duration-field">
                        <label class="block text-sm font-medium">{{ t('audit.program_details.duration_label') }}</label>
                        <AppInput
                            :value="formatProgramDuration(auditProgram.duration)"
                            hide-icon
                            readonly
                            class="bg-neutral-100"
                        />
                    </div>
                    <div class="space-y-2" test-id="audit-program-qms-standard-field">
                        <label class="block text-sm font-medium">{{ t('audit.program_details.qms_standard_label') }}</label>
                        <AppInput
                            :value="auditProgram.standards?.map((standard) => standard.name).join(', ') || t('training.main.na')"
                            hide-icon
                            readonly
                            class="bg-neutral-100"
                        />
                    </div>
                </div>

                <!-- Loading state -->
                <div v-else-if="loadingProgram" class="flex justify-center py-8">
                    <Spinner width="5" />
                </div>
            </section>

            <section id="audit-program-schedule" class="mb-8 border rounded-lg p-6 bg-white" v-if="auditProgram">
                <h2 class="text-xl mb-4">{{ t('audit.program_details.schedule_title') }}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <div
                        v-for="month in monthOptions"
                        :key="month.id"
                        class="border border-neutral-100 rounded-md p-3 min-h-24"
                    >
                        <h3 class="font-medium text-sm mb-2">{{ month.name }}</h3>
                        <div
                            v-for="entry in entriesForMonth(month.id)"
                            :key="entry.id || `${entry.year}-${entry.month}-${entry.process}`"
                            class="mb-2 last:mb-0 rounded bg-neutral-50 p-2 text-sm"
                        >
                            <div class="flex items-start justify-between gap-2">
                                <span>{{ entry.year }} · {{ entry.process || t('training.main.na') }}</span>
                                <span
                                    v-if="entry.isUnplanned"
                                    class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                                >
                                    {{ t('audit.program_cards.unplanned_badge') }}
                                </span>
                            </div>
                            <p v-if="entry.notes" class="text-xs text-neutral-500 mt-1">{{ entry.notes }}</p>
                            <p v-if="entry.isUnplanned" class="text-xs text-amber-800 mt-1">
                                {{ entry.amendmentReason || t('audit.program_cards.no_amendment_reason') }}
                            </p>
                        </div>
                        <p v-if="entriesForMonth(month.id).length === 0" class="text-sm text-neutral-400">
                            {{ t('audit.program_cards.no_entries') }}
                        </p>
                    </div>
                </div>
                <div
                    v-if="!auditProgram.scheduleEntries?.length"
                    class="mt-4 rounded-md bg-neutral-50 p-4 text-sm text-neutral-500"
                >
                    {{ t('audit.program_cards.no_schedule') }}
                </div>
            </section>

            <!-- Audit Instances Section -->
            <section id="audit-instances" class="border rounded-lg p-6 bg-white">
                <h2 class="text-xl mb-6" test-id="audit-instances-title">{{ t('audit.program_details.instances_title') }}</h2>
                <div id="search-filter" class="mb-6">
                    <div class="flex gap-4">
                        <div class="flex-1">
                            <div class="relative">
                                <span v-if="!loadingInstances">
                                    <component
                                        :is="
                                            h('i', {
                                                class: 'fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400'
                                            })
                                        "
                                    />
                                </span>
                                <AppInput
                                    test-id="audit-instances-search-input"
                                    v-model="searchTerm"
                                    @input="handleSearch"
                                    type="text"
                                    :placeholder="t('audit.program_details.search_placeholder')"
                                    class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                                />
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <span style="min-width: 150px">
                                <Select2
                                    v-model="selectedStatus"
                                    :values="statuses"
                                    :display="displayInstanceStatusOption"
                                    :placeholder="t('managementReview.allStatuses')"
                                    optional
                                    test-id="audit-instances-status-select"
                                />
                            </span>
                            <Can subject="audit_instances" :actions="['create']">
                                <AppButton
                                    button-style="primary"
                                    @click="scheduleNewInstance"
                                    v-if="auditProgram && !isDraftProgram"
                                    test-id="schedule-audit-instance-button"
                                >
                                    <i class="fa-solid fa-plus mr-2"></i>{{ t('audit.program_details.schedule_new') }}
                                </AppButton>
                            </Can>
                        </div>
                    </div>
                </div>
                <Table
                    test-id="audit-instances-table"
                    :cols="instanceCols"
                    :column-labels="instanceColumnLabels"
                    :rows="instanceRows"
                    :entities="auditInstances"
                    :page="currentPage"
                    :total="totalInstances"
                    :per-page="perPage"
                    :total-pages="totalPages"
                    :on-next-page="nextPage"
                    :on-previous-page="prevPage"
                    :set-page="setPage"
                    :on-success="updatePagination"
                    :loading="loadingInstances"
                    :entity-name="t('audit.main.entity_name')"
                    :map-status-style="mapInstanceStatusStyle"
                    :view-path="getInstanceViewPath"
                    :edit-path="getInstanceEditPath"
                    :handle-delete="handleDelete"
                    :hideEdit="hideEditForCompletedOrCancelledOrOnHoldOrDraft"
                    :hideView="hideViewForDraft"
                    subject="audit_instances"
                />
            </section>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, h, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BreadCrums from '../breadCrums.vue'
import AppInput from '../AppInput.vue'
import AppButton from '../AppButton.vue'
import Table from '../Table.vue'
import { apiGet, apiDelete } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import type { AuditProgram, AuditInstance, AuditProgramScheduleEntry } from '@/util/interfaces'
import { AUDIT_INSTANCE_STATUS_OPTIONS, AuditInstanceStatus, AuditProgramStatus } from '@/util/interfaces'
import { formatDateToDay, snakeToCamelCase, formatApiErrorMessage } from '@/util/util'
import Can from '../Can.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useDialog } from '@/stores/dialog'
import Select2 from '../Select2.vue'
import Spinner from '../Spinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const dialogStore = useDialog()
const { t, locale } = useI18n()

const formatProgramDuration = (duration?: number) => {
    if (!duration) return t('training.main.na')
    return t(
        duration === 1 ? 'audit.program_list.duration_one' : 'audit.program_list.duration_many',
        { count: duration }
    )
}

const programStatusDisplay = computed(() => {
    void locale.value
    const s = auditProgram.value?.status
    return s ? t(`audit.program_status.${s}`) : t('training.main.na')
})

const monthOptions = computed(() => {
    void locale.value
    return [
        { id: 1, name: t('audit.months.january') },
        { id: 2, name: t('audit.months.february') },
        { id: 3, name: t('audit.months.march') },
        { id: 4, name: t('audit.months.april') },
        { id: 5, name: t('audit.months.may') },
        { id: 6, name: t('audit.months.june') },
        { id: 7, name: t('audit.months.july') },
        { id: 8, name: t('audit.months.august') },
        { id: 9, name: t('audit.months.september') },
        { id: 10, name: t('audit.months.october') },
        { id: 11, name: t('audit.months.november') },
        { id: 12, name: t('audit.months.december') }
    ]
})

const entriesForMonth = (month: number): AuditProgramScheduleEntry[] =>
    (auditProgram.value?.scheduleEntries || []).filter((entry) => entry.month === month)

// Reactive data
const auditProgram = ref<AuditProgram>()
const auditInstances = ref<AuditInstance[]>([])
const allAuditInstances = ref<AuditInstance[]>([])
const loadingProgram = ref(false)
const loadingInstances = ref(false)
const currentPage = ref(1)
const perPage = ref(10)
const totalInstances = ref(0)
const totalPages = ref(0)
const searchTerm = ref('')
const selectedStatus = ref<any>(null)
const statuses = ref<any[]>(AUDIT_INSTANCE_STATUS_OPTIONS)
const searchTimeout = ref()

// Table configuration
const instanceCols = ['AuditId', 'StartDate', 'EndDate', 'Status', 'Location', 'ScheduledBy']

const instanceColumnLabels = computed(() => {
    void locale.value
    return {
        AuditId: t('audit.main.col_audit_id'),
        StartDate: t('audit.main.col_start_date'),
        EndDate: t('audit.main.col_end_date'),
        Status: t('audit.main.col_status'),
        Location: t('audit.main.col_location'),
        ScheduledBy: t('audit.program_details.col_scheduled_by')
    }
})

const instanceStatusKeyFromLabel = (label: string): AuditInstanceStatus | undefined =>
    Object.values(AuditInstanceStatus).find((key) => t(`audit.main.status.${key}`) === label)

const displayInstanceStatusOption = (val?: { id?: string; name?: string }) =>
    val?.id ? t(`audit.main.status.${val.id}`) : ''

const instanceRows = computed(() => {
    void locale.value
    const na = t('training.main.na')
    return auditInstances.value.map((instance) => ({
        id: instance.id,
        AuditId: instance.auditId || na,
        StartDate: instance.startDate ? formatDateToDay(instance.startDate) : t('audit.main.not_set'),
        EndDate: instance.endDate ? formatDateToDay(instance.endDate) : t('audit.main.not_set'),
        Status: instance.status ? t(`audit.main.status.${instance.status}`) : '',
        Location: instance.location || t('audit.main.location_not_specified'),
        ScheduledBy: instance.scheduledBy
            ? `${instance.scheduledBy.fname} ${instance.scheduledBy.lname}`
            : na
    }))
})

const crums = computed(() => {
    void locale.value
    return [
        {
            name: t('reports.modules.audits'),
            path: '/check/audits',
            icon: 'fa-solid fa-chart-line'
        },
        {
            name: t('common.settings'),
            path: '/check/audits/settings?tab=4',
            icon: 'fa-solid fa-gear text-neutral-700 text-2xl'
        },
        {
            name: auditProgram.value?.title || t('audit.program_details.breadcrumb_program'),
            path: `/check/audits/programs/${route.params.id}`,
            icon: 'fa-solid fa-file-pen'
        }
    ]
})

// Methods
const fetchAuditProgram = async () => {
    try {
        loadingProgram.value = true
        const response = await apiGet<AuditProgram>(
            `/audits/programs/${route.params.id}`,
            authStore
        )
        auditProgram.value = response
    } catch (error: any) {
        console.error('Error fetching audit program:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.program_details.toast_program_failed'),
            'error'
        )
    } finally {
        loadingProgram.value = false
    }
}

const fetchInstances = async () => {
    try {
        loadingInstances.value = true
        const params = new URLSearchParams()
        params.append('auditProgramId', route.params.id as string)
        
        if (selectedStatus.value?.id) {
            params.append('status', selectedStatus.value.id)
        }
        
        if (searchTerm.value.trim()) {
            params.append('search', searchTerm.value.trim())
        }

        const response = await apiGet<AuditInstance[]>(
            `/audits/instances?${params.toString()}`,
            authStore
        )

        allAuditInstances.value = response || []
        updatePagination()
    } catch (error: any) {
        console.error('Error fetching audit instances:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.program_details.toast_instances_failed'),
            'error'
        )
    } finally {
        loadingInstances.value = false
    }
}

const updatePagination = () => {
    totalInstances.value = allAuditInstances.value.length
    totalPages.value = Math.ceil(totalInstances.value / perPage.value)

    // Reset to page 1 if current page is beyond available pages
    if (currentPage.value > totalPages.value && totalPages.value > 0) {
        currentPage.value = 1
    }

    const startIndex = (currentPage.value - 1) * perPage.value
    const endIndex = startIndex + perPage.value
    auditInstances.value = allAuditInstances.value.slice(startIndex, endIndex)
}

watch([selectedStatus], async () => {
    currentPage.value = 1
    await fetchInstances()
})

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }

    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1
        fetchInstances()
    }, 300)
}

const mapInstanceStatusStyle = (statusLabel: string) => {
    const key =
        instanceStatusKeyFromLabel(statusLabel) ??
        Object.values(AuditInstanceStatus).find((k) => snakeToCamelCase(k) === statusLabel)
    switch (key) {
        case AuditInstanceStatus.DRAFT:
            return 'bg-neutral-200 text-neutral-700'
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

const getInstanceViewPath = (instance: { id: string }) => {
    return `/check/audits/${route.params.id}/instances/${instance.id}?source=program`
}

const getInstanceEditPath = (instance: { id: string }) => {
    const programId = route.params.id as string
    return `/check/audits/instances/${instance.id}/edit?auditProgramId=${programId}&redirect=/check/audits/${programId}`
}

const isDraftProgram = computed(() => {
    return auditProgram.value?.status === AuditProgramStatus.DRAFT
})

const hideEditForCompletedOrCancelledOrOnHoldOrDraft = (entity: AuditInstance) => {
    return (
        entity.status === AuditInstanceStatus.COMPLETED ||
        entity.status === AuditInstanceStatus.CANCELLED ||
        entity.status === AuditInstanceStatus.ON_HOLD ||
        entity.status === AuditInstanceStatus.DRAFT ||
        entity.status === AuditInstanceStatus.IN_PROGRESS
    )
}

const hideViewForDraft = (entity: AuditInstance) => {
    return entity.status === AuditInstanceStatus.DRAFT
}


const scheduleNewInstance = () => {
    const programId = route.params.id as string
    router.push({
        path: '/check/audits/instances/add',
        query: {
            auditProgramId: programId,
            redirect: `/check/audits/${programId}`
        }
    })
}

const handleDelete = async (item: any) => {
    if (!item?.id) return

    dialogStore.openDialog(ConfirmDialog, {
        message: t('audit.program_details.delete_confirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/audits/instances/${item.id}`, authStore)
                toast.showToast(t('common.success'), t('audit.program_details.toast_deleted'), 'success')
                await fetchInstances()
            } catch (error: any) {
                console.error('Error deleting audit instance:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                        t('audit.program_details.toast_delete_failed'),
                    'error'
                )
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++
        updatePagination()
    }
}

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
        updatePagination()
    }
}

const setPage = (page: number) => {
    currentPage.value = page
    updatePagination()
}

// Lifecycle
onMounted(() => {
    fetchAuditProgram()
    fetchInstances()
})
</script>
