<template>
    <Breadcrumb :crumbs="breadcrumbCrumbs">
        <Can subject="standards" :actions="['delete']">
            <AppButton
                buttonStyle="danger"
                :warn-before="t('implementations.documents.delete_confirm')"
                :loading="deleting"
                test-id="delete-implementation-button"
                @click="deleteImplementation"
            >
                {{ t('implementations.documents.delete_implementation') }}
            </AppButton>
        </Can>
    </Breadcrumb>

    <main id="main-content" class="p-6">
        <div v-if="loading" class="flex justify-center py-16">
            <Spinner width="3" />
        </div>

        <template v-else-if="implementation">
            <div class="bg-white border border-neutral-200 rounded-lg p-5 mb-6">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 class="text-lg font-semibold text-neutral-900">
                            {{ implementation.standardName }}
                        </h2>
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
                    <div
                        class="h-2 bg-neutral-200 rounded-full overflow-hidden"
                        role="progressbar"
                        :aria-valuenow="progressPercent"
                        aria-valuemin="0"
                        aria-valuemax="100"
                    >
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

            <div class="bg-white border border-neutral-200 rounded-lg overflow-visible">
                <table class="min-w-full">
                    <thead class="bg-neutral-50 text-start text-sm text-neutral-600">
                        <tr>
                            <th class="px-4 py-3 font-medium">{{ t('implementations.documents.col_clause') }}</th>
                            <th class="px-4 py-3 font-medium">{{ t('implementations.documents.col_title') }}</th>
                            <th class="px-4 py-3 font-medium">{{ t('implementations.documents.col_kind') }}</th>
                            <th class="px-4 py-3 font-medium">{{ t('implementations.documents.col_status') }}</th>
                            <th class="px-4 py-3 font-medium">{{ t('implementations.documents.col_linked') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="visibleDocuments.length === 0">
                            <td colspan="5" class="px-4 py-8 text-center text-sm text-neutral-500">
                                {{ t('common.no_records_found_for', { entity: t('implementations.documents.title') }) }}
                            </td>
                        </tr>
                        <tr
                            v-for="document in visibleDocuments"
                            :key="document.id"
                            class="border-t border-neutral-200 align-top"
                            :test-id="`implementation-document-${document.id}`"
                        >
                            <td class="px-4 py-3 text-sm font-medium text-neutral-900 whitespace-nowrap">
                                {{ document.clause }}
                            </td>
                            <td class="px-4 py-3 text-sm text-neutral-800">
                                <div class="font-medium">{{ document.title }}</div>
                                <p class="mt-1 text-neutral-500">{{ document.description }}</p>
                            </td>
                            <td class="px-4 py-3 text-sm text-neutral-700 whitespace-nowrap">
                                {{ kindLabel(document.kind) }}
                            </td>
                            <td class="px-4 py-3 min-w-44">
                                <Can subject="standards" :actions="['update']">
                                    <Select2
                                        :model-value="statusOption(document.status)"
                                        :values="statusOptions"
                                        :display="(item: { name?: string }) => item?.name ?? ''"
                                        :placeholder="t('implementations.documents.col_status')"
                                        @update:modelValue="(value) => updateStatus(document, value)"
                                    />
                                </Can>
                                <span v-if="!canUpdate" class="text-sm text-neutral-700">
                                    {{ statusLabel(document.status) }}
                                </span>
                            </td>
                            <td class="px-4 py-3 min-w-56">
                                <Can subject="documents" :actions="['read']">
                                    <Select2
                                        :model-value="linkedOption(document)"
                                        :values="documentOptions"
                                        :display="(item: { name?: string }) => item?.name ?? ''"
                                        :placeholder="t('implementations.documents.link_document')"
                                        :optional="true"
                                        @update:modelValue="(value) => updateLinkedDocument(document, value)"
                                    />
                                </Can>
                                <a
                                    v-if="document.linkedDocument"
                                    class="mt-2 inline-flex text-sm text-neutral-700 underline"
                                    :href="`/plan/documents/${document.linkedDocument.id}`"
                                    @click.prevent="router.push(`/plan/documents/${document.linkedDocument.id}`)"
                                >
                                    {{ document.linkedDocument.title }}
                                </a>
                                <Can subject="documents" :actions="['create']">
                                    <AppButton
                                        class="mt-2"
                                        buttonStyle="void"
                                        :href="`/plan/documents/add?redirect=${encodeURIComponent(`/plan/standards/${implementation.id}`)}`"
                                    >
                                        {{ t('implementations.documents.create_document') }}
                                    </AppButton>
                                </Can>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Breadcrumb from '../breadCrums.vue'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import Select2 from '../Select2.vue'
import Spinner from '../Spinner.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiDelete, apiGet, apiPatch } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'
import type {
    Document,
    PaginatedResponse,
    StandardImplementation,
    StandardImplementationDocument
} from '@/util/interfaces'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(true)
const deleting = ref(false)
const implementation = ref<StandardImplementation | null>(null)
const documents = ref<Document[]>([])
const kindFilter = ref<{ id: string; name: string }>({ id: '', name: '' })
const statusFilter = ref<{ id: string; name: string }>({ id: '', name: '' })

const implementationId = computed(() => String(route.params.id))
const canUpdate = computed(() =>
    authStore.hasPermissions({ subject: 'standards', actions: ['update'] })
)

const breadcrumbCrumbs = computed(() => [
    {
        name: t('nav.standards'),
        path: '/plan/standards',
        icon: 'fa-solid fa-certificate'
    },
    {
        name: implementation.value?.standardName || t('implementations.view.title'),
        path: '',
        icon: 'fa-solid fa-list-check'
    }
])

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

const documentOptions = computed(() => [
    { id: '', name: t('implementations.documents.no_link') },
    ...documents.value.map((document) => ({
        id: document.id,
        name: `${document.title} (${document.documentCode})`
    }))
])

const visibleDocuments = computed(() =>
    (implementation.value?.documents ?? []).filter((document) => {
        if (kindFilter.value.id && document.kind !== kindFilter.value.id) return false
        if (statusFilter.value.id && document.status !== statusFilter.value.id) return false
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

const statusOption = (status: string) =>
    statusOptions.value.find((option) => option.id === status) ?? statusOptions.value[0]

const linkedOption = (document: StandardImplementationDocument) => {
    if (!document.linkedDocument) {
        return documentOptions.value[0]
    }
    return (
        documentOptions.value.find((option) => option.id === document.linkedDocument?.id) ?? {
            id: document.linkedDocument.id,
            name: document.linkedDocument.title
        }
    )
}

const fetchImplementation = async () => {
    loading.value = true
    try {
        implementation.value = await apiGet<StandardImplementation>(
            `/standards/implementations/${implementationId.value}`,
            authStore
        )
        if (authStore.hasPermissions({ subject: 'documents', actions: ['read'] })) {
            const response = await apiGet<PaginatedResponse<Document>>(
                '/documents?perPage=50&page=1',
                authStore
            )
            documents.value = response.data
        }
        kindFilter.value = kindOptions.value[0]
        statusFilter.value = statusFilterOptions.value[0]
    } catch (error: any) {
        if (authStore.state.isLoggedIn) {
            const raw = formatApiErrorMessage(error.response?.data, t, 'errors.standard')
            toast.showToast(
                t('common.error'),
                raw || t('implementations.view.toast_fetch_failed'),
                'error'
            )
        }
        router.replace('/plan/standards')
    } finally {
        loading.value = false
    }
}

const updateStatus = async (
    document: StandardImplementationDocument,
    value?: { id: string }
) => {
    if (!value?.id || value.id === document.status) return
    try {
        implementation.value = await apiPatch<StandardImplementation>(
            `/standards/implementations/${implementationId.value}/documents/${document.id}`,
            { status: value.id },
            authStore
        )
        toast.showToast(
            t('common.success'),
            t('implementations.documents.toast_status_updated'),
            'success'
        )
    } catch (error: any) {
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.standard')
        toast.showToast(
            t('common.error'),
            raw || t('implementations.documents.toast_status_failed'),
            'error'
        )
    }
}

const updateLinkedDocument = async (
    document: StandardImplementationDocument,
    value?: { id: string } | null
) => {
    const nextId = value?.id || null
    const currentId = document.linkedDocument?.id ?? null
    if (nextId === currentId) return
    try {
        implementation.value = await apiPatch<StandardImplementation>(
            `/standards/implementations/${implementationId.value}/documents/${document.id}`,
            { linkedDocumentId: nextId },
            authStore
        )
        toast.showToast(
            t('common.success'),
            t('implementations.documents.toast_link_updated'),
            'success'
        )
    } catch (error: any) {
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.standard')
        toast.showToast(
            t('common.error'),
            raw || t('implementations.documents.toast_link_failed'),
            'error'
        )
    }
}

const deleteImplementation = async () => {
    deleting.value = true
    try {
        await apiDelete(`/standards/implementations/${implementationId.value}`, authStore)
        toast.showToast(t('common.success'), t('implementations.documents.toast_deleted'), 'success')
        router.push('/plan/standards')
    } catch (error: any) {
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.standard')
        toast.showToast(
            t('common.error'),
            raw || t('implementations.documents.toast_delete_failed'),
            'error'
        )
    } finally {
        deleting.value = false
    }
}

onMounted(fetchImplementation)
</script>
