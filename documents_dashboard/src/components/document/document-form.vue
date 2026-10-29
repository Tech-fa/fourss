<template>
    <Breadcrumb :crumbs="breadcrumbCrumbs" />

    <main id="main-content" class="p-6">
        <div v-if="isLoading" class="flex items-center justify-center h-screen">
            <Spinner width="5" />
        </div>
        <Form v-else @submit="handleSubmit" @invalid-submit="onInvalidSubmit" ref="formRef" class="max-w-5xl mx-auto">
            <div class="bg-white shadow-xl rounded-lg p-6 space-y-6">
                <div v-if="isCreateDocument" class="space-y-3">
                    <Notice v-if="missingDocumentCategories" :description="t('document.form.missing_categories_notice')"
                        level="warning" />

                    <Notice v-if="selectedOrgMissingStrategy"
                        description-key="document.form.org_unit_no_approval_strategy_notice"
                        :link="approvalStrategiesSettingsLink" level="warning" />
                </div>
                <div id="document-info" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4" v-if="!isNewVersion">
                        <div>
                            <div class="space-y-2">
                                <template v-if="isNewVersion">
                                    <label class="block text-sm text-neutral-700">{{
                                        t('document.form.document_code')
                                        }}</label>
                                    <AppInput :value="formData.code" hide-icon readonly class="bg-neutral-100"
                                        test-id="document-code-input" />
                                </template>
                                <AppInputForm v-else-if="!isEdit || (isEdit && formData.code)" name="code"
                                    :value="formData.code" :placeholder="t('document.form.code_placeholder')"
                                    :label="t('document.form.document_code')" :required="true" :rules="codeRequiredRule"
                                    test-id="document-code-input" />
                            </div>
                        </div>
                        <div v-if="!isEdit || isNewVersion">
                            <div class="space-y-2">
                                <label class="block text-sm text-neutral-700" for="version">{{
                                    t('document.form.version')
                                    }}</label>
                                <div class="relative">
                                    <AppInput v-if="isNewVersion" name="version" id="version" :value="formData.version"
                                        type="number" hide-icon readonly class="bg-neutral-100"
                                        test-id="document-version-input" />
                                    <AppInput v-else name="version" id="version" v-model.number="formData.version"
                                        :placeholder="t('document.form.version_placeholder')" type="number"
                                        :hide-icon="true" :min="1" step="1" @input="
                                            (e: any) => {
                                                const v = Number(e?.target?.value || 1)
                                                formData.version = v < 1 ? 1 : v
                                            }
                                        " />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-2" v-if="!isNewVersion">
                        <AppTextareaForm name="description" :label="t('document.form.description')"
                            :value="formData.description" :placeholder="t('document.form.description_placeholder')"
                            :disabled="isNewVersion" testID="document-description-input" />
                    </div>

                    <div class="grid grid-cols-2 gap-4" v-if="!isNewVersion">
                        <div>
                            <div class="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                <label class="block text-sm">
                                    {{ t('document.form.document_category') }}
                                    <span class="text-red-700">*</span>
                                </label>
                                <AddAndReload v-if="!isNewVersion" href="/plan/documents/settings?tab=1"
                                    :addText="t('document.form.add_category')"
                                    add-test-id="document-add-category-button"
                                    reload-test-id="document-reload-categories-button"
                                    @reload="reloadDocumentCategories" />
                            </div>
                            <template v-if="isNewVersion || categoryLockedByStrategy">
                                <AppInput :value="formData.documentType?.name ?? optionsData.documentType?.name ?? ''"
                                    hide-icon readonly class="bg-neutral-100" test-id="category-input" />
                            </template>
                            <div v-else :class="[
                                'flex',
                                !formData.documentType?.id && showValidationErrors
                                    ? 'ring-1 ring-red-500 rounded-md'
                                    : ''
                            ]">
                                <Select2 v-model="optionsData.documentType" :values="optionsData.documentTypes?.length > 0
                                    ? optionsData.documentTypes
                                    : []
                                    " :display="displayName" :placeholder="t('document.form.select_category')"
                                    :optional="false" @update:modelValue="(val) => handleFilterChange(val, 'category')"
                                    test-id="category-select" />
                            </div>
                            <div v-if="categoryLockedByStrategy" class="text-neutral-500 text-xs mt-1">
                                {{ t('document.form.category_locked_by_strategy') }}
                            </div>
                            <div v-else-if="!isNewVersion && !formData.documentType?.id && showValidationErrors"
                                class="text-red-600 text-xs mt-1">
                                {{ t('document.form.category_required') }}
                            </div>
                        </div>
                        <div v-if="!isNewVersion && (isEdit || showTeamPicker(availableOrganizationUnits.length))">
                            <label class="block text-sm mb-1">
                                {{ t('document.form.organizational_unit') }}
                                <span class="text-red-700">*</span>
                            </label>
                            <Select2
                                v-if="!isEdit"
                                v-model="optionsData.organizationUnit"
                                :values="availableOrganizationUnits"
                                :display="displayName"
                                :placeholder="t('document.form.select_organization_unit')"
                                :optional="false"
                                @update:modelValue="(val) => handleFilterChange(val, 'organizationUnit')"
                                test-id="organization-unit-select"
                            />
                            <p v-else class="text-sm text-black font-bold py-2">
                                {{ formData.organizationUnit?.name || optionsData.organizationUnit?.name || '' }}
                            </p>
                            <div
                                v-if="!isEdit && !formData.organizationUnit?.id && showValidationErrors"
                                class="text-red-600 text-xs mt-1"
                            >
                                {{ t('document.form.org_unit_required') }}
                            </div>
                        </div>
                        <div v-if="selectedOrgUnitId">
                            <label class="block text-sm mb-1">
                                {{ t('document.form.linked_processes_label') }}
                            </label>
                            <MultiSelect
                                v-model="selectedProcesses"
                                :results="availableProcesses"
                                :display="displayProcess"
                                :placeholder="t('document.form.processes_placeholder')"
                                test-id="document-process-select"
                            />
                            <p class="text-xs text-neutral-500 mt-1">
                                {{ t('document.form.linked_processes_hint') }}
                            </p>
                        </div>
                    </div>

                    <div class="flex items-start gap-2">
                        <Notice :description="approvalStrategyPreviewDescription" level="info"
                            test-id="document-approval-strategy-preview" class="flex-1 min-w-0" />
                        <AddAndReload :show-add="false" :reload-loading="isRefreshingApprovalStrategies"
                            reload-test-id="document-reload-approval-strategies-button"
                            @reload="refreshApprovalStrategies" />
                    </div>

                    <div v-if="!isNewVersion" class="grid grid-cols-2 gap-4">
                        <div class="flex items-center">
                            <ToggleSwitch v-model="formData.isPublic" :label="t('document.form.make_public')"
                                active-color="bg-blue-600" test-id="document-public-toggle" />
                        </div>
                        <div class="flex items-center">
                            <ToggleSwitch v-model="formData.isAiAccessible"
                                :label="t('document.form.ai_accessible')"
                                active-color="bg-blue-600" test-id="document-ai-accessible-toggle" />
                        </div>
                    </div>

                    <!-- Expires and Valid until (above Document Content) -->
                    <div v-if="fillPendingVersionId == null" class="pt-1">
                        <div class="space-y-4">
                            <div class="flex items-center mb-4">
                                <ToggleSwitch v-model="formData.neverExpires"
                                    @update:modelValue="handleNeverExpiresChange" :label="formData.neverExpires
                                        ? t('document.form.never_expires')
                                        : t('document.form.expires')
                                        " active-color="bg-blue-600" test-id="never-expires-toggle" />
                            </div>

                            <div v-if="!formData.neverExpires">
                                <label class="block text-sm mb-1">{{ t('document.form.valid_until') }}</label>
                                <AppInput name="dueDate" :label="t('document.form.due_date')" :value="formData.dueDate"
                                    type="date" :placeholder="t('document.form.due_date_placeholder')"
                                    v-model="formData.dueDate" :hide-icon="true" test-id="document-due-date-input" />
                            </div>
                        </div>
                    </div>
                    <!-- Document Content (last section before actions) -->
                    <div v-if="showDocumentName || !isEdit || isNewVersion"
                        class="pt-4 border-t border-neutral-200 w-full">
                        <div v-if="showDocumentName" class="space-y-2 mb-4">
                            <label class="block text-sm text-neutral-700" for="title">
                                {{ t('document.form.document_name') }} <span class="text-red-700">*</span>
                            </label>
                            <div :class="[
                                'relative',
                                showValidationErrors && !formData.title?.trim()
                                    ? 'ring-1 ring-red-500 rounded-md'
                                    : ''
                            ]">
                                <AppInput name="title" v-model="formData.title" :placeholder="isEdit
                                    ? t('document.form.document_name_placeholder')
                                    : contentMode === ContentType.CHECKLIST
                                        ? t('document.form.document_name_placeholder_checklist')
                                        : t('document.form.document_name_placeholder_editor')
                                    " id="title" :hide-icon="true" test-id="document-title-input" />
                            </div>
                            <div v-if="showValidationErrors && !formData.title?.trim()"
                                class="text-red-600 text-xs mt-1">
                                {{
                                    contentMode === ContentType.CHECKLIST
                                        ? t('document.form.document_name_required_checklist')
                                        : t('document.form.document_name_required_editor')
                                }}
                            </div>
                        </div>
                        <template v-if="!isEdit || isNewVersion">
                        <label class="block text-sm font-medium text-neutral-700 mb-3">
                            {{ t('document.form.document_content') }} <span class="text-red-700">*</span>
                        </label>
                        <!-- Full-width toggle buttons (hidden in new-version mode and edit-pending mode) -->
                        <div v-if="!isNewVersion && !(isEdit && isDocumentPending) && !isEditDraft"
                            class="flex gap-2 w-full mb-4">
                            <AppButton type="button"
                                :buttonStyle="contentMode === ContentType.FILE ? 'primary' : 'secondary'"
                                class="flex-1 py-2.5" @click="switchToUpload" test-id="document-content-upload-btn">
                                {{ t('document.form.upload_file') }}
                            </AppButton>
                            <AppButton type="button"
                                :buttonStyle="contentMode === ContentType.EDITOR ? 'primary' : 'secondary'"
                                class="flex-1 py-2.5" @click="switchToEditor" test-id="document-content-editor-btn">
                                {{ t('document.form.write_in_editor') }}
                            </AppButton>
                            <AppButton type="button"
                                :buttonStyle="contentMode === ContentType.CHECKLIST ? 'primary' : 'secondary'"
                                class="flex-1 py-2.5" @click="switchToChecklist" test-id="document-content-checklist-btn">
                                {{ t('document.form.build_checklist') }}
                            </AppButton>
                        </div>

                        <div v-if="contentMode === ContentType.FILE && !isNewVersion" class="mt-2 w-full">
                            <FileUploader v-model="formData.file" :current-file="formData.title || currentFile || ''"
                                :download-url="downloadUrl" @update:modelValue="handleFileChange"
                                test-id="document-file-upload" accept="*/*" />
                        </div>

                        <div v-if="contentMode === ContentType.CHECKLIST && !isEdit && !isNewVersion"
                            class="mt-2 w-full">
                            <DocumentChecklistBuilder
                                v-model="checklistQuestions"
                                :show-validation-errors="showValidationErrors"
                                ref="checklistBuilderRef"
                            />
                        </div>

                        <div v-if="contentMode === ContentType.EDITOR || (isNewVersion && contentMode !== ContentType.CHECKLIST)"
                            class="mt-2 space-y-4 w-full document-content-editor">
                            <div v-if="showLinkedDraftNotice"
                                class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-neutral-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-3">
                                <div class="flex items-start gap-2 flex-1 min-w-0">
                                    <i class="fa-solid fa-circle-info mt-0.5 text-amber-600 shrink-0"></i>
                                    <span>{{ linkedDraftNoticeText }}</span>
                                </div>
                                <AppButton type="button" buttonStyle="secondary" class="shrink-0"
                                    :loading="isDiscardingDraft" :disabled="isSubmitting || isDraftSubmitting"
                                    test-id="discard-linked-draft-button" @click="handleDiscardLinkedDraftClick">
                                    {{ t('document.form.discard_draft') }}
                                </AppButton>
                            </div>
                            <div v-if="!isNewVersion && !isEditDraft" class="flex justify-end py-4">
                                <AppButton type="button" buttonStyle="secondary" test-id="choose-template-btn"
                                    @click="openTemplateModal">
                                    {{ t('document.form.choose_template') }}
                                </AppButton>
                            </div>
                            <div
                                class="w-full border border-neutral-200 rounded-lg overflow-hidden pb-10 h-[1200px] document-content-superdoc">
                                <SuperDocEditor ref="superdocRef" :key="editorContentKey" :document="superdocSource"
                                    :user="superdocUser" show-open-docx @docx-selected="openDocxInSuperdoc"
                                    @update="onSuperdocUpdate" />
                            </div>
                        </div>
                        </template>
                    </div>
                </div>

                <div class="pt-6 border-t border-neutral-200 flex justify-end gap-4">
                    <AppButton type="button" buttonStyle="secondary" :disabled="isSubmitting || isDraftSubmitting"
                        v-if="!isSubmitting && !isDraftSubmitting" @click="router.push(cancelPath)"
                        test-id="cancel-document-button">
                        {{ t('document.form.cancel') }}
                    </AppButton>
                    <AppButton v-if="showDraftAction" type="button" buttonStyle="secondary" :loading="isDraftSubmitting"
                        :disabled="isSubmitting" @click="onDraftButtonClick" :test-id="draftButtonTestId">
                        {{ t('document.form.save_as_draft') }}
                    </AppButton>
                    <AppButton type="submit" buttonStyle="primary" :loading="isSubmitting" :disabled="isDraftSubmitting"
                        test-id="create-document-button">
                        {{
                            fillPendingVersionId !== null
                                ? t('document.form.submit_save_content')
                                : isNewVersion
                                    ? t('document.form.submit_create_version')
                                    : isEdit
                                        ? t('document.form.submit_update')
                                        : t('document.form.submit_create')
                        }}
                    </AppButton>
                </div>
            </div>
        </Form>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { Form } from 'vee-validate'
