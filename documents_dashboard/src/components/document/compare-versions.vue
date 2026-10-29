<template>
    <div id="main-container" class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs" test-id="breadcrumbs" />
        <div v-if="documentLoading" class="flex items-center justify-center h-screen">
            <Spinner width="5" />
        </div>
        <main id="main-content" class="p-6" v-else-if="documentData">
            <SuperDocEditor
                ref="diffUtilRef"
                class="superdoc-diff-utility"
                document-mode="viewing"
                role="viewer"
                :hide-toolbar="true"
            />
            <!-- Section: Version selectors + Compare button -->
            <div
                class="bg-white border border-neutral-200 rounded-lg p-4"
                test-id="compare-controls-section"
            >
                <div class="flex flex-wrap items-end gap-4">
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-sm font-medium text-neutral-700 mb-1">{{
                            t('document.compare.version_a')
                        }}</label>
                        <Select2
                            v-model="versionA"
                            :values="sortedVersions"
                            :display="versionDisplay"
                            :placeholder="t('document.compare.select_placeholder')"
                            test-id="version-a-select"
                        />
                    </div>
                    <div
                        class="flex items-end pb-1.5"
                        :title="t('document.compare.arrow_compare_title')"
                    >
                        <i class="fa-solid fa-arrow-right text-neutral-500 text-xl" aria-hidden="true"></i>
                    </div>
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-sm font-medium text-neutral-700 mb-1">{{
                            t('document.compare.version_b')
                        }}</label>
                        <Select2
                            v-model="versionB"
                            :values="sortedVersions"
                            :display="versionDisplay"
                            :placeholder="t('document.compare.select_placeholder')"
                            test-id="version-b-select"
                        />
                    </div>
                    <Can subject="documents" :actions="['read']">
                        <AppButton
                            buttonStyle="primary"
                            test-id="compare-versions-button"
                            :disabled="!canCompare"
                            :loading="contentLoading"
                            @click="runCompare"
                        >
                            {{ t('document.compare.compare_button') }}
                        </AppButton>
                    </Can>
                </div>
                <p
                    v-if="documentData?.contentType !== ContentType.EDITOR"
                    class="mt-2 text-sm text-neutral-500"
                >
                    {{ t('document.compare.editor_only') }}
                </p>
                <p v-else-if="contentErrorMessage" class="mt-2 text-sm text-red-600">
                    {{ contentErrorMessage }}
                </p>
            </div>

            <!-- Spinner while loading version content -->
            <div
                v-if="contentLoading"
                class="mt-6 flex items-center justify-center min-h-[300px]"
                test-id="compare-loading"
            >
                <Spinner width="5" />
            </div>

            <!-- SuperDoc redline (only for EDITOR docs when diff is ready) -->
            <div v-else-if="showDiffView" class="mt-6 diff-view-wrapper" test-id="diff-view-section">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-3 text-sm text-neutral-600">
                    <div class="flex items-center gap-4">
                        <span class="inline-flex items-center gap-1.5">
                            <span class="diff-legend-removed w-4 h-4 rounded shrink-0" aria-hidden="true"></span>
                            {{ t('document.compare.legend_removed') }}
                        </span>
                        <span class="inline-flex items-center gap-1.5">
                            <span class="diff-legend-added w-4 h-4 rounded shrink-0" aria-hidden="true"></span>
                            {{ t('document.compare.legend_added') }}
                        </span>
                    </div>
                    <span class="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                        {{
                            t('document.compare.change_count', {
                                groups: changeGroupCount,
                                paragraphs: changedParagraphCount
                            })
                        }}
                    </span>
                </div>
                <div
                    class="diff-panel flex flex-col rounded-lg border border-neutral-200 bg-neutral-100/40 overflow-hidden"
                >
                    <div
                        class="diff-panel-header shrink-0 flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-neutral-100 border-b border-neutral-200 text-sm font-medium text-neutral-700"
                    >
                        <span>
                            {{
                                t('document.compare.redline_header', {
                                    a: versionA?.versionNumber,
                                    b: versionB?.versionNumber
                                })
                            }}
                        </span>
                        <div class="inline-flex rounded-md border border-neutral-200 bg-white p-0.5">
                            <button
                                type="button"
                                class="diff-tab-button"
                                :class="{ 'diff-tab-button-active': activeDiffView === 'changes' }"
                                @click="activeDiffView = 'changes'"
                            >
                                {{ t('document.compare.changes_only_tab') }}
                            </button>
                            <button
                                type="button"
                                class="diff-tab-button"
                                :class="{ 'diff-tab-button-active': activeDiffView === 'redline' }"
                                @click="activeDiffView = 'redline'"
                            >
                                {{ t('document.compare.full_redline_tab') }}
                            </button>
                        </div>
                    </div>
                    <div
                        v-if="activeDiffView === 'redline'"
                        class="diff-panel-scroll overflow-hidden min-h-[280px]"
                        style="height: min(75vh, 900px)"
                    >
                        <SuperDocEditor
                            v-if="redlinedDocBlob"
                            :key="redlinedDocKey"
                            :document="redlinedDocBlob"
                            :user="superdocUser"
                            document-mode="viewing"
                            role="viewer"
                            :hide-toolbar="true"
                            :track-changes-visible="true"
                        />
                    </div>
                    <div
                        v-else
                        class="changes-only-scroll min-h-[280px] overflow-auto bg-white p-4"
                        style="max-height: min(75vh, 900px)"
                    >
                        <div
                            v-if="changesOnlyError"
                            class="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
                        >
                            {{ t('document.compare.changes_only_error') }}
                        </div>
                        <div
                            v-else-if="changesOnlyGroups.length === 0"
                            class="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600"
                        >
                            {{ t('document.compare.no_changes_detected') }}
                        </div>
                        <div v-else class="space-y-4">
                            <template v-for="(group, index) in changesOnlyGroups" :key="group.id">
                                <div
                                    v-if="index > 0"
                                    class="text-center text-sm font-medium text-neutral-400"
                                    aria-hidden="true"
                                >
                                    ...
                                </div>
                                <section class="rounded-md border border-neutral-200 bg-white overflow-hidden">
                                    <div class="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600">
                                        {{ t('document.compare.change_group_label', { n: index + 1 }) }}
                                    </div>
                                    <div class="divide-y divide-neutral-100">
                                        <div
                                            v-for="line in group.lines"
                                            :key="line.id"
                                            class="changes-only-line"
                                            :class="{
                                                'changes-only-line-added': line.type === 'added',
                                                'changes-only-line-removed': line.type === 'removed'
                                            }"
                                        >
                                            <span class="changes-only-marker" aria-hidden="true">
                                                {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : '' }}
                                            </span>
                                            <span class="changes-only-paragraph">
                                                {{ line.paragraphNumber ? `P${line.paragraphNumber}` : '' }}
                                            </span>
                                            <span class="whitespace-pre-wrap">{{ line.text }}</span>
                                        </div>
                                    </div>
                                </section>
                            </template>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty state before user clicks Compare -->
            <div
                v-else
                class="mt-6 flex flex-col items-center justify-center min-h-[300px] rounded-lg border border-neutral-200 border-dashed bg-neutral-50/80 text-neutral-500"
                test-id="compare-empty-state"
            >
                <i class="fa-solid fa-arrows-left-right text-4xl mb-3 opacity-60" aria-hidden="true"></i>
                <p class="text-center text-sm max-w-sm">
                    {{ t('document.compare.empty_state') }}
                </p>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import BreadCrums from '@/components/breadCrums.vue'
