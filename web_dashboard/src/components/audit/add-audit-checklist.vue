<template>
    <BreadCrums :crumbs="crums" />
    <main id="main-checklist-definition" class="max-w-4xl mx-auto pt-10 pb-16 px-6">
        <!-- Loading state while fetching checklist definition -->
        <div v-if="loadingChecklistDefinition" class="flex items-center justify-center py-16">
            <Spinner width="5" />
        </div>

        <Form v-else @submit="saveChecklistMeta" @invalid-submit="onInvalidSubmit" :initial-values="form" test-id="checklist-definition-form">
            <section
                id="checklist-meta-block"
                class="bg-white border border-neutral-200 rounded-lg p-8 mb-10"
            >
                <div class="grid grid-cols-1 gap-8">
                    <div class="flex flex-col gap-4">
                        <AppInputForm
                            name="title"
                            :label="t('audit.checklist_builder.title_label')"
                            type="text"
                            :placeholder="t('audit.checklist_builder.title_placeholder')"
                            :rules="(v: string) => (!v?.trim() ? t('audit.checklist_builder.title_required') : true)"
                            :required="true"
                            test-id="checklist-title-input"
                        />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="block text-sm text-neutral-700" for="version">{{
                            t('audit.checklist_builder.version_label')
                        }}</label>
                        <AppInput
                            v-model="form.version"
                            :hide-icon="true"
                            type="text"
                            :placeholder="t('audit.checklist_builder.version_placeholder')"
                            :disabled="true"
                            id="version"
                            test-id="checklist-version-input"
                        />
                    </div>
                    <div class="flex flex-col gap-4 md:col-span-2">
                        <AppTextareaForm
                            name="description"
                            :label="t('audit.checklist_builder.description_label')"
                            :placeholder="t('audit.checklist_builder.description_placeholder')"
                            test-id="checklist-description-input"
                        />
                    </div>
                    <div class="flex flex-col gap-4 md:col-span-2">
                        <label class="text-sm text-neutral-700"
                            >{{ t('audit.checklist_builder.activity_type_label') }}
                            <span class="text-red-700">*</span></label
                        >
                        <div :class="`flex ${!form.activityType && showValidationErrors ? 'ring-1 ring-red-500 rounded-md' : ''}`" test-id="activity-type-select">
                            <Select2
                                v-model="form.activityType"
                                :values="activityTypes"
                                :display="(item: any) => item?.name"
                                :placeholder="t('audit.checklist_builder.activity_type_placeholder')"
                                :disabled="loadingActivityTypes"
                            />
                        </div>
                        <div v-if="!form.activityType && showValidationErrors" class="text-red-600 text-xs mt-1">
                            <p>{{ t('audit.checklist_builder.activity_type_required') }}</p>
                        </div>
                    </div>
                    <div class="flex flex-col gap-4 md:col-span-2" v-if="showTeamSelect">
                        <label class="text-sm text-neutral-700"
                            >{{ t('audit.checklist_builder.org_units_label') }}
                            <span class="text-red-700">*</span></label
                        >
                        <SearcheableMultiSelect
                            v-model="form.teams"
                            :results="teams"
                            :display="(team?: OrganizationUnit) => team?.name || ''"
                            :placeholder="t('admin_org_unit_tree.search_placeholder')"
                        />
                    </div>
                    <div class="flex flex-col items-start gap-4 md:col-span-2">
                        <span class="text-sm text-neutral-700">{{ t('audit.checklist_builder.draft_hint') }}</span>
                        <div class="flex items-center gap-3" v-if="checklistDefinitionId">
                            <span class="text-sm" :class="form.isDraft ? 'text-orange-700' : 'text-green-700'">
                                {{
                                    form.isDraft
                                        ? t('audit.checklist_builder.status_draft')
                                        : t('audit.checklist_builder.status_published')
                                }}
                            </span>
                        </div>
                        <div class="flex items-center gap-3">
                            <AppButton
                                button-style="primary"
                                type="submit"
                                :loading="loading"
                                test-id="save-checklist-button"
                            >
                                {{ t('audit.checklist_builder.save_checklist') }}
                            </AppButton>
                        </div>
                    </div>
                </div>
            </section>

            <section id="sections-area" class="mb-14" v-if="checklistDefinitionId">
                <div class="flex items-center justify-between mb-5">
                    <h3 class="text-base">{{ t('audit.checklist_builder.sections_heading') }}</h3>
                    <Can :actions="['create','update']" subject="audit_checklist_definitions">  
                    <AppButton button-style="primary" @click="addSection" type="button" test-id="add-section-button">
                        <i class="fa-solid fa-plus mr-2"></i>
                        {{ t('audit.checklist_builder.add_section') }}
                    </AppButton>
                    </Can>
                </div>

                <div class="flex flex-col gap-6" id="sections-list">
                    <div
                        v-for="(section, sectionIndex) in sortedSections"
                        :key="section.id"
                        :id="section.id"
                        class="border border-neutral-200 rounded-lg bg-white"
                    >
                        <div
                            class="flex items-center justify-between px-5 py-4 border-b border-neutral-100 cursor-pointer hover:bg-neutral-50 transition-colors"
                            @click="toggleSectionCollapse(section.id)"
                        >
                            <div class="flex items-center gap-2">
                                <button
                                    type="button"
                                    @click.stop="moveSectionUp(sectionIndex)"
                                    :disabled="sectionIndex === 0"
                                    class="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                                    :test-id="`move-section-up-${sectionIndex}`"
                                >
                                    <i class="fa-solid fa-arrow-up"></i>
                                </button>
                                <button
                                    type="button"
                                    @click.stop="moveSectionDown(sectionIndex)"
                                    :disabled="sectionIndex === sortedSections.length - 1"
                                    class="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                                    :test-id="`move-section-down-${sectionIndex}`"
                                >
                                    <i class="fa-solid fa-arrow-down"></i>
                                </button>
                                <div class="flex items-center gap-2">
                                    <i 
                                        class="fa-solid transition-transform duration-200"
                                        :class="isSectionCollapsed(section.id) ? 'fa-chevron-right' : 'fa-chevron-down'"
                                    ></i>
                                    <input
                                        v-if="section.editing"
                                        v-model="section.name"
                                        @blur="validateAndSaveSectionName(section,sectionIndex)"
                                        @keyup.enter="validateAndSaveSectionName(section,sectionIndex)"
                                        @click.stop
                                        class="text-neutral-900 bg-transparent border-b border-neutral-300 focus:outline-none"
                                        :placeholder="t('audit.checklist_builder.placeholder_name')"
                                    />
                                    <span v-else class="text-neutral-900">
                                        {{ section.name }}
                                    </span>
                                </div>
                            </div>  
                            <div class="flex items-center gap-2">
                                <Can :actions="['create','update']" subject="audit_checklist_definitions">
                                <button
                                    type="button"
                                    @click.stop="section.editing = true"
                                    class="text-neutral-700 hover:text-neutral-900"
                                    :title="t('audit.checklist_builder.edit_section')"
                                >
                                    <i class="fa-regular fa-pen-to-square"></i>
                                </button>
                                <button
                                    type="button"
                                    @click.stop="removeSection(sectionIndex)"
                                    class="text-neutral-400 hover:text-neutral-700"
                                    :title="t('audit.checklist_builder.delete_section')"
                                >
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                                </Can>
                            </div>
                        </div>

                        <div 
                            v-show="!isSectionCollapsed(section.id)"
                            class="px-5 py-4 transition-all duration-200"
                        >
                            <div class="mb-3 flex items-center justify-between">
                                <span class="text-neutral-700 text-sm">{{
                                    t('audit.checklist_builder.subsections_label')
                                }}</span>
                                <Can :actions="['create','update']" subject="audit_checklist_definitions">  
                                <div class="flex items-center gap-2">
                                    <AppButton
                                        button-style="secondary"
                                        @click="addSubsection(sectionIndex)"
                                        test-id="add-subsection-button"
                                        type="button"
                                    >
                                        <i class="fa-solid fa-plus mr-1"></i>
                                        {{ t('audit.checklist_builder.add_subsection') }}
                                    </AppButton>
                                    <AppButton
                                        button-style="primary"
                                        @click="addQuestion(sectionIndex)"
                                        type="button"
                                        test-id="add-question-button"
                                    >
                                        <i class="fa-solid fa-plus mr-1"></i>
                                        {{ t('audit.checklist_builder.add_question') }}
                                    </AppButton>
                                </div>
                                </Can>
                            </div>

                            <div v-if="getSortedSubsections(section).length > 0" class="flex flex-col gap-4 mb-6">
                                <div
                                    v-for="(subsection, subIndex) in getSortedSubsections(section)"
                                    :key="subsection.id"
                                    :id="subsection.id"
                                    class="border border-neutral-200 rounded-md"
                                >
                                    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-100"
                                        @click.stop="toggleSectionCollapse(subsection.id)">
                                        <div class="flex items-center gap-2">
                                            <i class="fa-solid transition-transform duration-200"
                                               :class="isSectionCollapsed(subsection.id) ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
                                            <input
                                                v-if="subsection.editing"
                                                v-model="subsection.name"
                                                @blur="validateAndSaveSubsectionName(section, subsection, subIndex)"
                                                @keyup.enter="validateAndSaveSubsectionName(section, subsection, subIndex)"
                                                @click.stop
                                                class="text-neutral-900 bg-transparent border-b border-neutral-300 focus:outline-none"
                                                :placeholder="t('audit.checklist_builder.placeholder_name')"
                                            />
                                            <span v-else class="text-neutral-900">{{ subsection.name }}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <Can :actions="['create','update']" subject="audit_checklist_definitions">
                                            <button
                                                type="button"
                                                @click.stop="subsection.editing = true"
                                                class="text-neutral-700 hover:text-neutral-900"
                                                :title="t('audit.checklist_builder.edit_subsection')"
                                            >
                                                <i class="fa-regular fa-pen-to-square"></i>
                                            </button>
                                            <button
                                                type="button"
                                                @click.stop="removeSubsection(sectionIndex, subIndex)"
                                                class="text-neutral-400 hover:text-neutral-700"
                                                :title="t('audit.checklist_builder.delete_subsection')"
                                            >
                                                <i class="fa-solid fa-trash-can"></i>
                                            </button>
                                            </Can>
                                        </div>
                                    </div>

                                    <div v-show="!isSectionCollapsed(subsection.id)" class="px-4 py-3">
                                        <div class="mb-3 flex items-center justify-between">
                                            <span class="text-neutral-700 text-sm">{{
                                                t('audit.checklist_builder.questions_label')
                                            }}</span>
                                            <Can :actions="['create','update']" subject="audit_checklist_definitions">  
                                            <AppButton button-style="primary" @click="addSubsectionQuestion(sectionIndex, subIndex)" type="button" test-id="add-subsection-question-button">
                                                <i class="fa-solid fa-plus mr-1"></i>
                                                {{ t('audit.checklist_builder.add_question') }}
                                            </AppButton>
                                            </Can>
                                        </div>

                                        <Table
                                            v-if="getSortedQuestions(subsection).length > 0"
                                            :cols="questionTableCols"
                                            :column-labels="questionColumnLabels"
                                            :rows="formatQuestionsForTable(getSortedQuestions(subsection))"
                                            :entities="getSortedQuestions(subsection)"
                                            :page="1"
                                            :total="getSortedQuestions(subsection).length"
                                            :per-page="getSortedQuestions(subsection).length"
                                            :total-pages="1"
                                            :on-next-page="() => {}"
                                            :on-previous-page="() => {}"
                                            :set-page="() => {}"
                                            :on-success="() => {}"
                                            :hide-view="() => true"
                                            :entity-name="t('audit.checklist_builder.entity_question')"
                                            :on-edit="(question) => editSubsectionQuestion(sectionIndex, subIndex, question)"
                                            :handle-delete="(question) => removeSubsectionQuestion(sectionIndex, subIndex, question.id)"
                                            skip-padding
                                        >
                                            <template #extra-field="{ index }">
                                                <div class="flex items-start ml-2">
                                                    <button
                                                        type="button"
                                                        @click="moveSubsectionQuestionUp(sectionIndex, subIndex, index)"
                                                        :disabled="index === 0"
                                                        class="text-neutral-400 hover:text-neutral-700 disabled:opacity-30 p-1 flex items-start justify-start"
                                                        :title="t('audit.checklist_builder.move_up')"
                                                    >
                                                        <i class="fa-solid fa-arrow-up text-sm"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        @click="moveSubsectionQuestionDown(sectionIndex, subIndex, index)"
                                                        class="text-neutral-400 hover:text-neutral-700 p-1"
                                                        :title="t('audit.checklist_builder.move_down')"
                                                    >
                                                        <i class="fa-solid fa-arrow-down text-sm"></i>
                                                    </button>
                                                </div>
                                            </template>
                                        </Table>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-3 flex items-center justify-between">
                                <span class="text-neutral-700 text-sm">{{
                                    t('audit.checklist_builder.questions_label')
                                }}</span>
                            </div>

                            <Table
                                v-if="getSortedQuestions(section).length > 0"
                                :cols="questionTableCols"
                                :column-labels="questionColumnLabels"
                                :rows="formatQuestionsForTable(getSortedQuestions(section))"
                                :entities="getSortedQuestions(section)"
                                :page="1"
                                :total="getSortedQuestions(section).length"
                                :per-page="getSortedQuestions(section).length"
                                :total-pages="1"
                                :on-next-page="() => {}"
                                :on-previous-page="() => {}"
                                :set-page="() => {}"
                                :on-success="() => {}"
                                :hide-view="() => true"
                                :entity-name="t('audit.checklist_builder.entity_question')"
                                :on-edit="(question) => editQuestion(sectionIndex, question)"
                                :handle-delete="
                                    (question) => removeQuestion(sectionIndex, question.id)
                                "
                                skip-padding
                            >
                                <template #extra-field="{ index }">
                                    <div class="flex items-start ml-2">
                                        <button
                                            type="button"
                                            @click="moveQuestionUp(sectionIndex, index)"
                                            :disabled="index === 0"
                                            class="text-neutral-400 hover:text-neutral-700 disabled:opacity-30 p-1 flex items-start justify-start"
                                            :title="t('audit.checklist_builder.move_up')"
                                        >
                                            <i class="fa-solid fa-arrow-up text-sm"></i>
                                        </button>
                                        <button
                                            type="button"
                                            @click="moveQuestionDown(sectionIndex, index)"
                                            :disabled="
                                                index === getSortedQuestions(section).length - 1
                                            "
                                            class="text-neutral-400 hover:text-neutral-700 disabled:opacity-30 p-1 flex items-start justify-start"
                                            :title="t('audit.checklist_builder.move_down')"
                                        >
                                            <i class="fa-solid fa-arrow-down text-sm"></i>
                                        </button>
                                    </div>
                                </template>
                            </Table>

                            <div v-else class="text-center py-8 text-neutral-500">
                                {{ t('audit.checklist_builder.empty_questions_section') }}
                            </div>
                        </div>
                    </div>

                    <div
                        v-if="sortedSections.length === 0"
                        class="text-center py-8 text-neutral-500"
                    >
                        {{ t('audit.checklist_builder.empty_sections') }}
                    </div>
                </div>
            </section>

            <section id="page-actions-block" class="flex items-center gap-4 justify-end">
                <Can :actions="['create','update']" subject="audit_checklist_definitions">
                <AppButton button-style="secondary" @click="handleCancel" type="button" test-id="cancel-checklist-button">
                    {{ t('audit.checklist_builder.cancel') }}
                </AppButton>
                <template v-if="!checklistDefinitionId">
                    <span class="text-sm text-neutral-500" v-if="isAutosaving">{{
                        t('audit.checklist_builder.autosaving')
                    }}</span>
                </template>
                <template v-else>
                    <AppButton
                        v-if="form.isDraft && !isAutosaving"
                        button-style="primary"
                        type="button"
                        :loading="publishing"
                        @click="publishChecklist"
                        test-id="publish-checklist-button"
                    >
                        {{ t('audit.checklist_builder.publish') }}
                    </AppButton>
                </template>
                <span v-if="checklistDefinitionId && isAutosaving" class="text-sm text-neutral-500">{{
                    t('audit.checklist_builder.autosaving')
                }}</span>
                </Can>
            </section>
        </Form>
    </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import AppInputForm from '@/components/AppInputForm.vue'