import Breadcrumb from '../breadCrums.vue'
import AppButton from '../AppButton.vue'
import Select2 from '../Select2.vue'
import MultiSelect from '../MultiSelect.vue'
import AppInputForm from '../AppInputForm.vue'
import AppTextareaForm from '../AppTextareaForm.vue'
import AppInput from '../AppInput.vue'
import ToggleSwitch from '../ToggleSwitch.vue'
import FileUploader from '../FileUploader.vue'
import SuperDocEditor from '../SuperDocEditor.vue'
import { useAuthStore } from '@/stores/auth'
import { useDialog } from '@/stores/dialog'
import { useToast } from '@/stores/notification'
import { apiDelete, apiGet, apiPost, apiPostFormData, apiPut, apiPutFormData } from '@/util/api'
import { formatApiErrorMessage, getRootUnits, getSuperdocUserFromAuth, appendDocumentDueDate } from '@/util/util'
import { getOrgUnits } from '@/components/common/endpoints'
import { getProcessOptions, type ProcessSummary } from '@/components/processes/endpoints'
import { showTeamPicker, resolveSelectedTeam } from '@/util/teams-feature'
import type {
    ApprovalStrategy,
    Document,
    DocumentChecklistQuestion,
    DocumentDraftDetail,
    DocumentDraftListItem,
    DocumentType,
    OrganizationUnit,
    PaginatedResponse
} from '@/util/interfaces'
import { ContentType, DocumentStatus } from '@/util/interfaces'
import Spinner from '../Spinner.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import DocumentTemplateModal from './document-template-modal.vue'
import DocumentChecklistBuilder from './DocumentChecklistBuilder.vue'
import AddAndReload from '../AddAndReload.vue'
import Notice from '../Notice.vue'