import AppButton from '@/components/AppButton.vue'
import Spinner from '@/components/Spinner.vue'
import Select2 from '@/components/Select2.vue'
import SuperDocEditor from '@/components/SuperDocEditor.vue'
import { useRoute } from 'vue-router'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { DateTime } from 'luxon'
import { apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import type { Document, DocumentVersion } from '@/util/interfaces'
import { ContentType } from '@/util/interfaces'
import { formatApiErrorMessage, getSuperdocUserFromAuth } from '@/util/util'
import Can from '../Can.vue'

type SuperDocEditorInstance = InstanceType<typeof SuperDocEditor>
type DiffView = 'changes' | 'redline'
type CompactDiffLineType = 'context' | 'added' | 'removed'

type ParagraphEntry = {
    number: number
    text: string
    normalized: string
}

type CompactDiffLine = {
    id: string
    type: CompactDiffLineType
    text: string
    paragraphNumber?: number
}

type CompactDiffGroup = {
    id: string
    lines: CompactDiffLine[]
}

const { t, locale } = useI18n()
const route = useRoute()
const documentId = route.params.id as string
const authStore = useAuthStore()
const toast = useToast()
const diffUtilRef = ref<SuperDocEditorInstance | null>(null)

const DOCUMENT_STATUS_I18N: Record<string, string> = {
    pending: 'document.main.status_labels.pending',
    ready_for_approval: 'document.main.status_labels.ready_for_approval',
    published: 'document.main.status_labels.published',
    in_review: 'document.main.status_labels.in_review',
    valid: 'document.main.status_labels.valid',
    invalid: 'document.main.status_labels.invalid',
    obsolete: 'document.main.status_labels.obsolete'
}

const documentStatusLabel = (status: string) =>
    DOCUMENT_STATUS_I18N[status] ? t(DOCUMENT_STATUS_I18N[status]) : status

const documentData = ref<Document | null>(null)
const documentLoading = ref(true)
const versionA = ref<DocumentVersion | null>(null)
const versionB = ref<DocumentVersion | null>(null)
const contentLoading = ref(false)
const contentErrorKey = ref<'load_content' | 'legacy_content' | 'diff_failed' | null>(null)
const compareDone = ref(false)
const redlinedDocBlob = ref<Blob | null>(null)
const redlinedDocKey = ref(0)
const activeDiffView = ref<DiffView>('changes')
const changesOnlyGroups = ref<CompactDiffGroup[]>([])
const changesOnlyError = ref(false)

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const CHANGE_CONTEXT_PARAGRAPHS = 2

const superdocUser = computed(() => getSuperdocUserFromAuth(authStore.state.userDetails))

const contentErrorMessage = computed(() => {
    void locale.value
    if (contentErrorKey.value === 'load_content') {
        return t('document.compare.error_load_content')
    }
    if (contentErrorKey.value === 'legacy_content') {
        return t('document.compare.error_legacy_content')
    }
    if (contentErrorKey.value === 'diff_failed') {
        return t('document.compare.error_diff_failed')
    }
    return ''
})

const crumbs = computed(() => {
    void locale.value
    const title = documentData.value?.title?.trim()
    return [
        { name: t('nav.documents'), path: '/plan/documents', icon: 'fa-solid fa-file-lines' },
        {
            name: title || t('document.view.breadcrumb_fallback'),
            path: `/plan/documents/${documentId}`,
            icon: ''
        },
        { name: t('document.compare.breadcrumb'), path: '', icon: '' }
    ]
})

const sortedVersions = computed(() => {
    const versions = documentData.value?.versions ?? []
    return [...versions].sort((a, b) => b.versionNumber - a.versionNumber)
})

function formatVersionDate(ts: number): string {
    return DateTime.fromMillis(+ts).setZone('utc').setLocale(locale.value).toFormat('dd MMM yyyy HH:mm')
}

const versionDisplay = computed(() => {
    void locale.value
    return (v: DocumentVersion): string => {
        const dateStr = v.createdAt
            ? formatVersionDate(
                  typeof v.createdAt === 'string' ? parseInt(v.createdAt, 10) : v.createdAt
              )
            : ''
        const isCurrent = documentData.value?.currentVersion === v.versionNumber
        const status = v.status ?? ''
        const statusLabel = status ? documentStatusLabel(status) : ''
        const currentLabel = isCurrent ? t('document.compare.current_badge') : ''
        const parts = [`v${v.versionNumber}`, dateStr, currentLabel, statusLabel]
        return parts.filter(Boolean).join(' · ')
    }
})

const canCompare = computed(() => {
    if (documentData.value?.contentType !== ContentType.EDITOR) return false
    return versionA.value != null && versionB.value != null
})

const showDiffView = computed(() => {
    return compareDone.value && !contentLoading.value && !!redlinedDocBlob.value
})

const changeGroupCount = computed(() => changesOnlyGroups.value.length)
const changedParagraphCount = computed(() =>
    changesOnlyGroups.value.reduce(
        (total, group) => total + group.lines.filter((line) => line.type !== 'context').length,
        0
    )
)

function clearRedlinedDoc() {
    redlinedDocBlob.value = null
    changesOnlyGroups.value = []
    changesOnlyError.value = false
}

function asDocxBlob(blob: Blob): Blob {
    if (blob.type === DOCX_MIME) return blob
    return new Blob([blob], { type: DOCX_MIME })
}

async function fetchDocxBlob(url: string): Promise<Blob> {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) {
        throw new Error(`Failed to fetch document content (${response.status})`)
    }
    return asDocxBlob(await response.blob())
}

