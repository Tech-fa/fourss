<template>
    <div class="space-y-6" v-if="!loading">
        <!-- Investigation Status -->
        <div class="bg-white border border-neutral-200 rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg text-neutral-900">{{ $t('nc.investigation.title') }}</h3>
                <AppButton
                    v-if="!showForm && !hasInvestigation && canMutateNonConformity(nonConformity)"
                    buttonStyle="primary"       
                    test-id="start-investigation-button"
                    @click="showForm = true"
                >
                    <i class="fa-solid fa-plus mr-2"></i>
                    {{ $t('nc.investigation.startButton') }}
                </AppButton>
            </div>

            <!-- Investigation Form (create only, with action buttons) -->
            <div
                v-if="showForm"
                class="mb-6 p-4 border border-neutral-200 rounded-lg bg-neutral-50"
            >
                <p class="text-sm text-neutral-600 mb-4">
                    {{ $t('nc.investigation.chooseAction') }}
                </p>
                <div class="flex flex-col gap-3">
                    <AppButton
                        buttonStyle="primary"
                        :disabled="loading"
                        test-id="investigation-start-rca-button"
                        :warn-before="t('nc.investigation.warnStartRca')"
                        @click="() => handleCreateWithAction('openRCA')"
                    >
                        <i class="fa-solid fa-project-diagram mr-2"></i>
                        {{ $t('nc.investigation.startRca') }}
                    </AppButton>

                    <AppButton
                        buttonStyle="secondary"
                        :disabled="loading"
                        test-id="investigation-close-nc-button"
                        :warn-before="t('nc.investigation.warnCloseNcBasedOnInvestigation')"
                        @click="() => handleCreateWithAction('close')"
                    >
                        <i class="fa-solid fa-check mr-2"></i>
                        {{ $t('nc.investigation.closeNc') }}
                    </AppButton>
                    <AppButton 
                        type="button" 
                        buttonStyle="secondary" 
                        test-id="investigation-cancel-button"
                        @click="resetForm"
                    >
                        {{ $t('nc.investigation.cancel') }}
                    </AppButton>
                </div>
            </div>

            <!-- Investigation List (read-only) -->
            <div v-if="investigations.length > 0" class="space-y-3">
                <div
                    v-for="investigation in investigations"
                    :key="investigation.id"
                    class="p-4 border border-neutral-200 rounded-lg"
                    :test-id="`investigation-result-${investigation.id}`"
                >
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-3">
                            <span class="text-sm text-neutral-900" :test-id="`investigation-result-text-${investigation.id}`">
                                <b> {{ $t('nc.investigation.resultedIn') }} </b>
                                {{ getActionText(investigation.action) }}
                            </span>
                            <span
                                v-if="investigation.action === 'close' && canMutateNonConformity(nonConformity)"
                                class="inline-flex px-2 py-1 bg-neutral-100 text-neutral-800 rounded-full text-xs"
                                :test-id="`investigation-evidence-warning-${investigation.id}`"
                            >
                                {{ $t('nc.investigation.uploadEvidenceWarning') }}
                            </span>
                        </div>
                    </div>
                    <div class="text-xs text-neutral-600" :test-id="`investigation-created-date-${investigation.id}`">
                        {{ $t('nc.investigation.created') }} {{ formatDate(investigation.created_at) }}
                    </div>
                    <div v-if="investigation.root_ca" class="mt-2 text-sm text-neutral-700">
                        Root Cause: {{ investigation.root_ca.problem_statement }}
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="!showForm" class="text-center py-8">
                <i class="fa-solid fa-search text-4xl text-neutral-300 mb-4"></i>
                <p class="text-neutral-600">{{ $t('nc.investigation.emptyTitle') }}</p>
                <p class="text-sm text-neutral-500">{{ $t('nc.investigation.emptySubtitle') }}</p>
            </div>
        </div>
    </div>
    <div v-else class="flex items-center justify-center py-12">
        <Spinner width="5" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import { getAllInvestigations, createInvestigation, NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'
import { formatDate, formatApiErrorMessage, canMutateNonConformity } from '@/util/util'
import AppButton from '../AppButton.vue'
import { type InvestigationResponseDTO, type CreateInvestigationDto, type NonConformityResponseDTO } from '@/util/interfaces'
import Spinner from '../Spinner.vue'

const props = defineProps<{
    nonConformityId: string
    nonConformity: NonConformityResponseDTO
}>()

const emit = defineEmits<{
    (e: 'investigation-updated'): void
}>()

const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()

// State
const investigations = ref<InvestigationResponseDTO[]>([])
const loading = ref(true)
const showForm = ref(false)

// Computed properties
const hasInvestigation = computed(() => investigations.value.length > 0)

// Methods
const fetchInvestigations = async () => {
    try {
        loading.value = true
        const response = (await getAllInvestigations(props.nonConformityId, authStore)) as any
        investigations.value = response.data || response || []
    } catch (error: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.investigation.fetchError'), 'error')
    } finally {
        loading.value = false
    }
}

const handleCreateWithAction = async (action: string) => {
    try {
        loading.value = true
        const createData: CreateInvestigationDto = {
            nc_id: props.nonConformityId,
            action: action
        }
        await createInvestigation(createData, authStore)
        toast.showToast(t('common.success'), t('nc.investigation.createSuccess'), 'success')
        resetForm()
        await fetchInvestigations()
        emit('investigation-updated')
    } catch (error: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.investigation.saveError'), 'error')
    } finally {
        loading.value = false
    }
}

const resetForm = () => {
    showForm.value = false
}

const getActionText = (action: string) => {
    switch (action) {
        case 'none':
            return t('nc.investigation.actionNone')
        case 'close':
            return t('nc.investigation.actionClose')
        case 'openCA':
            return t('nc.investigation.actionOpenCA')
        case 'openRCA':
            return t('nc.investigation.actionOpenRCA')
        default:
            return action
    }
}

// Watch for changes in nonConformityId
watch(
    () => props.nonConformityId,
    (newId) => {
        if (newId) {
            fetchInvestigations()
        }
    }
)

onMounted(() => {
    fetchInvestigations()
})
</script>
