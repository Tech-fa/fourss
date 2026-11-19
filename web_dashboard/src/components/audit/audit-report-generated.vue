<template>
    <BreadCrums :crumbs="crums">
        <div>
            <Can subject="audit_instances" :actions="['generate_report']">
                <AppButton @click="downloadPDF" :loading="downloading" button-style="secondary" test-id="download-audit-report-button">
                    <i class="fa-solid fa-file-pdf"></i>
                    {{ t('audit.generated_report.download') }}
                </AppButton>
            </Can>
        </div>
    </BreadCrums>
    <div class="container-fluid">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-16">
            <Spinner width="5"/>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-message">
            {{ error }}
        </div>

        <!-- Report Content -->
        <div v-else-if="auditData" class="col-md-12" id="audit-report-content">
            <div class="col-md-12" id="myReport">
                <div class="panel panel-success document-file">
                    <div class="panel-body document-content">
                        <!-- ===== HEADER SECTION ===== -->
                        <div class="col-md-12">
                            <div class="col-md-4">
                                <h2>{{ auditData?.auditProgramTitle || t('audit.generated_report.audit_title_fallback') }}</h2>
                                <h4>
                                    {{ t('audit.generated_report.audit_id') }}:
                                    {{ auditData?.auditId }}
                                </h4>
                                <h4>
                                    {{ t('audit.generated_report.audit_status') }}:
                                    {{
                                        translateAuditStatus(auditData?.auditInstanceStatus) ||
                                        t('audit.generated_report.not_provided')
                                    }}
                                </h4>
                            </div>
                        </div>

                        <!-- ===== OBJECTIVE & SCOPE SECTION ===== -->
                        <div class="col-md-12 sections">
                            <div class="ibox-title">
                                <h3>{{ t('audit.generated_report.section_objective_scope') }}</h3>
                            </div>
                            <div class="col-xs-12 SectionItemContainer">
                                <div class="col-md-6" id="objectiveSection">
                                    <h3>{{ t('audit.generated_report.objective') }}</h3>
                                    <h4>{{ auditData?.objective || t('audit.generated_report.not_provided') }}</h4>
                                </div>
                                <div class="col-md-6" id="scopeSection">
                                    <h3>{{ t('audit.generated_report.scope') }}</h3>
                                    <h4>{{ auditData?.scope || t('audit.generated_report.not_provided') }}</h4>
                                </div>
                            </div>
                        </div>

                        <!-- ===== DETAILS SECTION ===== -->
                        <div class="col-md-12 sections">
                            <div class="ibox-title">
                                <h3>{{ t('audit.generated_report.details') }}</h3>
                            </div>
                            <div class="col-xs-12 SectionItemContainer">
                                <div class="col-md-12 SectionItemContainer">
                                    <div class="col-md-2"><h3>{{ t('audit.generated_report.start_date') }}</h3></div>
                                    <div class="col-md-4">
                                        <h4>
                                            {{
                                                formatDateToDay(auditData?.startDate) ||
                                                t('audit.generated_report.not_provided')
                                            }}
                                        </h4>
                                    </div>
                                    <div class="col-md-2"><h3>{{ t('audit.generated_report.end_date') }}</h3></div>
                                    <div class="col-md-4">
                                        <h4>
                                            {{
                                                formatDateToDay(auditData?.endDate) ||
                                                t('audit.generated_report.not_provided')
                                            }}
                                        </h4>
                                    </div>
                                </div>
                                <div class="col-md-12 SectionItemContainer">
                                    <div class="col-md-2 floatingLeft"><h3>{{ t('audit.generated_report.start_time') }}</h3></div>
                                    <div class="col-md-6">
                                        <h4>
                                            {{ formatDate(auditData?.startTime) || t('audit.generated_report.not_provided') }}
                                        </h4>
                                    </div>
                                </div>
                                <div class="col-md-12 SectionItemContainer">
                                    <div class="col-md-2 floatingLeft"><h3>{{ t('audit.generated_report.audit_type') }}</h3></div>
                                    <div class="col-md-4">
                                        <h4>{{ auditData?.auditType || t('audit.generated_report.not_provided') }}</h4>
                                    </div>
                                </div>
                                <div class="col-md-12 SectionItemContainer">
                                    <div class="col-md-2 floatingLeft">
                                        <h3>{{ t('audit.generated_report.audit_members') }}</h3>
                                    </div>
                                    <div class="col-md-6">
                                        <h4>{{ auditData?.auditMembers || t('audit.generated_report.not_provided') }}</h4>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ===== CHECKLISTS & FINDINGS SECTION ===== -->
                        <div class="col-md-12 sections">
                            <div class="ibox-title">
                                <h3>{{ t('audit.generated_report.checklists_findings') }}</h3>
                            </div>
                            <div class="col-xs-12 SectionItemContainer">
                                <div 
                                    v-for="checklist in auditData?.checklists" 
                                    :key="checklist.id"
                                    class="col-md-12 SectionItemContainer"
                                    style="margin-bottom: 30px;"
                                >
                                    <h4>{{ checklist.title }}</h4>
                                    <div class="col-md-12">
                                        <table class="Audittable">
                                            <thead>
                                                <tr class="TableHeader">
                                                    <th style="width: 5%">{{ t('audit.generated_report.col_qn') }}</th>
                                                    <th style="width: 20%">{{ t('audit.generated_report.col_question') }}</th>
                                                    <th style="width: 10%">{{ t('audit.generated_report.col_answer') }}</th>
                                                    <th style="width: 10%">{{ t('audit.generated_report.col_observation') }}</th>
                                                    <th style="width: 15%">{{ t('audit.generated_report.col_finding_title') }}</th>
                                                    <th style="width: 10%">{{ t('audit.generated_report.col_finding_classification') }}</th>
                                                    <th style="width: 15%">{{ t('audit.generated_report.col_evidence_description') }}</th>
                                                    <th style="width: 10%">{{ t('audit.generated_report.col_evidence_source') }}</th>
                                                </tr>
                                            </thead>
                                            <tbody class="TableContent">
                                                <tr
                                                    v-for="record in checklist.records"
                                                    :key="record.questionNumber"
                                                >
                                                    <td>{{ record.questionNumber }}</td>
                                                    <td>{{ record.questionText }}</td>
                                                    <td>{{ displayAnswer(record.responseAnswer) }}</td>
                                                    <td>{{ record.auditorObservation || t('audit.generated_report.not_provided') }}</td>
                                                    <td>{{ record.findings || t('audit.generated_report.not_provided') }}</td>
                                                    <td>{{ formatLabelList(record.findingClassification) }}</td>
                                                    <td>{{ record.evidences || t('audit.generated_report.not_provided') }}</td>
                                                    <td>{{ formatLabelList(record.evidenceSourceType) }}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ===== ALL FINDINGS SECTION ===== -->
                        <div class="col-md-12 sections">
                            <div class="ibox-title">
                                <h3>{{ t('audit.generated_report.all_findings_title') }}</h3>
                            </div>
                            <div class="col-xs-12 SectionItemContainer">
                                <div class="col-md-12">
                                    <table class="Audittable">
                                        <thead>
                                            <tr class="TableHeader">
                                                <th style="width: 20%">{{ t('audit.generated_report.col_finding_title') }}</th>
                                                <th style="width: 20%">{{ t('audit.generated_report.col_related_question') }}</th>
                                                <th style="width: 12%">{{ t('audit.generated_report.col_classification') }}</th>
                                                <th style="width: 10%">{{ t('audit.generated_report.col_nc_raised') }}</th>
                                                <th style="width: 10%">{{ t('audit.generated_report.col_evidence_count') }}</th>
                                                <th style="width: 15%">{{ t('audit.generated_report.col_recorded_by') }}</th>
                                            </tr>
                                        </thead>
                                        <tbody class="TableContent">
                                            <tr
                                                v-for="finding in auditData?.allFindings"
                                                :key="finding.id"
                                            >
                                                <td>{{ finding.title || t('audit.generated_report.not_provided') }}</td>
                                                <td>{{ finding.questionText || t('audit.all_findings.question_general') }}</td>
                                                <td>{{ formatLabelList(finding.classification) }}</td>
                                                <td>{{ finding.raisedNc ? t('common.yes') : t('common.no') }}</td>
                                                <td>{{ finding.numberOfEvidences ?? 0 }}</td>
                                                <td>{{ finding.auditTeamMember ? `${finding.auditTeamMember.fname || ''} ${finding.auditTeamMember.lname || ''}`.trim() || t('audit.instance_page.na') : t('audit.instance_page.na') }}</td>
                                            </tr>
                                            <tr v-if="!auditData?.allFindings?.length">
                                                <td colspan="6">{{ t('audit.generated_report.no_findings') }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- ===== NON-CONFORMITY & CORRECTIVE ACTIONS SECTION ===== -->
                        <div class="col-md-12 sections">
                            <div class="ibox-title">
                                <h3>{{ t('audit.generated_report.nc_actions_title') }}</h3>
                            </div>
                            <div class="col-xs-12 SectionItemContainer">
                                <div class="col-md-12">
                                    <table class="CorrectiveAction">
                                        <thead>
                                            <tr class="TableHeader">
                                                <th style="width: 10%">{{ t('audit.generated_report.col_nc_question') }}</th>
                                                <th style="width: 15%">{{ t('audit.generated_report.col_nc_findings') }}</th>
                                                <th style="width: 15%">{{ t('audit.generated_report.col_nc_evidences') }}</th>
                                                <th style="width: 15%">{{ t('audit.generated_report.col_nc_recommendations') }}</th>
                                                <th style="width: 15%">{{ t('audit.generated_report.col_ncr') }}</th>
                                                <th style="width: 15%">{{ t('audit.generated_report.col_due_date') }}</th>
                                            </tr>
                                        </thead>
                                        <tbody class="TableContent">
                                            <tr
                                                v-for="nc in auditData?.allNonConformities"
                                                :key="`nc-${nc.question}-${nc.findings}`"
                                            >
                                                <td>{{ nc.question }}</td>
                                                <td>{{ nc.findings || t('audit.generated_report.not_provided') }}</td>
                                                <td>{{ nc.evidences || t('audit.generated_report.not_provided') }}</td>
                                                <td>{{ nc.recommendations || t('audit.generated_report.not_provided') }}</td>
                                                <td>{{ nc.ncr }}</td>
                                                <td>{{ nc.dueDate ? formatDateToDay(nc.dueDate) : t('audit.generated_report.not_provided') }}</td>
                                            </tr>
                                            <tr v-if="!auditData?.allNonConformities?.length">
                                                <td colspan="6">{{ t('audit.generated_report.no_ncs') }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- ===== AUDIT EXECUTIVE SUMMARY SECTION ===== -->
                        <div class="col-md-12">
                            <div class="ibox-title">
                                <h3>{{ t('audit.generated_report.audit_summary_title') }}</h3>
                            </div>
                            <div class="col-xs-12 SectionItemContainer">
                                <div class="col-md-12 SectionItemContainer">
                                    <div class="col-md-12 floatingRight" style="margin-top: 10px">
                                        <p>{{ auditData?.auditSummary || t('audit.generated_report.not_provided') }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { apiGet, apiPost } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import BreadCrums from '../breadCrums.vue'
import { snakeToCamelCase, formatDateToDay, formatDate, sanitizeFileName, formatApiErrorMessage } from '@/util/util'
import AppButton from '../AppButton.vue'
import Spinner from '../Spinner.vue'
import type { AuditReportData, AuditInstanceResponse, AuditFindingResponseDTO } from '@/util/interfaces'
import { AuditReportType } from '@/util/interfaces'
import Can from '../Can.vue'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

const translateAuditStatus = (status: string | undefined) => {
    if (!status) return ''
    const key = `audit.main.status.${status}`
    const translated = t(key)
    return translated === key ? snakeToCamelCase(status) : translated
}

const auditInstanceId = route.params.instanceId as string
const auditData = ref<AuditReportData>()
const loading = ref(true)
const error = ref<string | null>(null)
const downloading = ref(false)

const translateCatalogValue = (value: string) => {
    const candidates = [
        `audit.finding_classification.${value}`,
        `audit.finding_severity.${value}`,
        `audit.evidence_type.${value}`,
        `audit.main.status.${value}`
    ]
    for (const key of candidates) {
        const translated = t(key)
        if (translated !== key) return translated
    }
    if (value === 'Yes') return t('audit.checklist_section.yes')
    if (value === 'No') return t('audit.checklist_section.no')
    if (value === 'NA' || value === 'N/A') return t('audit.checklist_section.na')
    return snakeToCamelCase(value)
}

const displayAnswer = (answer?: string) => {
    if (!answer) return t('audit.generated_report.not_provided')
    return translateCatalogValue(answer)
}

const formatLabelList = (val?: string) => {
    const np = t('audit.generated_report.not_provided')
    if (!val) return np
    const s = val
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => translateCatalogValue(item))
        .join('; ')
    return s || np
}


onMounted(async () => {
    if (!auditInstanceId) {
        error.value = t('audit.generated_report.error_no_instance')
        loading.value = false
        return
    }

    try {
        await fetchAuditData()
    } catch (err) {
        error.value = t('audit.generated_report.error_load_failed')
        console.error('Error fetching audit data:', err)
    } finally {
        loading.value = false
    }
})

const crums = computed(() => {
    const source = route.query.source as string | undefined

    const base = [
        {
            name: t('nav.audit'),
            path: '/check/audits',
            icon: 'fa-solid fa-chart-line'
        }
    ]

    if (source === 'program') {
        base.push(
            {
                name: t('common.settings'),
                path: '/check/audits/settings?tab=4',
                icon: 'fa-solid fa-gear text-neutral-700 text-2xl'
            },
            {
                name: auditData.value?.auditProgramTitle || t('audit.generated_report.breadcrumb_program_fallback'),
                path: `/check/audits/${route.params.id}`,
                icon: 'fa-solid fa-file-pen'
            },
            {
                name: t('audit.generated_report.breadcrumb_instance', {
                    status: translateAuditStatus(auditData.value?.auditInstanceStatus)
                }),
                path: `/check/audits/${route.params.id}/instances/${route.params.instanceId}?source=program&tab=2`,
                icon: 'fa-solid fa-file-pen'
            }
        )
    } else {
        base.push({
            name: t('audit.generated_report.breadcrumb_instance_simple'),
            path: `/check/audits/${route.params.id}/instances/${route.params.instanceId}?source=main&tab=2`,
            icon: 'fa-solid fa-file-pen'
        })
    }

    base.push({
        name: t('audit.generated_report.breadcrumb_report'),
        path: route.fullPath,
        icon: 'fa-solid fa-file-lines'
    })

    return base
})

const fetchAuditData = async () => {
    const [instance, allFindingsResponse] = await Promise.all([
        apiGet<AuditInstanceResponse>(`/audits/instances/${auditInstanceId}`, authStore),
        apiGet<AuditFindingResponseDTO[]>(`/audits/findings?auditInstanceId=${auditInstanceId}`, authStore)
    ])

    // Format audit team members
    const auditMembers = (() => {
        const teamMembers = instance?.teamMembers || []
        return teamMembers
            .map((tm: any) => {
                const name = `${tm.auditPersonnel?.fname || ''} ${tm.auditPersonnel?.lname || ''}`.trim()
                const role = tm.auditRole?.name || ''
                return name && role ? `${name} (${role})` : name
            })
            .filter(Boolean)
            .join(', ')
    })()

    // Group responses by checklist definition
    const checklists = (() => {
        const checklists = instance?.ChecklistDefinitions || []
        const responses = instance?.auditChecklistResponses || []
        
        return checklists.map((checklist: any) => {
            // Filter responses for this specific checklist
            const checklistResponses = responses.filter((response: any) => {
                return response.questionDefinition?.sectionDefinition?.checklistDefinition?.id === checklist.id
            })
            
            const records = checklistResponses.map((r: any, idx: number) => {
                const findings = (r.auditFindings || [])
                const findingsTitles = findings.map((f: any) => f.title).filter(Boolean).join('; ')
                const findingClassifications = findings.map((f: any) => f.classification).filter(Boolean).join('; ')
                const evidences = findings
                    .flatMap((f: any) => (f.auditFindingEvidences || []).map((e: any) => e.description))
                    .filter(Boolean)
                    .join('; ')
                const evidenceSourceTypes = findings
                    .flatMap((f: any) => (f.auditFindingEvidences || []).map((e: any) => e.evidenceType))
                    .filter(Boolean)
                    .join('; ')
                
                return {
                    questionNumber: idx + 1,
                    questionText: r.questionDefinition?.questionText,
                    responseAnswer: r.responseAnswer,
                    auditorObservation: r.auditorObservation,
                    findings: findingsTitles,
                    findingClassification: findingClassifications,
                    evidences,
                    evidenceSourceType: evidenceSourceTypes
                }
            })

            // Get non-conformities for this specific checklist
            const checklistNonConformities = checklistResponses
                .filter((r: any) => (r.auditFindings || []).some((f: any) => f.raisedNc))
                .map((r: any) => {
                    const ncFinding = (r.auditFindings || []).find((f: any) => f.raisedNc)
                    return {
                        question: r.questionDefinition?.questionText,
                        findings: ncFinding?.title,
                        evidences: (ncFinding?.auditFindingEvidences || [])
                            .map((e: any) => e.description)
                            .filter(Boolean)
                            .join('; '),
                        recommendations: r.auditorObservation,
                        ncr: ncFinding?.nonConformity?.problemStatement,
                        dueDate: ncFinding?.nonConformity?.dueDate
                    }
                })
            
            return {
                id: checklist.id,
                title: checklist.title,
                records,
                nonConformities: checklistNonConformities
            }
        })
    })()

    // Build all NCs from all findings (including findings without checklist response)
    const allNonConformities = (allFindingsResponse || [])
        .filter((f: AuditFindingResponseDTO) => f.raisedNc && f.nonConformity)
        .map((f: AuditFindingResponseDTO) => ({
            question: f.questionText || t('audit.all_findings.question_general'),
            findings: f.title || t('audit.generated_report.not_provided'),
            evidences:
                f.evidences && f.evidences.length
                    ? f.evidences.join('; ')
                    : t('audit.generated_report.not_provided'),
            recommendations: f.recommendations || t('audit.generated_report.not_provided'),
            ncr: f.nonConformity?.problemStatement || t('audit.generated_report.not_provided'),
            dueDate: f.nonConformity?.dueDate ?? 0
        }))

    auditData.value = {
        auditProgramTitle: instance?.auditProgram?.title,
        auditProgramExpectedDate: instance?.auditProgram?.expectedDate,
        auditInstanceId: instance?.id,
        auditId: instance?.auditId,
        auditInstanceStatus: instance?.status,
        objective: instance?.objective ?? instance?.auditProgram?.objective,
        scope: instance?.scope ?? instance?.auditProgram?.scope,
        startDate: instance?.startDate,
        endDate: instance?.endDate,
        startTime: instance?.startDate,
        auditType: instance?.auditProgram?.auditActivityType?.name,
        auditMembers,
        checklists,
        allFindings: allFindingsResponse || [],
        allNonConformities,
        auditSummary: instance?.auditSummary
    } as AuditReportData
}

const downloadPDF = async () => {
    if (!auditData.value) {
        toast.showToast(t('common.error'), t('audit.generated_report.toast_no_data_download'), 'error')
        return
    }

    downloading.value = true

    try {
        const reportElement = document.getElementById('audit-report-content')
        if (!reportElement) {
            throw new Error('Report content element not found')
        }

        const canvas = await html2canvas(reportElement, {
            scale: 1.3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: reportElement.scrollWidth,
            height: reportElement.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: reportElement.scrollWidth,
            windowHeight: reportElement.scrollHeight,
            logging: false,
            removeContainer: true
        })

        const imgWidth = 210
        const pageHeight = 297
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight

        const pdf = new jsPDF('p', 'mm', 'a4')
        let position = 0

        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight
            pdf.addPage()
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight
        }

        const filename = `${sanitizeFileName(auditData.value.auditId)}.pdf`

        // Get PDF blob first
        const pdfBlob = pdf.output('blob')

        // Check file size limit (10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB in bytes
        if (pdfBlob.size > maxSize) {
            toast.showToast(
                t('common.error'),
                t('audit.generated_report.toast_pdf_too_large', {
                    size: (pdfBlob.size / 1024 / 1024).toFixed(1)
                }),
                'error'
            )
            return
        }

        // Create File object for upload
        const pdfFile = new File([pdfBlob], filename, {
            type: 'application/pdf'
        })

        // Download the PDF immediately 
        pdf.save(filename)
        toast.showToast(t('common.success'), t('audit.generated_report.toast_pdf_downloaded'), 'success')

        // Store in backend 
        storePDFInBackend(pdfFile)

        downloading.value = false

    } catch (error: any) {
        console.error('Error generating PDF:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') || t('audit.generated_report.toast_pdf_download_failed'),
            'error'
        )
        downloading.value = false
    }
}

