<template>
    <main id="main-content" class="p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-lg mb-1" test-id="audit-personnel-title">{{ t('audit.personnel.title') }}</h2>
                    <p class="text-neutral-600 text-sm" test-id="audit-personnel-subtitle">
                        {{ t('audit.personnel.subtitle') }}
                    </p>
                </div>
            </div>
            <div id="search-filter" class="mb-6">
                <div class="flex gap-4">
                    <div class="flex-1">
                        <div class="relative">
                            <span v-if="!searchLoading">
                                <component
                                    :is="h('i', {
                                        class: 'fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400'
                                    })"
                                />
                            </span>
                            <Spinner
                                v-if="searchLoading"
                                width="1"
                                class="absolute left-3 top-1/2 -translate-y-1/2"
                            />
                            <AppInput
                                v-model="searchQuery"
                                type="text"
                                @input="handleSearch"
                                :placeholder="t('audit.personnel.search_placeholder')"
                                class="w-full px-4 py-1 pl-10 border border-neutral-200 rounded-md"
                                test-id="audit-personnel-search"
                            />
                        </div>
                    </div>
                    <span style="min-width: 150px">
                        <Select2
                            v-model="selectedPersonnelType"
                            :values="personnelTypes"
                            :display="(item: any) => labelForStatusOption(item, t)"
                            :placeholder="t('audit.personnel.filter_all_personnel_types')"
                            test-id="personnel-type-select"
                        />
                    </span>
                    <span style="min-width: 150px">
                        <Select2
                            v-model="selectedStatus"
                            :values="statuses"
                            :display="(item: any) => labelForStatusOption(item, t)"
                            :placeholder="t('audit.personnel.filter_all_status')"
                            test-id="status-select"
                        />
                    </span>
                    <div class="flex gap-2">
                        <Can subject="audit_personnels" :actions="['create']">
                            <AppButton
                                buttonStyle="primary"
                                @click="openAddPersonnelModal(false)"
                                class="flex items-center gap-2"
                                test-id="add-audit-personnel-button"
                            >
                                <i class="fa-solid fa-plus"></i>
                                {{ t('audit.personnel.add_button') }}
                            </AppButton>
                        </Can>
                    </div>
                </div>
            </div>
            <Table
                test-id="audit-personnel-table"
                :cols="personnelTableCols"
                :column-labels="personnelColumnLabels"
                :rows="auditPersonnelsRows"
                :entities="auditPersonnelsEntities"
                :total-pages="totalPages"
                :page="currentPage"
                :total="totalItems"
                :per-page="perPage"
                :on-next-page="handleNextPage"
                :on-previous-page="handlePreviousPage"
                :set-page="handleSetPage"
                :loading="isLoading"
                :on-success="() => {}"
                :on-edit="(row: any) => openAddPersonnelModal(true, row)"
                :handleDelete="(row: any) => handleDelete(row)"
                :entity-name="t('audit.personnel.entity_name')"
                subject="audit_personnels"
                :hide-view="() => true"
            />
    </main>
</template>
<script setup lang="ts">
import { ref, h, onMounted, watch, computed } from 'vue'
import Spinner from '../Spinner.vue'
import AppInput from '../AppInput.vue'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import Table from '../Table.vue'
import Select2 from '../Select2.vue'
import {
    type AuditPersonnel,
    type PaginatedResponse,
    STATUS_OPTIONS,
    PERSONNEL_TYPE_OPTIONS,
    labelForStatusOption
} from '@/util/interfaces'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useDialog } from '@/stores/dialog'
import AddPersonnelModal from './audit-personnel-modal.vue'
import { apiGet, apiDelete, apiPost, apiPut } from '@/util/api'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatApiErrorMessage } from '@/util/util'

const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(1)
const perPage = ref(10)
const authStore = useAuthStore()
const toast = useToast()
const dialog = useDialog()
const { t, locale } = useI18n()

const personnelTableCols = ['FirstName', 'LastName', 'Email', 'External', 'ActiveStatus']

const personnelColumnLabels = computed(() => {
    void locale.value
    return {
        FirstName: t('audit.personnel.col_first_name'),
        LastName: t('audit.personnel.col_last_name'),
        Email: t('audit.personnel.col_email'),
        External: t('audit.personnel.col_external'),
        ActiveStatus: t('audit.personnel.col_active_status')
    }
})

const displayPersonnelType = (item: any) => {
    if (item == null) return ''
    if (item.id === 'Internal') return t('audit.personnel.type_internal')
    if (item.id === 'External') return t('audit.personnel.type_external')
    return t('audit.personnel.filter_all_personnel_types')
}

