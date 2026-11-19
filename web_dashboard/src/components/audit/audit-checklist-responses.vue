<template>
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
        <Spinner width="8" />
    </div>

    <div v-else class="min-h-screen bg-neutral-50 p-4 sm:p-6 lg:p-8" test-id="checklist-responses-wrapper">
        <div class="max-w-4xl mx-auto flex flex-col gap-6">
            <slot />
            <Form
                v-if="checklistData"
                @submit="saveProgress"
                id="checklist-form"
                class="flex flex-col gap-6"
                ref="formRef"
            >
                <!-- Multiple Checklists -->
                <div
                    v-for="(cl, clIndex) in checklistData.checklists"
                    :key="cl.checklistDefinition.id"
                    class="bg-white border border-neutral-200 rounded-lg"
                    test-id="checklist-card"
                >
                    <!-- Checklist Header / Summary (foldable) -->
                    <div
                        class="p-4 flex items-center justify-between cursor-pointer"
                        @click="toggleChecklistCollapse(cl.checklistDefinition.id)"
                        test-id="checklist-header"
                    >
                        <div>
                            <h2
                                class="text-lg font-medium text-neutral-900"
                                test-id="checklist-title"
                            >
                                {{ Number(clIndex) + 1 }}. {{ cl.checklistDefinition.title }} (v{{
                                    cl.checklistDefinition.version
                                }})
                            </h2>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-neutral-900">
                                {{ cl.completionPercentage || 0 }}%
                            </div>
                            <div class="text-xs text-neutral-500">
                                {{
                                    t('audit.checklist_responses.answered_of', {
                                        answered: cl.answeredQuestions || 0,
                                        total: cl.totalQuestions || 0
                                    })
                                }}
                            </div>
                        </div>
                    </div>

                    <div v-show="!isChecklistCollapsed(cl.checklistDefinition.id)" class="border-t border-neutral-200 p-4">
                        <div
                            v-if="isReadOnly"
                            class="mb-4 rounded-md border border-yellow-200 bg-yellow-50 text-yellow-800 p-3 text-sm"
                        >
                            {{
                                t('audit.checklist_responses.read_only', {
                                    status: formattedStatus
                                })
                            }}
                        </div>

                        <div :class="isReadOnly ? 'opacity-50 pointer-events-none' : ''">
                            <ChecklistSection
                                v-for="(section, sectionIndex) in toDisplaySections(cl.sections)"
                                :key="section.id"
                                :root-id="`cl-${clIndex}-section-${sectionIndex + 1}`"
                                :section="section"
                                :title="
                                    t('audit.checklist_responses.section_title', {
                                        n: sectionIndex + 1,
                                        title: section.title
                                    })
                                "
                                :section-id="section.id"
                                variant="section"
                                :is-collapsed="isSectionCollapsed"
                                :toggle-collapse="toggleSectionCollapse"
                                :get-response-model="getResponseModel"
                                :sync-response-to-store="syncResponseToStore"
                                :navigate-to-add-finding="navigateToAddFinding"
                                :get-findings-for-question="getFindingsForQuestion"
                                :navigate-to-edit-finding="navigateToEditFinding"
                                :delete-finding="deleteFinding"
                                :show-inline-errors="props.showInlineErrors"
                            />
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div
                    id="checklist-actions"
                    :class="isReadOnly ? 'opacity-50 pointer-events-none' : 'bg-white border border-neutral-200 rounded-lg p-6'"
                    test-id="checklist-actions"
                >
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <Can :actions="['create','update']" subject="audit_checklist_responses">
                        <form class="flex items-end gap-2" @submit.prevent="findEvidence">
                            <label class="flex flex-col gap-1 text-sm text-neutral-700">
                                {{ t('audit.checklist_responses.find_evidence_source') }}
                                <AppInput v-model="evidenceSource" hide-icon test-id="find-evidence-source" />
                            </label>
                            <AppButton
                                button-style="secondary"
                                type="button"
                                :loading="startingEvidence"
                                test-id="find-evidence-button"
                                @click="findEvidence"
                            >
                                {{ t('audit.checklist_responses.find_evidence') }}
                            </AppButton>
                        </form>
                        </Can>
                        <Can :actions="['create','update']" subject="audit_checklist_responses">
                        <AppButton
                            @click="() => router.push(`/check/audits/${programId}`)"
                            button-style="secondary"
                            type="button"
                            test-id="checklist-cancel-button"
                        >
                            {{ t('audit.checklist_responses.cancel') }}
                        </AppButton>
                        <AppButton
                            :loading="saving"
                            button-style="primary"
                            type="submit"
                            :disabled="isReadOnly"
                            test-id="checklist-save-progress-button"
                        >
                            {{ t('audit.checklist_responses.save_progress') }}
                        </AppButton>
                        </Can>
                    </div>
                </div>
            </Form>

            <!-- No Data State -->
            <div v-else class="bg-white border border-neutral-200 rounded-lg p-8 text-center">
                <div class="text-neutral-500">
                    <i class="fa-regular fa-clipboard-list text-4xl mb-4"></i>
                    <div class="text-lg font-medium mb-2">{{ t('audit.checklist_responses.no_data_title') }}</div>
                    <div class="text-sm">
                        {{ t('audit.checklist_responses.no_data_body') }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useChecklistResponseStore } from '../../stores/checklistResponseStore'
