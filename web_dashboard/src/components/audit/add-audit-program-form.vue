<template>
    <div>
        <Breadcrumb :crumbs="programFormCrumbs"></Breadcrumb>
        <Form class="p-6 bg-neutral-50" @submit="handleSubmit" @invalid-submit="onInvalidSubmit" v-if="!loadingEntity"
            test-id="audit-program-form">
            <div class="max-w-4xl mx-auto space-y-6">
                <!-- Main Audit Program Section -->
                <section id="audit-program-section" class="bg-white border border-neutral-200 rounded-lg p-8">
                    <div class="space-y-4">
                        <div>
                            <AppInputForm :label="t('audit.program_form.program_title_label')" name="programTitle"
                                :value="auditProgram?.title"
                                :placeholder="t('audit.program_form.program_title_placeholder')"
                                :rules="(v: any) => (!v ? t('audit.validation.program_title_required') : true)" required
                                test-id="program-title-input" />
                        </div>

                        <div>
                            <label class="block mb-2 text-sm">{{ t('audit.program_form.activity_type_label') }} <span
                                    class="text-red-700">*</span></label>
                            <div v-if="!isScheduled">
                                <Select2 v-model="selectedActivityType" :values="activityTypes"
                                    :display="(val: any) => val?.name || ''"
                                    :placeholder="t('audit.program_form.activity_type_placeholder')"
                                    test-id="program-activity-type-select" />
                            </div>
                            <div v-else class="text-gray-500 pt-2">
                                {{ selectedActivityType?.name }}
                            </div>
                        </div>



                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block mb-2 text-sm">{{ t('audit.program_form.start_date_label') }} <span
                                        class="text-red-700">*</span></label>
                                <AppInput v-model="programStartDate" type="date" hide-icon
                                    test-id="program-start-date-input" />
                            </div>
                            <div>
                                <label class="block mb-2 text-sm">{{ t('audit.program_form.duration_label') }} <span
                                        class="text-red-700">*</span></label>
                                <AppInput v-model="programDuration" type="number" min="1" hide-icon
                                    :placeholder="t('audit.program_form.duration_placeholder')"
                                    test-id="program-duration-input" />
                            </div>
                        </div>

                        <div class="grid grid-cols-1 gap-6">
                            <div class="relative">
                                <span class="absolute -top-3 right-0">
                                    <AddAndReload :add-text="t('audit.program_form.add_qms_standard')"
                                        :reload-text="t('audit.program_form.reload_qms_standard')"
                                        href="/plan/standards/add" @reload="fetchStandards" />
                                </span>
                                <label class="block mb-2 text-sm">{{ t('audit.program_form.qms_standard_label') }} <span
                                        class="text-red-700">*</span></label>
                                <SearcheableMultiSelect v-model="selectedStandards" :results="standardOptions"
                                    :display="(val: any) => val?.name || ''"
                                    :placeholder="t('audit.program_form.qms_standard_placeholder')" />
                            </div>
                        </div>

                        <div>
                            <AppTextareaForm name="programScope" :label="t('audit.program_form.program_scope_label')"
                                :value="auditProgram?.scope"
                                :placeholder="t('audit.program_form.program_scope_placeholder')"
                                :rules="(v: any) => (!v?.trim() ? t('audit.validation.scope_required') : true)" required
                                test-id="program-scope-input" />
                        </div>

                        <div>
                            <AppTextareaForm name="programObjective"
                                :label="t('audit.program_form.program_objective_label')"
                                :value="auditProgram?.objective"
                                :placeholder="t('audit.program_form.program_objective_placeholder')"
                                :rules="(v: any) => (!v?.trim() ? t('audit.validation.objective_required') : true)"
                                required test-id="program-objective-input" />
                        </div>

                        <div v-if="!isScheduled">
                            <label class="block mb-2 text-sm">{{ t('audit.program_form.initial_status_label') }} <span
                                    class="text-red-700">*</span></label>
                            <Select2 v-model="selectedInitialStatus" :values="statuses" :display="displayProgramStatus"
                                :placeholder="t('audit.program_form.initial_status_placeholder')"
                                test-id="program-initial-status-select" />
                        </div>
                    </div>
                </section>

                <section id="annual-schedule-area" class="mb-6 border border-neutral-200 rounded-lg bg-white p-6">
                    <div class="flex items-center justify-between mb-5">
                        <div>
                            <h3 class="text-base">{{ t('audit.program_form.annual_schedule_section') }}</h3>
                            <p class="text-sm text-neutral-500">{{ t('audit.program_form.annual_schedule_hint') }}</p>
                        </div>
                        <Can :actions="['create', 'update']" :subjects="['audit_programs']">
                            <AppButton button-style="secondary" @click="addScheduleEntry" type="button"
                                test-id="add-schedule-entry-button">
                                <i class="fa-solid fa-plus mr-2"></i>
                                {{ t('audit.program_form.add_schedule_entry') }}
                            </AppButton>
                        </Can>
                    </div>

                    <div class="space-y-4">
                        <div v-for="(entry, entryIndex) in scheduleEntries" :key="entry.uiId"
                            class="border border-neutral-200 rounded-lg p-4">
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label class="block mb-2 text-sm">{{ t('audit.program_form.year_label') }} <span
                                            class="text-red-700">*</span></label>
                                    <Select2 v-model="entry.yearOption" :values="coveredYearOptions"
                                        :display="(val: any) => val?.name || ''"
                                        :placeholder="t('audit.program_form.year_placeholder')" />
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm">{{ t('audit.program_form.month_label') }} <span
                                            class="text-red-700">*</span></label>
                                    <Select2 v-model="entry.monthOption" :values="monthsForYear(entry.yearOption?.id)"
                                        :display="(val: any) => val?.name || ''"
                                        :placeholder="t('audit.program_form.month_placeholder')" />
                                </div>
                                
                                <div class="flex items-end justify-end">
                                    <button type="button" class="text-neutral-400 hover:text-neutral-700 mb-2"
                                        :title="t('audit.program_form.delete_schedule_entry_title')"
                                        @click="removeScheduleEntry(entryIndex)">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="my-4">
                                <label class="block mb-2 text-sm">{{ t('audit.program_form.schedule_process_label')
                                    }} <span class="text-red-700">*</span></label>
                                <AppInput v-model="entry.process"
                                    :placeholder="t('audit.program_form.schedule_process_placeholder')" hide-icon />
                            </div>
                            <div class="mt-4">
                                <label class="block mb-2 text-sm">{{ t('audit.program_form.schedule_notes_label')
                                    }}</label>
                                <AppInput v-model="entry.notes"
                                    :placeholder="t('audit.program_form.schedule_notes_placeholder')" hide-icon />
                            </div>
                            <div v-if="entry.isUnplanned"
                                class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                <strong>{{ t('audit.program_cards.unplanned_badge') }}:</strong>
                                {{ entry.amendmentReason || t('audit.program_cards.no_amendment_reason') }}
                            </div>
                        </div>

                        <div v-if="scheduleEntries.length === 0" class="text-center py-8 text-neutral-500">
                            {{ t('audit.program_form.empty_schedule_entries') }}
                        </div>
                    </div>
                </section>

                <!-- Audit Instances Section -->
                <!-- <section id="audit-instances-area" class="mb-6">
                    <div class="flex items-center justify-between mb-5">
                        <h3 class="text-base">{{ t('audit.program_form.instances_section') }}</h3>
                        <Can :actions="['create', 'update']" :subjects="['audit_programs']">
                            <AppButton button-style="primary" @click="addAuditInstance" type="button"
                                test-id="add-audit-instance-button">
                                <i class="fa-solid fa-plus mr-2"></i>
                                {{ t('audit.program_form.add_instance') }}
                            </AppButton>
                        </Can>
                    </div>

                    <div class="flex flex-col gap-6" id="audit-instances-list">
                        <div v-for="(instance, instanceIndex) in auditInstances" :key="instance.id" :id="instance.id"
                            class="border border-neutral-200 rounded-lg bg-white">
                            <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-100 cursor-pointer hover:bg-neutral-50 transition-colors"
                                @click="toggleInstanceCollapse(instance.id)">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid transition-transform duration-200"
                                        :class="isInstanceCollapsed(instance.id) ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
                                    <span class="text-neutral-900 font-medium">
                                        {{ t('audit.program_form.instance_heading', { n: instanceIndex + 1 }) }}
                                    </span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <Can :actions="['create', 'update']" :subjects="['audit_programs']">
                                        <button type="button" @click.stop="removeAuditInstance(instanceIndex)"
                                            class="text-neutral-400 hover:text-neutral-700"
                                            :title="t('audit.program_form.delete_instance_title')">
                                            <i class="fa-solid fa-trash-can"></i>
                                        </button>
                                    </Can>
                                </div>
                            </div>

                            <div v-show="!isInstanceCollapsed(instance.id)"
                                class="px-5 py-4 space-y-4 transition-all duration-200">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="space-y-2">
                                        <label class="block text-sm">{{ t('audit.program_form.start_datetime_label') }}
                                            <span class="text-red-700">*</span></label>
                                        <AppInput type="datetime-local" v-model="instance.startDateTime" hide-icon
                                            required
                                            :error="!!instance.errors?.startDateTime || (!instance.startDateTime && showValidationErrors)"
                                            @input="() => {
                                                if (!instance.errors) instance.errors = {}
                                                instance.errors.startDateTime = ''
                                                // Clear end date error if start date changes and end date becomes valid
                                                if (instance.endDateTime && instance.startDateTime && new Date(instance.endDateTime) > new Date(instance.startDateTime)) {
                                                    instance.errors.endDateTime = ''
                                                }
                                            }" :test-id="`instance-${instance.id}-start-datetime-input`" />
                                        <p v-if="instance.errors?.startDateTime" class="text-red-600 text-xs mt-1">
                                            {{ instance.errors.startDateTime }}
                                        </p>
                                        <p v-else-if="!instance.startDateTime && showValidationErrors"
                                            class="text-red-600 text-xs mt-1">
                                            {{ t('audit.validation.start_required') }}
                                        </p>
                                    </div>
                                    <div class="space-y-2">
                                        <label class="block text-sm">{{ t('audit.program_form.end_datetime_label') }}
                                            <span class="text-red-700">*</span></label>
                                        <AppInput type="datetime-local" v-model="instance.endDateTime" hide-icon
                                            required :disabled="!instance.startDateTime"
                                            :min="instance.startDateTime || undefined"
                                            :error="!!instance.errors?.endDateTime || (!instance.endDateTime && showValidationErrors)"
                                            @input="() => {
                                                if (!instance.errors) instance.errors = {}
                                                // Validate end date is after start date
                                                if (instance.startDateTime && instance.endDateTime) {
                                                    const startDate = new Date(instance.startDateTime)
                                                    const endDate = new Date(instance.endDateTime)
                                                    if (endDate <= startDate) {
                                                        instance.errors.endDateTime = t('audit.validation.end_after_start')
                                                    } else {
                                                        instance.errors.endDateTime = ''
                                                    }
                                                } else {
                                                    instance.errors.endDateTime = ''
                                                }
                                            }" :test-id="`instance-${instance.id}-end-datetime-input`" />
                                        <p v-if="instance.errors?.endDateTime" class="text-red-600 text-xs mt-1">
                                            {{ instance.errors.endDateTime }}
                                        </p>
                                        <p v-else-if="!instance.endDateTime && showValidationErrors"
                                            class="text-red-600 text-xs mt-1">
                                            {{ t('audit.validation.end_required') }}
                                        </p>
                                        <p v-if="!instance.startDateTime" class="text-neutral-500 text-xs mt-1">
                                            {{ t('audit.validation.select_start_first') }}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label class="block mb-2 text-sm">{{ t('audit.schedule_instance.planned_schedule_label') }}</label>
                                    <Select2 v-model="instance.scheduleEntry" :values="scheduleEntryOptions"
                                        :display="displayScheduleEntry"
                                        :placeholder="t('audit.schedule_instance.planned_schedule_placeholder')"
                                        :test-id="`instance-${instance.id}-schedule-entry-select`" />
                                </div>
                                <div v-if="requiresInstanceAmendment(instance)">
                                    <AppTextareaForm :name="`instance-${instance.id}-amendment-reason`"
                                        :label="t('audit.program_cards.amendment_reason_label')"
                                        :placeholder="t('audit.program_cards.amendment_reason_placeholder')"
                                        :rules="(v: any) => (!v?.trim() ? t('audit.validation.amendment_reason_required') : true)"
                                        required :test-id="`instance-${instance.id}-amendment-reason-input`" />
                                    <p class="text-xs text-amber-700 mt-1">
                                        {{ t('audit.schedule_instance.amendment_reason_hint') }}
                                    </p>
                                </div>
                                <div>
                                    <AppTextareaForm :name="`instance-${instance.id}-criteria`"
                                        :label="t('audit.program_form.criteria_label')" :value="instance.criteria"
                                        :placeholder="t('audit.program_form.criteria_placeholder')"
                                        :rules="(v: any) => (!v?.trim() ? t('audit.validation.criteria_required') : true)"
                                        required :test-id="`instance-${instance.id}-criteria-input`" />
                                </div>
                                <div>
                                    <AppTextareaForm :name="`instance-${instance.id}-scope`"
                                        :label="t('audit.program_form.scope_label')" :value="instance.scope"
                                        :placeholder="t('audit.program_form.scope_placeholder')"
                                        :rules="(v: any) => (!v?.trim() ? t('audit.validation.scope_required') : true)"
                                        required :test-id="`instance-${instance.id}-scope-input`" />
                                </div>
                                <div>
                                    <AppTextareaForm :name="`instance-${instance.id}-objective`"
                                        :label="t('audit.program_form.objective_label')" :value="instance.objective"
                                        :placeholder="t('audit.program_form.objective_placeholder')"
                                        :rules="(v: any) => (!v?.trim() ? t('audit.validation.objective_required') : true)"
                                        required :test-id="`instance-${instance.id}-objective-input`" />
                                </div>
                            </div>
                        </div>

                        <div v-if="auditInstances.length === 0" class="text-center py-8 text-neutral-500">
                            {{ t('audit.program_form.empty_instances') }}
                        </div>
                    </div>
                </section> -->

                <!-- Action Buttons -->
                <Can :subjects="['audit_programs']" :actions="['create', 'update']">
                    <section id="page-actions-block" class="flex items-center gap-4 justify-end">
                        <AppButton buttonStyle="secondary" type="button"
                            @click="router.push('/check/audits/settings?tab=4')" class="px-4 py-2"
                            test-id="cancel-audit-program-button">
                            {{ t('audit.program_form.cancel') }}
                        </AppButton>
                        <AppButton buttonStyle="primary" :loading="loading" type="submit" class="px-4 py-2"
                            test-id="save-audit-program-button">{{ t('audit.program_form.save') }}
                        </AppButton>
                    </section>
                </Can>
            </div>
        </Form>
        <div v-else>
            <div class="flex justify-center items-center h-full">
                <Spinner width="5" />
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Breadcrumb from '../breadCrums.vue'
import { Form } from 'vee-validate'
import AppInputForm from '../AppInputForm.vue'
import AppInput from '../AppInput.vue'
import AppButton from '../AppButton.vue'
import Select2 from '../Select2.vue'
import AppTextareaForm from '../AppTextareaForm.vue'
import { apiPost, apiGet, apiPut, apiDelete } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import Can from '../Can.vue'
import { useToast } from '@/stores/notification'
import { type AuditActivityType, AUDIT_STATUS_OPTIONS, type AuditProgram, AuditProgramStatus, type StatusOption, type AuditProgramScheduleEntry, type StandardDto } from '@/util/interfaces'
import { useRouter, useRoute } from 'vue-router'
import Spinner from '../Spinner.vue'
import { formatDateToInput, formatDateToInputWithTime, formatApiErrorMessage, programCoveredYears, dateInputToUtcMillis, scheduleMonthInProgram } from '@/util/util'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '../ConfirmDialog.vue'
import AddAndReload from '../AddAndReload.vue'
import SearcheableMultiSelect from '../SearcheableMultiSelect.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const authStore = useAuthStore()
const dialog = useDialog()
const { t, locale } = useI18n()

