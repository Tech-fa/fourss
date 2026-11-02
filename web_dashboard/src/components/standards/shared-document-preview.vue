<template>
    <div
        class="shared-preview"
        @contextmenu.prevent
        @dragstart.prevent
        @click.capture="blockDownloadClick"
    >
        <p class="shared-print-notice text-sm text-neutral-600">
            {{ t('implementations.share.print_blocked') }}
        </p>
        <div v-if="loading" class="flex flex-col items-center gap-3 py-16 text-sm text-neutral-600">
            <Spinner width="3" />
            <p>{{ t('implementations.share.loading_secure', { current: loadedChunks, total: chunkCount }) }}</p>
        </div>
        <div v-else-if="loadError" class="py-16 text-center text-sm text-neutral-500">
            {{ t('implementations.share.view_failed') }}
        </div>
        <div
            v-else-if="contentKind === 'pdf' && pdfBytes"
            class="shared-preview__pdf max-h-[min(70vh,720px)] overflow-auto rounded border border-neutral-200 bg-neutral-50 p-3"
        >
            <VuePdfEmbed :source="pdfBytes" />
        </div>
        <div
            v-else-if="contentKind === 'image'"
            class="relative mx-auto inline-block max-w-full"
        >
            <canvas ref="canvasRef" class="max-w-full h-auto pointer-events-none"></canvas>
            <div class="absolute inset-0"></div>
        </div>
        <div
            v-else-if="contentKind === 'docx' && docxFile"
            class="rounded border border-neutral-200 bg-white overflow-hidden"
            style="height: min(70vh, 720px)"
        >
            <SuperDocEditor
                :document="docxFile"
                document-mode="viewing"
                role="viewer"
                :hide-toolbar="true"
                :show-ai-write="false"
                :show-open-docx="false"
            />
        </div>
        <div
            v-else-if="contentKind === 'html'"
            class="shared-preview__html max-h-[min(70vh,720px)] overflow-auto rounded border border-neutral-200 bg-white p-6"
            v-html="html"
        ></div>
        <pre
            v-else-if="contentKind === 'json' || contentKind === 'text'"
            class="max-h-[min(70vh,720px)] overflow-auto rounded border border-neutral-200 bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-800 whitespace-pre-wrap"
        >{{ text }}</pre>
        <div
            v-else-if="contentKind === 'checklist'"
            class="rounded border border-neutral-200 bg-white divide-y divide-neutral-200"
        >
            <p v-if="questions.length === 0" class="p-6 text-sm text-neutral-500">
                {{ t('implementations.share.checklist_empty') }}
            </p>
            <div v-for="(question, index) in questions" :key="index" class="p-4">
                <div class="flex flex-wrap items-center gap-2">
                    <p class="text-sm text-neutral-900">{{ question.text }}</p>
                    <span v-if="question.required" class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        {{ t('implementations.share.required') }}
                    </span>
                </div>
                <p class="mt-1 text-xs text-neutral-500">{{ questionLabel(question.type) }}</p>
                <p
                    v-if="question.type === 'IMAGE' || question.type === 'FILE'"
                    class="mt-1 text-xs text-neutral-500"
                >
                    {{ t('implementations.share.attachment_hidden') }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DOMPurify from 'dompurify'
import VuePdfEmbed from 'vue-pdf-embed'
import { apiGetPublic } from '@/util/api'
import type { SharedContentKind } from '@/util/interfaces'
import Spinner from '../Spinner.vue'
import SuperDocEditor from '../SuperDocEditor.vue'
import { revealChunk, type EncryptedPart } from './share-content'

type ChecklistQuestion = {
    text: string
    type: string
    required: boolean
}

const props = defineProps<{
    sessionId: string
    chunkCount: number
    byteLength: number
    contentKind: SharedContentKind
    mime: string | null
}>()

const { t } = useI18n()
const loading = ref(true)
const loadError = ref(false)
const loadedChunks = ref(0)
const pdfBytes = ref<Uint8Array | null>(null)
const docxFile = ref<File | null>(null)
const html = ref('')
const text = ref('')
const questions = ref<ChecklistQuestion[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)
let active = true

const DOWNLOAD_LABEL = /(download|export|print|save|télécharger|exporter|imprimer|تحميل|تصدير|طباعة)/i

function blockDownloadClick(event: MouseEvent) {
    const target = event.target
    if (!(target instanceof Element)) return
    const control = target.closest('a, button')
    if (!control) return
    const label = `${control.getAttribute('aria-label') || ''} ${control.getAttribute('title') || ''} ${control.textContent || ''}`
    if (DOWNLOAD_LABEL.test(label)) {
        event.preventDefault()
        event.stopPropagation()
    }
}

function questionLabel(type: string) {
    const key = {
        YES_NO: 'implementations.share.question_yes_no',
        TEXT: 'implementations.share.question_text',
        NUMBER: 'implementations.share.question_number',
        TEXTAREA: 'implementations.share.question_textarea',
        IMAGE: 'implementations.share.question_image',
        FILE: 'implementations.share.question_file'
    }[type]
    return key ? t(key) : type
}

async function loadChunk(index: number) {
    const base = `/standards/shares/sessions/${props.sessionId}`
    const [material, cover] = await Promise.all([
        apiGetPublic<EncryptedPart>(`${base}/material/${index}`),
        apiGetPublic<EncryptedPart>(`${base}/cover/${index}`)
    ])
    const keys = await apiGetPublic<{ materialKey: string; coverKey: string }>(`${base}/keys/${index}`)
    return revealChunk(material, cover, keys.materialKey, keys.coverKey)
}

async function assemble() {
    const output = new Uint8Array(props.byteLength)
    const chunks = new Array<Uint8Array>(props.chunkCount)
    let next = 0
    const workers = Array.from({ length: Math.min(3, props.chunkCount) }, async () => {
        while (next < props.chunkCount) {
            const index = next
            next += 1
            chunks[index] = await loadChunk(index)
            if (active) loadedChunks.value += 1
        }
    })
    await Promise.all(workers)
    let offset = 0
    for (const chunk of chunks) {
        output.set(chunk, offset)
        offset += chunk.length
    }
    if (offset !== props.byteLength) throw new Error('Incomplete document')
    return output
}

async function drawImage(bytes: Uint8Array, mime: string) {
    const bitmap = await createImageBitmap(new Blob([toArrayBuffer(bytes)], { type: mime }))
    const canvas = canvasRef.value
    if (!canvas) {
        bitmap.close()
        return
    }
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
}

function show(bytes: Uint8Array) {
    if (props.contentKind === 'pdf') {
        pdfBytes.value = bytes
        return
    }
    if (props.contentKind === 'docx') {
        docxFile.value = new File([toArrayBuffer(bytes)], 'shared.docx', {
            type: props.mime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })
        return
    }
    const decoded = new TextDecoder().decode(bytes)
    if (props.contentKind === 'html') {
        html.value = DOMPurify.sanitize(decoded, {
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'link', 'meta'],
            FORBID_ATTR: ['download']
        })
        return
    }
    if (props.contentKind === 'checklist') {
        const parsed = JSON.parse(decoded) as { questions?: ChecklistQuestion[] }
        questions.value = Array.isArray(parsed.questions) ? parsed.questions : []
        return
    }
    if (props.contentKind === 'json') {
        try {
            text.value = JSON.stringify(JSON.parse(decoded), null, 2)
        } catch {
            text.value = decoded
        }
        return
    }
    text.value = decoded
}

async function load() {
    loading.value = true
    loadError.value = false
    loadedChunks.value = 0
    try {
        const bytes = await assemble()
        if (!active) return
        show(bytes)
        loading.value = false
        if (props.contentKind === 'image') {
            await nextTick()
            if (!active) return
            await drawImage(bytes, props.mime || 'image/png')
        }
    } catch (error) {
        console.error('Shared document preview failed', error)
        if (active) loadError.value = true
        loading.value = false
    }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

watch(
    () => props.sessionId,
    () => {
        void load()
    },
    { immediate: true }
)

onUnmounted(() => {
    active = false
})
</script>

<style scoped>
.shared-print-notice {
    display: none;
}

.shared-preview__pdf:deep(.vue-pdf-embed__page) {
    margin: 0 auto 0.75rem;
}

.shared-preview__pdf:deep(canvas) {
    height: auto !important;
    max-width: 100%;
    pointer-events: none;
}

.shared-preview :deep(a[download]),
.shared-preview :deep(button[download]) {
    display: none !important;
}

@media print {
    .shared-preview > :not(.shared-print-notice) {
        display: none !important;
    }

    .shared-print-notice {
        display: block;
    }
}
</style>
