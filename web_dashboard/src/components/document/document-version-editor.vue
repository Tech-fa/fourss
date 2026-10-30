<template>
    <div v-if="isLoading" class="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Spinner width="5" />
    </div>

    <DocumentForm v-else-if="useLegacyForm" />

    <div v-else class="fixed inset-0 z-50 flex flex-col bg-white">
        <header
            class="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-3 py-2 sm:px-4"
            test-id="document-version-editor-header"
        >
            <button
                type="button"
                class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                :aria-label="t('document.form.cancel')"
                test-id="document-version-editor-back-button"
                @click="handleCancel"
            >
                <i class="fa-solid fa-arrow-left"></i>
            </button>

            <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-neutral-900 sm:text-base">
                    {{ pageTitle }}
                </p>
                <p v-if="pageSubtitle" class="truncate text-xs text-neutral-500">
                    {{ pageSubtitle }}
                </p>
            </div>

            <div class="flex shrink-0 items-center gap-2">
                <AppButton
                    type="button"
                    buttonStyle="secondary"
                    :disabled="isSubmitting || isDraftSubmitting"
                    test-id="document-version-editor-cancel-button"
                    @click="handleCancel"
                >
                    {{ t('document.form.cancel') }}
                </AppButton>
                <AppButton
                    v-if="showDraftAction"
                    type="button"
                    buttonStyle="secondary"
                    :loading="isDraftSubmitting"
                    :disabled="isSubmitting"
                    :test-id="draftButtonTestId"
                    @click="onDraftButtonClick"
                >
                    {{ t('document.form.save_as_draft') }}
                </AppButton>
                <AppButton
                    type="button"
                    buttonStyle="primary"
                    :loading="isSubmitting"
                    :disabled="isDraftSubmitting"
                    test-id="document-version-editor-save-button"
                    @click="handleSubmit"
                >
                    {{ submitLabel }}
                </AppButton>
            </div>
        </header>

        <div
            v-if="showExpiryFields"
            class="shrink-0 border-b border-neutral-200 bg-white px-4 py-3 space-y-3"
            test-id="document-version-editor-expiry"
        >
            <ToggleSwitch
                v-model="neverExpires"
                :label="neverExpires ? t('document.form.never_expires') : t('document.form.expires')"
                active-color="bg-blue-600"
                test-id="version-editor-never-expires-toggle"
                @update:modelValue="onNeverExpiresChange"
            />
            <div v-if="!neverExpires" class="max-w-xs">
                <label class="block text-sm mb-1">{{ t('document.form.valid_until') }}</label>
                <AppInput
                    name="dueDate"
                    :label="t('document.form.due_date')"
                    type="date"
                    :placeholder="t('document.form.due_date_placeholder')"
                    v-model="dueDate"
                    :hide-icon="true"
                    :disabled="isSubmitting || isDraftSubmitting"
                    test-id="version-editor-due-date-input"
                />
            </div>
        </div>

        <div
            v-if="showLinkedDraftNotice"
            class="flex shrink-0 flex-col gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-neutral-700 sm:flex-row sm:items-center sm:justify-between"
            test-id="document-version-editor-draft-notice"
        >
            <div class="flex min-w-0 items-start gap-2">
                <i class="fa-solid fa-circle-info mt-0.5 shrink-0 text-amber-600"></i>
                <span>{{ linkedDraftNoticeText }}</span>
            </div>
            <AppButton
                type="button"
                buttonStyle="secondary"
                class="shrink-0"
                :loading="isDiscardingDraft"
                :disabled="isSubmitting || isDraftSubmitting"
                test-id="document-version-editor-discard-draft-button"
                @click="handleDiscardLinkedDraftClick"
            >
                {{ t('document.form.discard_draft') }}
            </AppButton>
        </div>

        <div class="min-h-0 flex-1">
            <SuperDocEditor
                ref="superdocRef"
                :key="editorContentKey"
                class="h-full"
                :document="superdocSource"
                :user="superdocUser"
                show-open-docx
                @docx-selected="openDocxInSuperdoc"
                @update="onSuperdocUpdate"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '../AppButton.vue'
