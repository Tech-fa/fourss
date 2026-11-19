<template>
    <div test-id="rca-cause-effect-component">
        <div v-if="isLoading" class="flex justify-center items-center py-10" test-id="rca-cause-effect-loading">
            <Spinner width="5" />
        </div>
        <div v-else test-id="rca-cause-effect-content">
            <div id="cause-categories" class="grid grid-cols-3 gap-6" test-id="rca-cause-categories-grid">
                <div
                    v-for="(category, catIdx) in rcaCeCategoriesSorted"
                    :key="category.name"
                    class="category-column border border-neutral-300 rounded-lg bg-neutral-50 p-4"
                    :test-id="`rca-cause-category-${catIdx}`"
                >
                    <div class="flex items-center justify-between mb-4">
                        <h4 class="text-base text-neutral-800" :test-id="`rca-cause-category-name-${catIdx}`">{{ category.name }}</h4>
                        <div class="flex items-center gap-2">
                            <AppButton
                                buttonStyle="neutral"
                                size="sm"
                                :test-id="`rca-cause-category-edit-button-${catIdx}`"
                                @click="openRcaCauseEffectModal('Effect', catIdx)"
                            >
                                <i class="fa-solid fa-pencil"></i>
                            </AppButton>
                            <AppButton
                                :warn-before="t('nc.causeEffect.warnDeleteEffect')"
                                buttonStyle="neutral"
                                size="sm"
                                :test-id="`rca-cause-category-delete-button-${catIdx}`"
                                @click="deleteCategory(category)"
                            >
                                <i class="fa-solid fa-times"></i>
                            </AppButton>
                        </div>
                    </div>

                    <div class="space-y-2 mb-4" :test-id="`rca-cause-category-causes-${catIdx}`">
                        <div
                            v-for="(cause, causeIdx) in category.causes"
                            :key="cause.id || cause.text"
                            class="cause-item p-3 bg-white border border-neutral-200 rounded-md group"
                            :test-id="`rca-cause-item-${catIdx}-${causeIdx}`"
                        >
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-neutral-700" :test-id="`rca-cause-text-${catIdx}-${causeIdx}`">{{ cause.text }}</span>
                                <div class="flex gap-1">
                                    <AppButton
                                        :warn-before="t('nc.causeEffect.warnDeleteCause')"
                                        buttonStyle="neutral"
                                        size="sm"
                                        :test-id="`rca-cause-delete-button-${catIdx}-${causeIdx}`"
                                        @click="deleteCause(category, cause)"
                                    >
                                        <i class="fa-solid fa-trash"></i>
                                    </AppButton>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="add-cause" :test-id="`rca-cause-category-add-cause-${catIdx}`">
                        <AppButton
                            buttonStyle="secondary"
                            @click="openRcaCauseEffectModal('Cause', catIdx)"
                            size="sm"
                            :test-id="`rca-add-cause-button-${catIdx}`"
                        >
                            <i class="fa-solid fa-plus mr-2"></i>{{ t('nc.causeEffect.addCause') }}
                        </AppButton>
                    </div>
                </div>
            </div>
            <div
                :class="
                    rcaCeCategories?.length > 0 ? 'flex justify-between mt-4' : 'flex justify-start'
                "
                test-id="rca-cause-effect-actions"
            >
                <Can subject="root_cause_analyses" :actions="['update']">
                    <AppButton
                        @click="openRcaCauseEffectModal('Effect')"
                        buttonStyle="secondary"
                        size="sm"
                        test-id="rca-add-cause-effect-button"
                    >
                        {{ t('nc.causeEffect.addCauseEffect') }}
                    </AppButton>
                </Can>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import type { RCACeCategory, RCACeCause } from '@/util/interfaces'
import { useDialog } from '@/stores/dialog'
import ModalForm from './cause-effect-modal.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getRcaCeCategories, bulkSaveRcaCeCategories, deleteRcaCeCategory, NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'
import Spinner from '../Spinner.vue'
import Can from '../Can.vue'
import { formatApiErrorMessage } from '@/util/util'

const dialogStore = useDialog()
const isLoading = ref(false)
const formLoading = ref(false)
const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()
const rcaCeCategories = ref<RCACeCategory[]>([])

const route = useRoute()
const rcaId = route.params.id

const props = defineProps<{
    rcaCeCategoriesEntities?: any[]
    onSave?: Function
}>()

const rcaCeCategoriesSorted = computed(() => {
    return [...rcaCeCategories.value] // No displayOrder sorting
})

const isValidForStep3 = () => {
    return (
        rcaCeCategories.value.length > 0 &&
        rcaCeCategories.value.every((cat) => Array.isArray(cat.causes) && cat.causes.length > 0)
    )
}