const programFormCrumbs = computed(() => {
    void locale.value
    return [
        {
            name: t('reports.modules.audits'),
            path: '/check/audits',
            icon: 'fa-solid fa-chart-line'
        },
        {
            name: t('common.settings'),
            path: '/check/audits/settings?tab=4',
            icon: 'fa-solid fa-gear text-neutral-700 text-2xl'
        },
        {
            name: isEdit ? t('audit.program_form.breadcrumb_edit') : t('audit.program_form.breadcrumb_create'),
            path: '/check/audits/add',
            icon: 'fa-solid fa-plus'
        }
    ]
})

const displayProgramStatus = (val?: StatusOption) =>
    val?.id ? t(`audit.program_status.${val.id}`) : ''
const loading = ref(false)
const selectedActivityType = ref<any>()
const selectedInitialStatus = ref<any>()
const activityTypes = ref<any[]>([])
const statuses = ref<any[]>([AUDIT_STATUS_OPTIONS[1], AUDIT_STATUS_OPTIONS[2]])
const id = route.params.id as string
const isEdit = !!id
const loadingEntity = ref(!!id)
const auditProgram = ref<AuditProgram>()
const isScheduled = ref(false)
const selectedStandards = ref<StandardDto[]>([])
const programStartDate = ref('')
const programDuration = ref('')
const createUuid = () => crypto.randomUUID()
const createUiId = (prefix: string) => `${prefix}-${createUuid()}`