// async function to store PDF in backend
const storePDFInBackend = async (pdfFile: File) => {
    try {

        const uploadFormData = new FormData()
        uploadFormData.append('file', pdfFile)
        uploadFormData.append(
            'title',
            `Audit Report - ${auditData.value?.auditProgramTitle || 'Audit Report'}`
        )
        uploadFormData.append('type', AuditReportType.GENERATED)
        uploadFormData.append(
            'description',
            `Generated audit report for ${auditData.value?.auditProgramTitle}`
        )
        uploadFormData.append('originalDate', Date.now().toString())

         await apiPost(
            `/audits/instances/${auditInstanceId}/reports`,
            uploadFormData,
            authStore
        )

    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') || t('audit.generated_report.toast_pdf_save_failed'),
            'error'
        )
    } finally {
        downloading.value = false
    }
}
</script>

<style scoped>
body {
    font-family: Arial, sans-serif;
    color: #000;
    background: #fff;
    margin: 40px;
    line-height: 1.5;
    font-size: 14px;
}

.container-fluid {
    max-width: 900px;
    margin: auto;
}

.ibox-title {
    margin-top: 30px;
    margin-bottom: 10px;
    border-bottom: 1px solid #000;
    padding-bottom: 3px;
}

.ibox-title h3 {
    margin: 0;
    font-size: 16px;
    font-weight: bold;
    text-transform: uppercase;
}

