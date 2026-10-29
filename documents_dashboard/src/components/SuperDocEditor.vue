<template>
    <div class="superdoc-editor-frame">
        <EmbeddedSuperDoc
            v-if="editorActive"
            ref="editorRef"
            :key="editorKey"
            :document="document"
            :user="user"
            :document-mode="documentMode"
            :role="role"
            :hide-toolbar="hideToolbar"
            :show-open-docx="showOpenDocx"
            :show-different-first-page="showDifferentFirstPage"
            :show-page-break="showPageBreak"
            :show-page-number="showPageNumber"
            :track-changes-visible="trackChangesVisible"
            :can-comment="canComment"
            :show-highlight-toolbar="showHighlightToolbar"
            :show-ai-write="canUseAiWrite"
            :labels="labels"
            :generate-ai-content="resolveAiContent"
            @ready="onReady"
            @update="emit('update')"
            @docx-selected="emit('docx-selected', $event)"
            @comment-selected="emit('comment-selected', $event)"
            @comment-saved="emit('comment-saved', $event)"
            @highlight-saved="emit('highlight-saved')"
            @copy-comment-link-request="emit('copy-comment-link', $event)"
            @copy-node-link-request="emit('copy-node-link', $event)"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import EmbeddedSuperDoc from './superdoc/SuperDocEditorSurface.vue'
import { buildRedlinedDocx } from './superdoc/utils/superdoc-diff'
import type {
    SuperDocAiWriteRequest,
    SuperDocAiWriteResult,
    SuperDocDocumentSource,
    SuperDocLabels,
    SuperDocUser
} from '@/util/superdoc-iframe-messages'
import { apiPost } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'
import { useAuthStore } from '@/stores/auth'

type DiffResult = { blob: Blob; hasChanges: boolean; changedComponents: string[] }

type EmbeddedEditor = {
    exportDocx: (fileName?: string) => Promise<File>
    isEmpty: () => boolean
    hasComments: () => boolean
    insertContent: (content: string, contentType?: SuperDocAiWriteResult['contentType']) => boolean
    scrollToComment: (commentId: string) => Promise<boolean>
    scrollToElement: (nodeId: string, offset?: number) => Promise<boolean>
    isReady: boolean
}

const props = withDefaults(
    defineProps<{
        document?: SuperDocDocumentSource
        user?: SuperDocUser
        documentMode?: string
        role?: string
        hideToolbar?: boolean
        showOpenDocx?: boolean
        showDifferentFirstPage?: boolean
        showPageBreak?: boolean
        showPageNumber?: boolean
        trackChangesVisible?: boolean
        canComment?: boolean
        showHighlightToolbar?: boolean
        showAiWrite?: boolean
        generateAiContent?: (request: SuperDocAiWriteRequest) => Promise<SuperDocAiWriteResult>
        initialMarkdown?: string
    }>(),
    {
        document: null,
        user: undefined,
        documentMode: 'editing',
        role: 'editor',
        hideToolbar: false,
        showOpenDocx: false,
        showDifferentFirstPage: true,
        showPageBreak: true,
        showPageNumber: true,
        trackChangesVisible: false,
        canComment: false,
        showHighlightToolbar: false,
        initialMarkdown: ''
    }
)

const emit = defineEmits<{
    ready: []
    update: []
    'docx-selected': [file: File]
    'comment-selected': [commentId: string]
    'comment-saved': [payload: { type: string; commentId?: string }]
    'highlight-saved': []
    'copy-comment-link': [commentId: string]
    'copy-node-link': [payload: { nodeId: string; offset?: number }]
}>()

const { t, locale } = useI18n()
const authStore = useAuthStore()
const editorRef = ref<EmbeddedEditor | null>(null)
const editorActive = ref(true)
const editorKey = ref(0)
const isReady = ref(false)
const insertedInitialMarkdown = ref(false)

const labels = computed<SuperDocLabels>(() => ({
    openDocxFile: t('document.form.open_docx_file'),
    differentFirstPage: t('document.form.different_first_page'),
    differentFirstPageActive: t('document.form.different_first_page_active'),
    editingFirstPageHeader: t('document.form.editing_first_page_header'),
    editingFirstPageFooter: t('document.form.editing_first_page_footer'),
    editingOtherPagesHeader: t('document.form.editing_other_pages_header'),
    editingOtherPagesFooter: t('document.form.editing_other_pages_footer'),
    pageBreak: t('document.form.page_break'),
    pageNumber: t('document.form.page_number'),
    pageNumberAtCursor: t('document.form.page_number_at_cursor'),
    pageNumberLeft: t('document.form.page_number_left'),
    pageNumberCenter: t('document.form.page_number_center'),
    pageNumberRight: t('document.form.page_number_right'),
    pageNumberNeedsHeaderFooter: t('document.form.page_number_needs_header_footer'),
    pageNumberWrongFirstPageVariant: t('document.form.page_number_wrong_first_page_variant'),
    pageNumberInsertFailed: t('document.form.page_number_insert_failed'),
    copyCommentLink: t('document.view.copy_comment_link'),
    copyParagraphLink: t('document.view.copy_paragraph_link'),
    highlightText: t('document.view.highlight_text'),
    removeHighlight: t('document.view.remove_highlight'),
    aiWrite: t('document.form.ai_write'),
    aiWritePromptPlaceholder: t('document.form.ai_write_prompt_placeholder'),
    aiWriteGenerate: t('document.form.ai_write_generate'),
    aiWriteGenerating: t('document.form.ai_write_generating'),
    aiWriteCancel: t('document.form.ai_write_cancel'),
    aiWriteError: t('document.form.ai_write_error'),
    aiWriteEmptyPrompt: t('document.form.ai_write_empty_prompt'),
    aiWriteInsertFailed: t('document.form.ai_write_insert_failed')
}))