const openRcaCauseEffectModal = (type: 'Effect' | 'Cause', categoryIdx?: number) => {
    dialogStore.openDialog(ModalForm, {
        loading: formLoading,
        formType: type,
        hideDisplayOrder: true,
        onClose: dialogStore.closeDialog,
        existingValue:
            type === 'Effect' && categoryIdx !== undefined
                ? rcaCeCategoriesSorted.value[categoryIdx]?.name
                : undefined,
        onSubmit: async (data: any) => {
            try {
                if (type === 'Effect') {
                    if (categoryIdx !== undefined) {
                        rcaCeCategories.value[categoryIdx].name = data.label
                    } else {
                    const newCategory: RCACeCategory = {
                        name: data.label,
                        causes: []
                        }
                        rcaCeCategories.value.push(newCategory)
                    }
                } else if (type === 'Cause' && typeof categoryIdx === 'number') {
                    const sorted = rcaCeCategoriesSorted.value
                    const sortedCategory = sorted[categoryIdx]
                    const originalIdx = rcaCeCategories.value.findIndex(
                        (cat) => cat === sortedCategory
                    )
                    if (originalIdx !== -1) {
                        rcaCeCategories.value[originalIdx].causes.push({
                            text: data.label
                        })
                    }
                }
                const saved = await sendRcaCeCategories()
                if (saved) {
                    props.onSave?.(isValidForStep3())
                    dialogStore.closeDialog()
                }
            } catch (error) {
                console.error('Error adding cause effect:', error)
            }
        }
    })
}

async function deleteCause(category: RCACeCategory, cause: RCACeCause) {
    const catIdx = rcaCeCategories.value.findIndex((cat: RCACeCategory) => cat === category)
    if (catIdx !== -1) {
        const causeIdx = rcaCeCategories.value[catIdx].causes.findIndex(
            (c: RCACeCause) => c.text === cause.text && c.id === cause.id
        )
        if (causeIdx !== -1) {
            rcaCeCategories.value[catIdx].causes.splice(causeIdx, 1)
        }
    }
    const saved = await sendRcaCeCategories(true)
    if (saved) {
        props.onSave?.(isValidForStep3())
    }
}

function deleteCategory(category: RCACeCategory) {
    if (category.id) {
        deleteRcaCeCategory(category.id, authStore)
            .then(() => {
                rcaCeCategories.value = rcaCeCategories.value.filter(
                    (cat: RCACeCategory) => cat.id !== category.id
                )
                props.onSave?.(isValidForStep3())
                toast.showToast(t('common.success'), t('nc.causeEffect.categoryDeleteSuccess'), 'success')
            })
            .catch(() => {
                toast.showToast(t('common.error'), t('nc.causeEffect.categoryDeleteError'), 'error')
            })
    } else {
        const idx = rcaCeCategories.value.findIndex((cat: RCACeCategory) => cat === category)
        if (idx !== -1) {
            rcaCeCategories.value.splice(idx, 1)
            props.onSave?.(isValidForStep3())
            toast.showToast(t('common.success'), t('nc.causeEffect.categoryDeleteSuccess'), 'success')
        }
    }
}

const sendRcaCeCategories = async (skipFetch?: boolean) => {
    const payload = {
        categories: rcaCeCategories.value.map((cat) => ({
            id: cat.id,
            name: cat.name,
            causes: (cat.causes || []).map((cause) => ({
                text: cause.text
            }))
        }))
    }
    try {
        formLoading.value = true
        await bulkSaveRcaCeCategories(rcaId as string, payload, authStore)
        if (!skipFetch) {
            await fetchRcaCeCategories()
        }
        props.onSave?.(isValidForStep3())
        toast.showToast(t('common.success'), t('nc.causeEffect.saveSuccess'), 'success')
        return true
    } catch (e: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(e?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.causeEffect.saveError'),
            'error'
        )
        return false
    } finally {
        formLoading.value = false
    }
}

const fetchRcaCeCategories = async () => {
    isLoading.value = true
    try {
        const response = await getRcaCeCategories(rcaId as string, authStore)
        if (Array.isArray(response)) {
            rcaCeCategories.value = response.map((cat: any) => ({
                id: cat.id,
                name: cat.name,
                causes: (cat.causes || []).map((cause: any) => ({
                    id: cause.id,
                    text: cause.text
                }))
            }))
        } else {
            rcaCeCategories.value = []
        }
        props.onSave?.(isValidForStep3())
    } catch (e: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(e?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.causeEffect.saveError'), 'error')
    } finally {
        isLoading.value = false
    }
}

onMounted(() => {
    if (props.rcaCeCategoriesEntities && props.rcaCeCategoriesEntities.length > 0) {
        rcaCeCategories.value = props.rcaCeCategoriesEntities
        isLoading.value = false
        props.onSave?.(isValidForStep3())
    }
})
</script>