import { useRouter, useRoute } from 'vue-router'
import { apiGet, apiCall } from '../../util/api'
import { useToast } from '@/stores/notification'
import { snakeToCamelCase, formatApiErrorMessage } from '@/util/util'
import { Form } from 'vee-validate'
import AppButton from '../AppButton.vue'
import AppInput from '../AppInput.vue'
import { createIntegration, listIntegrations } from '../integrations/endpoints'
import { integrationPath } from '../integrations/routes'
import Spinner from '../Spinner.vue'
import Can from '../Can.vue'
import ChecklistSection from './ChecklistSection.vue'

// Props
interface Props {
    auditInstanceId: string
    instanceStatus?: string
    showInlineErrors?: boolean
}

const props = defineProps<Props>()

const { t } = useI18n()

// Store
const authStore = useAuthStore()
const checklistResponseStore = useChecklistResponseStore()
const toast = useToast()
const router = useRouter()
const route = useRoute()

// Reactive data
const loading = ref(true)
const saving = ref(false)
const evidenceSource = ref('Slack')
const startingEvidence = ref(false)
const error = ref('')
const checklistData = ref<any>(null)
const responses = reactive<Record<string, any>>({})
const originalResponses = reactive<Record<string, any>>({})
const collapsedSections = ref<Record<string, boolean>>({})
const collapsedChecklists = ref<Record<string, boolean>>({})
const previousInstanceId = ref<string | null>(null)

// Form instance for watching values
const formRef = ref<any>(null)

// Get program ID from route params for navigation
const programId = computed(() => route.params.id)

// Read-only when instance is ON_HOLD, COMPLETED, or CANCELLED
const isReadOnly = computed(() => {
    const status = props.instanceStatus || checklistData.value?.auditInstance?.status
    return status === 'ON_HOLD' || status === 'COMPLETED' || status === 'CANCELLED'
})

// Format status for display
const formattedStatus = computed(() => {
    const status = props.instanceStatus || checklistData.value?.auditInstance?.status || ''
    if (!status) return ''
    const key = `audit.main.status.${status}`
    const translated = t(key)
    return translated === key ? snakeToCamelCase(status) : translated
})

// Toggle section collapse
const toggleSectionCollapse = (sectionId: string) => {
    collapsedSections.value[sectionId] = !collapsedSections.value[sectionId]
}

// Check if section is collapsed
const isSectionCollapsed = (sectionId: string) => {
    return collapsedSections.value[sectionId] || false
}

