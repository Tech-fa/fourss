<template>
    <div class="bg-white rounded-lg w-[600px] shadow-lg">
        <div class="p-6 border-b border-neutral-200">
            <div class="flex items-center justify-between">
                <h2 class="text-lg text-neutral-900">
                    {{ isEditMode ? 'Edit' : 'Create' }} Root Cause Analysis
                </h2>
                <AppButton
                    type="button"
                    buttonStyle="secondary"
                    class="text-neutral-400 hover:text-neutral-600 p-2"
                    @click="props.onClose"
                    size="sm"
                >
                    <i class="fa-solid fa-times text-xl"></i>
                </AppButton>
            </div>
        </div>

        <Form @submit="handleSubmit" :key="formKey" class="p-6 space-y-6">
            <div>
                <label class="block text-sm text-neutral-700 mb-2">Method <span class="text-red-700">*</span></label>
                <Select2
                    v-model="formData.method"
                    :values="rcaMethods"
                    :display="(val: any) => val?.name || ''"
                    placeholder="Select method"
                    :optional="false"
                />
            </div>

            <div>
                <label class="block text-sm text-neutral-700 mb-2">Performed By</label>
                <SearcheableMultiSelect
                    v-model="formData.performed_by"
                    :results="users"
                    :display="(val: any) => `${val?.fname} ${val?.lname}`"
                    placeholder="Select users"
                />
            </div>

            <div>
                <label class="block text-sm text-neutral-700 mb-2">Performed At</label>
                <input
                    type="datetime-local"
                    :value="performedAtFormatted"
                    @input="(e) => updatePerformedAt((e.target as HTMLInputElement).value)"
                    class="w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
                />
            </div>

            <div>
                <AppTextareaForm
                    name="problem_statement"
                    label="Problem Statement"
                    placeholder="Describe the problem statement..."
                    :value="formData.problem_statement"
                    :required="true"
                    :rules="(v: any) => (!v ? 'Problem statement is required' : true)"
                    rows="3"
                />
            </div>

            <div>
                <AppTextareaForm
                    name="description"
                    label="Description"
                    placeholder="Detailed description of the root cause analysis..."
                    :value="formData.description"
                    rows="4"
                />
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                <Can subject="root_cause_analyses" :actions="[isEditMode ? 'update' : 'create']">
                    <AppButton
                        type="button"
                        buttonStyle="secondary"
                        @click="props.onClose"
                    >
                        Cancel
                    </AppButton>
                    <AppButton
                        type="submit"
                        buttonStyle="primary"
                        :loading="loading"
                    >
                        <i class="fa-solid fa-save mr-2"></i>
                        {{ isEditMode ? 'Update' : 'Create' }} RCA
                    </AppButton>
                </Can>
            </div>
        </Form>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form } from 'vee-validate'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiGet, apiPost } from '@/util/api'
