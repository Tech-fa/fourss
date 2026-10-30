<template>
    <Breadcrumb :crumbs="breadcrumbCrumbs">
        <div class="flex items-center space-x-4">
            <div class="flex gap-4">
                <Can subject="change_requests" :actions="['create']">
                    <AppButton
                        buttonStyle="primary"
                        class="flex items-center gap-2"
                        @click="openCreateDialog"
                        test-id="create-change-request-button"
                    >
                        <i class="fa-solid fa-plus"></i>
                        {{ t('document.change_requests.create_button') }}
                    </AppButton>
                </Can>
            </div>
        </div>
    </Breadcrumb>

    <!-- Main Content -->
    <main id="main-content" class="p-6">
        <!-- Document Info -->
        <div v-if="documentTitle" class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 class="text-lg font-semibold text-blue-900 mb-2">
                {{ t('document.change_requests.heading_for_document') }}
            </h2>
            <p class="text-blue-700">{{ documentTitle }}</p>
        </div>

        <!-- Search and Filter -->
        <div id="search-filter" class="mb-6 px-1 sm:px-6 lg:px-8">
            <div class="flex gap-4">
                <div class="flex-1">
                    <div class="relative">
                        <AppInput
                            v-model="searchQuery"
                            @input="handleSearch"
                            type="text"
                            :placeholder="t('document.change_requests.search_placeholder')"
                            class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                            test-id="change-request-search"
                        />
                        <i class="fa-solid fa-search absolute left-3 top-3 text-neutral-400"></i>
                    </div>
                </div>
                <div class="flex gap-2">
                    <span style="min-width: 200px">
                        <Select2
                            v-model="filterData.status"
                            :values="filterData.statuses || []"
                            :display="displayFilterStatusOption"
                            :placeholder="t('document.change_requests.filter_all_statuses')"
                            @update:modelValue="(val) => handleFilterChange(val, 'status')"
                            test-id="status-filter"
                        />
                    </span>
                </div>
            </div>
        </div>

        <!-- Change Request List -->
        <Table
            :cols="columns"
            :rows="rows"
            :entities="changeRequests.data"
            :total-pages="totalPages"
            :page="currentPage"
            :total="totalChangeRequests"
            :per-page="perPage"
            :on-next-page="handleNextPage"
            :on-previous-page="handlePreviousPage"
            :set-page="setPage"
            :entity-name="t('document.change_requests.entity_name')"
            :on-success="handleSuccess"
            :loading="loading"
            subject="change_requests"
            :hide-edit="() => true"
            :hide-view="() => true"
            :map-status-style="mapChangeRequestStatusStyle"
        >
            <template #extra-field="{ entity }">
                <Can subject="change_requests" :actions="['read']">
                    <AppButton
                        type="button"
                        button-style="neutral"
                        @click="viewChangeRequest(entity)"
                        test-id="view-change-request-details-button"
                    >
                        <i class="fa-solid fa-eye"></i>
                    </AppButton>
                </Can>
            </template>
        </Table>
    </main>

    <!-- Dialogs are handled by the dialog store -->
</template>

<script setup lang="ts">
import { ChangeRequestStatus, type ChangeRequest, type PaginatedResponse } from '@/util/interfaces'
import AppButton from '../AppButton.vue'
import Table from '../Table.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DateTime } from 'luxon'
import { useAuthStore } from '@/stores/auth'
import { apiGet } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'
import Breadcrumb from '../breadCrums.vue'
import Select2 from '../Select2.vue'
import { useToast } from '@/stores/notification'
import AppInput from '../AppInput.vue'
import Can from '../Can.vue'
import { useRoute, useRouter } from 'vue-router'

const { t, locale } = useI18n()
const authStore = useAuthStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const breadcrumbCrumbs = computed(() => [
    {
        name: t('nav.documents'),
        path: '/plan/documents',
        icon: 'fa-solid fa-file-alt'
    },
    {
        name: t('document.change_requests.breadcrumb'),
        path: '',
        icon: 'fa-solid fa-file-circle-plus'
    }
])

const columns = computed(() => [
    t('document.change_requests.col_status'),
    t('document.change_requests.col_title'),
    t('document.change_requests.col_requested_by'),
    t('document.change_requests.col_reason'),
    t('document.change_requests.col_reviewed_by'),
    t('document.change_requests.col_review_comment'),
    t('document.change_requests.col_created_date'),
    t('document.change_requests.col_reviewed_date')
])

const changeRequests = ref<PaginatedResponse<ChangeRequest>>({
    data: [],
    currentPage: 1,
    totalCount: 0,
    perPage: 10
})
const rows = ref<{ [key: string]: unknown }[]>([])

const currentPage = ref(1)
const totalPages = ref(1)
const totalChangeRequests = ref(1)
const perPage = ref(10)
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const searchTimeout = ref<ReturnType<typeof setTimeout>>()
const filterData = ref<{
    statuses?: { id: string; name: string }[]
    status: { id: string; name: string }
}>({ status: { id: '', name: '' } })

const displayFilterStatusOption = (val: { name?: string } | undefined | null) => val?.name ?? ''

const documentTitle = ref<string>('')

const changeRequestStatusLabel = (status: string) => {
    switch (status) {
        case ChangeRequestStatus.ACTIVE:
        case 'active':
            return t('document.change_requests.status_active')
        case ChangeRequestStatus.ACCEPTED:
        case 'accepted':
            return t('document.change_requests.status_accepted')
        case ChangeRequestStatus.REJECTED:
        case 'rejected':
            return t('document.change_requests.status_rejected')
        default:
            return status
    }
}