type ScheduleEntryForm = {
    uiId: string
    id?: string
    yearOption?: { id: number; name: string }
    monthOption?: { id: number; name: string }
    process?: string
    notes?: string
    isUnplanned?: boolean
    amendmentReason?: string
    auditInstanceId?: string
}

let scheduleEntryIdCounter = 1
const scheduleEntries = ref<ScheduleEntryForm[]>([])

// Audit Instances Management
let auditInstanceIdCounter = 1
const auditInstances = ref<Array<{
    id: string // Temporary UI ID
    realId?: string // Database ID for existing instances
    startDateTime?: string
    endDateTime?: string
    scope?: string
    objective?: string
    criteria?: string
    scheduleEntry?: ScheduleEntryForm
    errors?: {
        startDateTime?: string
        endDateTime?: string
    }
}>>([])


const standardOptions = ref<StandardDto[]>([])

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

const coveredYearOptions = computed(() =>
    programCoveredYears(
        programStartDate.value ? dateInputToUtcMillis(programStartDate.value) : undefined,
        Number(programDuration.value)
    ).map((year) => ({ id: year, name: String(year) }))
)

const monthsForYear = (year?: number) => {
    if (!year || !programStartDate.value) return []
    const startDate = dateInputToUtcMillis(programStartDate.value)
    const duration = Number(programDuration.value)
    return monthOptions.value.filter((month) =>
        scheduleMonthInProgram(startDate, duration, year, month.id)
    )
}

