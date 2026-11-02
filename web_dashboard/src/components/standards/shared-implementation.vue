<template>
    <div class="min-h-screen bg-gray-100">
        <SharedStandardsHeader />
        <main id="main-content" class="p-6  min-w-[1200px] mx-auto">
            <div v-if="loading" class="flex justify-center py-16">
                <Spinner width="3" />
            </div>
            <div v-else-if="errorMessage" class="bg-white border border-neutral-200 rounded-lg p-8 text-center">
                <p class="text-neutral-700">{{ errorMessage }}</p>
            </div>
            <template v-else-if="implementation">
                <p class="mb-4 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
                    {{ t('implementations.share.readonly_banner') }}
                    {{ t('implementations.share.expires', { date: formatDateToDay(implementation.expiresAt) }) }}
                </p>
                <div class="bg-white border border-neutral-200 rounded-lg p-5 mb-6">
                    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 class="text-lg font-semibold text-neutral-900">
                                {{ implementation.standardName }}
                            </h1>
                            <p class="mt-1 text-sm text-neutral-500">
                                {{ t('implementations.documents.subtitle') }}
                            </p>
                        </div>
                        <span
                            class="inline-flex items-center rounded-full px-3 py-1 text-sm"
                            :class="
                                implementation.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            "
                        >
                            {{ implementationStatusLabel(implementation.status) }}
                        </span>
                    </div>
                    <div class="mt-4">
                        <div class="flex items-center justify-between text-sm text-neutral-600 mb-2">
                            <span>
                                {{
                                    t('implementations.documents.progress', {
                                        completed: implementation.completedCount,
                                        total: implementation.totalCount
                                    })
                                }}
                            </span>
                            <span>{{ progressPercent }}%</span>
                        </div>
                        <div class="h-2 bg-neutral-200 rounded-full overflow-hidden">
                            <div class="h-full bg-primary" :style="{ width: `${progressPercent}%` }"></div>
                        </div>
                    </div>
                </div>

                <Table
                    :cols="columns"
                    :column-labels="columnLabels"
                    :rows="rows"
                    :entities="tableEntities"
                    :page="1"
                    :total="tableEntities.length"
                    :per-page="Math.max(tableEntities.length, 1)"
                    :total-pages="1"
                    :entity-name="t('implementations.documents.title')"
                    :loading="false"
                    :skip-padding="true"
                    min-width="1400px"
                    :hide-edit="() => true"
                    :hide-view="() => true"
                    :hide-delete="() => true"
                    :on-next-page="noop"
                    :on-previous-page="noop"
                    :set-page="noop"
                    :on-success="loadImplementation"
                >
                    <template #extra-search>
                        <div class="flex flex-col gap-3 sm:flex-row">
                            <div class="sm:w-48">
                                <Select2
                                    v-model="kindFilter"
                                    :values="kindOptions"
                                    :display="(item: { name?: string }) => item?.name ?? ''"
                                    :placeholder="t('implementations.documents.filter_all_kinds')"
                                />
                            </div>
                            <div class="sm:w-48">
                                <Select2
                                    v-model="statusFilter"
                                    :values="statusFilterOptions"
                                    :display="(item: { name?: string }) => item?.name ?? ''"
                                    :placeholder="t('implementations.documents.filter_all_statuses')"
                                />
                            </div>
                        </div>
                    </template>
                </Table>
            </template>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, h, markRaw, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import Select2 from '../Select2.vue'
import Spinner from '../Spinner.vue'
import Table from '../Table.vue'
import SharedStandardsHeader from './shared-standards-header.vue'
import { SHARED_STANDARD_DOCUMENT } from './routes'
import { rememberSharedListCode, usePrivateSharePage } from './use-private-share-page'
import { apiPostPublic } from '@/util/api'
import { formatApiErrorMessage, formatDateToDay } from '@/util/util'
import type { SharedImplementation, SharedImplementationDocument } from '@/util/interfaces'

usePrivateSharePage()

const { t } = useI18n()
const route = useRoute()
const loading = ref(true)
const errorMessage = ref('')
const implementation = ref<SharedImplementation | null>(null)
const kindFilter = ref<{ id: string; name: string }>({ id: '', name: '' })
const statusFilter = ref<{ id: string; name: string }>({ id: '', name: '' })
const shareCode = computed(() => String(route.params.code || ''))