import AppInput from '@/components/AppInput.vue'
import AppTextareaForm from '@/components/AppTextareaForm.vue'
import Select2 from '@/components/Select2.vue'
import AppButton from '@/components/AppButton.vue'
import Table from '@/components/Table.vue'
import { useRouter, useRoute } from 'vue-router'
import { useDialog } from '@/stores/dialog'
import { useAuthStore } from '@/stores/auth'
import { apiGet, apiPost, apiPut } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'
import QuestionModal from './question-modal.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useToast } from '@/stores/notification'
import { Form, useFieldValue } from 'vee-validate'
import Spinner from '@/components/Spinner.vue'
import BreadCrums from '../breadCrums.vue'
import Can from '@/components/Can.vue'
import SearcheableMultiSelect from '@/components/SearcheableMultiSelect.vue'
import { getOrgUnits } from '@/components/common/endpoints'
import { showTeamPicker, resolveSelectedTeams } from '@/util/teams-feature'
import type { OrganizationUnit } from '@/util/interfaces'

const router = useRouter()
const route = useRoute()
const dialogStore = useDialog()
const authStore = useAuthStore()
const toastStore = useToast()
const { t } = useI18n()

// Edit mode state
const checklistDefinitionId = computed(() => route.params.id as string)

const crums = computed(() => [
    {
        name: t('nav.audit'),
        path: '/check/audits',
        icon: 'fa-solid fa-chart-line'
    },
    {
        name: t('common.settings'),
        path: '/check/audits/settings?tab=3',
        icon: 'fa-solid fa-gear text-neutral-700 text-2xl'
    },
    {
        name: checklistDefinitionId.value
            ? t('audit.checklist_builder.breadcrumb_edit')
            : t('audit.checklist_builder.breadcrumb_add'),
        path: '/check/audits/checklist-definitions/add-checklist'
    }
])
// Form data
const form = reactive({
    title: undefined as string | undefined,
    version: '1.0',
    description: '',
    isDraft: false,
    activityType: null as any,
    teams: [] as any[],
    sections: [] as any[]
})