// Toggle checklist collapse
const toggleChecklistCollapse = (checklistId: string) => {
    collapsedChecklists.value[checklistId] = !collapsedChecklists.value[checklistId]
}
const isChecklistCollapsed = (checklistId: string) => {
    return collapsedChecklists.value[checklistId] || false
}

// Types for better structure
interface ChecklistResponse {
    id?: string
    responseAnswer?: string
    auditorObservation?: string
    auditInstanceId: string
    questionDefinitionId: string
}

// Helper to compute display sections per checklist
const toDisplaySections = (sectionsInput: any[]) => {
    const sections = (sectionsInput || []) as any[]
    if (!sections.length) return [] as any[]
    const sortedRoots = sections.slice().sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
    return sortedRoots.map((root: any) => {
        const sortedSubs = (root.subsections || [])
            .slice()
            .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
        return { ...root, subsections: sortedSubs }
    })
}

interface ApiResponse<T> {
    data: T
    message?: string
    success?: boolean
}

// Initialize responses, originals, and findings recursively for a section and its children
const initializeSection = (section: any) => {
    section.questions?.forEach((question: any) => {
        const storedResponse = checklistResponseStore.findResponseByQuestionId(question.id, props.auditInstanceId)

        const responseData = {
            id: question.response?.id || storedResponse?.id || null,
            responseAnswer:
                storedResponse?.responseAnswer ||
                question.response?.responseAnswer ||
                '',
            auditorObservation:
                storedResponse?.auditorObservation ||
                question.response?.auditorObservation ||
                '',
            auditInstanceId: props.auditInstanceId,
            questionDefinitionId: question.id,
            respondedByTeamMemberId:
                storedResponse?.respondedByTeamMemberId ||
                question.response?.respondedByTeamMemberId
        }

        responses[question.id] = responseData

        originalResponses[question.id] = {
            responseAnswer: question.response?.responseAnswer || '',
            auditorObservation: question.response?.auditorObservation || ''
        }

        if (question.response?.auditFindings && question.response.auditFindings.length > 0) {
            question.response.auditFindings.forEach((finding: any) => {
                const existingFinding = checklistResponseStore.findFindingsByQuestionId(
                    question.id,
                    props.auditInstanceId
                ).find((f) => f.id === finding.id)

                if (!existingFinding) {
                    const findingToAdd = {
                        id: finding.id,
                        title: finding.title,
                        description: finding.description,
                        classification: finding.classification,
                        severity: finding.severity,
                        raisedNc: !!finding.raisedNc,
                        linkedNcId: finding.linkedNcId || finding.nonConformity?.id || null,
                        questionId: question.id,
                        auditInstanceId: props.auditInstanceId,
                        evidences: finding.evidences,
                        files: []
                    }
                    checklistResponseStore.addFinding(findingToAdd)
                } else {
                    // Keep NC link in sync when reloading checklist from API
                    checklistResponseStore.updateFinding(
                        {
                            ...existingFinding,
                            raisedNc: !!finding.raisedNc,
                            linkedNcId:
                                finding.linkedNcId ||
                                finding.nonConformity?.id ||
                                existingFinding.linkedNcId ||
                                null
                        },
                        existingFinding.title,
                        existingFinding.id
                    )
                }
            })
        }
    })

    section.subsections?.forEach((sub: any) => initializeSection(sub))
}

// Watch for instance ID changes and clear store when switching instances
watch(
    () => props.auditInstanceId,
    (newInstanceId, oldInstanceId) => {
        if (oldInstanceId && oldInstanceId !== newInstanceId) {
            // Switching to a different instance - clear the old one
            checklistResponseStore.clearAllForInstance(oldInstanceId)
        }
    },
    { immediate: false }
)

