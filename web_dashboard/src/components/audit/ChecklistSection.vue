<template>
    <div
        :id="rootId"
        :class="wrapperClass"
        :test-id="variant === 'section' ? 'checklist-section' : 'checklist-subsection'"
    >
        <div
            :class="headerClass"
            @click="toggleCollapse(sectionId)"
            :test-id="variant === 'section' ? 'checklist-section-header' : 'checklist-subsection-header'"
        >
            <div class="flex items-center gap-3">
                <i
                    class="fa-solid transition-transform duration-200"
                    :class="isCollapsed(sectionId) ? 'fa-chevron-right' : 'fa-chevron-down'"
                ></i>
                <component
                    :is="headingTag"
                    :class="titleClass"
                    :test-id="variant === 'section' ? 'section-title' : 'subsection-title'"
                >
                    {{ title }}
                </component>
            </div>
            <span class="text-xs text-neutral-500">{{
                t('audit.checklist_section.questions_count', { n: section.questions?.length || 0 })
            }}</span>
        </div>

        <div
            v-show="!isCollapsed(sectionId)"
            :class="contentClass"
        >
            <div
                v-for="(question, questionIndex) in section.questions || []"
                :key="question.id"
                :id="`question-${question.id}`"
                :class="[questionItemClass, { 'border-2 border-red-500 rounded-lg p-3': showInlineErrors && !getResponseModel(question.id).responseAnswer }]"
                :test-id="variant === 'section' ? 'section-question' : 'subsection-question'"
            >
                <div class="flex gap-3 items-start">
                    <div class="flex-shrink-0 mt-1">
                        <div
                            class="w-8 h-8 rounded-md bg-neutral-200 flex items-center justify-center text-neutral-500 text-base"
                            test-id="question-number"
                        >
                            {{ questionIndex + 1 }}
                        </div>
                    </div>
                    <div class="flex-1">
                        <div class="text-neutral-900" test-id="question-text">
                            {{ question.questionText }}
                        </div>
                        <div v-if="question.guidanceNotes" class="text-xs text-neutral-500 mt-1">
                            {{ t('audit.checklist_section.guidance_prefix') }} {{ question.guidanceNotes }}
                        </div>
                        <div class="flex items-center gap-4 mt-2">
                            <div
                                class="text-xs px-2 py-1 rounded"
                                :class="question.questionType === 'Yes/No/NA' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-700'"
                                test-id="question-type-chip"
                            >
                                {{
                                    t('audit.checklist_section.question_response_chip', {
                                        type: displayQuestionTypeLabel(question.questionType)
                                    })
                                }}
                            </div>
                            <div v-if="question.reference" class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                                {{ t('audit.checklist_section.ref_prefix') }} {{ question.reference }}
                            </div>
                        </div>

                        <!-- Response Input Area -->
                        <div class="mt-4 flex flex-col gap-2" test-id="response-wrapper">
                            <label class="text-sm text-neutral-700" test-id="response-label">
                                {{ t('audit.checklist_section.response_label') }}
                            </label>

                            <!-- Yes/No/NA Question Type with Optional Additional Notes -->
                            <div
                                v-if="question.questionType === 'Yes/No/NA'"
                                class="flex items-center gap-4"
                                test-id="yes-no-na-group"
                            >
                                <div class="flex items-center gap-2">
                                    <label class="flex items-center gap-2" test-id="radio-yes">
                                        <input
                                            type="radio"
                                            :name="`responseAnswer_${question.id}`"
                                            value="Yes"
                                            :checked="getResponseModel(question.id).responseAnswer === 'Yes'"
                                            @change="() => { getResponseModel(question.id).responseAnswer = 'Yes'; syncResponseToStore(question.id, getResponseModel(question.id)) }"
                                            class="accent-neutral-900"
                                        />
                                        <span class="text-sm text-neutral-800">{{ t('audit.checklist_section.yes') }}</span>
                                    </label>

                                    <label class="flex items-center gap-2 ml-4" test-id="radio-no">
                                        <input
                                            type="radio"
                                            :name="`responseAnswer_${question.id}`"
                                            value="No"
                                            :checked="getResponseModel(question.id).responseAnswer === 'No'"
                                            @change="() => { getResponseModel(question.id).responseAnswer = 'No'; syncResponseToStore(question.id, getResponseModel(question.id)) }"
                                            class="accent-neutral-900"
                                        />
                                        <span class="text-sm text-neutral-800">{{ t('audit.checklist_section.no') }}</span>
                                    </label>

                                    <label class="flex items-center gap-2 ml-4" test-id="radio-na">
                                        <input
                                            type="radio"
                                            :name="`responseAnswer_${question.id}`"
                                            value="NA"
                                            :checked="getResponseModel(question.id).responseAnswer === 'NA'"
                                            @change="() => { getResponseModel(question.id).responseAnswer = 'NA'; syncResponseToStore(question.id, getResponseModel(question.id)) }"
                                            class="accent-neutral-900"
                                        />
                                        <span class="text-sm text-neutral-800">{{ t('audit.checklist_section.na') }}</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Text-based responses (Compliance Check, etc.) -->
                            <div v-else>
                                <AppTextareaForm
                                    :name="`responseAnswer_${question.id}`"
                                    label=""
                                    :placeholder="t('audit.checklist_section.answer_placeholder')"
                                    :value="getResponseModel(question.id).responseAnswer"
                                />
                            </div>
                        </div>
                        
                        <!-- Error message under question section -->
                        <div v-if="showInlineErrors && !getResponseModel(question.id).responseAnswer" class="mt-2 text-sm text-red-700">
                            {{ t('audit.checklist_section.answer_required') }}
                        </div>

                        <!-- Auditor Observation -->
                        <div class="mt-4 flex flex-col gap-2" test-id="auditor-observation-wrapper">
                            <AppTextareaForm
                                :name="`auditorObservation_${question.id}`"
                                :label="t('audit.checklist_section.auditor_notes_label')"
                                :placeholder="t('audit.checklist_section.auditor_notes_placeholder')"
                                :value="getResponseModel(question.id).auditorObservation"
                            />
                        </div>

                        <!-- Findings Section -->
                        <div class="mt-5 flex items-center justify-between" test-id="findings-header">
                            <div class="text-neutral-800" test-id="findings-label">
                                {{ t('audit.checklist_section.findings_heading') }}
                            </div>
                            <Can :subjects="['audit_findings']" :actions="['create']">
                                <AppButton
                                    button-style="primary"
                                    type="button"
                                    @click="navigateToAddFinding(question.id)"
                                    test-id="add-finding-button"
                                >
                                    <i class="fa-solid fa-plus"></i>
                                    {{ t('audit.checklist_section.add_finding') }}
                                </AppButton>
                            </Can>
                        </div>

                        <!-- Existing Findings -->
                        <div v-if="getFindingsForQuestion(question.id).length" class="mt-3 flex flex-col gap-2" test-id="findings-list">
                            <div
                                v-for="(finding, findingIndex) in getFindingsForQuestion(question.id)"
                                :key="findingIndex"
                                class="flex items-center justify-between bg-neutral-100 border border-neutral-200 rounded px-3 py-2"
                                test-id="finding-item"
                            >
                                <div>
                                    <div class="text-neutral-900" test-id="finding-title">{{ finding.title }}</div>
                                    <div class="text-xs text-neutral-600 mt-0.5" test-id="finding-classification">
                                        {{ t('audit.checklist_section.classification') }}:
                                        {{ classificationLabel(finding.classification) }}
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <Can :subjects="['audit_findings']" :actions="['update']">
                                        <AppButton
                                            button-style="secondary"
                                            type="button"
                                            @click="navigateToEditFinding(finding)"
                                        >
                                            <span class="flex items-center gap-2">
                                                <i class="fa-regular fa-pen-to-square"></i>
                                                {{ t('audit.checklist_section.edit') }}
                                            </span>
                                        </AppButton>
                                    </Can>
                                    <Can :subjects="['audit_findings']" :actions="['delete']">
                                        <AppButton
                                            :warn-before="t('audit.checklist_section.delete_finding_confirm')"
                                            button-style="neutral"
                                            type="button"
                                            @click="deleteFinding(finding)"
                                        >
                                            <span class="flex items-center gap-2">
                                                <i class="fa-regular fa-trash-can"></i>
                                                {{ t('audit.checklist_section.delete') }}
                                            </span>
                                        </AppButton>
                                    </Can>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="section.subsections && section.subsections.length">
                <ChecklistSection
                    v-for="(sub, subIndex) in section.subsections"
                    :key="sub.id"
                    :root-id="`subsection-${sub.id}`"
                    :section="sub"
                    :title="
                        t('audit.checklist_section.subsection_title', {
                            n: subIndex + 1,
                            name: sub.name || sub.title || ''
                        })
                    "
                    :section-id="sub.id"
                    variant="subsection"
                    :is-collapsed="isCollapsed"
                    :toggle-collapse="toggleCollapse"
                    :get-response-model="getResponseModel"
                    :sync-response-to-store="syncResponseToStore"
                    :navigate-to-add-finding="navigateToAddFinding"
                    :get-findings-for-question="getFindingsForQuestion"
                    :navigate-to-edit-finding="navigateToEditFinding"
                    :delete-finding="deleteFinding"
                    :show-inline-errors="showInlineErrors"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppTextareaForm from '../AppTextareaForm.vue'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import { snakeToCamelCase } from '@/util/util'

