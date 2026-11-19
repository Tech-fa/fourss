<template>
    <main id="main-content" class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-lg mb-1">{{ t('audit.activity_types.title') }}</h2>
                <!-- <AppButton buttonStyle="primary" class="flex items-center gap-2" @click="openAddModal">
                    <i class="fa-solid fa-plus"></i>
                    Add Activity Type
                </AppButton> -->
            </div>
            <div id="search-filter" class="mb-6">
                <div class="flex gap-4">
                    <div class="flex-1">
                        <div class="relative">
                            <AppInput
                                v-model="searchQuery"
                                @input="handleSearch"
                                type="text"
                                :placeholder="t('audit.activity_types.search_placeholder')"
                                class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                            />
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <Can subject="audit_activity_types" :actions="['create']">
                            <AppButton
                                buttonStyle="primary"
                                class="flex items-center gap-2"
                                href="/check/audits/activity-types/add"
                                test-id="add-activity-type-button"
                            >
                                <i class="fa-solid fa-plus"></i>
                                {{ t('audit.activity_types.add_button') }}
                            </AppButton>
                        </Can>
                    </div>
                </div>
            </div>
            <div test-id="activity-types-list">
                <Table
                    :cols="activityTypeTableCols"
                    :column-labels="activityTypeColumnLabels"
                    :rows="paginatedRows"
                    :entities="activityTypes"
                    :page="page"
                    :total="total"
                    :per-page="perPage"
                    :total-pages="totalPages"
                    :on-next-page="onNextPage"
                    :on-previous-page="onPreviousPage"
                    :set-page="setPage"
                    :loading="loading"
                    :on-success="onSuccess"
                    :entity-name="t('audit.activity_types.entity_name')"
                    subject="audit_activity_types"
                    :hide-view="() => true"
                    :edit-path="(row: any) => `/check/audits/activity-types/${row.id}/edit`"
                    :handleDelete="handleDelete"
                    :hideDelete="(entity) => !!entity?.isDefault"
                    :hide-edit="(entity) => !!entity?.isDefault"
                    :hide-search="true"
                />
            </div>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Table from '../Table.vue'
import AppButton from '../AppButton.vue'
import AppInput from '../AppInput.vue'
import Can from '../Can.vue'
import type { AuditActivityType } from '@/util/interfaces'
import { apiDelete, apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '../ConfirmDialog.vue'
import { formatApiErrorMessage } from '@/util/util'

const authStore = useAuthStore()
const toast = useToast()
const dialog = useDialog()
const { t, locale } = useI18n()

const activityTypeTableCols = ['Name', 'Description']

const activityTypeColumnLabels = computed(() => {
    void locale.value
    return {
        Name: t('common.Name'),
        Description: t('common.Description')
    }
})
const activityTypes = ref<AuditActivityType[]>([])
const page = ref(1)
const perPage = ref(10)
const total = ref(1)
const totalPages = ref(1)
const searchQuery = ref('')
const searchTimeout = ref()
const loading = ref(true)
const formLoading = ref(false)
const rows = ref<{ [key: string]: any }[]>([])
const paginatedRows = computed(() => {
    const start = (page.value - 1) * perPage.value
    const end = start + perPage.value
    return rows.value.slice(start, end)
})

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }

    searchTimeout.value = setTimeout(() => {
        page.value = 1
        onSuccess()
    }, 300) 
}

onUnmounted(() => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
})

const mapRows = (types: AuditActivityType[]) => {
    if (!types || !Array.isArray(types)) {
        console.warn('No activity types data or invalid data format received')
        return []
    }
    const na = t('training.main.na')
    return types.map((type) => ({
        id: type.id,
        Name: type.name,
        Description: type.description || na
    }))
}

const onSuccess = async () => {
    try {
        loading.value = true
        const searchParam = searchQuery.value ? `&search=${searchQuery.value}` : ''
        const response = await apiGet<AuditActivityType[]>(`/audits/activity-types?${searchParam}`, authStore)
        activityTypes.value = response
        totalPages.value = Math.max(1, Math.ceil(response.length / perPage.value))
        total.value = response.length
        rows.value = mapRows(response)
        if (page.value > totalPages.value) {
            page.value = totalPages.value
        }
    } catch (error) {
        console.error('Error fetching activity types:', error)
        activityTypes.value = []
    } finally {
        loading.value = false
    }
}

const setPage = (newPage: number) => {
    const clamped = Math.min(Math.max(1, newPage), totalPages.value)
    page.value = clamped
}

const onNextPage = () => setPage(page.value + 1)
const onPreviousPage = () => setPage(page.value - 1)

const handleDelete = async (entity: any) => {
    dialog.openDialog(ConfirmDialog, {
        message: t('audit.activity_types.delete_confirm', { name: entity.name }),
        onConfirm: async () => {
            try {
                formLoading.value = true
                await apiDelete(`/audits/activity-types/${entity.id}`, authStore)
                toast.showToast(t('common.success'), t('audit.activity_types.toast_deleted'), 'success')
                await onSuccess()
            } catch (error: any) {
                console.error('Error deleting activity type:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error?.response?.data, t, 'errors.audit') || t('audit.activity_types.toast_delete_failed'),
                    'error'
                )
            } finally {
                formLoading.value = false
                dialog.closeDialog()
            }
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}

watch(locale, () => {
    if (activityTypes.value?.length) {
        rows.value = mapRows(activityTypes.value)
    }
})

onMounted(async () => {
    await onSuccess()
})
</script>