import AppInput from '../AppInput.vue'
import ToggleSwitch from '../ToggleSwitch.vue'
import SuperDocEditor from '../SuperDocEditor.vue'
import Spinner from '../Spinner.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import DocumentForm from './document-form.vue'
import { useAuthStore } from '@/stores/auth'
import { useDialog } from '@/stores/dialog'
import { useToast } from '@/stores/notification'
import { apiDelete, apiGet, apiPostFormData, apiPutFormData } from '@/util/api'
import { appendDocumentDueDate, documentDueDateFormState, formatApiErrorMessage, getSuperdocUserFromAuth } from '@/util/util'
import type {
    Document,
    DocumentDraftDetail,
    DocumentDraftListItem,
    PaginatedResponse
} from '@/util/interfaces'
import { ContentType, DocumentStatus } from '@/util/interfaces'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const dialogStore = useDialog()

const redirect = route.query.redirect as string | undefined
const documentId = ref('')
const isEditVersion = ref(false)
const fillPendingVersionId = ref<number | null>(null)
const fromVersionId = ref<number | null>(null)
const fromVersionNumber = ref<number | null>(null)
const linkedDraftId = ref('')
const fetchedDocument = ref<Document | null>(null)

const isLoading = ref(true)
const useLegacyForm = ref(false)
const isSubmitting = ref(false)
const isDraftSubmitting = ref(false)
const isDiscardingDraft = ref(false)
const editorContentKey = ref(0)

const superdocRef = ref<InstanceType<typeof SuperDocEditor> | null>(null)
const superdocSource = ref<File | Blob | string | null>(null)
const hasSuperdocEdits = ref(false)

const pendingVersionSuperdocSource = ref<File | Blob | string | null>(null)
const newVersionPublishedBaselineSource = ref<File | Blob | string | null>(null)

const formData = ref({
    title: '',
    changes: '',
    selectedTemplateId: null as string | null
})
const neverExpires = ref(true)
const dueDate = ref('')

const DOCX_MIME =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const isCreateNewVersionDraft = computed(
    () => fillPendingVersionId.value === null && !isEditVersion.value
)

const showExpiryFields = computed(() => isCreateNewVersionDraft.value)

const onNeverExpiresChange = (value: boolean) => {
    if (value) dueDate.value = ''
}

const isNewVersionWithDocumentDraft = computed(
    () => isCreateNewVersionDraft.value && !!linkedDraftId.value
)

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
        isEditVersion.value &&
        fetchedDocument.value?.contentType === ContentType.EDITOR &&
        pendingVersion.value != null
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

const showDraftAction = computed(
    () => isPendingEditorEdit.value || isCreateNewVersionDraft.value
)

const draftButtonTestId = computed(() =>
    isPendingEditorEdit.value
        ? 'save-as-draft-pending-button'
        : 'save-as-draft-new-version-button'
)

const superdocUser = computed(() => getSuperdocUserFromAuth(authStore.state.userDetails))

const cancelPath = computed(() => redirect || `/plan/documents/${documentId.value}`)

const pageTitle = computed(() => formData.value.title || t('document.form.document_content'))

const pageSubtitle = computed(() => {
    if (fillPendingVersionId.value !== null) {
        return t('document.form.breadcrumb_add_content')
    }
    if (fromVersionNumber.value != null) {
        return t('document.form.breadcrumb_restore_from_version', {
            n: fromVersionNumber.value
        })
    }
    if (isEditVersion.value) {
        return t('document.form.breadcrumb_edit_document')
    }
    return t('document.form.breadcrumb_create_new_version')
})

const submitLabel = computed(() => {
    if (fillPendingVersionId.value !== null) {
        return t('document.form.submit_save_content')
    }
    return t('document.form.submit_create_version')
})

