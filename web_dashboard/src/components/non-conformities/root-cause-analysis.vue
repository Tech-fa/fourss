<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs"> </BreadCrums>
        <!-- Main RCA Area -->
        <main id="main-content" class="flex-1 p-6">
            <!-- Loading State -->
            <div v-if="loading && !selectedNC" class="flex items-center justify-center py-12">
                <div class="text-center">
                    <i class="fa-solid fa-spinner fa-spin text-3xl text-neutral-400 mb-4"></i>
                    <p class="text-neutral-600">{{ $t('nc.rca.loading') }}</p>
                </div>
            </div>

            <div v-else>
                <!-- RCA Header -->
                <div id="rca-header" class="mb-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-3xl text-neutral-900">{{ $t('nc.rca.pageTitle') }}</h2>
                            <p class="text-neutral-600 mt-1">{{ $t('nc.rca.pageSubtitle') }}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="!loadingRCA">
                <!-- Step Progress Indicator -->
                <div class="mb-8" test-id="rca-progress-indicator">
                    <div class="flex items-center justify-center">
                        <div class="flex items-center space-x-4">
                            <!-- Step 1 -->
                            <div class="flex items-center" test-id="rca-step-1">
                                <div
                                    :class="[
                                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer',
                                        currentStep >= 1
                                            ? 'bg-neutral-900 text-white'
                                            : 'bg-neutral-200 text-neutral-600'
                                    ]"
                                    @click="currentStep = 1"
                                    test-id="rca-step-1-circle"
                                >
                                    1
                                </div>
                                <span
                                    :class="[
                                        'ml-2 text-sm font-medium',
                                        currentStep >= 1 ? 'text-neutral-900' : 'text-neutral-500'
                                    ]"
                                    test-id="rca-step-1-label"
                                >
                                    {{ $t('nc.rca.stepCreateRca') }}
                                </span>
                            </div>

                            <!-- Connector -->
                            <div
                                :class="[
                                    'w-16 h-0.5',
                                    currentStep >= 2 ? 'bg-neutral-900' : 'bg-neutral-200'
                                ]"
                                test-id="rca-progress-connector"
                            ></div>

                            <!-- Step 2 -->
                            <div class="flex items-center c" test-id="rca-step-2">
                                <div
                                    :class="[
                                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer',
                                        currentStep >= 2
                                            ? 'bg-neutral-900 text-white'
                                            : 'bg-neutral-200 text-neutral-600'
                                    ]"
                                    test-id="rca-step-2-circle"
                                >
                                    2
                                </div>
                                <span
                                    :class="[
                                        'ml-2 text-sm font-medium',
                                        currentStep >= 2 ? 'text-neutral-900' : 'text-neutral-500'
                                    ]"
                                    test-id="rca-step-2-label"
                                >
                                    {{ $t('nc.rca.stepFillAnalysis') }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 1: Create RCA / Method Selection -->
                <div v-if="currentStep === 1" class="space-y-6">
                    <!-- RCA Form (from modal) -->
                    <div class="bg-white border border-neutral-200 rounded-lg p-6">
                        <h3 class="text-lg text-neutral-900 mb-4">
                            {{ isEditMode ? $t('nc.rca.editTitle') : $t('nc.rca.createTitle') }}
                        </h3>
                        <Form @submit="proceedToStep2" class="space-y-6">
                            <div test-id="rca-method-field">
                                <label class="block text-sm text-neutral-700 mb-2"
                                    >{{ $t('nc.rca.method') }} <span class="text-red-700">*</span></label
                                >
                                <Select2
                                    v-model="formData.method"
                                    :values="Object.values(RCAMethod)"
                                    :display="(val: any) => val"
                                    :placeholder="$t('nc.rca.selectMethod')"
                                    :optional="false"
                                    test-id="rca-method-select"
                                />
                            </div>

                            <div test-id="rca-performed-by-field">
                                <label class="block text-sm text-neutral-700 mb-2">{{ $t('nc.rca.performedBy') }}</label>
                                <SearcheableMultiSelect
                                    v-model="formData.performed_by"
                                    :results="availableUsers"
                                    :display="(val: any) => `${val?.fname} ${val?.lname}`"
                                    :placeholder="$t('nc.rca.selectUsers')"
                                    test-id="rca-performed-by-select"
                                />
                            </div>

                            <div test-id="rca-performed-at-field">
                                <AppInputForm
                                    name="performed_at"
                                    :label="$t('nc.rca.performedAt')"
                                    :placeholder="$t('nc.rca.selectDate')"
                                    :value="
                                        formatDateToInput(
                                            formData.performed_at || new Date().getTime()
                                        )
                                    "
                                    :required="true"
                                    type="date"
                                    test-id="rca-performed-at-input"
                                />
                            </div>

                            <div test-id="rca-description-field">
                                <AppTextareaForm
                                    name="description"
                                    :label="$t('nc.rca.descriptionLabel')"
                                    :placeholder="$t('nc.rca.descriptionPlaceholder')"
                                    :value="formData.description"
                                    rows="4"
                                    testID="rca-description-textarea"
                                />
                            </div>
                            <div class="flex justify-end space-x-3">
                                <AppButton
                                    :disabled="!isStep1Valid || loading"
                                    :loading="loading"
                                    buttonStyle="primary"
                                    test-id="rca-proceed-to-analysis-button"
                                >
                                    {{ $t('nc.rca.proceedButton') }}
                                </AppButton>
                            </div>
                        </Form>
                    </div>

                    <!-- Step 1 Actions -->
                </div>

                <!-- Step 2: Fill Analysis Method -->
                <div v-if="currentStep === 2" class="space-y-6" test-id="rca-step-2-content">
                    <!-- Problem Statement -->
                    <div class="bg-white border border-neutral-200 rounded-lg p-6" test-id="rca-problem-statement-section">
                        <h3 class="text-lg text-neutral-900 mb-4" test-id="rca-problem-statement-title">{{ $t('nc.rca.problemStatement') }}</h3>
                        <div class="bg-neutral-50 border border-neutral-200 rounded-lg p-4" test-id="rca-problem-statement-content">
                            <p class="text-neutral-700 mb-4 font-bold text-xl" test-id="rca-problem-statement-text">
                                {{ selectedNC ? formatNcProblemStatement(selectedNC, $t) : '' }}
                            </p>
                            <div class="grid grid-cols-3 gap-4 text-xs" test-id="rca-problem-statement-details">
                                <div class="flex justify-start space-x-2" test-id="rca-problem-statement-risk-level">
                                    <span class="text-neutral-500">{{ $t('nc.rca.riskLevel') }}</span>
                                    <span class="text-neutral-900">{{
                                        selectedNC?.nonConformityRiskLevel?.name
                                    }}</span>
                                </div>
                                <div class="flex justify-start space-x-2" test-id="rca-problem-statement-category">
                                    <span class="text-neutral-500">{{ $t('nc.rca.category') }}</span>
                                    <span class="text-neutral-900">{{
                                        selectedNC?.category?.name
                                    }}</span>
                                </div>
                                <div class="flex justify-start space-x-2" test-id="rca-problem-statement-due-date">
                                    <span class="text-neutral-500">{{ $t('nc.rca.dueDate') }}</span>
                                    <span class="text-neutral-900">{{
                                        formatDateToDay(selectedNC?.dueDate || 0)
                                    }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Dynamic Method Implementation -->
                    <!-- Fishbone Method -->

                    <FishboneRca
                        v-if="selectedMethod == RCAMethod.FISHBONE"
                        :ncId="nonConformityId"
                        :onSave="enabelMoveToStep3"
                        :fishbone="existingRCA?.rcaFishbone"
                    />
                    <RcaFivewhySteps
                        v-if="selectedMethod == RCAMethod.FIVE_WHYS"
                        :rcaId="existingRCA?.id || ''"
                        :onSave="enabelMoveToStep3"
                        :steps="existingRCA?.fiveWhySteps || []"
                    />

                    <!-- Cause & Effect Method -->
                    <RcaCauseEffect
                        v-if="selectedMethod == RCAMethod.CAUSE_EFFECT"
                        :rcaId="existingRCA?.id || ''"
                        :onSave="enabelMoveToStep3"
                        :rcaCeCategoriesEntities="existingRCA?.rcaCeCategories || []"
                    />

                    <!-- Identified Root Causes -->
                    <!-- <div class="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg text-neutral-900">Identified Root Causes</h3>
                        <button
                            @click="addRootCause"
                            class="px-3 py-1 text-xs border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50"
                        >
                            <i class="fa-solid fa-plus mr-1"></i>Add Root Cause
                        </button>
                    </div>
                    <div class="space-y-3">
                        <div
                            v-for="(rootCause, index) in identifiedRootCauses"
                            :key="index"
                            class="bg-white border border-neutral-200 rounded p-4"
                        >
                            <div class="space-y-3">
                                <textarea
                                    v-model="rootCause.description"
                                    class="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                                    rows="2"
                                    placeholder="Describe the root cause..."
                                ></textarea>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <select
                                        v-model="rootCause.category"
                                        class="px-3 py-2 border border-neutral-300 rounded-md text-sm"
                                    >
                                        <option value="">Select Category</option>
                                        <option value="People">People</option>
                                        <option value="Process">Process</option>
                                        <option value="Equipment">Equipment</option>
                                        <option value="Materials">Materials</option>
                                        <option value="Environment">Environment</option>
                                        <option value="Methods">Methods</option>
                                    </select>
                                    <select
                                        v-model="rootCause.confidence"
                                        class="px-3 py-2 border border-neutral-300 rounded-md text-sm"
                                    >
                                        <option value="">Confidence Level</option>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                    <button
                                        @click="removeRootCause(index)"
                                        class="px-3 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                                    >
                                        <i class="fa-solid fa-trash mr-1"></i>Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div> -->

                    <!-- Step 2 Actions -->
                    <div class="flex justify-between" test-id="rca-step-2-actions">
                        <button
                            @click="currentStep = 1"
                            class="px-6 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                            test-id="rca-back-button"
                        >
                            <i class="fa-solid fa-arrow-left mr-2"></i>
                            {{ $t('nc.rca.back') }}
                        </button>
                        <button
                            @click="router.push(`/act/non-conformities/${nonConformityId}?tab=3`)"
                            :disabled="!canMoveToStep3"
                            :class="[
                                'px-6 py-2 rounded-md text-sm font-medium',
                                canMoveToStep3
                                    ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                                    : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                            ]"
                            test-id="rca-start-corrective-actions-button"
                        >
                            {{ $t('nc.rca.startCaButton') }}
                        </button>
                    </div>
                </div>

                <!-- Step 3: Actions -->
                <div v-if="currentStep === 3" class="space-y-6">
                    <!-- Analysis Summary -->
                    <div class="bg-white border border-neutral-200 rounded-lg p-6">
                        <h3 class="text-lg text-neutral-900 mb-4">Analysis Summary</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div class="bg-neutral-50 p-4 rounded-lg">
                                <div class="text-sm text-neutral-600">Non-Conformity</div>

                                <div class="text-sm text-neutral-700">
                                    {{ selectedNC ? formatNcProblemStatement(selectedNC, $t) : '' }}
                                </div>
                            </div>
                            <div class="bg-neutral-50 p-4 rounded-lg">
                                <div class="text-sm text-neutral-600">RCA Method</div>
                                <div class="text-lg font-medium text-neutral-900">
                                    {{ getMethodName(selectedMethod as RCAMethod) }}
                                </div>
                            </div>
                        </div>

                        <!-- Root Causes Summary -->
                    </div>

                    <!-- Action Decision -->
                    <div class="bg-white border border-neutral-200 rounded-lg p-6">
                        <h3 class="text-lg text-neutral-900 mb-4">Choose Action</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div
                                @click="selectedAction = 'corrective-action'"
                                :class="[
                                    'border rounded-lg p-6 cursor-pointer transition-colors',
                                    selectedAction === 'corrective-action'
                                        ? 'border-neutral-900 bg-neutral-50'
                                        : 'border-neutral-200 hover:border-neutral-300'
                                ]"
                            >
                                <div class="flex items-center mb-4">
                                    <div class="p-3 bg-neutral-100 rounded-full">
                                        <i class="fa-solid fa-tools text-neutral-600"></i>
                                    </div>
                                    <div class="ml-4 flex-1">
                                        <h4 class="text-lg text-neutral-900">
                                            Create Corrective Action
                                        </h4>
                                        <p class="text-sm text-neutral-600">
                                            Address the root causes
                                        </p>
                                    </div>
                                    <div v-if="selectedAction === 'corrective-action'" class="ml-2">
                                        <i class="fa-solid fa-check-circle text-neutral-900"></i>
                                    </div>
                                </div>
                                <p class="text-sm text-neutral-700">
                                    Create corrective actions to address the identified root causes
                                    and prevent recurrence.
                                </p>
                            </div>

                            <div
                                @click="selectedAction = 'close-nc'"
                                :class="[
                                    'border rounded-lg p-6 cursor-pointer transition-colors',
                                    selectedAction === 'close-nc'
                                        ? 'border-neutral-900 bg-neutral-50'
                                        : 'border-neutral-200 hover:border-neutral-300'
                                ]"
                            >
                                <div class="flex items-center mb-4">
                                    <div class="p-3 bg-neutral-100 rounded-full">
                                        <i class="fa-solid fa-check text-neutral-600"></i>
                                    </div>
                                    <div class="ml-4 flex-1">
                                        <h4 class="text-lg text-neutral-900">
                                            Close Non-Conformity
                                        </h4>
                                        <p class="text-sm text-neutral-600">Mark as resolved</p>
                                    </div>
                                    <div v-if="selectedAction === 'close-nc'" class="ml-2">
                                        <i class="fa-solid fa-check-circle text-neutral-900"></i>
                                    </div>
                                </div>
                                <p class="text-sm text-neutral-700">
                                    Close the non-conformity if no further action is required or if
                                    it's resolved.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Action Details -->
                    <div
                        v-if="selectedAction === 'corrective-action'"
                        class="bg-white border border-neutral-200 rounded-lg p-6"
                    >
                        <h3 class="text-lg text-neutral-900 mb-4">Corrective Action Details</h3>
                        <!-- <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-neutral-900 mb-2"
                                >Action Description</label
                            >
                            <textarea
                                v-model="correctiveAction?.description"
                                class="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                                rows="3"
                                placeholder="Describe the corrective action to be taken..."
                            ></textarea>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-neutral-900 mb-2"
                                    >Responsible Person</label
                                >
                                <input
                                    v-model="correctiveAction?.responsible"
                                    type="text"
                                    class="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                                    placeholder="Enter responsible person..."
                                />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-neutral-900 mb-2"
                                    >Due Date</label
                                >
                                <input
                                    v-model="correctiveAction.dueDate"
                                    type="date"
                                    class="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-neutral-900 mb-2"
                                >Priority</label
                            >
                            <select
                                v-model="correctiveAction.priority"
                                class="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                            >
                                <option value="">Select Priority</option>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>
                    </div> -->
                    </div>

                    <div
                        v-if="selectedAction === 'close-nc'"
                        class="bg-white border border-neutral-200 rounded-lg p-6"
                    >
                        <h3 class="text-lg text-neutral-900 mb-4">Closure Details</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-neutral-900 mb-2"
                                    >Closure Reason</label
                                >
                                <textarea
                                    v-model="closureDetails.reason"
                                    class="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                                    rows="3"
                                    placeholder="Explain why this non-conformity is being closed..."
                                ></textarea>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-neutral-900 mb-2"
                                    >Closure Type</label
                                >
                                <select
                                    v-model="closureDetails.type"
                                    class="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                                >
                                    <option value="">Select Closure Type</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="No Action Required">No Action Required</option>
                                    <option value="Duplicate">Duplicate</option>
                                    <option value="Invalid">Invalid</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
            <div v-else class="flex items-center justify-center py-12 h-[200px]">
                <Spinner />
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Form } from 'vee-validate'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPost, apiPut } from '@/util/api'
import BreadCrums from '../breadCrums.vue'
import AppTextareaForm from '../AppTextareaForm.vue'
import AppButton from '../AppButton.vue'
import Select2 from '../Select2.vue'
import type {
    CorrectiveAction,
    CreateRootCauseAnalysisDto,
    NonConformity,
    RootCauseAnalysisResponseDTO,
    User
} from '@/util/interfaces'
import { RCAMethod, RCAMethodI18nKey } from '@/util/interfaces'
import { formatDateToDay, formatDateToInput, formatApiErrorMessage, formatNcProblemStatement, isNonConformityOverdue } from '@/util/util'
import AppInputForm from '../AppInputForm.vue'
import RcaFivewhySteps from './rca-fivewhy-steps.vue'
import RcaCauseEffect from './rca-cause-effect.vue'
import FishboneRca from './fishbone-rca.vue'
import Spinner from '../Spinner.vue'
import SearcheableMultiSelect from '../SearcheableMultiSelect.vue'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()

