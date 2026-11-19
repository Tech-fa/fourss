<template>
    <main id="main-content" class="p-6">
        <div class="bg-white rounded-lg border p-6" test-id="non-conformity-categories-container">
            <div class="flex items-center justify-between mb-6">
                <div test-id="non-conformity-categories-title">
                    <h2 class="text-lg mb-1">{{ $t('nc.category.title') }}</h2>
                    <p class="text-neutral-600 text-sm">{{ $t('nc.category.subtitle') }}</p>
                </div>
            </div>

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
                                :placeholder="$t('nc.category.searchPlaceholder')"
                                class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                                test-id="search-nc-category-input"
                            />
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <Can subject="non_conformity_categories" :actions="['create']">
                            <AppButton
                                buttonStyle="primary"
                                class="flex items-center gap-2"
                                @click="router.push('/act/non-conformities/add-category')"
                                test-id="add-nc-category-button"
                            >
                                <i class="fa-solid fa-plus"></i>
                                {{ $t('nc.category.addButton') }}
                            </AppButton>
                        </Can>
                    </div>
                </div>
            </div>

            <Table
                test-id="non-conformity-categories-table"
                :cols="tableCols"
                :rows="paginatedData"
                :entities="nonConformityCategoriesEntities"
                :total-pages="totalPages"
                :page="currentPage"
                :total="totalDocumentTypes"
                :per-page="perPage"
                :on-next-page="handleNextPage"
                :on-previous-page="handlePreviousPage"
                :set-page="handleSetPage"
                :loading="isLoading"
                :search-loading="searchLoading"
                :on-success="() => {}"
                :on-edit="(row: any) => router.push(`/act/non-conformities/add-category/${row.id}`)"
                :entity-name="$t('nc.category.entityName')"
                subject="non_conformity_categories"
                :hideView="(row) => true"
                :handleDelete="handleDelete"
                :skip-padding="true"
            />
        </div>
    </main>
</template>
<script setup lang="ts">
import { ref, h, computed, onMounted } from 'vue'
import Spinner from '../Spinner.vue'
import AppInput from '../AppInput.vue'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import { type ListItem } from '@/util/interfaces'
import Table from '../Table.vue'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { apiPost, apiGet, apiPut, apiDelete } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { formatApiErrorMessage } from '@/util/util'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'

const dialogStore = useDialog()
const isLoading = ref(false)
const formLoading = ref(false)
const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()
const router = useRouter()
const searchQuery = ref('')
const searchLoading = ref(false)
const searchTimeout = ref()

const currentPage = ref(1)
const totalPages = ref(1)
const totalDocumentTypes = ref(1)
const perPage = ref(5)

const nonConformityCategoriesEntities = ref<any[]>([])

const props = defineProps<{
    nonConformityCategories: any[]
}>()

const emit = defineEmits<{
    (e: 'update:nonConformityCategories', value: any[]): void
}>()

const tableCols = computed(() => [t('nc.category.tableTitle'), t('nc.category.tableCreatedBy')])

const tableRows = computed(() => {
    const categories = nonConformityCategoriesEntities.value
    if (!categories?.length) return []

    return categories.map((category: any) => ({
        id: category.id,
        [t('nc.category.tableTitle')]: category.name,
        [t('nc.category.tableCreatedBy')]:
            [category.createdBy?.fname, category.createdBy?.lname].filter(Boolean).join(' ') || 'Unknown'
    }))
})

const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * perPage.value
    const end = start + perPage.value
    return tableRows.value.slice(start, end)
})

const updateLocalState = (data: any[]) => {
    nonConformityCategoriesEntities.value = data
    totalDocumentTypes.value = data.length
    totalPages.value = Math.ceil(data.length / perPage.value)
    isLoading.value = false
}

onMounted(() => {
    if (props.nonConformityCategories.length > 0) {
        updateLocalState(props.nonConformityCategories)
    } else {
        fetchNonConformityCategories()
    }
})



const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1
        fetchNonConformityCategories(true)
    }, 300)
}

const handleDelete = async (item: any) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('nc.category.deleteConfirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/non-conformities/categories/${item.id}`, authStore)
                toast.showToast(t('common.success'), t('nc.category.deleteSuccess'), 'success')
                await fetchNonConformityCategories()
            } catch (error: any) {
                console.error('Error deleting non conformity category:', error)
                toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.category.deleteError'), 'error')
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

const fetchNonConformityCategories = async (fromSearch = false) => {
    if (fromSearch) {
        searchLoading.value = true
    } else {
        isLoading.value = true
    }
    try {
        // Use backend search param "search" to match service signature
        const searchParam = searchQuery.value ? `&search=${searchQuery.value}` : ''
        const response = await apiGet<ListItem[]>(
            `/non-conformities/categories?${searchParam}`,
            authStore
        )
        if (!response) {
            console.error('Invalid response format:', response)
            toast.showToast(t('common.error'), t('common.invalidResponseFormat'), 'error')
            return
        }
        updateLocalState(response)
        emit('update:nonConformityCategories', response)
    } catch (err) {
        console.error('Error fetching non conformity categories:', err)
        if (authStore.state.isLoggedIn) {
            toast.showToast(t('common.error'), t('nc.category.fetchError'), 'error')
        }
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
        currentPage.value++;
        fetchNonConformityCategories();
    }
};
const handlePreviousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
        fetchNonConformityCategories();
    }
};
const handleSetPage = (page: number) => {
    if (page !== currentPage.value) {
        currentPage.value = page;
        fetchNonConformityCategories();
    }
}
</script> 