<template>
    <div class="document-file-preview">
        <div v-if="loading" class="flex justify-center py-12">
            <Spinner width="5" />
        </div>
        <div
            v-else-if="loadError"
            class="flex flex-col items-center justify-center py-16 text-neutral-400 gap-3 text-center"
            test-id="latest-version-preview-error"
        >
            <i class="fa-solid fa-file-circle-xmark text-4xl"></i>
            <p class="text-sm">{{ t('document.view.preview_load_failed') }}</p>
        </div>
        <div
            v-else-if="previewKind === 'no_file'"
            class="flex flex-col items-center justify-center py-16 text-neutral-400 gap-3 text-center"
            test-id="latest-version-preview-no-file"
        >
            <i class="fa-solid fa-file-circle-xmark text-4xl"></i>
            <p class="text-sm">{{ t('document.view.preview_no_file') }}</p>
        </div>
        <div
            v-else-if="previewKind === 'unsupported'"
            class="flex flex-col items-center justify-center py-16 text-neutral-400 gap-3 text-center"
            test-id="latest-version-preview-unsupported"
        >
            <i class="fa-solid fa-file-circle-question text-4xl"></i>
            <p class="text-sm">{{ t('document.view.preview_type_unsupported') }}</p>
        </div>
        <div
            v-else-if="previewKind === 'pdf' && blobUrl"
            class="document-file-preview__pdf max-h-[min(70vh,640px)] overflow-auto rounded border border-neutral-200 bg-neutral-50 p-3"
            test-id="latest-version-preview-pdf"
        >
            <VuePdfEmbed
                annotation-layer
                text-layer
                :source="blobUrl"
                @loading-failed="handlePdfPreviewError"
                @rendering-failed="handlePdfPreviewError"
            />
        </div>
        <img
            v-else-if="previewKind === 'image' && blobUrl"
            :src="blobUrl"
            alt=""
            class="mx-auto max-h-[min(60vh,520px)] max-w-full rounded border border-neutral-200 object-contain"
            test-id="latest-version-preview-image"
        />
        <div
            v-else-if="previewKind === 'docx' && docxPresignedUrl"
            class="rounded border border-neutral-200 bg-white overflow-hidden"
            style="height: min(70vh, 600px)"
            test-id="latest-version-preview-docx"
        >
            <SuperDocEditor
                :document="docxPresignedUrl"
                document-mode="viewing"
                role="viewer"
                :hide-toolbar="true"
            />
        </div>
        <pre
            v-else-if="previewKind === 'json' && jsonText"
            class="max-h-[min(60vh,520px)] overflow-auto rounded border border-neutral-200 bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-800"
            test-id="latest-version-preview-json"
        >{{ jsonText }}</pre>
    </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import VuePdfEmbed from 'vue-pdf-embed'
import 'vue-pdf-embed/dist/styles/annotationLayer.css'
import 'vue-pdf-embed/dist/styles/textLayer.css'
import { apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import Spinner from '../Spinner.vue'
import SuperDocEditor from '../SuperDocEditor.vue'

type PreviewKind = 'pdf' | 'image' | 'docx' | 'json' | 'unsupported' | 'no_file'

const props = defineProps<{
    fileKey: string
}>()

const { t } = useI18n()
const authStore = useAuthStore()

const loading = ref(false)
const loadError = ref(false)
const previewKind = ref<PreviewKind | null>(null)
const blobUrl = ref<string | null>(null)
const docxPresignedUrl = ref<string | null>(null)
const jsonText = ref<string | null>(null)

function getFileExtension(fileKey: string): string {
    if (!fileKey) return 'no_file'
    const fileName = fileKey.split('/').pop() || fileKey
    const dotIndex = fileName.lastIndexOf('.')
    return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : ''
}

function getPreviewKind(fileKey: string): PreviewKind {
    const ext = getFileExtension(fileKey)
    if (ext === 'no_file') return 'no_file'
    if (ext === 'pdf') return 'pdf'
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image'
    if (ext === 'docx') return 'docx'
    if (ext === 'json') return 'json'
    return 'unsupported'
}

function resetPreviewState() {
    if (blobUrl.value) {
        URL.revokeObjectURL(blobUrl.value)
    }
    blobUrl.value = null
    docxPresignedUrl.value = null
    jsonText.value = null
    previewKind.value = null
    loadError.value = false
}

async function createPreviewObjectUrl(url: string, contentType: string) {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch file')

    const blob = await response.blob()
    const previewBlob = blob.type === contentType ? blob : new Blob([blob], { type: contentType })
    return URL.createObjectURL(previewBlob)
}

function handlePdfPreviewError(error: unknown) {
    console.error('Document PDF preview failed', error)
    loadError.value = true
}

async function loadPreview(fileKey: string) {
    resetPreviewState()
    const trimmedKey = fileKey.trim()
    if (!trimmedKey) return

    const kind = getPreviewKind(trimmedKey)
    previewKind.value = kind
    if (kind === 'unsupported') return

    loading.value = true
    try {
        const presignedUrl = await apiGet<string>(
            `/files/${encodeURIComponent(trimmedKey)}`,
            authStore
        )

        if (kind === 'docx') {
            docxPresignedUrl.value = presignedUrl
        } else if (kind === 'json') {
            const response = await fetch(presignedUrl)
            if (!response.ok) throw new Error('Failed to fetch file')
            const text = await response.text()
            try {
                jsonText.value = JSON.stringify(JSON.parse(text), null, 2)
            } catch {
                jsonText.value = text
            }
        } else if (kind === 'pdf') {
            blobUrl.value = await createPreviewObjectUrl(presignedUrl, 'application/pdf')
        } else {
            blobUrl.value = presignedUrl
        }
    } catch (err) {
        console.error('Document file preview failed', err)
        loadError.value = true
    } finally {
        loading.value = false
    }
}

watch(
    () => props.fileKey,
    (fileKey) => {
        void loadPreview(fileKey)
    },
    { immediate: true }
)

onUnmounted(resetPreviewState)

</script>

<style scoped>
.document-file-preview__pdf:deep(.vue-pdf-embed__page) {
    margin: 0 auto 0.75rem;
}

.document-file-preview__pdf:deep(canvas) {
    height: auto !important;
    max-width: 100%;
}
</style>

