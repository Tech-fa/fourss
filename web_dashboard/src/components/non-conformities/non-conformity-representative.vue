<template>
    <main id="main-content" class="p-6">
        <div class="bg-white rounded-lg border p-6">
            <div class="flex items-center justify-between mb-6">
                <div test-id="non-conformity-representatives-header">
                    <h2 class="text-lg mb-1">{{ $t('nc.representative.title') }}</h2>
                    <p class="text-neutral-600 text-sm">{{ $t('nc.representative.subtitle') }}</p>
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
                                :placeholder="$t('nc.representative.searchPlaceholder')"
                                class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                                test-id="search-nc-representative-input"
                            />
                        </div>
                    </div>
                    <span style="min-width: 150px">
                        <Select2
                            v-model="selectedPersonnelType"
                            :values="personnelTypes"
                            :display="(item: any) => labelForStatusOption(item, t)"
                            :placeholder="$t('nc.enum.personnelType.all')"
                            test-id="select-nc-representative-type"
                        />
                    </span>
                    <div class="flex gap-2">
                        <Can subject="non_conformity_representatives" :actions="['create']">
                            <AppButton
                                buttonStyle="primary"
                                class="flex items-center gap-2"
                                @click="() => openNCRepresentativeModal(false, undefined)"
                                test-id="add-nc-representative-button"
                            >
                                <i class="fa-solid fa-plus"></i>
                                {{ $t('nc.representative.addButton') }}
                            </AppButton>
                        </Can>
                    </div>
                </div>
            </div>

            <Table
                test-id="non-conformity-representatives-table"
                :cols="tableColumns"
                :column-labels="columnLabels"
                :rows="paginatedData"
                :entities="nonConformityRepresentativesEntities"
                :total-pages="totalPages"
                :page="currentPage"
                :total="totalNonConformityRepresentatives"
                :per-page="perPage"
                :on-next-page="handleNextPage"
                :on-previous-page="handlePreviousPage"
                :set-page="handleSetPage"
                :loading="isLoading"
                :search-loading="searchLoading"
                :on-success="() => {}"
                :on-edit="(row: any) => openNCRepresentativeModal(true, row)"
                :entity-name="$t('nc.representative.entityName')"
                subject="non_conformity_representatives"
                :hideView="(row) => true"
                :hide-edit="hideActionsForInternalRepresentative"
                :hide-delete="hideActionsForInternalRepresentative"
                :handleDelete="handleDelete"
                :skip-padding="true"
            />
        </div>
    </main>
</template>
<script setup lang="ts">
import { ref, h, computed, onMounted, watch } from 'vue'
import Spinner from '../Spinner.vue'
import AppInput from '../AppInput.vue'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import { type AuditPersonnel, PERSONNEL_TYPE_OPTIONS, labelForStatusOption } from '@/util/interfaces'
import Table from '../Table.vue'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ModalForm from '../audit/audit-personnel-modal.vue'
import { apiGet, apiDelete, apiPost, apiPut } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import Select2 from '../Select2.vue'
import { formatApiErrorMessage } from '@/util/util'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'

const dialogStore = useDialog()
const isLoading = ref(false)
const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const tableColumns = ['First Name', 'Last Name', 'Email', 'Type']

const columnLabels = computed(() => ({
    'First Name': t('nc.representative.tableFirstName'),
    'Last Name': t('nc.representative.tableLastName'),
    Email: t('nc.representative.tableEmail'),
    Type: t('nc.representative.tableType')
}))

const searchQuery = ref('')
const searchLoading = ref(false)
const searchTimeout = ref()

const currentPage = ref(1)
const totalPages = ref(1)
const totalNonConformityRepresentatives = ref(1)
const perPage = ref(10)

const selectedPersonnelType = ref<any>(null)
const personnelTypes = ref<any[]>(PERSONNEL_TYPE_OPTIONS)

const nonConformityRepresentativesEntities = ref<any[]>([])

const props = defineProps<{
    nonConformityRepresentatives?: AuditPersonnel[]
}>()

const emit = defineEmits<{
    (e: 'update:nonConformityRepresentatives', value: any[]): void
}>()

