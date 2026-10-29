<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs">
            <div class="flex gap-2">
                <AppButton
                    v-if="showAcknowledgeControl"
                    :buttonStyle="hasAcknowledgedLatestVersion ? 'success' : 'primary'"
                    :loading="acknowledgeLoading"
                    :disabled="acknowledgeLoading || hasAcknowledgedLatestVersion"
                    @click="acknowledgeDocument"
                    test-id="acknowledge-document-content-button"
                >
                    <i class="fa-solid fa-check mr-2"></i>
                    {{
                        hasAcknowledgedLatestVersion
                            ? t('document.view.acknowledged')
                            : t('document.view.acknowledge')
                    }}
                </AppButton>
            </div>
        </BreadCrums>

        <div v-if="showCommentNotice" class="px-4 pt-2">
            <Notice :description="t('document.view.document_comment_notice')" level="info" class="mb-4" />
        </div>

        
            <div v-if="loading" class="flex items-center justify-center py-32">
                <Spinner width="8" />
            </div>

            <div
                v-else-if="docxContentUrl"
                class=" min-h-screen h-[1200px]"
                
            >
                <SuperDocEditor
                    ref="superDocRef"
                    :document="docxContentUrl"
                    document-mode="viewing"
                    :role="canComment ? 'suggester' : 'viewer'"
                    :can-comment="canComment"
                    :show-highlight-toolbar="canHighlightOnDocument"
                    :user="superdocUser"
                    :hide-toolbar="true"
                    @ready="onSuperdocReady"
                    @comment-saved="onCommentSaved"
                    @highlight-saved="scheduleReviewDocSave"
                    @copy-comment-link="copyCommentLink"
                    @copy-node-link="copyNodeLink"
                />
            </div>

            <template v-else-if="content">
                <DocumentContentBody :content="content" />
            </template>

            <div
                v-else
                class="flex flex-col items-center justify-center py-32 text-neutral-400 gap-3 text-center px-4"
            >
                <i class="fa-solid fa-file-circle-xmark text-4xl"></i>
                <p v-if="blockedReason">{{ blockedReason }}</p>
                <p v-else>{{ t('document.content_page.empty') }}</p>
            </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiGet, apiPost, apiPutFormData } from '@/util/api'
import type { Document } from '@/util/interfaces'
import { ContentType, DocumentStatus } from '@/util/interfaces'
import BreadCrums from '@/components/breadCrums.vue'
import Spinner from '@/components/Spinner.vue'
import DocumentContentBody from '@/components/document/DocumentContentBody.vue'
import SuperDocEditor from '@/components/SuperDocEditor.vue'
import AppButton from '../AppButton.vue'
import { formatApiErrorMessage, getSuperdocUserFromAuth } from '@/util/util'
import Notice from '../Notice.vue'

const { t, locale } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const documentId = route.params.id as string
const versionId = route.query.version as string | undefined

const loading = ref(true)
const content = ref<string | null>(null)
const docxContentUrl = ref<string | null>(null)
const documentData = ref<Document | null>(null)
const activeVersionId = ref<number | null>(null)
const acknowledgeLoading = ref(false)
const superDocRef = ref<InstanceType<typeof SuperDocEditor> | null>(null)
const documentHasComments = ref(false)
const reviewDocSaveTimer = ref<number | null>(null)
const reviewDocSaveInFlight = ref(false)
const reviewDocSaveSuppress = ref(false)

const superdocUser = computed(() => getSuperdocUserFromAuth(authStore.state.userDetails))

const routeNodeId = computed(() => {
    const id = route.query.nodeId
    return typeof id === 'string' && id.trim() ? id.trim() : null
})

const routeNodeOffset = computed(() => {
    const raw = route.query.nodeOffset
    if (typeof raw !== 'string' || !raw.trim()) return null
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
})

const canCommentOnDocument = computed(() => {
    const userId = authStore.state.userDetails.id
    const doc = documentData.value
    if (!userId || !doc) return false
    if (doc.createdBy?.id === userId) return true
    if (doc.reviewers?.some((r) => r.id === userId)) return true
    if (doc.approvers?.some((a) => a.id === userId)) return true
    if (doc.acknowledgers?.some((a) => a.id === userId)) return true
    return false
})

const canHighlightOnDocument = computed(() => {
    const userId = authStore.state.userDetails.id
    const doc = documentData.value
    if (!userId || !doc) return false
    if (doc.createdBy?.id === userId) return true
    if (doc.reviewers?.some((r) => r.id === userId)) return true
    if (doc.approvers?.some((a) => a.id === userId)) return true
    if (doc.acknowledgers?.some((a) => a.id === userId)) return true
    return false
})

const canComment = computed(() => {
    const doc = documentData.value
    if (!doc || doc.contentType !== ContentType.EDITOR) return false
    return canCommentOnDocument.value
})

const showCommentNotice = computed(() => {
    const doc = documentData.value
    if (!doc) return false
    if (doc.contentType !== ContentType.EDITOR || !(docxContentUrl.value || content.value)) {
        return false
    }
    return documentHasComments.value
})

