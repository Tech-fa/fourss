<template>
    <div id="main-container" class="min-h-screen bg-neutral-50">
        <!-- Header -->
        <BreadCrums :crumbs="crums" />
        
        <!-- Loading state while fetching audit instance -->
        <div v-if="loadingAuditInstance" class="flex items-center justify-center py-16">
            <Spinner width="5" />
        </div>

        <main v-else class="mx-auto lg:p-12 p-6 max-w-7xl">
            <Form @submit="scheduleInstance" @invalid-submit="onInvalidSubmit">
            <!-- Section 1: Instance Info -->
            <section id="instance-info" class="mb-8 border rounded-lg p-6 bg-white">
                <h2 class="text-xl mb-4" test-id="instance-info-title">{{ t('audit.schedule_instance.info_title') }}</h2>
                
                <!-- Loading state -->
                <div v-if="loading" class="flex justify-center py-8">
                    <Spinner width="5" />
                </div>

                <div v-else class="space-y-6">
                    <!-- Audit Program Selector -->
                    <div class="space-y-2 relative" test-id="audit-program-field">
                        <span v-if="!isEditMode" class="absolute -top-3 right-0">
                            <AddAndReload
                                href="/check/audits/add"
                                :add-text="t('audit.program_list.create_button')"
                                :reload-text="t('common.reload')"
                                @reload="fetchAuditPrograms"
                            />
                        </span>
                        <label class="block text-sm">{{ t('audit.schedule_instance.audit_program_label') }} <span class="text-red-700">*</span></label>
                        <div :class="`flex ${!selectedAuditProgram && showValidationErrors ? 'ring-1 ring-red-500 rounded-md' : ''}`">
                            <template v-if="!isEditMode">
                                <Select2
                                    v-model="selectedAuditProgram"
                                    :values="auditPrograms"
                                    :display="(program: AuditProgram) => program?.title || ''"
                                    :placeholder="t('audit.schedule_instance.audit_program_placeholder')"
                                    test-id="instance-audit-program-select"
                                />
                            </template>
                            <template v-else>
                                <AppInput
                                    :value="selectedAuditProgram?.title || ''"
                                    hide-icon
                                    disabled
                                    class="w-full"
                                    test-id="instance-audit-program-readonly"
                                />
                            </template>
                        </div>
                        <p v-if="!selectedAuditProgram && showValidationErrors" class="text-red-600 text-xs mt-1">
                            {{ t('audit.validation.program_required') }}
                        </p>
                    </div>

                    <!-- Start Date & Time and End Date & Time - Side by Side -->
                    <div class="grid grid-cols-2 gap-6">
                        <!-- Start Date & Time -->
                        <div class="space-y-2" test-id="start-date-time-field">
                            <label class="block text-sm">{{ t('audit.schedule_instance.start_datetime_label') }} <span class="text-red-700">*</span></label>
                            <AppInput
                                type="datetime-local"
                                v-model="scheduleForm.startDateTime"
                                hide-icon
                                required
                                :error="!!errors.startDateTime"
                                @input="() => { 
                                    errors.startDateTime = ''
                                    // Clear end date error if start date changes and end date becomes valid
                                    if (scheduleForm.endDateTime && new Date(scheduleForm.endDateTime) > new Date(scheduleForm.startDateTime)) {
                                        errors.endDateTime = ''
                                    }
                                }"
                                test-id="instance-start-datetime-input"
                            />
                            <p v-if="errors.startDateTime" class="text-red-600 text-xs mt-1">
                                {{ errors.startDateTime }}
                            </p>
                        </div>

                        <!-- End Date & Time -->
                        <div class="space-y-2" test-id="end-date-time-field">
                            <label class="block text-sm">{{ t('audit.schedule_instance.end_datetime_label') }} <span class="text-red-700">*</span></label>
                            <AppInput
                                type="datetime-local"
                                v-model="scheduleForm.endDateTime"
                                hide-icon
                                required
                                :disabled="!scheduleForm.startDateTime"
                                :min="scheduleForm.startDateTime || undefined"
                                :error="!!errors.endDateTime"
                                @input="() => {
                                    // Validate end date is after start date
                                    if (scheduleForm.startDateTime && scheduleForm.endDateTime) {
                                        const startDate = new Date(scheduleForm.startDateTime)
                                        const endDate = new Date(scheduleForm.endDateTime)
                                        if (endDate <= startDate) {
                                            errors.endDateTime = t('audit.validation.end_after_start')
                                        } else {
                                            errors.endDateTime = ''
                                        }
                                    } else {
                                        errors.endDateTime = ''
                                    }
                                }"
                                test-id="instance-end-datetime-input"
                            />
                            <p v-if="errors.endDateTime" class="text-red-600 text-xs mt-1">
                                {{ errors.endDateTime }}
                            </p>
                            <p v-if="!scheduleForm.startDateTime" class="text-neutral-500 text-xs mt-1">
                                {{ t('audit.validation.select_start_first') }}
                            </p>
                        </div>
                    </div>

                    <div v-if="selectedAuditProgram" class="space-y-3" test-id="audit-schedule-link-type-field">
                        <label class="block text-sm">{{ t('audit.schedule_instance.schedule_link_type_label') }}</label>
                        <div class="grid gap-3 sm:grid-cols-2">
                            <label
                                class="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition"
                                :class="[
                                    isUnplannedAudit ? 'border-neutral-200' : 'border-neutral-800 bg-neutral-50',
                                    !hasPlannedScheduleEntries ? 'cursor-not-allowed opacity-60' : ''
                                ]"
                            >
                                <input
                                    v-model="isUnplannedAudit"
                                    type="radio"
                                    :value="false"
                                    name="audit-schedule-link-type"
                                    :disabled="!hasPlannedScheduleEntries"
                                    class="mt-1 h-4 w-4"
                                    test-id="instance-planned-audit-radio"
                                />
                                <span>
                                    <span class="block text-sm">{{ t('audit.schedule_instance.planned_audit_option') }}</span>
                                    <span class="block text-xs text-neutral-500">{{ t('audit.schedule_instance.planned_audit_hint') }}</span>
                                </span>
                            </label>
                            <label
                                class="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition"
                                :class="isUnplannedAudit ? 'border-neutral-800 bg-neutral-50' : 'border-neutral-200'"
                            >
                                <input
                                    v-model="isUnplannedAudit"
                                    type="radio"
                                    :value="true"
                                    name="audit-schedule-link-type"
                                    class="mt-1 h-4 w-4"
                                    test-id="instance-unplanned-audit-radio"
                                />
                                <span>
                                    <span class="block text-sm">{{ t('audit.schedule_instance.unplanned_audit_option') }}</span>
                                    <span class="block text-xs text-neutral-500">{{ t('audit.schedule_instance.unplanned_audit_hint') }}</span>
                                </span>
                            </label>
                        </div>
                    </div>

                    <div v-if="hasPlannedScheduleEntries && !isUnplannedAudit" class="space-y-2 relative" test-id="planned-schedule-entry-field">
                        <span class="absolute -top-3 right-0">
                            <AddAndReload
                                :href="editSelectedProgramHref"
                                :add-text="t('audit.program_form.breadcrumb_edit')"
                                :reload-text="t('common.reload')"
                                @reload="reloadSelectedAuditProgram"
                            />
                        </span>
                        <label class="block text-sm">
                            {{ t('audit.schedule_instance.planned_schedule_label') }}
                            <span class="text-red-700">*</span>
                        </label>
                        <div :class="`flex ${!selectedScheduleEntry && showValidationErrors ? 'ring-1 ring-red-500 rounded-md' : ''}`">
                            <Select2
                                v-model="selectedScheduleEntry"
                                :values="scheduleEntryOptions"
                                :display="displayScheduleEntry"
                                :placeholder="t('audit.schedule_instance.planned_schedule_placeholder')"
                                test-id="instance-planned-schedule-select"
                            />
                        </div>
                        <p v-if="!selectedScheduleEntry && showValidationErrors" class="text-red-600 text-xs mt-1">
                            {{ t('audit.validation.schedule_entry_required') }}
                        </p>
                    </div>

                    <div v-if="isUnplannedAudit" class="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div
                            class="space-y-2"
                            test-id="unplanned-process-field"
                        >
                            <label class="block text-sm">
                                {{ t('audit.schedule_instance.unplanned_process_label') }}
                                <span class="text-red-700">*</span>
                            </label>
                            <AppInput
                                v-model="selectedUnplannedProcess"
                                :placeholder="t('audit.schedule_instance.unplanned_process_placeholder')"
                                hide-icon
                                :error="!selectedUnplannedProcess.trim() && showValidationErrors"
                                test-id="instance-unplanned-process-input"
                            />
                            <p v-if="!selectedUnplannedProcess.trim() && showValidationErrors" class="text-red-600 text-xs mt-1">
                                {{ t('audit.validation.schedule_entry_incomplete') }}
                            </p>
                        </div>

                        <div class="space-y-2" test-id="unplanned-reason-field">
                            <AppTextareaForm
                                name="unplannedReason"
                                :label="t('audit.schedule_instance.unplanned_reason_label')"
                                :placeholder="t('audit.schedule_instance.unplanned_reason_placeholder')"
                                :value="unplannedReason"
                                :rules="(v: any) => (!isUnplannedAudit || v?.trim() ? true : t('audit.validation.amendment_reason_required'))"
                                required
                                test-id="instance-unplanned-reason-input"
                            />
                        </div>
                    </div>

                    <div v-if="requiresAmendment" class="space-y-2" test-id="amendment-reason-field">
                        <AppTextareaForm
                            name="amendmentReason"
                            :label="t('audit.program_cards.amendment_reason_label')"
                            :placeholder="t('audit.program_cards.amendment_reason_placeholder')"
                            :rules="(v: any) => (!v?.trim() ? t('audit.validation.amendment_reason_required') : true)"
                            required
                            test-id="instance-amendment-reason-input"
                        />
                        <p class="text-xs text-amber-700">
                            {{ t('audit.schedule_instance.amendment_reason_hint') }}
                        </p>
                    </div>

                    <div class="space-y-2" test-id="audit-criteria-field">
                        <AppTextareaForm
                            name="criteria"
                            :label="t('audit.schedule_instance.criteria_label')"
                            :value="scheduleForm.criteria"
                            :placeholder="t('audit.schedule_instance.criteria_placeholder')"
                            :rules="(v: any) => (!v?.trim() ? t('audit.validation.criteria_required') : true)"
                            required
                            test-id="instance-criteria-input"
                        />
                    </div>

                    <!-- Checklists Multiselect -->
                    <div class="space-y-2 relative" test-id="checklists-to-be-used-field">
                        <span class="absolute -top-3 right-0">
                            <AddAndReload
                                href="/audits/checklist-definitions/add-checklist"
                                :add-text="t('audit.checklist_definitions_list.add_button')"
                                :reload-text="t('common.reload')"
                                @reload="reloadChecklists"
                            />
                        </span>
                        <label class="block text-sm">{{ t('audit.schedule_instance.checklists_label') }} <span class="text-red-700">*</span></label>
                        <div :class="errors.checklists ? 'ring-1 ring-red-500 rounded' : ''">
                            <SearcheableMultiSelect
                                v-model="selectedChecklists"
                                :results="checklistOptions"
                                :display="(c: ChecklistDefinition) => c?.title"
                                :placeholder="t('audit.schedule_instance.checklists_placeholder')"
                                test-id="instance-checklists-select"
                            />
                        </div>
                        <p v-if="errors.checklists" class="text-red-600 text-xs mt-1">
                            {{ errors.checklists }}
                        </p>
                        <p v-if="!selectedAuditProgram || !auditProgram" class="text-neutral-500 text-xs mt-1">
                            {{ t('audit.schedule_instance.checklists_hint') }}
                        </p>
                    </div>

                    <!-- Location -->
                    <div class="space-y-2" test-id="location-meeting-link-field">
                        <label class="block text-sm">{{ t('audit.schedule_instance.location_label') }}</label>
                        <AppInput
                            v-model="scheduleForm.location"
                            :placeholder="t('audit.schedule_instance.location_placeholder')"
                            hide-icon
                            test-id="instance-location-input"
                        />
                    </div>

                    <!-- Scope -->
                    <div class="space-y-2" test-id="scope-field">
                        <AppTextareaForm
                            name="scope"
                            :label="t('audit.schedule_instance.scope_label')"
                            :value="scheduleForm.scope"
                            :placeholder="t('audit.schedule_instance.scope_placeholder')"
                            :rules="(v: any) => (!v?.trim() ? t('audit.validation.scope_required') : true)"
                            required
                            test-id="instance-scope-input"
                        />
                    </div>

                    <!-- Objective -->
                    <div class="space-y-2" test-id="objective-field">
                        <AppTextareaForm
                            name="objective"
                            :label="t('audit.schedule_instance.objective_label')"
                            :value="scheduleForm.objective"
                            :placeholder="t('audit.schedule_instance.objective_placeholder')"
                            :rules="(v: any) => (!v?.trim() ? t('audit.validation.objective_required') : true)"
                            required
                            test-id="instance-objective-input"
                        />
                    </div>

                    <!-- Status -->
                    <div class="space-y-2" test-id="status-field">
                        <label class="block text-sm">{{ t('audit.schedule_instance.status_label') }}</label>
                        <Select2
                            v-model="selectedStatus"
                            :values="statusOptions"
                            :placeholder="t('audit.schedule_instance.status_placeholder')"
                            :display="displayInstanceStatus"
                            test-id="instance-status-select"
                        />
                    </div>
                </div>
            </section>

            <!-- Section 2: Audit Team Member -->
            <section id="audit-team" class="mb-8 border rounded-lg p-6 bg-white">
                <div class="flex justify-between items-center mb-4" test-id="audit-team-section">
                    <h2 class="text-xl">{{ t('audit.schedule_instance.team_title') }} <span class="text-red-700">*</span></h2>
                    <AppButton type="button" button-style="secondary" @click="openAddTeamMemberModal" test-id="add-team-member-button">
                        <i class="fa-solid fa-plus mr-2"></i>{{ t('audit.schedule_instance.add_team_member') }}
                    </AppButton>
                </div>

                <Table
                    v-if="auditTeam.length > 0"
                    :cols="teamCols"
                    :column-labels="teamColumnLabels"
                    :rows="teamRows"
                    :entities="auditTeam"
                    :page="1"
                    :total="auditTeam.length"
                    :per-page="auditTeam.length"
                    :total-pages="1"
                    :on-next-page="() => {}"
                    :on-previous-page="() => {}"
                    :set-page="() => {}"
                    :on-success="() => {}"
                    :entity-name="t('audit.schedule_instance.team_entity_name')"
                    :handle-delete="removeTeamMember"
                    :hide-view="() => true"
                    :hide-edit="() => false"
                    :on-edit="editTeamMember"
                />

                <div v-else class="border rounded-md p-8 text-center text-neutral-500">
                    {{ t('audit.schedule_instance.empty_team') }}
                </div>
                <p v-if="!auditTeam.length && showValidationErrors" class="text-red-600 text-xs mt-4">
                    {{ t('audit.validation.team_required') }}
                </p>
            </section>

            <!-- Action Buttons -->
            <div class="flex justify-end gap-4">
                <AppButton button-style="secondary" type="button" @click="cancel" test-id="cancel-instance-button"> {{ t('common.cancel') }} </AppButton>
                <AppButton
                    button-style="primary"
                    :loading="submitting"
                    type="submit"
                    test-id="schedule-instance-button"
                >
                    {{ isEditMode ? t('audit.schedule_instance.submit_update') : t('audit.schedule_instance.submit_schedule') }}
                </AppButton>
            </div>
            </Form>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form } from 'vee-validate'