// Fetch data on component mount
onMounted(async () => {
    // Don't clear on mount - preserve existing data when navigating back to the same instance
    // The watch above will handle clearing when switching instances
    previousInstanceId.value = props.auditInstanceId
    await fetchChecklistData()
})

// Clear store data when component unmounts (only if navigating away from this instance)
onUnmounted(() => {
    // Don't clear on unmount - preserve data when navigating away temporarily (e.g., to add finding page)
    // The watch will handle clearing when actually switching instances
})

const fetchChecklistData = async (clear = false) => {
    try {
        loading.value = true
        error.value = ''

        const data = (await apiGet(
            `/audits/instances/${props.auditInstanceId}/checklist-responses-grouped`,
            authStore
        )) as ApiResponse<any>

        checklistData.value = data
        if (clear) {
            checklistResponseStore.clearFindings()
        }
        // Initialize response objects for all questions across all checklists
        if (checklistData.value?.checklists) {
            checklistData.value.checklists.forEach((cl: any) => {
                (cl.sections || []).forEach((section: any) => initializeSection(section))
            })
        }
    } catch (err: any) {
        console.error('Error in fetchChecklistData:', err)
        error.value =
            formatApiErrorMessage(err?.response?.data, t, 'errors.audit') ||
            err.message ||
            t('audit.checklist_responses.toast_fetch_failed_body')
        toast.showToast(t('audit.checklist_responses.toast_load_title'), error.value, 'error')
    } finally {
        loading.value = false
    }
}

const getResponseModel = (questionId: string) => {
    if (!responses[questionId]) {
        responses[questionId] = {
            id: null,
            responseAnswer: '',
            auditorObservation: '',
            auditInstanceId: props.auditInstanceId,
            questionDefinitionId: questionId
        }
    }
    return responses[questionId]
}

// Sync response changes to store
const syncResponseToStore = (questionId: string, responseData: ChecklistResponse) => {
    const existingResponse = checklistResponseStore.findResponseByQuestionId(questionId, props.auditInstanceId)

    if (existingResponse) {
        checklistResponseStore.updateResponse(responseData, questionId)
    } else {
        checklistResponseStore.addResponse(responseData)
    }
}

// Debounced sync function to prevent too many store updates
let syncTimeout: NodeJS.Timeout | null = null
const debouncedSyncToStore = () => {
    if (syncTimeout) {
        clearTimeout(syncTimeout)
    }

    syncTimeout = setTimeout(() => {
        syncFormValuesToStore()
    }, 300) // 300ms debounce
}

// Sync current form values to store
const syncFormValuesToStore = async () => {
    if (!formRef.value) return
    await nextTick()

    try {
        const formValues = formRef.value.values || {}

        // Update responses with current form values
        Object.keys(formValues).forEach((fieldName) => {
            if (fieldName.startsWith('responseAnswer_')) {
                const questionId = fieldName.replace('responseAnswer_', '')
                const responseModel = getResponseModel(questionId)
                responseModel.responseAnswer = formValues[fieldName] || ''
                syncResponseToStore(questionId, responseModel)
            } else if (fieldName.startsWith('auditorObservation_')) {
                const questionId = fieldName.replace('auditorObservation_', '')
                const responseModel = getResponseModel(questionId)
                responseModel.auditorObservation = formValues[fieldName] || ''
                syncResponseToStore(questionId, responseModel)
            }
        })
    } catch (error) {
        console.error('Error syncing form values to store:', error)
    }
}

// Watch for form changes and sync to store
watch(
    () => formRef.value?.values,
    () => {
        debouncedSyncToStore()
    },
    { deep: true }
)

