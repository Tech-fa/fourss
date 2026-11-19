<template>
    <div id="audit-instance-details" class="bg-white text-neutral-900 min-h-[56rem] flex flex-col">
        <BreadCrums :crumbs="crums">
            <div>
                <Can subject="audit_instances" :actions="['update']">
                    <AppButton
                        v-if="!isReadOnlyStatus"
                        button-style="secondary"
                        :href="`/check/audits/instances/${instanceId}/edit?redirect=${route.fullPath}`"
                        test-id="edit-audit-instance-button"
                    >
                        <span class="flex items-center gap-2">
                            <i class="fa-solid fa-square-pen"></i>
                            {{ t('audit.instance_page.edit_instance') }}
                        </span>
                    </AppButton>
                </Can>
            </div>
        </BreadCrums>

        <!-- Action Buttons Section -->
        <div class="w-full max-w-[1400px] mx-auto px-6 py-4 flex justify-end">
            <Can subject="audit_instances" :actions="['update']">
                <div class="flex items-center gap-3">
                    <AppButton
                        :warn-before="t('audit.instance_page.warn_start')"
                        button-style="primary"
                        @click="changeAuditStatus(AuditInstanceStatus.IN_PROGRESS)"
                        :loading="isLoading"
                        v-if="instance?.status === AuditInstanceStatus.SCHEDULED"
                        test-id="start-audit-button"
                    >
                        {{ t('audit.instance_page.start_audit') }}
                    </AppButton>

                    <AppButton
                        :warn-before="t('audit.instance_page.warn_complete')"
                        button-style="secondary"
                        @click="changeAuditStatus(AuditInstanceStatus.COMPLETED)"
                        :loading="isLoading"
                        v-if="instance?.status === AuditInstanceStatus.IN_PROGRESS"
                        test-id="complete-audit-button"
                    >
                        {{ t('audit.instance_page.complete_audit') }}
                    </AppButton>
                    <AppButton
                        :warn-before="t('audit.instance_page.warn_on_hold')"
                        button-style="secondary"
                        @click="changeAuditStatus(AuditInstanceStatus.ON_HOLD)"
                        :loading="isLoading"
                        v-if="instance?.status === AuditInstanceStatus.IN_PROGRESS"
                        test-id="put-on-hold-button"
                    >
                        {{ t('audit.instance_page.put_on_hold') }}
                    </AppButton>
                    <AppButton
                        :warn-before="t('audit.instance_page.warn_resume')"
                        button-style="primary"
                        @click="changeAuditStatus(AuditInstanceStatus.IN_PROGRESS)"
                        :loading="isLoading"
                        v-if="instance?.status === AuditInstanceStatus.ON_HOLD"
                        test-id="resume-audit-button"
                    >
                        {{ t('audit.instance_page.resume_audit') }}
                    </AppButton>
                    <AppButton
                        :warn-before="t('audit.instance_page.warn_cancel')"
                        button-style="warning"
                        @click="changeAuditStatus(AuditInstanceStatus.CANCELLED)"
                        :loading="isLoading"
                        v-if="
                            instance?.status !== AuditInstanceStatus.CANCELLED &&
                            instance?.status !== AuditInstanceStatus.COMPLETED
                        "
                        test-id="cancel-audit-button"
                    >
                        {{ t('audit.instance_page.cancel_audit') }}
                    </AppButton>
                </div>
            </Can>
        </div>

        <main id="main" class="flex-1 w-full max-w-[1400px] mx-auto py-8 px-6">
            <section id="audit-summary" class="mb-8">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <div class="text-xs text-neutral-500 mb-1">{{ t('audit.instance_page.col_audit_id') }}</div>
                        <div class="font-medium">{{ instance?.auditId || t('audit.instance_page.na') }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-neutral-500 mb-1">{{ t('audit.instance_page.col_program_title') }}</div>
                        <div>{{ instance?.auditProgram?.title || t('audit.instance_page.program_loading') }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-neutral-500 mb-1">{{ t('audit.instance_page.col_status') }}</div>
                        <div class="capitalize">
                            <span
                                class="inline-flex items-center px-2 py-1 rounded-full text-xs"
                                :class="getStatusClass(instance?.status)"
                            >
                                {{ translateAuditStatus(instance?.status) }}
                            </span>
                        </div>
                    </div>
                    <div>
                        <div class="text-xs text-neutral-500 mb-1">{{ t('audit.instance_page.col_dates') }}</div>
                        <div>
                            {{ formatDateToDay(instance?.startDate || 0) }} --
                            {{ formatDateToDay(instance?.endDate || 0) }}
                        </div>
                    </div>
                    <div v-if="instance?.scheduleEntry">
                        <div class="text-xs text-neutral-500 mb-1">{{ t('audit.instance_page.col_schedule') }}</div>
                        <div class="space-y-1">
                            <div class="flex items-center gap-2">
                                <span>{{ scheduleEntryLabel }}</span>
                                <span
                                    v-if="instance.scheduleEntry.isUnplanned"
                                    class="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                                >
                                    {{ t('audit.program_cards.unplanned_badge') }}
                                </span>
                            </div>
                            <p v-if="instance.scheduleEntry.isUnplanned" class="text-xs text-amber-800">
                                {{ instance.scheduleEntry.amendmentReason || t('audit.program_cards.no_amendment_reason') }}
                            </p>
                        </div>
                    </div>
                    <div>
                        <div class="text-xs text-neutral-500 mb-1">{{ t('audit.main.col_criteria') }}</div>
                        <div class="whitespace-pre-wrap">{{ instance?.criteria || t('audit.instance_page.na') }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-neutral-500 mb-1">{{ t('audit.main.col_location') }}</div>
                        <div>{{ instance?.location || t('audit.main.location_not_specified') }}</div>
                    </div>
                </div>
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div class="text-xs text-neutral-500 mb-1">{{ t('audit.schedule_instance.scope_label') }}</div>
                        <div class="whitespace-pre-wrap">{{ instance?.scope || t('audit.instance_page.na') }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-neutral-500 mb-1">{{ t('audit.schedule_instance.objective_label') }}</div>
                        <div class="whitespace-pre-wrap">{{ instance?.objective || t('audit.instance_page.na') }}</div>
                    </div>
                </div>
            </section>

            <section id="audit-team" class="mb-8">
                <div
                    class="flex items-center justify-start gap-2 cursor-pointer hover:bg-neutral-50 p-2 -m-2 rounded transition-colors"
                    @click="isAuditTeamCollapsed = !isAuditTeamCollapsed"
                >
                    <h3 class="text-lg font-medium text-neutral-900">{{ t('audit.instance_page.team_section') }}</h3>
                    <span v-if="isAuditTeamCollapsed">
                        <i class="fa-solid fa-chevron-right"></i>
                    </span>
                    <span v-else>
                        <i class="fa-solid fa-chevron-down"></i>
                    </span>
                </div>
                <div
                    v-show="!isAuditTeamCollapsed"
                    class="mt-4 transition-all duration-200 ease-in-out"
                >
                    <Table
                        :cols="teamCols"
                        :column-labels="teamColumnLabels"
                        :rows="teamRows"
                        :entities="instance?.teamMembers || []"
                        :page="1"
                        :total="instance?.teamMembers?.length || 0"
                        :per-page="50"
                        :total-pages="1"
                        :on-next-page="() => {}"
                        :on-previous-page="() => {}"
                        :set-page="() => {}"
                        :on-success="() => {}"
                        :loading="false"
                        :entity-name="t('audit.instance_page.entity_team_member')"
                        :hide-edit="() => true"
                        :hide-delete="() => true"
                        :hide-view="() => true"
                        skip-padding
                    />
                </div>
            </section>

            <section id="tab-section" class="mb-10">
                <Tabs
                    :tabs="tabNames"
                    v-model="activeTab"
                    :test-ids="['checklist-findings', 'all-findings', 'reports-ncs', 'history']"
                />
                <div v-if="activeTab === 0">
                    <div
                        v-if="isScheduled"
                        class="border border-neutral-200 rounded-lg p-6 bg-neutral-50 text-neutral-700 text-center"
                    >
                        {{ scheduledMessage }}
                    </div>
                    <Can v-else subject="audit_checklist_responses" :actions="['read']" showIfNoPermission>
                        <AuditChecklistResponses 
                            :key="`checklist-${instanceId}`"
                            ref="checklistResponsesRef"
                            :audit-instance-id="String(instanceId)" 
                            :instance-status="instance?.status || ''" 
                            :show-inline-errors="checklistInlineErrors" 
                        >
                            <AuditChecklistAttachments
                                :audit-instance-id="String(instanceId)"
                                :read-only="attachmentsReadOnly"
                            />
                        </AuditChecklistResponses>
                    </Can>
                </div>
                <div v-if="activeTab === 1">
                    <div
                        v-if="isScheduled"
                        class="border border-neutral-200 rounded-lg p-6 bg-neutral-50 text-neutral-700 text-center"
                    >
                        {{ scheduledMessage }}
                    </div>
                    <Can v-else subject="audit_findings" :actions="['read']" showIfNoPermission>
                        <AuditAllFindings
                            :audit-instance-id="instanceId as string"
                            :program-id="programId as string"
                            :team-members="instance?.teamMembers || []"
                            :instance-status="instance?.status || ''"
                        />
                    </Can>
                </div>
                <div v-if="activeTab === 2">
                    <div
                        v-if="isScheduled"
                        class="border border-neutral-200 rounded-lg p-6 bg-neutral-50 text-neutral-700 text-center"
                    >
                        {{ scheduledMessage }}
                    </div>
                    <Can v-else subject="audit_instances" :actions="['read']" showIfNoPermission>
                        <AuditReports
                            :audit-instance-id="instanceId as string"
                            :audit-program-id="programId as string"
                            :initial-audit-summary="instance?.auditSummary"
                        />
                    </Can>
                </div>
                <div v-if="activeTab === 3">
                    <div
                        v-if="isScheduled"
                        class="border border-neutral-200 rounded-lg p-6 bg-neutral-50 text-neutral-700 text-center"
                    >
                        {{ scheduledMessage }}
                    </div>
                    <Can v-else subject="audit_instances" :actions="['read']" showIfNoPermission>
                        <HistoryView
                            entity-type="audit_instances"
                            :entity-id="instanceId as string"
                            :instance-status="instance?.status || ''"
                        />
                    </Can>
                </div>
            </section>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import BreadCrums from '../breadCrums.vue'
import Tabs from '../Tabs.vue'
import Table from '../Table.vue'
import { useRoute } from 'vue-router'
import { apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import type { AuditInstance } from '@/util/interfaces'
import { AuditInstanceStatus } from '@/util/interfaces'
import { formatDateToDay, snakeToCamelCase, formatApiErrorMessage } from '@/util/util'
import AuditChecklistResponses from './audit-checklist-responses.vue'
import AuditChecklistAttachments from './audit-checklist-attachments.vue'
import Can from '../Can.vue'
import HistoryView from '../history-view.vue'
import AuditReports from './audit-reports.vue'
import AppButton from '../AppButton.vue'
import { apiPut } from '@/util/api'
import { useToast } from '@/stores/notification'
import AuditAllFindings from './audit-all-findings.vue'

const { t } = useI18n()
const route = useRoute()
const programId = route.params.id
const instanceId = route.params.instanceId
const authStore = useAuthStore()
const instance = ref<AuditInstance>()
const activeTab = ref(0)
const isAuditTeamCollapsed = ref(true)
const toast = useToast()
const isLoading = ref(false)
const checklistInlineErrors = ref(false)
const checklistResponsesRef = ref<any>(null)

const scheduledMessage = computed(() => t('audit.instance_page.scheduled_message'))

const monthOptions = computed(() => [
    { id: 1, name: t('audit.months.january') },
    { id: 2, name: t('audit.months.february') },
    { id: 3, name: t('audit.months.march') },
    { id: 4, name: t('audit.months.april') },
    { id: 5, name: t('audit.months.may') },
    { id: 6, name: t('audit.months.june') },
    { id: 7, name: t('audit.months.july') },
    { id: 8, name: t('audit.months.august') },
    { id: 9, name: t('audit.months.september') },
    { id: 10, name: t('audit.months.october') },
    { id: 11, name: t('audit.months.november') },
    { id: 12, name: t('audit.months.december') }
])

const scheduleEntryLabel = computed(() => {
    const scheduleEntry = instance.value?.scheduleEntry
    if (!scheduleEntry) return ''

    const month = monthOptions.value.find((option) => option.id === Number(scheduleEntry.month))?.name || scheduleEntry.month
    const year = scheduleEntry.year ? ` ${scheduleEntry.year}` : ''
    return `${month}${year} - ${scheduleEntry.process || t('training.main.na')}`
})

const tabNames = computed(() => [
    t('audit.instance_page.tab_checklist'),
    t('audit.instance_page.tab_all_findings'),
    t('audit.instance_page.tab_reports_ncs'),
    t('audit.instance_page.tab_history')
])

const teamCols = ['name', 'role', 'email', 'internal_member']

const teamColumnLabels = computed(() => ({
    name: t('audit.instance_page.team_col_name'),
    role: t('audit.instance_page.team_col_role'),
    email: t('audit.instance_page.team_col_email'),
    internal_member: t('audit.instance_page.team_col_internal')
}))

const translateAuditStatus = (status: string | undefined) => {
    if (!status) return ''
    const key = `audit.main.status.${status}`
    const translated = t(key)
    return translated === key ? snakeToCamelCase(status) : translated
}

const teamRows = computed(() => {
    if (!instance.value?.teamMembers) return []

    return instance.value.teamMembers.map((member) => ({
        id: member.id,
        name: `${member.auditPersonnel.fname} ${member.auditPersonnel.lname}`,
        role: member.auditRole.name,
        email: member.auditPersonnel.email || t('audit.instance_page.na'),
        internal_member: member.auditPersonnel.isExternal ? t('common.no') : t('common.yes')
    }))
})

onMounted(async () => {
    const response = await apiGet<AuditInstance>(
        `/audits/instances/${instanceId}`,
        authStore
    )
    instance.value = response

    // Set active tab based on URL query parameter
    const tabParam = route.query.tab
    if (tabParam !== undefined) {
        const tabIndex = parseInt(tabParam as string)
        if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex < tabNames.value.length) {
            activeTab.value = tabIndex
        }
    }
})

const isScheduled = computed(() => instance.value?.status === AuditInstanceStatus.SCHEDULED)

const isReadOnlyStatus = computed(() => {
    const status = instance.value?.status
    return status === AuditInstanceStatus.ON_HOLD || 
           status === AuditInstanceStatus.CANCELLED || 
           status === AuditInstanceStatus.COMPLETED
})

const attachmentsReadOnly = computed(() => {
    const status = instance.value?.status
    return (
        status !== AuditInstanceStatus.IN_PROGRESS &&
        status !== AuditInstanceStatus.DRAFT
    )
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
                name: instance.value?.auditProgram.title || t('audit.instance_page.breadcrumb_program_fallback'),
                path: `/check/audits/${programId}`,
                icon: 'fa-solid fa-file-pen'
            },
            {
                name: t('audit.instance_page.breadcrumb_instance', {
                    status: translateAuditStatus(instance.value?.status)
                }),
                path: `/check/audits/${programId}/instances/${instanceId}`,
                icon: 'fa-solid fa-file-pen'
            }
        )
    } else {
        base.push({
            name: t('audit.instance_page.breadcrumb_instance_simple'),
            path: route.fullPath,
            icon: 'fa-solid fa-file-pen'
        })
    }

    return base
})

const getStatusClass = (status: string | undefined) => {
    const statusLower = status?.toLowerCase()
    switch (statusLower) {
        case 'active':
        case 'in_progress':
            return 'bg-blue-100 text-blue-800'
        case 'completed':
        case 'finalized':
            return 'bg-green-100 text-green-800'
        case 'cancelled':
        case 'canceled':
            return 'bg-red-100 text-red-800'
        case 'scheduled':
        case 'draft':
        case 'pending':
            return 'bg-yellow-100 text-yellow-800'
        case 'on_hold':
            return 'bg-orange-100 text-orange-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

const changeAuditStatus = async (newStatus: string) => {
    try {
        isLoading.value = true
        await apiPut(`/audits/instances/${instanceId}/status`, { status: newStatus }, authStore)

        // Update the local instance status
        if (instance.value) {
            instance.value.status = newStatus as any
        }

        toast.showToast(
            t('common.success'),
            t('audit.instance_page.toast_status_changed', {
                status: translateAuditStatus(newStatus)
            }),
            'success'
        )
    } catch (error: any) {
        console.error('Error changing audit status:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') || t('audit.instance_page.toast_status_error'),
            'error'
        )
        // If completing fails due to missing answers, surface inline errors and focus checklist tab
        if (newStatus === AuditInstanceStatus.COMPLETED) {
            activeTab.value = 0
            checklistInlineErrors.value = true
            
            // Find and scroll to first unanswered question
            nextTick(() => {
                if (checklistResponsesRef.value) {
                    const firstUnansweredId = checklistResponsesRef.value.findFirstUnansweredQuestion()
                    if (firstUnansweredId) {
                        checklistResponsesRef.value.scrollToQuestion(firstUnansweredId)
                    }
                }
            })
        }
    } finally {
        isLoading.value = false
    }
}
</script>
