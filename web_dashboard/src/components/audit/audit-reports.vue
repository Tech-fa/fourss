<template>
    <section id="tab-reports-ncs-content" class="mb-10" test-id="reports-ncs-wrapper">
        <div class="mb-10" test-id="audit-summary-section">
            <button
                class="text-base mb-2 flex items-center gap-2 select-none"
                @click="isSummaryCollapsed = !isSummaryCollapsed"
                :aria-expanded="!isSummaryCollapsed"
                type="button"
                test-id="audit-summary-header"
            >
                <i class="fa-regular fa-note-sticky text-neutral-500"></i>
                <span test-id="audit-summary-title">{{ t('audit.reports_tab.summary_section_title') }}</span>
                <i
                    class="fa-solid fa-chevron-down ml-1 transition-transform duration-200"
                    :class="{ 'rotate-180': !isSummaryCollapsed }"
                ></i>
            </button>
            <div v-if="props.auditInstanceId" class="bg-white border border-neutral-200 rounded-lg p-4" v-show="!isSummaryCollapsed" test-id="audit-summary-content">
                <div class="space-y-2" test-id="audit-summary-field">
                    <label class="block text-sm" test-id="audit-summary-label">{{ t('audit.reports_tab.summary_label') }}</label>
                    <AppTextarea
                        :model="auditSummary"
                        @update:model="auditSummary = $event"
                        :placeholder="t('audit.reports_tab.summary_placeholder')"
                        rows="4"
                        test-id="audit-summary-textarea"
                    />
                </div>
                <div class="flex justify-end gap-3 mt-4" test-id="audit-summary-actions">
                    <AppButton
                        :warn-before="t('audit.reports_tab.summary_save_warn')"
                        button-style="primary"
                        @click="saveAuditSummary"
                        :loading="isSavingSummary"
                        :disabled="!props.auditInstanceId || !isSummaryDirty || isSavingSummary"
                        test-id="audit-summary-save-button"
                    >
                        {{ t('audit.reports_tab.save_summary') }}
                    </AppButton>
                </div>
            </div>
            <div v-else class="bg-neutral-100 rounded px-4 py-6 text-center">
                <Spinner />
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div test-id="associated-reports-section">
                <div class="flex items-center justify-between mb-6 min-h-[2.5rem]">
                    <div class="text-base flex items-center gap-2" test-id="associated-reports-title">
                        <i class="fa-regular fa-file-lines text-neutral-500"></i>
                        {{ t('audit.reports_tab.associated_title') }}
                    </div>
                    <div class="flex items-center gap-4" test-id="associated-reports-actions">
                        <Can subject="audit_instances" :actions="['generate_report']">
                            <AppButton button-style="secondary" @click="goToAuditReport" test-id="generate-audit-report-button">
                                <span class="flex items-center gap-2">
                                    <i class="fa-solid fa-file-lines"></i>
                                    {{ t('audit.reports_tab.generate_report') }}
                                </span>
                            </AppButton>
                        </Can>
                        <Can subject="audit_instances" :actions="['create']">
                            <AppButton button-style="secondary" @click="openUploadReportDialog" test-id="upload-existing-report-button">
                                <span class="flex items-center gap-2">
                                    <i class="fa-solid fa-upload"></i>
                                    {{ t('audit.reports_tab.upload_report') }}
                                </span>
                            </AppButton>
                        </Can>
                    </div>
                </div>

                <!-- Loading State -->
                <div v-if="isLoading" class="bg-neutral-100 rounded px-4 py-6 text-center">
                    <Spinner />
                </div>

                <!-- Empty State -->
                <div
                    v-else-if="reports.length === 0"
                    class="bg-neutral-100 rounded px-4 py-6 text-center"
                    test-id="reports-empty-state"
                >
                    <i class="fa-regular fa-file-lines text-neutral-400 text-2xl mb-2"></i>
                    <div class="text-sm text-neutral-600">
                        {{ t('audit.reports_tab.reports_empty') }}
                    </div>
                    <div class="text-xs text-neutral-500 mt-1">
                        {{ t('audit.reports_tab.reports_empty_hint') }}
                    </div>
                </div>

                <!-- Reports List -->
                <div v-else class="rounded px-4 py-3">
                    <div
                        v-for="(report, index) in reports"
                        :key="report.id"
                        :class="[
                            'flex items-center justify-between bg-neutral-100 p-3',
                            {
                                'mb-3': index < reports.length - 1,
                                'mb-1': index === reports.length - 1
                            }
                        ]"
                    >
                        <div>
                            <div class="text-neutral-900">{{ report.title }}</div>
                            <div class="text-xs text-neutral-500">
                                {{ formatReportSubtitle(report) }}
                            </div>
                        </div>
                        <div class="flex gap-2 items-center">
                            <button
                                @click="openReportDetailsDialog(report)"
                                class="text-neutral-500 hover:text-neutral-700 transition"
                                :title="t('audit.reports_tab.view_report_details')"
                                :test-id="`view-report-${report.id}`"
                            >
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <DownloadButton :filePath="report.filePath" />
                        </div>
                    </div>
                    <div class="text-xs text-neutral-400 mt-3">
                        {{ t('audit.reports_tab.reports_footer', { n: reports.length }) }}
                    </div>
                </div>
            </div>
            <div test-id="ncs-section">
                <div class="flex items-center justify-between mb-6 min-h-[2.5rem]">
                    <div class="text-base flex items-center gap-2" test-id="ncs-title">
                        <i class="fa-solid fa-ban text-neutral-500"></i>
                        {{ t('audit.reports_tab.ncs_title') }}
                    </div>
                    <div class="flex items-center gap-4" test-id="ncs-actions">
                        <!-- Placeholder for potential future actions -->
                    </div>
                </div>

                <!-- Loading State -->
                <div v-if="isNCLoading" class="bg-neutral-100 rounded px-4 py-6 text-center">
                    <Spinner />
                </div>

                <!-- Empty State -->
                <div
                    v-else-if="ncFindings.length === 0"
                    class="bg-neutral-100 rounded px-4 py-6 text-center"
                    test-id="ncs-empty-state"
                >
                    <i class="fa-solid fa-ban text-neutral-400 text-2xl mb-2"></i>
                    <div class="text-sm text-neutral-600">
                        {{ t('audit.reports_tab.ncs_empty') }}
                    </div>
                    <div class="text-xs text-neutral-500 mt-1">
                        {{ t('audit.reports_tab.ncs_empty_hint') }}
                    </div>
                </div>

                <!-- NCs List -->
                <div v-else class="rounded px-4 py-3">
                    <div
                        v-for="(finding, index) in ncFindings"
                        :key="finding.id"
                        :class="[
                            'flex items-center justify-between bg-neutral-100 p-3',
                            {
                                'mb-3': index < ncFindings.length - 1,
                                'mb-1': index === ncFindings.length - 1
                            }
                        ]"
                    >
                        <div>
                            <div class="text-neutral-900">
                                {{ finding.title }}
                                <span
                                    v-if="finding.nonConformity?.name"
                                    class="text-neutral-600 font-medium"
                                >
                                    ({{ finding.nonConformity.name }})
                                </span>
                            </div>
                            <div class="text-xs text-neutral-500">
                                {{ t('audit.reports_tab.severity_label') }}:
                                {{ severityLabel(finding.severity) }}
                            </div>
                            <div
                                v-if="finding.nonConformity?.auditId"
                                class="text-xs text-neutral-500"
                                test-id="nc-linked-audit-id"
                            >
                                {{ t('nc.details.auditId') }}: {{ finding.nonConformity.auditId }}
                            </div>
                        </div>
                        <button
                            class="inline-flex items-center gap-1 text-sm px-3 py-1 rounded border border-neutral-300 text-neutral-900 hover:bg-neutral-200 transition"
                            @click="handleViewNC(finding)"
                        >
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            {{ t('audit.reports_tab.view_nc') }}
                        </button>
                    </div>
                    <div class="text-xs text-neutral-400 mt-3">
                        {{
                            ncFindings.length === 1
                                ? t('audit.reports_tab.ncs_footer_one')
                                : t('audit.reports_tab.ncs_footer_other', { n: ncFindings.length })
                        }}
                        <span
                            class="underline hover:text-neutral-800 text-neutral-700 cursor-pointer"
                            @click="goToNCModule"
                            >{{ t('audit.reports_tab.go_to_nc_module') }}</span
                        >
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDialog } from '@/stores/dialog'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiGet, apiPut } from '@/util/api'
import AuditUploadReport from './audit-upload-report.vue'
import AuditReportDetails from './audit-report-details.vue'
import type { AuditReport, AuditFindingResponseDTO, AuditFindingDetailResponseDTO } from '@/util/interfaces'
import Spinner from '../Spinner.vue'
import DownloadButton from '../download-button.vue'
import { formatDateToDay, snakeToCamelCase, formatApiErrorMessage } from '@/util/util'
import Can from '../Can.vue'
import AppButton from '../AppButton.vue'
import { useRoute, useRouter } from 'vue-router'
import AppTextarea from '../AppTextarea.vue'