const saveProgress = async (formValues: any) => {
    try {
        if (isReadOnly.value) {
            toast.showToast(t('common.error'), t('audit.checklist_responses.toast_readonly_save'), 'error')
            return
        }
        saving.value = true

        // Extract form values and prepare bulk payload
        const responsesToSave: any[] = []

        // First, update our local responses object with form values
        Object.keys(formValues).forEach((fieldName) => {
            if (fieldName.startsWith('responseAnswer_')) {
                const questionId = fieldName.replace('responseAnswer_', '')
                const responseModel = getResponseModel(questionId)
                responseModel.responseAnswer = formValues[fieldName]
                // Sync to store immediately
                syncResponseToStore(questionId, responseModel)
            } else if (fieldName.startsWith('auditorObservation_')) {
                const questionId = fieldName.replace('auditorObservation_', '')
                const responseModel = getResponseModel(questionId)
                responseModel.auditorObservation = formValues[fieldName]
                // Sync to store immediately
                syncResponseToStore(questionId, responseModel)
            }
        })

        // Build bulk payload from responses that have actually changed
        // Structure supports:
        // - Multiple findings per response (each finding sent as separate item)
        // - Multiple evidences per finding
        // - Each evidence can have 1 file (uploaded via multipart/form-data)
        // - Evidence types: DOCUMENT (links to internal docs) or AUDIT_EVIDENCE_FILE (file uploads)
        // - Files are collected from all findings and sent as FormData
        Object.entries(responses).forEach(([questionId, responseData]) => {
            const originalData = originalResponses[questionId]

            // Check if any field has changed from its original value
            const hasChanged =
                responseData.responseAnswer !== (originalData?.responseAnswer || '') ||
                responseData.auditorObservation !== (originalData?.auditorObservation || '')

            // Get findings for this question from the store
            const questionFindings = getFindingsForQuestion(questionId)
            // Only include responses that have changed AND have some content OR have findings
            if (
                (hasChanged && (responseData.responseAnswer || responseData.auditorObservation)) ||
                questionFindings.length > 0
            ) {
                const responseItem: any = {
                    questionDefinitionId: questionId,
                    responseAnswer: responseData.responseAnswer || undefined,
                    auditorObservation: responseData.auditorObservation || undefined,
                    respondedByTeamMemberId: responseData.respondedByTeamMemberId || undefined
                }

                // Add multiple findings for this question
                // Each finding will be sent as a separate response item since the backend
                // only supports one finding per response currently
                if (questionFindings.length > 0) {
                    questionFindings.forEach((finding) => {
                        const findingResponseItem = { ...responseItem }

                        findingResponseItem.finding = {
                            auditInstanceId: props.auditInstanceId,
                            title: finding.title,
                            id: finding.id?.includes('temp-') ? undefined : finding.id,
                            description: finding.description,
                            classification: finding.classification,
                            severity: finding.severity || undefined,
                            raisedNc: finding.raisedNc ? 'true' : undefined,
                            linkedNcId: finding.linkedNcId || undefined,
                            evidences:
                                finding.evidences?.map((evidence, evidenceIndex) => {
                                    // For AUDIT_EVIDENCE_FILE type, we need to ensure the evidence has the file attached
                                    // Files might be in evidence.file or in finding.files[evidenceIndex]
                                    const evidenceData: any = {
                                        description: evidence.description,
                                        evidenceType: evidence.evidenceType,
                                        documentId: evidence.documentId || undefined
                                    }

                                    // Attach file to evidence if it's an AUDIT_EVIDENCE_FILE type
                                    if (evidence.evidenceType === 'AUDIT_EVIDENCE_FILE') {
                                        const file =
                                            evidence.file ||
                                            (finding.files && finding.files[evidenceIndex])
                                        if (file) {
                                            evidenceData.file = file
                                        }
                                    }

                                    return evidenceData
                                }) || []
                        }
                        responsesToSave.push(findingResponseItem)
                    })
                } else {
                    // No findings, just add the response
                    responsesToSave.push(responseItem)
                }
            }
        })

        if (responsesToSave.length > 0) {
            // Prepare FormData for multipart/form-data upload
            const formData = new FormData()

            // Add the bulk data as JSON
            const bulkPayload = {
                auditInstanceId: props.auditInstanceId,
                responses: responsesToSave.map((item) => {
                    // Extract files from findings and prepare them for separate upload
                    if (item.finding && item.finding.evidences) {
                        const cleanedEvidences = item.finding.evidences.map((evidence: any) => ({
                            description: evidence.description,
                            evidenceType: evidence.evidenceType,
                            documentId: evidence.documentId
                            // Remove any file references - files will be sent separately
                        }))
                        return {
                            ...item,
                            finding: {
                                ...item.finding,
                                evidences: cleanedEvidences
                            }
                        }
                    }
                    return item
                })
            }

            // Add each field of the bulk payload to FormData
            formData.append('auditInstanceId', bulkPayload.auditInstanceId)
            formData.append('responses', JSON.stringify(bulkPayload.responses))
            formData.append(
                'deletedFindings',
                JSON.stringify(
                    checklistResponseStore.deletedFindings.filter((f) => !f.includes('temp-'))
                )
            )

            // Collect all files from findings evidences and add them to FormData
            const allFiles: File[] = []
            responsesToSave.forEach((item, itemIndex) => {
                if (item.finding && item.finding.evidences) {
                    item.finding.evidences.forEach((evidence: any, evidenceIndex: number) => {
                        if (evidence.evidenceType === 'AUDIT_EVIDENCE_FILE' && evidence.file) {
                            allFiles.push(evidence.file)
                        }
                    })
                }
            })

            // Add all files to FormData
            allFiles.forEach((file, index) => {
                formData.append('files', file)
            })

            // Use axios directly for multipart/form-data upload
            const response = await apiCall.post('/audits/checklist-responses/bulk', formData, {
                headers: {
                    authorization: authStore.state.token,
                    'Content-Type': 'multipart/form-data'
                }
            })
            const result = response.data

            const totalFindings = responsesToSave.filter((item) => item.finding).length
            const totalFiles = allFiles.length
            const parts: string[] = []
            parts.push(
                t('audit.checklist_responses.toast_save_part_created', { n: result.created || 0 })
            )
            parts.push(t('audit.checklist_responses.toast_save_part_updated', { n: result.updated || 0 }))
            if (result.skipped > 0) {
                parts.push(t('audit.checklist_responses.toast_save_part_skipped', { n: result.skipped }))
            }
            if (totalFindings > 0) {
                parts.push(
                    t('audit.checklist_responses.toast_save_part_findings', { n: totalFindings })
                )
            }
            if (totalFiles > 0) {
                parts.push(t('audit.checklist_responses.toast_save_part_files', { n: totalFiles }))
            }
            const message = parts.join(', ')

            toast.showToast(t('audit.checklist_responses.toast_save_success'), message, 'success')

            // Show errors if any
            if (result.errors && result.errors.length > 0) {
                console.warn('Some responses had errors:', result.errors)
                toast.showToast(
                    t('audit.checklist_responses.toast_save_issues'),
                    t('audit.checklist_responses.toast_save_issues_body', { n: result.errors.length }),
                    'error'
                )
            }
        } else {
            toast.showToast(
                t('audit.checklist_responses.toast_no_changes_title'),
                t('audit.checklist_responses.toast_no_changes_body'),
                'info'
            )
        }

        // Refresh data to get updated completion percentage
        await fetchChecklistData(true)
    } catch (err: any) {
        error.value = t('audit.checklist_responses.toast_save_error_body')
        toast.showToast(
            t('audit.checklist_responses.toast_save_error_title'),
            formatApiErrorMessage(err?.response?.data, t, 'errors.audit') ||
                t('audit.checklist_responses.toast_save_error_body'),
            'error'
        )
    } finally {
        saving.value = false
    }
}