import { useRoute, useRouter } from 'vue-router'
import BreadCrums from '../breadCrums.vue'
import AppInput from '../AppInput.vue'
import AppButton from '../AppButton.vue'
import Table from '../Table.vue'
import Select2 from '../Select2.vue'
import SearcheableMultiSelect from '../SearcheableMultiSelect.vue'
import AppTextareaForm from '../AppTextareaForm.vue'
import { apiGet, apiPost, apiPut } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import type { AuditProgram, ChecklistDefinition, AuditTeamMember, TeamMember, AuditInstance, AuditProgramScheduleEntry } from '@/util/interfaces'

import AddTeamMemberModal from './add-team-member-modal.vue'
import AddAndReload from '../AddAndReload.vue'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '../ConfirmDialog.vue'
import { formatDateToInputWithTime, formatApiErrorMessage } from '@/util/util'
import Spinner from '../Spinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const dialog = useDialog()
const { t, locale } = useI18n()

const displayInstanceStatus = (status: string) => (status ? t(`audit.main.status.${status}`) : '')

// Edit mode detection
const isEditMode = computed(() => !!route.params.instanceId)
const auditInstanceId = computed(() => route.params.instanceId as string)
const auditProgramIdFromRoute = computed(() => route.query.auditProgramId as string)

// Reactive data
const auditProgram = ref<AuditProgram>()
const auditPrograms = ref<AuditProgram[]>([])
const auditInstance = ref<AuditInstance>()
const loading = ref(false)
const loadingAuditInstance = ref(true)
const submitting = ref(false)
const checklists = ref<ChecklistDefinition[]>([])
const auditTeam = ref<AuditTeamMember[]>([])
const selectedChecklists = ref<ChecklistDefinition[]>([])
const selectedStatus = ref<string>('SCHEDULED')
const selectedAuditProgram = ref<AuditProgram>()
const selectedScheduleEntry = ref<AuditProgramScheduleEntry>()
const isUnplannedAudit = ref(false)
const selectedUnplannedProcess = ref('')
const unplannedReason = ref('')
const redirect = route.query.redirect as string
const availablePrograms = ref<AuditProgram[]>([])
const selectedProgram = ref<AuditProgram | null>(null)
const loadingPrograms = ref(false)