watch([programStartDate, programDuration], () => {
    const allowedYears = new Set(coveredYearOptions.value.map((option) => option.id))
    for (const entry of scheduleEntries.value) {
        if (!entry.yearOption || !allowedYears.has(entry.yearOption.id)) {
            entry.yearOption = undefined
            entry.monthOption = undefined
            continue
        }
        if (
            entry.monthOption &&
            !scheduleMonthInProgram(
                dateInputToUtcMillis(programStartDate.value),
                Number(programDuration.value),
                entry.yearOption.id,
                entry.monthOption.id
            )
        ) {
            entry.monthOption = undefined
        }
    }
})

const sortScheduleEntriesByMonth = () => {
    const incomplete = scheduleEntries.value.filter(
        (entry) => !entry.yearOption?.id || !entry.monthOption?.id
    )
    const complete = scheduleEntries.value
        .filter((entry) => entry.yearOption?.id && entry.monthOption?.id)
        .sort((a, b) => a.yearOption!.id - b.yearOption!.id || a.monthOption!.id - b.monthOption!.id)
    scheduleEntries.value = [...incomplete, ...complete]
}




const getDatePartsFromInput = (value?: string) => {
    if (!value) return undefined
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return undefined
    return { month: date.getMonth() + 1, year: date.getFullYear() }
}