async function onSuperdocReady() {
    if (!superDocRef.value) return
    try {
        documentHasComments.value = await superDocRef.value.hasComments()
    } catch (error) {
        console.error('Failed to detect document comments:', error)
        documentHasComments.value = false
    }
    await new Promise((resolve) => window.setTimeout(resolve, 400))
    await scrollToNode()
}

function onCommentSaved(payload: { type: string }) {
    if (payload.type === 'add') {
        documentHasComments.value = true
    }
    scheduleReviewDocSave()
}

async function saveReviewDocComments() {
    if (!canSaveDocumentAnnotations.value || !superDocRef.value || reviewDocSaveInFlight.value) return
    const versionIdForSave = activeVersion.value?.id
    if (versionIdForSave == null) return

    reviewDocSaveInFlight.value = true
    reviewDocSaveSuppress.value = true
    try {
        const file = await superDocRef.value.exportDocx(
            `${documentData.value?.title || 'document'}.docx`
        )
        const uploadForm = new FormData()
        uploadForm.append('file', file)
        await apiPutFormData(
            `/documents/${documentId}/versions/${versionIdForSave}/review-comments`,
            uploadForm,
            authStore
        )
    } catch (error: unknown) {
        console.error('Save review document failed', error)
        const raw = formatApiErrorMessage(
            (error as { response?: { data?: unknown } })?.response?.data,
            t,
            'errors.document'
        )
        toast.showToast(
            t('common.error'),
            raw || t('document.form.toast_save_version_content_failed'),
            'error'
        )
    } finally {
        reviewDocSaveInFlight.value = false
        window.setTimeout(() => {
            reviewDocSaveSuppress.value = false
        }, 1500)
    }
}

function scheduleReviewDocSave() {
    if (!canSaveDocumentAnnotations.value || reviewDocSaveSuppress.value) return
    if (reviewDocSaveTimer.value != null) {
        window.clearTimeout(reviewDocSaveTimer.value)
    }
    reviewDocSaveTimer.value = window.setTimeout(() => {
        reviewDocSaveTimer.value = null
        void saveReviewDocComments()
    }, 500)
}

async function scrollToNode(nodeId?: string | null, offset?: number | null) {
    const id = nodeId ?? routeNodeId.value
    if (!id || !superDocRef.value) return
    const scrollOffset = offset ?? routeNodeOffset.value ?? undefined

    for (let attempt = 0; attempt < 20; attempt++) {
        if (await superDocRef.value.scrollToElement(id, scrollOffset)) return
        await new Promise((resolve) => window.setTimeout(resolve, 300))
    }
}

watch([routeNodeId, routeNodeOffset], ([nodeId]) => {
    if (nodeId) void scrollToNode(nodeId)
}, { immediate: true })

const latestVersion = computed(() => {
    const versions = documentData.value?.versions ?? []
    if (!versions.length) return null
    return versions.reduce((max, version) =>
        version.versionNumber > max.versionNumber ? version : max
    )
})

const activeVersion = computed(() => {
    if (activeVersionId.value != null) {
        return documentData.value?.versions?.find((v) => v.id === activeVersionId.value) ?? null
    }
    return latestVersion.value
})

const canSaveDocumentAnnotations = computed(() => {
    const version = activeVersion.value
    const doc = documentData.value
    if (!version || !doc || doc.contentType !== ContentType.EDITOR) return false
    return canHighlightOnDocument.value
})

const isAcknowledger = computed(() => {
    const userId = authStore.state.userDetails.id
    return !!documentData.value?.acknowledgers?.some((acknowledger) => acknowledger.id === userId)
})

const hasAcknowledgedLatestVersion = computed(() => {
    const latest = latestVersion.value
    const userId = authStore.state.userDetails.id
    if (!latest) return false
    return (
        documentData.value?.contributors
            ?.filter(
                (contributor) =>
                    contributor.version === latest.versionNumber && contributor.user.id === userId
            )
            .some((contributor) =>
                contributor.actions.some((action) => action.type === 'acknowledged')
            ) ?? false
    )
})

const showAcknowledgeControl = computed(() => {
    const latest = latestVersion.value
    if (!latest || !isAcknowledger.value) return false
    return ['published', 'obsolete'].includes(latest.status)
})

const documentTitle = ref('')
const versionNumberForLabel = ref<number | null>(null)
const blockedReasonKey = ref<'multi_version' | null>(null)

const blockedReason = computed(() => {
    void locale.value
    return blockedReasonKey.value === 'multi_version'
        ? t('document.content_page.blocked_multi_version')
        : null
})

const versionSubtitle = computed(() => {
    void locale.value
    return versionNumberForLabel.value != null
        ? t('document.content_page.version_label', { n: versionNumberForLabel.value })
        : ''
})

const crumbs = computed(() => {
    void locale.value
    const lastCrumbName =
        versionNumberForLabel.value != null
            ? t('document.content_page.version_label', { n: versionNumberForLabel.value })
            : t('document.content_page.breadcrumb_view')
    return [
        { name: t('nav.documents'), path: '/plan/documents', icon: 'fa-solid fa-file-lines' },
        {
            name: documentTitle.value || t('document.view.breadcrumb_fallback'),
            path: `/plan/documents/${documentId}`,
            icon: ''
        },
        { name: lastCrumbName, path: '', icon: '' }
    ]
})

