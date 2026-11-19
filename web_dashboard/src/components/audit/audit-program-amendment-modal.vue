<template>
    <div class="bg-white rounded-lg p-6 w-[520px] max-w-full">
        <h3 class="text-lg font-medium mb-4">{{ t('audit.program_cards.add_unplanned') }}</h3>
        <Form @submit="handleSubmit" class="space-y-4">
            <div>
                <label class="block mb-2 text-sm">{{ t('audit.program_form.year_label') }} <span class="text-red-700">*</span></label>
                <Select2
                    v-model="selectedYear"
                    :values="yearOptions"
                    :display="(val: any) => val?.name || ''"
                    :placeholder="t('audit.program_form.year_placeholder')"
                />
            </div>
            <div>
                <label class="block mb-2 text-sm">{{ t('audit.program_form.month_label') }} <span class="text-red-700">*</span></label>
                <Select2
                    v-model="selectedMonth"
                    :values="monthOptionsForYear"
                    :display="(val: any) => val?.name || ''"
                    :placeholder="t('audit.program_form.month_placeholder')"
                />
            </div>
            <div>
                <label class="block mb-2 text-sm">{{ t('audit.program_form.schedule_process_label') }} <span class="text-red-700">*</span></label>
                <AppInput
                    v-model="process"
                    :placeholder="t('audit.program_form.schedule_process_placeholder')"
                    hide-icon
                />
            </div>
            <div>
                <AppTextareaForm
                    name="amendmentReason"
                    :label="t('audit.program_cards.amendment_reason_label')"
                    :placeholder="t('audit.program_cards.amendment_reason_placeholder')"
                    :rules="(v: any) => (!v?.trim() ? t('audit.validation.amendment_reason_required') : true)"
                    required
                />
            </div>
            <div>
                <label class="block mb-2 text-sm">{{ t('audit.program_form.schedule_notes_label') }}</label>
                <AppInput
                    v-model="notes"
                    :placeholder="t('audit.program_form.schedule_notes_placeholder')"
                    hide-icon
                />
            </div>
            <div class="flex justify-end gap-3 pt-2">
                <AppButton type="button" button-style="secondary" @click="dialog.closeDialog()">
                    {{ t('common.cancel') }}
                </AppButton>
                <AppButton type="submit" button-style="primary" :loading="loading">
                    {{ t('audit.program_cards.add_unplanned') }}
                </AppButton>
            </div>
        </Form>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Form } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import type { AuditProgram } from '@/util/interfaces'
import { apiPost } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useDialog } from '@/stores/dialog'
import { useToast } from '@/stores/notification'
import { formatApiErrorMessage, programCoveredYears, scheduleMonthInProgram } from '@/util/util'
import AppButton from '../AppButton.vue'
import AppInput from '../AppInput.vue'
import AppTextareaForm from '../AppTextareaForm.vue'
import Select2 from '../Select2.vue'

const props = defineProps<{
    program: AuditProgram
    onSaved?: () => Promise<void> | void
}>()

const { t, locale } = useI18n()
const authStore = useAuthStore()
const dialog = useDialog()
const toast = useToast()

const selectedYear = ref<{ id: number; name: string }>()
const selectedMonth = ref<{ id: number; name: string }>()
const process = ref('')
const notes = ref('')
const loading = ref(false)

const yearOptions = computed(() =>
    programCoveredYears(props.program.startDate, props.program.duration).map((year) => ({
        id: year,
        name: String(year)
    }))
)

watch(
    yearOptions,
    (options) => {
        if (selectedYear.value || !options.length) return
        const currentYear = new Date().getUTCFullYear()
        selectedYear.value = options.find((option) => option.id === currentYear) || options[0]
    },
    { immediate: true }
)

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

const monthOptionsForYear = computed(() => {
    const year = selectedYear.value?.id
    if (!year) return []
    return monthOptions.value.filter((month) =>
        scheduleMonthInProgram(props.program.startDate, props.program.duration, year, month.id)
    )
})

watch(selectedYear, () => {
    if (!selectedMonth.value) return
    const stillValid = monthOptionsForYear.value.some((month) => month.id === selectedMonth.value?.id)
    if (!stillValid) selectedMonth.value = undefined
})

const handleSubmit = async (values: any) => {
    if (!selectedYear.value || !selectedMonth.value || !process.value.trim() || loading.value) return

    loading.value = true
    try {
        await apiPost(
            `/audits/programs/${props.program.id}/schedule-entries`,
            {
                year: selectedYear.value.id,
                month: selectedMonth.value.id,
                process: process.value.trim(),
                amendmentReason: values.amendmentReason,
                notes: notes.value
            },
            authStore
        )
        toast.showToast(t('common.success'), t('audit.program_cards.toast_unplanned_added'), 'success')
        await props.onSaved?.()
        dialog.closeDialog()
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.program_cards.toast_unplanned_failed'),
            'error'
        )
    } finally {
        loading.value = false
    }
}

</script>
