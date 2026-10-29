<template>
    <main>
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
            :entities="acknowledgements"
            :entity-name="t('document.settings.document_acknowledgements.entity_name')"
            :on-success="fetchAcknowledgements"
            :on-search="
                (val: string) => {
                    query = val
                }
            "
            :loading="loading"
            :subject="'document_acknowledgements'"
            :search-placeholder="t('document.settings.document_acknowledgements.search_placeholder')"
            :extra-search="renderAddAcknowledgementButton"
            :hide-view="() => true"
            :edit-path="(entity: any) => `/plan/documents/document-acknowledgements/${entity.id}/edit`"
            :handleDelete="handleDelete"
        />
    </main>
</template>

<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { apiDelete, apiGet } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'
import Table from '../Table.vue'
import type { DocumentAcknowledgement } from '@/util/interfaces'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useToast } from '@/stores/notification'
import Can from '../Can.vue'
import AppButton from '../AppButton.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const dialogStore = useDialog()
const toast = useToast()
const loading = ref(true)

const columnLabels = computed(() => ({
    Name: t('document.settings.document_acknowledgements.column_name'),
    Scope: t('document.settings.document_acknowledgements.column_scope'),
    Users: t('document.settings.document_acknowledgements.column_users')
}))

const page = ref(1)
const perPage = ref(10)
const query = ref('')
const searchTimeout = ref<NodeJS.Timeout | null>(null)

const allAcknowledgements = ref<DocumentAcknowledgement[]>([])
const acknowledgements = defineModel<DocumentAcknowledgement[]>('acknowledgements', { required: true })

const tableCols = ['Name', 'Scope', 'Users']

const paginatedAcknowledgements = computed(() => {
    const start = (page.value - 1) * perPage.value
    const end = start + perPage.value
    return allAcknowledgements.value.slice(start, end)
})

watch(
    paginatedAcknowledgements,
    (newVal) => {
        acknowledgements.value = newVal
    },
    { immediate: true }
)

const total = computed(() => allAcknowledgements.value.length)
const totalPages = computed(() => Math.ceil(total.value / perPage.value))

const tableRows = computed(() =>
    paginatedAcknowledgements.value.map((acknowledgement) => ({
        id: acknowledgement.id,
        Name: acknowledgement.name,
        Scope: acknowledgement.documentType?.name
            ? t('document.settings.document_acknowledgements.scope_category', {
                  name: acknowledgement.documentType.name
              })
            : t('document.settings.document_acknowledgements.scope_org_units'),
        Users: acknowledgement.allUsers
            ? t('document.settings.document_acknowledgements.users_all')
            : t('document.settings.document_acknowledgements.users_selected')
    }))
)

watch(query, () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
    searchTimeout.value = setTimeout(() => {
        page.value = 1
        fetchAcknowledgements()
    }, 300)
})

const onNextPage = () => {
    if (page.value < totalPages.value) {
        page.value += 1
    }
}

const onPreviousPage = () => {
    if (page.value > 1) {
        page.value -= 1
    }
}

const setPage = (newPage: number) => {
    if (newPage !== page.value) {
        page.value = newPage
    }
}

const fetchAcknowledgements = async () => {
    try {
        loading.value = true
        const searchParam = query.value ? `?search=${encodeURIComponent(query.value)}` : ''
        const response = await apiGet<DocumentAcknowledgement[]>(
            `/documents/document-acknowledgements${searchParam}`,
            authStore
        )
        allAcknowledgements.value = response || []
        if (page.value > totalPages.value) {
            page.value = totalPages.value || 1
        }
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.settings.document_acknowledgements.toast_load_failed'),
            'error'
        )
        allAcknowledgements.value = []
    } finally {
        loading.value = false
    }
}

const handleDelete = async (item: any) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('document.settings.document_acknowledgements.delete_confirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/documents/document-acknowledgements/${item.id}`, authStore)
                toast.showToast(
                    t('common.success'),
                    t('document.settings.document_acknowledgements.toast_deleted'),
                    'success'
                )
                await fetchAcknowledgements()
            } catch (error: any) {
                const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
                toast.showToast(
                    t('common.error'),
                    apiMsg || t('document.settings.document_acknowledgements.toast_delete_failed'),
                    'error'
                )
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

const renderAddAcknowledgementButton = () =>
    h(Can, { subject: 'document_acknowledgements', actions: ['create'] }, () => [
        h(AppButton, { buttonStyle: 'primary', href: '/plan/documents/document-acknowledgements/add' }, () => [
            h('i', { class: 'fa-solid fa-plus' }),
            h('span', { class: 'ml-2', 'test-id': 'add-document-acknowledgement' }, t('document.settings.document_acknowledgements.add_acknowledgement'))
        ])
    ])

onUnmounted(() => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
})

onMounted(() => {
    fetchAcknowledgements()
})
</script>
