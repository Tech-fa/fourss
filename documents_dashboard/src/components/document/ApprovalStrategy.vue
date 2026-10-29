<template>
    <main class=" ">
        <Table
            :cols="tableCols"
            :rows="tableRows"
            :column-labels="columnLabels"
            :page="page"
            :total="total"
            :per-page="perPage"
            :total-pages="totalPages"
            :on-next-page="onNextPage"
            :on-previous-page="onPreviousPage"
            :set-page="setPage"
            :entities="strategies"
            :entity-name="t('document.settings.approval_strategies.entity_name')"
            :on-success="fetchStrategies"
            :on-search="
                (val: string) => {
                    query = val
                }
            "
            :loading="loading"
            :subject="'approval_strategies'"
            :search-placeholder="t('document.settings.approval_strategies.search_placeholder')"
            :extra-search="renderAddStrategyButton"
            :hide-view="() => true"
            :hide-delete="(entity: any) => !!entity?.isDefault"
            :edit-path="(entity: any) => `/plan/documents/approval-strategies/${entity.id}/edit`"
            :handleDelete="handleDelete"
        />
    </main>
</template>

<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { apiGet, apiDelete } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'
import Table from '../Table.vue'
import type { ApprovalStrategy } from '@/util/interfaces'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useToast } from '@/stores/notification'

const { t, locale } = useI18n()

const loading = ref(true)
const dialogStore = useDialog()
const toast = useToast()
const authStore = useAuthStore()

const columnLabels = computed(() => ({
    Name: t('document.settings.approval_strategies.column_name'),
    Scope: t('document.settings.approval_strategies.column_scope'),
    'Review Requirements': t('document.settings.approval_strategies.column_review_requirements'),
    'Approval Requirements': t('document.settings.approval_strategies.column_approval_requirements')
}))

const renderAddStrategyButton = () =>
    h(Can, { subject: 'approval_strategies', actions: ['create'] }, () => [
        h(
            AppButton,
            {
                buttonStyle: 'primary',
                href: '/plan/documents/approval-strategies/add'
            },
            () => [
                h('i', { class: 'fa-solid fa-plus' }),
                h(
                    'span',
                    { class: 'ml-2', 'test-id': 'add-approval-strategy' },
                    t('document.settings.approval_strategies.add_strategy')
                )
            ]
        )
    ])

const page = ref(1)
const perPage = ref(10)
const query = ref('')
const searchTimeout = ref<NodeJS.Timeout | null>(null)

const allStrategies = ref<ApprovalStrategy[]>([])

const strategies = defineModel<ApprovalStrategy[]>('strategies', { required: true })

const tableCols = ['Name', 'Scope', 'Review Requirements', 'Approval Requirements']

const paginatedStrategies = computed(() => {
    const start = (page.value - 1) * perPage.value
    const end = start + perPage.value
    return allStrategies.value.slice(start, end)
})

watch(
    paginatedStrategies,
    (newVal) => {
        strategies.value = newVal
    },
    { immediate: true }
)

const total = computed(() => allStrategies.value.length)
const totalPages = computed(() => Math.ceil(total.value / perPage.value))

const tableRows = computed(() => {
    void locale.value
    return paginatedStrategies.value.map((strategy) => ({
        id: strategy.id,
        Name: strategy.name,
        Scope: strategy.isDefault
            ? t('document.settings.approval_strategies.scope_default')
            : strategy.documentType?.name
              ? t('document.settings.approval_strategies.scope_category', {
                    name: strategy.documentType.name
                })
              : t('document.settings.approval_strategies.scope_org_units'),
        'Review Requirements': t('document.settings.approval_strategies.review_row', {
            count: strategy.requiredReviews,
            days: strategy.maxReviewDuration
        }),
        'Approval Requirements': t('document.settings.approval_strategies.approval_row', {
            count: strategy.requiredApprovals,
            days: strategy.maxApprovalDuration
        })
    }))
})

watch(query, () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
    searchTimeout.value = setTimeout(() => {
        page.value = 1
        fetchStrategies()
    }, 300)
})

const onNextPage = () => {
    if (page.value < totalPages.value) {
        page.value = page.value + 1
    }
}

const onPreviousPage = () => {
    if (page.value > 1) {
        page.value = page.value - 1
    }
}

const setPage = (newPage: number) => {
    if (newPage != page.value) {
        page.value = newPage
    }
}

const fetchStrategies = async () => {
    try {
        loading.value = true
        const searchParam = query.value ? `?search=${encodeURIComponent(query.value)}` : ''
        const response = await apiGet<ApprovalStrategy[]>(
            `/documents/approval-strategies${searchParam}`,
            authStore
        )
        allStrategies.value = response || []
        if (page.value > totalPages.value) {
            page.value = totalPages.value || 1
        }
    } catch (error: any) {
        console.error('Failed to fetch strategies:', error)
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.settings.approval_strategies.toast_load_failed'),
            'error'
        )
        allStrategies.value = []
    } finally {
        loading.value = false
    }
}

const handleDelete = async (item: any) => {
    const entity = allStrategies.value.find((strategy) => strategy.id === item.id)
    if (entity?.isDefault) {
        toast.showToast(
            t('common.error'),
            t('errors.document.DOC_119'),
            'error'
        )
        return
    }

    dialogStore.openDialog(ConfirmDialog, {
        message: t('document.settings.approval_strategies.delete_confirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/documents/approval-strategies/${item.id}`, authStore)
                toast.showToast(
                    t('common.success'),
                    t('document.settings.approval_strategies.toast_deleted'),
                    'success'
                )
                await fetchStrategies()
            } catch (error: any) {
                console.error('Error deleting approval strategy:', error)
                const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
                toast.showToast(
                    t('common.error'),
                    apiMsg || t('document.settings.approval_strategies.toast_delete_failed'),
                    'error'
                )
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

onUnmounted(() => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
})

onMounted(() => {
    fetchStrategies()
})
</script>