// Form data
const scheduleForm = ref({
    startDateTime: '',
    endDateTime: '',
    location: '',
    scope: '',
    objective: '',
    criteria: '',
})

// Validation errors and form-level flags
const errors = ref({
    startDateTime: '',
    endDateTime: '',
    checklists: '',
    program: ''
})
const showValidationErrors = ref(false)

// Add status options
const statusOptions = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']

// Initialize selectedStatus with default value
selectedStatus.value = 'SCHEDULED'

// Table configuration
const teamCols = ['MemberName', 'MemberType', 'AuditRole']

const teamColumnLabels = computed(() => {
    void locale.value
    return {
        MemberName: t('audit.schedule_instance.col_member_name'),
        MemberType: t('audit.schedule_instance.col_type'),
        AuditRole: t('audit.schedule_instance.col_audit_role')
    }
})

const teamRows = computed(() => {
    void locale.value
    return auditTeam.value.map((member) => ({
        id: member.id,
        MemberName: `${member.auditPersonnel.firstName} ${member.auditPersonnel.lastName}`,
        MemberType: member.auditPersonnel.isExternal
            ? t('audit.personnel.type_external')
            : t('audit.personnel.type_internal'),
        AuditRole: member.auditRole.name
    }))
})

const checklistOptions = computed(() => {
    const selectedIds = new Set(selectedChecklists.value.map((c) => c.id))
    return checklists.value.filter((c) => !selectedIds.has(c.id))
})