// Define document interface

const { t, locale } = useI18n()

const formRef = ref()
const isEdit = ref(false)
const isNewVersion = ref(false)
const isEditVersion = ref(false)
/** DB id of an existing pending editor version to fill via PUT .../editor-content (not POST /versions). */
const fillPendingVersionId = ref<number | null>(null)
const draftId = ref('')
const isEditDraft = ref(false)
/** Draft linked to document + pending version (edit with pending editor). */
const linkedDraftId = ref('')
const documentId = ref('')
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const dialogStore = useDialog()
const redirect = route.query.redirect as string

const codeRequiredRule = (v: any) => (!v ? t('document.form.code_required') : true)

const isEditPendingVersion = ref(false)

const VAL = {
    UPLOAD_FILE: 'upload_file',
    EDITOR_CONTENT: 'editor_content',
    CHECKLIST: 'checklist',
    CHANGES_DESC: 'changes_desc'
} as const

const validationToastMessage = (code: string) =>
    t(`document.form.validation_${code}` as 'document.form.validation_upload_file')

const cancelPath = computed(() => {
    if (isEditDraft.value) return '/plan/documents/drafts'
    return redirect || '/plan/documents'
})

const breadcrumbCrumbs = computed(() => {
    const crumbs: { name: string; path: string; icon: string }[] = [
        { name: t('nav.documents'), path: '/plan/documents', icon: 'fa-solid fa-file-alt' }
    ]
    if (isEditDraft.value) {
        crumbs.push({
            name: t('document.drafts.breadcrumb'),
            path: '/plan/documents/drafts',
            icon: 'fa-solid fa-file-pen'
        })
    }
    if (isEdit.value || isNewVersion.value) {
        crumbs.push({
            name: t('document.form.breadcrumb_document_details'),
            path: `/plan/documents/${documentId.value}`,
            icon: ''
        })
    }
    let lastName: string
    let lastPath: string
    let icon: string
    if (isNewVersion.value) {
        if (fillPendingVersionId.value !== null) {
            lastName = t('document.form.breadcrumb_add_content')
            lastPath = `/plan/documents/${documentId.value}/new-version?fillPendingVersion=${fillPendingVersionId.value}`
        } else {
            lastName = t('document.form.breadcrumb_create_new_version')
            lastPath = `/plan/documents/${documentId.value}/new-version`
        }
        icon = 'fa-solid fa-plus'
    } else if (isEdit.value) {
        lastName = t('document.form.breadcrumb_edit_document')
        lastPath = `/plan/documents/${documentId.value}/edit`
        icon = 'fa-solid fa-edit'
    } else if (isEditDraft.value) {
        lastName = t('document.drafts.edit_breadcrumb')
        lastPath = `/plan/documents/drafts/${draftId.value}/edit`
        icon = 'fa-solid fa-edit'
    } else {
        lastName = t('document.form.breadcrumb_add_document')
        lastPath = '/plan/documents/add'
        icon = 'fa-solid fa-plus'
    }
    crumbs.push({ name: lastName, path: lastPath, icon })
    return crumbs
})

const fetchedDocument = ref<Document | null>(null)
const isDocumentPending = computed(() => {
    const doc = fetchedDocument.value
    if (!doc?.versions?.length) return false
    return doc.versions.some((v) => v.status === DocumentStatus.PENDING)
})

const pendingVersion = computed(() => {
    const doc = fetchedDocument.value
    if (!doc?.versions?.length) return null
    return (
        doc.versions
            .filter((v) => v.status === DocumentStatus.PENDING)
            .sort((a, b) => b.versionNumber - a.versionNumber)[0] ?? null
    )
})

const isPendingEditorEdit = computed(
    () =>
        isEditPendingVersion.value &&
        isDocumentPending.value &&
        contentMode.value === ContentType.EDITOR &&
        pendingVersion.value != null
)

/** Create next version (not fill-pending): draft is linked to documentId only. */
const isCreateNewVersionDraft = computed(
    () => isNewVersion.value && fillPendingVersionId.value === null
)

const isNewVersionWithDocumentDraft = computed(
    () => isCreateNewVersionDraft.value && !!linkedDraftId.value
)

const showLinkedDraftNotice = computed(
    () =>
        (isPendingEditorEdit.value || isNewVersionWithDocumentDraft.value) &&
        !!linkedDraftId.value
)

const linkedDraftNoticeText = computed(() =>
    isNewVersionWithDocumentDraft.value
        ? t('document.form.new_version_has_draft')
        : t('document.form.pending_version_has_draft')
)

/** SuperDoc source to restore when discarding a linked draft (pending version or published baseline). */
const pendingVersionSuperdocSource = ref<File | Blob | string | null>(null)
const newVersionPublishedBaselineSource = ref<File | Blob | string | null>(null)
const isDiscardingDraft = ref(false)

const currentFile = ref('')
const downloadUrl = ref('')
const orgunitTitle = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)
const isDraftSubmitting = ref(false)
const isCreateDocument = computed(
    () => !isEdit.value && !isNewVersion.value && !isEditDraft.value
)

const contentMode = ref<ContentType>(ContentType.FILE)
const showDocumentName = computed(
    () =>
        !isNewVersion.value &&
        (contentMode.value === ContentType.EDITOR ||
            contentMode.value === ContentType.CHECKLIST)
)
const checklistQuestions = ref<DocumentChecklistQuestion[]>([])
const checklistBuilderRef = ref<InstanceType<typeof DocumentChecklistBuilder> | null>(null)

const DOCX_MIME =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const superdocRef = ref<InstanceType<typeof SuperDocEditor> | null>(null)

/** SuperDoc loads docx; null for new docs (starts blank). */
const superdocSource = ref<File | Blob | string | null>(null)
/** False after load/template apply until the user edits in SuperDoc. */
const hasSuperdocEdits = ref(false)

function isDocxFile(file: File) {
    return (
        file.type === DOCX_MIME ||
        file.name.toLowerCase().endsWith('.docx')
    )
}

function openDocxInSuperdoc(file: File) {
    if (!isDocxFile(file)) {
        toast.showToast(
            t('common.error'),
            t('document.form.toast_open_docx_invalid'),
            'error'
        )
        return
    }
    contentMode.value = ContentType.EDITOR
    formData.value.file = null
    if (!formData.value.title?.trim()) {
        formData.value.title = file.name.replace(/\.docx$/i, '')
    }
    resetSuperdocEditor(file)
}

function resetSuperdocEditorKey() {
    editorContentKey.value += 1
}

function resetSuperdocEditor(source: File | Blob | string | null = null) {
    superdocSource.value = source
    resetSuperdocEditorKey()
    hasSuperdocEdits.value = false
}

function onSuperdocUpdate() {
    hasSuperdocEdits.value = true
}

function isSuperdocLoadableContent(content: string): boolean {
    const trimmed = content?.trim() || ''
    if (!trimmed) return false
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true
    if (trimmed.toLowerCase().endsWith('.docx')) return true
    return false
}

async function exportSuperdocDocx(fileName: string): Promise<File> {
    if (!superdocRef.value) {
        throw new Error('SuperDoc editor is not ready')
    }
    return superdocRef.value.exportDocx(fileName)
}

async function isSuperdocEmpty(): Promise<boolean> {
    if (!superdocRef.value) return true
    return superdocRef.value.isEmpty()
}

const superdocUser = computed(() => getSuperdocUserFromAuth(authStore.state.userDetails))

const showDraftAction = computed(
    () =>
        contentMode.value === ContentType.EDITOR &&
        (isCreateDocument.value ||
            isEditDraft.value ||
            isPendingEditorEdit.value ||
            isCreateNewVersionDraft.value)
)

