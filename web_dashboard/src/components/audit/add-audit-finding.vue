<template>
    <BreadCrums :crumbs="crums" />

    <Form
        ref="formRef"
        class="p-6 bg-neutral-50"
        @submit="handleSubmit"
        v-if="!loadingEntity"
        test-id="add-finding-form"
    >
        <div class="bg-white rounded-lg border border-neutral-200 max-w-4xl mx-auto" test-id="add-finding-card">
            <div class="p-6 border-b border-neutral-200">
                <div class="space-y-6">
                    <div test-id="finding-title-field">
                        <AppInputForm
                            :label="t('audit.finding_form.title_label')"
                            name="findingTitle"
                            :value="values.findingTitle"
                            :placeholder="t('audit.finding_form.title_placeholder')"
                            :rules="(v: any) => (!v ? t('audit.finding_form.title_required') : true)"
                            :disabled="isReadOnly"
                            required
                            test-id="finding-title-input"
                        />
                    </div>

                    <div test-id="finding-description-field">
                        <AppTextareaForm
                            name="description"
                            :label="t('audit.finding_form.description_label')"
                            :value="values.description"
                            :placeholder="t('audit.finding_form.description_placeholder')"
                            :disabled="isReadOnly"
                            required
                            :rules="(v: any) => (!v ? t('audit.finding_form.description_required') : true)"
                            test-id="finding-description-textarea"
                        />
                    </div>

                    <div test-id="classification-field" :class="isReadOnly ? 'opacity-75 pointer-events-none' : ''">
                        <label class="block mb-2 text-sm"
                            >{{ t('audit.finding_form.classification_label') }}
                            <span class="text-red-700">*</span></label
                        >
                        <div :class="`flex ${!selectedClassification && showClassificationError ? 'ring-1 ring-red-500 rounded-md' : ''}`">
                            <Select2
                                v-model="selectedClassification"
                                :values="classifications"
                                :display="classificationOptionLabel"
                                :disabled="isReadOnly"
                                :placeholder="t('audit.finding_form.classification_placeholder')"
                                test-id="finding-classification-select"
                            />
                        </div>
                        <div v-if="!selectedClassification && showClassificationError" class="text-red-600 text-xs mt-1">
                            <p>{{ t('audit.finding_form.classification_required') }}</p>
                        </div>
                    </div>

                    

                    <div v-if="isGeneralAdd" :class="isReadOnly ? 'opacity-75 pointer-events-none' : ''">
                        <label class="block mb-2 text-sm">{{ t('audit.finding_form.uploaded_by_label') }}</label>
                        <Select2
                            v-model="selectedTeamMember"
                            :values="teamMembers"
                            :display="(val: any) => val?.name || ''"
                            :disabled="isReadOnly"
                            :placeholder="t('audit.finding_form.team_member_placeholder')"
                        />
                    </div>

                    <div>
                        <div v-if="isNonConformitySelected" id="linked-nc-section" class="space-y-3 mt-3" test-id="linked-nc-section" :class="isReadOnly ? 'opacity-75 pointer-events-none' : ''">
                            <div test-id="linked-nc-selector-field">
                                <label class="block mb-2 text-sm">{{ t('audit.finding_form.linked_nc_label') }}</label>
                                <SearcheableApiSelect2
                                    v-model="selectedNC"
                                    :results="ncResults"
                                    :disabled="isReadOnly"
                                    :placeholder="t('audit.finding_form.linked_nc_placeholder')"
                                    :display="(nc:any) => nc?.name || ''"
                                    :changeQuery="onNcQueryChange"
                                    :extraAction="onSelectNC"
                                    test-id="linked-nc-selector"
                                />
                            </div>
                            <div v-if="!isReadOnly" class="flex">
                                <Can :subjects="['non_conformities']" :actions="['create']">
                                    <AppButton
                                        buttonStyle="secondary"
                                        type="button"
                                        @click="goToCreateNC"
                                        test-id="create-link-nc-button"
                                    >
                                        <i class="fa-solid fa-plus mr-1"></i> {{ t('audit.finding_form.create_link_nc') }}
                                    </AppButton>
                                </Can>
                            </div>
                        </div>
                    </div>

                    <div test-id="supporting-evidence-section">
                        <div>
                            <div class="mb-2 flex items-center justify-between" test-id="supporting-evidence-header">
                                <div>
                                    <div class="text-sm text-neutral-900" test-id="supporting-evidence-title">
                                        {{ t('audit.finding_form.supporting_evidence_title') }}
                                    </div>
                                    <div class="text-xs text-neutral-500" test-id="supporting-evidence-subtitle">
                                        {{ t('audit.finding_form.supporting_evidence_subtitle') }}
                                        <span
                                            v-if="evidences.length > 0"
                                            class="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                                        >
                                            {{ t('audit.finding_form.evidence_attached', { n: evidences.length }) }}
                                        </span>
                                    </div>
                                </div>
                                <Can :subjects="['audit_findings']" :actions="['create', 'update']">
                                    <AppButton
                                        v-if="!isReadOnly"
                                        @click="openAddEvidenceModal"
                                        buttonStyle="neutral"
                                        type="button"
                                        class="px-3 py-2 rounded border border-neutral-300 bg-neutral-50 text-neutral-800 text-sm hover:bg-neutral-100 transition"
                                        test-id="add-evidence-button"
                                    >
                                        <i class="fa-solid fa-paperclip mr-1"></i>
                                        {{ t('audit.finding_form.add_evidence') }}
                                    </AppButton>
                                </Can>
                            </div>

                            <div class="space-y-2">
                                <div
                                    v-if="evidences.length === 0"
                                    class="text-center py-4 text-neutral-500 border border-dashed border-neutral-300 rounded bg-neutral-50"
                                    test-id="evidence-empty-state"
                                >
                                    <i class="fa-solid fa-folder-open text-2xl mb-2"></i>
                                    <div class="text-sm">{{ t('audit.finding_form.empty_evidence_title') }}</div>
                                    <div class="text-xs">
                                        {{ t('audit.finding_form.empty_evidence_hint') }}
                                    </div>
                                </div>

                                <div
                                    v-for="(evidence, index) in evidences"
                                    :key="evidence.id || index"
                                >
                                    <div
                                        class="flex items-center justify-between rounded border border-neutral-200 bg-white px-4 py-3 shadow-sm transition-colors hover:shadow-md"
                                        @click="handleEvidenceClick(evidence)"
                                        :class="{
                                            'cursor-pointer hover:bg-neutral-50':
                                                isEdit && evidence.documentId
                                        }"
                                    >
                                        <div class="flex items-start gap-3">
                                            <div class="flex-shrink-0 mt-1">
                                                <i
                                                    :class="
                                                        evidence.evidenceType === 'DOCUMENT'
                                                            ? 'fa-solid fa-file-lines text-blue-500'
                                                            : 'fa-solid fa-paperclip text-green-500'
                                                    "
                                                ></i>
                                            </div>
                                            <div>
                                                <div class="text-sm font-medium text-neutral-900">
                                                    {{
                                                        evidence.documentName ||
                                                        (evidence.fileName
                                                            ? getFileNameFromUrl(evidence.fileName)
                                                            : t('audit.finding_form.untitled_evidence'))
                                                    }}
                                                </div>
                                                <div class="text-xs text-neutral-500 mt-1">
                                                    {{
                                                        evidence.description ||
                                                        t('training.competencies.no_description')
                                                    }}
                                                </div>
                                                <div class="text-xs text-neutral-400 mt-1">
                                                    {{ t('audit.finding_form.type_label') }}:
                                                    {{
                                                        evidence.evidenceType === 'DOCUMENT'
                                                            ? t('audit.finding_form.type_internal_document')
                                                            : t('audit.finding_form.type_uploaded_file')
                                                    }}
                                                </div>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-2">
                                            <DownloadButton
                                                @click.stop
                                                v-if="isEdit && evidence.fileName"
                                                :filePath="evidence.fileName"
                                                :fileName="
                                                    getFileNameFromUrl(evidence.fileName) ||
                                                    undefined
                                                "
                                                class="text-sm"
                                            />
                                            <Can
                                                v-if="!isReadOnly"
                                                :subjects="['audit_findings']"
                                                :actions="['create', 'update']"
                                            >
                                                <button
                                                    type="button"
                                                    class="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                                    @click.stop="removeEvidence(index, evidence)"
                                                    :title="t('audit.finding_form.remove_evidence_title')"
                                                >
                                                    <i class="fa-solid fa-trash-can text-sm"></i>
                                                </button>
                                            </Can>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Can :subjects="['audit_findings']" :actions="['create', 'update']">
                        <div v-if="!isReadOnly" class="p-6 flex justify-end gap-3" test-id="add-finding-actions">
                            <AppButton
                                buttonStyle="secondary"
                                type="button"
                                @click="handleCancel"
                                test-id="add-finding-cancel-button"
                                >{{ t('audit.finding_form.cancel') }}</AppButton
                            >
                            <AppButton
                                buttonStyle="primary"
                                type="submit"
                                test-id="add-finding-save-button"
                                >{{ t('audit.finding_form.save_finding') }}</AppButton
                            >
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
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BreadCrums from '../breadCrums.vue'
import { Form } from 'vee-validate'
import { useForm } from 'vee-validate'
import Spinner from '../Spinner.vue'
import Select2 from '../Select2.vue'
import AppInputForm from '../AppInputForm.vue'
import AppTextareaForm from '../AppTextareaForm.vue'
import {
    AUDIT_FINDING_CLASSIFICATION_OPTIONS
} from '@/util/interfaces'
import AppButton from '../AppButton.vue'
import { useDialog } from '@/stores/dialog'
import AddEvidenceModal from './add-audit-evidence-modal.vue'
import { useToast } from '@/stores/notification'
import { AuditFindingClassification, type AuditFindingDetailResponseDTO, type AuditInstance } from '@/util/interfaces'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { apiGet, apiPost, apiPut } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import Can from '../Can.vue'
import { useChecklistResponseStore } from '@/stores/checklistResponseStore'
import { getFileNameFromUrl, snakeToCamelCase, formatApiErrorMessage } from '@/util/util'
import DownloadButton from '../download-button.vue'
import { useAuditFindingStore } from '@/stores/auditFindingStore'
import SearcheableApiSelect2 from '../SearcheableApiSelect2.vue'