// Get non-conformity ID from route params
const nonConformityId = ref<string>(route.params.id as string)
const isEditMode = ref<boolean>(false)
const existingRCA = ref<RootCauseAnalysisResponseDTO>()
const loading = ref<boolean>(false)
const loadingRCA = ref<boolean>(true)
const canMoveToStep3 = ref<boolean>(false)
const router = useRouter()

const enabelMoveToStep3 = (bool?: boolean) => {
    canMoveToStep3.value = bool ?? true
}

const crumbs = computed(() => [
    {
        name: t('nc.breadcrumbs.nonConformities'),
        path: '/act/non-conformities',
        icon: 'fa-solid fa-exclamation-triangle'
    },
    {
        name: t('nc.breadcrumbs.viewNonConformities'),
        path: `/act/non-conformities/${nonConformityId.value}?tab=3`,
        icon: 'fa-solid fa-eye'
    },
    {
        name: isEditMode.value ? t('nc.breadcrumbs.editRca') : t('nc.breadcrumbs.createRca'),
        path: `/act/non-conformities/${nonConformityId.value}/root-cause-analysis`,
        icon: 'fa-solid fa-plus'
    }
])

// State variables
const currentStep = ref<number>(1)
const selectedNC = ref<NonConformity>()
const selectedMethod = ref<string>('')
const selectedAction = ref<string>('')
const users = ref<User[]>([])

