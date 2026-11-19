<template>
    <main id="main-content" class="p-6">
        <div class="bg-white rounded-lg border p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-lg mb-1">{{ t('audit.document_types.title') }}</h2>
                    <p class="text-neutral-600 text-sm">
                        {{ t('audit.document_types.subtitle') }}
                    </p>
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
                                :placeholder="t('audit.document_types.search_placeholder')"
                                class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                            />
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <Can subject="audit_document_types" :actions="['create']">
                            <AppButton
                                buttonStyle="primary"
                                class="flex items-center gap-2"
                                @click="openAddModal"
                            >
                                <i class="fa-solid fa-plus"></i>
                                {{ t('audit.document_types.add_button') }}
                            </AppButton>
                        </Can>
                    </div>
                </div>
            </div>

            <Table
                :cols="documentTypeTableCols"
                :column-labels="documentTypeColumnLabels"
                :rows="paginatedData"
                :entities="documentTypesEntities"
                :total-pages="totalPages"
                :page="currentPage"
                :total="totalDocumentTypes"
                :per-page="perPage"
                :on-next-page="handleNextPage"
                :on-previous-page="handlePreviousPage"
                :set-page="setPage"
                :loading="isLoading"
                :search-loading="searchLoading"
                :on-success="() => {}"
                :on-edit="(row: any) => handleEdit(row)"
                :entity-name="t('audit.document_types.entity_name')"
                subject="audit_document_types"
                :hideView="(row) => true"
                :handleDelete="handleDelete"
                :skip-padding="true"
            />
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, h, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Table from '../Table.vue'
import AppInput from '../AppInput.vue'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiGet, apiPost, apiDelete, apiPut } from '@/util/api'
import type { ListItem } from '@/util/interfaces'
import { useDialog } from '../../stores/dialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ModalForm from '../modal-form.vue'
import Spinner from '../Spinner.vue'
import { formatApiErrorMessage } from '@/util/util'

const isLoading = ref(true)
const authStore = useAuthStore()
const toast = useToast()
const { t, locale } = useI18n()

const documentTypeTableCols = ['Name', 'Description', 'CreatedBy']

const documentTypeColumnLabels = computed(() => {
    void locale.value
    return {
        Name: t('common.Name'),
        Description: t('common.Description'),
        CreatedBy: t('audit.document_types.col_created_by')
    }
})
const isEditMode = ref(false)
const dialogStore = useDialog()
const formLoading = ref(false)
const documentTypesEntities = ref<ListItem[]>([])
const searchTimeout = ref()
const error = ref<string | null>(null)
const searchQuery = ref('')
const searchLoading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const totalDocumentTypes = ref(0)
const perPage = ref(10)

const props = defineProps<{
    auditDocumentTypes: ListItem[]
}>()

const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * perPage.value
    const end = start + perPage.value
    return rows.value.slice(start, end)
})

const rows = ref<{ [key: string]: any }[]>([])
const mapRows = (documentTypes: any[]) => {
    if (!documentTypes || !Array.isArray(documentTypes)) {
        console.warn('No document types data or invalid data format received')
        return []
    }

    return documentTypes.map((documentType) => {
        const row = {
            id: documentType.id,
            Name: documentType.name,
            Description: documentType.description || t('audit.document_types.no_description'),
            CreatedBy: documentType.createdBy.fname + ' ' + documentType.createdBy.lname
        }
        return row
    })
}

const updateLocalState = (data: ListItem[]) => {
    rows.value = mapRows(data)
    documentTypesEntities.value = data
    totalDocumentTypes.value = data.length
    totalPages.value = Math.ceil(data.length / perPage.value)
    isLoading.value = false
}

onMounted(() => {
    if (props.auditDocumentTypes.length > 0) {
        updateLocalState(props.auditDocumentTypes)
    } else {
        fetchDocumentTypes()
    }
})

function openAddModal() {
    isEditMode.value = false
    dialogStore.openDialog(ModalForm, {
        formType: t('audit.document_types.form_type'),
        isEditMode: false,
        loading: formLoading,
        namePlaceholder: t('audit.document_types.name_placeholder'),
        descriptionPlaceholder: t('audit.document_types.description_placeholder'),
        onClose: dialogStore.closeDialog,
        onSubmit: async (data: any) => {
            try {
                formLoading.value = true
                await apiPost('/audits/document-types', data, authStore)
                toast.showToast(t('common.success'), t('audit.document_types.createSuccess'), 'success')
                dialogStore.closeDialog()
                await fetchDocumentTypes()
            } catch (error: any) {
                console.error('Error creating document type:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error.response?.data, t, 'errors.audit') ||
                        t('audit.document_types.createError'),
                    'error'
                )
            } finally {
                formLoading.value = false
            }
        }
    })
}

const emit = defineEmits<{
    (e: 'update:auditDocumentTypes', value: ListItem[]): void
}>()

const handleEdit = (item: ListItem) => {
    isEditMode.value = true
    dialogStore.openDialog(ModalForm, {
        formType: t('audit.document_types.form_type'),
        isEditMode: true,
        loading: formLoading,
        initialData: {
            name: item.name,
            description: item.description,
            isActive: item.isActive
        },
        namePlaceholder: t('audit.document_types.name_placeholder'),
        descriptionPlaceholder: t('audit.document_types.description_placeholder'),
        onClose: dialogStore.closeDialog,
        onSubmit: async (data: any) => {
            try {
                formLoading.value = true
                await apiPut(`/audits/document-types/${item.id}`, data, authStore)
                toast.showToast(t('common.success'), t('audit.document_types.updateSuccess'), 'success')
                dialogStore.closeDialog()
                await fetchDocumentTypes()
            } catch (error: any) {
                console.error('Error updating document type:', error)
                toast.showToast(t('common.error'), formatApiErrorMessage(error.response?.data, t, 'errors.audit') || t('audit.document_types.updateError'), 'error')
            } finally {
                formLoading.value = false
            }
        }
    })
}

const handleDelete = async (item: any) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('audit.document_types.delete_confirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/audits/document-types/${item.id}`, authStore)
                toast.showToast(t('common.success'), t('audit.document_types.deleteSuccess'), 'success')
                await fetchDocumentTypes()
            } catch (error: any) {
                console.error('Error deleting document type:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error.response?.data, t, 'errors.audit') || t('audit.document_types.deleteError'),
                    'error'
                )
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
    searchTimeout.value = setTimeout(() => {
        fetchDocumentTypes()
    }, 300)
}

const fetchDocumentTypes = async () => {
    isLoading.value = true
    error.value = null
    try {
        let queryParams = new URLSearchParams()

        if (searchQuery.value) {
            queryParams.append('search', searchQuery.value)
        }

        const queryString = queryParams.toString()
        const url = `/audits/document-types${queryString ? `?${queryString}` : ''}`
        const response = await apiGet<ListItem[]>(url, authStore)

        if (!response) {
            console.error('Invalid response format:', response)
            toast.showToast(t('common.error'), t('common.invalidResponseFormat'), 'error')
            return
        }

        updateLocalState(response)
        emit('update:auditDocumentTypes', response)
    } catch (err) {
        console.error('Error fetching document types:', err)
        error.value = t('audit.document_types.fetchError')
        if (authStore.state.isLoggedIn) {
            toast.showToast(t('common.error'), t('audit.document_types.fetchError'), 'error')
        }
    } finally {
        isLoading.value = false
    }
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

watch(locale, () => {
    if (documentTypesEntities.value.length) {
        rows.value = mapRows(documentTypesEntities.value)
    }
})
</script>