const { t } = useI18n()

const classificationOptionLabel = (item: { id?: string; name?: string } | null) => {
    if (!item) return ''
    if (item.id === '') return t('audit.finding_classification.all')
    const key = `audit.finding_classification.${item.id}`
    const translated = t(key)
    return translated === key ? item.name ?? '' : translated
}

const checklistResponseStore = useChecklistResponseStore()
const auditFindingStore = useAuditFindingStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const dialog = useDialog()
const toast = useToast()

const programId = route.params.id
const instanceId = route.params.instanceId
const isGeneralAdd = ref(true)
const isEdit = ref(false)
const findingId = ref<string>('')
const questionId = route.params.questionId as string

const instance = ref<AuditInstance>()
const loadingEntity = ref(true)
const title = ref<string>('')
const description = ref<string>('')
const originalTitle = ref<string>('')
// Derived: raised NC when a linked NC exists
const selectedClassification = ref<any>()
 
const selectedTeamMember = ref<any>()
const teamMembers = ref<any[]>([])
const evidences = ref<any[]>([])
const deleteEvidenceIds = ref<string[]>([])
const linkedNcId = ref<string>('')
const selectedNC = ref<any>(null)
const ncResults = ref<any[]>([])
const ncSearchTimeout = ref<any>(null)
const showClassificationError = ref(false)

