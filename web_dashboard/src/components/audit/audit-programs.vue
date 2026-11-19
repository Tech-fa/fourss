<template>
    <main id="main-content" class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-lg mb-1">{{ t('audit.program_list.title') }}</h2>
            </div>
            <div id="search-filter" class="mb-6">
                <div class="flex gap-4">
                    <div class="flex-1">
                        <div class="relative">
                            <AppInput
                                test-id="audit-programs-search"
                                v-model="searchQuery"
                                @input="handleSearch"
                                type="text"
                                :placeholder="t('audit.program_list.search_placeholder')"
                                class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                            />
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <Can subject="audit_programs" :actions="['create']">
                            <AppButton
                                buttonStyle="primary"
                                class="flex items-center gap-2"
                                href="/check/audits/add"
                                test-id="add-audit-program-button"
                            >
                                <i class="fa-solid fa-plus"></i>
                                {{ t('audit.program_list.create_button') }}
                            </AppButton>
                        </Can>
                    </div>
                </div>
            </div>
            <div test-id="audit-programs-list">
                <Table
                    :cols="programTableCols"
                    :column-labels="programColumnLabels"
                    :rows="paginatedRows"
                    :entities="allAuditPrograms"
                    :page="page"
                    :total="total"
                    :per-page="perPage"
                    :total-pages="totalPages"
                    :on-next-page="onNextPage"
                    :on-previous-page="onPreviousPage"
                    :set-page="setPage"
                    :loading="loading"
                    :on-success="onSuccess"
                    min-width="1280px"
                    :entity-name="t('audit.program_list.entity_name')"
                    subject="audit_programs"
                    :view-path="(row: any) => `/check/audits/${row.id}`"
                    :edit-path="(row: any) => `/check/audits/${row.id}/edit`"
                    :handle-delete="handleDelete"
                    :hide-search="true"
                    :mapStatusStyle="getStatusClass"
                    :hideEdit="(entity) => entity?.status === AuditProgramStatus.CANCELLED"
                    :extra-field="ScheduleInstance"
                    :extra-field-action="handleScheduleInstance"
                >
                </Table>
            </div>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import Table from '../Table.vue'
import AppButton from '../AppButton.vue'
import AppInput from '../AppInput.vue'
import Can from '../Can.vue'
import type { AuditProgram } from '@/util/interfaces'
import { AuditProgramStatus } from '@/util/interfaces'
import { apiDelete, apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '../ConfirmDialog.vue'
import { formatDateToDay, snakeToCamelCase, formatApiErrorMessage } from '@/util/util'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const toast = useToast()
const dialog = useDialog()
const router = useRouter()
const { t, locale } = useI18n()

const programTableCols = ['ProgramTitle', 'ActivityType', 'StartDate', 'Duration', 'Standards', 'Status']

const programColumnLabels = computed(() => {
    void locale.value
    return {
        ProgramTitle: t('audit.program_list.col_title'),
        ActivityType: t('audit.program_list.col_activity_type'),
        StartDate: t('audit.program_list.col_start_date'),
        Duration: t('audit.program_list.col_duration'),
        Standards: t('audit.program_list.col_standards'),
        Status: t('audit.program_list.col_status')
    }
})

const programStatusKeyFromLabel = (label: string): AuditProgramStatus | undefined =>
    Object.values(AuditProgramStatus).find((key) => t(`audit.program_status.${key}`) === label)

const allAuditPrograms = ref<AuditProgram[]>([])
const searchQuery = ref('')
const loading = ref(false)
const page = ref(1)
const perPage = ref(10)
const searchTimeout = ref<NodeJS.Timeout | null>(null)

const total = computed(() => allAuditPrograms.value.length)
const totalPages = computed(() => Math.ceil(total.value / perPage.value))

const paginatedRows = computed(() => {
    void locale.value
    const start = (page.value - 1) * perPage.value
    const end = start + perPage.value
    return allAuditPrograms.value.slice(start, end).map((program) => ({
        id: program.id,
        ProgramTitle: program.title || '',
        ActivityType: program.auditActivityType?.name || '',
        StartDate: program.startDate ? formatDateToDay(program.startDate) : '',
        Duration: program.duration ? String(program.duration) : '',
        Standards: program.standards?.map((standard) => standard.name).join(', ') || '',
        Status: program.status ? t(`audit.program_status.${program.status}`) : ''
    }))
})

const getStatusClass = (statusLabel: string) => {
    const key =
        programStatusKeyFromLabel(statusLabel) ??
        Object.values(AuditProgramStatus).find((k) => snakeToCamelCase(k) === statusLabel)
    switch (key) {
        case AuditProgramStatus.DRAFT:
            return 'bg-neutral-200 text-neutral-700'
        case AuditProgramStatus.PLANNED:
            return 'bg-neutral-100 text-neutral-800'
        case AuditProgramStatus.SCHEDULED:
            return 'bg-blue-100 text-blue-800'
        case AuditProgramStatus.CANCELLED:
            return 'bg-red-100 text-red-800'
        default:
            return ''
    }
}

const handleScheduleInstance = (entity: AuditProgram) => {
    router.push(`/check/audits/instances/add?auditProgramId=${entity?.id}`)
}

const ScheduleInstance = (props: { row: AuditProgram }) => {
    const entity = props.row
    return h('span', {
        class: 'hover:text-gray-400 text-gray-900 cursor-pointer ml-4',
        'test-id': `audit-program-schedule-${entity?.id}`,
        title: t('audit.program_list.schedule_instance_tooltip'),
        onClick: () => router.push(`/check/audits/instances/add?auditProgramId=${entity?.id}`)
    }, [
        h('i', { class: 'fa-solid fa-calendar-plus' })
    ])
}

const fetchAuditPrograms = async () => {
    loading.value = true
    try {
        const params = new URLSearchParams()
        if (searchQuery.value.trim()) {
            params.append('search', searchQuery.value.trim())
        }

        const response = await apiGet<AuditProgram[]>(
            `/audits/programs?${params.toString()}`,
            authStore
        )
        allAuditPrograms.value = response || []
        page.value = 1
    } catch (error: any) {
        console.error('Error fetching audit programs:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.program_list.toast_fetch_failed'),
            'error'
        )
    } finally {
        loading.value = false
    }
}

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
    searchTimeout.value = setTimeout(() => {
        fetchAuditPrograms()
    }, 300)
}

const handleDelete = async (item: AuditProgram) => {
    if (!item?.id) return

    dialog.openDialog(ConfirmDialog, {
        message: t('audit.program_list.delete_confirm'),
        onConfirm: async () => {
            try {
                await apiDelete<{ id: string }>(`/audits/programs/${item.id}`, authStore)
                toast.showToast(t('common.success'), t('audit.program_list.toast_deleted'), 'success')
                await fetchAuditPrograms()
            } catch (error: any) {
                console.error('Error deleting audit program:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error.response?.data, t, 'errors.audit') ||
                        t('audit.program_list.toast_delete_failed'),
                    'error'
                )
            } finally {
                dialog.closeDialog()
            }
        },
        onCancel: dialog.closeDialog
    })
}

const onNextPage = () => {
    if (page.value < totalPages.value) {
        page.value++
    }
}

const onPreviousPage = () => {
    if (page.value > 1) {
        page.value--
    }
}

const setPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages.value) {
        page.value = newPage
    }
}

const onSuccess = () => {
    fetchAuditPrograms()
}

onMounted(() => {
    fetchAuditPrograms()
})
</script>