const requiresInstanceAmendment = (instance: { startDateTime?: string; endDateTime?: string; scheduleEntry?: ScheduleEntryForm }) => {
    if (!instance.scheduleEntry?.monthOption?.id || !instance.scheduleEntry.yearOption?.id || !instance.startDateTime || !instance.endDateTime) {
        return false
    }

    const start = getDatePartsFromInput(instance.startDateTime)
    const end = getDatePartsFromInput(instance.endDateTime)
    const plannedMonth = instance.scheduleEntry.monthOption.id
    const plannedYear = instance.scheduleEntry.yearOption.id
    return (
        start?.month !== plannedMonth ||
        end?.month !== plannedMonth ||
        start?.year !== plannedYear ||
        end?.year !== plannedYear
    )
}

// Instance collapse state
const collapsedInstances = ref<Record<string, boolean>>({})

// Validation errors display
const showValidationErrors = ref(false)

// Toggle instance collapse
const toggleInstanceCollapse = (instanceId: string) => {
    collapsedInstances.value[instanceId] = !collapsedInstances.value[instanceId]
}

// Check if instance is collapsed
const isInstanceCollapsed = (instanceId: string) => {
    return collapsedInstances.value[instanceId] || false
}

onMounted(async () => {
    await fetchActivityTypes()
    await fetchStandards()
    if (isEdit) {
        await fetchAuditProgram()
    }
})

const fetchActivityTypes = async () => {
    try {
        const auditActivityTypes = await apiGet<AuditActivityType[]>('/audits/activity-types', authStore)
        activityTypes.value = auditActivityTypes
    } catch (error: any) {
        console.error('Error fetching audit programs:', error)
    }
}

const fetchStandards = async () => {
    try {
        const data = await apiGet<StandardDto[]>('/audits/standards', authStore)
        standardOptions.value = data
    } catch (error: any) {
        console.error('Error fetching standards:', error)
    }
}