const formData = ref<{
    method: RCAMethod | null
    performed_by: User[]
    performed_at: number | null
    description: string
}>({
    method: null,
    performed_by: [],
    performed_at: null,
    description: ''
})

const fishboneCategories = ref<any[]>([
    { name: 'People', causes: [] },
    { name: 'Process', causes: [] },
    { name: 'Equipment', causes: [] },
    { name: 'Materials', causes: [] },
    { name: 'Environment', causes: [] },
    { name: 'Methods', causes: [] }
])

const correctiveAction = ref<CorrectiveAction>()
const closureDetails = ref<any>({ reason: '', type: '' })

const isClosureValid = computed(() => {
    return closureDetails.value.reason && closureDetails.value.type
})

const isStep1Valid = computed(() => {
    return formData.value.method && formData.value.performed_by.length > 0
})

const availableUsers = computed(() => {
    const selectedIds = formData.value.performed_by.map((u: User) => u.id)
    return users.value.filter((u: User) => !selectedIds.includes(u.id))
})

// Methods
// Fetch non-conformity data
const fetchNonConformity = async () => {
    try {
        loading.value = true
        const response = (await apiGet(
            `/non-conformities/${nonConformityId.value}`,
            authStore
        )) as NonConformity
        selectedNC.value = response
        if (isNonConformityOverdue(response)) {
            toast.showToast(t('common.error'), t('nc.detail.overdueLocked'), 'error')
            router.push(`/act/non-conformities/${nonConformityId.value}?tab=3`)
            return
        }
    } catch (error: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.rca.fetchError'), 'error')
    } finally {
        loading.value = false
    }
}

