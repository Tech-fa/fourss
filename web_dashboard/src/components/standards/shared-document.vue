<template>
    <div class="min-h-screen bg-gray-100">
        <SharedStandardsHeader />
        <main id="main-content" class="p-6 w-full max-w-5xl mx-auto">
            <div v-if="loading" class="flex justify-center py-16">
                <Spinner width="3" />
            </div>
            <div v-else-if="errorMessage" class="bg-white border border-neutral-200 rounded-lg p-8 text-center">
                <p class="text-neutral-700">{{ errorMessage }}</p>
            </div>
            <template v-else-if="sharedDocument">
                <router-link
                    v-if="listCode"
                    class="mb-4 inline-flex text-sm text-primary hover:text-primary/70"
                    :to="{ name: SHARED_STANDARD_LIST, params: { code: listCode } }"
                >
                    {{ t('implementations.share.back_to_list') }}
                </router-link>
                <div class="bg-white border border-neutral-200 rounded-lg p-5 mb-6">
                    <p class="text-sm text-neutral-500">{{ sharedDocument.standardName }}</p>
                    <h1 class="mt-1 text-lg font-semibold text-neutral-900">
                        {{ sharedDocument.clause }} {{ sharedDocument.title }}
                    </h1>
                    <p class="mt-2 text-sm text-neutral-600">{{ sharedDocument.description }}</p>
                    <div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-700">
                        <span>{{ kindLabel(sharedDocument.kind) }}</span>
                        <span>{{ statusLabel(sharedDocument.status) }}</span>
                        <span v-if="sharedDocument.linked?.versionNumber != null">
                            {{ t('implementations.share.version_label', { version: sharedDocument.linked.versionNumber }) }}
                        </span>
                        <span v-if="sharedDocument.linked?.publishedAt">
                            {{
                                t('implementations.share.published_on', {
                                    date: formatDateToDay(sharedDocument.linked.publishedAt)
                                })
                            }}
                        </span>
                    </div>
                    <p v-if="sharedDocument.linked" class="mt-3 text-sm text-neutral-800">
                        {{ sharedDocument.linked.title }}
                        <span class="text-neutral-500">({{ sharedDocument.linked.documentCode }})</span>
                    </p>
                </div>

                <div class="bg-white border border-neutral-200 rounded-lg p-5">
                    <p v-if="!sharedDocument.linked" class="text-sm text-neutral-500">
                        {{ t('implementations.share.no_linked') }}
                    </p>
                    <p v-else-if="sharedDocument.linked.contentKind === 'none'" class="text-sm text-neutral-500">
                        {{ t('implementations.share.no_published_file') }}
                    </p>
                    <p v-else-if="sharedDocument.linked.contentKind === 'unsupported'" class="text-sm text-neutral-500">
                        {{ t('implementations.share.unsupported') }}
                    </p>
                    <p v-else-if="sharedDocument.linked.contentKind === 'too_large'" class="text-sm text-neutral-500">
                        {{ t('implementations.share.too_large') }}
                    </p>
                    <SharedDocumentPreview
                        v-else-if="sharedDocument.linked.sessionId"
                        :session-id="sharedDocument.linked.sessionId"
                        :chunk-count="sharedDocument.linked.chunkCount"
                        :byte-length="sharedDocument.linked.byteLength"
                        :content-kind="sharedDocument.linked.contentKind"
                        :mime="sharedDocument.linked.mime"
                    />
                </div>
            </template>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import Spinner from '../Spinner.vue'
import SharedDocumentPreview from './shared-document-preview.vue'
import SharedStandardsHeader from './shared-standards-header.vue'
import { SHARED_STANDARD_LIST } from './routes'
import { readSharedListCode, usePrivateSharePage } from './use-private-share-page'
import { apiPostPublic } from '@/util/api'
import { formatApiErrorMessage, formatDateToDay } from '@/util/util'
import type { SharedStandardDocument } from '@/util/interfaces'

usePrivateSharePage(true)

const { t } = useI18n()
const route = useRoute()
const loading = ref(true)
const errorMessage = ref('')
const sharedDocument = ref<SharedStandardDocument | null>(null)
const listCode = ref<string | null>(readSharedListCode())
const shareCode = computed(() => String(route.params.code || ''))

const kindLabel = (kind: string) =>
    kind === 'retain'
        ? t('implementations.documents.kind_retain')
        : t('implementations.documents.kind_maintain')

const statusLabel = (status: string) => {
    const key = {
        not_started: 'implementations.documents.status_not_started',
        in_progress: 'implementations.documents.status_in_progress',
        implemented: 'implementations.documents.status_implemented'
    }[status]
    return key ? t(key) : status
}

onMounted(async () => {
    try {
        sharedDocument.value = await apiPostPublic<SharedStandardDocument>('/standards/shares/documents/open', {
            code: shareCode.value
        })
    } catch (error: unknown) {
        const raw = formatApiErrorMessage(
            (error as { response?: { data?: unknown } })?.response?.data,
            t,
            'errors.standard'
        )
        errorMessage.value = raw || t('implementations.share.invalid_link')
    } finally {
        loading.value = false
    }
})
</script>
