<template>
    <main id="main-content" class="p-6">
        <div class="bg-white rounded-lg border p-6">
            <div class="flex items-center justify-between mb-6">
                <div test-id="non-conformity-risk-levels-header">
                    <h2 class="text-lg mb-1">{{ $t('nc.riskLevel.title') }}</h2>
                    <p class="text-neutral-600 text-sm">{{ $t('nc.riskLevel.subtitle') }}</p>
                </div>
            </div>

            <div id="search-filter" class="mb-6">
                <div class="flex gap-4">
                    <div class="flex-1">
                        <div class="relative">
                            <span>
                                <component
                                    :is="
                                        h('i', {
                                            class: 'fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400'
                                        })
                                    "
                                />
                            </span>
                            <AppInput
                                v-model="searchQuery"
                                @input="handleSearch"
                                type="text"
                                :placeholder="$t('nc.riskLevel.searchPlaceholder')"
                                class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                                test-id="search-nc-risk-level-input"
                            />
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <Can subject="non_conformity_risk_levels" :actions="['create']">
                            <AppButton
                                :disabled="saving"
                                buttonStyle="primary"
                                class="flex items-center gap-2"
                                @click="openModal()"
                                test-id="add-nc-risk-level-button"
                            >
                                <i class="fa-solid fa-plus"></i>
                                {{ $t('nc.riskLevel.addButton') }}
                            </AppButton>
                        </Can>
                        <Can subject="non_conformity_risk_levels" :actions="['update', 'create']">
                            <AppButton
                                v-if="saveChangeLoading && riskLevels.length > 0"
                                @click="saveAllChanges"
                                :loading="saving"
                                buttonStyle="primary"
                                class="flex items-center gap-2"
                                test-id="save-changes-nc-risk-level-button"
                            >
                                {{ $t('nc.riskLevel.saveChanges') }}
                            </AppButton>
                        </Can>
                    </div>
                </div>
            </div>

            <Table
                test-id="non-conformity-risk-levels-table"
                :enableDragAndDrop="true"
                :onOrderChange="handleOrderChange"
                :entities="riskLevels"
                :rows="tableRows"
                :cols="tableColumns"
                :column-labels="columnLabels"
                :entityName="$t('nc.riskLevel.entityName')"
                :page="1"
                :total="riskLevels.length"
                :perPage="riskLevels.length"
                :totalPages="1"
                :onNextPage="() => {}"
                :onPreviousPage="() => {}"
                :setPage="() => {}"
                :onSuccess="fetchRiskLevels"
                :loading="loading"
                :hideView="() => true"
                :onEdit="(riskLevel) => openModal(riskLevel)"
                :handleDelete="removeRiskLevel"
                :subject="'non_conformity_risk_levels'"
                :skipPadding="true"
            />
        </div>
    </main>