const fetchAuditProgram = async () => {
    if (!isEdit) return

    try {
        const response = await apiGet<AuditProgram>(`/audits/programs/${route.params.id}`, authStore)
        if (response) {
            auditProgram.value = response
            selectedActivityType.value = response.auditActivityType
            selectedInitialStatus.value = statuses.value.find(s => s.id === response.status)
            programStartDate.value = response.startDate ? formatDateToInput(response.startDate) : ''
            programDuration.value = response.duration != null ? String(response.duration) : ''
            selectedStandards.value = response.standards || []
            isScheduled.value = response.status === AuditProgramStatus.SCHEDULED
            scheduleEntries.value = (response.scheduleEntries || []).map((entry: AuditProgramScheduleEntry) => ({
                uiId: `schedule-entry-${scheduleEntryIdCounter++}`,
                id: entry.id,
                yearOption: entry.year
                    ? { id: Number(entry.year), name: String(entry.year) }
                    : undefined,
                monthOption: monthOptions.value.find((month) => month.id === entry.month),
                process: entry.process || '',
                notes: entry.notes || '',
                isUnplanned: entry.isUnplanned,
                amendmentReason: entry.amendmentReason,
                auditInstanceId: entry.auditInstanceId
            }))
            sortScheduleEntriesByMonth()
            const scheduleEntriesByAuditInstanceId = new Map(
                scheduleEntries.value
                    .filter((entry) => entry.auditInstanceId)
                    .map((entry) => [entry.auditInstanceId, entry])
            )

            // Load audit instances from the response
            if (response.auditInstances && response.auditInstances.length > 0) {
                auditInstances.value = response.auditInstances.map((instance: any) => {
                    const instanceId = `instance-${auditInstanceIdCounter++}`
                    // Ensure loaded instances are expanded by default
                    collapsedInstances.value[instanceId] = false
                    return {
                        id: instanceId,
                        realId: instance.id, // Store the real database ID
                        startDateTime: instance.startDate ? formatDateToInputWithTime(instance.startDate) : '',
                        endDateTime: instance.endDate ? formatDateToInputWithTime(instance.endDate) : '',
                        scope: instance.scope || '',
                        objective: instance.objective || '',
                        criteria: instance.criteria || '',
                        scheduleEntry: scheduleEntriesByAuditInstanceId.get(instance.id),
                        errors: {
                            startDateTime: '',
                            endDateTime: ''
                        }
                    }
                })
            }
        } else {
            toast.showToast(t('common.error'), t('audit.program_form.toast_load_failed'), 'error')
            router.push('/check/audits/settings?tab=4')
        }
        loadingEntity.value = false
    } catch (error: any) {
        console.error('Error fetching audit program:', error)
        toast.showToast(t('common.error'), formatApiErrorMessage(error.response?.data, t, 'errors.audit') || t('audit.program_form.toast_load_failed'), 'error')
        router.push('/check/audits/settings?tab=4')
    }
}

const addScheduleEntry = () => {
    scheduleEntries.value.unshift({
        uiId: createUiId('schedule-entry'),
        id: createUuid(),
        process: '',
        notes: ''
    })
}

const removeScheduleEntry = (index: number) => {
    scheduleEntries.value.splice(index, 1)
}

// Audit Instance Management
const addAuditInstance = async () => {
    const newInstance = {
        id: `instance-${auditInstanceIdCounter++}`,
        startDateTime: '',
        endDateTime: '',
        scope: '',
        objective: '',
        criteria: '',
        errors: {
            startDateTime: '',
            endDateTime: ''
        }
    }
    auditInstances.value.push(newInstance)

    // Ensure the newly added instance is expanded
    collapsedInstances.value[newInstance.id] = false

    await nextTick()
    const el = document.getElementById(newInstance.id)
    if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
}