async function resolveVersionDocxUrl(version: DocumentVersion): Promise<string> {
    const data = await apiGet<{ content: string | null; contentUrl?: string }>(
        `/documents/${documentId}/versions/${version.id}/content`,
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

function normalizeParagraphText(text: string): string {
    return text.replace(/\s+/g, ' ').trim()
}

async function extractDocxParagraphs(blob: Blob): Promise<ParagraphEntry[]> {
    const mammoth = await import('mammoth')
    const result = await mammoth.default.extractRawText({ arrayBuffer: await blob.arrayBuffer() })
    return result.value
        .split(/\n+/)
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text, index) => ({
            number: index + 1,
            text,
            normalized: normalizeParagraphText(text)
        }))
}

function buildCompactDiffGroups(
    original: ParagraphEntry[],
    revised: ParagraphEntry[],
    diffArraysFn: typeof import('diff')['diffArrays']
): CompactDiffGroup[] {
    const diff = diffArraysFn(original, revised, {
        comparator: (a, b) => a.normalized === b.normalized
    })
    const lines: CompactDiffLine[] = []

    diff.forEach((part, partIndex) => {
        const type: CompactDiffLineType = part.added ? 'added' : part.removed ? 'removed' : 'context'
        part.value.forEach((paragraph, paragraphIndex) => {
            lines.push({
                id: `${partIndex}-${paragraphIndex}-${type}`,
                type,
                text: paragraph.text,
                paragraphNumber: paragraph.number
            })
        })
    })

    const changedIndexes = lines
        .map((line, index) => (line.type === 'context' ? -1 : index))
        .filter((index) => index >= 0)
    const groups: CompactDiffGroup[] = []
    let cursor = 0

    while (cursor < changedIndexes.length) {
        const firstChangedIndex = changedIndexes[cursor]
        let end = Math.min(lines.length - 1, firstChangedIndex + CHANGE_CONTEXT_PARAGRAPHS)

        while (
            cursor + 1 < changedIndexes.length &&
            changedIndexes[cursor + 1] <= end + CHANGE_CONTEXT_PARAGRAPHS + 1
        ) {
            cursor += 1
            end = Math.min(lines.length - 1, changedIndexes[cursor] + CHANGE_CONTEXT_PARAGRAPHS)
        }

        const start = Math.max(0, firstChangedIndex - CHANGE_CONTEXT_PARAGRAPHS)
        groups.push({
            id: `change-group-${groups.length + 1}`,
            lines: lines.slice(start, end + 1)
        })
        cursor += 1
    }

    return groups
}