const draftButtonTestId = computed(() => {
    if (isCreateDocument.value) return 'create-document-draft-button'
    if (isEditDraft.value) return 'save-document-draft-button'
    if (isPendingEditorEdit.value) return 'save-as-draft-pending-button'
    return 'save-as-draft-new-version-button'
})

const showValidationErrors = ref(false)
const editorContentKey = ref(0)

// Form data
const formData = ref({
    code: undefined,
    title: '',
    description: '',
    version: 1,
    documentType: {
        id: 0,
        name: ''
    },
    organizationUnit: {
        id: 0,
        name: ''
    },
    isPublic: true,
    isAiAccessible: false,
    file: null as File | null,
    dueDate: '',
    changes: '',
    neverExpires: false,
    selectedTemplateId: null as string | null
})

const optionsData = ref<any>({})
const approvalStrategies = ref<ApprovalStrategy[]>([])
const orgUnitTree = ref<OrganizationUnit[]>([])
const processes = ref<ProcessSummary[]>([])
const selectedProcesses = ref<ProcessSummary[]>([])

const getStrategyUnitIds = (strategy: ApprovalStrategy): number[] =>
    (strategy.organizationUnits ?? [])
        .map((unit) => unit.id)
        .filter((id): id is number => typeof id === 'number' && id > 0)

const resolveApprovalStrategy = (
    categoryId: number,
    orgUnitId: number,
): ApprovalStrategy | null => {
    if (!approvalStrategies.value.length) return null

    if (categoryId) {
        const categoryStrategy = approvalStrategies.value.find(
            (strategy) =>
                strategy.documentType?.id === categoryId ||
                strategy.documentTypeId === categoryId,
        )
        if (categoryStrategy) return categoryStrategy
    }

    const defaultStrategy = approvalStrategies.value.find((strategy) => strategy.isDefault)
    if (defaultStrategy) return defaultStrategy

    if (!orgUnitId) return null

    for (const strategy of approvalStrategies.value) {
        if (strategy.documentType?.id || strategy.documentTypeId) continue
        let orgUnitIds = getStrategyUnitIds(strategy)
        if (strategy.includeChildren && orgUnitTree.value.length) {
            orgUnitIds = getRootUnits(orgUnitIds, orgUnitTree.value)
        }
        if (orgUnitIds.includes(orgUnitId)) return strategy
    }

    return null
}

const hasResolvableApprovalStrategy = (
    categoryId: number,
    orgUnitId: number,
): boolean => !!resolveApprovalStrategy(categoryId, orgUnitId)

const hasApprovalWorkflowStarted = (doc: Document | null): boolean => {
    if (!doc) return false
    if (doc.versions?.some((v) => v.status === DocumentStatus.PUBLISHED)) {
        return true
    }
    const lockActionTypes = new Set([
        'reviewed',
        'reviewed_rejected',
        'approved',
        'rejected',
        'override_approved',
        'ready_for_approval',
        'published',
    ])
    return (doc.contributors ?? []).some((contributor) =>
        (contributor.actions ?? []).some((action) => {
            const actionType = (action as { actionType?: string; type?: string }).actionType
                ?? (action as { actionType?: string; type?: string }).type
            return actionType ? lockActionTypes.has(actionType) : false
        }),
    )
}

const categoryLockedByStrategy = computed(() => {
    if (!isEdit.value) return false
    const categoryId = Number(formData.value.documentType?.id || 0)
    if (!categoryId) return false
    const categoryStrategy = approvalStrategies.value.find(
        (strategy) =>
            strategy.documentType?.id === categoryId ||
            strategy.documentTypeId === categoryId,
    )
    if (!categoryStrategy) return false
    const docStrategyId = fetchedDocument.value?.approvalStrategy?.id
    if (!docStrategyId || docStrategyId !== categoryStrategy.id) return false
    return hasApprovalWorkflowStarted(fetchedDocument.value)
})

const selectedCategoryId = computed(() =>
    Number(optionsData.value.documentType?.id || formData.value.documentType?.id || 0),
)

const selectedOrgUnitId = computed(() =>
    Number(
        formData.value.organizationUnit?.id || optionsData.value.organizationUnit?.id || 0,
    ),
)

const resolvedApprovalStrategy = computed(() =>
    resolveApprovalStrategy(selectedCategoryId.value, selectedOrgUnitId.value),
)

const isRefreshingApprovalStrategies = ref(false)

const approvalStrategyPreviewDescription = computed(() => {
    const strategyName =
        isEdit.value || isNewVersion.value
            ? fetchedDocument.value?.approvalStrategy?.name
            : resolvedApprovalStrategy.value?.name
    const name = strategyName?.trim() || 'N/A'
    return t('document.form.approval_strategy_used', { name })
})

const approvalStrategiesSettingsLink = {
    href: '/plan/documents/approval-strategies/add',
    labelKey: 'document.form.approval_strategies_settings_link'
} as const

const missingDocumentCategories = computed(
    () => isCreateDocument.value && !optionsData.value.documentTypes?.length
)

const selectedOrgMissingStrategy = computed(() => {
    if (!isCreateDocument.value) return false
    const categoryId = Number(
        optionsData.value.documentType?.id || formData.value.documentType?.id || 0
    )
    const orgId = Number(
        formData.value.organizationUnit?.id || optionsData.value.organizationUnit?.id || 0
    )
    if (!categoryId || !orgId) return false
    return !hasResolvableApprovalStrategy(categoryId, orgId)
})

const displayName = (item: any) => item?.name || ''
const displayOrganizationUnit = (item: any) => item?.name || ''
const displayProcess = (item?: ProcessSummary | null) => {
    if (!item) return ''
    return item.code ? `${item.code} — ${item.name}` : item.name
}

const processBelongsToTeam = (
    process: ProcessSummary | null | undefined,
    teamId: number
) =>
    !!process &&
    !!teamId &&
    (process.organizationUnits || []).some((unit) => Number(unit.id) === Number(teamId))

const teamsForProcess = (
    units: OrganizationUnit[],
    process: ProcessSummary | null | undefined
): OrganizationUnit[] => {
    if (!process) return units
    const ids = new Set((process.organizationUnits || []).map((unit) => Number(unit.id)))
    if (!ids.size) return units
    const matching = units.filter((unit) => ids.has(Number(unit.id)))
    return matching.length
        ? matching
        : (process.organizationUnits || []).map(
              (unit) => ({ id: unit.id, name: unit.name }) as OrganizationUnit
          )
}

const lockedProcessId = computed(() => {
    if (isEdit.value || isNewVersion.value || isEditDraft.value) return ''
    return String(route.query.processId || '')
})

const preselectedProcess = computed(
    () =>
        (lockedProcessId.value
            ? processes.value.find((process) => process.id === lockedProcessId.value)
            : null) ?? null
)

const availableOrganizationUnits = computed(() =>
    teamsForProcess(optionsData.value.organizationUnits || [], preselectedProcess.value)
)

const availableProcesses = computed(() => {
    if (preselectedProcess.value) return [preselectedProcess.value]
    const teamId = selectedOrgUnitId.value
    if (!teamId) return []
    return processes.value.filter((process) => processBelongsToTeam(process, teamId))
})

const syncSelectedProcessesForTeam = (teamId: number) => {
    if (!teamId) {
        if (!lockedProcessId.value) {
            selectedProcesses.value = []
        }
        return
    }
    if (preselectedProcess.value) {
        selectedProcesses.value = [preselectedProcess.value]
        return
    }
    selectedProcesses.value = selectedProcesses.value.filter((process) =>
        processBelongsToTeam(process, teamId)
    )
}

const clearEditorState = () => {
    resetSuperdocEditor(null)
    formData.value.selectedTemplateId = null
}

const clearChecklistState = () => {
    checklistQuestions.value = []
}

