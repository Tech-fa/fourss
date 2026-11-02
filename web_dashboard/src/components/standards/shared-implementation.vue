<template>
    <div class="min-h-screen bg-gray-100">
        <SharedStandardsHeader />
        <main id="main-content" class="p-6 w-full max-w-6xl mx-auto">
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

                <div class="flex flex-col gap-3 sm:flex-row mb-4">
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

                <div class="bg-white overflow-auto w-full rounded-lg border border-neutral-200">
                    <table class="min-w-full">
                        <thead class="bg-primary">
                            <tr>
                                <th class="px-4 py-2 text-start text-sm text-opposite">
                                    {{ t('implementations.documents.col_clause') }}
                                </th>
                                <th class="px-4 py-2 text-start text-sm text-opposite min-w-64">
                                    {{ t('implementations.documents.col_title') }}
                                </th>
                                <th class="px-4 py-2 text-start text-sm text-opposite">
                                    {{ t('implementations.documents.col_kind') }}
                                </th>
                                <th class="px-4 py-2 text-start text-sm text-opposite">
                                    {{ t('implementations.documents.col_status') }}
                                </th>
                                <th class="px-4 py-2 text-start text-sm text-opposite min-w-48">
                                    {{ t('implementations.documents.col_linked') }}
                                </th>
                                <th class="px-4 py-2 text-start text-sm text-opposite">
                                    {{ t('implementations.share.col_version') }}
                                </th>
                                <th class="px-4 py-2 text-start text-sm text-opposite">
                                    {{ t('implementations.share.col_published') }}
                                </th>
                                <th class="px-4 py-2 text-start text-sm text-opposite">
                                    {{ t('implementations.share.view_document') }}
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-neutral-200">
                            <tr v-if="visibleDocuments.length === 0">
                                <td colspan="8" class="px-4 py-8 text-center text-sm text-neutral-500">
                                    {{ t('common.no_records_found_for', { entity: t('implementations.documents.title') }) }}
                                </td>
                            </tr>
                            <tr v-for="document in visibleDocuments" :key="document.viewCode" class="align-top">
                                <td class="px-4 py-4 text-sm whitespace-nowrap">{{ document.clause }}</td>
                                <td class="px-4 py-4 text-sm min-w-64">
                                    <div class="font-medium">{{ document.title }}</div>
                                    <p class="mt-1 text-neutral-500">{{ document.description }}</p>
                                </td>
                                <td class="px-4 py-4 text-sm whitespace-nowrap">{{ kindLabel(document.kind) }}</td>
                                <td class="px-4 py-4 text-sm whitespace-nowrap">{{ statusLabel(document.status) }}</td>
                                <td class="px-4 py-4 text-sm">
                                    <template v-if="document.linkedTitle">
                                        <div>{{ document.linkedTitle }}</div>
                                        <p class="text-neutral-500">{{ document.linkedCode }}</p>
                                    </template>
                                    <span v-else class="text-neutral-500">
                                        {{ t('implementations.documents.no_link') }}
                                    </span>
                                </td>
                                <td class="px-4 py-4 text-sm whitespace-nowrap">
                                    {{ document.versionNumber ?? t('implementations.share.no_published') }}
                                </td>
                                <td class="px-4 py-4 text-sm whitespace-nowrap">
                                    {{
                                        document.publishedAt
                                            ? formatDateToDay(document.publishedAt)
                                            : t('implementations.share.no_published')
                                    }}
                                </td>
                                <td class="px-4 py-4 text-sm whitespace-nowrap">
                                    <router-link
                                        class="text-primary hover:text-primary/70"
                                        :to="{ name: SHARED_STANDARD_DOCUMENT, params: { code: document.viewCode } }"
                                        test-id="shared-document-link"
                                    >
                                        {{ t('implementations.share.view_document') }}
                                    </router-link>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import Select2 from '../Select2.vue'
import Spinner from '../Spinner.vue'
import SharedStandardsHeader from './shared-standards-header.vue'
import { SHARED_STANDARD_DOCUMENT } from './routes'
import { rememberSharedListCode, usePrivateSharePage } from './use-private-share-page'
import { apiPostPublic } from '@/util/api'
import { formatApiErrorMessage, formatDateToDay } from '@/util/util'
import type { SharedImplementation } from '@/util/interfaces'

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

onMounted(async () => {
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
})
</script>