const scheduleEntryOptions = computed(() =>
    (selectedAuditProgram.value?.scheduleEntries || []).filter((entry) => !entry.isUnplanned)
)

const hasPlannedScheduleEntries = computed(() => scheduleEntryOptions.value.length > 0)

const editSelectedProgramHref = computed(() =>
    selectedAuditProgram.value?.id ? `/check/audits/${selectedAuditProgram.value.id}/edit` : undefined
)

const getDatePartsFromInput = (value?: string) => {
    if (!value) return undefined
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return undefined
    return { month: date.getMonth() + 1, year: date.getFullYear() }
}

const requiresAmendment = computed(() => {
    if (!selectedScheduleEntry.value || !scheduleForm.value.startDateTime || !scheduleForm.value.endDateTime) {
        return false
    }

    const plannedMonth = Number(selectedScheduleEntry.value.month)
    const plannedYear = Number(selectedScheduleEntry.value.year)
    const start = getDatePartsFromInput(scheduleForm.value.startDateTime)
    const end = getDatePartsFromInput(scheduleForm.value.endDateTime)
    return (
        start?.month !== plannedMonth ||
        end?.month !== plannedMonth ||
        start?.year !== plannedYear ||
        end?.year !== plannedYear
    )
})

const displayScheduleEntry = (entry?: AuditProgramScheduleEntry) => {
    if (!entry) return ''
    const monthName = monthOptions.value.find((month) => month.id === Number(entry.month))?.name || entry.month
    const year = entry.year ? ` ${entry.year}` : ''
    return `${monthName}${year} - ${entry.process || t('training.main.na')}`
}