const displayPersonFilter = (item: any) => {
    if (item == null) return ''
    if (item.id === 'Active') return t('statuses.active')
    if (item.id === 'Inactive') return t('statuses.inactive')
    return t('audit.personnel.filter_all_status')
}
const searchLoading = ref(false)
const searchQuery = ref('')
const selectedPersonnelType = ref<any>(null)
const selectedStatus = ref<any>(null)
const isLoading = ref(false)
const auditPersonnelsEntities = ref<AuditPersonnel[]>([])
const auditPersonnelsRows = ref<{ [key: string]: any }[]>([])
const searchTimeout = ref()
const personnelTypes = ref<any[]>(PERSONNEL_TYPE_OPTIONS)
const statuses = ref<any[]>(STATUS_OPTIONS)

onMounted(() => {
    fetchAuditPersonnels()
})

const mapRows = (auditPersonnels: any[]) => {
    return auditPersonnels.map((auditPersonnel) => ({
        id: auditPersonnel.id,
        FirstName: auditPersonnel.firstName,
        LastName: auditPersonnel.lastName,
        Email: auditPersonnel.email,
        External: auditPersonnel.isExternal ? t('common.yes') : t('common.no'),
        ActiveStatus: auditPersonnel.isActive ? t('statuses.active') : t('statuses.inactive')
    }))
}
watch([selectedPersonnelType, selectedStatus], () => {
    currentPage.value = 1;
    fetchAuditPersonnels();
})

watch(locale, () => {
    if (auditPersonnelsEntities.value?.length) {
        auditPersonnelsRows.value = mapRows(auditPersonnelsEntities.value)
    }
})

const fetchAuditPersonnels = async () => {
    isLoading.value = true
    try{
        const searchParam = searchQuery.value ? `&search=${searchQuery.value}` : ''
        const isExternalParam = selectedPersonnelType.value?.id ? `&isExternal=${selectedPersonnelType.value.id}` : ''
        const isActiveParam = selectedStatus.value?.id ? `&isActive=${selectedStatus.value.id}` : ''
        
        const response = await apiGet<PaginatedResponse<AuditPersonnel>>(
            `/audits/personnels?perPage=${perPage.value}&page=${currentPage.value}${searchParam}${isExternalParam}${isActiveParam}`,
            authStore
        )        

        auditPersonnelsRows.value = mapRows(response.data)
        auditPersonnelsEntities.value = response.data
        totalItems.value = response.totalCount
        totalPages.value = Math.ceil(response.totalCount / perPage.value)
    } catch (error) {
        console.error('Error fetching audit activity types:', error)
    } finally {
        isLoading.value = false
    }
}

const openAddPersonnelModal = (isEdit: boolean, row?: any) => {
    const entity =
        isEdit && row?.id
            ? auditPersonnelsEntities.value.find((e) => e.id === row.id)
            : undefined

    dialog.openDialog(AddPersonnelModal, {
        isEditMode: isEdit,
        initialValues: entity ?? row,
        onCancel: () => {
            dialog.closeDialog()
        },
        onSave: async (data: any) => {
            try {
                if (isEdit) {
                    await apiPut<{ id: string }>(`/audits/personnels/${row.id}`, data, authStore)
                    toast.showToast(t('common.success'), t('audit.personnel.toast_updated'), 'success')
                } else {
                    await apiPost<{ id: string }>('/audits/personnels', data, authStore)
                    toast.showToast(t('common.success'), t('audit.personnel.toast_added'), 'success')
                }
                await fetchAuditPersonnels()
                dialog.closeDialog()
            } catch (error: any) {
                const errorMessage =
                    formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                    t('audit.personnel.toast_save_failed')
                toast.showToast(t('common.error'), errorMessage, 'error')
            }
        }
    })
}

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1;
        fetchAuditPersonnels()
    }, 300)
}

const handleDelete = async (row: any) => {
    dialog.openDialog(ConfirmDialog, {
        title: t('audit.personnel.delete_title'),
        message: t('audit.personnel.delete_confirm'),
        onConfirm: async () => {
            try {
                await apiDelete<{ id: string }>(`/audits/personnels/${row.id}`, authStore)
                toast.showToast(t('common.success'), t('audit.personnel.toast_deleted'), 'success')
                await fetchAuditPersonnels()
            } catch (err:any) {
                console.error('Error deleting audit personnel:', err)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(err?.response?.data, t, 'errors.audit') ||
                        t('audit.personnel.toast_delete_failed'),
                    'error'
                )
            }
            dialog.closeDialog()
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}

const handleNextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++;
        fetchAuditPersonnels();
    }
};
const handlePreviousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
        fetchAuditPersonnels();
    }
};
const handleSetPage = (page: number) => {
    if (page !== currentPage.value) {
        currentPage.value = page;
        fetchAuditPersonnels();
    }
};
</script>