</template>
<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import { useDialog } from '@/stores/dialog'
import AppButton from '@/components/AppButton.vue'
import Table from '@/components/Table.vue'
import ModalForm from '../modal-form.vue'
import type { NonConformityRiskLevelResponseDTO } from '@/util/interfaces'
import { apiGet, apiDelete } from '@/util/api'
import Can from '../Can.vue'
import AppInput from '../AppInput.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { formatApiErrorMessage } from '@/util/util'
import { bulkUpsertNonConformityRiskLevels, NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'

const riskLevels = ref<NonConformityRiskLevelResponseDTO[]>([])
const originalOrder = ref<Map<string, number>>(new Map())
const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const searchTimeout = ref()

const authStore = useAuthStore()
const toast = useToast()
const dialogStore = useDialog()
const { t } = useI18n()

const tableColumns = ['Level Name', 'Description', 'Display Order']

const columnLabels = computed(() => ({
    'Level Name': t('nc.riskLevel.tableLevelName'),
    Description: t('nc.riskLevel.tableDescription'),
    'Display Order': t('nc.riskLevel.tableDisplayOrder')
}))

const saveChangeLoading = ref(false)

const props = defineProps<{
    nonConformityRiskLevels?: NonConformityRiskLevelResponseDTO[]
}>()

const emit = defineEmits<{
    (e: 'update:nonConformityRiskLevels', value: NonConformityRiskLevelResponseDTO[]): void
}>()

const tableRows = computed(() => {
    return riskLevels.value.map((riskLevel: NonConformityRiskLevelResponseDTO) => ({
        id: riskLevel.id,
        'Level Name': riskLevel.name,
        Description: riskLevel.description || t('nc.riskLevel.noDescription'),
        'Display Order': riskLevel.order
    }))
})

const updateOrderTracking = () => {
    originalOrder.value = new Map(
        riskLevels.value
            .filter((rl) => rl.id) // Filter out items without IDs
            .map((rl) => [rl.id!, rl.order])
    )
}

const hasOrderChanged = (): boolean => {
    if (riskLevels.value.length !== originalOrder.value.size) {
        return true
    }
    
    for (const riskLevel of riskLevels.value) {
        const riskLevelId = riskLevel.id
        if (!riskLevelId) {
            // New items without IDs are considered changes
            return true
        }
        const originalOrderValue = originalOrder.value.get(riskLevelId)
        if (originalOrderValue === undefined || originalOrderValue !== riskLevel.order) {
            return true
        }
    }
    
    return false
}

const handleOrderChange = (reorderedRiskLevels: NonConformityRiskLevelResponseDTO[]) => {
    riskLevels.value = reorderedRiskLevels
    saveChangeLoading.value = hasOrderChanged()

    emit('update:nonConformityRiskLevels', riskLevels.value)
}

const openModal = (editingRiskLevel: NonConformityRiskLevelResponseDTO | null = null) => {
    const isEdit = !!editingRiskLevel
    dialogStore.openDialog(ModalForm, {
        isEditMode: isEdit,
        formType: t('nc.riskLevel.entityName'),
        testIdPrefix: 'nc-risk-level',
        namePlaceholder: t('nc.riskLevel.namePlaceholder'),
        descriptionPlaceholder: t('nc.riskLevel.descriptionPlaceholder'),
        initialData: isEdit ? editingRiskLevel : undefined,
        onClose: dialogStore.closeDialog,
        onSubmit: async (data: { id?: string; name: string; description?: string }) => {
            const saved = await handleSaveRiskLevel(
                {
                    id: data.id || editingRiskLevel?.id || '',
                    name: data.name,
                    description: data.description || '',
                    order: editingRiskLevel?.order ?? riskLevels.value.length + 1
                },
                isEdit
            )
            if (saved) dialogStore.closeDialog()
        }
    })
}

const handleSaveRiskLevel = async (riskLevel: NonConformityRiskLevelResponseDTO, isEdit: boolean) => {
    if (isEdit) {
        // For edits, save immediately to backend
        try {
            saving.value = true
            
            // Save the updated risk level immediately
            const response = await bulkUpsertNonConformityRiskLevels([riskLevel], authStore)
            
            if (response && response.length > 0) {
                const savedRiskLevel = response[0]
                const index = riskLevels.value.findIndex((r) => r.id === savedRiskLevel.id)
                if (index !== -1) {
                    const updatedRiskLevels = [...riskLevels.value]
                    updatedRiskLevels[index] = savedRiskLevel
                    riskLevels.value = updatedRiskLevels
                    
                    // Update original order tracking after successful save
                    updateOrderTracking()
                    
                    toast.showToast(t('common.success'), t('nc.riskLevel.updateSuccess'), 'success')
                    return true
                }
            }
            
            emit('update:nonConformityRiskLevels', riskLevels.value)
        } catch (error: any) {
            console.error('Error updating risk level:', error)
            toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.riskLevel.updateError'), 'error')
            return false
        } finally {
            saving.value = false
        }
    } else {
        // For new risk levels, save immediately to backend
        try {
            saving.value = true
            
            // Set default order if not provided
            if (riskLevel.order === undefined || riskLevel.order === null) {
                riskLevel.order = riskLevels.value.length + 1
            }
            
            // Save the new risk level immediately
            const response = await bulkUpsertNonConformityRiskLevels([riskLevel], authStore)
            
            if (response && response.length > 0) {
                const savedRiskLevel = response[0]
                riskLevels.value = [...riskLevels.value, savedRiskLevel]
                
                // Update original order tracking after successful save
                updateOrderTracking()
                
                toast.showToast(t('common.success'), t('nc.riskLevel.createSuccess'), 'success')
                return true
            }
            
            emit('update:nonConformityRiskLevels', riskLevels.value)
        } catch (error: any) {
            console.error('Error creating risk level:', error)
            toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.riskLevel.createError'), 'error')
            return false
        } finally {
            saving.value = false
        }
    }
}

const removeRiskLevel = async (item: any) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('nc.riskLevel.deleteConfirm'),
        onConfirm: async () => {
            if (item.id) {
                try {
                    await apiDelete(`/non-conformities/risk-levels/${item.id}`, authStore)
                    fetchRiskLevels()
                    toast.showToast(t('common.success'), t('nc.riskLevel.removeSuccess'), 'success')
                } catch (error: any) {
                    console.error('Error removing risk level:', error)
                    toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.riskLevel.removeError'), 'error')
                }
            } else {
                const riskLevelToRemove = riskLevels.value[item]

                if (!riskLevelToRemove.id) {
                    riskLevels.value.splice(item, 1)

                    riskLevels.value.forEach((item, idx) => {
                        item.order = idx + 1
                    })

                    // Update order tracking after removal
                    updateOrderTracking()
                    saveChangeLoading.value = hasOrderChanged()

                    toast.showToast(t('common.success'), t('nc.riskLevel.removeSuccess'), 'success')
                }
            }
            dialogStore.closeDialog()
        },
        onCancel: dialogStore.closeDialog
    })
}