// Loading state
const loading = ref(false)
const isAutosaving = ref(false)
let autosaveTimer: any
const publishing = ref(false)
const loadingActivityTypes = ref(false)
const loadingTeams = ref(false)
const loadingChecklistDefinition = ref(true)
const showValidationErrors = ref(false)

// Dropdown options
const activityTypes = ref<any[]>([])
const teams = ref<OrganizationUnit[]>([])
const showTeamSelect = computed(() => showTeamPicker(teams.value.length))

const questionTypes = ref([
    { id: 1, name: 'Yes/No/NA' },
    { id: 2, name: 'Text Input' }
])

const questionTypeDisplay = (qt: { name?: string } | null) => {
    if (!qt?.name) return ''
    if (qt.name === 'Yes/No/NA') return t('audit.checklist_builder.question_type_yes_no_na')
    if (qt.name === 'Text Input') return t('audit.checklist_builder.question_type_text')
    return qt.name
}

const questionTableCols = ['question_text', 'type', 'guidance']
const questionColumnLabels = computed(() => ({
    question_text: t('audit.checklist_builder.col_question_text'),
    type: t('audit.checklist_builder.col_type'),
    guidance: t('audit.checklist_builder.col_guidance')
}))

// Loading state for question modal
const questionModalLoading = ref(false)