.SectionItemContainer {
    margin: 10px 0 20px;
}

label,
strong {
    display: block;
    font-weight: bold;
}

p {
    margin: 3px 0 10px;
}

table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 12px;
    border: 1px solid #ddd;
}

table th,
table td {
    border: 1px solid #ddd;
    padding: 3px 5px;
    text-align: left;
    vertical-align: top;
    white-space: normal;
    word-break: break-word;
    margin: 0;
}

/* Remove any Bootstrap table styling */
.Audittable,
.CorrectiveAction {
    border-collapse: collapse !important;
    border-spacing: 0 !important;
}

.Audittable th,
.Audittable td,
.CorrectiveAction th,
.CorrectiveAction td {
    border: 1px solid #ddd !important;
    padding: 3px 5px !important;
    margin: 0 !important;
    background: white !important;
}

/* Audit Records Table */
.Audittable th:nth-child(1),
.Audittable td:nth-child(1) {
    width: 40px;
    min-width: 40px;
}

.Audittable th:nth-child(2),
.Audittable td:nth-child(2) {
    width: 200px;
    min-width: 150px;
}

.Audittable th:nth-child(3),
.Audittable td:nth-child(3) {
    width: 150px;
    min-width: 120px;
}

.Audittable th:nth-child(4),
.Audittable td:nth-child(4) {
    width: 150px;
    min-width: 120px;
}

