<template>
    <div id="analysis-area" class="px-6 py-6 space-y-6" test-id="rca-fivewhys-component">
        <!-- Why Pairs Container -->
        <Form class="space-y-4" @submit="createBulkSteps" v-slot="{ values }" test-id="rca-fivewhys-form">
            <div
                v-for="(why, idx) in formData"
                :key="why.uniqueId"
                class="border border-neutral-200 rounded-lg p-4 bg-white"
                :test-id="`rca-fivewhys-step-${idx}`"
            >
                <div class="flex items-start justify-between mb-3">
                    <AppInputForm
                        :name="`whyQuestion-${why.uniqueId}`"
                        :label="$t('nc.fiveWhys.whyStatement')"
                        :value="why.whyQuestion"
                        :placeholder="$t('nc.fiveWhys.whyPlaceholder')"
                        :required="true"
                        class="w-full"
                        :testID="`rca-fivewhys-why-question-${idx}`"
                    />
                    <AppButton
                        buttonStyle="secondary"
                        class="text-neutral-400 hover:text-neutral-500 px-2 py-1"
                        @click="removeWhy(idx)"
                        aria-label="Remove this why"
                        type="button"
                        :warn-before="t('nc.fiveWhys.removeConfirm')"
                        :test-id="`rca-fivewhys-remove-button-${idx}`"
                    >
                        <i class="fa-solid fa-times"></i>
                    </AppButton>
                </div>
                <AppTextareaForm
                    :name="`becauseAnswer-${why.uniqueId}`"
                    :label="$t('nc.fiveWhys.answer')"
                    :value="why.becauseAnswer"
                    :placeholder="$t('nc.fiveWhys.answerPlaceholder')"
                    :required="true"
                    :testID="`rca-fivewhys-because-answer-${idx}`"
                />
            </div>

            <!-- Add Another Why Button -->
            <div id="add-why-button" class="flex justify-between">
                <div class="flex-1">
                    <AppButton
                        buttonStyle="secondary"
                        class="flex items-center space-x-2"
                        @click="addWhy"
                        type="button"
                        v-if="formData.length < 5"
                        test-id="rca-fivewhys-add-button"
                    >
                        <i class="fa-solid fa-plus"></i>
                        <span>{{ $t('nc.fiveWhys.addWhy') }}</span>
                    </AppButton>
                </div>

                <!-- Bulk Create Button -->
                <div class="flex-shrink-0">
                    <AppButton
                        buttonStyle="primary"
                        class="flex items-center space-x-2"
                        :loading="bulkLoading"
                        type="submit"
                        test-id="rca-fivewhys-save-button"
                    >
                        <i class="fa-solid fa-upload"></i>
                        <span>{{ $t('nc.fiveWhys.saveAll') }}</span>
                    </AppButton>
                </div>
            </div>
        </Form>

        <!-- Root Cause Identification -->
        <!-- <div id="root-cause-section" class="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
            <AppTextareaForm
                name="root-cause"
                label="Identified Root Cause(s)"
                placeholder="Summarize the final root cause(s) identified through this analysis..."
                v-model="rootCause"
                :required="true"
            />
        </div> -->
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { Form } from 'vee-validate'
import AppButton from '@/components/AppButton.vue'
import AppTextareaForm from '@/components/AppTextareaForm.vue'
import AppInputForm from '../AppInputForm.vue'
import { bulkCreateRCAFiveWhySteps, fetchRCAFiveWhySteps, NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import { formatApiErrorMessage } from '@/util/util'

interface WhyStep {
    id?: string
    whyQuestion: string
    becauseAnswer: string
    uniqueId?: string
}

const props = defineProps<{ rcaId: string; onSave: Function; steps: WhyStep[] }>()
const toast = useToast()
const { t } = useI18n()

const formData = ref<WhyStep[]>(props.steps.map((step, index) => ({
    ...step,
    uniqueId: step.id || `new-${index}-${Date.now()}`
})))

function addWhy() {
    if (formData.value.length < 5) {
        formData.value.push({
            id: '',
            whyQuestion: '',
            becauseAnswer: '',
            uniqueId: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        })
    }
}

function removeWhy(idx: number) {
    formData.value.splice(idx, 1)
}

const rootCause = ref(
    'Lack of adherence to preventive maintenance schedule for production equipment, specifically the cleaning and inspection of cooling systems, leading to equipment failure and production disruption.'
)

const bulkLoading = ref(false)
const bulkError = ref('')
const bulkSuccess = ref(false)
const authStore = useAuthStore()

async function createBulkSteps(values: any) {
    bulkLoading.value = true
    bulkError.value = ''
    bulkSuccess.value = false
    try {
        let hasEmpty = false
        // Build steps array from values
        const steps = formData.value.map((why) => ({
            id: why.id || undefined, // Include existing ID for updates
            whyQuestion: values[`whyQuestion-${why.uniqueId}`],
            becauseAnswer: values[`becauseAnswer-${why.uniqueId}`]
        }))
        if (steps.some((step: any) => step.whyQuestion === '' || step.becauseAnswer === '')) {
            hasEmpty = true
        }
        if (hasEmpty) {
            toast.showToast(t('common.error'), t('nc.fiveWhys.fillAllFields'), 'error')
            return
        }
        if (steps.length == 0) {
            toast.showToast(t('common.error'), t('nc.fiveWhys.addAtLeastOne'), 'error')
            return
        }
        const payload = {
            rcaId: props.rcaId,
            steps
        }
        await bulkCreateRCAFiveWhySteps(payload, authStore)
        toast.showToast(t('common.success'), t('nc.fiveWhys.saveSuccess'), 'success')
        props.onSave()
    } catch (err: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(err?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.fiveWhys.saveError'), 'error')
    } finally {
        bulkLoading.value = false
    }
}

// Expose functions to parent components
defineExpose({
    saveSteps: createBulkSteps,
    bulkLoading,
    bulkError,
    bulkSuccess
})
</script>