// Section collapse state
const collapsedSections = ref<Record<string, boolean>>({})

// Toggle section collapse
const toggleSectionCollapse = (sectionId: string) => {
    collapsedSections.value[sectionId] = !collapsedSections.value[sectionId]
}

// Check if section is collapsed
const isSectionCollapsed = (sectionId: string) => {
    return collapsedSections.value[sectionId] || false
}

// API functions
const fetchTeams = async () => {
    loadingTeams.value = true
    try {
        const data = await getOrgUnits('audit_checklist_definitions', authStore)
        teams.value = data || []
        form.teams = resolveSelectedTeams(teams.value)
    } catch (error) {
        console.error('Error fetching teams:', error)
        teams.value = []
    } finally {
        loadingTeams.value = false
    }
}

const fetchActivityTypes = async () => {
    loadingActivityTypes.value = true
    try {
        const url = `/audits/activity-types`
        const data = await apiGet<any[]>(url, authStore)
        activityTypes.value = data
    } catch (error) {
        console.error('Error fetching activity types:', error)
        activityTypes.value = []
    } finally {
        loadingActivityTypes.value = false
    }
}

const generateNextVersion = async () => {
    form.version = '1.0'
}

const fetchChecklistDefinition = async (id: string) => {
    loadingChecklistDefinition.value = true
    try {
        const data = await apiGet<any>(`/audits/checklist-definitions/${id}`, authStore)

        // Populate form with fetched data
        form.title = data.title || undefined
        form.description = data.description
        form.version = data.version
        form.isDraft = !!data.isDraft

        const preferredTeams = data.teams
            ? teams.value.filter((team) =>
                  data.teams.map((item: any) => item.id).includes(team.id)
              )
            : undefined
        form.teams = resolveSelectedTeams(teams.value, preferredTeams)

        if (data.activityType) {
            const activityType = activityTypes.value.find(
                (type) => type.id === data.activityType.id
            )
            if (activityType) {
                form.activityType = activityType
            }
        }

        // Populate sections and questions
        if (data.sections && data.sections.length > 0) {
            form.sections = data.sections.map((section: any) => ({
                id: section.id || `section-${sectionIdCounter++}`,
                name: section.title || '',
                editing: !section.title || !section.title.trim(),
                orderIndex: section.orderIndex || sectionIdCounter,
                questions: section.questions
                    ? section.questions.map((question: any) => ({
                          id: question.id || `question-${questionIdCounter++}`,
                          questionText: question.questionText,
                          questionType:
                              questionTypes.value.find(
                                  (type) => type.name === question.questionType
                              ) || null,
                          reference: question.reference || '',
                          guidanceNotes: question.guidanceNotes || '',
                          orderIndex: question.orderIndex || questionIdCounter++
                      }))
                    : [],
                subsections: (section.subsections || []).map((sub: any) => ({
                    id: sub.id || `subsection-${subsectionIdCounter++}`,
                    name: sub.title || '',
                    editing: !sub.title || !sub.title.trim(),
                    orderIndex: sub.orderIndex || subsectionIdCounter,
                    questions: sub.questions
                        ? sub.questions.map((question: any) => ({
                              id: question.id || `question-${questionIdCounter++}`,
                              questionText: question.questionText,
                              questionType:
                                  questionTypes.value.find(
                                      (type) => type.name === question.questionType
                                  ) || null,
                              reference: question.reference || '',
                              guidanceNotes: question.guidanceNotes || '',
                              orderIndex: question.orderIndex || questionIdCounter++
                          }))
                        : []
                }))
            }))

            // Update counters to avoid ID conflicts
            sectionIdCounter =
                Math.max(
                    sectionIdCounter,
                    ...form.sections.map((s) => parseInt(s.id.split('-')[1]) || 0)
                ) + 1
            const allQuestions = form.sections.flatMap((s) => s.questions)
            if (allQuestions.length > 0) {
                questionIdCounter =
                    Math.max(
                        questionIdCounter,
                        ...allQuestions.map((q) => parseInt(q.id.split('-')[1]) || 0)
                    ) + 1
            }
        }
    } catch (error) {
        console.error('Error fetching checklist definition:', error)
        toastStore.showToast(
            t('audit.checklist_builder.toast_load_failed_title'),
            t('audit.checklist_builder.toast_load_failed_body'),
            'error'
        )
        router.push('/check/audits/settings?tab=3')
    } finally {
        loadingChecklistDefinition.value = false
    }
}

// Computed properties for sorted sections and questions
const sortedSections = computed(() => {
    return [...form.sections].sort((a: any, b: any) => a.orderIndex - b.orderIndex)
})

