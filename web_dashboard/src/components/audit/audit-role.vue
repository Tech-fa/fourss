<template>
    <main id="main-content" class="p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-lg mb-1">{{ t('audit.roles.title') }}</h2>
                    <p class="text-neutral-600 text-sm">
                        {{ t('audit.roles.subtitle') }}
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
                                :placeholder="t('audit.roles.search_placeholder')"
                                class="w-full px-4 py-1 pl-10 border border-neutral-200 rounded-md"
                                test-id="audit-role-search"
                            />
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <Can subject="audit_roles" :actions="['create']">
                            <AppButton
                                buttonStyle="primary"
                                class="flex items-center gap-2"
                                @click="openAddModal"
                                test-id="add-audit-role-button"
                            >
                                <i class="fa-solid fa-plus"></i>
                                {{ t('audit.roles.add_button') }}
                            </AppButton>
                        </Can>
                    </div>
                </div>
            </div>

            <Table
                :cols="auditRoleTableCols"
                :column-labels="auditRoleColumnLabels"
                :rows="paginatedData"
                :entities="auditRolesEntities"
                :total-pages="totalPages"
                :page="currentPage"
                :total="totalAuditRoles"
                :per-page="perPage"
                :on-next-page="handleNextPage"
                :on-previous-page="handlePreviousPage"
                :set-page="setPage"
                :loading="isLoading"
                :search-loading="searchLoading"
                :on-success="() => {}"
                :on-edit="(row: any) => handleEdit(row)"
                :entity-name="t('audit.roles.entity_name')"
                subject="audit_roles"
                :hideView="(row) => true"
                :handleDelete="handleDelete"
                :hideDelete="(entity) => !!entity?.isDefault"
                :hide-edit="(entity) => !!entity?.isDefault"
                :skip-padding="true"
            />
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

const auditRoleTableCols = ['Name', 'Description']

const auditRoleColumnLabels = computed(() => {
    void locale.value
    return {
        Name: t('common.Name'),
        Description: t('common.Description'),
    }
})
const isEditMode = ref(false)
const dialogStore = useDialog()
const formLoading = ref(false)
const auditRolesEntities = ref<ListItem[]>([])
const searchTimeout = ref()
const error = ref<string | null>(null)
const searchQuery = ref('')
const searchLoading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const totalAuditRoles = ref(0)
const perPage = ref(10)

const props = defineProps<{
    auditRoles: ListItem[]
}>()

const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * perPage.value
    const end = start + perPage.value
    return rows.value.slice(start, end)
})

const rows = ref<{ [key: string]: any }[]>([])
const mapRows = (auditRoles: any[]) => {
    if (!auditRoles || !Array.isArray(auditRoles)) {
        console.warn('No audit roles data or invalid data format received')
        return []
    }

    return auditRoles.map((auditRole) => {
        const row = {
            id: auditRole.id,
            Name: auditRole.name,
            Description: auditRole.description || t('training.competencies.no_description'),
            CreatedBy:auditRole.createdBy ? auditRole.createdBy.fname + ' ' + auditRole.createdBy.lname : 'System'
        }
        return row
    })
}

const updateLocalState = (data: ListItem[]) => {
    rows.value = mapRows(data)
    auditRolesEntities.value = data
    totalAuditRoles.value = data.length
    totalPages.value = Math.ceil(data.length / perPage.value)
    isLoading.value = false
}

onMounted(() => {
    if (props.auditRoles.length > 0) {
        updateLocalState(props.auditRoles)
    } else {
        fetchAuditRoles()
    }
})

function openAddModal() {
    isEditMode.value = false
    dialogStore.openDialog(ModalForm, {
        formType: t('audit.roles.form_type'),
        testIdPrefix: 'audit-role',
        isEditMode: false,
        loading: formLoading,
        namePlaceholder: t('audit.roles.name_placeholder'),
        descriptionPlaceholder: t('audit.roles.description_placeholder'),
        onClose: dialogStore.closeDialog,
        onSubmit: async (data: any) => {
            try {
                formLoading.value = true
                await apiPost('/audits/roles', data, authStore)
                toast.showToast(t('common.success'), t('audit.roles.toast_created'), 'success')
                dialogStore.closeDialog()
                await fetchAuditRoles()
            } catch (error: any) {
                console.error('Error creating audit role:', error)
                toast.showToast(t('common.error'), formatApiErrorMessage(error.response?.data, t, 'errors.audit') || t('audit.roles.toast_create_failed'), 'error')
            } finally {
                formLoading.value = false
            }
        }
    })
}

const emit = defineEmits<{
    (e: 'update:auditRoles', value: ListItem[]): void
}>()

const handleEdit = (item: ListItem) => {
    isEditMode.value = true
    dialogStore.openDialog(ModalForm, {
        formType: t('audit.roles.form_type'),
        testIdPrefix: 'audit-role',
        isEditMode: true,
        loading: formLoading,
        initialData: {
            name: item.name,
            description: item.description,
            isActive: item.isActive
        },
        namePlaceholder: t('audit.roles.name_placeholder'),
        descriptionPlaceholder: t('audit.roles.description_placeholder'),
        onClose: dialogStore.closeDialog,
        onSubmit: async (data: any) => {
            try {
                formLoading.value = true
                await apiPut(`/audits/roles/${item.id}`, data, authStore)
                toast.showToast(t('common.success'), t('audit.roles.toast_updated'), 'success')
                dialogStore.closeDialog()
                await fetchAuditRoles()
            } catch (error: any) {
                console.error('Error updating audit role:', error)
                toast.showToast(t('common.error'), formatApiErrorMessage(error.response?.data, t, 'errors.audit') || t('audit.roles.toast_update_failed'), 'error')
            } finally {
                formLoading.value = false
            }
        }
    })
}

const handleDelete = async (item: any) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('audit.roles.delete_confirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/audits/roles/${item.id}`, authStore)
                toast.showToast(t('common.success'), t('audit.roles.toast_deleted'), 'success')
                await fetchAuditRoles()
            } catch (error: any) {
                console.error('Error deleting audit role:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error.response?.data, t, 'errors.audit') || t('audit.roles.toast_delete_failed'),
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
        fetchAuditRoles()
    }, 300)
}

const fetchAuditRoles = async () => {
    isLoading.value = true
    error.value = null
    try {
        let queryParams = new URLSearchParams()

        if (searchQuery.value) {
            queryParams.append('search', searchQuery.value)
        }

        const queryString = queryParams.toString()
        const url = `/audits/roles${queryString ? `?${queryString}` : ''}`
        const response = await apiGet<ListItem[]>(url, authStore)

        if (!response) {
            console.error('Invalid response format:', response)
            toast.showToast(t('common.error'), t('training.competencies.toast_invalid_response'), 'error')
            return
        }

        updateLocalState(response)
        emit('update:auditRoles', response)
    } catch (err) {
        console.error('Error fetching audit roles:', err)
        error.value = t('audit.roles.toast_fetch_failed')
        if (authStore.state.isLoggedIn) {
            toast.showToast(t('common.error'), t('audit.roles.toast_fetch_failed'), 'error')
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
    if (auditRolesEntities.value.length) {
        rows.value = mapRows(auditRolesEntities.value)
    }
})
</script>