const applySwitchToUpload = () => {
    contentMode.value = ContentType.FILE
    clearEditorState()
    clearChecklistState()
    formData.value.title = ''
    formData.value.file = null
}

const hasChecklistContent = () =>
    checklistQuestions.value.some((q) => q.question?.trim() || q.questionType)

const confirmContentSwitch = async (message: string, onConfirm: () => void) => {
    const hasEditorContent = !(await isSuperdocEmpty())
    const hasFile = !!formData.value.file
    const hasChecklist = hasChecklistContent()
    if (hasEditorContent || hasFile || hasChecklist) {
        dialogStore.openDialog(ConfirmDialog, {
            message,
            onConfirm: () => {
                onConfirm()
                dialogStore.closeDialog()
            },
            onCancel: dialogStore.closeDialog
        })
    } else {
        onConfirm()
    }
}

const switchToUpload = async () => {
    if (contentMode.value === ContentType.FILE) return
    await confirmContentSwitch(t('document.form.confirm_switch_upload'), applySwitchToUpload)
}

const switchToEditor = async () => {
    if (contentMode.value === ContentType.EDITOR) return
    const pendingFile = formData.value.file
    const openEditor = () => {
        contentMode.value = ContentType.EDITOR
        clearChecklistState()
        if (pendingFile && isDocxFile(pendingFile)) {
            openDocxInSuperdoc(pendingFile)
        } else {
            formData.value.file = null
            resetSuperdocEditor(null)
            if (!pendingFile) {
                formData.value.title = ''
            }
        }
    }
    if (pendingFile && !isDocxFile(pendingFile)) {
        dialogStore.openDialog(ConfirmDialog, {
            message: t('document.form.confirm_switch_editor'),
            onConfirm: () => {
                openEditor()
                dialogStore.closeDialog()
            },
            onCancel: dialogStore.closeDialog
        })
    } else {
        await confirmContentSwitch(t('document.form.confirm_switch_editor'), openEditor)
    }
}

const applySwitchToChecklist = () => {
    contentMode.value = ContentType.CHECKLIST
    clearEditorState()
    formData.value.file = null
    if (!checklistQuestions.value.length) {
        checklistQuestions.value = []
    }
}

const switchToChecklist = async () => {
    if (contentMode.value === ContentType.CHECKLIST) return
    await confirmContentSwitch(t('document.form.confirm_switch_checklist'), applySwitchToChecklist)
}

const applyDraftContentToForm = (draft: DocumentDraftDetail) => {
    contentMode.value = ContentType.EDITOR
    const contentUrl = draft.contentUrl?.trim() || ''
    if (isSuperdocLoadableContent(contentUrl)) {
        resetSuperdocEditor(contentUrl)
    } else if (contentUrl) {
        resetSuperdocEditor(null)
        toast.showToast(
            t('common.error'),
            t('document.form.toast_fetch_draft_failed'),
            'error'
        )
    } else {
        resetSuperdocEditor(null)
    }
}

const loadLinkedDraftContent = async (id: string) => {
    const draft = await apiGet<DocumentDraftDetail>(`/documents/drafts/${id}`, authStore)
    applyDraftContentToForm(draft)
}

const getDraftLinkPayload = (): {
    documentId?: string
    documentVersionId?: number
} => {
    if (isPendingEditorEdit.value && pendingVersion.value) {
        return {
            documentId: documentId.value,
            documentVersionId: pendingVersion.value.id
        }
    }
    if (isCreateNewVersionDraft.value) {
        return { documentId: documentId.value }
    }
    return {}
}

const buildDocumentDraftFormData = async (options?: {
    documentId?: string
    documentVersionId?: number
}): Promise<FormData> => {
    const fileName = `${formData.value.title?.trim() || 'draft'}.docx`
    const docxFile = await exportSuperdocDocx(fileName)
    const payload = new FormData()
    payload.append('file', docxFile)
    if (options?.documentId != null) {
        payload.append('documentId', options.documentId)
    }
    if (options?.documentVersionId != null) {
        payload.append('documentVersionId', String(options.documentVersionId))
    }
    return payload
}

const fetchDraft = async () => {
    if (!draftId.value) return

    try {
        isLoading.value = true
        const draft = await apiGet<DocumentDraftDetail>(
            `/documents/drafts/${draftId.value}`,
            authStore
        )

        formData.value.title = ''
        applyDraftContentToForm(draft)
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.form.toast_fetch_draft_failed'),
            'error'
        )
    } finally {
        isLoading.value = false
    }
}


const appendDocumentDraftIdIfEditing = (target: Record<string, unknown> | FormData) => {
    if (!isEditDraft.value || !draftId.value) return
    if (target instanceof FormData) {
        target.append('documentDraftId', draftId.value)
    } else {
        target.documentDraftId = draftId.value
    }
}

/** After save changes on pending editor edit, backend deletes the linked draft. */
const appendLinkedDraftIdForDelete = (target: Record<string, unknown> | FormData) => {
    if (!linkedDraftId.value) return
    if (target instanceof FormData) {
        target.append('documentDraftId', linkedDraftId.value)
    } else {
        target.documentDraftId = linkedDraftId.value
    }
}

const buildDocumentMetadataPayload = (values: { code: string; description?: string }) => {
    const payload: Record<string, unknown> = {
        documentCode: values.code,
        title: formData.value.title,
        description: values.description ?? '',
        documentTypeId: formData.value.documentType?.id,
        teamId: formData.value.organizationUnit?.id,
        isPublic: formData.value.isPublic,
        isAiAccessible: formData.value.isAiAccessible,
        processIds: selectedProcesses.value.map((process) => process.id)
    }
    if (formData.value.dueDate) {
        payload.dueDate = new Date(formData.value.dueDate).getTime()
    }
    return payload
}

