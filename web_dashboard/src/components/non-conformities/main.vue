<template>
    <div :class="embedded ? '' : 'min-h-screen '">
        <BreadCrums v-if="!embedded" :crumbs="crumbs">
            <div class="flex items-center space-x-4">
                <div class="flex gap-4">
                    <Can
                        :subjects="[
                            'non_conformity_categories',
                            'non_conformity_types',
                            'non_conformity_risk_levels',
                            'non_conformity_representatives'
                        ]"
                        :actions="['read']"
                    >
                        <IconTooltipButton
                            buttonStyle="secondary"
                            class="flex items-center gap-2"
                            href="/act/non-conformities/settings"
                            test-id="nc-settings-button"    
                            :text="$t('nc.list.settings')"
                            icon-class="fa-solid fa-gear"
                        />
                    </Can>

                    <Can :subject="'non_conformities'" :actions="['create']">
                        <IconTooltipButton
                            buttonStyle="secondary"
                            class="flex items-center gap-2"
                            :href="addHref"
                            test-id="nc-add-button"
                            :text="$t('nc.list.createNew')"
                            icon-class="fa-solid fa-plus"
                        />
                    </Can>
                </div>
            </div>
        </BreadCrums>

        <main :id="embedded ? undefined : 'main-content'" :class="embedded ? '' : 'pt-6 sm:px-2 2xl:px-8'">
            <div id="search-filter" class="mb-6 ">
                <div class="flex gap-4">
                    <div class="flex-1">
                        <div class="relative">
                            <span>
                                <component
                                    :is="
                                        h('i', {
                                            class: 'fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400'
                                        })
                                    "
                                />
                            </span>
                            <AppInput
                                v-model="searchQuery"
                                @input="handleSearch"
                                type="text"
                                :placeholder="$t('nc.list.searchPlaceholder')"
                                class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                                test-id="search-nc-input"
                            />
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <span style="min-width: 150px">
                            <Select2
                                v-model="selectedStatus"
                                :values="statuses"
                                :display="(val?: any) => labelForStatusOption(val, t)"
                                :placeholder="$t('nc.list.selectStatus')"
                                test-id="search-nc-status-input"
                            />
                        </span>

                        <span style="min-width: 150px">
                            <Select2
                                v-model="selectedRiskLevel"
                                :values="riskLevels"
                                :display="displayRiskLevelFilter"
                                :placeholder="$t('nc.list.selectRiskLevel')"
                                test-id="search-nc-risk-level-input"
                            />
                        </span>

                        <span v-if="TEAMS_FEATURE_ENABLED" style="min-width: 150px">
                            <Select2
                                v-model="selectedOrgUnit"
                                :values="orgUnits"
                                :display="displayOrgUnitFilter"
                                :placeholder="$t('nc.list.selectOrgUnit')"
                                test-id="search-nc-org-unit-input"
                            />
                        </span>

                        <!-- <span v-if="sitesModuleEnabled" style="min-width: 150px">
                            <Select2
                                v-model="selectedSite"
                                :values="siteFilterOptions"
                                :display="displaySiteFilter"
                                :placeholder="$t('nc.list.selectSite')"
                                test-id="search-nc-site-input"
                            />
                        </span> -->

                        <span style="min-width: 150px">
                            <Select2
                                v-model="selectedType"
                                :values="ncTypes"
                                :display="displayTypeFilter"
                                :placeholder="$t('nc.list.selectType')"
                                test-id="search-nc-type-input"
                            />
                        </span>

                        <span style="min-width: 150px">
                            <Select2
                                v-model="selectedCategory"
                                :values="categories"
                                :display="displayCategoryFilter"
                                :placeholder="$t('nc.list.selectCategory')"
                                test-id="search-nc-category-input"
                            />
                        </span>
                        <template v-if="embedded">
                            <Can
                                :subjects="[
                                    'non_conformity_categories',
                                    'non_conformity_types',
                                    'non_conformity_risk_levels',
                                    'non_conformity_representatives'
                                ]"
                                :actions="['read']"
                            >
                                <IconTooltipButton
                                    buttonStyle="secondary"
                                    class="flex items-center gap-2"
                                    href="/act/non-conformities/settings"
                                    test-id="nc-settings-button"
                                    :text="$t('nc.list.settings')"
                                    icon-class="fa-solid fa-gear"
                                />
                            </Can>
                            <Can :subject="'non_conformities'" :actions="['create']">
                                <IconTooltipButton
                                    buttonStyle="secondary"
                                    class="flex items-center gap-2"
                                    :href="addHref"
                                    test-id="nc-add-button"
                                    :text="$t('nc.list.createNew')"
                                    icon-class="fa-solid fa-plus"
                                />
                            </Can>
                        </template>
                    </div>
                </div>
            </div>

            <Table
                test-id="nc-table"
                :skip-padding="true"
                :cols="tableCols"
                :rows="tableRows"
                :entities="nonConformities"
                :page="currentPage"
                :total="totalNonConformities"
                :perPage="perPage"
                :totalPages="totalPages"
                :sorted-columns="[$t('nc.list.tableDueDate')]"
                :loading="loading"
                :onNextPage="handleNextPage"
                :onPreviousPage="handlePreviousPage"
                :setPage="handleSetPage"
                :onSuccess="fetchNonConformities"
                :on-sort="handleSort"
                :entityName="$t('nc.list.entityName')"
                :subject="'non_conformities'"
                :handleDelete="handleDelete"
                :view-path="(row: any) => `/act/non-conformities/${row.id}`"
                :edit-path="(row: any) => `/act/non-conformities/${row.id}/edit`"
                :hideEdit="(entity: any) => entity.status === NCStatus.CLOSED || isNonConformityOverdue(entity)"
                :hideDelete="(entity: any) => isNonConformityOverdue(entity)"
            >
            </Table>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import BreadCrums from '../breadCrums.vue'