const monthOptions = computed(() => {
    void locale.value
    return [
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
    ]
})

const crums = computed(() => {
    void locale.value
    const crumbs: any[] = [
        {
            name: t('reports.modules.audits'),
            path: '/check/audits',
            icon: 'fa-solid fa-chart-line'
        }
    ]

    if (auditProgramIdFromRoute.value) {
        crumbs.push(
            {
                name: t('common.settings'),
                path: '/check/audits/settings?tab=4',
                icon: 'fa-solid fa-gear text-neutral-700 text-2xl'
            },
            {
                name: selectedAuditProgram.value?.title || t('audit.schedule_instance.breadcrumb_program_fallback'),
                path: `/check/audits/${auditProgramIdFromRoute.value}`,
                icon: 'fa-solid fa-file-pen'
            }
        )
    }

    if (isEditMode.value) {
        crumbs.push({
            name: t('audit.schedule_instance.breadcrumb_edit'),
            path: route.path,
            icon: 'fa-solid fa-edit'
        })
    } else {
        crumbs.push({
            name: t('audit.schedule_instance.breadcrumb_schedule'),
            path: route.path,
            icon: 'fa-solid fa-plus'
        })
    }

    return crumbs
})

// Methods
const validateInstanceForm = (values: any) => {
    // Sync scope & objective from vee-validate form into local form state
    if (values) {
        scheduleForm.value.scope = values.scope?.trim() || ''
        scheduleForm.value.objective = values.objective?.trim() || ''
        scheduleForm.value.criteria = values.criteria?.trim() || ''
        unplannedReason.value = values.unplannedReason?.trim() || ''
    }

    // Reset errors managed via local state
    errors.value = {
        startDateTime: '',
        endDateTime: '',
        checklists: '',
        program: ''
    }

    // Turn on global validation styling
    showValidationErrors.value = true

    // Validate required fields
    let hasErrors = false

    // Audit Program & Audit Criteria (required, use showValidationErrors for UI)
    if (!selectedAuditProgram.value) {
        hasErrors = true
    }

    if (!scheduleForm.value.criteria) {
        hasErrors = true
    }

    if (!scheduleForm.value.startDateTime) {
        errors.value.startDateTime = t('audit.validation.start_required')
        hasErrors = true
    }

    if (!scheduleForm.value.endDateTime) {
        errors.value.endDateTime = t('audit.validation.end_required')
        hasErrors = true
    }

    if (scheduleForm.value.startDateTime && scheduleForm.value.endDateTime) {
        const startDate = new Date(scheduleForm.value.startDateTime)
        const endDate = new Date(scheduleForm.value.endDateTime)
        if (endDate <= startDate) {
            errors.value.endDateTime = t('audit.validation.end_after_start')
            hasErrors = true
        }
    }

    if (hasPlannedScheduleEntries.value && !isUnplannedAudit.value && !selectedScheduleEntry.value) {
        hasErrors = true
    }

    if (isUnplannedAudit.value) {
        if (!selectedUnplannedProcess.value.trim()) {
            hasErrors = true
        }

        if (!unplannedReason.value) {
            hasErrors = true
        }
    }

    if (requiresAmendment.value && !values.amendmentReason?.trim()) {
        hasErrors = true
    }

    if (!selectedChecklists.value || selectedChecklists.value.length === 0) {
        errors.value.checklists = t('audit.validation.checklists_required')
        hasErrors = true
    }

    // Validate audit team - at least one member required
    if (!auditTeam.value || auditTeam.value.length === 0) {
        hasErrors = true
    }

    return hasErrors
}

