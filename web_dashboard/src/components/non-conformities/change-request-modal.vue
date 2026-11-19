<template>
    <div class="bg-white rounded-lg w-[500px] shadow-lg h-[600px] overflow-y-auto" test-id="cr-modal-container">
        <Form @submit="handleSubmit" @invalid-submit="onInvalidSubmit" id="add-category-modal" :initial-values="formData" test-id="cr-modal-form">
            <div class="p-6 border-b border-neutral-200">
                <h2 class="text-lg" test-id="cr-modal-title">{{ t('nc.changeRequest.modalTitle') }}</h2>
            </div>

            <div class="p-6 space-y-4">
                <div class="space-y-4">
                    <div test-id="cr-modal-title-field">
                        <AppInputForm
                            name="name"
                            :label="t('nc.changeRequest.titleLabel')"
                            type="text"
                            :placeholder="t('nc.changeRequest.titlePlaceholder')"
                            :rules="(v: any) => (!v ? t('nc.changeRequest.titleRequired') : true)"
                            :required="true"
                            testID="cr-modal-title-input"
                        />
                    </div>
                    <div test-id="cr-modal-reason-field">
                        <AppTextareaForm
                            name="reason"
                            :label="t('nc.changeRequest.reasonLabel')"
                            :placeholder="t('nc.changeRequest.reasonPlaceholder')"
                            rows="0"
                            :rules="(v: any) => (!v ? t('nc.changeRequest.reasonRequired') : true)"
                            :required="true"
                            testID="cr-modal-reason-input"
                        />
                        <ErrorMessage name="reason" class="text-red-600 text-sm mt-1" test-id="cr-modal-reason-error" />
                    </div>
                    <div test-id="cr-modal-type-field">
                        <label class="block text-sm font-medium text-neutral-700 mb-2">
                            {{ t('nc.changeRequest.typeLabel') }} <span class="text-red-600">*</span>
                        </label>
                        <div :class="`flex ${!formData.type && showValidationErrors ? 'ring-1 ring-red-500 rounded-md' : ''}`">
                            <Select2
                                :values="typeOptions"
                                v-model="formData.type"
                                :placeholder="t('nc.changeRequest.typeSelectPlaceholder')"
                                :display="(type: any) => labelForStatusOption(type, t)"
                                @update:modelValue="(value) => {
                                    formData.type = value
                                }"
                                test-id="cr-modal-type-select"
                            />
                        </div>
                        <div v-if="!formData.type && showValidationErrors" class="text-red-600 text-sm mt-1" test-id="cr-modal-type-error">
                            <p>{{ t('nc.changeRequest.typeRequired') }}</p>
                        </div>
                    </div>

                    <div v-if="formData.type?.id === CaChangeRequestType.DUE_DATE_CHANGE" test-id="cr-modal-due-date-field">
                        <AppInputForm
                            name="dueDate"
                            v-model="formData.dueDate"
                            :label="t('nc.changeRequest.dueDateLabel')"
                            type="date"
                            :placeholder="t('nc.changeRequest.dueDatePlaceholder')"
                            :rules="(v: any) => (!v ? t('nc.changeRequest.dueDateRequired') : true)"
                            :required="true"
                            test-id="cr-modal-due-date-input"
                        />
                    </div>

                    <div v-if="formData.type?.id === CaChangeRequestType.ASSIGNEE_CHANGE" test-id="cr-modal-assignee-field">
                        <label class="block text-sm font-medium text-neutral-700 mb-2">
                            {{ t('nc.changeRequest.assigneeLabel') }} <span class="text-red-600">*</span>
                        </label>
                        <div :class="`flex ${!formData.assignee && showValidationErrors ? 'ring-1 ring-red-500 rounded-md' : ''}`">
                            <Select2
                                v-model="formData.assignee"
                                :values="assigneeOptions"
                                :placeholder="t('nc.changeRequest.assigneePlaceholder')"
                                :display="(val?: any) => val?.fname + ' ' + val?.lname"
                                @update:modelValue="(value) => {
                                    formData.assignee = value
                                }"
                                dropdownHeight="15rem"
                                test-id="cr-modal-assignee-select"
                            />
                        </div>
                        <div v-if="!formData.assignee && showValidationErrors" class="text-red-600 text-sm mt-1" test-id="cr-modal-assignee-error">
                            <p>{{ t('nc.changeRequest.assigneeRequired') }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-6 border-t border-neutral-200 flex justify-end gap-3" test-id="cr-modal-actions">
                <AppButton buttonStyle="secondary" type="button" @click="props.onClose" test-id="cr-modal-cancel-button">
                    {{ t('common.cancel') }}
                </AppButton>

                <AppButton buttonStyle="primary" type="submit" :loading="isSubmitting" test-id="cr-modal-save-button">
                    {{ t('common.save') }}
                </AppButton>
            </div>
        </Form>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Form, ErrorMessage } from 'vee-validate'