// Fetch document data for edit or new-version mode
const fetchDocument = async () => {
    if (!isEdit.value && !isNewVersion.value) return

    try {
        isLoading.value = true
        const document = await apiGet<Document>(
            `/documents/${documentId.value}?includeLatestPublishedContent=true`,
            authStore
        )
        fetchedDocument.value = document

        // Format date from timestamp to YYYY-MM-DD
        let dueDate = ''
        if (document.dueDate) {
            try {
                const timestamp =
                    typeof document.dueDate === 'string'
                        ? parseInt(document.dueDate, 10)
                        : document.dueDate

                const date = new Date(timestamp)

                // Check if date is valid before calling toISOString
                if (!isNaN(date.getTime())) {
                    dueDate = date.toISOString().split('T')[0]
                }
            } catch (error) {
                console.error('Invalid date value:', document.dueDate, error)
            }
        }

        // Force boolean conversion
        const isPublicValue = Boolean(document.isPublic)
        const isAiAccessibleValue = Boolean(document.isAiAccessible)

        const fillId = fillPendingVersionId.value
        let newVersionNumber = isNewVersion.value ? document.currentVersion + 1 : document.currentVersion

        if (isNewVersion.value && fillId != null && !isEditVersion.value) {
            const pendingVersion = document.versions?.find((v) => v.id === fillId)
            if (!pendingVersion || document.contentType !== ContentType.EDITOR) {
                toast.showToast(t('common.error'), t('document.form.toast_pending_version_error'), 'error')
                fillPendingVersionId.value = null
                const q = { ...route.query } as Record<string, string | string[] | undefined>
                delete q.fillPendingVersion
                router.replace({ path: route.path, query: q })
            } else {
                newVersionNumber = pendingVersion.versionNumber
            }
        }

        formData.value = {
            code: document.documentCode as any,
            title: document.title || '',
            description: document.description || '',
            version: newVersionNumber,
            documentType: {
                id: document.documentType?.id || 0,
                name: document.documentType?.name || ''
            },
            organizationUnit: {
                id: document.team?.id || 0,
                name: document.team?.name || ''
            },
            isPublic: isPublicValue,
            isAiAccessible: isAiAccessibleValue,
            file: null,
            dueDate: dueDate,
            changes: '',
            neverExpires: !document.dueDate,
            selectedTemplateId: document.documentTemplate?.id ?? null
        }
        orgunitTitle.value = document.team?.name || ''
        currentFile.value = document.title || ''
        const versionForDownload = document.versions?.[document.currentVersion - 1]
        downloadUrl.value = versionForDownload?.file || versionForDownload?.content || ''

        // Set select values
        if (document.documentType) {
            optionsData.value.documentType = document.documentType
        }
        if (document.organizationUnit) {
            optionsData.value.organizationUnit = document.organizationUnit
        }
        const linkedProcessIds = new Set((document.processes || []).map((process) => process.id))
        selectedProcesses.value = processes.value.filter((process) =>
            linkedProcessIds.has(process.id)
        )
        for (const process of document.processes || []) {
            if (!selectedProcesses.value.some((selected) => selected.id === process.id)) {
                selectedProcesses.value.push({
                    id: process.id,
                    name: process.name,
                    code: process.code ?? null
                })
            }
        }
        // Show editor and prefill when document is editor type.
        if (document.contentType === ContentType.EDITOR) {
            contentMode.value = ContentType.EDITOR
            const docxUrl =
                isEditVersion.value && document.pendingVersionContentUrl
                    ? document.pendingVersionContentUrl
                    : document.latestPublishedVersionContentUrl ??
                    document.pendingVersionContentUrl ??
                    null
            if (docxUrl) {
                resetSuperdocEditor(docxUrl)
            } else if (document.latestPublishedVersionContent || document.pendingVersionContent) {
                resetSuperdocEditor(null)
                toast.showToast(
                    t('common.error'),
                    t('document.form.toast_fetch_document_failed'),
                    'error'
                )
            } else {
                resetSuperdocEditor(null)
            }
        } else if (document.contentType === ContentType.CHECKLIST) {
            contentMode.value = ContentType.CHECKLIST
        } else {
            contentMode.value = ContentType.FILE
        }

        if (
            (isEdit.value || isEditPendingVersion.value) &&
            document.contentType === ContentType.EDITOR &&
            document.versions?.some((v) => v.status === DocumentStatus.PENDING)
        ) {
            const rawDraftId = route.query.draftId
            const draftIdFromQuery =
                typeof rawDraftId === 'string'
                    ? rawDraftId
                    : Array.isArray(rawDraftId)
                        ? rawDraftId[0]
                        : ''

            if (draftIdFromQuery) {
                linkedDraftId.value = draftIdFromQuery
            } else {
                await resolveLinkedDraftForPendingVersion()
            }

            if (linkedDraftId.value) {
                pendingVersionSuperdocSource.value = superdocSource.value
                try {
                    await loadLinkedDraftContent(linkedDraftId.value)
                } catch (error: any) {
                    const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
                    toast.showToast(
                        t('common.error'),
                        apiMsg || t('document.form.toast_fetch_draft_failed'),
                        'error'
                    )
                }
            }
        }

        if (
            isNewVersion.value &&
            fillPendingVersionId.value === null &&
            document.contentType === ContentType.EDITOR
        ) {
            const rawDraftId = route.query.draftId
            const draftIdFromQuery =
                typeof rawDraftId === 'string'
                    ? rawDraftId
                    : Array.isArray(rawDraftId)
                        ? rawDraftId[0]
                        : ''

            if (draftIdFromQuery) {
                linkedDraftId.value = draftIdFromQuery
            } else {
                await resolveLinkedDraftForNewVersion()
            }

            if (linkedDraftId.value) {
                newVersionPublishedBaselineSource.value = superdocSource.value
                try {
                    await loadLinkedDraftContent(linkedDraftId.value)
                } catch (error: any) {
                    const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
                    toast.showToast(
                        t('common.error'),
                        apiMsg || t('document.form.toast_fetch_draft_failed'),
                        'error'
                    )
                }
            }
        }
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), apiMsg || t('document.form.toast_fetch_document_failed'), 'error')
    } finally {
        isLoading.value = false
    }
}

const resolveLinkedDraftForPendingVersion = async () => {
    const pv = pendingVersion.value
    if (!pv || !documentId.value) {
        linkedDraftId.value = ''
        return
    }
    try {
        const response = await apiGet<PaginatedResponse<DocumentDraftListItem>>(
            '/documents/drafts?perPage=50&page=1',
            authStore
        )
        const match = response.data
            .filter(
                (d) => d.documentId === documentId.value && d.documentVersionId === pv.id
            )
            .sort((a, b) => b.updatedAt - a.updatedAt)[0]
        linkedDraftId.value = match?.id ?? ''
    } catch {
        linkedDraftId.value = ''
    }
}

const resolveLinkedDraftForNewVersion = async () => {
    if (!documentId.value) {
        linkedDraftId.value = ''
        return
    }
    try {
        const response = await apiGet<PaginatedResponse<DocumentDraftListItem>>(
            '/documents/drafts?perPage=50&page=1',
            authStore
        )
        const match = response.data
            .filter(
                (d) =>
                    d.documentId === documentId.value && d.documentVersionId == null
            )
            .sort((a, b) => b.updatedAt - a.updatedAt)[0]
        linkedDraftId.value = match?.id ?? ''
    } catch {
        linkedDraftId.value = ''
    }
}

// File handling
const handleFileChange = (file: File | null) => {
    if (file) {
        if (isDocxFile(file) && (isCreateDocument.value || contentMode.value === ContentType.FILE)) {
            openDocxInSuperdoc(file)
            return
        }
        formData.value.title = file.name.split('.').slice(0, -1).join('.')
        if (isEdit.value) {
            const current = Number(formData.value.version) || 0
            formData.value.version = (current + 1) as any
        }
    } else if (!file && !isEdit.value) {
        formData.value.title = ''
    }
}

// Handle never expires checkbox change
const handleNeverExpiresChange = () => {
    if (formData.value.neverExpires) {
        formData.value.dueDate = ''
    }
}

const fetchApprovalStrategies = async () => {
    try {
        const [strategies, teams] = await Promise.all([
            apiGet<ApprovalStrategy[]>(
                '/documents/approval-strategies',
                authStore
            ),
            getOrgUnits('documents', authStore)
        ])
        approvalStrategies.value = strategies ?? []
        orgUnitTree.value = teams ?? []
    } catch (error) {
        console.error('Error fetching approval strategies:', error)
        approvalStrategies.value = []
        orgUnitTree.value = []
    }
}

const refreshApprovalStrategies = async () => {
    isRefreshingApprovalStrategies.value = true
    try {
        await fetchApprovalStrategies()
    } finally {
        isRefreshingApprovalStrategies.value = false
    }
}

const reloadDocumentCategories = async () => {
    try {
        const types = await apiGet<DocumentType[]>('/documents/types', authStore)
        optionsData.value.documentTypes = types
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), apiMsg || t('document.form.toast_fetch_options_failed'), 'error')
    }
}

// Fetch options
const fetchOptions = async () => {
    try {
        const [types, units, processOptions] = await Promise.all([
            apiGet<DocumentType[]>('/documents/types', authStore),
            getOrgUnits('documents', authStore),
            getProcessOptions(authStore).catch(() => [] as ProcessSummary[])
        ])
        await fetchApprovalStrategies()
        processes.value = processOptions || []

        const queryProcess = !isEdit.value && !isNewVersion.value && !isEditDraft.value
            ? processes.value.find((process) => process.id === String(route.query.processId || ''))
            : undefined
        if (queryProcess) {
            selectedProcesses.value = [queryProcess]
        }

        optionsData.value = {
            documentTypes: types,
            organizationUnits: units || [],
            documentType: { id: '', name: t('document.form.placeholder_select_category') },
            organizationUnit: { id: '', name: t('document.form.placeholder_select_org_unit') }
        }

        if (!isEdit.value && !isNewVersion.value && !isEditDraft.value) {
            const selected = resolveSelectedTeam(teamsForProcess(units || [], queryProcess))
            if (selected) {
                optionsData.value.organizationUnit = selected
                formData.value.organizationUnit = selected
            }
        }

        if (isEditDraft.value) {
            await fetchDraft()
        } else if (isEdit.value || isNewVersion.value) {
            await fetchDocument()
        } else {
            isLoading.value = false
        }
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), apiMsg || t('document.form.toast_fetch_options_failed'), 'error')
    }
}

