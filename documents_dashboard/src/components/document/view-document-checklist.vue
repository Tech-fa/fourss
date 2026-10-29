<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs" />

        <div v-if="loading" class="flex items-center justify-center py-32">
            <Spinner width="8" />
        </div>

        <main v-else class="p-6 max-w-4xl mx-auto" test-id="document-checklist-content-page">
            <div class="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <h1 class="text-lg font-medium text-neutral-900">
                        {{ documentTitle }}
                    </h1>
                    <span v-if="versionNumber != null" class="text-sm text-neutral-500">
                        {{ t('document.view.version_number', { n: versionNumber }) }}
                    </span>
                </div>
                <DocumentChecklistViewer
                    :questions="questions"
                    :empty-message="t('document.checklist_viewer.empty_version')"
                />
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BreadCrums from '@/components/breadCrums.vue'
import Spinner from '@/components/Spinner.vue'
import DocumentChecklistViewer from './DocumentChecklistViewer.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiGet } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'
import type { Document, DocumentChecklistQuestion } from '@/util/interfaces'
import { ContentType, DocumentStatus } from '@/util/interfaces'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const documentId = route.params.id as string
const loading = ref(true)
const documentTitle = ref('')
const versionNumber = ref<number | null>(null)
const questions = ref<DocumentChecklistQuestion[]>([])

const crumbs = computed(() => [
    {
        name: t('nav.documents'),
        path: '/plan/documents',
        icon: 'fa-solid fa-file-lines'
    },
    {
        name: documentTitle.value || t('document.view.breadcrumb_fallback'),
        path: `/plan/documents/${documentId}`,
        icon: ''
    },
    {
        name: t('document.checklist_viewer.breadcrumb_view'),
        path: '',
        icon: ''
    }
])

const resolveVersion = (doc: Document) => {
    const versions = doc.versions ?? []
    const queryVersionId = Number(
        Array.isArray(route.query.version) ? route.query.version[0] : route.query.version
    )
    if (Number.isFinite(queryVersionId) && queryVersionId > 0) {
        return versions.find((v) => v.id === queryVersionId) ?? null
    }
    const published = [...versions]
        .filter((v) => v.status === DocumentStatus.PUBLISHED)
        .sort((a, b) => b.versionNumber - a.versionNumber)[0]
    return published ?? versions[versions.length - 1] ?? null
}

onMounted(async () => {
    try {
        const doc = await apiGet<Document>(`/documents/${documentId}`, authStore)
        if (doc.contentType !== ContentType.CHECKLIST) {
            router.replace(`/plan/documents/${documentId}/content`)
            return
        }
        documentTitle.value = doc.title || ''
        const version = resolveVersion(doc)
        versionNumber.value = version?.versionNumber ?? null
        const rawQuestions = version?.checklist?.questions ?? []
        questions.value = rawQuestions.map((q: any, index: number) => ({
            question: q.question || q.questionText || '',
            questionType: q.questionType,
            required: !!q.required,
            orderIndex: q.orderIndex ?? index
        }))
    } catch (error: any) {
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            raw || t('document.view.toast_fetch_failed'),
            'error'
        )
        router.replace('/plan/documents')
    } finally {
        loading.value = false
    }
})
</script>
