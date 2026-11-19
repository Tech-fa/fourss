<template>
    <div v-if="!loading">
        <div class="space-y-6">
            <!-- Root Cause Analysis -->
            <div class="bg-white border border-neutral-200 rounded-lg p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg text-neutral-900">{{ $t('nc.rca.title') }}</h3>
                    <AppButton
                        v-if="!rootCauseAnalysis && canMutateNonConformity(props.nonConformity)"
                        buttonStyle="primary"
                        test-id="conduct-rca-button"
                        :href="`/act/non-conformities/${props.nonConformityId}/root-cause-analysis`"
                    >
                        {{ $t('nc.rca.conductButton') }}
                    </AppButton>
                </div>

                <!-- RCA Display -->
                <div v-if="rootCauseAnalysis" class="space-y-4" test-id="rca-display-section">
                    <div class="p-4 border border-neutral-200 rounded-lg" test-id="rca-card">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center space-x-3">
                                <span
                                    class="inline-flex px-2 py-1 bg-neutral-100 text-neutral-800 rounded-full text-xs"
                                    test-id="rca-method-badge"
                                >
                                    {{ getMethodText(rootCauseAnalysis.method) }}
                                </span>
                                <span
                                    class="text-sm text-neutral-900"
                                    v-if="rootCauseAnalysis.performed_by && rootCauseAnalysis.performed_by.length > 0"
                                    test-id="rca-performed-by-text"
                                >
                                    {{ $t('nc.rca.by') }} {{ rootCauseAnalysis.performed_by.map((u: any) => `${u.fname} ${u.lname}`).join(', ') }}
                                </span>
                            </div>
                            <div class="flex space-x-2" test-id="rca-actions">
                                <Can
                                    subject="root_cause_analyses"
                                    :actions="['update']"
                                    v-if="canMutateNonConformity(props.nonConformity)"
                                >
                                    <AppButton
                                        buttonStyle="secondary"
                                        @click="
                                            router.push(
                                                `/act/non-conformities/${props.nonConformityId}/root-cause-analysis`
                                            )
                                        "
                                        class="text-neutral-600 hover:text-neutral-900"
                                        test-id="rca-edit-button"
                                    >
                                        <i class="fa-solid fa-edit"></i>
                                    </AppButton>
                                </Can>
                                <Can
                                    subject="root_cause_analyses"
                                    :actions="['delete']"
                                    v-if="canMutateNonConformity(props.nonConformity)"
                                >
                                    <AppButton
                                        buttonStyle="danger"
                                        @click="confirmDeleteRCA(rootCauseAnalysis.id)"
                                        class="text-red-600 hover:text-red-900"
                                        test-id="rca-delete-button"
                                    >
                                        <i class="fa-solid fa-trash"></i>
                                    </AppButton>
                                </Can>
                            </div>
                        </div>

                        <div v-if="rootCauseAnalysis.description" class="mb-2" test-id="rca-description-section">
                            <h4 class="text-sm font-medium text-neutral-900 mb-1">{{ $t('nc.rca.description') }}</h4>
                            <p class="text-sm text-neutral-700" test-id="rca-description-text">
                                {{ rootCauseAnalysis.description }}
                            </p>
                        </div>

                        <div class="text-xs text-neutral-600" test-id="rca-dates">
                            {{ $t('nc.rca.performed') }}
                            {{
                                rootCauseAnalysis.performed_at
                                    ? formatDateToDay(rootCauseAnalysis.performed_at)
                                    : $t('nc.rca.notSpecified')
                            }}
                            | {{ $t('nc.rca.created') }} {{ formatDate(rootCauseAnalysis.created_at) }}
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-else class="text-center py-8">
                    <i class="fa-solid fa-project-diagram text-4xl text-neutral-300 mb-4"></i>
                    <p class="text-neutral-600">{{ $t('nc.rca.emptyTitle') }}</p>
                    <p class="text-sm text-neutral-500">{{ $t('nc.rca.emptySubtitle') }}</p>
                </div>
            </div>
        </div>
        <div
            v-if="isRcaReadyForCorrectiveActions"
            class="bg-white border border-neutral-200 rounded-lg p-4 mt-6"
        >
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-lg mb-1" test-id="ca-section-title">{{ $t('nc.ca.title') }}</h2>
                    <p class="text-neutral-600 text-sm" test-id="ca-section-subtitle">{{ $t('nc.ca.subtitle') }}</p>
                </div>
            </div>
            <Can subject="non_conformity_corrective_actions" :actions="['read']" showIfNoPermission>
                <CorrectiveActions
                    :correctiveActions="nonConformity?.correctiveActions"
                    :nonConformity="props.nonConformity"
                    :rcaId="rootCauseAnalysis?.id"
                />
            </Can>
        </div>
    </div>
    <div v-else class="flex items-center justify-center py-12">
        <Spinner />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import { useDialog } from '@/stores/dialog'