watch(locale, () => {
    if (!optionsData.value.documentTypes?.length) return
    if (!optionsData.value.documentType?.id) {
        optionsData.value.documentType = {
            id: '',
            name: t('document.form.placeholder_select_category')
        }
    }
    if (!optionsData.value.organizationUnit?.id) {
        optionsData.value.organizationUnit = {
            id: '',
            name: t('document.form.placeholder_select_org_unit')
        }
    }
})

const onInvalidSubmit = () => {
    showValidationErrors.value = true
}

const validateDraftContent = async (): Promise<boolean> => {
    if (await isSuperdocEmpty()) {
        toast.showToast(
            t('common.error'),
            validationToastMessage(VAL.EDITOR_CONTENT),
            'error'
        )
        return false
    }
    return true
}

const discardLinkedDraft = async () => {
    const id = linkedDraftId.value
    if (!id) return

    isDiscardingDraft.value = true
    try {
        const restoreSource = isCreateNewVersionDraft.value
            ? newVersionPublishedBaselineSource.value
            : pendingVersionSuperdocSource.value
        await apiDelete(`/documents/drafts/${id}`, authStore)
        linkedDraftId.value = ''
        resetSuperdocEditor(restoreSource)

        if (route.query.draftId) {
            const q = { ...route.query } as Record<string, string | string[] | undefined>
            delete q.draftId
            router.replace({ path: route.path, query: q })
        }

        toast.showToast(t('common.success'), t('document.form.toast_draft_discarded_ok'), 'success')
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.form.toast_draft_discard_failed'),
            'error'
        )
    } finally {
        isDiscardingDraft.value = false
    }
}

const handleDiscardLinkedDraftClick = () => {
    dialogStore.openDialog(ConfirmDialog, {
        message: isNewVersionWithDocumentDraft.value
            ? t('document.form.confirm_discard_new_version_draft')
            : t('document.form.confirm_discard_draft'),
        onConfirm: () => {
            dialogStore.closeDialog()
            discardLinkedDraft()
        },
        onCancel: dialogStore.closeDialog
    })
}

const onDraftButtonClick = () => {
    if (isCreateDocument.value) {
        dialogStore.openDialog(ConfirmDialog, {
            message: t('document.form.confirm_create_draft'),
            onConfirm: () => {
                dialogStore.closeDialog()
                submitDocumentDraft()
            },
            onCancel: dialogStore.closeDialog
        })
        return
    }
    submitDocumentDraft()
}

const submitDocumentDraft = async () => {
    if (!(await validateDraftContent())) return

    isDraftSubmitting.value = true
    const hadLinkedDraft = !!linkedDraftId.value
    try {
        if (isPendingEditorEdit.value && !pendingVersion.value) {
            toast.showToast(
                t('common.error'),
                t('document.form.toast_pending_version_error'),
                'error'
            )
            return
        }

        const draftFormData = await buildDocumentDraftFormData(getDraftLinkPayload())

        if (isEditDraft.value) {
            await apiPutFormData(`/documents/drafts/${draftId.value}`, draftFormData, authStore)
            toast.showToast(t('common.success'), t('document.form.toast_draft_updated_ok'), 'success')
            router.push('/plan/documents/drafts')
            return
        }

        if (linkedDraftId.value) {
            await apiPutFormData(`/documents/drafts/${linkedDraftId.value}`, draftFormData, authStore)
            toast.showToast(t('common.success'), t('document.form.toast_draft_updated_ok'), 'success')
            if (isPendingEditorEdit.value) {
                router.push('/plan/documents/drafts')
            }
            return
        }

        const created = await apiPostFormData<{ id: string }>('/documents/drafts', draftFormData, authStore)
        if (isPendingEditorEdit.value || isCreateNewVersionDraft.value) {
            linkedDraftId.value = created?.id ?? ''
        }
        toast.showToast(t('common.success'), t('document.form.toast_draft_created_ok'), 'success')
        if (isPendingEditorEdit.value || isCreateNewVersionDraft.value || isCreateDocument.value) {
            router.push('/plan/documents/drafts')
        }
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        const isUpdate =
            isEditDraft.value ||
            (isPendingEditorEdit.value && hadLinkedDraft) ||
            (isCreateNewVersionDraft.value && hadLinkedDraft)
        toast.showToast(
            t('common.error'),
            apiMsg ||
            (isUpdate
                ? t('document.form.toast_draft_update_failed')
                : t('document.form.toast_draft_create_failed')),
            'error'
        )
    } finally {
        isDraftSubmitting.value = false
    }
}