const props = defineProps<{
    auditInstanceId?: string
    auditProgramId?: string
    initialAuditSummary?: string
}>()

const { t } = useI18n()

const severityLabel = (severity: string | undefined | null) => {
    if (!severity) return t('audit.instance_page.na')
    const key = `audit.finding_severity.${severity}`
    const translated = t(key)
    return translated === key ? snakeToCamelCase(severity) : translated
}

const dialog = useDialog()
const authStore = useAuthStore()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const reports = ref<AuditReport[]>([])
const isLoading = ref(true)
const ncFindings = ref<AuditFindingResponseDTO[]>([])
const isNCLoading = ref(true)
const auditSummary = ref<string>('')
const isSavingSummary = ref(false)
const isSummaryCollapsed = ref(false)
const originalAuditSummary = ref<string>('')
const isSummaryDirty = computed(() => auditSummary.value.trim() !== originalAuditSummary.value.trim())

const fetchReports = async () => {
    if (!props.auditInstanceId) return

    try {
        isLoading.value = true
        const response = await apiGet<AuditReport[]>(
            `/audits/instances/${props.auditInstanceId}/reports`,
            authStore
        )
        reports.value = response
    } catch (error: any) {
        console.error('Error fetching audit reports:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.reports_tab.toast_fetch_reports_failed'),
            'error'
        )
    } finally {
        isLoading.value = false
    }
}