const getSortedSubsections = (section: any) => {
    return [...(section.subsections || [])].sort((a: any, b: any) => a.orderIndex - b.orderIndex)
}

const getSortedQuestions = (section: any) => {
    return [...section.questions].sort((a: any, b: any) => a.orderIndex - b.orderIndex)
}

// Watchers
// Activity types no longer depend on the selected team

// Lifecycle hooks
onMounted(async () => {
    // Check if there's an ID in the route parameters

    await fetchTeams()
    await fetchActivityTypes()

    if (checklistDefinitionId.value) {
        // Fetch existing checklist definition
        await fetchChecklistDefinition(checklistDefinitionId.value)
    } else {
        // Generate next version for new checklist
        loadingChecklistDefinition.value = false
        await generateNextVersion()
    }
})

// Watcher for sections only (restrict autosave to sections/questions)
watch(
    () => form.sections,
    () => {
        if (loadingChecklistDefinition.value) return
        if (checklistDefinitionId.value) {
            console.log('ss');
            queueAutosave()
        }
    },
    { deep: true }
)
// Refetch when route id changes (e.g., after creating then navigating to /:id/edit)
watch(
    () => checklistDefinitionId.value,
    async (id) => {
        if (id) {
            loadingChecklistDefinition.value = true
            await fetchChecklistDefinition(id)
        }
    }
)

// Reset validation errors when activity type changes
watch(
    () => form.activityType,
    () => {
        if (showValidationErrors.value) {
            showValidationErrors.value = false
        }
    }
)

const getFieldValueById = (id: string): string => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null
    return (el?.value || '').toString().trim()
}

// Removed auto-create flow; checklist is created via Save button explicitly

// Section management
let sectionIdCounter = 1
let questionIdCounter = 1
let subsectionIdCounter = 1

const addSection = async () => {
    const maxOrderIndex =
        form.sections.length > 0 ? Math.max(...form.sections.map((s) => s.orderIndex)) : 0

    form.sections.push({
        id: `section-${sectionIdCounter++}`,
        name: '',
        editing: true,
        orderIndex: maxOrderIndex + 1,
        questions: [],
        subsections: []
    })

    // Ensure the newly added section is expanded and scrolled into center
    const newSection = form.sections[form.sections.length - 1]
    collapsedSections.value[newSection.id] = false

    await nextTick()
    const el = document.getElementById(newSection.id)
    if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
}

const removeSection = (index: number) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('audit.checklist_builder.delete_section_confirm'),
        onConfirm: () => {
            form.sections.splice(index, 1)
            dialogStore.closeDialog()
        },
        onCancel: () => {
            dialogStore.closeDialog()
        }
    })
}

const moveSectionUp = (index: number) => {
    if (index > 0) {
        const currentSection = sortedSections.value[index]
        const previousSection = sortedSections.value[index - 1]

        // Swap order indices
        const tempOrderIndex = currentSection.orderIndex
        currentSection.orderIndex = previousSection.orderIndex
        previousSection.orderIndex = tempOrderIndex
    }
}

const moveSectionDown = (index: number) => {
    if (index < sortedSections.value.length - 1) {
        const currentSection = sortedSections.value[index]
        const nextSection = sortedSections.value[index + 1]

        // Swap order indices
        const tempOrderIndex = currentSection.orderIndex
        currentSection.orderIndex = nextSection.orderIndex
        nextSection.orderIndex = tempOrderIndex
    }
}

// Section name validation
const validateAndSaveSectionName = (section: any, sectionIndex: number) => {
    const trimmedName = section.name?.trim()

    if (!trimmedName) {
        // Keep name empty and stay in editing mode - don't set default name
        section.name = ''
        section.editing = true
        return
    }

    // Check for duplicate section names
    const duplicateSection = form.sections.find(
        (s) => s.id !== section.id && s.name?.toLowerCase() === trimmedName.toLowerCase()
    )

    if (duplicateSection) {
        toastStore.showToast(
            t('audit.checklist_builder.duplicate_section_title'),
            t('audit.checklist_builder.duplicate_section_body'),
            'error'
        )
        // Keep editing mode active so user can fix the name
        return
    }

    section.name = trimmedName
    section.editing = false
}

// Question management
const addQuestion = (sectionIndex: number) => {
    // Find the actual section in form.sections array
    const sortedSection = sortedSections.value[sectionIndex]
    const actualSectionIndex = form.sections.findIndex((s) => s.id === sortedSection.id)
    const section = form.sections[actualSectionIndex]

    const maxOrderIndex =
        section.questions.length > 0
            ? Math.max(...section.questions.map((q: any) => q.orderIndex))
            : 0

    dialogStore.openDialog(QuestionModal, {
        isEditMode: false,
        questionTypes: questionTypes.value,
        loading: questionModalLoading,
        onClose: dialogStore.closeDialog,
        onSubmit: (data: any) => {
            // Check for duplicate question names within the same section
            const existingQuestion = section.questions.find(
                (q: any) => q.questionText?.toLowerCase() === data.questionText?.toLowerCase()
            )

            if (existingQuestion) {
                toastStore.showToast(
                    t('audit.checklist_builder.duplicate_question_title'),
                    t('audit.checklist_builder.duplicate_question_section'),
                    'error'
                )
                return
            }

            const questionData = {
                ...data,
                id: `question-${questionIdCounter++}`,
                orderIndex: maxOrderIndex + 1
            }
            form.sections[actualSectionIndex].questions.push(questionData)
            dialogStore.closeDialog()
        }
    })
}

