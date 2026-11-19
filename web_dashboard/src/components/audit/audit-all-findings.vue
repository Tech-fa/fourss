<template>
    <main id="main-content" class="p-6" test-id="all-findings-wrapper">
        <div class="bg-white rounded-lg border p-6">
            <div id="search-filter" class="mb-6" test-id="all-findings-search-filter">
                <div class="flex gap-4">
                    <div class="flex-1" test-id="all-findings-search-wrapper">
                        <div class="relative">
                            <span v-if="!searchLoading">
                                <component
                                    :is="h('i', {
                                        class: 'fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400'
                                    })"
                                />
                            </span>
                            <Spinner
                                v-if="searchLoading"
                                width="1"
                                class="absolute left-3 top-1/2 -translate-y-1/2"
                            />
                            <AppInput
                                v-model="searchQuery"
                                type="text"
                                @input="handleSearch"
                                :placeholder="t('audit.all_findings.search_placeholder')"
                                class="w-full px-4 py-2 pl-10 border border-neutral-200 rounded-md"
                                test-id="all-findings-search-input"
                            />
                        </div>
                    </div>
                    <span style="min-width: 150px" test-id="all-findings-classification-filter">
                        <Select2
                            v-model="selectedClassification"
                            :values="classifications"
                            :display="classificationOptionLabel"
                            :placeholder="t('audit.all_findings.filter_classification')"
                            test-id="all-findings-classification-select"
                        />
                    </span>
                    <span style="min-width: 150px" test-id="all-findings-raised-nc-filter">
                        <Select2
                            v-model="selectedRaisedNC"
                            :values="raisedNCs"
                            :display="(item: any) => item?.name || ''"
                            :placeholder="t('audit.all_findings.filter_raised_nc')"
                            test-id="all-findings-raised-nc-select"
                        />
                    </span>
                    <span style="min-width: 150px" test-id="all-findings-team-member-filter">
                        <Select2
                            v-model="selectedTeamMember"
                            :values="listTeamMembers"
                            :display="(item: any) => item?.name || ''"
                            :placeholder="t('audit.all_findings.filter_team_member')"
                            test-id="all-findings-team-member-select"
                        />
                    </span>
                    <div class="flex gap-2" test-id="all-findings-actions">
                        <Can subject="audit_findings" :actions="['create']">
                            <AppButton
                                v-if="!isReadOnly"
                                buttonStyle="primary"
                                class="flex items-center gap-2"
                                @click="handleAddFinding"
                                test-id="all-findings-add-button"
                            >
                                <i class="fa-solid fa-plus"></i>
                                {{ t('audit.all_findings.add_finding') }}
                            </AppButton>
                        </Can>
                    </div>
                </div>
                <div
                    v-if="isReadOnly"
                    class="mt-4 rounded-md border border-yellow-200 bg-yellow-50 text-yellow-800 p-3 text-sm"
                >
                    {{ t('audit.all_findings.read_only', { status: formattedInstanceStatus }) }}
                </div>
            </div>
            <div test-id="all-findings-table-wrapper">
                <Table
                    :cols="findingsTableCols"
                    :column-labels="findingsColumnLabels"
                    :rows="findingRows"
                    :entities="auditFindingsEntities"
                    :total-pages="totalPages"
                    :page="currentPage"
                    :total="totalFindings"
                    :per-page="perPage"
                    :on-next-page="handleNextPage"
                    :on-previous-page="handlePreviousPage"
                    :set-page="handleSetPage"
                    :loading="isLoading"
                    :on-success="fetchAuditFindings"
                    :entity-name="t('audit.all_findings.entity_finding')"
                    subject="audit_findings"
                    :hide-view="() => !isReadOnly"
                    :view-path="(finding) => `/check/audits/${props.programId}/${props.auditInstanceId}/general/${finding.id}/edit`"
                    :edit-path="(finding) => `/check/audits/${props.programId}/${props.auditInstanceId}/general/${finding.id}/edit`"
                    :hide-edit="() => isReadOnly"
                    :handleDelete="handleDelete"
                    test-id="all-findings-table"
                />
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, h, markRaw, onMounted, watch, computed, defineComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import Select2 from '../Select2.vue'
import Spinner from '../Spinner.vue'
import AppInput from '../AppInput.vue'
import Table from '../Table.vue'
import { apiGet, apiDelete } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { snakeToCamelCase, formatApiErrorMessage } from '@/util/util'
import { RouterLink, useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useDialog } from '@/stores/dialog'
import { useToast } from '@/stores/notification'
import { AUDIT_FINDING_CLASSIFICATION_OPTIONS, type AuditFindingResponseDTO, type StatusOption } from '@/util/interfaces'