const progressPercent = computed(() => {
    const total = implementation.value?.totalCount ?? 0
    if (!total) return 0
    return Math.round(((implementation.value?.completedCount ?? 0) / total) * 100)
})

const kindOptions = computed(() => [
    { id: '', name: t('implementations.documents.filter_all_kinds') },
    { id: 'maintain', name: t('implementations.documents.kind_maintain') },
    { id: 'retain', name: t('implementations.documents.kind_retain') }
])

const statusOptions = computed(() => [
    { id: 'not_started', name: t('implementations.documents.status_not_started') },
    { id: 'in_progress', name: t('implementations.documents.status_in_progress') },
    { id: 'implemented', name: t('implementations.documents.status_implemented') }
])

const statusFilterOptions = computed(() => [
    { id: '', name: t('implementations.documents.filter_all_statuses') },
    ...statusOptions.value
])

const visibleDocuments = computed(() =>
    (implementation.value?.documents ?? []).filter((document) => {
        if (kindFilter.value?.id && document.kind !== kindFilter.value.id) return false
        if (statusFilter.value?.id && document.status !== statusFilter.value.id) return false
        return true
    })
)

const tableEntities = computed(() =>
    visibleDocuments.value.map((document) => ({
        ...document,
        id: document.viewCode
    }))
)

const columns = ['clause', 'title', 'kind', 'status', 'linked', 'version', 'published', 'view']

const columnLabels = computed(() => ({
    clause: t('implementations.documents.col_clause'),
    title: t('implementations.documents.col_title'),
    kind: t('implementations.documents.col_kind'),
    status: t('implementations.documents.col_status'),
    linked: t('implementations.documents.col_linked'),
    version: t('implementations.share.col_version'),
    published: t('implementations.share.col_published'),
    view: t('implementations.share.view_document')
}))

const titleCell = (document: SharedImplementationDocument) =>
    markRaw({
        setup() {
            return () =>
                h('div', [
                    h('div', { class: 'font-medium' }, document.title),
                    h('p', { class: 'mt-1 text-neutral-500' }, document.description)
                ])
        }
    })

const linkedCell = (document: SharedImplementationDocument) => {
    if (!document.linkedTitle) {
        return markRaw({
            setup() {
                return () =>
                    h('span', { class: 'text-neutral-500' }, t('implementations.documents.no_link'))
            }
        })
    }
    return markRaw({
        setup() {
            return () =>
                h('div', [
                    h('div', document.linkedTitle || ''),
                    h('p', { class: 'text-neutral-500' }, document.linkedCode || '')
                ])
        }
    })
}

const viewCell = (document: SharedImplementationDocument) =>
    markRaw({
        setup() {
            return () =>
                h(
                    RouterLink,
                    {
                        class: 'text-primary hover:text-primary/70',
                        to: { name: SHARED_STANDARD_DOCUMENT, params: { code: document.viewCode } },
                        'test-id': 'shared-document-link'
                    },
                    { default: () => t('implementations.share.view_document') }
                )
        }
    })

const rows = computed(() =>
    visibleDocuments.value.map((document) => ({
        id: document.viewCode,
        clause: document.clause,
        title: titleCell(document),
        kind: kindLabel(document.kind),
        status: statusLabel(document.status),
        linked: linkedCell(document),
        version: document.versionNumber ?? t('implementations.share.no_published'),
        published: document.publishedAt
            ? formatDateToDay(document.publishedAt)
            : t('implementations.share.no_published'),
        view: viewCell(document)
    }))
)

const noop = () => undefined

const implementationStatusLabel = (status: string) =>
    status === 'completed'
        ? t('implementations.documents.implementation_status_completed')
        : t('implementations.documents.implementation_status_in_progress')

const kindLabel = (kind: string) =>
    kind === 'retain'
        ? t('implementations.documents.kind_retain')
        : t('implementations.documents.kind_maintain')

const statusLabel = (status: string) =>
    statusOptions.value.find((option) => option.id === status)?.name ?? status

const loadImplementation = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
        implementation.value = await apiPostPublic<SharedImplementation>('/standards/shares/open', {
            code: shareCode.value
        })
        rememberSharedListCode(shareCode.value)
        kindFilter.value = kindOptions.value[0]
        statusFilter.value = statusFilterOptions.value[0]
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
}

onMounted(loadImplementation)
</script>