const editQuestion = (sectionIndex: number, question: any) => {
    // Find the actual section in form.sections array
    const sortedSection = sortedSections.value[sectionIndex]
    const actualSectionIndex = form.sections.findIndex((s) => s.id === sortedSection.id)
    const questionIndex = form.sections[actualSectionIndex].questions.findIndex(
        (q: any) => q.id === question.id
    )

    dialogStore.openDialog(QuestionModal, {
        isEditMode: true,
        initialData: { ...question },
        questionTypes: questionTypes.value,
        loading: questionModalLoading,
        onClose: dialogStore.closeDialog,
        onSubmit: (data: any) => {
            // Check for duplicate question names within the same section (excluding current question)
            const existingQuestion = form.sections[actualSectionIndex].questions.find(
                (q: any) =>
                    q.id !== question.id &&
                    q.questionText?.toLowerCase() === data.questionText?.toLowerCase()
            )

            if (existingQuestion) {
                toastStore.showToast(
                    t('audit.checklist_builder.duplicate_question_title'),
                    t('audit.checklist_builder.duplicate_question_section'),
                    'error'
                )
                return
            }

            form.sections[actualSectionIndex].questions[questionIndex] = {
                ...data
            }
            dialogStore.closeDialog()
        }
    })
}

const removeQuestion = (sectionIndex: number, questionId: string) => {
    // Find the actual section in form.sections array
    dialogStore.openDialog(ConfirmDialog, {
        message: t('audit.checklist_builder.delete_question_confirm'),
        onConfirm: () => {
            const sortedSection = sortedSections.value[sectionIndex]
            const actualSectionIndex = form.sections.findIndex((s) => s.id === sortedSection.id)
            const questionIndex = form.sections[actualSectionIndex].questions.findIndex(
                (q: any) => q.id === questionId
            )
            if (questionIndex > -1) {
                form.sections[actualSectionIndex].questions.splice(questionIndex, 1)
            }
            dialogStore.closeDialog()
        },
        onCancel: () => {
            dialogStore.closeDialog()
        }
    })
}

const moveQuestionUp = (sectionIndex: number, questionIndex: number) => {
    if (questionIndex > 0) {
        // Find the actual section in form.sections array
        const sortedSection = sortedSections.value[sectionIndex]
        const actualSectionIndex = form.sections.findIndex((s) => s.id === sortedSection.id)
        const sortedQuestions = getSortedQuestions(sortedSection)

        const currentQuestion = sortedQuestions[questionIndex]
        const previousQuestion = sortedQuestions[questionIndex - 1]

        // Swap order indices
        const tempOrderIndex = currentQuestion.orderIndex
        currentQuestion.orderIndex = previousQuestion.orderIndex
        previousQuestion.orderIndex = tempOrderIndex
    }
}

const moveQuestionDown = (sectionIndex: number, questionIndex: number) => {
    // Find the actual section in form.sections array
    const sortedSection = sortedSections.value[sectionIndex]
    const actualSectionIndex = form.sections.findIndex((s) => s.id === sortedSection.id)
    const sortedQuestions = getSortedQuestions(sortedSection)

    if (questionIndex < sortedQuestions.length - 1) {
        const currentQuestion = sortedQuestions[questionIndex]
        const nextQuestion = sortedQuestions[questionIndex + 1]

        // Swap order indices
        const tempOrderIndex = currentQuestion.orderIndex
        currentQuestion.orderIndex = nextQuestion.orderIndex
        nextQuestion.orderIndex = tempOrderIndex
    }
}

// Subsection management and questions within subsection
const addSubsection = async (sectionIndex: number) => {
    const sortedSection = sortedSections.value[sectionIndex]
    const actualSectionIndex = form.sections.findIndex((s) => s.id === sortedSection.id)
    const section = form.sections[actualSectionIndex]

    const maxOrderIndex =
        (section.subsections?.length || 0) > 0
            ? Math.max(...section.subsections.map((s: any) => s.orderIndex))
            : 0

    const newSub = {
        id: `subsection-${subsectionIdCounter++}`,
        name: '',
        editing: true,
        orderIndex: maxOrderIndex + 1,
        questions: [] as any[]
    }
    if (!section.subsections) section.subsections = []
    section.subsections.push(newSub)
    await nextTick()
    const el = document.getElementById(newSub.id)
    if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
}

const removeSubsection = (sectionIndex: number, subIndex: number) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('audit.checklist_builder.delete_subsection_confirm'),
        onConfirm: () => {
            const sortedSection = sortedSections.value[sectionIndex]
            const actualSectionIndex = form.sections.findIndex((s) => s.id === sortedSection.id)
            form.sections[actualSectionIndex].subsections.splice(subIndex, 1)
            dialogStore.closeDialog()
        },
        onCancel: () => {
            dialogStore.closeDialog()
        }
    })
}

const validateAndSaveSubsectionName = (section: any, subsection: any, subIndex: number) => {
    const trimmedName = (subsection.name || '').toString().trim()
    if (!trimmedName) {
        // Keep name empty and stay in editing mode - don't set default name
        subsection.name = ''
        subsection.editing = true
        return
    }
    const duplicate = (section.subsections || []).find(
        (s: any, idx: number) => idx !== subIndex && s.name?.toLowerCase() === trimmedName.toLowerCase()
    )
    if (duplicate) {
        toastStore.showToast(
            t('audit.checklist_builder.duplicate_subsection_title'),
            t('audit.checklist_builder.duplicate_subsection_body'),
            'error'
        )
        return
    }
    subsection.name = trimmedName
    subsection.editing = false
}

const addSubsectionQuestion = (sectionIndex: number, subIndex: number) => {
    const sortedSection = sortedSections.value[sectionIndex]
    const actualSectionIndex = form.sections.findIndex((s) => s.id === sortedSection.id)
    const subsection = form.sections[actualSectionIndex].subsections[subIndex]

    const maxOrderIndex =
        subsection.questions.length > 0
            ? Math.max(...subsection.questions.map((q: any) => q.orderIndex))
            : 0

    dialogStore.openDialog(QuestionModal, {
        isEditMode: false,
        questionTypes: questionTypes.value,
        loading: questionModalLoading,
        onClose: dialogStore.closeDialog,
        onSubmit: (data: any) => {
            const existingQuestion = subsection.questions.find(
                (q: any) => q.questionText?.toLowerCase() === data.questionText?.toLowerCase()
            )
            if (existingQuestion) {
                toastStore.showToast(
                    t('audit.checklist_builder.duplicate_question_title'),
                    t('audit.checklist_builder.duplicate_question_subsection'),
                    'error'
                )
                return
            }

            const questionData = {
                ...data,
                id: `question-${questionIdCounter++}`,
                orderIndex: maxOrderIndex + 1
            }
            subsection.questions.push(questionData)
            dialogStore.closeDialog()
        }
    })
}