const isNCRaised = computed(() => !!linkedNcId.value)

// Read-only when instance is ON_HOLD, COMPLETED, or CANCELLED
const isReadOnly = computed(() => {
    const status = instance.value?.status
    return status === 'ON_HOLD' || status === 'COMPLETED' || status === 'CANCELLED'
})

// Format status for display
const formattedStatus = computed(() => {
    const status = instance.value?.status || ''
    if (!status) return ''
    const key = `audit.main.status.${status}`
    const translated = t(key)
    return translated === key ? snakeToCamelCase(status) : translated
})

// Persist/restore draft state using a stable key per audit instance and mode
const draftKey = computed(() => {
    const base = `${programId}-${instanceId}`
    return isGeneralAdd.value ? `general-${base}` : `checklist-${base}-${questionId || 'na'}`
})

const classifications = ref<any[]>([
    AUDIT_FINDING_CLASSIFICATION_OPTIONS[1],
    AUDIT_FINDING_CLASSIFICATION_OPTIONS[2],
    AUDIT_FINDING_CLASSIFICATION_OPTIONS[3]
])
 

// Access vee-validate form values and setters
const { setFieldValue, values } = useForm<any>()
// Form ref to access up-to-date field values at button click time
const formRef = ref<any>(null)

// Reduced watchers: rely on vee-validate values directly