const saveAllChanges = async () => {
    if (riskLevels.value.length === 0) {
        toast.showToast(t('common.info'), t('nc.riskLevel.noRiskLevels'), 'info')
        return
    }

    try {
        saving.value = true
        const response = await bulkUpsertNonConformityRiskLevels(riskLevels.value, authStore)

        riskLevels.value = response

        // Update original order tracking after successful save
        updateOrderTracking()

        toast.showToast(t('common.success'), t('nc.riskLevel.saveSuccess'), 'success')

        emit('update:nonConformityRiskLevels', riskLevels.value)

        saveChangeLoading.value = false
    } catch (error: any) {
        console.error('Error saving risk levels:', error)
        toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.riskLevel.saveError'), 'error')
    } finally {
        saving.value = false
    }
}

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
    searchTimeout.value = setTimeout(() => {
        fetchRiskLevels()
    }, 300)
}

const fetchRiskLevels = async () => {
    try {
        loading.value = true
        const searchParam = searchQuery.value ? `&name=${searchQuery.value}` : ''
        const response = await apiGet<NonConformityRiskLevelResponseDTO[]>(
            `/non-conformities/risk-levels?${searchParam}`,
            authStore
        )
        riskLevels.value = response || []
        
        // Update original order tracking after fetching
        updateOrderTracking()
        
        // Check if order has changed and update save button visibility
        saveChangeLoading.value = hasOrderChanged()
    } catch (error) {
        console.error('Error refreshing risk levels:', error)
        toast.showToast(t('common.error'), t('nc.riskLevel.fetchError'), 'error')
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    try {
        saveChangeLoading.value = false
        fetchRiskLevels()
    } catch (error) {
        console.error('Error loading risk levels:', error)
        toast.showToast(t('common.error'), t('nc.riskLevel.loadError'), 'error')
    }
})
</script>