defineOptions({ name: 'ChecklistSection' })

const { t } = useI18n()

const classificationLabel = (classification: string | undefined | null) => {
    if (!classification) return ''
    const key = `audit.finding_classification.${classification}`
    const translated = t(key)
    return translated === key ? snakeToCamelCase(classification) : translated
}

/** Maps API question type strings to localized labels for UI (values sent to API stay unchanged). */
const displayQuestionTypeLabel = (type: string | undefined) => {
    if (!type) return ''
    if (type === 'Yes/No/NA') return t('audit.checklist_builder.question_type_yes_no_na')
    if (type === 'Text Input') return t('audit.checklist_builder.question_type_text')
    return type
}

interface SectionLike {
    id: string
    title?: string
    name?: string
    questions?: any[]
    subsections?: SectionLike[]
}

const props = defineProps<{
    section: SectionLike
    title: string
    rootId?: string
    sectionId: string
    variant: 'section' | 'subsection'
    isCollapsed: (id: string) => boolean
    toggleCollapse: (id: string) => void
    getResponseModel: (questionId: string) => any
    syncResponseToStore: (questionId: string, responseData: any) => void
    navigateToAddFinding: (questionId?: string) => void
    getFindingsForQuestion: (questionId: string) => any[]
    navigateToEditFinding: (finding: any) => void
    deleteFinding: (finding: any) => void | Promise<void>
    showInlineErrors?: boolean
}>()