const formatReportSubtitle = (report: AuditReport): string => {
    const actionText =
        report.type === 'GENERATED'
            ? t('audit.reports_tab.type_generated')
            : t('audit.reports_tab.type_uploaded')
    const date = formatDateToDay(report.createdAt)
    const createdBy = `${report.createdBy.fname} ${report.createdBy.lname}`
    return t('audit.reports_tab.report_subtitle', {
        action: actionText,
        date,
        user: createdBy
    })
}

const fetchNCs = async () => {
    if (!props.auditInstanceId) return
    try {
        isNCLoading.value = true
        const response = await apiGet<AuditFindingResponseDTO[]>(
            `/audits/findings?auditInstanceId=${props.auditInstanceId}&raisedNc=true`,
            authStore
        )
        ncFindings.value = response
    } catch (error: any) {
        console.error('Error fetching NC findings:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.reports_tab.toast_fetch_nc_failed'),
            'error'
        )
    } finally {
        isNCLoading.value = false
    }
}

const handleViewNC = async (finding: AuditFindingResponseDTO) => {
    try {
        const details = await apiGet<AuditFindingDetailResponseDTO>(
            `/audits/findings/${finding.id}?instanceId=${props.auditInstanceId}`,
            authStore
        )
        const linkedId = details.linkedNcId
        if (linkedId) {
            router.push({
                path: `/act/non-conformities/${linkedId}`,
                query: {
                    instanceId: props.auditInstanceId,
                    programId: props.auditProgramId
                }
            })
        } else {
            toast.showToast(t('common.info'), t('audit.reports_tab.toast_no_linked_nc'), 'info')
        }
    } catch (error: any) {
        console.error('Error opening NC:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.reports_tab.toast_open_nc_failed'),
            'error'
        )
    }
}

const goToNCModule = () => {
    router.push('/act/non-conformities')
}

const openUploadReportDialog = () => {
    dialog.openDialog(AuditUploadReport, {
        auditInstanceId: props.auditInstanceId,
        onCancel: () => {
            dialog.closeDialog()
        },
        onSuccess: () => {
            dialog.closeDialog()
            fetchReports() // Refresh the reports list
            toast.showToast(t('common.success'), t('audit.reports_tab.toast_upload_success'), 'success')
        }
    })
}

const openReportDetailsDialog = (report: AuditReport) => {
    dialog.openDialog(AuditReportDetails, {
        report: report,
        onClose: () => {
            dialog.closeDialog()
        }
    })
}

const goToAuditReport = () => {
    if (!props.auditProgramId || !props.auditInstanceId) return

    router.push({
        path: `/check/audits/${props.auditProgramId}/instances/${props.auditInstanceId}/report`,
        query: {
            source: route.query.source
        }
    })
}

const saveAuditSummary = async () => {
    if (!props.auditInstanceId) return
    if (!isSummaryDirty.value) {
        toast.showToast(t('common.info'), t('audit.reports_tab.toast_summary_no_changes'), 'info')
        return
    }
    try {
        isSavingSummary.value = true
        await apiPut(`/audits/instances/${props.auditInstanceId}`, { auditSummary: auditSummary.value }, authStore)
        toast.showToast(t('common.success'), t('audit.reports_tab.toast_summary_saved'), 'success')
        originalAuditSummary.value = auditSummary.value
    } catch (error: any) {
        console.error('Error saving audit summary:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.reports_tab.toast_summary_save_failed'),
            'error'
        )
    } finally {
        isSavingSummary.value = false
    }
}

onMounted(() => {
    fetchReports()
    fetchNCs()

    if (props.initialAuditSummary !== undefined) {
        auditSummary.value = props.initialAuditSummary || ''
        originalAuditSummary.value = auditSummary.value
    }
})

watch(
    () => props.initialAuditSummary,
    (val) => {
        if (val !== undefined) {
            auditSummary.value = val || ''
            originalAuditSummary.value = auditSummary.value
        }
    }
)
</script>