function isDocxFile(file: File) {
    return file.type === DOCX_MIME || file.name.toLowerCase().endsWith('.docx')
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

async function resolveVersionContentUrl(
    version: NonNullable<Document['versions']>[number]
): Promise<string> {
    const data = await apiGet<{ content: string | null; contentUrl?: string }>(
        `/documents/${documentId.value}/versions/${version.id}/content`,
        authStore
    )
    if (data.contentUrl) {
        return data.contentUrl
    }

    const key = data.content?.trim() || version.content?.trim()
    if (key?.toLowerCase().endsWith('.docx')) {
        return apiGet<string>(`/files/${encodeURIComponent(key)}`, authStore)
    }

    throw new Error('LEGACY_HTML')
}

function clearFromVersionQuery() {
    fromVersionId.value = null
    fromVersionNumber.value = null
    const q = { ...route.query } as Record<string, string | string[] | undefined>
    delete q.fromVersion
    router.replace({ path: route.path, query: q })
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

function openDocxInSuperdoc(file: File) {
    if (!isDocxFile(file)) {
        toast.showToast(
            t('common.error'),
            t('document.form.toast_open_docx_invalid'),
            'error'
        )
        return
    }
    if (!formData.value.title?.trim()) {
        formData.value.title = file.name.replace(/\.docx$/i, '')
    }
    resetSuperdocEditor(file)
}

const applyDraftContentToForm = (draft: DocumentDraftDetail) => {
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

const fetchDocument = async () => {
    try {
        isLoading.value = true
        const document = await apiGet<Document>(
            `/documents/${documentId.value}?includeLatestPublishedContent=true`,
            authStore
        )
        fetchedDocument.value = document

        if (document.contentType !== ContentType.EDITOR) {
            useLegacyForm.value = true
            return
        }

        const isSuperdocEditorDoc = !!(
            document.latestPublishedVersionContentUrl || document.pendingVersionContentUrl
        )

        if (!isSuperdocEditorDoc) {
            useLegacyForm.value = true
            return
        }

        const fillId = fillPendingVersionId.value
        if (fillId != null && !isEditVersion.value) {
            const pending = document.versions?.find((v) => v.id === fillId)
            if (!pending) {
                toast.showToast(
                    t('common.error'),
                    t('document.form.toast_pending_version_error'),
                    'error'
                )
                fillPendingVersionId.value = null
                const q = { ...route.query } as Record<string, string | string[] | undefined>
                delete q.fillPendingVersion
                router.replace({ path: route.path, query: q })
            }
        }

        formData.value = {
            title: document.title || '',
            changes: '',
            selectedTemplateId: document.documentTemplate?.id ?? null
        }
        const expiry = documentDueDateFormState(document.dueDate)
        neverExpires.value = expiry.neverExpires
        dueDate.value = expiry.dueDate

        let docxUrl: string | null = null

        if (
            fromVersionId.value != null &&
            !isEditVersion.value &&
            fillPendingVersionId.value === null
        ) {
            const sourceVersion = document.versions?.find((v) => v.id === fromVersionId.value)
            const canRestore =
                sourceVersion &&
                sourceVersion.status === DocumentStatus.PUBLISHED &&
                isSuperdocLoadableContent(sourceVersion.content || '') &&
                sourceVersion.versionNumber < document.currentVersion

            if (!canRestore) {
                toast.showToast(
                    t('common.error'),
                    t('document.form.toast_restore_version_invalid'),
                    'error'
                )
                clearFromVersionQuery()
            } else {
                fromVersionNumber.value = sourceVersion.versionNumber
                try {
                    docxUrl = await resolveVersionContentUrl(sourceVersion)
                } catch (error: any) {
                    const isLegacy = error?.message === 'LEGACY_HTML'
                    toast.showToast(
                        t('common.error'),
                        isLegacy
                            ? t('document.form.toast_restore_version_legacy')
                            : t('document.form.toast_restore_version_load_failed'),
                        'error'
                    )
                    clearFromVersionQuery()
                }
            }
        }

        if (docxUrl === null) {
            docxUrl =
                isEditVersion.value && document.pendingVersionContentUrl
                    ? document.pendingVersionContentUrl
                    : (document.latestPublishedVersionContentUrl ??
                      document.pendingVersionContentUrl ??
                      null)
        }
        resetSuperdocEditor(docxUrl)

        if (isEditVersion.value) {
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

        if (!isEditVersion.value && fillPendingVersionId.value === null) {
            const rawDraftId = route.query.draftId
            const draftIdFromQuery =
                typeof rawDraftId === 'string'
                    ? rawDraftId
                    : Array.isArray(rawDraftId)
                      ? rawDraftId[0]
                      : ''

            if (draftIdFromQuery) {
                linkedDraftId.value = draftIdFromQuery
            } else if (fromVersionId.value === null) {
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
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.form.toast_fetch_document_failed'),
            'error'
        )
        router.push(redirect || '/plan/documents')
    } finally {
        isLoading.value = false
    }
}

const validateDraftContent = async (): Promise<boolean> => {
    if (await isSuperdocEmpty()) {
        toast.showToast(
            t('common.error'),
            t('document.form.validation_editor_content'),
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

        const payload = await buildDocumentDraftFormData(getDraftLinkPayload())

        if (linkedDraftId.value) {
            await apiPutFormData(`/documents/drafts/${linkedDraftId.value}`, payload, authStore)
            toast.showToast(t('common.success'), t('document.form.toast_draft_updated_ok'), 'success')
            if (isPendingEditorEdit.value) {
                router.push('/plan/documents/drafts')
            }
            return
        }

        const created = await apiPostFormData<{ id: string }>('/documents/drafts', payload, authStore)
        if (isPendingEditorEdit.value || isCreateNewVersionDraft.value) {
            linkedDraftId.value = created?.id ?? ''
        }
        toast.showToast(t('common.success'), t('document.form.toast_draft_created_ok'), 'success')
        if (isPendingEditorEdit.value || isCreateNewVersionDraft.value) {
            router.push('/plan/documents/drafts')
        }
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        const isUpdate =
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

const validateEditorContent = async (): Promise<boolean> => {
    if (!superdocRef.value || (await superdocRef.value.isEmpty())) {
        toast.showToast(
            t('common.error'),
            t('document.form.validation_editor_content'),
            'error'
        )
        return false
    }
    return true
}

const handleCancel = () => {
    router.push(cancelPath.value)
}

const handleSubmit = async () => {
    if (!(await validateEditorContent())) return

    isSubmitting.value = true
    try {
        if (fillPendingVersionId.value != null) {
            let docxFile: File
            try {
                docxFile = await exportSuperdocDocx(`${formData.value.title || 'document'}.docx`)
            } catch (err) {
                console.error('SuperDoc export failed:', err)
                toast.showToast(
                    t('common.error'),
                    t('document.form.toast_submit_failed_create'),
                    'error'
                )
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
            toast.showToast(
                t('common.success'),
                t('document.form.toast_save_version_content_ok'),
                'success'
            )
            router.push(cancelPath.value)
            return
        }

        if (!hasSuperdocEdits.value && fromVersionId.value === null) {
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
            toast.showToast(
                t('common.error'),
                t('document.form.toast_submit_failed_create'),
                'error'
            )
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
        appendDocumentDueDate(versionForm, dueDate.value, neverExpires.value)
        await apiPostFormData(`/documents/${documentId.value}/versions`, versionForm, authStore)
        toast.showToast(t('common.success'), t('document.form.toast_new_version_ok'), 'success')
        router.push(cancelPath.value)
    } catch (error: any) {
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg ||
                (fillPendingVersionId.value != null
                    ? t('document.form.toast_save_version_content_failed')
                    : t('document.form.toast_submit_failed_create')),
            'error'
        )
    } finally {
        isSubmitting.value = false
    }
}

onMounted(() => {
    const routeId = route.params.id as string
    documentId.value = routeId
    isEditVersion.value = route.path.includes('edit-version')

    const raw = route.query.fillPendingVersion
    const parsed =
        typeof raw === 'string' ? Number(raw) : Array.isArray(raw) ? Number(raw[0]) : NaN
    if (!Number.isNaN(parsed) && parsed > 0) {
        fillPendingVersionId.value = parsed
    }

    const rawFromVersion = route.query.fromVersion
    const parsedFromVersion =
        typeof rawFromVersion === 'string'
            ? Number(rawFromVersion)
            : Array.isArray(rawFromVersion)
              ? Number(rawFromVersion[0])
              : NaN
    if (!Number.isNaN(parsedFromVersion) && parsedFromVersion > 0) {
        fromVersionId.value = parsedFromVersion
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

    fetchDocument()
})
</script>

<style scoped>
:deep(.superdoc-editor-frame) {
    height: 100%;
}
</style>