const editSubsectionQuestion = (sectionIndex: number, subIndex: number, question: any) => {
    const sortedSection = sortedSections.value[sectionIndex]
    const actualSectionIndex = form.sections.findIndex((s) => s.id === sortedSection.id)
    const subsection = form.sections[actualSectionIndex].subsections[subIndex]
    const questionIndex = subsection.questions.findIndex((q: any) => q.id === question.id)

    dialogStore.openDialog(QuestionModal, {
        isEditMode: true,
        initialData: { ...question },
        questionTypes: questionTypes.value,
        loading: questionModalLoading,
        onClose: dialogStore.closeDialog,
        onSubmit: (data: any) => {
            const existingQuestion = subsection.questions.find(
                (q: any) => q.id !== question.id && q.questionText?.toLowerCase() === data.questionText?.toLowerCase()
            )
            if (existingQuestion) {
                toastStore.showToast(
                    t('audit.checklist_builder.duplicate_question_title'),
                    t('audit.checklist_builder.duplicate_question_subsection'),
                    'error'
                )
                return
            }
            subsection.questions[questionIndex] = {
                ...data
            }
            dialogStore.closeDialog()
        }
    })
}

const removeSubsectionQuestion = (sectionIndex: number, subIndex: number, questionId: string) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('audit.checklist_builder.delete_question_confirm'),
        onConfirm: () => {
            const sortedSection = sortedSections.value[sectionIndex]
            const actualSectionIndex = form.sections.findIndex((s) => s.id === sortedSection.id)
            const subsection = form.sections[actualSectionIndex].subsections[subIndex]
            const questionIndex = subsection.questions.findIndex((q: any) => q.id === questionId)
            if (questionIndex > -1) {
                subsection.questions.splice(questionIndex, 1)
            }
            dialogStore.closeDialog()
        },
        onCancel: () => {
            dialogStore.closeDialog()
        }
    })
}

const moveSubsectionQuestionUp = (sectionIndex: number, subIndex: number, questionIndex: number) => {
    if (questionIndex > 0) {
        const sortedSection = sortedSections.value[sectionIndex]
        const actualSectionIndex = form.sections.findIndex((s) => s.id === sortedSection.id)
        const subsection = form.sections[actualSectionIndex].subsections[subIndex]
        const sortedQuestions = getSortedQuestions(subsection)

        const currentQuestion = sortedQuestions[questionIndex]
        const previousQuestion = sortedQuestions[questionIndex - 1]
        const tempOrderIndex = currentQuestion.orderIndex
        currentQuestion.orderIndex = previousQuestion.orderIndex
        previousQuestion.orderIndex = tempOrderIndex
    }
}

const moveSubsectionQuestionDown = (sectionIndex: number, subIndex: number, questionIndex: number) => {
    const sortedSection = sortedSections.value[sectionIndex]
    const actualSectionIndex = form.sections.findIndex((s) => s.id === sortedSection.id)
    const subsection = form.sections[actualSectionIndex].subsections[subIndex]
    const sortedQuestions = getSortedQuestions(subsection)

    if (questionIndex < sortedQuestions.length - 1) {
        const currentQuestion = sortedQuestions[questionIndex]
        const nextQuestion = sortedQuestions[questionIndex + 1]
        const tempOrderIndex = currentQuestion.orderIndex
        currentQuestion.orderIndex = nextQuestion.orderIndex
        nextQuestion.orderIndex = tempOrderIndex
    }
}

// Format questions for table display
const formatQuestionsForTable = (questions: any[]) => {
    return questions.map((question: any) => ({
        id: question.id,
        question_text: question.questionText,
        type: question.questionType ? questionTypeDisplay(question.questionType) : t('audit.checklist_builder.not_set'),
        guidance: question.guidanceNotes || t('audit.checklist_builder.no_guidance')
    }))
}

// Autosave logic for edit mode: saves entire definition sections/questions as DRAFT version
const queueAutosave = () => {
    if (!checklistDefinitionId.value) return
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => autosaveDraft(), 800)
}

const autosaveDraft = async () => {
    if (!checklistDefinitionId.value) return
    try {
        isAutosaving.value = true
    const payload = {
        sections: form.sections.map((section) => ({
            title: section.name?.trim() || '',
            orderIndex: section.orderIndex,
            questions: section.questions.map((question: any) => ({
                questionText: question.questionText,
                questionType: question.questionType?.name,
                reference: question.reference,
                guidanceNotes: question.guidanceNotes,
                orderIndex: question.orderIndex
            })),
            subsections: (section.subsections || []).map((sub: any) => ({
                title: sub.name?.trim() || '',
                orderIndex: sub.orderIndex,
                questions: sub.questions.map((question: any) => ({
                    questionText: question.questionText,
                    questionType: question.questionType?.name,
                    reference: question.reference,
                    guidanceNotes: question.guidanceNotes,
                    orderIndex: question.orderIndex
                }))
            }))
        }))
    }
        const res = await apiPut<{ id: string; version: string }>(
            `/audits/checklist-definitions/${checklistDefinitionId.value}`,
            payload,
            authStore
        )
        // Backend will create or reuse a DRAFT; reflect locally
        if (res?.version) {
            form.version = res.version
        }
        if (!form.isDraft) {
            form.isDraft = true
        }
    } catch (e) {
        // silent fail for autosave
    } finally {
        isAutosaving.value = false
    }
}