const { t, locale } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const router = useRouter()
const searchLoading = ref(false)
const searchQuery = ref('')
const searchTimeout = ref()
const selectedClassification = ref<any>(null)
const selectedRaisedNC = ref<any>(null)
const classifications = ref<StatusOption[]>(AUDIT_FINDING_CLASSIFICATION_OPTIONS)
const raisedNCs = computed(() => [
    { id: '', name: t('audit.all_findings.filter_all_raised_nc') },
    { id: 'true', name: t('common.yes') },
    { id: 'false', name: t('common.no') }
])
const listTeamMembers = ref<any[]>([])
const selectedTeamMember = ref<any>(null)
const isLoading = ref(false)
const allAuditFindingsEntities = ref<any[]>([])
const auditFindingsEntities = ref<any[]>([])
const dialogStore = useDialog()

const props = defineProps<{
    auditInstanceId: string
    programId: string
    teamMembers: any[]
    instanceStatus?: string
}>()

const currentPage = ref(1)
const perPage = ref(5)
const totalPages = ref(1)
const totalFindings = ref(0)

watch(
    () => [props.teamMembers, locale.value] as const,
    ([newVal]) => {
        listTeamMembers.value = [
            { id: '', name: t('audit.all_findings.filter_all_team_members') },
            ...newVal.map((member: any) => ({
                id: member.id,
                name: `${member.auditPersonnel.fname} ${member.auditPersonnel.lname}`
            }))
        ]
    },
    { immediate: true }
)

watch([selectedClassification,selectedRaisedNC,selectedTeamMember],async () => {
    currentPage.value = 1
    await fetchAuditFindings()
})


const fetchAuditFindings = async () => {
    if (!props.auditInstanceId) return

    isLoading.value = true
    try{
        const searchParam = searchQuery.value ? `&search=${searchQuery.value}` : ''
        const classificationParam = selectedClassification.value?.id ? `&classification=${selectedClassification.value.id}` : ''
        const raisedNcParam = selectedRaisedNC.value?.id ? `&raisedNc=${selectedRaisedNC.value.id}` : ''
        const teamMemberParam = selectedTeamMember.value?.id ? `&teamMemberId=${selectedTeamMember.value.id}` : ''
        
        const response = await apiGet<AuditFindingResponseDTO[]>(
            `/audits/findings?auditInstanceId=${props.auditInstanceId}${searchParam}${classificationParam}${raisedNcParam}${teamMemberParam}`,
            authStore
        ) 

        allAuditFindingsEntities.value = response
        totalFindings.value = response.length
        totalPages.value = Math.ceil(totalFindings.value / perPage.value)
        updateCurrentPageData()
    } catch (error) {
        console.error('Error fetching audit findings:', error)
    } finally {
        isLoading.value = false
    }
}

const isReadOnly = computed(() => {
    const status = props.instanceStatus
    return status === 'ON_HOLD' || status === 'COMPLETED' || status === 'CANCELLED'
})

const formattedInstanceStatus = computed(() => {
    const status = props.instanceStatus || ''
    if (!status) return ''
    const key = `audit.main.status.${status}`
    const translated = t(key)
    return translated === key ? snakeToCamelCase(status) : translated
})

const classificationOptionLabel = (item: StatusOption | any) => {
    if (!item) return ''
    if (item.id === '') return t('audit.finding_classification.all')
    const key = `audit.finding_classification.${item.id}`
    const translated = t(key)
    return translated === key ? item.name ?? '' : translated
}

