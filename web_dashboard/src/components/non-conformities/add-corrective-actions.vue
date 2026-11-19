<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs"> </BreadCrums>
        <main id="main-content" class="flex-1 p-6">
            <Form
                class="p-6 bg-neutral-50"
                @submit="handleSubmit"
                :initial-values="formData"
                v-if="!loadingEntity"
                ref="formRef"
            >
                <!-- Assign New CA Section -->
                <div
                    id="assign-ca-section"
                    class="bg-white border border-neutral-200 rounded-lg mb-6"
                >
                    <div class="p-6">
                        <h3 class="text-lg font-semibold mb-4" test-id="ca-form-title">
                            {{ isEditMode ? $t('nc.ca.form.editTitle') : $t('nc.ca.form.assignTitle') }}
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div test-id="ca-title-field">
                                <AppInputForm
                                    name="title"
                                    :label="$t('nc.ca.form.titleLabel')"
                                    :placeholder="$t('nc.ca.form.titlePlaceholder')"
                                    :rules="(v: any) => (!v ? $t('nc.ca.form.titleRequired') : true)"
                                    required
                                />
                            </div>
                            <div test-id="ca-priority-field">
                                <label class="block text-sm text-neutral-700 mb-2"
                                    >{{ $t('nc.ca.form.priority') }} <span class="text-red-700">*</span></label
                                >
                                <div class="relative">
                                    <div :class="{ 'ring-1 ring-red-500 rounded-md': priorityError }">
                                        <Select2
                                            v-model="selectedPriority"
                                            :values="priorityOptions"
                                            :placeholder="$t('nc.ca.form.selectPriority')"
                                            :display="(val?: any) => labelForStatusOption(val, t)"
                                            optional
                                        />
                                    </div>
                                    <p v-if="priorityError" class="text-red-600 text-xs mt-1 absolute top-10 left-0">
                                        {{ priorityError }}
                                    </p>
                                </div>
                            </div>
                            <div test-id="ca-assignee-field">
                                <label class="block text-sm text-neutral-700 mb-2"
                                    >{{ $t('nc.ca.form.assignee') }} <span class="text-red-700">*</span></label
                                >
                                <div class="relative">
                                    <div :class="{ 'ring-1 ring-red-500 rounded-md': assigneeError }">
                                        <Select2
                                            v-model="selectedAssignee"
                                            :values="assigneeOptions"
                                            :placeholder="$t('nc.ca.form.selectAssignee')"
                                            :display="(val?: any) => val?.fname + ' ' + val?.lname"
                                            optional
                                        />
                                    </div>
                                    <p v-if="assigneeError" class="text-red-600 text-xs mt-1 absolute top-10 left-0">
                                        {{ assigneeError }}
                                    </p>
                                </div>
                            </div>
                            <div test-id="ca-due-date-field">
                                <AppInputForm
                                    name="dueDate"
                                    :label="$t('nc.ca.form.dueDate')"
                                    type="date"
                                    :placeholder="$t('nc.ca.form.dueDatePlaceholder')"
                                    :rules="validateDueDate"
                                    required
                                />
                            </div>
                            <div class="col-span-full" test-id="ca-root-causes-select">
                                <label class="block text-sm text-neutral-700 mb-2"
                                    >{{ $t('nc.ca.form.rootCauses') }} <span class="text-red-700">*</span></label
                                >
                                <div class="relative">
                                    <div :class="{ 'ring-1 ring-red-500 rounded-md': rootCausesError }">
                                        <SearcheableMultiSelect
                                            v-model="selectedCauses"
                                            :results="availableCauses"
                                            :placeholder="$t('nc.ca.form.rootCausesPlaceholder')"
                                            :display="(opt: any) => opt.name"
                                        />
                                    </div>
                                    <p v-if="rootCausesError" class="text-red-600 text-xs mt-1 absolute top-10 left-0">
                                        {{ rootCausesError }}
                                    </p>
                                </div>
                            </div>
                            <div class="col-span-full" test-id="ca-description-field">
                                <AppTextareaForm
                                    name="description"
                                    :label="$t('nc.ca.form.description')"
                                    :placeholder="$t('nc.ca.form.descriptionPlaceholder')"
                                    :rules="(v: any) => (!v ? $t('nc.ca.form.descriptionRequired') : true)"
                                    required
                                />
                            </div>
                            <div class="col-span-full" test-id="ca-expected-outcome-field">
                                <AppTextareaForm
                                    name="expectedOutcome"
                                    :label="$t('nc.ca.form.expectedOutcome')"
                                    :placeholder="$t('nc.ca.form.expectedOutcomePlaceholder')"
                                    :rules="(v: any) => (!v ? $t('nc.ca.form.expectedOutcomeRequired') : true)"
                                    required
                                />
                            </div>
                            <Can
                                :subjects="['non_conformity_corrective_actions']"
                                :actions="['create']"
                            >
                                <div class="col-span-full flex justify-end space-x-3" test-id="ca-form-actions">
                                    <AppButton
                                        buttonStyle="secondary"
                                        type="button"
                                        @click="handleCancel"
                                        v-if="!isSubmitting"
                                        test-id="ca-cancel-button"
                                        >{{ $t('nc.ca.form.cancel') }}</AppButton
                                    >
                                    <AppButton
                                        buttonStyle="primary"
                                        type="submit"
                                        :loading="isSubmitting"
                                        test-id="ca-submit-button"
                                        @click="validateForm"
                                    >
                                        {{ isEditMode ? $t('nc.ca.form.updateCA') : $t('nc.ca.form.assignCA') }}
                                    </AppButton>
                                </div>
                            </Can>
                        </div>
                    </div>
                </div>
            </Form>
            <div v-else>
                <div class="flex justify-center items-center h-full">
                    <Spinner width="5" />
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import BreadCrums from '../breadCrums.vue'
import { Form } from 'vee-validate'
import Spinner from '../Spinner.vue'
import { useRoute } from 'vue-router'
import AppInputForm from '../AppInputForm.vue'
import { ref, onMounted, computed, watch } from 'vue'
import Select2 from '../Select2.vue'
import {
    NCCorrectiveActionPriorityOptions,
    type RootCauseAnalysisResponseDTO,
    RCAMethod,
    type CorrectiveAction,
    labelForStatusOption
} from '@/util/interfaces'
import AppTextareaForm from '../AppTextareaForm.vue'
import AppButton from '../AppButton.vue'
import { useRouter } from 'vue-router'
import Can from '../Can.vue'
import { apiGet, apiPost, apiPut } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import SearcheableMultiSelect from '@/components/SearcheableMultiSelect.vue'
import { formatDateToInput, isNonConformityOverdue } from '@/util/util'