const onInvalidSubmit = (ctx: any) => {
    validateInstanceForm(ctx?.values || {})
}

const reloadSelectedAuditProgram = async () => {
    const currentProgramId = selectedAuditProgram.value?.id
    if (!currentProgramId) {
        await fetchAuditPrograms()
        return
    }

    try {
        const refreshed = await apiGet<AuditProgram>(`/audits/programs/${currentProgramId}`, authStore)
        const programIndex = auditPrograms.value.findIndex((program) => program.id === currentProgramId)
        if (programIndex > -1) {
            auditPrograms.value[programIndex] = refreshed
        }

        const previousScheduleEntryId = selectedScheduleEntry.value?.id

        selectedAuditProgram.value = refreshed
        auditProgram.value = refreshed
        await fetchChecklists(refreshed.id)
        if (previousScheduleEntryId) {
            selectedScheduleEntry.value = (refreshed.scheduleEntries || []).find(
                (entry) => entry.id === previousScheduleEntryId && !entry.isUnplanned
            )
        }
    } catch (error) {
        console.error('Error reloading audit program:', error)
        toast.showToast(t('common.error'), t('audit.program_details.toast_program_failed'), 'error')
    }
}

const reloadChecklists = async () => {
    if (selectedAuditProgram.value?.id) {
        await fetchChecklists(selectedAuditProgram.value.id)
    }
}

const fetchAuditPrograms = async () => {
    try {
        const response = await apiGet<AuditProgram[]>(
            `/audits/programs?excludeDraft=true`,
            authStore
        )
        auditPrograms.value = response || []
        const programId = auditProgramIdFromRoute.value
        if (programId) {
            const program = auditPrograms.value.find((p) => p.id === programId)
            if (program) {
                selectedAuditProgram.value = program
                await fetchChecklists(program.id)
            }
        }
    } catch (error) {
        console.error('Error fetching audit programs:', error)
        toast.showToast(t('common.error'), t('audit.schedule_instance.toast_fetch_programs_failed'), 'error')
    }
}

