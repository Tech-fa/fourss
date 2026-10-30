<template>

    <div id="root" class="min-h-screen bg-neutral-50">

        <Table :cols="tableColumns" :rows="tableRows" :column-labels="columnLabels" :entities="types"
            :on-edit="handleEdit" :total-pages="totalPages" :page="currentPage" :total="totalItems"
            :per-page="itemsPerPage" :on-next-page="handleNextPage" :on-previous-page="handlePreviousPage"
            :set-page="setPage" :entity-name="t('document.settings.document_categories.entity_name')"
            :on-success="fetchTypes" :on-search="(val: string) => {

                search = val

            }

                " :loading="loading" :search-loading="false"
            :search-placeholder="t('document.settings.document_categories.search_placeholder')" :page-loading="false"
            :handleDelete="handleDelete" :extra-search="renderAddCategoryButton" :hide-view="() => true"
            :subject="'document_types'" />

    </div>

</template>

<script setup lang="ts">
import AppButton from '../../components/AppButton.vue'
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiPost, apiPut, apiGet, apiDelete } from '../../util/api'
import { formatApiErrorMessage } from '../../util/util'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../stores/notification'

import { useDialog } from '../../stores/dialog'

import type { DocumentType } from '../../util/interfaces'

import DocumentTypeForm from './documentTypeForm.vue'

import Table from '../../components/Table.vue'

import Can from '../../components/Can.vue'

import ConfirmDialog from '../ConfirmDialog.vue'



const { t, locale } = useI18n()



const tableColumns: string[] = ['Name', 'Code', 'Created Date', 'Documents Count']



const columnLabels = computed(() => ({

    Name: t('document.settings.document_categories.column_name'),

    Code: t('document.settings.document_categories.column_code'),

    'Created Date': t('document.settings.document_categories.column_created_date'),

    'Documents Count': t('document.settings.document_categories.column_documents_count')

}))



const loading = ref(false)

const formLoading = ref(false)

const isEditMode = ref(false)

const entity = ref<DocumentType | null>(null)



const search = ref('')

const authStore = useAuthStore()

const toast = useToast()

const formKey = ref(0)

const dialogStore = useDialog()



const types = defineModel<DocumentType[]>('types', { required: true })



const allTypes = ref<DocumentType[]>([])



const currentPage = ref(1)

const itemsPerPage = ref(10)



const totalItems = computed(() => allTypes.value.length)

const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))



const formatDate = (val: number | string | null | undefined) => {

    if (!val) return '-'

    const ms = typeof val === 'string' ? parseInt(val, 10) : val

    const date = new Date(ms)

    const loc = locale.value === 'ar' ? 'ar' : 'en-US'

    return isNaN(date.getTime())

        ? '-'

        : date.toLocaleDateString(loc, { year: 'numeric', month: 'short', day: 'numeric' })

}



const tableRows = computed(() => {

    void locale.value

    return paginatedTypes.value.map((type) => ({

        id: type.id,

        Name: type.name,

        Code: type.categoryCode,

        'Created Date': formatDate(type.createdAt),

        'Documents Count': type.documentsCount ?? 0

    }))

})



const handleEdit = (row: { id: number }) => {

    const type = types.value.find((x) => x.id === row.id)



    if (!type) {

        toast.showToast(

            t('common.error'),

            t('document.settings.document_categories.toast_edit_not_found'),

            'error'

        )

        return

    }

    isEditMode.value = true

    entity.value = type

    dialogStore.openDialog(DocumentTypeForm, {

        isEditMode: true,

        initialValues: {

            documentTypeName: type.name,

            documentTypeCode: type.categoryCode

        },

        formKey: formKey.value,

        loading: formLoading,

        onSubmit: onSubmit,

        onCancel: dialogStore.closeDialog

    })

}



const onSubmit = async (values: any) => {

    if (formLoading.value) return

    formLoading.value = true

    const body = {

        name: values.documentTypeName,

        categoryCode: values.documentTypeCode

    }

    try {

        if (isEditMode.value) {

            await apiPut<{ id: number }>(`/documents/types/${entity.value?.id}`, body, authStore)

        } else {

            await apiPost<{ id: number }>('/documents/types', body, authStore)

        }



        const savedMsg = isEditMode.value

            ? t('document.settings.document_categories.toast_saved_updated')

            : t('document.settings.document_categories.toast_saved_created')

        toast.showToast(t('common.success'), savedMsg, 'success')

        dialogStore.closeDialog()

        await fetchTypes()

    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg ||
                (isEditMode.value
                    ? t('document.settings.document_categories.toast_save_failed_update')
                    : t('document.settings.document_categories.toast_save_failed_create')),
            'error',
            5000,
            'duplicate-category-error'
        )

    } finally {

        formLoading.value = false

    }

}



const fetchTypes = async () => {

    try {

        loading.value = true

        const searchParam = search.value ? `?search=${encodeURIComponent(search.value)}` : ''

        const response = await apiGet<DocumentType[]>(`/documents/types${searchParam}`, authStore)

        allTypes.value = response || []



        if (currentPage.value > totalPages.value) {

            currentPage.value = totalPages.value || 1

        }

    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.settings.document_categories.toast_load_failed'),
            'error'
        )

        allTypes.value = []

    } finally {

        loading.value = false

    }

}



const searchTimeout = ref<NodeJS.Timeout | null>(null)



watch(search, () => {

    if (searchTimeout.value) {

        clearTimeout(searchTimeout.value)

    }

    searchTimeout.value = setTimeout(() => {

        currentPage.value = 1

        fetchTypes()

    }, 300)

})



function openAddModal() {

    isEditMode.value = false

    formKey.value++

    dialogStore.openDialog(DocumentTypeForm, {

        isEditMode: false,

        initialValues: { documentTypeName: undefined, documentTypeCode: undefined },

        formKey: formKey.value,

        loading: formLoading,

        onSubmit: onSubmit,

        onCancel: dialogStore.closeDialog

    })

}



const renderAddCategoryButton = () =>

    h(Can, { subject: 'document_types', actions: ['create'] }, () => [

        h(

            AppButton,

            {

                buttonStyle: 'primary',

                onClick: openAddModal

            },

            () => [

                h('i', { class: 'fa-solid fa-plus' }),

                h(

                    'span',

                    { class: 'ml-2', 'test-id': 'add-category-button' },

                    t('document.settings.document_categories.add_category')

                )

            ]

        )

    ])



const paginatedTypes = computed(() => {

    const start = (currentPage.value - 1) * itemsPerPage.value

    const end = start + itemsPerPage.value

    return allTypes.value.slice(start, end)

})



watch(

    paginatedTypes,

    (newVal) => {

        types.value = newVal

    },

    { immediate: true }

)



const handleDelete = async (item: any) => {

    dialogStore.openDialog(ConfirmDialog, {

        message: t('document.settings.document_categories.delete_confirm'),

        onConfirm: async () => {

            try {

                await apiDelete(`/documents/types/${item.id}`, authStore)

                toast.showToast(

                    t('common.success'),

                    t('document.settings.document_categories.toast_deleted'),

                    'success'

                )

                await fetchTypes()
            } catch (error: any) {
                const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
                toast.showToast(
                    t('common.error'),
                    apiMsg || t('document.settings.document_categories.toast_delete_failed'),
                    'error'
                )
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
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



onUnmounted(() => {

    if (searchTimeout.value) {

        clearTimeout(searchTimeout.value)

    }

})



onMounted(() => {

    fetchTypes()

})

</script>