const wrapperClass = computed(() => {
    return props.variant === 'section'
        ? 'bg-neutral-50 border border-neutral-200 rounded-lg'
        : 'border-t border-neutral-200'
})

const headerClass = computed(() => {
    return props.variant === 'section'
        ? 'px-5 py-4 border-b border-neutral-200 flex items-center justify-between cursor-pointer hover:bg-neutral-100 transition-colors'
        : 'px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-neutral-100 transition-colors'
})

const headingTag = computed(() => (props.variant === 'section' ? 'h2' : 'h3'))
const titleClass = computed(() => (props.variant === 'section' ? 'text-base text-neutral-900' : 'text-sm text-neutral-900'))
const contentClass = computed(() => (props.variant === 'section' ? 'divide-y divide-neutral-200 transition-all duration-200' : 'divide-y divide-neutral-200'))
const questionItemClass = computed(() => (props.variant === 'section' ? 'px-5 py-5 flex flex-col gap-3' : 'px-5 py-5 flex flex-col gap-3 bg-white'))

const isCollapsed = (id: string) => props.isCollapsed(id)
const toggleCollapse = (id: string) => props.toggleCollapse(id)
const getResponseModel = (questionId: string) => props.getResponseModel(questionId)
const syncResponseToStore = (questionId: string, responseData: any) => props.syncResponseToStore(questionId, responseData)
const navigateToAddFinding = (questionId?: string) => props.navigateToAddFinding(questionId)
const getFindingsForQuestion = (questionId: string) => props.getFindingsForQuestion(questionId)
const navigateToEditFinding = (finding: any) => props.navigateToEditFinding(finding)
const deleteFinding = (finding: any) => props.deleteFinding(finding)
</script>

<style scoped>
</style>