.Audittable th:nth-child(5),
.Audittable td:nth-child(5) {
    width: 150px;
    min-width: 120px;
}

/* Non-Conformity Table */
.CorrectiveAction th:nth-child(1),
.CorrectiveAction td:nth-child(1) {
    width: 150px;
    min-width: 120px;
}

.CorrectiveAction th:nth-child(2),
.CorrectiveAction td:nth-child(2) {
    width: 120px;
    min-width: 100px;
}

.CorrectiveAction th:nth-child(3),
.CorrectiveAction td:nth-child(3) {
    width: 120px;
    min-width: 100px;
}

.CorrectiveAction th:nth-child(4),
.CorrectiveAction td:nth-child(4) {
    width: 120px;
    min-width: 100px;
}

.CorrectiveAction th:nth-child(5),
.CorrectiveAction td:nth-child(5) {
    width: 100px;
    min-width: 80px;
}

.CorrectiveAction th:nth-child(6),
.CorrectiveAction td:nth-child(6) {
    width: 80px;
    min-width: 60px;
}

h3 {
    margin: 0;
    font-weight: bold;
}

h4 {
    margin: 5px 0;
    font-weight: normal;
}

/* Sections spacing */
.sections {
    margin-bottom: 30px;
}

/* Document/File styling */
.document-file {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    margin: 20px auto;
    max-width: 900px;
    position: relative;
    overflow: hidden;
}

.document-file::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%);
    border-bottom: 1px solid #ccc;
}

.document-content {
    padding: 30px;
    background: #fff;
    position: relative;
    min-height: 500px;
}

.document-content::after {
    content: '';
    position: absolute;
    top: 0;
    left: 20px;
    width: 2px;
    height: 100%;
    background: repeating-linear-gradient(
        to bottom,
        transparent 0px,
        transparent 20px,
        #e0e0e0 20px,
        #e0e0e0 22px
    );
}

/* Add subtle paper texture */
.document-content {
    background-image: radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.02) 1px, transparent 0);
    background-size: 20px 20px;
}
</style>