const formatListDate = (ts: number) =>
    DateTime.fromMillis(+ts).setZone('utc').setLocale(locale.value).toFormat('dd MMM yyyy, HH:mm')

const mapRows = (list: ChangeRequest[]) => {
    const k = {
        status: t('document.change_requests.col_status'),
        title: t('document.change_requests.col_title'),
        requestedBy: t('document.change_requests.col_requested_by'),
        reason: t('document.change_requests.col_reason'),
        reviewedBy: t('document.change_requests.col_reviewed_by'),
        reviewComment: t('document.change_requests.col_review_comment'),
        createdDate: t('document.change_requests.col_created_date'),
        reviewedDate: t('document.change_requests.col_reviewed_date')
    }
    return list.map((cr) => ({
        id: cr.id,
        [k.status]: changeRequestStatusLabel(cr.status),
        [k.title]: cr.title || t('document.change_requests.no_title'),
        [k.requestedBy]: `${cr.requestedBy.fname} ${cr.requestedBy.lname}`,
        [k.reason]: cr.reason || t('document.change_requests.no_reason'),
        [k.reviewedBy]: cr.reviewedBy
            ? `${cr.reviewedBy.fname} ${cr.reviewedBy.lname}`
            : t('document.change_requests.not_reviewed'),
        [k.reviewComment]: cr.reviewComment || t('document.change_requests.no_comment'),
        [k.createdDate]: formatListDate(cr.createdAt),
        [k.reviewedDate]: cr.reviewedAt
            ? formatListDate(cr.reviewedAt)
            : t('document.change_requests.not_reviewed')
    }))
}

const mapChangeRequestStatusStyle = (status: string) => {
    const active = t('document.change_requests.status_active')
    const accepted = t('document.change_requests.status_accepted')
    const rejected = t('document.change_requests.status_rejected')
    if (
        status === active ||
        status === 'Active' ||
        status === ChangeRequestStatus.ACTIVE ||
        status === 'active'
    ) {
        return 'bg-yellow-100 text-yellow-800'
    }
    if (
        status === accepted ||
        status === 'Accepted' ||
        status === ChangeRequestStatus.ACCEPTED ||
        status === 'accepted'
    ) {
        return 'bg-green-100 text-green-800'
    }
    if (
        status === rejected ||
        status === 'Rejected' ||
        status === ChangeRequestStatus.REJECTED ||
        status === 'rejected'
    ) {
        return 'bg-red-100 text-red-800'
    }
    return ''
}

const rebuildFilterOptions = () => {
    const allLabel = t('document.change_requests.filter_all_statuses')
    const statuses = [
        { id: '', name: allLabel },
        { id: ChangeRequestStatus.ACTIVE, name: t('document.change_requests.status_active') },
        { id: ChangeRequestStatus.ACCEPTED, name: t('document.change_requests.status_accepted') },
        { id: ChangeRequestStatus.REJECTED, name: t('document.change_requests.status_rejected') }
    ]
    const prevId = filterData.value.status?.id ?? ''
    const matched = statuses.find((s) => s.id === prevId)
    filterData.value = {
        statuses,
        status: matched || statuses[0]
    }
}

watch([filterData, currentPage], () => fetchChangeRequests(), { deep: true })

const fetchChangeRequests = async () => {
    loading.value = true
    error.value = null
    try {
        const searchParam = searchQuery.value ? `&search=${searchQuery.value}` : ''
        const statusParam = filterData.value.status?.id ? `&status=${filterData.value.status.id}` : ''

        const response = await apiGet<PaginatedResponse<ChangeRequest>>(
            `/documents/change-requests?perPage=${perPage.value}&page=${currentPage.value}${searchParam}${statusParam}`,
            authStore
        )
        rows.value = mapRows(response.data)
        changeRequests.value = response
        totalPages.value = Math.ceil(response.totalCount / perPage.value)
        totalChangeRequests.value = response.totalCount
    } catch (err: any) {
        console.error(err)
        if (authStore.state.isLoggedIn) {
            const raw = formatApiErrorMessage(err.response?.data, t, 'errors.document')
            toast.showToast(
                t('common.error'),
                raw || t('document.change_requests.toast_fetch_list_failed'),
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
        rebuildFilterOptions()
    } catch {
        toast.showToast(
            t('common.error'),
            t('document.change_requests.toast_fetch_filters_failed'),
            'error'
        )
    } finally {
        loading.value = false
    }
}

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }

    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1
        fetchChangeRequests()
    }, 300)
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
    fetchChangeRequests()
}

const handleFilterChange = (value: { id: string; name: string } | undefined, type: 'status') => {
    const allLabel = t('document.change_requests.filter_all_statuses')
    filterData.value[type] = value || { id: '', name: allLabel }
    currentPage.value = 1
}

const openCreateDialog = () => {
    router.push({
        path: '/plan/documents/change-requests/create',
        query: { returnTo: route.fullPath }
    })
}

const viewChangeRequest = (changeRequest: ChangeRequest) => {
    router.push({
        path: `/plan/documents/change-requests/${changeRequest.id}`,
        query: { returnTo: route.fullPath }
    })
}

watch(locale, () => {
    rebuildFilterOptions()
    if (changeRequests.value.data?.length) {
        rows.value = mapRows(changeRequests.value.data)
    }
})

onMounted(() => {
    fetchFilterOptions()
    fetchChangeRequests()
})
</script>