const findEvidence = async () => {
    const source = evidenceSource.value.trim()
    if (!source || isReadOnly.value) return
    startingEvidence.value = true
    try {
        const existing = await listIntegrations(authStore)
        const match = existing.find((item) => item.name.toLowerCase() === source.toLowerCase())
        const connection = match ?? (await createIntegration(source, authStore))
        await router.push({ path: integrationPath(connection.id), query: { from: route.fullPath } })
    } catch {
        toast.showToast(t('common.error'), t('audit.checklist_responses.find_evidence_failed'), 'error')
    } finally {
        startingEvidence.value = false
    }
}

// Navigate to add finding page
const navigateToAddFinding = (questionId?: string) => {
    if (isReadOnly.value) {
        toast.showToast(t('common.error'), t('audit.checklist_responses.toast_readonly_finding'), 'error')
        return
    }
    router.push(`/check/audits/${programId.value}/${props.auditInstanceId}/questions/${questionId}/findings/add`)
}

// Get findings for a specific question from the store
const getFindingsForQuestion = (questionId: string) => {
    // Filter findings that are associated with this specific question and instance
    return checklistResponseStore.findFindingsByQuestionId(questionId, props.auditInstanceId)
}

// Navigate to edit finding
const navigateToEditFinding = (finding: any) => {
    router.push(
        `/check/audits/${programId.value}/${props.auditInstanceId}/questions/${finding.questionId}/findings/${finding.id}/edit`
    )
}