import Can from '../Can.vue'
import {
    getAllRootCauseAnalyses,
    deleteRootCauseAnalysis as deleteRootCauseAnalysisAPI
} from './endpoints'
import { formatDate, formatDateToDay, formatApiErrorMessage, canMutateNonConformity } from '@/util/util'
import AppButton from '../AppButton.vue'
import RcaModal from './rca-modal.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import {
    type NonConformityResponseDTO,
    type RootCauseAnalysisResponseDTO
} from '@/util/interfaces'
import { useRouter } from 'vue-router'
import CorrectiveActions from './corrective-actions.vue'
import Spinner from '../Spinner.vue'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'

const props = defineProps<{
    nonConformityId: string
    nonConformity: NonConformityResponseDTO
}>()

const authStore = useAuthStore()
const toast = useToast()
const dialog = useDialog()
const router = useRouter()
const { t } = useI18n()

// State
const rootCauseAnalysis = ref<RootCauseAnalysisResponseDTO | null>(null)
const loading = ref(true)

// Methods
const fetchRootCauseAnalysis = async () => {
    try {
        loading.value = true
        const response = (await getAllRootCauseAnalyses(props.nonConformityId, authStore)) as any
        const rcas = response.data || response || []
        // Since we only allow one RCA per NC, take the first one
        rootCauseAnalysis.value = rcas.length > 0 ? rcas[0] : null
    } catch (error: any) {
        console.error('Error fetching root cause analysis:', error)
        rootCauseAnalysis.value = null
    } finally {
        loading.value = false
    }
}

const openCreateModal = () => {
    dialog.openDialog(RcaModal, {
        isEditMode: false,
        nonConformityId: props.nonConformityId,
        onClose: () => {
            dialog.closeDialog()
        },
        onSuccess: () => {
            dialog.closeDialog()
            fetchRootCauseAnalysis()
        }
    })
}

const openEditModal = (rca: RootCauseAnalysisResponseDTO) => {
    dialog.openDialog(RcaModal, {
        isEditMode: true,
        initialData: rca,
        nonConformityId: props.nonConformityId,
        onClose: () => {
            dialog.closeDialog()
        },
        onSuccess: () => {
            dialog.closeDialog()
            fetchRootCauseAnalysis()
        }
    })
}

const confirmDeleteRCA = (id: string) => {
    dialog.openDialog(ConfirmDialog, {
        message: t('nc.rca.deleteConfirm'),
        onConfirm: async () => {
            await deleteRCA(id)
            dialog.closeDialog()
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}

const deleteRCA = async (id: string) => {
    try {
        await deleteRootCauseAnalysisAPI(id, authStore)
        toast.showToast(t('common.success'), t('nc.rca.deleteSuccess'), 'success')
        await fetchRootCauseAnalysis()
    } catch (error: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.rca.deleteError'), 'error')
    }
}

const getMethodText = (method: string) => {
    switch (method) {
        case 'FiveWhys':
            return t('nc.rca.methodFiveWhys')
        case 'Fishbone':
            return t('nc.rca.methodFishbone')
        case 'CauseEffect':
            return t('nc.rca.methodCauseEffect')
        default:
            return method
    }
}

const isRcaReadyForCorrectiveActions = computed(() => {
    const rca = rootCauseAnalysis.value
    if (!rca) return false

    const hasFiveWhys = Array.isArray(rca.fiveWhySteps) && rca.fiveWhySteps.length > 0
    const hasFishbone = !!rca.rcaFishbone?.id
    const hasValidCauseEffect = Array.isArray(rca.rcaCeCategories)
        && rca.rcaCeCategories.length > 0
        && rca.rcaCeCategories.every((cat: any) => Array.isArray(cat.causes) && cat.causes.length > 0)

    return hasFiveWhys || hasFishbone || hasValidCauseEffect
})

// Watch for changes in nonConformityId
watch(
    () => props.nonConformityId,
    (newId) => {
        if (newId) {
            fetchRootCauseAnalysis()
        }
    }
)

onMounted(() => {
    fetchRootCauseAnalysis()
})
</script>