import AppInput from '../AppInput.vue'
import Select2 from '../Select2.vue'
import Table from '../Table.vue'
import Can from '../Can.vue'
import { apiGet, apiDelete, apiPost } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import {
    type StatusOption,
    type NonConformity,
    NCStatus,
    type NonConformityRiskLevel,
    type NonConformityType,
    NC_STATUS,
    labelForStatusOption
} from '@/util/interfaces'
import { formatDateToDay, formatApiErrorMessage, formatNcProblemStatement, ncDisplayStatus, isNonConformityOverdue } from '@/util/util'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useToast } from '@/stores/notification'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'
import { TEAMS_FEATURE_ENABLED } from '@/util/teams-feature'
import IconTooltipButton from '../IconTooltipButton.vue'

type SiteSummary = {
    id: string
    name: string
    code?: string | null
    status?: string
}

const getSiteOptions = async (_authStore?: unknown): Promise<SiteSummary[]> => []

withDefaults(
    defineProps<{
        embedded?: boolean
    }>(),
    {
        embedded: false
    }
)

const { t, locale } = useI18n()
const route = useRoute()

function displayRiskLevelFilter(val?: { id?: string; name?: string } | null): string {
    void locale.value
    if (!val) return ''
    if (val.id === '' || val.id === undefined) return t('nc.list.allRiskLevels')
    return val.name || ''
}

function displayOrgUnitFilter(val?: { id?: string; name?: string } | null): string {
    void locale.value
    if (!val) return ''
    if (val.id === '' || val.id === undefined) return val.name || t('nc.list.allOrgUnits')
    return val.name || ''
}

function displayTypeFilter(val?: { id?: string; name?: string } | null): string {
    void locale.value
    if (!val) return ''
    if (val.id === '' || val.id === undefined) return t('nc.list.allTypes')
    return val.name || ''
}

function displayCategoryFilter(val?: { id?: string; name?: string } | null): string {
    void locale.value
    if (!val) return ''
    if (val.id === '' || val.id === undefined) return t('nc.list.allCategories')
    return val.name || ''
}

function displaySiteFilter(val?: SiteSummary | { id?: string; name?: any } | null): string {
    void locale.value
    if (!val) return ''
    if (val.id === '' || val.id === undefined) return t('nc.list.allSites')
    const name = typeof val.name === 'string' ? val.name : ''
    return name || (val as SiteSummary).code || String(val.id)
}

