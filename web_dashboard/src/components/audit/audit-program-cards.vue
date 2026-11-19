<template>
    <section class="mb-8">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h2 class="text-lg font-medium">{{ t('audit.program_cards.title') }}</h2>
                <p class="text-sm text-neutral-500">{{ t('audit.program_cards.subtitle') }}</p>
            </div>
            <div class="flex items-center gap-3 flex-wrap justify-end">
                <Can subject="audit_programs" :actions="['create']">
                    <AppButton
                        button-style="primary"
                        class="flex items-center gap-2"
                        href="/check/audits/add"
                        test-id="add-audit-program-button"
                    >
                        <i class="fa-solid fa-plus"></i>
                        {{ t('audit.program_list.create_button') }}
                    </AppButton>
                </Can>
                <div class="w-40">
                    <Select2
                        v-model="selectedYear"
                        :values="yearOptions"
                        :display="(val: any) => val?.name || ''"
                        :placeholder="t('audit.program_cards.all_years')"
                        :optional="true"
                    />
                </div>
            </div>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
            <Spinner width="4" />
        </div>

        <div v-else class="space-y-4">
            <article
                v-for="program in filteredPrograms"
                :key="program.id"
                class="border border-neutral-200 bg-white rounded-lg"
            >
                <div class="flex items-center justify-between px-5 py-4">
                    <button
                        type="button"
                        class="flex items-center gap-3 flex-1 min-w-0 text-left"
                        @click="toggleProgram(program.id)"
                    >
                        <i
                            class="fa-solid transition-transform duration-200"
                            :class="collapsedPrograms[program.id] ? 'fa-chevron-right' : 'fa-chevron-down'"
                        ></i>
                        <div class="min-w-0">
                            <h3 class="font-medium text-neutral-900">{{ program.title }}</h3>
                            <p class="text-sm text-neutral-500">
                                {{ program.startDate ? formatDateToDay(program.startDate) : t('training.main.na') }}
                                <span class="mx-2">•</span>
                                {{ formatProgramDuration(program.duration) }}
                                <span class="mx-2">•</span>
                                {{ program.standards?.map((standard) => standard.name).join(', ') || t('training.main.na') }}
                                <span class="mx-2">•</span>
                                {{ program.scope || t('training.main.na') }}
                            </p>
                        </div>
                    </button>
                    <div class="flex items-center gap-2 shrink-0 ml-3">
                        <Can :subjects="['audit_programs']" :actions="['update']">
                            <RouterLink
                                v-if="canEditProgram(program)"
                                :to="`/check/audits/${program.id}/edit`"
                                class="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                :title="t('audit.program_cards.edit_program')"
                                :test-id="`audit-program-edit-${program.id}`"
                            >
                                <i class="fa-solid fa-pen-to-square text-sm"></i>
                            </RouterLink>
                        </Can>
                        <span class="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700">
                            {{ t(`audit.program_status.${program.status}`) }}
                        </span>
                    </div>
                </div>

                <div v-show="!collapsedPrograms[program.id]" class="border-t border-neutral-100 px-5 py-4">
                    <div class="flex justify-end mb-4">
                        <Can :subjects="['audit_programs']" :actions="['update']">
                            <AppButton
                                button-style="secondary"
                                type="button"
                                @click="$emit('addUnplanned', program)"
                            >
                                <i class="fa-solid fa-plus mr-2"></i>
                                {{ t('audit.program_cards.add_unplanned') }}
                            </AppButton>
                        </Can>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        <div
                            v-for="month in monthOptions"
                            :key="month.id"
                            class="border border-neutral-100 rounded-md p-3 min-h-28"
                        >
                            <h4 class="font-medium text-sm mb-2">{{ month.name }}</h4>
                            <div
                                v-for="entry in entriesForMonth(program, month.id)"
                                :key="entry.id || `${entry.year}-${entry.month}-${entry.process}`"
                                class="mb-2 last:mb-0 rounded bg-neutral-50 p-2 text-sm"
                            >
                                <div class="flex items-start justify-between gap-2">
                                    <span>{{ entry.year }} · {{ entry.process || t('training.main.na') }}</span>
                                    <span
                                        v-if="entry.isUnplanned"
                                        class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                                    >
                                        {{ t('audit.program_cards.unplanned_badge') }}
                                    </span>
                                </div>
                                <p v-if="entry.notes" class="text-xs text-neutral-500 mt-1">{{ entry.notes }}</p>
                                <p v-if="entry.isUnplanned" class="text-xs text-amber-800 mt-1">
                                    {{ entry.amendmentReason || t('audit.program_cards.no_amendment_reason') }}
                                </p>
                                <RouterLink
                                    v-if="entry.auditInstanceId"
                                    class="inline-block text-xs text-primary-700 mt-1"
                                    :to="`/check/audits/${program.id}/instances/${entry.auditInstanceId}?source=main`"
                                >
                                    {{ entry.auditInstance?.auditId || t('audit.program_cards.view_instance') }}
                                </RouterLink>
                            </div>
                            <p v-if="entriesForMonth(program, month.id).length === 0" class="text-sm text-neutral-400">
                                {{ t('audit.program_cards.no_entries') }}
                            </p>
                        </div>
                    </div>

                    <div
                        v-if="!program.scheduleEntries?.length"
                        class="mt-4 rounded-md bg-neutral-50 p-4 text-sm text-neutral-500"
                    >
                        {{ t('audit.program_cards.no_schedule') }}
                    </div>
                </div>
            </article>

            <div v-if="filteredPrograms.length === 0" class="text-center py-8 text-neutral-500">
                {{ t('audit.program_cards.empty') }}
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AuditProgram, AuditProgramScheduleEntry } from '@/util/interfaces'
import { AuditProgramStatus } from '@/util/interfaces'
import { formatDateToDay, programCoveredYears } from '@/util/util'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import Select2 from '../Select2.vue'
import Spinner from '../Spinner.vue'

const props = defineProps<{
    programs: AuditProgram[]
    loading?: boolean
}>()

defineEmits<{
    addUnplanned: [program: AuditProgram]
}>()

const { t, locale } = useI18n()
const selectedYear = ref<{ id: number; name: string } | null>(null)
const collapsedPrograms = reactive<Record<string, boolean>>({})

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

const formatProgramDuration = (duration?: number) => {
    if (!duration) return t('training.main.na')
    return t(
        duration === 1 ? 'audit.program_list.duration_one' : 'audit.program_list.duration_many',
        { count: duration }
    )
}

const yearOptions = computed(() => {
    const years = new Set<number>()
    props.programs.forEach((program) => {
        programCoveredYears(program.startDate, program.duration).forEach((year) => years.add(year))
    })
    return [...years].sort((a, b) => a - b).map((year) => ({ id: year, name: String(year) }))
})

const filteredPrograms = computed(() =>
    selectedYear.value?.id
        ? props.programs.filter((program) =>
              programCoveredYears(program.startDate, program.duration).includes(selectedYear.value!.id)
          )
        : props.programs
)

const toggleProgram = (programId: string) => {
    collapsedPrograms[programId] = !collapsedPrograms[programId]
}

const canEditProgram = (program: AuditProgram) => program.status !== AuditProgramStatus.CANCELLED

const entriesForMonth = (program: AuditProgram, month: number): AuditProgramScheduleEntry[] =>
    (program.scheduleEntries || []).filter((entry) => {
        if (entry.month !== month) return false
        if (selectedYear.value?.id && Number(entry.year) !== selectedYear.value.id) return false
        return true
    })
</script>