const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()
const route = useRoute()
const ncId = route.params.ncId as string
const rcaId = route.query.rcaId as string
const editId = route.params.id as string

const isEditMode = computed(() => !!editId)
const loadingEntity = ref(!!editId)
const router = useRouter()

const correctiveActionData = ref<CorrectiveAction | null>(null)
const crumbs = computed(() => [
    {
        name: t('nc.breadcrumbs.nonConformities'),
        path: '/act/non-conformities',
        icon: 'fa-solid fa-exclamation-triangle'
    },
    {
        name: t('nc.breadcrumbs.viewNonConformities'),
        path: `/act/non-conformities/${ncId}?tab=3`,
        icon: 'fa-solid fa-eye'
    },
    {
        name: isEditMode.value ? t('nc.breadcrumbs.editCorrectiveAction') : t('nc.breadcrumbs.addCorrectiveActions'),
        path: isEditMode.value
            ? `/act/non-conformities/${ncId}/corrective-actions/${editId}/edit`
            : `/act/non-conformities/${ncId}/add-corrective-actions`,
        icon: isEditMode.value ? 'fa-solid fa-edit' : 'fa-solid fa-plus'
    }
])

const priorityOptions = ref<any[]>(NCCorrectiveActionPriorityOptions.slice(1))
const selectedPriority = ref<any>()
const selectedAssignee = ref<any>()
const assigneeOptions = ref<any[]>([])
const isSubmitting = ref(false)

