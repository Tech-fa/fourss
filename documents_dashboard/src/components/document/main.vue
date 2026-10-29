<template>
    <Breadcrumb v-if="!embedded" :crumbs="[
        {
            name: t('document.main.breadcrumb'),
            path: '/plan/documents',
            icon: 'fa-solid fa-file-alt'
        }
    ]">
        <div class="flex items-center space-x-4">
            <div class="flex gap-4">
                

                <Can subject="documents" :actions="['create']">
                    <IconTooltipButton
                        buttonStyle="secondary"
                        class="flex items-center gap-2"
                        href="/plan/documents/add"
                        test-id="add-document-button"
                        :text="t('document.main.add_new_document')"
                        iconClass="fa-solid fa-plus"
                    />
                </Can>
                <Can subject="change_requests" :actions="['create']">
                    <IconTooltipButton
                        buttonStyle="secondary"
                        class="flex items-center gap-2"
                        @click="createChangeRequest"
                        test-id="create-change-request-button"
                        :text="t('document.main.create_change_request')"
                        iconClass="fa-solid fa-file-circle-plus"
                    />
                </Can>
                <Can subject="change_requests" :actions="['read']">
                    <IconTooltipButton
                        buttonStyle="secondary"
                        class="flex items-center gap-2"
                        href="/plan/documents/change-requests"
                        test-id="view-change-request-button"
                        :text="t('document.main.view_change_requests')"
                        iconClass="fa-solid fa-eye"
                    />
                </Can>
                <Can subject="documents" :actions="['create','update']">
                    <IconTooltipButton
                        buttonStyle="secondary"
                        class="gap-2 whitespace-nowrap"
                        href="/plan/documents/drafts"
                        test-id="my-drafts-button"
                        iconClass="fa-solid fa-file-pen"
                        :text="t('document.drafts.my_drafts')"
                        tooltip-placement="left"
                    />
                </Can>
                <Can :subjects="['document_types', 'document_approvals', 'document_templates']" :actions="['read']">
                    <IconTooltipButton
                        buttonStyle="secondary"
                        class="flex items-center gap-2"
                        href="/plan/documents/settings"
                        test-id="document-settings-button"
                        :text="t('document.main.settings')"
                        iconClass="fa-solid fa-gear"
                    />
                </Can>
              
            </div>
        </div>
    </Breadcrumb>

    <!-- Main Content -->
    <main :id="embedded ? undefined : 'main-content'" :class="embedded ? '' : 'pt-6 sm:px-2 2xl:px-8'">
        <!-- Search and Filter -->
        <div id="search-filter" class="mb-6">
            <div class="flex gap-4">
                <div class="flex-1">
                    <div class="relative">
                        <AppInput v-model="searchQuery" @input="handleSearch" type="text"
                            :placeholder="t('document.main.search_documents_by_title_or_code')"
                            class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                            test-id="document-search" />
                        <i class="fa-solid fa-search absolute left-3 top-3 text-neutral-400"></i>
                    </div>
                </div>
                <div class="flex gap-2">
                    <span style="min-width: 250px">
                        <Select2 v-model="filterData.status" :values="filterData.statuses || []"
                            :display="statusFilterDisplay" :placeholder="t('document.main.filter_all_statuses')"
                            @update:modelValue="(val) => handleFilterChange(val, 'status')" test-id="status-filter" />
                    </span>
                    <span style="min-width: 150px">
                        <Select2 v-model="filterData.category" :values="filterData.categories || []"
                            :display="categoryFilterDisplay" :placeholder="t('document.main.filter_all_categories')"
                            @update:modelValue="(val) => handleFilterChange(val, 'category')"
                            test-id="category-filter" />
                    </span>
                    <span v-if="TEAMS_FEATURE_ENABLED" style="min-width: 150px">
                        <Select2 v-model="filterData.organizationUnit" :values="filterData.organizationUnits || []"
                            :display="organizationUnitFilterDisplay"
                            :placeholder="t('document.main.filter_all_organization_units')" @update:modelValue="
                                (val) => handleFilterChange(val, 'organizationUnit')
                            " test-id="organization-unit-filter" />
                    </span>
                    <template v-if="embedded">
                        <Can subject="documents" :actions="['create']">
                            <IconTooltipButton
                                buttonStyle="secondary"
                                class="flex items-center gap-2"
                                :href="addHref"
                                test-id="add-document-button"
                                :text="t('document.main.add_new_document')"
                                iconClass="fa-solid fa-plus"
                            />
                        </Can>
                        <Can :subjects="['document_types', 'document_approvals', 'document_templates']" :actions="['read']">
                            <IconTooltipButton
                                buttonStyle="secondary"
                                class="flex items-center gap-2"
                                href="/plan/documents/settings"
                                test-id="document-settings-button"
                                :text="t('document.main.settings')"
                                iconClass="fa-solid fa-gear"
                            />
                        </Can>
                    </template>
                </div>
            </div>
        </div>

        <!-- Document List -->
        <Table :cols="columns" :rows="rows" :column-labels="columnLabels" :skip-padding="true"
            :entities="documents.data" :total-pages="totalPages" :page="currentPage" :total="totalDocuments"
            :per-page="perPage" :on-next-page="handleNextPage" :on-previous-page="handlePreviousPage"
            :set-page="setPage" :entity-name="t('document.main.entity_name')" :on-success="handleSuccess"
            :loading="loading" subject="documents" :hide-edit="(row: any) => true" :hide-view="(row: any) => true"
            :map-status-style="obsoleteStatusStyle" :sorted-columns="['Title', 'Code']" :on-sort="handleSort">
            <template #extra-field="{ entity }">
                <div class="flex gap-4 flex-wrap items-center justify-center h-full">
                    <Can subject="documents" :actions="['read']">
                        <AppButton type="button" button-style="void" :href="`/plan/documents/${entity.id}`"
                            class="cursor-pointer hover:text-neutral-400" :test-id="`document-view-${entity.id}`">
                            <i class="fa-solid fa-eye"></i>
                        </AppButton>
                    </Can>
                    <Can subject="documents" :actions="['read']">
                        <AppButton type="button" button-style="void" class="cursor-pointer hover:text-neutral-400"
                            :loading="downloadingId === entity.id" @click="() => handleDownload(entity)">
                            <i class="fa-solid fa-download"></i>
                        </AppButton>
                    </Can>
                    <Can subject="change_requests" :actions="['read']" v-if="entity.totalChangeRequests > 0">
                        <AppButton type="button" button-style="void"
                            :href="`/plan/documents/${entity.id}/change-requests`"
                            class="cursor-pointer hover:text-neutral-400">
                            <i class="fa-solid fa-file-circle-plus"></i>
                        </AppButton>
                    </Can>
                </div>
            </template>
        </Table>
    </main>