// Delete finding
const deleteFinding = async (finding: any) => {
    try {
        if (isReadOnly.value) {
            toast.showToast(
                t('common.error'),
                t('audit.checklist_responses.toast_readonly_delete_finding'),
                'error'
            )
            return
        }
        // If finding has an ID, delete from backend
        // Remove from store

        checklistResponseStore.deleteFinding(finding.id)
    } catch (error: any) {
        console.error('Error deleting finding:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.checklist_responses.toast_delete_finding_error'),
            'error'
        )
    }
}

// Find the first unanswered question ID
const findFirstUnansweredQuestion = (): string | null => {
    if (!checklistData.value?.checklists) return null
    
    const findInSection = (section: any): string | null => {
        // Check questions in this section
        if (section.questions) {
            for (const question of section.questions) {
                const response = getResponseModel(question.id)
                if (!response.responseAnswer || !response.responseAnswer.trim()) {
                    return question.id
                }
            }
        }
        
        // Check subsections
        if (section.subsections) {
            for (const subsection of section.subsections) {
                const unansweredId = findInSection(subsection)
                if (unansweredId) return unansweredId
            }
        }
        
        return null
    }
    
    // Iterate through all checklists and sections
    for (const checklist of checklistData.value.checklists) {
        if (checklist.sections) {
            for (const section of checklist.sections) {
                const unansweredId = findInSection(section)
                if (unansweredId) return unansweredId
            }
        }
    }
    
    return null
}

// Expose method to parent component
defineExpose({
    findFirstUnansweredQuestion,
    scrollToQuestion: (questionId: string) => {
        nextTick(() => {
            const questionElement = document.getElementById(`question-${questionId}`)
            if (questionElement) {
                // Expand the section containing this question
                if (checklistData.value?.checklists) {
                    for (const checklist of checklistData.value.checklists) {
                        if (checklist.sections) {
                            for (const section of checklist.sections) {
                                const findQuestionInSection = (sec: any): boolean => {
                                    if (sec.questions?.some((q: any) => q.id === questionId)) {
                                        collapsedSections.value[sec.id] = false
                                        return true
                                    }
                                    if (sec.subsections) {
                                        for (const sub of sec.subsections) {
                                            if (findQuestionInSection(sub)) {
                                                collapsedSections.value[sec.id] = false
                                                return true
                                            }
                                        }
                                    }
                                    return false
                                }
                                if (findQuestionInSection(section)) break
                            }
                        }
                    }
                }
                
                // Scroll to the question after expanding
                setTimeout(() => {
                    questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 300)
            }
        })
    }
})
</script>

<style scoped>
/* Any custom styles if needed */
</style>