onMounted(async () => {
    try {
        if (versionId) {
            const docMeta = await apiGet<Document>(`/documents/${documentId}`, authStore)
            documentTitle.value = docMeta.title
            documentData.value = docMeta
            const version = docMeta.versions?.find(
                (v) => String(v.id) === versionId || String(v.versionNumber) === versionId
            )
            versionNumberForLabel.value = version ? version.versionNumber : null
            activeVersionId.value = version?.id ?? null

            const data = await apiGet<{ content: string | null; contentUrl?: string }>(
                `/documents/${documentId}/versions/${versionId}/content`,
                authStore
            )
            if (data.contentUrl) {
                docxContentUrl.value = data.contentUrl
            } else {
                content.value = data.content ?? null
            }
        } else {
            const data = await apiGet<Document>(
                `/documents/${documentId}?includeLatestPublishedContent=true`,
                authStore
            )
            documentTitle.value = data.title
            documentData.value = data
            versionNumberForLabel.value = null

            if (data.latestPublishedVersionContentUrl) {
                docxContentUrl.value = data.latestPublishedVersionContentUrl
                const latestPublished = (data.versions ?? [])
                    .filter((v) => v.status === DocumentStatus.PUBLISHED)
                    .reduce<Document['versions'][number] | null>((max, version) => {
                        if (!max || version.versionNumber > max.versionNumber) return version
                        return max
                    }, null)
                activeVersionId.value = latestPublished?.id ?? null
            } else {
                const multiVersion = (data.versions?.length ?? 0) > 1
                let html: string | null = data.latestPublishedVersionContent ?? null
                const onlyOne = (data.versions?.length ?? 0) === 1
                if (!html && data.contentType === ContentType.EDITOR && onlyOne && data.versions?.[0]?.id) {
                    const contentRes = await apiGet<{ content: string | null; contentUrl?: string }>(
                        `/documents/${documentId}/versions/${data.versions[0].id}/content`,
                        authStore
                    )
                    if (contentRes.contentUrl) {
                        docxContentUrl.value = contentRes.contentUrl
                        activeVersionId.value = data.versions[0].id
                    } else {
                        html = contentRes.content ?? null
                    }
                }
                if (!html && !docxContentUrl.value && multiVersion && data.contentType === ContentType.EDITOR) {
                    blockedReasonKey.value = 'multi_version'
                }
                content.value = html
            }
        }
    } catch (error: any) {
        console.error('Failed to fetch document content:', error)
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.content_page.toast_load_failed'),
            'error'
        )
    } finally {
        loading.value = false
    }
})

async function copyCommentLink(commentId: string) {
    try {
        const url = new URL(window.location.href)
        url.searchParams.set('commentId', commentId)
        const version =
            versionId ??
            (activeVersionId.value != null ? String(activeVersionId.value) : null)
        if (version) {
            url.searchParams.set('version', version)
        }
        await navigator.clipboard.writeText(url.toString())
        toast.showToast(t('common.success'), t('document.view.comment_link_copied'), 'success')
    } catch (error) {
        console.error('Copy comment link failed', error)
        toast.showToast(t('common.error'), t('document.view.comment_link_copy_failed'), 'error')
    }
}

async function copyNodeLink(payload: { nodeId: string; offset?: number }) {
    const { nodeId, offset } = payload
    try {
        const url = new URL(window.location.href)
        url.searchParams.set('nodeId', nodeId)
        if (typeof offset === 'number' && Number.isFinite(offset) && offset > 0) {
            url.searchParams.set('nodeOffset', String(Math.floor(offset)))
        } else {
            url.searchParams.delete('nodeOffset')
        }
        const version =
            versionId ??
            (activeVersionId.value != null ? String(activeVersionId.value) : null)
        if (version) {
            url.searchParams.set('version', version)
        }
        await navigator.clipboard.writeText(url.toString())
        toast.showToast(t('common.success'), t('document.view.paragraph_link_copied'), 'success')
    } catch (error) {
        console.error('Copy paragraph link failed', error)
        toast.showToast(t('common.error'), t('document.view.paragraph_link_copy_failed'), 'error')
    }
}

async function acknowledgeDocument() {
    const latest = latestVersion.value
    if (!latest || hasAcknowledgedLatestVersion.value || acknowledgeLoading.value) return

    acknowledgeLoading.value = true
    try {
        await apiPost(
            `/documents/${documentId}/actions`,
            { type: 'acknowledged', versionNumber: latest.versionNumber },
            authStore
        )
        const refreshed = await apiGet<Document>(`/documents/${documentId}`, authStore)
        documentData.value = refreshed
        toast.showToast(t('common.success'), t('document.view.toast_action_ok'), 'success')
    } catch (error: any) {
        console.error('Error acknowledging document:', error)
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.view.toast_post_action_failed'),
            'error'
        )
    } finally {
        acknowledgeLoading.value = false
    }
}
</script>