function siteLabel(nc: NonConformity): string {
    if (!nc.site) return t('nc.list.siteNotProvided')
    return nc.site.name || nc.site.code || nc.site.id
}

function responsiblePersonLabel(nc: NonConformity): string {
    const u = nc.responsibleUser
    if (!u) return t('nc.list.responsibleNotProvided')
    const name = [u.fname, u.lname].filter(Boolean).join(' ').trim()
    return name || t('nc.list.responsibleNotProvided')
}

function translateNcStatus(nc: NonConformity): string {
    const display = ncDisplayStatus(nc)
    const opt = NC_STATUS.find((s) => s.id === display)
    return opt ? labelForStatusOption(opt, t) : display
}

const crumbs = computed(() => [
    {
        name: t('nc.breadcrumbs.nonConformities'),
        path: '/act/non-conformities',
        icon: 'fa-solid fa-exclamation-triangle'
    }
])

const addHref = '/act/non-conformities/add'

const authStore = useAuthStore()
const toast = useToast()
const dialogStore = useDialog()
const sitesModuleEnabled = computed(() =>
    authStore.hasPermissions({ subject: 'sites', actions: ['read'] })
)
const searchQuery = ref('')
const loading = ref(true)
const allNonConformities = ref<NonConformity[]>([])
const nonConformities = ref<NonConformity[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const totalNonConformities = ref(0)
const perPage = ref(10)
const sortBy = ref<string>('')
const sortDir = ref<'asc' | 'desc' | null>(null)
const ncTypes = ref<any[]>([])
const selectedType = ref<any>(null)
const searchTimeout = ref()

const statuses = ref<StatusOption[]>(NC_STATUS)
const selectedStatus = ref<StatusOption | null>(null)
const riskLevels = ref<any[]>([])
const selectedRiskLevel = ref<any>(null)
const orgUnits = ref<any[]>([])
const selectedOrgUnit = ref<any>(null)
const categories = ref<any[]>([])
const selectedCategory = ref<any>(null)
const siteFilterOptions = ref<any[]>([])
const selectedSite = ref<any>(null)

const tableCols = computed(() => {
    const cols = [
        t('nc.list.tableTitle'),
        t('nc.list.tableOrgUnit')
    ]
    if (sitesModuleEnabled.value) {
        cols.push(t('nc.list.tableSite'))
    }
    cols.push(
        t('nc.list.tableCreatedBy'),
        t('nc.list.tableResponsible'),
        t('nc.list.tableRiskLevel'),
        t('nc.list.tableType'),
        t('nc.list.tableCategory'),
        t('nc.list.tableProblemStatement'),
        t('nc.list.tableDueDate'),
        t('nc.list.tableStatus')
    )
    return cols
})

const tableRows = computed(() =>
    nonConformities.value.map((nc: NonConformity) => {
        const row: Record<string, any> = {
            id: nc.id,
            [t('nc.list.tableTitle')]: nc.name,
            [t('nc.list.tableOrgUnit')]: nc.organizationUnit?.name || (nc as { team?: { name?: string } }).team?.name || '',
            [t('nc.list.tableCreatedBy')]:
                (nc.createdBy?.fname || '') + ' ' + (nc.createdBy?.lname || ''),
            [t('nc.list.tableResponsible')]: responsiblePersonLabel(nc),
            [t('nc.list.tableRiskLevel')]: nc.nonConformityRiskLevel.name,
            [t('nc.list.tableType')]: nc.nonConformityType.name,
            [t('nc.list.tableCategory')]: nc.category?.name || 'N/A',
            [t('nc.list.tableProblemStatement')]: formatNcProblemStatement(nc, t),
            [t('nc.list.tableDueDate')]: formatDateToDay(nc.dueDate),
            [t('nc.list.tableStatus')]: translateNcStatus(nc)
        }
        if (sitesModuleEnabled.value) {
            row[t('nc.list.tableSite')] = siteLabel(nc)
        }
        return row
    })
)

const fetchFilters = async () => {
    try {
        ;[orgUnits.value, riskLevels.value, ncTypes.value, categories.value] = await Promise.all([
            apiPost<any>(
                'permissions/teams/user',
                {
                    subject: 'non_conformities'
                },
                authStore
            ),
            apiGet<NonConformityRiskLevel[]>('/non-conformities/risk-levels', authStore),
            apiGet<NonConformityType[]>('/non-conformities/types', authStore),
            apiGet<any[]>('/non-conformities/categories', authStore)
        ])

        orgUnits.value = [{ id: '' as any, name: t('nc.list.allOrgUnits') }, ...orgUnits.value]
        riskLevels.value = [{ id: '', name: t('nc.list.allRiskLevels') }, ...riskLevels.value]
        ncTypes.value = [{ id: '', name: t('nc.list.allTypes') }, ...ncTypes.value]
        categories.value = [{ id: '', name: t('nc.list.allCategories') }, ...categories.value]

        if (sitesModuleEnabled.value) {
            try {
                const sitesResponse = await getSiteOptions(authStore)
                siteFilterOptions.value = [
                    { id: '', name: t('nc.list.allSites') },
                    ...(sitesResponse || [])
                ]
            } catch (err) {
                console.error('Error fetching sites filter:', err)
                siteFilterOptions.value = [{ id: '', name: t('nc.list.allSites') }]
            }
        }

        const queryOrgUnitId = route.query.organizationUnitId
        if (queryOrgUnitId) {
            const match = orgUnits.value.find(
                (unit) => String(unit.id) === String(queryOrgUnitId)
            )
            if (match) {
                selectedOrgUnit.value = match
            }
        }
    } catch (err: unknown) {
        console.error('Error fetching trainers:', err)
    }
}
const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }

    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1
        fetchNonConformities()
    }, 300)
}

