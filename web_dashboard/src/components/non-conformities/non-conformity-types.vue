<template>
    <main id="main-content" class="p-6">
        <div class="bg-white rounded-lg border p-6">
            <div class="flex items-center justify-between mb-6">
                <div test-id="non-conformity-types-header">
                    <h2 class="text-lg mb-1">{{ $t('nc.types.title') }}</h2>
                    <p class="text-neutral-600 text-sm">{{ $t('nc.types.subtitle') }}</p>
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
                                :placeholder="$t('nc.types.searchPlaceholder')"
                                class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                                test-id="search-nc-type-input"
                            />
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <Can subject="non_conformity_types" :actions="['create']">
                            <AppButton
                                buttonStyle="primary"
                                class="flex items-center gap-2"
                                @click="openTypeModal"
                                test-id="add-nc-type-button"
                            >
                                <i class="fa-solid fa-plus"></i>
                                {{ $t('nc.types.addButton') }}
                            </AppButton>
                        </Can>
                    </div>
                </div>
            </div>

            <Table
                test-id="non-conformity-types-table"
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
                :on-edit="(row: any) => openTypeModal(true, row)"
                :entity-name="$t('nc.types.entityName')"
                subject="non_conformity_types"
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
import ModalForm from '../modal-form.vue'
import { apiPost, apiGet, apiPut, apiDelete } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import { formatApiErrorMessage } from '@/util/util'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'

const dialogStore = useDialog()
const isLoading = ref(false)
const formLoading = ref(false)
const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const tableColumns = ['Title', 'Description']

const columnLabels = computed(() => ({
    Title: t('nc.types.tableTitle'),
    Description: t('nc.types.tableDescription')
}))

const searchQuery = ref('')
const searchLoading = ref(false)
const searchTimeout = ref()

const currentPage = ref(1)
const totalPages = ref(1)
const totalNonConformityTypes = ref(1)
const perPage = ref(5)

const nonConformityTypesEntities = ref<any[]>([])

const props = defineProps<{
    nonConformityTypes?: any[]
}>()

const emit = defineEmits<{
    (e: 'update:nonConformityTypes', value: any[]): void
}>()

const mapRows = (nonConformityTypes: any[]) => {
    if (!nonConformityTypes || !Array.isArray(nonConformityTypes)) {
        console.warn('No non-conformity types data or invalid data format received')
        return []
    }

    return nonConformityTypes.map((type: any) => ({
        id: type.id,
        Title: type.name,
        Description: type.description || t('nc.types.noDescription')
    }))
}

const tableRows = computed(() => mapRows(nonConformityTypesEntities.value))

const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * perPage.value
    const end = start + perPage.value
    return tableRows.value.slice(start, end)
})

const updateLocalState = (data: any[]) => {
    nonConformityTypesEntities.value = data
    totalNonConformityTypes.value = data.length
    totalPages.value = Math.ceil(data.length / perPage.value)
    isLoading.value = false
}

onMounted(() => {
    if (props.nonConformityTypes && props.nonConformityTypes.length > 0) {
        updateLocalState(props.nonConformityTypes)
    } else {
        fetchNonConformityTypes()
    }
})

const openTypeModal = (isEdit: boolean, row?: any) => {
    dialogStore.openDialog(ModalForm, {
        isEditMode: isEdit,
        loading: formLoading,
        formType: t('nc.types.entityName'),
        namePlaceholder: t('nc.types.namePlaceholder'),
        descriptionPlaceholder: t('nc.types.descriptionPlaceholder'),
        initialData: isEdit ? row : undefined,
        showStatus: true,
        onClose: dialogStore.closeDialog,
        onSubmit: async (data: ListItem) => {
            try {
                formLoading.value = true
                if (isEdit) {
                    await apiPut(`/non-conformities/types/${data.id}`, data, authStore)
                } else {
                    await apiPost('/non-conformities/types', data, authStore)
                }
                toast.showToast(t('common.success'), t('nc.types.saveSuccess'), 'success')
                dialogStore.closeDialog()
                await fetchNonConformityTypes()
            } catch (error: any) {
                console.error('Error saving non-conformity type:', error)
                toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.types.saveError'), 'error')
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
        fetchNonConformityTypes(true)
    }, 300)
}

const handleDelete = async (item: any) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('nc.types.deleteConfirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/non-conformities/types/${item.id}`, authStore)
                toast.showToast(t('common.success'), t('nc.types.deleteSuccess'), 'success')
                await fetchNonConformityTypes()
            } catch (error: any) {
                console.error('Error deleting non-conformity type:', error)
                toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.types.deleteError'), 'error')
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

const fetchNonConformityTypes = async (fromSearch = false) => {
    if (fromSearch) {
        searchLoading.value = true
    } else {
        isLoading.value = true
    }
    try {
        const searchParam = searchQuery.value ? `&name=${searchQuery.value}` : ''
        const response = await apiGet<ListItem[]>(
            `/non-conformities/types?${searchParam}`,
            authStore
        )
        if (!response) {
            console.error('Invalid response format:', response)
            toast.showToast(t('common.error'), t('common.invalidResponseFormat'), 'error')
            return
        }
        updateLocalState(response)
        emit('update:nonConformityTypes', response)
    } catch (err) {
        console.error('Error fetching non-conformity types:', err)
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
        fetchNonConformityTypes()
    }
}

const handlePreviousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
        fetchNonConformityTypes()
    }
}

const handleSetPage = (page: number) => {
    if (page !== currentPage.value) {
        currentPage.value = page
        fetchNonConformityTypes()
    }
}
</script>