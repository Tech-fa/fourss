<template>
    <div class="bg-white rounded-lg p-6 w-[700px] shadow-lg">
        <h3 class="text-lg font-medium mb-4 text-neutral-900">
            {{ isEditMode ? t('audit.question_modal.title_edit') : t('audit.question_modal.title_add') }}
        </h3>
        <Form @submit="handleSubmit" @invalid-submit="onInvalidSubmit" :initial-values="formData">
            <div class="space-y-4">
                <div>
                    <AppTextareaForm
                        name="questionText"
                        :label="t('audit.question_modal.question_text_label')"
                        :placeholder="t('audit.question_modal.question_text_placeholder')"
                        :rules="(v: string) => (!v?.trim() ? t('audit.question_modal.question_text_required') : true)"
                        :required="true"
                        rows="3"
                        test-id="question-text-input"
                    />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="block text-sm font-medium text-gray-700"
                        >{{ t('audit.question_modal.type_label') }} <span class="text-red-700">*</span></label
                    >
                    <div :class="`flex ${!formData.questionType && showValidationErrors ? 'ring-1 ring-red-500 rounded-md' : ''}`" test-id="question-type-select">
                        <Select2
                            v-model="formData.questionType"
                            :values="questionTypes"
                            :display="questionTypeDisplay"
                            :placeholder="t('audit.question_modal.type_placeholder')"
                        />
                    </div>
                    <div v-if="!formData.questionType && showValidationErrors" class="text-red-600 text-xs mt-1">
                        <p>{{ t('audit.question_modal.type_required') }}</p>
                    </div>
                </div>
                <div>
                    <AppTextareaForm
                        name="guidanceNotes"
                        :label="t('audit.question_modal.guidance_label')"
                        :placeholder="t('audit.question_modal.guidance_placeholder')"
                        rows="11"
                        test-id="question-guidance-input"
                    />
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-4">
                <AppButton button-style="secondary" type="button" @click="onClose" test-id="question-modal-cancel-button">
                    {{ t('audit.question_modal.cancel') }}
                </AppButton>
                <AppButton button-style="primary" type="submit" :loading="loading" test-id="question-modal-save-button">
                    {{ isEditMode ? t('audit.question_modal.submit_edit') : t('audit.question_modal.submit_add') }}
                </AppButton>
            </div>
        </Form>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form } from 'vee-validate'
import Select2 from '@/components/Select2.vue'
import AppButton from '@/components/AppButton.vue'
import AppTextareaForm from '@/components/AppTextareaForm.vue'

const { t } = useI18n()

interface QuestionData {
    id?: string
    questionText: string
    questionType: any
    guidanceNotes: string
    orderIndex?: number
}

const props = defineProps<{
    isEditMode?: boolean
    initialData?: QuestionData
    questionTypes: any[]
    loading?: boolean
    onClose: () => void
    onSubmit: (data: QuestionData) => void
}>()

const formData = reactive<QuestionData>({
    questionText: props.initialData?.questionText || '',
    questionType: props.initialData?.questionType || null,
    guidanceNotes: props.initialData?.guidanceNotes || ''
})

const showValidationErrors = ref(false)

const questionTypeDisplay = (item: any) => {
    if (!item?.name) return ''
    if (item.name === 'Yes/No/NA') return t('audit.checklist_builder.question_type_yes_no_na')
    if (item.name === 'Text Input') return t('audit.checklist_builder.question_type_text')
    return item.name
}

onMounted(() => {
    if (props.initialData) {
        Object.assign(formData, props.initialData)
    }
})

// Reset validation errors when question type changes
watch(
    () => formData.questionType,
    () => {
        if (showValidationErrors.value) {
            showValidationErrors.value = false
        }
    }
)

const onInvalidSubmit = () => {
    showValidationErrors.value = true
}

const handleSubmit = (values: any) => {
    showValidationErrors.value = true

    const questionText = (values.questionText || '').toString().trim()
    const guidanceNotes = (values.guidanceNotes || '').toString()

    if (!questionText) {
        return
    }

    if (!formData.questionType) {
        return
    }

    props.onSubmit({
        ...formData,
        questionText: questionText,
        guidanceNotes: guidanceNotes
    })
}
</script>