// Error states
const priorityError = ref<string>('')
const assigneeError = ref<string>('')
const rootCausesError = ref<string>('')

const formData = ref<any>({
    title: undefined,
    description: undefined,
    expectedOutcome: undefined,
    dueDate: undefined
})
const rcaCauseOptions = ref<
    {
        id?: string
        name: string
        rcaCauseId?: string
    }[]
>([])
const selectedCauses = ref<
    {
        id?: string
        name: string
        rcaCauseId?: string
    }[]
>([])
const method = ref<RCAMethod | null>(null)

const loadUsers = async () => {
    try {
        const ncRes = await apiGet<any>(`/non-conformities/${ncId}`, authStore)
        if (isNonConformityOverdue(ncRes)) {
            toast.showToast(t('common.error'), t('nc.detail.overdueLocked'), 'error')
            router.push(`/act/non-conformities/${ncId}?tab=3`)
            return
        }
        const teamId = Number(ncRes.teamId ?? ncRes.team?.id)
        if (!Number.isFinite(teamId) || teamId <= 0) {
            assigneeOptions.value = []
            return
        }

        const usersRes = await apiPost<any[]>(
            '/permissions/teams/access',
            {
                teamIds: [teamId],
                allTeamIds: false,
                subject: 'non_conformity_corrective_actions',
            },
            authStore
        )
        assigneeOptions.value = usersRes || []
    } catch (error) {
        console.error('Error loading users:', error)
        toast.showToast(t('common.error'), t('nc.ca.form.loadUsersError'), 'error')
    }
}

const loadCorrectiveActionData = async () => {
    if (!editId) return

    try {
        const response = await apiGet<CorrectiveAction>(
            `/non-conformities/corrective-actions/${editId}`,
            authStore
        )
        correctiveActionData.value = response

        formData.value = {
            title: response.title,
            description: response.description,
            expectedOutcome: response.expectedOutcome,
            dueDate: formatDateToInput(response.dueDate)
        }

        selectedPriority.value = priorityOptions.value.find((p) => p.id === response.priority)
        selectedAssignee.value = assigneeOptions.value.find((u) => u.id === response.assignedTo.id)

        const causes = (response as any).ncCorrectiveActionCauses || []
        selectedCauses.value = causes
            .map((cause: any) => {
                if (method.value === RCAMethod.FIVE_WHYS) {
                    if (!cause.rcaFiveWhyStep) {
                        console.warn('Missing rcaFiveWhyStep for cause:', cause)
                        return null
                    }
                    return {
                        id: cause.id,
                        name: cause.rcaFiveWhyStep.becauseAnswer,
                        rcaCauseId: cause.rcaFiveWhyStep.id,
                        rcaStepId: cause.rcaFiveWhyStep.id // Store step ID for Five Whys
                    }
                } else {
                    if (!cause.rcaCause) {
                        console.warn('Missing rcaCause for cause:', cause)
                        return null
                    }
                    return {
                        id: cause.id,
                        name: cause.rcaCause.text,
                        rcaCauseId: cause.rcaCause.id
                    }
                }
            })
            .filter(Boolean)
    } catch (error) {
        console.error('Error loading corrective action:', error)
        toast.showToast(t('common.error'), t('nc.ca.form.loadError'), 'error')
    } finally {
        loadingEntity.value = false
    }
}
const handleCancel = () => {
    router.push(`/act/non-conformities/${ncId}?tab=3`)
}

const formRef = ref<any>(null)

// Validation functions
const validateDueDate = (v: any) => {
    if (!v) {
        return t('nc.ca.form.dueDateRequired')
    }
    const selectedDate = new Date(v)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    selectedDate.setHours(0, 0, 0, 0)
    
    if (selectedDate < today) {
        return t('nc.ca.form.dueDatePast')
    }
    return true
}