const mapRows = (nonConformityRepresentatives: any[]) => {
    if (!nonConformityRepresentatives || !Array.isArray(nonConformityRepresentatives)) {
        console.warn('No non-conformity representatives data or invalid data format received')
        return []
    }

    return nonConformityRepresentatives.map((representative: any) => ({
        id: representative.id,
        'First Name': representative.firstName,
        'Last Name': representative.lastName,
        Email: representative.email,
        Type: representative.isExternal ? t('nc.representative.typeExternal') : t('nc.representative.typeInternal')
    }))
}

const tableRows = computed(() => mapRows(nonConformityRepresentativesEntities.value))

const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * perPage.value
    const end = start + perPage.value
    return tableRows.value.slice(start, end)
})

const updateLocalState = (data: any[]) => {
    nonConformityRepresentativesEntities.value = data
    totalNonConformityRepresentatives.value = data.length
    totalPages.value = Math.ceil(data.length / perPage.value)
    isLoading.value = false
}

onMounted(() => {
    if (props.nonConformityRepresentatives && props.nonConformityRepresentatives.length > 0) {
        updateLocalState(props.nonConformityRepresentatives)
    } else {
        fetchNonConformityRepresentatives()
    }
})

watch([selectedPersonnelType], () => {
    currentPage.value = 1
    fetchNonConformityRepresentatives()
})

const openNCRepresentativeModal = (isEdit: boolean, row?: any) => {
    dialogStore.openDialog(ModalForm, {
        isEditMode: isEdit,
        hideActive: true,
        formName: t('nc.representative.entityName'),
        initialValues: isEdit
            ? {
                  firstName: row.firstName,
                  lastName: row.lastName,
                  email: row.email
              }
            : null,
        onCancel: () => {
            dialogStore.closeDialog()
        },
        onSave: async (data: any) => {
            try {
                if (isEdit) {
                    const editData = {
                        id: row.id,
                        ...data
                    }
                    await apiPut<string>(
                        `/non-conformities/representatives/${row.id}`,
                        editData,
                        authStore
                    )
                    toast.showToast(t('common.success'), t('nc.representative.updateSuccess'), 'success')
                } else {
                    await apiPost<string>('/non-conformities/representatives', data, authStore)
                    toast.showToast(t('common.success'), t('nc.representative.addSuccess'), 'success')
                }
                await fetchNonConformityRepresentatives()
                dialogStore.closeDialog()
            } catch (error: any) {
                toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.representative.saveError'), 'error')
            }
        }
    })
}

const hideActionsForInternalRepresentative = (entity: any) => {
    return !!(entity && !entity.isExternal)
}

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1
        fetchNonConformityRepresentatives(true)
    }, 300)
}

const handleDelete = async (item: any) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('nc.representative.deleteConfirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/non-conformities/representatives/${item.id}`, authStore)
                toast.showToast(t('common.success'), t('nc.representative.deleteSuccess'), 'success')
                await fetchNonConformityRepresentatives()
            } catch (error: any) {
                console.error('Error deleting non-conformity representative:', error)
                toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.representative.deleteError'), 'error')
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

const fetchNonConformityRepresentatives = async (fromSearch = false) => {
    if (fromSearch) {
        searchLoading.value = true
    } else {
        isLoading.value = true
    }
    try {
        const params = new URLSearchParams()
        if (searchQuery.value?.trim()) {
            params.set('search', searchQuery.value.trim())
        }
        if (selectedPersonnelType.value?.id) {
            params.set('personnelType', String(selectedPersonnelType.value.id).toLowerCase())
        }
        const orgUnits = authStore.state.userDetails.orgUnits ?? []
        if (orgUnits.length > 0) {
            params.set('organizationUnitIds', orgUnits.join(','))
        }
        const qs = params.toString()
        const response = await apiGet<AuditPersonnel[]>(
            `/non-conformities/representatives${qs ? `?${qs}` : ''}`,
            authStore
        )
        if (!response) {
            console.error('Invalid response format:', response)
            toast.showToast(t('common.error'), t('common.invalidResponseFormat'), 'error')
            return
        }
        updateLocalState(response)
        emit('update:nonConformityRepresentatives', response)
    } catch (err) {
        console.error('Error fetching non-conformity representatives:', err)
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
        fetchNonConformityRepresentatives()
    }
}

const handlePreviousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
        fetchNonConformityRepresentatives()
    }
}

const handleSetPage = (page: number) => {
    if (page !== currentPage.value) {
        currentPage.value = page
        fetchNonConformityRepresentatives()
    }
}
</script>