// Check for existing RCA
const checkExistingRCA = async () => {
    try {
        const response = (await apiGet(
            `non-conformities/${nonConformityId.value}/root-cause-analysis`,
            authStore
        )) as RootCauseAnalysisResponseDTO[]
        if (response && response.length > 0) {
            existingRCA.value = response[0]
            selectedMethod.value = response[0].method
            if (
                (response[0].fiveWhySteps && response[0].fiveWhySteps.length > 0) ||
                (response[0].rcaCeCategories && response[0].rcaCeCategories.length > 0) ||
                (response[0].rcaFishbone && response[0].rcaFishbone.id)
            ) {
                canMoveToStep3.value = true
            }
            if (response[0]) {
                currentStep.value = 2
            }
            isEditMode.value = true
            initializeFormDataFromRCA()
        }
    } catch (error: any) {
        // No existing RCA found, that's fine for create mode
        console.log('No existing RCA found, continuing in create mode')
    } finally {
        loadingRCA.value = false
    }
}

// Initialize form data from existing RCA
const initializeFormDataFromRCA = () => {
    if (existingRCA.value) {
        const method = existingRCA.value.method
        formData.value = {
            method: method,
            performed_by: existingRCA.value.performed_by || [],
            performed_at: existingRCA.value.performed_at,
            description: existingRCA.value.description || ''
        }

        // Set the selected method for step 2
        selectedMethod.value = existingRCA.value.method
    }
}