// Validate checklist before publishing
const validateChecklistForPublish = (): { isValid: boolean; errorMessage: string; scrollToId?: string } => {
    // Check if there's at least one section
    if (!form.sections || form.sections.length === 0) {
        return {
            isValid: false,
            errorMessage: t('audit.checklist_builder.publish_err_no_sections')
        }
    }

    // Check for duplicate section names
    const sectionNames = new Map<string, { index: number; id: string }>()
    for (let i = 0; i < form.sections.length; i++) {
        const section = form.sections[i]
        if (section.name && section.name.trim()) {
            const normalizedName = section.name.trim().toLowerCase()
            if (sectionNames.has(normalizedName)) {
                // Return the first duplicate section's ID to scroll to
                const firstDuplicate = sectionNames.get(normalizedName)
                return {
                    isValid: false,
                    errorMessage: t('audit.checklist_builder.publish_err_duplicate_section', {
                        name: section.name
                    }),
                    scrollToId: firstDuplicate?.id
                }
            }
            sectionNames.set(normalizedName, { index: i, id: section.id })
        }
    }

    // Validate each section
    for (let i = 0; i < form.sections.length; i++) {
        const section = form.sections[i]
        
        // Check if section has a name
        if (!section.name || !section.name.trim()) {
            return {
                isValid: false,
                errorMessage: t('audit.checklist_builder.publish_err_section_no_title', { n: i + 1 })
            }
        }

        // Check if section has subsections
        if (section.subsections && section.subsections.length > 0) {
            // Check for duplicate subsection names within the same section
            const subsectionNames = new Map<string, { index: number; id: string }>()
            for (let j = 0; j < section.subsections.length; j++) {
                const subsection = section.subsections[j]
                
                // Check if subsection has a name
                if (!subsection.name || !subsection.name.trim()) {
                    return {
                        isValid: false,
                        errorMessage: t('audit.checklist_builder.publish_err_subsection_no_title', {
                            m: j + 1,
                            section: section.name
                        })
                    }
                }

                // Check for duplicate subsection names
                const normalizedSubName = subsection.name.trim().toLowerCase()
                if (subsectionNames.has(normalizedSubName)) {
                    // Return the first duplicate subsection's ID to scroll to
                    const firstDuplicate = subsectionNames.get(normalizedSubName)
                    return {
                        isValid: false,
                        errorMessage: t('audit.checklist_builder.publish_err_duplicate_subsection', {
                            name: subsection.name,
                            section: section.name
                        }),
                        scrollToId: firstDuplicate?.id
                    }
                }
                subsectionNames.set(normalizedSubName, { index: j, id: subsection.id })

                // Check if subsection has at least one question
                if (!subsection.questions || subsection.questions.length === 0) {
                    return {
                        isValid: false,
                        errorMessage: t('audit.checklist_builder.publish_err_subsection_needs_question', {
                            subsection: subsection.name,
                            section: section.name
                        })
                    }
                }
            }
        } else {
            // If no subsections, section must have at least one question
            if (!section.questions || section.questions.length === 0) {
                return {
                    isValid: false,
                    errorMessage: t('audit.checklist_builder.publish_err_section_needs_question', {
                        section: section.name
                    })
                }
            }
        }
    }

    return { isValid: true, errorMessage: '' }
}

// Publish current draft
const publishChecklist = async () => {
    if (!checklistDefinitionId.value || !form.isDraft) return
    
    // Validate checklist before publishing
    const validation = validateChecklistForPublish()
    if (!validation.isValid) {
        toastStore.showToast(t('audit.checklist_builder.publish_validation_title'), validation.errorMessage, 'error')
        
        // Scroll to duplicate section/subsection if error is about duplicates
        if (validation.scrollToId) {
            await nextTick()
            const element = document.getElementById(validation.scrollToId)
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                // Expand the section/subsection if it's collapsed
                if (collapsedSections.value[validation.scrollToId]) {
                    collapsedSections.value[validation.scrollToId] = false
                }
            }
        }
        return
    }

    try {
        publishing.value = true
        await apiPut(`/audits/checklist-definitions/${checklistDefinitionId.value}/publish`, {}, authStore)
        form.isDraft = false
        toastStore.showToast(t('audit.checklist_builder.toast_published_title'), t('audit.checklist_builder.toast_published_body'), 'success')
        router.push('/check/audits/settings?tab=3')
    } catch (error: any) {
        toastStore.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') || t('audit.checklist_builder.toast_publish_failed'),
            'error'
        )
    } finally {
        publishing.value = false
    }
}

const handleCancel = () => {
    // Handle cancel action (redirect back, show confirmation dialog, etc.)
    router.push('/check/audits/settings?tab=3')
}

const onInvalidSubmit = () => {
    showValidationErrors.value = true
}

// Save checklist metadata (create if not exists, update if exists)
const saveChecklistMeta = async () => {
    showValidationErrors.value = true
    
    const titleRef = useFieldValue<string>('title')
    const descriptionRef = useFieldValue<string>('description')
    const title = (getFieldValueById('title') || titleRef?.value || (form.title as string) || '').toString().trim()
    const description = (getFieldValueById('description') || descriptionRef?.value || (form.description as string) || '').toString()

    if (!form.teams || form.teams.length === 0) {
        toastStore.showToast(t('common.error'), t('audit.validation.org_units_required'), 'error')
        return
    }

    if (!form.activityType?.id) {
        return
    }

    loading.value = true
    try {
        if (checklistDefinitionId.value) {
            const res = await apiPut<{ id: string; version: string }>(
                `/audits/checklist-definitions/${checklistDefinitionId.value}`,
                {
                    title,
                    description,
                    activityTypeId: form.activityType?.id,
                    teamIds: (form.teams || []).map((u: any) => u.id),
                    includeChildren: false
                },
                authStore
            )
            if (res?.id) {
                fetchChecklistDefinition(res.id)
            }
            toastStore.showToast(t('audit.checklist_builder.toast_saved_title'), t('audit.checklist_builder.toast_saved_body'), 'success')
        } else {
            const res = await apiPost<{ id: string }>(
                '/audits/checklist-definitions',
                {
                    title,
                    description,
                    isDraft: true,
                    activityTypeId: form.activityType?.id,
                    teamIds: (form.teams || []).map((u: any) => u.id),
                    includeChildren: false
                },
                authStore
            )
            toastStore.showToast(t('audit.checklist_builder.toast_created_title'), t('audit.checklist_builder.toast_created_body'), 'success')
            if (res?.id) {
                router.replace(`/check/audits/checklist-definitions/${res.id}/edit`)
            }
        }
    } catch (error: any) {
        toastStore.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') || t('audit.checklist_builder.toast_save_failed'),
            'error'
        )
    } finally {
        loading.value = false
    }
}
</script>