</template>

<script setup lang="ts">
import { ContentType, DocumentStatus, type Document, type PaginatedResponse } from '@/util/interfaces'
import AppButton from '../AppButton.vue'
import IconTooltipButton from '../IconTooltipButton.vue'
import Table from '../Table.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { apiGet, apiPost } from '@/util/api'
import { TEAMS_FEATURE_ENABLED } from '@/util/teams-feature'
import { formatLocalDate, formatApiErrorMessage, mapDocumentStatus, generatePdfFromHtml } from '@/util/util'
import Breadcrumb from '../breadCrums.vue'
import Select2 from '../Select2.vue'
import { useToast } from '@/stores/notification'
import AppInput from '../AppInput.vue'
import Can from '../Can.vue'

const props = withDefaults(
    defineProps<{
        embedded?: boolean
        processId?: string
    }>(),
    {
        embedded: false
    }
)

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t, locale } = useI18n()

const addHref = computed(() => {
    if (!props.processId) return '/plan/documents/add'
    const params = new URLSearchParams({
        processId: props.processId,
        redirect: '/plan/documents'
    })
    return `/plan/documents/add?${params.toString()}`
})

const columnLabels = computed(() => ({
    Title: t('document.main.main_table_columns.title'),
    Code: t('document.main.main_table_columns.code'),
    Creator: t('document.main.main_table_columns.creator'),
    Category: t('document.main.main_table_columns.category'),
    'Organization Unit': t('document.main.main_table_columns.organization_unit'),
    Status: t('document.main.main_table_columns.status'),
    'Upload Date': t('document.main.main_table_columns.upload_date'),
    Version: t('document.main.main_table_columns.version'),
    'New Version': t('document.main.main_table_columns.new_version')
}))

const documentStatusLabel = (status: string) => {
    if (!status) return t('document.main.status_labels.none')
    const key = `document.main.status_labels.${status}` as const
    const translated = t(key)
    return translated !== key ? translated : mapDocumentStatus(status)
}

const obsoleteStatusStyle = (status: string) => {
    return status === t('document.main.status_labels.obsolete') ? 'bg-red-100 text-red-800' : ''
}

const statusFilterDisplay = (val?: { id?: string }) => {
    if (val == null || val.id === '') return t('document.main.filter_all_statuses')
    return documentStatusLabel(val.id as string)
}

const categoryFilterDisplay = (item?: { id?: string; name?: string }) => {
    if (item == null || item.id === '') return t('document.main.filter_all_categories')
    return item?.name || ''
}

const organizationUnitFilterDisplay = (item?: { id?: string; name?: string }) => {
    if (item == null || item.id === '') return item?.name || t('document.main.filter_all_organization_units')
    return item?.name || ''
}

