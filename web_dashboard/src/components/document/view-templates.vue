<template>
    <div id="root" class="min-h-screen bg-neutral-50">
        <Table
            :cols="tableColumns"
            :rows="templatesRows"
            :column-labels="columnLabels"
            :entities="templatesEntities"
            :total-pages="totalPages"
            :page="currentPage"
            :total="totalItems"
            :per-page="itemsPerPage"
            :on-next-page="handleNextPage"
            :on-previous-page="handlePreviousPage"
            :set-page="handleSetPage"
            :entity-name="t('document.settings.document_templates.entity_name')"
            :on-success="fetchTemplates"
            :on-search="(val: string) => { search = val }"
            :loading="loading"
            :search-placeholder="t('document.settings.document_templates.search_placeholder')"
            :handleDelete="handleDelete"
            :extra-search="renderExtraSearch"
            :hide-view="() => false"
            :hide-edit="(entity: any) => entity?.isDefault === true"
            :hide-delete="(entity: any) => entity?.isDefault === true"
            :subject="'document_templates'"
            :view-path="(row: any) => `/plan/documents/settings/templates/${row.id}`"
            :edit-path="(row: any) => `/plan/documents/settings/templates/${row.id}/edit`"
        >
            <template #extra-field="{ entity }">
                <Can subject="document_templates" :actions="['create']">
                    <span
                        v-if="entity"
                        :class="[
                            'dark:text-gray-300 text-gray-900 hover:text-gray-400 cursor-pointer',
                            entity.isDefault === false ? 'ml-4' : ''
                        ]"
                        :title="t('document.settings.document_templates.copy_template_title')"
                        @click.stop="router.push(`/plan/documents/settings/templates/${entity.id}/copy`)"
                    >
                        <i class="fa-solid fa-copy"></i>
                    </span>
                </Can>
            </template>
        </Table>
    </div>
</template>
<script setup lang="ts">
import Select2 from '../Select2.vue'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { apiGet, apiDelete } from '../../util/api'
import { formatApiErrorMessage } from '../../util/util'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../stores/notification'
import { useDialog } from '../../stores/dialog'
import type { PaginatedResponse } from '../../util/interfaces'
import Table from '../../components/Table.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { DOCUMENT_TEMPLATE_TYPE_OPTIONS } from '../../util/interfaces'
import type { SelectOption, DocumentTemplate } from '../../util/interfaces'

const { t, locale } = useI18n()

const tableColumns: string[] = ['Title', 'Description', 'Type']

const columnLabels = computed(() => ({
    Title: t('document.settings.document_templates.column_title'),
    Description: t('document.settings.document_templates.column_description'),
    Type: t('document.settings.document_templates.column_type')
}))

const loading = ref(false)
const search = ref('')
const selectedType = ref<SelectOption | null>(null)

const renderExtraSearch = () => [
    h('span', { class: 'min-w-[180px]' }, [
        h(Select2, {
            modelValue: selectedType.value,
            'onUpdate:modelValue': (v: SelectOption | null) => {
                selectedType.value = v
            },
            values: DOCUMENT_TEMPLATE_TYPE_OPTIONS,
            display: (opt: SelectOption) => {
                if (!opt?.value) return opt?.label ?? ''
                if (opt.value === 'default') {
                    return t('document.settings.document_templates.type_value_default')
                }
                if (opt.value === 'custom') {
                    return t('document.settings.document_templates.type_value_custom')
                }
                return opt.label ?? ''
            },
            placeholder: t('document.settings.document_templates.select_type_placeholder'),
            optional: true,
            'test-id': 'template-select'
        })
    ]),
    h(Can, { subject: 'document_templates', actions: ['create'] }, () => [
        h(
            AppButton,
            {
                buttonStyle: 'primary',
                href: '/plan/documents/settings/templates/add'
            },
            () => [
                h('i', { class: 'fa-solid fa-plus' }),
                h(
                    'span',
                    { class: 'ml-2', 'test-id': 'add-template-button' },
                    t('document.settings.document_templates.add_template')
                )
            ]
        )
    ])
]

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const dialogStore = useDialog()

const templatesEntities = ref<DocumentTemplate[]>([])

const templatesRows = computed(() => {
    void locale.value
    return templatesEntities.value.map((template) => ({
        id: template.id,
        Title: template.title,
        Description: template.description,
        Type: template.isDefault
            ? t('document.settings.document_templates.type_value_default')
            : t('document.settings.document_templates.type_value_custom')
    }))
})

const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)
const itemsPerPage = ref(10)

const fetchTemplates = async () => {
    try {
        loading.value = true
        const params: Record<string, string | number | boolean> = {
            page: currentPage.value,
            perPage: itemsPerPage.value
        }
        if (search.value) params.search = search.value
        if (selectedType.value?.value === 'default') params.isDefault = true
        else if (selectedType.value?.value === 'custom') params.isDefault = false

        const response = await apiGet<PaginatedResponse<DocumentTemplate>>(
            '/documents/templates',
            authStore,
            params
        )

        templatesEntities.value = response.data
        totalItems.value = response.totalCount
        totalPages.value = Math.ceil(response.totalCount / itemsPerPage.value) || 1
    } catch (error: any) {
        console.error('Error fetching document templates:', error)
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.settings.document_templates.toast_load_failed'),
            'error'
        )
        templatesEntities.value = []
    } finally {
        loading.value = false
    }
}

const searchTimeout = ref<NodeJS.Timeout | null>(null)

const handleSearch = () => {
    if (searchTimeout.value) clearTimeout(searchTimeout.value)
    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1
        fetchTemplates()
    }, 300)
}

watch(search, () => {
    loading.value = true
    handleSearch()
})

watch(selectedType, () => {
    currentPage.value = 1
    fetchTemplates()
})

const handleDelete = async (item: any) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('document.settings.document_templates.delete_confirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/documents/templates/${item.id}`, authStore)
                toast.showToast(
                    t('common.success'),
                    t('document.settings.document_templates.toast_deleted'),
                    'success'
                )
                await fetchTemplates()
            } catch (error: any) {
                console.error('Error deleting template:', error)
                const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
                toast.showToast(
                    t('common.error'),
                    apiMsg || t('document.settings.document_templates.toast_delete_failed'),
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
        fetchTemplates()
    }
}

const handlePreviousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
        fetchTemplates()
    }
}

const handleSetPage = (page: number) => {
    if (page !== currentPage.value) {
        currentPage.value = page
        fetchTemplates()
    }
}

onUnmounted(() => {
    if (searchTimeout.value) clearTimeout(searchTimeout.value)
})

onMounted(() => {
    fetchTemplates()
})
</script>