// Fetch users with RCA permissions
const fetchUsers = async () => {
    try {
        if (!selectedNC.value) {
            await fetchNonConformity()
        }

        const teamId = Number(selectedNC.value?.team?.id)
        if (Number.isFinite(teamId) && teamId > 0) {
            const response = (await apiPost(
                '/permissions/teams/access',
                {
                    teamIds: [teamId],
                    subject: 'root_cause_analyses',
                    allTeamIds: false
                },
                authStore
            )) as any
            users.value = response || []
        }
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.rca.modalUsersFetchError'),
            'error'
        )
    }
}

// Update performed_at when datetime-local changes
const updatePerformedAt = (value: string) => {
    formData.value.performed_at = value ? new Date(value).getTime() : null
}

// Create or update RCA
const saveRCAStep1 = async (values: any) => {
    try {
        loading.value = true

        if (!formData.value.method) {
            toast.showToast(t('common.error'), t('nc.rca.selectMethodError'), 'error')
            return
        }

        const submitData: Partial<CreateRootCauseAnalysisDto> = {
            nc_id: nonConformityId.value,
            method: formData.value.method,
            description: values.description || '',
            performed_at: new Date(values.performed_at).getTime()
        }

        if (formData.value.performed_by && formData.value.performed_by.length > 0) {
            submitData.performed_by_ids = formData.value.performed_by.map((user) => user.id)
        } else {
            toast.showToast(t('common.error'), t('nc.rca.selectPerformedByError'), 'error')
            return false
        }

        let response: RootCauseAnalysisResponseDTO

        if (isEditMode.value && existingRCA.value?.id) {
            // Update existing RCA
            response = (await apiPut(
                `/non-conformities/root-cause-analysis/${existingRCA.value.id}`,
                submitData,
                authStore
            )) as RootCauseAnalysisResponseDTO
            toast.showToast(t('common.success'), t('nc.rca.updateSuccess'), 'success')
            existingRCA.value = response
        } else {
            // Create new RCA
            response = (await apiPost(
                `non-conformities/root-cause-analysis`,
                submitData,
                authStore
            )) as RootCauseAnalysisResponseDTO
            existingRCA.value = response
            isEditMode.value = true
            toast.showToast(t('common.success'), t('nc.rca.createSuccess'), 'success')
        }
        await checkExistingRCA()
        return true
    } catch (error: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.rca.saveError'), 'error')
        return false
    } finally {
        loading.value = false
    }
}