// Table data
const columns = [
    'Title',
    'Code',
    'Creator',
    'Category',
    'Organization Unit',
    'Status',
    'Upload Date',
    'Version',
    'New Version'
]
const documents = ref<PaginatedResponse<Document>>({
    data: [],
    currentPage: 1,
    totalCount: 0,
    perPage: 10
})
const rows = ref<{ [key: string]: any }[]>([])

// Pagination and Search
const currentPage = ref(1)
const totalPages = ref(1)
const totalDocuments = ref(1)
const perPage = ref(10)
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const searchTimeout = ref()
const filterData = ref<any>({})
const sortBy = ref<string>('')
const sortDir = ref<'asc' | 'desc' | null>(null)

const mapRows = (documents: Document[]) => {
    void locale.value
    return documents.map((doc) => ({
        id: doc.id,
        Title: doc.title,
        Code: doc.documentCode,
        Creator: doc.createdBy.fname + ' ' + doc.createdBy.lname,
        Category: doc.documentType.name,
        'Organization Unit': doc.team?.name || '',
        Status: documentStatusLabel(doc.versions[0].status),
        'Upload Date': formatLocalDate(doc.createdAt),
        Version: doc.currentVersion,
        'New Version': documentStatusLabel(
            (doc as { newVersions?: { status: string }[] }).newVersions?.[0]?.status || 'none'
        )
    }))
}

watch(
    [filterData, currentPage],
    () => {
        fetchDocuments()
    },
    { deep: true }
)

const fetchDocuments = async () => {
    loading.value = true
    error.value = null
    try {
        const searchParam = searchQuery.value ? `&search=${searchQuery.value}` : ''
        const statusParam = filterData.value.status?.id
            ? `&status=${filterData.value.status.id}`
            : ''
        const categoryParam = filterData.value.category?.id
            ? `&category=${filterData.value.category.id}`
            : ''
        const organizationUnitParam = filterData.value.organizationUnit?.id
            ? `&team=${filterData.value.organizationUnit.id}`
            : ''
        const processParam = props.processId ? `&processId=${props.processId}` : ''
        const sortParams =
            sortBy.value && sortDir.value
                ? `&sortBy=${encodeURIComponent(sortBy.value)}&sortDir=${encodeURIComponent(sortDir.value)}`
                : ''

        const response = await apiGet<PaginatedResponse<Document>>(
            `/documents?perPage=${perPage.value}&page=${currentPage.value}${searchParam}${statusParam}${categoryParam}${organizationUnitParam}${processParam}${sortParams}`,
            authStore
        )
        rows.value = mapRows(response.data)
        documents.value = response
        totalPages.value = Math.ceil(response.totalCount / perPage.value)
        totalDocuments.value = response.totalCount
    } catch (err: any) {
        console.error(err)
        if (authStore.state.isLoggedIn) {
            const apiMsg = formatApiErrorMessage(err.response?.data, t, 'errors.document')
            toast.showToast(
                t('common.error'),
                apiMsg || t('document.main.toast_failed_fetch_documents'),
                'error'
            )
        }
    } finally {
        loading.value = false
    }
}

const fetchFilterOptions = async () => {
    loading.value = true
    error.value = null
    try {
        const [categories, organizationUnits] = await Promise.all([
            apiGet<any>('/documents/types', authStore),
            apiPost<any>(
                'permissions/teams/user',
                {
                    subject: 'documents'
                },
                authStore
            ),
        ])

        //flatten organization units
        // const flattenedOrganizationUnits = flattenTree(organizationUnits)
        filterData.value = {
            categories: [{ id: '', name: t('document.main.filter_all_categories') }, ...categories],
            organizationUnits: [
                { id: '', name: t('document.main.filter_all_organization_units') },
                ...organizationUnits
            ],
            statuses: [
                { id: '', name: '' },
                { id: DocumentStatus.PENDING, name: '' },
                {
                    id: DocumentStatus.READY_FOR_APPROVAL,
                    name: ''
                },
                { id: DocumentStatus.PUBLISHED, name: '' },
                { id: DocumentStatus.OBSOLETE, name: '' }
            ],
            status: { id: '', name: '' },
            category: { id: '', name: t('document.main.filter_all_categories') },
            organizationUnit: {
                id: '',
                name: t('document.main.filter_all_organization_units')
            }
        }
        applyOrganizationUnitFromQuery()
    } catch (err: any) {
        const apiMsg = formatApiErrorMessage(err.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.main.toast_failed_fetch_filters'),
            'error'
        )
    } finally {
        loading.value = false
    }
}

// Handlers
const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }

    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1 // Reset to first page when searching
        fetchDocuments()
    }, 300) // Debounce search for 300ms
}

onUnmounted(() => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
})

const handleNextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++
    }
}

const handlePreviousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
    }
}

const setPage = (page: number) => {
    currentPage.value = page
}

const handleSuccess = () => {
    fetchDocuments()
}

const handleFilterChange = (value: any, type: 'category' | 'status' | 'organizationUnit') => {
    if (value) {
        filterData.value[type] = value
    } else if (type === 'organizationUnit') {
        filterData.value[type] = {
            id: '',
            name: t('document.main.filter_all_organization_units')
        }
    } else if (type === 'category') {
        filterData.value[type] = { id: '', name: t('document.main.filter_all_categories') }
    } else {
        filterData.value[type] = { id: '', name: '' }
    }
    currentPage.value = 1
}

const viewEditorContent = (entity: Document) => {
    const versions = entity.versions || []
    if (versions.length === 1) {
        const v = versions[0]
        if (v?.id) {
            router.push(`/plan/documents/${entity.id}/content?version=${v.id}`)
        } else {
            router.push(`/plan/documents/${entity.id}/content`)
        }
        return
    }
    const published = [...versions]
        .filter((v) => v.status === DocumentStatus.PUBLISHED)
        .sort((a, b) => b.versionNumber - a.versionNumber)[0]
    if (published?.id) {
        router.push(`/plan/documents/${entity.id}/content?version=${published.id}`)
    } else {
        toast.showToast(t('common.info'), t('document.main.toast_no_published_version'), 'info')
    }
}

const createChangeRequest = () => {
    router.push({
        path: '/plan/documents/change-requests/create',
        query: { returnTo: route.fullPath }
    })
}

const handleSort = (col: string, direction: 'asc' | 'desc' | null) => {
    // Map table column names to backend sort keys
    const columnMap: Record<string, string> = {
        Title: 'title',
        Code: 'documentCode'
    }
    const key = columnMap[col]
    if (!key) return
    sortBy.value = key
    sortDir.value = direction
    currentPage.value = 1
    fetchDocuments()
}

const downloadingId = ref<string | null>(null)

const handleDownload = (entity: Document) => {
    if (entity.contentType === ContentType.EDITOR) {
        downloadEditorPdf(entity)
    } else {
        downloadFileDocument(entity)
    }
}

const downloadFileDocument = async (entity: Document) => {
    const version = entity.versions?.find((v) => v.versionNumber === entity.currentVersion) || entity.versions?.[0]
    const file = version?.file
    if (!file) {
        await downloadEditorPdf(entity)
        return
    }
    downloadingId.value = entity.id
    try {
        const url = await apiGet<string>(`/files/${encodeURIComponent(file)}`, authStore)
        const link = document.createElement('a')
        link.href = url
        link.download = entity.title || file.split('/').pop() || 'document'
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    } catch (error: any) {
        console.error('Error downloading document:', error)
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), apiMsg || t('document.main.toast_failed_download'), 'error')
    } finally {
        downloadingId.value = null
    }
}

const downloadEditorPdf = async (entity: Document) => {
    downloadingId.value = entity.id
    try {
        const data = await apiGet<Document>(
            `/documents/${entity.id}?includeLatestPublishedContent=true`,
            authStore
        )
        let html = data.latestPublishedVersionContent
        const multiVersion = (data.versions?.length ?? 0) > 1
        if (!html && data.contentType === ContentType.EDITOR && data.versions?.length && !multiVersion) {
            const version =
                data.versions.find((v) => v.versionNumber === data.currentVersion) ||
                [...data.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0]
            if (version?.id) {
                const contentRes = await apiGet<{ content: string }>(
                    `/documents/${entity.id}/versions/${version.id}/content`,
                    authStore
                )
                html = contentRes.content
            }
        }
        if (!html) {
            toast.showToast(
                t('common.error'),
                multiVersion
                    ? t('document.main.toast_no_published_pdf')
                    : t('document.main.toast_no_content_document'),
                'error'
            )
            return
        }
        await generatePdfFromHtml(html, entity.title || 'document')
    } catch (error: any) {
        console.error('Error generating PDF:', error)
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), apiMsg || t('document.main.toast_failed_generate_pdf'), 'error')
    } finally {
        downloadingId.value = null
    }
}

const applyOrganizationUnitFromQuery = () => {
    const queryOrgUnitId = route.query.organizationUnit
    if (!queryOrgUnitId || !filterData.value.organizationUnits?.length) return
    const match = filterData.value.organizationUnits.find(
        (unit: { id?: string | number }) => String(unit.id) === String(queryOrgUnitId)
    )
    if (match) {
        filterData.value.organizationUnit = match
    }
}

watch(locale, () => {
    fetchFilterOptions()
    fetchDocuments()
})

onMounted(async () => {
    await fetchFilterOptions()
    fetchDocuments()
})
</script>