const classificationFieldLabel = (classification: string | undefined | null) => {
    if (!classification) return ''
    const key = `audit.finding_classification.${classification}`
    const translated = t(key)
    return translated === key ? snakeToCamelCase(classification) : translated
}

const findingsTableCols = ['title', 'question', 'classification', 'nc_raised', 'evidence_count', 'recorded_by']

const findingsColumnLabels = computed(() => ({
    title: t('audit.all_findings.col_title'),
    question: t('audit.all_findings.col_question'),
    classification: t('audit.all_findings.col_classification'),
    nc_raised: t('audit.all_findings.col_nc_raised'),
    evidence_count: t('audit.all_findings.col_evidence_count'),
    recorded_by: t('audit.all_findings.col_recorded_by')
}))

const findingRows = computed(() =>
    auditFindingsEntities.value.map((finding: any) => ({
        id: finding.id,
        title: finding.title,
        question: finding.questionText || t('audit.all_findings.question_general'),
        classification: classificationFieldLabel(finding.classification),
        nc_raised: finding.nonConformity?.id
            ? markRaw(
                  defineComponent({
                      name: 'LinkedNonConformity',
                      setup() {
                          const label =
                              finding.nonConformity?.name || t('audit.reports_tab.view_nc')
                          const auditId = finding.nonConformity?.auditId
                          return () =>
                              h('div', { class: 'flex flex-col' }, [
                                  h(
                                      RouterLink,
                                      {
                                          to: {
                                              path: `/act/non-conformities/${finding.nonConformity?.id}`,
                                              query: {
                                                  instanceId: String(props.auditInstanceId),
                                                  programId: String(props.programId)
                                              }
                                          },
                                          class: 'text-primary-700 hover:underline'
                                      },
                                      () => label
                                  ),
                                  auditId
                                      ? h(
                                            'span',
                                            { class: 'text-xs text-neutral-500' },
                                            auditId
                                        )
                                      : null
                              ])
                      }
                  })
              )
            : finding.raisedNc
              ? t('common.yes')
              : t('common.no'),
        evidence_count: finding.numberOfEvidences,
        recorded_by: finding.auditTeamMember
            ? `${finding.auditTeamMember.fname || ''} ${finding.auditTeamMember.lname || ''}`.trim() ||
              t('audit.instance_page.na')
            : t('audit.instance_page.na')
    }))
)

const updateCurrentPageData = () => {
    const start = (currentPage.value - 1) * perPage.value
    const end = start + perPage.value
    auditFindingsEntities.value = allAuditFindingsEntities.value.slice(start, end)
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

const handleSearch = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value)
    }
    searchTimeout.value = setTimeout(() => {
        currentPage.value = 1;
        fetchAuditFindings()
    }, 300)
}

const handleAddFinding = () => {
    if (isReadOnly.value) {
        toast.showToast(t('common.error'), t('audit.all_findings.toast_readonly_add'), 'error')
        return
    }
    router.push(`/check/audits/${props.programId}/${props.auditInstanceId}/general/add`)
}

const handleDelete = async (item: any) => {
    if (!item?.id) return
    if (isReadOnly.value) {
        toast.showToast(t('common.error'), t('audit.all_findings.toast_readonly_delete'), 'error')
        return
    }
    
    dialogStore.openDialog(ConfirmDialog, {
        message: t('audit.all_findings.delete_confirm'),
        onConfirm: async () => {
            try {
                await apiDelete(`/audits/findings/${item.id}`, authStore)
                toast.showToast(t('common.success'), t('audit.all_findings.toast_deleted'), 'success')
                await fetchAuditFindings()
            } catch (error: any) {
                console.error('Error deleting audit finding:', error)
                toast.showToast(
                    t('common.error'),
                    formatApiErrorMessage(error.response?.data, t, 'errors.audit') || t('audit.all_findings.toast_delete_failed'),
                    'error'
                )
            } finally {
                dialogStore.closeDialog()
            }
        },
        onCancel: dialogStore.closeDialog
    })
}

onMounted(() => {
    fetchAuditFindings()
})
</script>