watch(
    [selectedType, selectedRiskLevel, selectedOrgUnit, selectedStatus, selectedCategory, selectedSite],
    async () => {
        currentPage.value = 1
        await fetchNonConformities()
    }
)

const handleDelete = async (item: any) => {
    dialogStore.openDialog(ConfirmDialog, {
        message: t('nc.list.deleteConfirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/non-conformities/${item.id}`, authStore)
                toast.showToast(t('common.success'), t('nc.list.deleteSuccess'), 'success')
                await fetchNonConformities()
            } catch (error: any) {
                console.error('Error deleting non-conformity:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) ||
                    t('nc.list.deleteError'),
                    'error'
                )
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

const fetchNonConformities = async () => {
    loading.value = true
    try {
        const sortParams =
            sortBy.value && sortDir.value
                ? `&sortBy=${encodeURIComponent(sortBy.value)}&sortDir=${encodeURIComponent(
                      sortDir.value
                  )}`
                : ''
        const response = await apiGet<NonConformity[]>(
            `non-conformities?search=${searchQuery.value || ''}&status=${
                selectedStatus.value?.id || ''
            }&nonConformityRiskLevelId=${selectedRiskLevel.value?.id || ''}&teamId=${
                selectedOrgUnit.value?.id || ''
            }&nonConformityTypeId=${selectedType.value?.id || ''}&categoryId=${
                selectedCategory.value?.id || ''
            }&siteId=${selectedSite.value?.id || ''}${sortParams}`,
            authStore
        )
        allNonConformities.value = response || []
        totalNonConformities.value = allNonConformities.value.length
        totalPages.value = Math.ceil(totalNonConformities.value / perPage.value)
        updateCurrentPageData()
    } catch (error: any) {
        console.error('Error fetching non-conformities:', error)
    } finally {
        loading.value = false
    }
}

const updateCurrentPageData = () => {
    const start = (currentPage.value - 1) * perPage.value
    const end = start + perPage.value
    nonConformities.value = allNonConformities.value.slice(start, end)
}

const handleNextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++
        updateCurrentPageData()
    }
}

const handlePreviousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
        updateCurrentPageData()
    }
}

const handleSetPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
        updateCurrentPageData()
    }
}

const handleSort = (col: string, direction: 'asc' | 'desc' | null) => {
    const columnMap: Record<string, string> = {
        [t('nc.list.tableDueDate')]: 'dueDate'
    }
    const key = columnMap[col]
    if (!key) return
    sortBy.value = key
    sortDir.value = direction
    currentPage.value = 1
    fetchNonConformities()
}

onMounted(async () => {
    await Promise.all([fetchFilters(), fetchNonConformities()])
})
</script>