// Submit form
const handleSubmit = async (values: any) => {
    showValidationErrors.value = true
    try {
        let errors: string[] = []
        // Validate content for add mode (keep as toast only - per requirement)
        if (!isEdit.value) {
            if (contentMode.value === ContentType.FILE && !formData.value.file) {
                if (!(isEditDraft.value && downloadUrl.value)) {
                    errors.push(VAL.UPLOAD_FILE)
                }
            } else if (contentMode.value === ContentType.EDITOR) {
                if (await isSuperdocEmpty()) {
                    errors.push(VAL.EDITOR_CONTENT)
                }
            } else if (contentMode.value === ContentType.CHECKLIST) {
                if (!checklistBuilderRef.value?.validate()) {
                    errors.push(VAL.CHECKLIST)
                }
            }
        }

        if (isEdit.value && formData.value.file && !values.changes) {
            errors.push(VAL.CHANGES_DESC)
        }

        if (!formData.value.documentType?.id) {
            errors.push('category')
        }
        if (!formData.value.organizationUnit?.id && !isEdit.value) {
            errors.push('org')
        }
        if (showDocumentName.value && !formData.value.title?.trim()) {
            errors.push(
                contentMode.value === ContentType.CHECKLIST
                    ? 'title_checklist'
                    : 'title_editor'
            )
        }
        const code = isNewVersion.value ? formData.value.code : values?.code
        if (!code?.toString?.()?.trim?.()) {
            errors.push('code')
        }

        if (errors.length > 0) {
            const contentOrChangesErrors = errors.filter(
                (e) =>
                    e === VAL.UPLOAD_FILE ||
                    e === VAL.EDITOR_CONTENT ||
                    e === VAL.CHECKLIST ||
                    e === VAL.CHANGES_DESC
            )
            if (contentOrChangesErrors.length) {
                toast.showToast(
                    t('common.error'),
                    contentOrChangesErrors.map((c) => validationToastMessage(c)).join(', '),
                    'error'
                )
            }
            return
        }

        if (
            !isEdit.value &&
            !isNewVersion.value &&
            contentMode.value === ContentType.EDITOR &&
            formData.value.selectedTemplateId &&
            !hasSuperdocEdits.value
        ) {
            toast.showToast(
                t('document.form.toast_unchanged_title'),
                t('document.form.toast_unchanged_template'),
                'error'
            )
            return
        }

        isSubmitting.value = true

        // Fill an existing pending editor version (shell) — separate from creating the next version
        if (isNewVersion.value && fillPendingVersionId.value != null) {
            try {
                let docxFile: File
                try {
                    docxFile = await exportSuperdocDocx(`${formData.value.title || 'document'}.docx`)
                } catch (err) {
                    console.error('SuperDoc export failed:', err)
                    isSubmitting.value = false
                    toast.showToast(t('common.error'), t('document.form.toast_submit_failed_create'), 'error')
                    return
                }
                const uploadForm = new FormData()
                uploadForm.append('file', docxFile)
                if (formData.value.changes?.trim()) {
                    uploadForm.append('changes', formData.value.changes.trim())
                }
                if (linkedDraftId.value) {
                    uploadForm.append('documentDraftId', linkedDraftId.value)
                }
                await apiPutFormData(
                    `/documents/${documentId.value}/versions/${fillPendingVersionId.value}/editor-content`,
                    uploadForm,
                    authStore
                )
                toast.showToast(t('common.success'), t('document.form.toast_save_version_content_ok'), 'success')
                router.push(redirect || `/plan/documents/${documentId.value}`)
            } catch (error: any) {
                const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
                toast.showToast(
                    t('common.error'),
                    apiMsg || t('document.form.toast_save_version_content_failed'),
                    'error'
                )
            } finally {
                isSubmitting.value = false
            }
            return
        }

        // Create new version: export docx + file upload
        if (isNewVersion.value) {
            if (!hasSuperdocEdits.value) {
                isSubmitting.value = false
                toast.showToast(
                    t('document.form.toast_unchanged_title'),
                    t('document.form.toast_unchanged_version'),
                    'error'
                )
                return
            }
            let docxFile: File
            try {
                docxFile = await exportSuperdocDocx(`${formData.value.title || 'document'}.docx`)
            } catch (err) {
                console.error('SuperDoc export failed:', err)
                isSubmitting.value = false
                toast.showToast(t('common.error'), t('document.form.toast_submit_failed_create'), 'error')
                return
            }
            const versionForm = new FormData()
            versionForm.append('file', docxFile)
            if (formData.value.changes?.trim()) {
                versionForm.append('changes', formData.value.changes.trim())
            }
            if (linkedDraftId.value) {
                versionForm.append('documentDraftId', linkedDraftId.value)
            }
            appendDocumentDueDate(versionForm, formData.value.dueDate, formData.value.neverExpires)
            await apiPostFormData(`/documents/${documentId.value}/versions`, versionForm, authStore)
            toast.showToast(t('common.success'), t('document.form.toast_new_version_ok'), 'success')
            router.push(redirect || `/plan/documents/${documentId.value}`)
            return
        }

        // Editor (create only): export docx and upload via FormData with contentType EDITOR
        if (!isEdit.value && contentMode.value === ContentType.EDITOR) {
            const baseTitle = (formData.value.title || values.code || t('document.form.default_document_title'))
                .toString()
                .trim() || t('document.form.default_document_title')
            try {
                formData.value.file = await exportSuperdocDocx(`${baseTitle}.docx`)
            } catch (err) {
                console.error('SuperDoc export failed:', err)
                isSubmitting.value = false
                toast.showToast(
                    t('common.error'),
                    t('document.form.toast_submit_failed_create'),
                    'error'
                )
                return
            }
        }

        // Create: send FormData (includes file when present)
        const formDataToSend = new FormData()
        let fileToSend: File | null = formData.value.file
        const titleFromFile = fileToSend
            ? fileToSend.name.split('.').slice(0, -1).join('.') || fileToSend.name
            : ''
        const titleToSend =
            formData.value.title?.trim() ||
            (contentMode.value === ContentType.FILE ? titleFromFile : '')

        formDataToSend.append('documentCode', values.code)
        formDataToSend.append('title', titleToSend)
        formDataToSend.append('description', values.description)
        formDataToSend.append('documentTypeId', formData.value.documentType?.id.toString())
        formDataToSend.append('teamId', formData.value.organizationUnit?.id.toString())
        formDataToSend.append('isPublic', String(formData.value.isPublic))
        formDataToSend.append('isAiAccessible', String(formData.value.isAiAccessible))
        formDataToSend.append('versionNumber', formData.value.version.toString())
        formDataToSend.append('contentType', contentMode.value)
        formDataToSend.append(
            'processIds',
            JSON.stringify(selectedProcesses.value.map((process) => process.id))
        )

        if (formData.value.dueDate) {
            formDataToSend.append('dueDate', new Date(formData.value.dueDate).getTime().toString())
        }

        if (fileToSend) {
            formDataToSend.append('file', fileToSend)
        }

        if (contentMode.value === ContentType.CHECKLIST) {
            formDataToSend.append(
                'checklist',
                JSON.stringify({
                    questions: checklistQuestions.value.map((question, orderIndex) => ({
                        question: question.question.trim(),
                        questionType: question.questionType,
                        required: !!question.required,
                        orderIndex
                    }))
                })
            )
        }

        if (formData.value.selectedTemplateId) {
            formDataToSend.append('documentTemplateId', formData.value.selectedTemplateId)
        }

        let docId = documentId.value
        if (isEdit.value) {
            const metadataPayload = buildDocumentMetadataPayload(values)
            if (isPendingEditorEdit.value) {
                appendLinkedDraftIdForDelete(metadataPayload)
            }
            await apiPut(`/documents/${documentId.value}`, metadataPayload, authStore)
            toast.showToast(t('common.success'), t('document.form.toast_updated_ok'), 'success')
        } else {
            appendDocumentDraftIdIfEditing(formDataToSend)
            const { id } = await apiPostFormData<{ id: string }>('/documents', formDataToSend, authStore)
            docId = id
            toast.showToast(t('common.success'), t('document.form.toast_created_ok'), 'success')
        }

        router.push(redirect || `/plan/documents/${docId}`)
    } catch (error: any) {
        console.error('Error submitting form:', error)
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg ||
            (isEdit.value
                ? t('document.form.toast_submit_failed_update')
                : t('document.form.toast_submit_failed_create')),
            'error'
        )
    } finally {
        isSubmitting.value = false
    }
}

const openTemplateModal = () => {
    dialogStore.openDialog(DocumentTemplateModal, {
        onSelect: (content: string, templateId: string) => {
            formData.value.selectedTemplateId = templateId
            resetSuperdocEditor(content || null)
            dialogStore.closeDialog()
        },
        onCancel: dialogStore.closeDialog
    })
}

const handleFilterChange = (value: any, type: 'category' | 'organizationUnit') => {
    const emptyCat = { id: '', name: t('document.form.placeholder_select_category') }
    const emptyOu = { id: '', name: t('document.form.placeholder_select_org_unit') }
    const resolved = value ?? (type === 'organizationUnit' ? emptyOu : emptyCat)
    optionsData.value[type] = resolved
    if (type === 'category') {
        formData.value.documentType = resolved
    } else {
        formData.value.organizationUnit = resolved
        syncSelectedProcessesForTeam(Number(resolved?.id || 0))
    }
}

onMounted(() => {
    const routeId = route.params.id as string
    const isNewVersionPath = route.path.includes('new-version') || route.path.includes('edit-version')

    const isDraftEditPath =
        route.path.includes('/documents/drafts/') && route.path.endsWith('/edit')

    if (isDraftEditPath) {
        isEditDraft.value = true
        contentMode.value = ContentType.EDITOR
        draftId.value = route.params.draftId as string
    } else if (isNewVersionPath && routeId) {
        isNewVersion.value = true
        isEditVersion.value = route.path.includes('edit-version')
        isEditPendingVersion.value = route.path.includes('edit-version')
        documentId.value = routeId
        const raw = route.query.fillPendingVersion
        const parsed =
            typeof raw === 'string' ? Number(raw) : Array.isArray(raw) ? Number(raw[0]) : NaN
        if (!Number.isNaN(parsed) && parsed > 0) {
            fillPendingVersionId.value = parsed
        }
        const rawDraftId = route.query.draftId
        const draftIdFromQuery =
            typeof rawDraftId === 'string'
                ? rawDraftId
                : Array.isArray(rawDraftId)
                    ? rawDraftId[0]
                    : ''
        if (draftIdFromQuery) {
            linkedDraftId.value = draftIdFromQuery
        }
    } else if (routeId) {
        isEdit.value = true
        documentId.value = routeId
    }

    fetchOptions()
})
</script>