const validateForm = (): boolean => {
    let isValid = true
    
    priorityError.value = ''
    assigneeError.value = ''
    rootCausesError.value = ''
    
    if (!selectedPriority.value) {
        priorityError.value = t('nc.ca.form.priorityRequired')
        isValid = false
    }
    
    if (!selectedAssignee.value) {
        assigneeError.value = t('nc.ca.form.assigneeRequired')
        isValid = false
    }
    
    if (!selectedCauses.value || selectedCauses.value.length === 0) {
        rootCausesError.value = t('nc.ca.form.rootCausesRequired')
        isValid = false
    }
    
    return isValid
}

const handleSubmit = async (values: any) => {
    // Validate custom fields before submitting
    if (!validateForm()) {
        return
    }
    
    isSubmitting.value = true
    const data = {
        ...values,
        assignedToId: selectedAssignee.value?.id,
        priority: selectedPriority.value?.id,
        nonConformityId: ncId,
        source: 'MANUAL',
        ncCorrectiveActionCauses: selectedCauses.value.map((c: any) => ({
            id: c.id || undefined,
            rcaCauseId: method.value !== RCAMethod.FIVE_WHYS ? c.rcaCauseId : null,
            rcaFiveWhyStepId: method.value === RCAMethod.FIVE_WHYS ? c.rcaStepId : null
        }))
    }

    if (isEditMode.value) {
        data.id = editId
    }

    try {
        if (isEditMode.value) {
            await apiPut(`/non-conformities/corrective-actions/${editId}`, data, authStore)
            toast.showToast(t('common.success'), t('nc.ca.form.updateSuccess'), 'success')
            router.push(`/act/non-conformities/${ncId}/corrective-actions/${editId}`)
        } else {
            const response = await apiPost<{ id: string }>(
                '/non-conformities/corrective-actions',
                data,
                authStore
            )
            toast.showToast(t('common.success'), t('nc.ca.form.assignSuccess'), 'success')
            router.push(`/act/non-conformities/${ncId}/corrective-actions/${response.id}`)
        }
    } catch (error) {
        console.error(
            `Error ${isEditMode.value ? 'updating' : 'assigning'} corrective action:`,
            error
        )
        toast.showToast(
            t('common.error'),
            isEditMode.value ? t('nc.ca.form.updateError') : t('nc.ca.form.assignError'),
            'error'
        )
    } finally {
        isSubmitting.value = false
    }
}

const loadCauses = async () => {
    try {
        const rcaRes = await apiGet<RootCauseAnalysisResponseDTO>(
            `/non-conformities/root-cause-analysis/${rcaId}`,
            authStore
        )

        method.value = rcaRes?.method
        let allCauses = []

        if (method.value === RCAMethod.FIVE_WHYS) {
            allCauses = (rcaRes.fiveWhySteps || []).map((s: any) => ({
                rcaCauseId: s.id,
                rcaStepId: s.id, // Store step ID separately for Five Whys
                name: `${s.becauseAnswer}`
            }))
        } else {
            const categories = rcaRes.rcaCeCategories || rcaRes.rcaFishbone?.categories || []
            allCauses = categories.flatMap((cat: any) =>
                (cat.causes || []).map((c: any) => ({
                    rcaCauseId: c.id,
                    name: c.text
                }))
            )
        }

        rcaCauseOptions.value = allCauses
    } catch (error) {
        console.error('Error fetching rca:', error)
        toast.showToast(t('common.error'), t('nc.ca.form.loadRcaError'), 'error')
    }
}

onMounted(async () => {
    await loadUsers()
    await loadCauses()

    if (isEditMode.value) {
        await loadCorrectiveActionData()
    }
})

const availableCauses = computed(() => {
    const selectedIds = selectedCauses.value.map((t) => t.rcaCauseId)
    return rcaCauseOptions.value.filter((t) => !selectedIds.includes(t.rcaCauseId))
})

// Watch for changes to clear errors when values are selected
watch(selectedPriority, () => {
    if (selectedPriority.value) {
        priorityError.value = ''
    }
})

watch(selectedAssignee, () => {
    if (selectedAssignee.value) {
        assigneeError.value = ''
    }
})

watch(selectedCauses, () => {
    if (selectedCauses.value && selectedCauses.value.length > 0) {
        rootCausesError.value = ''
    }
}, { deep: true })
</script>
