<template>
    <div class="space-y-3" test-id="document-checklist-viewer">
        <div
            v-if="!questions.length"
            class="flex flex-col items-center justify-center py-16 text-neutral-400 gap-3 text-center"
            test-id="document-checklist-viewer-empty"
        >
            <i class="fa-solid fa-list-check text-4xl"></i>
            <p class="text-sm">{{ emptyMessage || t('document.checklist_viewer.empty') }}</p>
        </div>
        <div
            v-for="(question, index) in sortedQuestions"
            :key="question.id || index"
            class="border border-neutral-200 rounded-lg p-4 bg-white"
            :test-id="`document-checklist-viewer-question-${index}`"
        >
            <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
                <p class="text-sm font-medium text-neutral-900">
                    <span class="text-neutral-500 mr-2">{{ index + 1 }}.</span>
                    {{ question.question || question.questionText }}
                </p>
                <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <span
                        class="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700"
                        :test-id="`document-checklist-viewer-type-${index}`"
                    >
                        {{ typeLabel(question.questionType) }}
                    </span>
                    <span
                        v-if="question.required"
                        class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"
                        :test-id="`document-checklist-viewer-required-${index}`"
                    >
                        {{ t('document.checklist_viewer.required') }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DocumentChecklistQuestion } from '@/util/interfaces'
import { DocumentChecklistQuestionType } from '@/util/interfaces'

type ViewerQuestion = DocumentChecklistQuestion & {
    id?: string
    questionText?: string
}

const props = defineProps<{
    questions?: ViewerQuestion[] | null
    emptyMessage?: string
}>()

const { t } = useI18n()

const questions = computed(() => props.questions ?? [])

const sortedQuestions = computed(() =>
    [...questions.value].sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    )
)

const typeLabel = (type: DocumentChecklistQuestionType | string | undefined) => {
    if (!type) return t('document.checklist_viewer.unknown_type')
    const key = `document.checklist_builder.types.${type}` as 'document.checklist_builder.types.YES_NO'
    return t(key)
}
</script>
