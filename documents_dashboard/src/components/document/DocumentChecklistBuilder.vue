<template>
    <div class="space-y-4" test-id="document-checklist-builder">
        <div class="flex items-center justify-between gap-3">
            <p class="text-sm text-neutral-600">
                {{ t('document.checklist_builder.hint') }}
            </p>
            <AppButton
                type="button"
                buttonStyle="secondary"
                test-id="document-checklist-add-question"
                @click="addQuestion"
            >
                <i class="fa-solid fa-plus mr-2"></i>
                {{ t('document.checklist_builder.add_question') }}
            </AppButton>
        </div>

        <div
            v-if="showValidationErrors && !modelValue.length"
            class="text-red-600 text-xs"
        >
            {{ t('document.checklist_builder.validation_at_least_one') }}
        </div>

        <div v-if="!modelValue.length" class="border border-dashed border-neutral-300 rounded-lg px-4 py-8 text-center text-sm text-neutral-500">
            {{ t('document.checklist_builder.empty') }}
        </div>

        <div class="space-y-3">
            <div
                v-for="(question, index) in modelValue"
                :key="index"
                class="border border-neutral-200 rounded-lg p-4 space-y-3 bg-neutral-50/50"
                :test-id="`document-checklist-question-${index}`"
            >
                <div class="flex items-start justify-between gap-3">
                    <span class="text-sm font-medium text-neutral-700">
                        {{ t('document.checklist_builder.question_label', { n: index + 1 }) }}
                    </span>
                    <div class="flex items-center gap-1">
                        <button
                            type="button"
                            class="text-neutral-400 hover:text-neutral-700 disabled:opacity-30 p-1"
                            :disabled="index === 0"
                            :title="t('document.checklist_builder.move_up')"
                            :test-id="`document-checklist-move-up-${index}`"
                            @click="moveQuestion(index, -1)"
                        >
                            <i class="fa-solid fa-arrow-up"></i>
                        </button>
                        <button
                            type="button"
                            class="text-neutral-400 hover:text-neutral-700 disabled:opacity-30 p-1"
                            :disabled="index === modelValue.length - 1"
                            :title="t('document.checklist_builder.move_down')"
                            :test-id="`document-checklist-move-down-${index}`"
                            @click="moveQuestion(index, 1)"
                        >
                            <i class="fa-solid fa-arrow-down"></i>
                        </button>
                        <button
                            type="button"
                            class="text-neutral-400 hover:text-red-600 p-1"
                            :title="t('document.checklist_builder.remove_question')"
                            :test-id="`document-checklist-remove-${index}`"
                            @click="removeQuestion(index)"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>

                <div>
                    <label class="block text-sm text-neutral-700 mb-1">
                        {{ t('document.checklist_builder.question_text') }}
                        <span class="text-red-700">*</span>
                    </label>
                    <AppInput
                        :model-value="question.question"
                        :placeholder="t('document.checklist_builder.question_placeholder')"
                        :hide-icon="true"
                        :class="
                            showValidationErrors && !question.question?.trim()
                                ? 'ring-1 ring-red-500 rounded-md'
                                : ''
                        "
                        :test-id="`document-checklist-question-text-${index}`"
                        @update:model-value="(val) => updateQuestion(index, { question: String(val ?? '') })"
                    />
                    <div
                        v-if="showValidationErrors && !question.question?.trim()"
                        class="text-red-600 text-xs mt-1"
                    >
                        {{ t('document.checklist_builder.validation_question_required') }}
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm text-neutral-700 mb-1">
                            {{ t('document.checklist_builder.question_type') }}
                            <span class="text-red-700">*</span>
                        </label>
                        <div
                            :class="
                                showValidationErrors && !question.questionType
                                    ? 'ring-1 ring-red-500 rounded-md'
                                    : ''
                            "
                            :test-id="`document-checklist-question-type-${index}`"
                        >
                            <Select2
                                :model-value="selectedType(question.questionType)"
                                :values="questionTypeOptions"
                                :display="(item: any) => item?.label"
                                :placeholder="t('document.checklist_builder.question_type_placeholder')"
                                :optional="false"
                                @update:model-value="(val) => onTypeChange(index, val)"
                            />
                        </div>
                    </div>
                    <div class="flex items-end pb-1">
                        <ToggleSwitch
                            :model-value="question.required"
                            :label="t('document.checklist_builder.required')"
                            active-color="bg-blue-600"
                            :test-id="`document-checklist-required-${index}`"
                            @update:model-value="(val) => updateQuestion(index, { required: !!val })"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import AppInput from '../AppInput.vue'
import Select2 from '../Select2.vue'
import ToggleSwitch from '../ToggleSwitch.vue'
import {
    DocumentChecklistQuestionType,
    type DocumentChecklistQuestion
} from '@/util/interfaces'

const props = defineProps<{
    modelValue: DocumentChecklistQuestion[]
    showValidationErrors?: boolean
}>()

const emit = defineEmits<{
    'update:modelValue': [value: DocumentChecklistQuestion[]]
}>()

const { t } = useI18n()

const questionTypeOptions = computed(() =>
    Object.values(DocumentChecklistQuestionType).map((value) => ({
        id: value,
        value,
        label: t(`document.checklist_builder.types.${value}` as 'document.checklist_builder.types.YES_NO')
    }))
)

const selectedType = (type: DocumentChecklistQuestionType | '') =>
    questionTypeOptions.value.find((option) => option.value === type) ?? null

const syncOrder = (questions: DocumentChecklistQuestion[]) =>
    questions.map((question, orderIndex) => ({ ...question, orderIndex }))

const emitQuestions = (questions: DocumentChecklistQuestion[]) => {
    emit('update:modelValue', syncOrder(questions))
}

const addQuestion = () => {
    emitQuestions([
        ...props.modelValue,
        {
            question: '',
            questionType: DocumentChecklistQuestionType.YES_NO,
            required: false,
            orderIndex: props.modelValue.length
        }
    ])
}

const removeQuestion = (index: number) => {
    emitQuestions(props.modelValue.filter((_, i) => i !== index))
}

const moveQuestion = (index: number, delta: number) => {
    const nextIndex = index + delta
    if (nextIndex < 0 || nextIndex >= props.modelValue.length) return
    const next = [...props.modelValue]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    emitQuestions(next)
}

const updateQuestion = (
    index: number,
    patch: Partial<DocumentChecklistQuestion>
) => {
    emitQuestions(
        props.modelValue.map((question, i) =>
            i === index ? { ...question, ...patch } : question
        )
    )
}

const onTypeChange = (index: number, val: { value?: DocumentChecklistQuestionType } | null) => {
    if (!val?.value) return
    updateQuestion(index, { questionType: val.value })
}

const validate = (): boolean => {
    if (!props.modelValue.length) return false
    return props.modelValue.every(
        (question) => !!question.question?.trim() && !!question.questionType
    )
}

defineExpose({ validate })
</script>