const crums = computed(() => [
    {
        name: t('nav.audit'),
        path: '/check/audits',
        icon: 'fa-solid fa-chart-line'
    },
    {
        name: instance.value?.auditProgram.title,
        path: `/check/audits/${programId}`,
        icon: 'fa-solid fa-file-pen'
    },
    {
        name: t('audit.finding_form.breadcrumb_instance'),
        path: `/check/audits/${programId}/instances/${instanceId}?tab=1`,
        icon: 'fa-solid fa-file-pen'
    },
    {
        name: isReadOnly.value
            ? t('audit.finding_form.breadcrumb_finding')
            : isEdit.value
              ? t('audit.finding_form.breadcrumb_edit_finding')
              : t('audit.finding_form.breadcrumb_add_finding'),
        icon: 'fa-solid fa-plus'
    }
])

const handleCancel = () => {
    // Clear draft when user cancels/close
    auditFindingStore.clearDraft(draftKey.value)
    if (isGeneralAdd.value) {
        router.push(`/check/audits/${programId}/instances/${instanceId}?tab=1`)
    } else {
        router.push(`/check/audits/${programId}/instances/${instanceId}`)
    }
}

const handleEvidenceClick = (evidence: any) => {
    if (isEdit.value && evidence.documentId) {
        router.push(`/plan/documents/${evidence.documentId}`)
    }
}

const goToCreateNC = () => {
    const returnTo = route.fullPath
    // Ensure we have the latest form values
    const formValues = formRef.value?.values || {}
    const currentTitle = (formValues.findingTitle ?? values.findingTitle) || ''
    const currentDescription = (formValues.description ?? values.description) || ''
    
    // Save current form state before leaving
    auditFindingStore.saveDraft(draftKey.value, {
        title: currentTitle,
        description: currentDescription,
        classificationId: selectedClassification.value?.id,
        teamMemberId:
            selectedTeamMember.value?.id !== undefined && selectedTeamMember.value?.id !== null
                ? String(selectedTeamMember.value?.id)
                : null,
        evidences: evidences.value,
        linkedNcId: linkedNcId.value || null
    })
    const auditProgramId = instance.value?.auditProgram?.id || String(programId || '')
    router.push({
        path: '/act/non-conformities/add',
        query: {
            redirect: returnTo,
            draftKey: draftKey.value,
            auditInstanceId: String(instanceId),
            ...(findingId.value ? { findingId: findingId.value } : {}),
            ...(auditProgramId ? { auditProgramId } : {}),
            ...(currentDescription ? { findingDescription: currentDescription } : {}),
            ...(currentTitle ? { findingTitle: currentTitle } : {})
        }
    })
}

const applyLinkedNc = async (ncId?: string | null, ncName?: string | null) => {
    if (!ncId) return
    linkedNcId.value = String(ncId)
    setFieldValue('linkedNcId', linkedNcId.value)

    let name = ncName || ''
    if (!name) {
        try {
            const nc = await apiGet<any>(`/non-conformities/${ncId}`, authStore)
            name = nc?.name || nc?.problemStatement || ''
        } catch {
            // Keep id-only selection if fetch fails
        }
    }

    selectedNC.value = { id: linkedNcId.value, name: name || linkedNcId.value }
    // Ensure classification is Non-Conformity so linked section stays visible
    if (!isNonConformitySelected.value) {
        selectedClassification.value = classifications.value.find(
            (c) => c.id === AuditFindingClassification.NON_CONFORMITY
        )
    }
    auditFindingStore.saveDraft(draftKey.value, {
        linkedNcId: linkedNcId.value,
        linkedNcName: name || null,
        isNCRaised: true,
        classificationId: selectedClassification.value?.id
    })
}

