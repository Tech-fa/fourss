<template>
    <main id="main-content" class="p-6">
        <div class="flex items-center justify-between mb-6" test-id="checklist-definitions-header">
            <div>
                <h2 class="text-lg mb-1">{{ t('audit.checklist_definitions_list.title') }}</h2>

                <p class="text-neutral-600 text-sm">
                    {{ t('audit.checklist_definitions_list.subtitle') }}
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
                            :placeholder="t('audit.checklist_definitions_list.search_placeholder')"
                            class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                            test-id="checklist-definitions-search"
                        />
                    </div>
                </div>

                <div class="flex gap-2">
                    <Can subject="audit_checklist_definitions" :actions="['create']">
                        <AppButton
                            buttonStyle="primary"
                            class="flex items-center gap-2"
                            @click="navigateToAdd"
                            test-id="add-checklist-definition-button"
                        >
                            <i class="fa-solid fa-plus"></i>

                            {{ t('audit.checklist_definitions_list.add_button') }}
                        </AppButton>
                    </Can>
                </div>
            </div>
        </div>

        <Table
            test-id="checklist-definitions-table"
            :cols="checklistTableCols"
            :column-labels="checklistColumnLabels"
            :rows="paginatedData"
            :entities="checklistDefinitionsEntities"
            :total-pages="totalPages"
            :page="currentPage"
            :total="totalChecklistDefinitions"
            :per-page="perPage"
            :on-next-page="handleNextPage"
            :on-previous-page="handlePreviousPage"
            :set-page="setPage"
            :loading="isLoading"
            :search-loading="searchLoading"
            :on-success="() => {}"
            :on-edit="(row: any) => handleEdit(row)"
            :entity-name="t('audit.checklist_definitions_list.entity_name')"
            subject="audit_checklist_definitions"
            :hideView="(row) => true"
            :handleDelete="handleDelete"
            :skip-padding="true"
        />
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, h, computed } from 'vue'

import { useRouter } from 'vue-router'

import { useI18n } from 'vue-i18n'

import Table from '../Table.vue'

import AppInput from '../AppInput.vue'

import AppButton from '../AppButton.vue'

import Can from '../Can.vue'

import { useAuthStore } from '@/stores/auth'

import { useToast } from '@/stores/notification'

import { apiGet, apiDelete } from '@/util/api'

import type { ChecklistDefinition } from '@/util/interfaces'

import { useDialog } from '../../stores/dialog'

import ConfirmDialog from '@/components/ConfirmDialog.vue'

import Spinner from '../Spinner.vue'

import { formatApiErrorMessage } from '@/util/util'

const { t } = useI18n()

const checklistTableCols = [
    'name',
    'description',
    'version',
    'activity_type',
    'draft',
    'created_by'
]

const checklistColumnLabels = computed(() => ({
    name: t('audit.checklist_definitions_list.col_name'),

    description: t('audit.checklist_definitions_list.col_description'),

    version: t('audit.checklist_definitions_list.col_version'),

    activity_type: t('audit.checklist_definitions_list.col_activity_type'),

    draft: t('audit.checklist_definitions_list.col_draft'),

    created_by: t('audit.checklist_definitions_list.col_created_by')
}))

const isLoading = ref(true)

const authStore = useAuthStore()

const toast = useToast()

const dialogStore = useDialog()

const router = useRouter()

const checklistDefinitionsEntities = ref<ChecklistDefinition[]>([])

const searchTimeout = ref()

const error = ref<string | null>(null)

const searchQuery = ref('')

const searchLoading = ref(false)

const currentPage = ref(1)

const totalPages = ref(1)

const totalChecklistDefinitions = ref(0)

const perPage = ref(10)

const props = defineProps<{
    checklistDefinitions?: ChecklistDefinition[]
}>()

const mapRows = (checklistDefinitions: ChecklistDefinition[]) => {
    if (!checklistDefinitions || !Array.isArray(checklistDefinitions)) {
        console.warn('No checklist definitions data or invalid data format received')

        return []
    }

    return checklistDefinitions.map((checklistDef) => {
        const row = {
            id: checklistDef.id,

            name: checklistDef.title,

            description: checklistDef.description || t('training.competencies.no_description'),

            version: checklistDef.version || 0,

            activity_type:
                checklistDef.activityType?.name ||
                t('audit.checklist_definitions_list.no_activity_type'),

            draft: checklistDef.isDraft ? t('common.yes') : t('common.no'),

            created_by: checklistDef.createdBy.fname + ' ' + checklistDef.createdBy.lname
        }

        return row
    })
}

const rows = computed(() => mapRows(checklistDefinitionsEntities.value))

const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * perPage.value

    const end = start + perPage.value

    return rows.value.slice(start, end)
})

const updateLocalState = (data: ChecklistDefinition[]) => {
    checklistDefinitionsEntities.value = data

    totalChecklistDefinitions.value = data.length

    totalPages.value = Math.ceil(data.length / perPage.value)

    isLoading.value = false
}

onMounted(() => {
    if (props.checklistDefinitions && props.checklistDefinitions.length > 0) {
        updateLocalState(props.checklistDefinitions)
    } else {
        fetchChecklistDefinitions()
    }
})

function navigateToAdd() {
    router.push('/audits/checklist-definitions/add-checklist')
}

const emit = defineEmits<{
    (e: 'update:checklistDefinitions', value: ChecklistDefinition[]): void
}>()

const handleEdit = (item: ChecklistDefinition) => {
    router.push(`/check/audits/checklist-definitions/${item.id}/edit`)
}

const handleDelete = async (item: any) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('audit.checklist_definitions_list.delete_confirm'),

        onConfirm: async () => {
            try {
                await apiDelete(`/audits/checklist-definitions/${item.id}`, authStore)

                toast.showToast(
                    t('common.success'),
                    t('audit.checklist_definitions_list.toast_deleted'),
                    'success'
                )

                await fetchChecklistDefinitions()
            } catch (error: any) {
                console.error('Error deleting checklist definition:', error)

                toast.showToast(
                    t('common.error'),

                    formatApiErrorMessage(error.response?.data, t, 'errors.audit') ||
                        t('audit.checklist_definitions_list.toast_delete_failed'),

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
        fetchChecklistDefinitions()
    }, 300)
}

const fetchChecklistDefinitions = async () => {
    isLoading.value = true

    error.value = null

    try {
        let queryParams = new URLSearchParams()

        if (searchQuery.value) {
            queryParams.append('search', searchQuery.value)
        }

        const queryString = queryParams.toString()

        const url = `/audits/checklist-definitions${queryString ? `?${queryString}` : ''}`

        const response = await apiGet<ChecklistDefinition[]>(url, authStore)

        if (!response) {
            console.error('Invalid response format:', response)

            toast.showToast(
                t('common.error'),
                t('audit.checklist_definitions_list.toast_invalid_response'),
                'error'
            )

            return
        }

        updateLocalState(response)

        emit('update:checklistDefinitions', response)
    } catch (err) {
        console.error('Error fetching checklist definitions:', err)

        error.value = t('audit.checklist_definitions_list.toast_fetch_failed')

        if (authStore.state.isLoggedIn) {
            toast.showToast(
                t('common.error'),
                t('audit.checklist_definitions_list.toast_fetch_failed'),
                'error'
            )
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
</script>