const fetchAuditInstance = async () => {
    if (!isEditMode.value) return

    try {
        loadingAuditInstance.value = true
        const response = await apiGet<AuditInstance>(
            `/audits/instances/${auditInstanceId.value}`,
            authStore
        )

        auditInstance.value = response

        // Set selected audit program and load its checklists

        if (response.auditProgram?.id) {
            selectedAuditProgram.value = response.auditProgram
            await fetchChecklists(selectedAuditProgram.value.id)
        }


        // Populate form with existing data
        if (response.startDate) {
            scheduleForm.value.startDateTime = formatDateToInputWithTime(response.startDate)
        }
        if (response.endDate) {
            scheduleForm.value.endDateTime = formatDateToInputWithTime(response.endDate)
        }
        isUnplannedAudit.value = !!response.scheduleEntry?.isUnplanned
        selectedScheduleEntry.value = response.scheduleEntry && !response.scheduleEntry.isUnplanned
            ? (response.auditProgram.scheduleEntries || []).find((entry) => entry.id === response.scheduleEntry?.id) || response.scheduleEntry
            : undefined
        selectedUnplannedProcess.value = response.scheduleEntry?.isUnplanned
            ? response.scheduleEntry.process || ''
            : ''
        unplannedReason.value = response.scheduleEntry?.isUnplanned
            ? response.scheduleEntry.amendmentReason || ''
            : ''
        scheduleForm.value.location = response.location || ''
        scheduleForm.value.scope = response.scope || ''
        scheduleForm.value.objective = response.objective || ''
        scheduleForm.value.criteria = response.criteria || ''
        // Set selectedStatus based on response
        selectedStatus.value = response.status || 'SCHEDULED'

        // Set selected checklist if available
        if (response.ChecklistDefinitions && response.ChecklistDefinitions.length > 0) {
            const setSelectedFromInstance = () => {
                const instanceChecklistIds = response.ChecklistDefinitions?.map((c: any) => `${c.id}`)
                selectedChecklists.value = (checklists.value || []).filter((cd: any) => instanceChecklistIds?.includes(`${cd.id}`))
            }
            if (checklists.value && checklists.value.length > 0) {
                setSelectedFromInstance()
            } else {
                const stop = watch(checklists, (val) => {
                    if (val && val.length > 0) {
                        setSelectedFromInstance()
                        stop()
                    }
                })
            }
        }

        // Populate audit team members if available
        if (response.teamMembers && response.teamMembers.length > 0) {
            // Map the API response structure to frontend structure
            auditTeam.value = response.teamMembers.map(member => ({
                id: member.id,
                auditPersonnel: {
                    id: member.auditPersonnel.id,
                    firstName: member.auditPersonnel.fname,
                    lastName: member.auditPersonnel.lname,
                    email: member.auditPersonnel.email,
                    employeeId: member.auditPersonnel.employeeId,
                    isExternal: member.auditPersonnel.isExternal,
                    isActive: member.auditPersonnel.isActive,
                    createdBy: member.auditPersonnel.createdBy,
                    deleted: member.auditPersonnel.deleted
                },
                auditRole: member.auditRole,
                assignedAt: member.assignedAt,
                assignedBy: member.assignedBy
            }))
        }

    } catch (error) {
        console.error('Error fetching audit instance:', error)
        toast.showToast(t('common.error'), t('audit.schedule_instance.toast_fetch_instance_failed'), 'error')
        router.push(redirect || '/check/audits')
    } finally {
        loadingAuditInstance.value = false
    }
}

// New checklist fetcher: sends only auditProgramId to backend.
const fetchChecklists = async (auditProgramId: string) => {
    try {
        if (!auditProgramId) {
            checklists.value = []
            return
        }

        const query = new URLSearchParams({ auditProgramId })

        const response = await apiGet<ChecklistDefinition[]>(
            `/audits/checklist-definitions?${query.toString()}`,
            authStore
        )

        checklists.value = (response || [])

    } catch (error) {
        console.error('Error fetching checklists by auditProgramId:', error)
        checklists.value = []
    }
}

// React to changes in selected audit program and fetch corresponding checklists.
watch(selectedAuditProgram, (newProgram, oldProgram) => {
    if (!newProgram) {
        auditProgram.value = undefined
        checklists.value = []
        selectedChecklists.value = []
        return
    }

    if (oldProgram && newProgram.id === oldProgram.id) {
        auditProgram.value = newProgram
        fetchChecklists(newProgram.id)
        return
    }

    // Clear existing selections when program changes
    selectedChecklists.value = []
    checklists.value = []
    selectedScheduleEntry.value = undefined
    selectedUnplannedProcess.value = ''
    unplannedReason.value = ''
    isUnplannedAudit.value = !(newProgram.scheduleEntries || []).some((entry) => !entry.isUnplanned)

    // Keep current program for breadcrumb/title usage
    auditProgram.value = newProgram

    fetchChecklists(newProgram.id)
})