const canUseAiWrite = computed(() => {
    if (props.showAiWrite === false) return false
    if (props.generateAiContent) return true
    if (props.showAiWrite === true) return true
    return (
        props.documentMode === 'editing' &&
        props.role !== 'viewer' &&
        !props.showHighlightToolbar &&
        authStore.hasPermissions({ subject: 'documents', actions: ['create', 'update'] })
    )
})

function assertEditor() {
    const editor = editorRef.value
    if (!editor || !isReady.value) {
        throw new Error('SuperDoc editor is not ready')
    }
    return editor
}

async function defaultGenerateAiContent(request: SuperDocAiWriteRequest): Promise<SuperDocAiWriteResult> {
    const result = await apiPost<{
        model: string
        content: string
        contentType?: SuperDocAiWriteResult['contentType']
    }>(
        '/documents/agent/write',
        {
            prompt: request.prompt,
            extraContext: {
                documentContext: request.documentContext,
                selection: request.selection,
                outputInstructions: request.outputInstructions,
                outputFormat: request.outputFormat
            }
        },
        authStore
    )
    if (!result?.content?.trim()) {
        throw new Error(t('document.form.ai_write_error'))
    }
    return {
        content: result.content,
        contentType: result.contentType ?? request.outputFormat
    }
}

async function resolveAiContent(request: SuperDocAiWriteRequest): Promise<SuperDocAiWriteResult> {
    try {
        const generate = props.generateAiContent ?? defaultGenerateAiContent
        return await generate(request)
    } catch (error) {
        const data = (error as { response?: { data?: unknown } })?.response?.data
        const message =
            formatApiErrorMessage(data, t, 'errors.document') ||
            formatApiErrorMessage(data, t, 'errors.llm') ||
            (error instanceof Error ? error.message : '') ||
            t('document.form.ai_write_error')
        throw new Error(message)
    }
}

function onReady() {
    isReady.value = true
    emit('ready')
    void insertInitialMarkdown()
}

async function exportDocx(fileName = 'document.docx') {
    return assertEditor().exportDocx(fileName)
}

async function isEmpty() {
    if (!isReady.value || !editorRef.value) return true
    return editorRef.value.isEmpty()
}

async function hasComments() {
    if (!isReady.value || !editorRef.value) return false
    return editorRef.value.hasComments()
}

async function runDiff(
    original: SuperDocDocumentSource,
    revised: SuperDocDocumentSource,
    user: SuperDocUser
): Promise<DiffResult> {
    if (!original || !revised) {
        throw new Error('runDiff: original and revised documents are required')
    }
    const result = await buildRedlinedDocx(original, revised, {
        name: user.name ?? '',
        email: user.email ?? ''
    })
    return {
        blob: result.blob,
        hasChanges: result.summary.hasChanges,
        changedComponents: result.summary.changedComponents
    }
}

async function scrollToComment(commentId: string): Promise<boolean> {
    if (!isReady.value || !editorRef.value) return false
    return editorRef.value.scrollToComment(commentId)
}

async function scrollToElement(nodeId: string, offset?: number): Promise<boolean> {
    if (!isReady.value || !editorRef.value) return false
    return editorRef.value.scrollToElement(nodeId, offset)
}

async function insertContent(
    content: string,
    contentType: SuperDocAiWriteResult['contentType'] = 'markdown'
): Promise<boolean> {
    if (!isReady.value || !editorRef.value) return false
    return editorRef.value.insertContent(content, contentType)
}

async function insertInitialMarkdown() {
    const markdown = props.initialMarkdown?.trim()
    if (!isReady.value || insertedInitialMarkdown.value || !markdown) return
    insertedInitialMarkdown.value = true
    try {
        const inserted = await insertContent(markdown, 'markdown')
        if (!inserted) insertedInitialMarkdown.value = false
    } catch {
        insertedInitialMarkdown.value = false
    }
}

watch(
    () => [
        props.document,
        props.user?.email,
        props.user?.name,
        props.documentMode,
        props.role,
        props.hideToolbar,
        props.showOpenDocx,
        props.showDifferentFirstPage,
        props.showPageBreak,
        props.showPageNumber,
        props.trackChangesVisible,
        props.canComment,
        props.showHighlightToolbar,
        canUseAiWrite.value,
        locale.value
    ],
    async () => {
        isReady.value = false
        insertedInitialMarkdown.value = false
        editorKey.value += 1
        await nextTick()
    }
)

watch(
    () => props.initialMarkdown,
    () => {
        insertedInitialMarkdown.value = false
        void insertInitialMarkdown()
    }
)

defineExpose({
    exportDocx,
    isEmpty,
    hasComments,
    isReady,
    insertContent,
    runDiff,
    scrollToComment,
    scrollToElement
})
</script>

<style scoped>
.superdoc-editor-frame {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    border: 0;
    background: #ffffff;
    overflow: hidden;
}
</style>