import AppInputForm from '@/components/AppInputForm.vue'
import AppTextareaForm from '@/components/AppTextareaForm.vue'
import AppButton from '../AppButton.vue'
import Select2 from '../Select2.vue'
import {
    CaChangeRequestTypeOptions,
    CaChangeRequestType,
    labelForStatusOption
} from '@/util/interfaces'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPost } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { parse, isBefore, startOfDay } from 'date-fns'

const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()
const isSubmitting = ref(false)
const showValidationErrors = ref(false)

const typeOptions = ref<any[]>([CaChangeRequestTypeOptions[1], CaChangeRequestTypeOptions[2]])
const assigneeOptions = ref<any[]>([])

const loadUsers = async () => {
    try {
        const ncRes = await apiGet<any>(`/non-conformities/${props.ncId}`, authStore)
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
                subject: 'non_conformity_corrective_actions'
            },
            authStore
        )
        assigneeOptions.value = usersRes
    } catch (error) {
        console.error('Error loading users:', error)
        toast.showToast(t('common.error'), t('common.failedToLoadUsers'), 'error')
    }
}

const props = defineProps<{
    loading?: boolean
    name?: string
    onSubmit: (values: any) => Promise<void>
    onClose: () => void
    ncId: string
    currentDueDate?: number
    currentAssignee?: any
}>()
const formData = ref<any>({
    name: '',
    reason: '',
    type: null,
    dueDate: '',
    assignee: null
})

const onInvalidSubmit = () => {
    showValidationErrors.value = true
}

const handleSubmit = async (values: any) => {
    showValidationErrors.value = true

    if (!formData.value.type) {
        return
    }

    if (formData.value.type?.id === CaChangeRequestType.ASSIGNEE_CHANGE && !formData.value.assignee) {
        return
    }

    if (formData.value.type?.id === CaChangeRequestType.DUE_DATE_CHANGE && !values.dueDate) {
        return
    }

    isSubmitting.value = true
    const dueDate = new Date(values.dueDate).getTime()

    if (
        formData.value.type?.id === CaChangeRequestType.DUE_DATE_CHANGE &&
        props.currentDueDate &&
        values.dueDate
    ) {
        if (dueDate === props.currentDueDate) {
            toast.showToast(t('common.error'), t('nc.changeRequest.dueDateSame'), 'error')
            isSubmitting.value = false
            return
        }
    }

    if (
        formData.value.type?.id === CaChangeRequestType.ASSIGNEE_CHANGE &&
        props.currentAssignee &&
        formData.value.assignee &&
        formData.value.assignee.id === props.currentAssignee.id
    ) {
        toast.showToast(t('common.error'), t('nc.changeRequest.assigneeSame'), 'error')
        isSubmitting.value = false
        return
    }
    if (formData.value.type.id === CaChangeRequestType.DUE_DATE_CHANGE) {
        const dueDateParsed = parse(values.dueDate || '', 'yyyy-MM-dd', new Date())
        const today = startOfDay(new Date())
        if (isBefore(dueDateParsed, today)) {
            toast.showToast(t('common.error'), t('nc.changeRequest.dueDatePast'), 'error')
            isSubmitting.value = false
            return
        }
    }
    const data = {
        ...values,
        type: formData.value.type.id,
        assignee: formData.value.assignee
    }
    try {
        await props.onSubmit(data)
    } catch (error) {
        console.error('Error submitting change request:', error)
        toast.showToast(t('common.error'), t('nc.changeRequest.submitError'), 'error')
    } finally {
        isSubmitting.value = false
    }
}

onMounted(async () => {
    await loadUsers()
})
</script>