const openAddEvidenceModal = () => {
    dialog.openDialog(AddEvidenceModal, {
        onSave: async (data: any, uploadedFiles: any[]) => {
            const evidence = {
                description: data.description,
                documentName: data.document?.name || null,
                fileName: uploadedFiles?.[0]?.name || null,
                file: uploadedFiles?.[0] || null,
                evidenceType: data.sourceType, // Backend expects this field name
                documentId: data.document?.id || null, // Backend expects string ID
                id: `temp-${Date.now()}` // Use string for consistency
            }

            // Validate evidence data before adding
            if (!evidence.evidenceType) {
                toast.showToast(t('common.error'), t('audit.finding_form.toast_evidence_type_required'), 'error')
                return
            }

            evidences.value.push(evidence)

            dialog.closeDialog()
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}

const removeEvidence = (index: number, evidence: any) => {
    evidences.value = evidences.value.filter((_, i) => i !== index)

    // Only track for deletion if it's an existing evidence (has a real ID, not a temp one)
    if (evidence.id && typeof evidence.id === 'string' && !evidence.id.startsWith('temp-')) {
        deleteEvidenceIds.value.push(evidence.id)
    }
}

const isNonConformitySelected = computed(() => {
    return selectedClassification.value?.id === AuditFindingClassification.NON_CONFORMITY
})

const validateForm = (values: any): boolean => {
    let isValid = true
    
    if (!values.findingTitle?.trim()) {
        toast.showToast(t('common.error'), t('audit.finding_form.toast_title_invalid'), 'error')
        isValid = false
    }

    if (!values.description?.trim()) {
        toast.showToast(t('common.error'), t('audit.finding_form.toast_desc_invalid'), 'error')
        isValid = false
    }

    if (!selectedClassification.value?.id) {
        showClassificationError.value = true
        isValid = false
    } else {
        showClassificationError.value = false
    }

    return isValid
}

const handleSubmit = async (values: any) => {
    if (isReadOnly.value) {
        toast.showToast('Read-only', 'This audit instance is read-only; you cannot save changes.', 'error')
        return
    }
    if (!validateForm(values)) return

    const files = evidences.value.map((e) => e.file).filter((f) => !!f)

    try {
        if (isGeneralAdd.value) {
            const formdata = new FormData()
            formdata.append('auditInstanceId', instanceId.toString())
            formdata.append('title', values.findingTitle?.trim())
            formdata.append('description', values.description?.trim())
            formdata.append('classification', selectedClassification.value?.id.toString())
            formdata.append('linkedNcId', linkedNcId.value.toString())
            if (selectedTeamMember.value?.id)
                formdata.append('auditTeamMemberId', selectedTeamMember.value?.id.toString())
            formdata.append('raisedNc', (!!linkedNcId.value).toString())

            
            // Separate existing evidences from new ones for logging
            const existingEvidences = evidences.value.filter(
                (e) => e.id && !e.id.toString().startsWith('temp-')
            )
            const newEvidences = evidences.value.filter(
                (e) => !e.id || e.id.toString().startsWith('temp-')
            )

            // Important: Backend recreates ALL evidences during update, so send all as if they were new
            // This is why existing evidences disappear - we need to resend them all
            evidences.value.forEach(({ file, ...rest }) => {
                // For the backend, treat all evidences as new during update
                // Remove any ID since backend will assign new ones
                const evidenceData = { ...rest }
                delete evidenceData.id // Remove all IDs, let backend assign new ones

                // Ensure we have the correct properties
                if (!evidenceData.evidenceType) {
                    return
                }

                formdata.append('evidences[]', JSON.stringify(evidenceData))
            })

            // Add files
            files.forEach((file, idx) => {
                formdata.append('files', file)
            })

            if (isEdit.value) {
                if (deleteEvidenceIds.value.length > 0) {
                    deleteEvidenceIds.value.forEach((id) => {
                        formdata.append('deleteEvidenceIds[]', id.toString())
                    })
                }

                await apiPut(`/audits/findings/${findingId.value}`, formdata, authStore)
            } else {
                await apiPost('/audits/findings', formdata, authStore)
            }
            // Clear any saved draft for this finding after successful save
            auditFindingStore.clearDraft(draftKey.value)
            toast.showToast(t('common.success'), t('audit.finding_form.toast_save_success'), 'success')
            router.push(`/check/audits/${programId}/instances/${instanceId}?tab=1`)
        } else {
            // Checklist mode: persist to API immediately so All findings / Reports & NCs see it
            const formdata = new FormData()
            formdata.append('auditInstanceId', instanceId.toString())
            formdata.append('title', values.findingTitle?.trim())
            formdata.append('description', values.description?.trim())
            formdata.append('classification', selectedClassification.value?.id.toString())
            formdata.append('linkedNcId', linkedNcId.value?.toString() || '')
            formdata.append('raisedNc', (!!linkedNcId.value).toString())
            if (questionId) {
                formdata.append('questionDefinitionId', questionId)
            }

            evidences.value.forEach(({ file, ...rest }) => {
                const evidenceData = { ...rest }
                delete evidenceData.id
                if (!evidenceData.evidenceType) return
                formdata.append('evidences[]', JSON.stringify(evidenceData))
            })
            files.forEach((file) => {
                formdata.append('files', file)
            })

            const isTempId =
                !findingId.value || String(findingId.value).startsWith('temp-')
            let persistedId = findingId.value

            if (isEdit.value && !isTempId) {
                if (deleteEvidenceIds.value.length > 0) {
                    deleteEvidenceIds.value.forEach((id) => {
                        formdata.append('deleteEvidenceIds[]', id.toString())
                    })
                }
                await apiPut(`/audits/findings/${findingId.value}`, formdata, authStore)
            } else {
                const created: any = await apiPost('/audits/findings', formdata, authStore)
                persistedId = created?.id || created?.data?.id || findingId.value
            }

            const finding = {
                id: persistedId || `temp-${Date.now()}`,
                title: values.findingTitle?.trim(),
                description: values.description?.trim(),
                classification: selectedClassification.value?.id,
                raisedNc: !!linkedNcId.value,
                linkedNcId: linkedNcId.value || null,
                evidences: evidences.value.map(({ file, ...rest }) => rest) || [],
                files,
                questionId: questionId || undefined,
                auditInstanceId: instanceId as string
            }
            if (isEdit.value) {
                checklistResponseStore.updateFinding(finding, originalTitle.value, findingId.value)
            } else {
                checklistResponseStore.addFinding(finding)
            }
            auditFindingStore.clearDraft(draftKey.value)
            toast.showToast(t('common.success'), t('audit.finding_form.toast_save_success'), 'success')
            router.push(`/check/audits/${programId}/instances/${instanceId}`)
        }

        loadingEntity.value = false
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error.response?.data, t, 'errors.audit') || t('audit.finding_form.toast_save_error'),
            'error'
        )

        // Don't redirect on error, let user fix the issue
        loadingEntity.value = false
    }
}

const initializeFindingData = async (finding: any) => {
    setFieldValue('findingTitle', finding.title)
    setFieldValue('description', finding.description)
    originalTitle.value = finding.title
    selectedClassification.value = classifications.value.find(
        (c) => c.id === finding.classification
    )
    
    linkedNcId.value = finding.linkedNcId || ''
    // Prefill selected NC without API load
    selectedNC.value = linkedNcId.value ? { id: linkedNcId.value, name: finding.ncName } : null
    // Handle evidences - they may come from different sources (API vs Store)
    if (finding.evidences && Array.isArray(finding.evidences)) {
        evidences.value = finding.evidences.map((evidence: any, idx: number) => {
            // For existing evidences from API, preserve all properties
            const evidenceData = {
                description: evidence.description,
                documentName: evidence.documentName || null,
                fileName: finding.files?.[idx]?.name || evidence.fileName,
                file: finding.files?.[idx] || null,
                evidenceType: evidence.evidenceType,
                documentId: evidence.documentId || null,
                id: evidence.id || `temp-${idx}`,
                // Preserve any additional properties for existing evidences
                ...evidence
            }
            return evidenceData
        })
    } else {
        evidences.value = []
    }

    if (finding.auditTeamMember && finding.auditTeamMember.id) {
        selectedTeamMember.value =
            teamMembers.value.find((member: any) => member.id === finding.auditTeamMember.id) ||
            null
    } else {
        selectedTeamMember.value = null
    }
}

const getRouteParam = (param: string | string[] | undefined): string => {
    return Array.isArray(param) ? param[0] : param || ''
}

const isGeneralMode = (): boolean => {
    return route.path.includes('/general/')
}

const handleFindingEdit = async (): Promise<void> => {
    if (!findingId.value) {
        return
    }

    try {
        // Always load from API using the finding ID to ensure we get complete data including evidences
        const finding = await apiGet<AuditFindingDetailResponseDTO>(
            `/audits/findings/${findingId.value}?instanceId=${instanceId}`,
            authStore
        )
        initializeFindingData(finding)
    } catch (error) {
        toast.showToast(t('common.error'), t('audit.finding_form.toast_load_finding_error'), 'error')
        handleCancel()
    }
}

const initializeComponent = async (): Promise<void> => {
    try {
        const response = await apiGet<AuditInstance>(
            `/audits/instances/${instanceId}?programId=${programId}`,
            authStore
        )
        instance.value = response
        teamMembers.value = (instance.value?.teamMembers || []).map((tm) => ({
            id: tm.id,
            name: `${tm.auditPersonnel.fname} ${tm.auditPersonnel.lname}`
        }))

        isGeneralAdd.value = isGeneralMode()

        // Check if we're in edit mode by looking for either findingId (general) or title (checklist)
        const routeFindingId = getRouteParam(route.params.findingId)

        if (isGeneralAdd.value && routeFindingId) {
            // General mode: use finding ID directly
            findingId.value = routeFindingId
            isEdit.value = true
            await handleFindingEdit()
        } else if (!isGeneralAdd.value && routeFindingId) {
            // Checklist mode: need to find the finding ID from the title
            // First check if the title is actually a finding ID (some routes might pass ID as title)
            // It's a UUID (finding ID)
            findingId.value = routeFindingId
            isEdit.value = true
            // It's an actual title, need to resolve to finding ID from the store
            const storedFinding = checklistResponseStore.findFindingById(routeFindingId)
            if (storedFinding && storedFinding.id) {
                findingId.value = storedFinding.id
                isEdit.value = true
                await initializeFindingData(storedFinding)
            } else {
                toast.showToast(t('common.error'), t('audit.finding_form.toast_finding_not_found'), 'error')
                handleCancel()
            }
        }

        // Restore draft (and any NC created via Create & Link) after load/edit
        await restoreDraft()
        await applyLinkedNcFromReturn()

        loadingEntity.value = false
    } catch (error: any) {
        toast.showToast(t('common.error'), t('audit.finding_form.toast_load_instance_error'), 'error')
        handleCancel()
    }
}

onMounted(initializeComponent)

const applyLinkedNcFromReturn = async () => {
    const queryNcId = route.query.linkedNcId as string | undefined
    const queryNcName = route.query.linkedNcName as string | undefined
    const draft = auditFindingStore.getDraft(draftKey.value)
    const ncId = queryNcId || draft?.linkedNcId
    const ncName = queryNcName || draft?.linkedNcName || null
    if (ncId) {
        await applyLinkedNc(ncId, ncName)
    }
}

const restoreDraft = async () => {
    const draft = auditFindingStore.getDraft(draftKey.value)
    
    if (!draft) return

    // Sync into vee-validate fields so inputs display the values
    if (draft.title !== undefined) setFieldValue('findingTitle', draft.title || '')
    if (draft.description !== undefined) setFieldValue('description', draft.description || '')

    if (draft.classificationId) {
        selectedClassification.value = classifications.value.find((c) => c.id === draft.classificationId)
    }
    
    // Uploaded By may be set here if team members already loaded; otherwise watcher will handle
    if (draft.teamMemberId && Array.isArray(teamMembers.value) && teamMembers.value.length > 0) {
        selectedTeamMember.value = teamMembers.value.find(
            (m: any) => String(m.id) === String(draft.teamMemberId)
        )
    }
    if (Array.isArray(draft.evidences)) {
        evidences.value = draft.evidences
    }
    if (draft.linkedNcId) {
        await applyLinkedNc(draft.linkedNcId, draft.linkedNcName)
    }
}

watch(
    () => [title.value, description.value, selectedClassification.value, selectedTeamMember.value, evidences.value, linkedNcId.value],
    () => {
        // Autosave draft on changes - prefer the form's latest values
        const formValues = formRef.value?.values || {}
        const currentTitle = (formValues.findingTitle ?? values.findingTitle) || ''
        const currentDescription = (formValues.description ?? values.description) || ''

        const previousDraft = auditFindingStore.getDraft(draftKey.value)
        const hasTeamMembers = Array.isArray(teamMembers.value) && teamMembers.value.length > 0
        const teamMemberIdToSave = hasTeamMembers
            ? (selectedTeamMember.value?.id !== undefined && selectedTeamMember.value?.id !== null
                ? String(selectedTeamMember.value?.id)
                : null)
            : previousDraft?.teamMemberId ?? null

        
        auditFindingStore.saveDraft(draftKey.value, {
            title: currentTitle,
            description: currentDescription,
            classificationId: selectedClassification.value?.id,
            teamMemberId: teamMemberIdToSave,
            evidences: evidences.value,
            linkedNcId: linkedNcId.value || null,
            linkedNcName: selectedNC.value?.name || null,
            isNCRaised: !!linkedNcId.value
        })
    },
    { deep: true }
)

// If the draft key changes due to mode resolution, attempt to restore again
watch(() => draftKey.value, () => {
    const draft = auditFindingStore.getDraft(draftKey.value)
    if (draft) {
        restoreDraft()
    }
})

// Clear draft when navigating away (e.g., back button), except when creating NC
onBeforeRouteLeave((to, from, next) => {
    if (to.path.startsWith('/act/non-conformities/add')) {
        next()
        return
    }
    auditFindingStore.clearDraft(draftKey.value)
    next()
})

// Handle NC search and selection
const onNcQueryChange = (q: string) => {
    if (q && q.trim() && selectedNC.value) {
        selectedNC.value = null
    }
    if (ncSearchTimeout.value) clearTimeout(ncSearchTimeout.value)
    ncSearchTimeout.value = setTimeout(async () => {
        await loadNcResults(q)
    }, 300)
}

const onSelectNC = (nc: any) => {
    selectedNC.value = nc
    linkedNcId.value = nc?.id || ''
    setFieldValue('linkedNcId', linkedNcId.value)
    auditFindingStore.saveDraft(draftKey.value, {
        linkedNcId: linkedNcId.value || null,
        linkedNcName: nc?.name || null,
        isNCRaised: !!linkedNcId.value
    })
}

// Removed preloading selected NC on edit per requirement

// Load NC results (optionally with a search query) and normalize to ensure name is present
const loadNcResults = async (query?: string) => {
    try {
        const searchParam = query && query.trim() ? `&search=${encodeURIComponent(query.trim())}` : ''
        const res = await apiGet<any[]>(`/non-conformities?unlinked=true${searchParam}`, authStore)
        const arr = Array.isArray(res) ? res : []
        // Ensure each item has a name so display can use name only
        ncResults.value = arr.map((item: any) => ({
            ...item,
            name: item?.name ?? item?.problemStatement ?? String(item?.id ?? '')
        }))
    } catch (e) {
        ncResults.value = []
    }
}

// When team members arrive, restore the selected "Uploaded By" from draft
watch(
    () => teamMembers.value,
    () => {
        const draft = auditFindingStore.getDraft(draftKey.value)
        if (!selectedTeamMember.value && draft?.teamMemberId && Array.isArray(teamMembers.value)) {
            selectedTeamMember.value = teamMembers.value.find(
                (m: any) => String(m.id) === String(draft.teamMemberId)
            )
        }
    },
    { immediate: true }
)

// Keep linked NC id synced with store
// Removed persisting linkedNcId to store

// Auto-load NCs when classification is NON_CONFORMITY and try to select existing linked id
watch(
  isNonConformitySelected,
  async (isNC) => {
    if (isNC) {
      await loadNcResults()
      if (linkedNcId.value) {
        const match = ncResults.value.find((nc: any) => String(nc?.id) === String(linkedNcId.value))
        if (match) selectedNC.value = match
      }
    }
  },
  { immediate: true }
)

// Clear classification error when classification is selected
watch(
  () => selectedClassification.value,
  () => {
    if (selectedClassification.value && showClassificationError.value) {
      showClassificationError.value = false
    }
  }
)
</script>