const removeAuditInstance = async (index: number) => {
    dialog.openDialog(ConfirmDialog, {
        message: t('audit.program_form.delete_instance_confirm'),
        onConfirm: async () => {
            const instance = auditInstances.value[index]

            // If it's an existing instance (has realId), delete it via API immediately
            if (instance.realId) {
                try {
                    loading.value = true
                    await apiDelete(`/audits/instances/${instance.realId}`, authStore)
                    toast.showToast(t('common.success'), t('audit.program_form.toast_instance_deleted'), 'success')
                } catch (error: any) {
                    console.error('Error deleting audit instance:', error)
                    const errorMessage =
                        formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                        t('audit.program_form.toast_instance_delete_failed')
                    toast.showToast(t('common.error'), errorMessage, 'error')
                    dialog.closeDialog()
                    loading.value = false
                    return // Don't remove from UI if deletion failed
                } finally {
                    loading.value = false
                }
            }

            // Remove from UI
            auditInstances.value.splice(index, 1)

            dialog.closeDialog()
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}


const onInvalidSubmit = () => {
    if (auditInstances.value.length > 0) {
        let hasInstanceErrors = false
        for (let i = 0; i < auditInstances.value.length; i++) {
            const instance = auditInstances.value[i]
            if (!instance.startDateTime || !instance.endDateTime || !instance.criteria) {
                hasInstanceErrors = true
                break
            }
        }
        if (hasInstanceErrors) {
            showValidationErrors.value = true
        }
    }
}

const handleSubmit = async (values: any) => {
    if (loading.value) return

    showValidationErrors.value = false

    if (values.programTitle?.trim() === '') {
        toast.showToast(t('common.error'), t('audit.validation.enter_program_title'), 'error')
        return
    }

    if (!selectedActivityType.value) {
        toast.showToast(t('common.error'), t('audit.validation.activity_type_required'), 'error')
        return
    }

    if (!selectedInitialStatus.value) {
        toast.showToast(t('common.error'), t('audit.validation.initial_status_required'), 'error')
        return
    }

    if (!programStartDate.value) {
        toast.showToast(t('common.error'), t('audit.validation.start_date_required'), 'error')
        return
    }

    if (!selectedStandards.value.length) {
        toast.showToast(t('common.error'), t('audit.validation.qms_standard_required'), 'error')
        return
    }

    const durationValue = Number(programDuration.value)
    if (!Number.isInteger(durationValue) || durationValue < 1) {
        toast.showToast(t('common.error'), t('audit.validation.duration_required'), 'error')
        return
    }



    const programStartMillis = dateInputToUtcMillis(programStartDate.value)
    const allowedYears = new Set(coveredYearOptions.value.map((option) => option.id))
    const invalidScheduleEntry = scheduleEntries.value.find(
        (entry) =>
            !entry.yearOption?.id ||
            !allowedYears.has(entry.yearOption.id) ||
            !entry.monthOption?.id ||
            !scheduleMonthInProgram(
                programStartMillis,
                durationValue,
                entry.yearOption.id,
                entry.monthOption.id
            ) ||
            !entry.process?.trim()
    )
    if (invalidScheduleEntry) {
        toast.showToast(t('common.error'), t('audit.validation.schedule_entry_incomplete'), 'error')
        return
    }

    // Validate audit instances if any are added
    let hasInstanceErrors = false

    // for (let i = 0; i < auditInstances.value.length; i++) {
    //     const instance = auditInstances.value[i]
    //     const instanceScope = values[`instance-${instance.id}-scope`]
    //     const instanceObjective = values[`instance-${instance.id}-objective`]
    //     const amendmentReason = values[`instance-${instance.id}-amendment-reason`]

    //     // Reset errors for this instance
    //     if (!instance.errors) {
    //         instance.errors = { startDateTime: '', endDateTime: '' }
    //     } else {
    //         instance.errors.startDateTime = ''
    //         instance.errors.endDateTime = ''
    //     }

    //     // Validate start date
    //     if (!instance.startDateTime) {
    //         instance.errors.startDateTime = t('audit.validation.start_required')
    //         hasInstanceErrors = true
    //     }

    //     if (!instance.endDateTime) {
    //         instance.errors.endDateTime = t('audit.validation.end_required')
    //         hasInstanceErrors = true
    //     }

    //     if (instance.startDateTime && instance.endDateTime) {
    //         const startDate = new Date(instance.startDateTime)
    //         const endDate = new Date(instance.endDateTime)
    //         if (endDate <= startDate) {
    //             instance.errors.endDateTime = t('audit.validation.end_after_start')
    //             hasInstanceErrors = true
    //         }
    //     }

    //     // Validate scope
    //     if (!instanceScope?.trim()) {
    //         hasInstanceErrors = true
    //     }

    //     // Validate objective
    //     if (!instanceObjective?.trim()) {
    //         hasInstanceErrors = true
    //     }

    //     // Validate criteria
    //     if (!instance.criteria) {
    //         hasInstanceErrors = true
    //     }

    //     if (requiresInstanceAmendment(instance) && !amendmentReason?.trim()) {
    //         hasInstanceErrors = true
    //     }
    // }

    // // Set showValidationErrors to true if any instance has errors, so all fields show errors together
    // if (hasInstanceErrors) {
    //     showValidationErrors.value = true
    // }

    // // Return if there are any errors
    // if (hasInstanceErrors) {
    //     // Show toast for first error found
    //     for (let i = 0; i < auditInstances.value.length; i++) {
    //         const instance = auditInstances.value[i]
    //         const instanceScope = values[`instance-${instance.id}-scope`]
    //         const instanceObjective = values[`instance-${instance.id}-objective`]
    //         const amendmentReason = values[`instance-${instance.id}-amendment-reason`]

    //         if (instance.errors?.startDateTime) {
    //             toast.showToast(
    //                 t('common.error'),
    //                 t('audit.program_form.toast_instance_error', { n: i + 1, message: instance.errors.startDateTime }),
    //                 'error'
    //             )
    //             return
    //         }
    //         if (instance.errors?.endDateTime) {
    //             toast.showToast(
    //                 t('common.error'),
    //                 t('audit.program_form.toast_instance_error', { n: i + 1, message: instance.errors.endDateTime }),
    //                 'error'
    //             )
    //             return
    //         }
    //         if (!instanceScope?.trim()) {
    //             toast.showToast(
    //                 t('common.error'),
    //                 t('audit.program_form.toast_instance_error', { n: i + 1, message: t('audit.validation.scope_required') }),
    //                 'error'
    //             )
    //             return
    //         }
    //         if (!instanceObjective?.trim()) {
    //             toast.showToast(
    //                 t('common.error'),
    //                 t('audit.program_form.toast_instance_error', { n: i + 1, message: t('audit.validation.objective_required') }),
    //                 'error'
    //             )
    //             return
    //         }
    //         if (!instance.criteria) {
    //             toast.showToast(
    //                 t('common.error'),
    //                 t('audit.program_form.toast_instance_error', { n: i + 1, message: t('audit.validation.criteria_required') }),
    //                 'error'
    //             )
    //             return
    //         }
    //         if (requiresInstanceAmendment(instance) && !amendmentReason?.trim()) {
    //             toast.showToast(
    //                 t('common.error'),
    //                 t('audit.program_form.toast_instance_error', { n: i + 1, message: t('audit.validation.amendment_reason_required') }),
    //                 'error'
    //             )
    //             return
    //         }
    //     }
    // }

    loading.value = true
    auditInstances.value = []
    // Prepare audit instances data
    const instancesData = auditInstances.value.map((instance) => {
        const instanceScope = values[`instance-${instance.id}-scope`]
        const instanceObjective = values[`instance-${instance.id}-objective`]
        const instanceCriteria = values[`instance-${instance.id}-criteria`]
        const amendmentReason = values[`instance-${instance.id}-amendment-reason`]

        return {
            id: instance.realId, // Include realId for existing instances (undefined for new ones)
            startDate: instance.startDateTime ? new Date(instance.startDateTime).getTime() : undefined,
            endDate: instance.endDateTime ? new Date(instance.endDateTime).getTime() : undefined,
            scope: instanceScope,
            objective: instanceObjective,
            criteria: instanceCriteria || instance.criteria || undefined,
            scheduleEntryId: instance.scheduleEntry?.id,
            amendmentReason: requiresInstanceAmendment(instance) ? amendmentReason?.trim() : undefined
        }
    })

    const data = {
        title: values.programTitle,
        scope: values.programScope,
        objective: values.programObjective,
        auditActivityTypeId: selectedActivityType.value.id,
        standardIds: selectedStandards.value.map((standard) => standard.id),
        duration: durationValue,
        startDate: dateInputToUtcMillis(programStartDate.value),
        status: selectedInitialStatus.value?.id,
        scheduleEntries: scheduleEntries.value.map((entry) => ({
            id: entry.id,
            year: entry.yearOption?.id,
            month: entry.monthOption?.id,
            process: entry.process?.trim(),
            notes: entry.notes,
            isUnplanned: entry.isUnplanned,
            amendmentReason: entry.amendmentReason,
            auditInstanceId: entry.auditInstanceId
        }))
    }
    try {
        if (isEdit) {
            await apiPut<{ id: string }>(`/audits/programs/${id}`, data, authStore)
            toast.showToast(t('common.success'), t('audit.program_form.toast_updated'), 'success')
        } else {
            await apiPost<{ id: string }>('/audits/programs', data, authStore)
            toast.showToast(t('common.success'), t('audit.program_form.toast_created'), 'success')
        }

        router.push('/check/audits/settings?tab=4')
    } catch (error: any) {
        console.error('Error adding audit program:', error)
        const errorMessage =
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') || t('audit.program_form.toast_save_failed')
        toast.showToast(t('common.error'), errorMessage, 'error')
    } finally {
        loading.value = false
    }
}
</script>