const proceedToStep2 = async (values: any) => {
    if (isStep1Valid.value) {
        const success = await saveRCAStep1(values)
        if (success) {
            // Set selected method for step 2 based on form data
            if (formData.value.method) {
                selectedMethod.value = formData.value.method
            }
            currentStep.value = 2
        }
    }
}

const proceedToStep3 = () => {
    if (canMoveToStep3.value) {
        currentStep.value = 3
    }
}

const addCauseCategory = () => {
    fishboneCategories.value.push({ name: 'New Category', causes: [] })
}

const addCause = (categoryName: string) => {
    const category = fishboneCategories.value.find((c) => c.name === categoryName)
    if (category) {
        category.causes.push({ text: '' })
    }
}

const saveCause = (categoryName: string, index: number) => {
    const category = fishboneCategories.value.find((c) => c.name === categoryName)
    if (category && category.causes[index]) {
        category.causes[index].text = category.causes[index].text.trim()
        if (category.causes[index].text === '') {
            category.causes.splice(index, 1)
        }
    }
}

const removeCause = (categoryName: string, index: number) => {
    const category = fishboneCategories.value.find((c) => c.name === categoryName)
    if (category) {
        category.causes.splice(index, 1)
    }
}

const getMethodName = (method: RCAMethod) => {
    const key = RCAMethodI18nKey[method]
    return key ? t(key) : t('nc.rca.methodUnknown')
}

// Initialize data on mount
onMounted(async () => {
    await Promise.all([
        // Fetch non-conformity data
        fetchNonConformity(),

        // Check for existing RCA
        checkExistingRCA()

        // Fetch users
    ])
    await fetchUsers()
})
</script>