async function buildChangesOnlyGroups(original: Blob, revised: Blob): Promise<CompactDiffGroup[]> {
    const [diffModule, originalParagraphs, revisedParagraphs] = await Promise.all([
        import('diff'),
        extractDocxParagraphs(original),
        extractDocxParagraphs(revised)
    ])
    return buildCompactDiffGroups(originalParagraphs, revisedParagraphs, diffModule.diffArrays)
}

async function runCompare() {
    if (!canCompare.value || !versionA.value || !versionB.value) return
    contentErrorKey.value = null
    contentLoading.value = true
    compareDone.value = false
    clearRedlinedDoc()
    try {
        const [docxUrlA, docxUrlB] = await Promise.all([
            resolveVersionDocxUrl(versionA.value),
            resolveVersionDocxUrl(versionB.value)
        ])

        const [docxBlobA, docxBlobB] = await Promise.all([
            fetchDocxBlob(docxUrlA),
            fetchDocxBlob(docxUrlB)
        ])

        if (!diffUtilRef.value) throw new Error('Diff editor not ready')
        const changesOnlyPromise = buildChangesOnlyGroups(docxBlobA, docxBlobB).catch((error) => {
            console.error('Failed to build changes-only comparison', error)
            changesOnlyError.value = true
            return []
        })
        const [{ blob: redlinedBlob }, compactGroups] = await Promise.all([
            diffUtilRef.value.runDiff(docxBlobA, docxBlobB, superdocUser.value),
            changesOnlyPromise
        ])
        changesOnlyGroups.value = compactGroups
        redlinedDocBlob.value = asDocxBlob(redlinedBlob)
        redlinedDocKey.value += 1
        activeDiffView.value = compactGroups.length > 0 || changesOnlyError.value ? 'changes' : 'redline'
        compareDone.value = true
    } catch (e: unknown) {
        console.error('Failed to compare versions', e)
        if (e instanceof Error && e.message === 'LEGACY_HTML') {
            contentErrorKey.value = 'legacy_content'
            toast.showToast(t('common.error'), t('document.compare.error_legacy_content'), 'error')
            return
        }
        contentErrorKey.value = e instanceof Error && e.message.includes('diff') ? 'diff_failed' : 'load_content'
        const apiMsg =
            e && typeof e === 'object' && 'response' in e
                ? formatApiErrorMessage((e as { response?: { data?: unknown } }).response?.data, t, 'errors.document')
                : ''
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.compare.toast_compare_failed'),
            'error'
        )
    } finally {
        contentLoading.value = false
    }
}

async function fetchDocument() {
    documentLoading.value = true
    try {
        const data = await apiGet<Document>(`/documents/${documentId}`, authStore)
        documentData.value = data
        const versions = data.versions ?? []
        if (versions.length >= 2) {
            const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber)
            versionA.value = sorted[1] ?? sorted[0] ?? null
            versionB.value = sorted[0] ?? null
        } else if (versions.length === 1) {
            versionA.value = versions[0] ?? null
            versionB.value = versions[0] ?? null
        }
    } catch (e: unknown) {
        console.error('Failed to load document', e)
        const apiMsg =
            e && typeof e === 'object' && 'response' in e
                ? formatApiErrorMessage((e as { response?: { data?: unknown } }).response?.data, t, 'errors.document')
                : ''
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.compare.toast_document_not_found'),
            'error'
        )
    } finally {
        documentLoading.value = false
    }
}

onMounted(() => {
    fetchDocument()
})

onUnmounted(() => {
    clearRedlinedDoc()
})
</script>

<style src="./document-compare-diff.css"></style>
