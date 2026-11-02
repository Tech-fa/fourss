<template>
    <Breadcrumb :crumbs="breadcrumbCrumbs">
        <div class="flex items-center gap-2">
            <Can subject="standards" :actions="['update']">
                <AppButton
                    buttonStyle="secondary"
                    test-id="share-implementation-button"
                    @click="openShareDialog"
                >
                    {{ t('implementations.share.button') }}
                </AppButton>
            </Can>
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
        </div>
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

            <Table
                :cols="columns"
                :column-labels="columnLabels"
                :rows="rows"
                :entities="visibleDocuments"
                :page="1"
                :total="visibleDocuments.length"
                :per-page="Math.max(visibleDocuments.length, 1)"
                :total-pages="1"
                :entity-name="t('implementations.documents.title')"
                :loading="false"
                subject="standards"
                :skip-padding="true"
                min-width="1200px"
                :hide-edit="() => true"
                :hide-view="() => true"
                :hide-delete="() => true"
                :on-next-page="noop"
                :on-previous-page="noop"
                :set-page="noop"
                :on-success="fetchImplementation"
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
</template>

<script setup lang="ts">
import { computed, h, markRaw, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Breadcrumb from '../breadCrums.vue'
import AddAndReload from '../AddAndReload.vue'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import Select2 from '../Select2.vue'
import Spinner from '../Spinner.vue'
import Table from '../Table.vue'
import ShareImplementationDialog from './share-implementation-dialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useDialog } from '@/stores/dialog'
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
const dialog = useDialog()
const toast = useToast()

const loading = ref(true)
const deleting = ref(false)
const documentsLoading = ref(false)
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

const columns = ['clause', 'title', 'kind', 'status', 'linked']

const columnLabels = computed(() => ({
    clause: t('implementations.documents.col_clause'),
    title: t('implementations.documents.col_title'),
    kind: t('implementations.documents.col_kind'),
    status: t('implementations.documents.col_status'),
    linked: t('implementations.documents.col_linked')
}))

const optionLabel = (item: { name?: string } | null | undefined) => item?.name ?? ''

const titleCell = (document: StandardImplementationDocument) =>
    markRaw({
        setup() {
            return () =>
                h('div', { 'test-id': `implementation-document-${document.id}` }, [
                    h('div', { class: 'font-bold' }, document.title),
                    h('p', { class: 'mt-1 text-neutral-500' }, document.description),
                    
                ])
        }
    })

const statusCell = (document: StandardImplementationDocument) => {
    if (!canUpdate.value) {
        return statusLabel(document.status)
    }
    return markRaw({
        setup() {
            return () =>
                h(
                    Can,
                    { subject: 'standards', actions: ['update'] },
                    {
                        default: () =>
                            h(Select2, {
                                modelValue: statusOption(document.status),
                                values: statusOptions.value,
                                display: optionLabel,
                                placeholder: t('implementations.documents.col_status'),
                                'onUpdate:modelValue': (value: { id: string }) =>
                                    updateStatus(document, value)
                            })
                    }
                )
        }
    })
}

const rows = computed(() =>
    visibleDocuments.value.map((document) => ({
        id: document.id,
        clause: document.clause,
        title: titleCell(document),
        kind: kindLabel(document.kind),
        status: statusCell(document),
        linked: linkedCell(document)
    }))
)

const noop = () => undefined

const openShareDialog = () => {
    dialog.openDialog(ShareImplementationDialog, {
        implementationId: implementationId.value,
        standardName: implementation.value?.standardName || '',
        onCancel: () => dialog.closeDialog(),
    })
}
const linkedCell = (document: StandardImplementationDocument) => {
    return markRaw({
        setup() {
            return () =>
            h('div', { class: 'mt-4 max-w-80' }, [
                        h('div', { class: 'relative min-w-0' }, [
                            h(
                                Can,
                                { subject: 'documents', actions: ['create'] },
                                {
                                    default: () =>
                                        h('span', { class: 'absolute right-0 -top-5 z-10' }, [
                                            h(AddAndReload, {
                                                href: '/plan/documents/add',
                                                addText: t('implementations.documents.create_document'),
                                                reloadLoading: documentsLoading.value,
                                                addTestId: `create-document-${document.id}`,
                                                reloadTestId: `reload-documents-${document.id}`,
                                                onReload: reloadDocuments
                                            })
                                        ])
                                }
                            ),
                            h(
                                Can,
                                { subject: 'documents', actions: ['read'] },
                                {
                                    default: () =>
                                        h(Select2, {
                                            modelValue: linkedOption(document),
                                            values: documentOptions.value,
                                            display: optionLabel,
                                            placeholder: t('implementations.documents.link_document'),
                                            optional: true,
                                            'onUpdate:modelValue': (value: { id: string } | null) =>
                                                updateLinkedDocument(document, value)
                                        })
                                }
                            ),
                            document.linkedDocument
                                ? h(
                                      'a',
                                      {
                                          class: 'mt-2 inline-flex 2xl:text-sm text-xs text-primary hover:text-primary/70',
                                          href: `/plan/documents/${document.linkedDocument.id}`,
                                          onClick: (event: Event) => {
                                              event.preventDefault()
                                              router.push(
                                                  `/plan/documents/${document.linkedDocument!.id}`
                                              )
                                          }
                                      },
                                      document.linkedDocument.title
                                  )
                                : null
                        ])
                    ])
        }
    })
}

const fetchImplementation = async () => {
    loading.value = true
    try {
        implementation.value = await apiGet<StandardImplementation>(
            `/standards/implementations/${implementationId.value}`,
            authStore
        )
        await loadDocuments()
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

const loadDocuments = async () => {
    if (!authStore.hasPermissions({ subject: 'documents', actions: ['read'] })) return
    const response = await apiGet<PaginatedResponse<Document>>(
        '/documents?perPage=50&page=1',
        authStore
    )
    documents.value = response.data
}

const reloadDocuments = async () => {
    documentsLoading.value = true
    try {
        await loadDocuments()
    } catch (error: any) {
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.standard')
        toast.showToast(
            t('common.error'),
            raw || t('implementations.view.toast_fetch_failed'),
            'error'
        )
    } finally {
        documentsLoading.value = false
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
