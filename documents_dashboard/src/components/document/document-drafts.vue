<template>
    <Breadcrumb :crumbs="breadcrumbCrumbs" />

    <main id="main-content" class="p-6">
        <div id="search-filter" class="mb-6 px-1 sm:px-6 lg:px-8">
            <div class="flex gap-4">
                <div class="flex-1">
                    <div class="relative">
                        <AppInput v-model="searchQuery" @input="handleSearch" type="text"
                            :placeholder="t('document.drafts.search_placeholder')"
                            class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                            test-id="document-draft-search" />
                        <i class="fa-solid fa-search absolute left-3 top-3 text-neutral-400"></i>
                    </div>
                </div>
            </div>
        </div>

        <Table :cols="columns" :rows="rows" :entities="drafts.data" :total-pages="totalPages" :page="currentPage"
            :total="totalDrafts" :per-page="perPage" :on-next-page="handleNextPage"
            :on-previous-page="handlePreviousPage" :set-page="setPage" :entity-name="t('document.drafts.entity_name')"
            :on-success="fetchDrafts" :loading="loading" subject="documents" :hide-view="() => true"
            :on-edit="handleEditDraft" :handle-delete="handleDelete" />
    </main>
</template>

<script setup lang="ts">
import { type DocumentDraftListItem, type PaginatedResponse } from '@/util/interfaces'
import Table from '../Table.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { apiDelete, apiGet } from '@/util/api'
import { formatApiErrorMessage, formatLocalDate } from '@/util/util'
import Breadcrumb from '../breadCrums.vue'
import { useToast } from '@/stores/notification'
import { useDialog } from '@/stores/dialog'
import AppInput from '../AppInput.vue'
import ConfirmDialog from '../ConfirmDialog.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const dialogStore = useDialog()

const breadcrumbCrumbs = computed(() => [
    {
        name: t('nav.documents'),
        path: '/plan/documents',
        icon: 'fa-solid fa-file-alt'
    },
    {
        name: t('document.drafts.breadcrumb'),
        path: '',
        icon: 'fa-solid fa-file-pen'
    }
])

const columns = computed(() => [
    t('document.drafts.col_title'),
    t('document.drafts.col_document'),
    t('document.drafts.col_version'),
    t('document.drafts.col_updated_at')
])

const drafts = ref<PaginatedResponse<DocumentDraftListItem>>({
    data: [],
    currentPage: 1,
    totalCount: 0,
    perPage: 10
})
const rows = ref<{ [key: string]: unknown }[]>([])

const currentPage = ref(1)
const totalPages = ref(1)
const totalDrafts = ref(0)
const perPage = ref(10)
const loading = ref(false)
const searchQuery = ref('')
const searchTimeout = ref<ReturnType<typeof setTimeout>>()

const mapRows = (list: DocumentDraftListItem[]) => {
    const k = {
        title: t('document.drafts.col_title'),
        document: t('document.drafts.col_document'),
        version: t('document.drafts.col_version'),
        updatedAt: t('document.drafts.col_updated_at')
    }
    return list.map((draft) => ({
        id: draft.id,
        [k.title]: draft.title,
        [k.document]: draft.document?.title ?? t('document.drafts.no_document'),
        [k.version]:
            draft.documentVersion != null
                ? String(draft.documentVersion.versionNumber)
                : t('document.drafts.no_version'),
        [k.updatedAt]: formatLocalDate(draft.updatedAt)
    }))
}

const fetchDrafts = async () => {
    loading.value = true
    try {
        const searchParam = searchQuery.value ? `&search=${encodeURIComponent(searchQuery.value)}` : ''
        const response = await apiGet<PaginatedResponse<DocumentDraftListItem>>(
            `/documents/drafts?perPage=${perPage.value}&page=${currentPage.value}${searchParam}`,
            authStore
        )
        rows.value = mapRows(response.data)
        drafts.value = response
        totalPages.value = Math.ceil(response.totalCount / perPage.value) || 1
        totalDrafts.value = response.totalCount
    } catch (err: any) {
        console.error(err)
        if (authStore.state.isLoggedIn) {
            const raw = formatApiErrorMessage(err.response?.data, t, 'errors.document')
            toast.showToast(
                t('common.error'),
                raw || t('document.drafts.toast_fetch_list_failed'),
                'error'
            )
        }
    } finally {
        loading.value = false
    }
}

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1
        fetchDrafts()
    }, 300)
}

const handleNextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++
    }
}

const handlePreviousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
    }
}

const setPage = (page: number) => {
    currentPage.value = page
}

watch(currentPage, () => fetchDrafts())

const handleEditDraft = (draft: DocumentDraftListItem) => {
    if (draft.documentId && draft.documentVersionId == null) {
        router.push({
            path: `/plan/documents/${draft.documentId}/new-version`,
            query: {
                draftId: draft.id,
                redirect: '/plan/documents/drafts'
            }
        })
    } else if (draft.documentId) {
        router.push({
            path: `/plan/documents/${draft.documentId}/edit-version`,
            query: {
                fillPendingVersion: String(draft.documentVersionId),
                draftId: draft.id,
                redirect: '/plan/documents/drafts'
            }
        })
    } else {
        router.push(`/plan/documents/drafts/${draft.id}/edit`)
    }
}

const handleDelete = (item: DocumentDraftListItem) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('document.drafts.delete_confirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/documents/drafts/${item.id}`, authStore)
                toast.showToast(t('common.success'), t('document.drafts.toast_delete_success'), 'success')
                await fetchDrafts()
            } catch (err: any) {
                const raw = formatApiErrorMessage(err.response?.data, t, 'errors.document')
                toast.showToast(
                    t('common.error'),
                    raw || t('document.drafts.toast_delete_failed'),
                    'error'
                )
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

onMounted(() => fetchDrafts())
</script>