import { updateRootCauseAnalysis, createRootCauseAnalysis, NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'
import AppInputForm from '../AppInputForm.vue'
import AppTextareaForm from '../AppTextareaForm.vue'
import AppButton from '../AppButton.vue'
import Select2 from '../Select2.vue'
import SearcheableMultiSelect from '../SearcheableMultiSelect.vue'
import Can from '../Can.vue'
import type { 
    CreateRootCauseAnalysisDto, 
    UpdateRootCauseAnalysisDto,
    RootCauseAnalysisResponseDTO,
    User
} from '@/util/interfaces'
import { formatDateToInputWithTime, formatApiErrorMessage } from '@/util/util'

const props = defineProps<{
    isEditMode: boolean
    initialData?: RootCauseAnalysisResponseDTO
    nonConformityId: string
    onClose: () => void
    onSuccess: () => void
}>()

const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()
const loading = ref(false)
const users = ref<User[]>([])
const nonConformity = ref<any>(null)

// RCA method options
const rcaMethods = ref([
    { value: 'FiveWhys', name: 'Five Whys' },
    { value: 'Fishbone', name: 'Fishbone Diagram' },
    { value: 'CauseEffect', name: 'Cause Effect' }
])

// Form data
const formData = ref<{
    method: { value: string; name: string } | null;
    performed_by: User[];
    performed_at: number | null; // Allow null
    problem_statement: string;
    description: string;
}>({
    method: null,
    performed_by: [],
    performed_at: null, // Default to null for creation
    problem_statement: '',
    description: ''
})

// Computed for datetime-local input
const performedAtFormatted = computed(() => {
    const val = formData.value.performed_at
    if (!val) return ''
    return formatDateToInputWithTime(val)
})

// Form key to force re-rendering
const formKey = computed(() => `${props.isEditMode}-${props.initialData?.id || 'new'}`)

// Helper function to get method name
function getMethodName(method: string): string {
    switch (method) {
        case 'FiveWhys':
            return 'Five Whys'
        case 'Fishbone':
            return 'Fishbone Diagram'
        case 'CauseEffect':
            return 'Cause Effect'
        default:
            return method
    }
}

// Initialize form data when props change
const initializeFormData = () => {
    if (props.initialData) { 
        formData.value = {
            method: { value: props.initialData.method, name: getMethodName(props.initialData.method) },
            performed_by: props.initialData.performed_by || [],
            performed_at: props.initialData.performed_at,
            problem_statement: props.initialData.problem_statement,
            description: props.initialData.description || ''
        }
    } else {
        formData.value = {
            method: null,
            performed_by: [],
            performed_at: null, // Initialize as null
            problem_statement: '',
            description: ''
        }
    }
}

// Update performed_at when datetime-local changes
const updatePerformedAt = (value: string) => {
    formData.value.performed_at = value ? new Date(value).getTime() : null;
}

// Fetch non-conformity to get its team
const fetchNonConformity = async () => {
    try {
        const response = await apiGet(`/non-conformities/${props.nonConformityId}`, authStore) as any
        nonConformity.value = response
    } catch (error: any) {
        console.error('Error fetching non-conformity:', error)
    }
}

// Fetch users with RCA permissions
const fetchUsers = async () => {
    try {
        if (!nonConformity.value) {
            await fetchNonConformity()
        }
        
        const teamId = Number(nonConformity.value?.teamId ?? nonConformity.value?.team?.id)
        if (Number.isFinite(teamId) && teamId > 0) {
            const response = await apiPost('/permissions/teams/access', {
                teamIds: [teamId],
                allTeamIds: false,
                subject: 'root_cause_analyses'
            }, authStore) as any
            users.value = response.data || response || []
        } else {
            const response = await apiGet('/users', authStore) as any
            users.value = response.data || []
        }
    } catch (error: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.rca.modalUsersFetchError'), 'error')
    }
}

// Handle form submission
const handleSubmit = async (values: any) => {
    try {
        loading.value = true
        
        if (!formData.value.method?.value) {
            toast.showToast(t('common.error'), t('nc.rca.selectMethodError'), 'error')
            return
        }

        const submitData: Partial<CreateRootCauseAnalysisDto> = {
            nc_id: props.nonConformityId,
            method: formData.value.method.value,
            problem_statement: values.problem_statement,
            description: values.description || ''
        };

        if (formData.value.performed_by && formData.value.performed_by.length > 0) {
            submitData.performed_by_ids = formData.value.performed_by.map((user) => user.id);
        }

        if (formData.value.performed_at) {
            submitData.performed_at = formData.value.performed_at;
        }

        if (props.isEditMode && props.initialData?.id) {
            // Update existing RCA
            await updateRootCauseAnalysis(props.initialData.id, submitData as UpdateRootCauseAnalysisDto, authStore)
            toast.showToast(t('common.success'), t('nc.rca.updateSuccess'), 'success')
        } else {
            // Create new RCA
            await createRootCauseAnalysis(submitData as CreateRootCauseAnalysisDto, authStore)
            toast.showToast(t('common.success'), t('nc.rca.createSuccess'), 'success')
        }
        
        props.onSuccess()
        props.onClose()
    } catch (error: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.rca.saveError'), 'error')
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    // Initialize form data after component is mounted
    await nextTick()
    initializeFormData()
    
    // Fetch users
    await fetchUsers()
})

// Watch for changes in initialData
watch(() => props.initialData, () => {
    nextTick(() => {
        initializeFormData()
    })
}, { immediate: false })
</script> 