const removeTeamMember = (member: TeamMember) => {
    dialog.openDialog(ConfirmDialog, {
        title: t('audit.schedule_instance.remove_member_title'),
        message: t('audit.schedule_instance.remove_member_confirm'),
        onConfirm: () => {
            const index = auditTeam.value.findIndex((m) => m.id === member.id)
            if (index > -1) {
                auditTeam.value.splice(index, 1)
            }
            dialog.closeDialog()
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
   
}

const openAddTeamMemberModal = (id?: string) => {
    dialog.openDialog(AddTeamMemberModal, {
        existingMembers: auditTeam.value,
        onSave: (teamMember: AuditTeamMember) => {
            // Double-check to prevent duplicates
            const existingMember = auditTeam.value.find(
                member => member.auditPersonnel.id === teamMember.auditPersonnel.id
            )
            if (existingMember) {
                toast.showToast(t('common.error'), t('audit.schedule_instance.toast_duplicate_member'), 'error')
                return
            }
            
            auditTeam.value.push(teamMember)
            dialog.closeDialog()
        },
        onCancel: () => {
            dialog.closeDialog()
        },
        dialogCommand: (id: string) => {
            openAddTeamMemberModal(id)
        },
        id: id
    })
}

const editTeamMember = (member: TeamMember) => {
    dialog.openDialog(AddTeamMemberModal, {
        existingMembers: auditTeam.value,
        editingMember: member,
        onSave: (updatedMember: AuditTeamMember) => {
            // Find and update the member in the array
            const index = auditTeam.value.findIndex(m => m.id === updatedMember.id)
            if (index > -1) {
                auditTeam.value[index] = updatedMember
                toast.showToast(t('common.success'), t('audit.schedule_instance.toast_member_updated'), 'success')
            }
            dialog.closeDialog()
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}

const scheduleInstance = async (values: any) => {
    const hasErrors = validateInstanceForm(values)
    if (hasErrors) return

    try {
        submitting.value = true

        if (isEditMode.value) {
            // Update existing audit instance - use different field names for update DTO
            const updateData = {
                auditProgramId: selectedAuditProgram.value?.id || undefined,
                startDate: new Date(scheduleForm.value.startDateTime).getTime(),
                endDate: new Date(scheduleForm.value.endDateTime).getTime(),
                assignedChecklistDefinitionIds: selectedChecklists.value.map((c) => c.id),
                location: scheduleForm.value.location,
                scope: scheduleForm.value.scope,
                objective: scheduleForm.value.objective,
                criteria: scheduleForm.value.criteria,
                scheduleEntryId: isUnplannedAudit.value ? undefined : selectedScheduleEntry.value?.id,
                isUnplanned: isUnplannedAudit.value,
                unplannedProcess: isUnplannedAudit.value ? selectedUnplannedProcess.value.trim() : undefined,
                amendmentReason: isUnplannedAudit.value
                    ? unplannedReason.value
                    : requiresAmendment.value ? values.amendmentReason?.trim() : undefined,
                status: selectedStatus.value || 'SCHEDULED',
                teamMembers: auditTeam.value.map(member => ({
                    id: !member.id.includes('temp_') ? member.id : undefined,
                    auditPersonnel: {
                        id: member.auditPersonnel.id.toString(),
                        fname: member.auditPersonnel.firstName,
                        lname: member.auditPersonnel.lastName
                    },
                    auditRole: {
                        id: member.auditRole.id,
                        name: member.auditRole.name
                    }
                }))
            }
            await apiPut(`/audits/instances/${auditInstanceId.value}`, updateData, authStore)
            toast.showToast(t('common.success'), t('audit.schedule_instance.toast_instance_updated'), 'success')
        } else {
            // Create new audit instance
            const programId = selectedProgram.value?.id || selectedAuditProgram.value?.id
            const createData = {
                auditProgramId: selectedAuditProgram.value?.id || undefined,
                startDate: new Date(scheduleForm.value.startDateTime).getTime(),
                endDate: new Date(scheduleForm.value.endDateTime).getTime(),
                checklistDefinitionIds: selectedChecklists.value.map((c) => c.id),
                location: scheduleForm.value.location,
                scope: scheduleForm.value.scope,
                objective: scheduleForm.value.objective,
                criteria: scheduleForm.value.criteria,
                scheduleEntryId: isUnplannedAudit.value ? undefined : selectedScheduleEntry.value?.id,
                isUnplanned: isUnplannedAudit.value,
                unplannedProcess: isUnplannedAudit.value ? selectedUnplannedProcess.value.trim() : undefined,
                amendmentReason: isUnplannedAudit.value
                    ? unplannedReason.value
                    : requiresAmendment.value ? values.amendmentReason?.trim() : undefined,
                status: selectedStatus.value || 'SCHEDULED',
                teamMembers: auditTeam.value.map(member => ({
                    auditPersonnel: {
                        id: member.auditPersonnel.id.toString(),
                        fname: member.auditPersonnel.firstName,
                        lname: member.auditPersonnel.lastName
                    },
                    auditRole: {
                        id: member.auditRole.id,
                        name: member.auditRole.name
                    }
                }))
            }
            await apiPost('/audits/instances', createData, authStore)
            toast.showToast(t('common.success'), t('audit.schedule_instance.toast_instance_scheduled'), 'success')
        }

        router.push(redirect || '/check/audits')
    } catch (error: any) {
        console.error('Error saving audit instance:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') || t('audit.schedule_instance.toast_save_failed'),
            'error'
        )
    } finally {
        submitting.value = false
    }
}

const cancel = () => {
    router.push(redirect || '/check/audits')
}

// Watch selectedChecklists to clear error when checklist is selected
watch(selectedChecklists, (newVal) => {
    if (newVal && newVal.length > 0 && errors.value.checklists) {
        errors.value.checklists = ''
    }
}, { immediate: true, deep: true })

watch(isUnplannedAudit, (newVal) => {
    if (newVal) {
        selectedScheduleEntry.value = undefined
        return
    }

    selectedUnplannedProcess.value = ''
    unplannedReason.value = ''
})

// Lifecycle
onMounted(async () => {
    await fetchAuditPrograms()
    if (isEditMode.value) {
        await fetchAuditInstance()
    } else {
        loadingAuditInstance.value = false
    }
})
</script>
