<template>
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl overflow-y-auto max-h-[80vh]" test-id="reminder-rule-dialog">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-medium">
                {{ rule ? t('reminders.edit') : t('reminders.add') }}
            </h2>
            <button
                class="text-neutral-500 hover:text-neutral-700"
                type="button"
                @click="onCancel"
                test-id="reminder-rule-close"
            >
                <i class="fa-solid fa-xmark text-xl"></i>
            </button>
        </div>

        <div class="space-y-4">
            <div>
                <label class="block text-sm font-bold text-neutral-700 mb-2" for="reminder-source">
                    {{ t('reminders.record_type') }}
                </label>
                <select
                    id="reminder-source"
                    v-model="sourceKey"
                    :class="INPUT_CLASS"
                    test-id="reminder-source"
                    @change="applySourceDefaults"
                >
                    <option v-for="source in sources" :key="source.key" :value="source.key">
                        {{ t(source.labelKey) }}
                    </option>
                </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-bold text-neutral-700 mb-2" for="reminder-days">
                        {{ t('reminders.days') }}
                    </label>
                    <AppInput
                        id="reminder-days"
                        v-model="offsetDays"
                        type="number"
                        min="0"
                        max="365"
                        hide-icon
                        :error="showErrors && !daysValid"
                        test-id="reminder-days"
                    />
                    <p v-if="showErrors && !daysValid" class="text-red-600 text-xs mt-1">
                        {{ t('reminders.rule_days') }}
                    </p>
                </div>
                <div>
                    <label class="block text-sm font-bold text-neutral-700 mb-2" for="reminder-direction">
                        {{ t('reminders.direction') }}
                    </label>
                    <select id="reminder-direction" v-model="direction" :class="INPUT_CLASS" test-id="reminder-direction">
                        <option value="before">{{ t('reminders.directions.before') }}</option>
                        <option value="after">{{ t('reminders.directions.after') }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-neutral-700 mb-2" for="reminder-anchor">
                        {{ t('reminders.date') }}
                    </label>
                    <select id="reminder-anchor" v-model="anchorKey" :class="INPUT_CLASS" test-id="reminder-anchor">
                        <option v-for="anchor in currentSource?.anchors ?? []" :key="anchor.key" :value="anchor.key">
                            {{ t(anchor.labelKey) }}
                        </option>
                    </select>
                </div>
            </div>

            <fieldset>
                <legend class="block text-sm font-bold text-neutral-700 mb-2">{{ t('reminders.people') }}</legend>
                <div class="space-y-2">
                    <label
                        v-for="recipient in currentSource?.recipients ?? []"
                        :key="recipient.key"
                        class="flex items-center gap-2 text-sm text-neutral-800"
                    >
                        <input
                            type="checkbox"
                            :checked="recipientKeys.includes(recipient.key)"
                            :test-id="`reminder-recipient-${recipient.key}`"
                            @change="toggle(recipientKeys, recipient.key)"
                        />
                        {{ t(recipient.labelKey) }}
                    </label>
                </div>
                <p v-if="showErrors && recipientKeys.length === 0" class="text-red-600 text-xs mt-1">
                    {{ t('reminders.rule_people') }}
                </p>
            </fieldset>

            <fieldset>
                <legend class="block text-sm font-bold text-neutral-700 mb-2">{{ t('reminders.statuses_label') }}</legend>
                <div class="space-y-2">
                    <label
                        v-for="status in currentSource?.statuses ?? []"
                        :key="status.key"
                        class="flex items-center gap-2 text-sm text-neutral-800"
                    >
                        <input
                            type="checkbox"
                            :checked="statusKeys.includes(status.key)"
                            :test-id="`reminder-status-${status.key}`"
                            @change="toggle(statusKeys, status.key)"
                        />
                        {{ t(status.labelKey) }}
                    </label>
                </div>
                <p v-if="showErrors && statusKeys.length === 0" class="text-red-600 text-xs mt-1">
                    {{ t('reminders.rule_statuses') }}
                </p>
            </fieldset>

            <label class="flex items-center gap-2 text-sm font-bold text-neutral-700">
                <input v-model="enabled" type="checkbox" test-id="reminder-enabled" />
                {{ t('reminders.enabled_label') }}
            </label>

            <p class="text-sm text-neutral-600 bg-neutral-50 rounded-md p-3" test-id="reminder-preview">
                {{ preview }}
            </p>
        </div>

        <div class="flex justify-end gap-4 mt-6">
            <AppButton buttonStyle="secondary" type="button" test-id="reminder-cancel" @click="onCancel">
                {{ t('common.cancel') }}
            </AppButton>
            <AppButton buttonStyle="primary" type="button" :loading="saving" test-id="reminder-save" @click="submit">
                {{ t('reminders.save') }}
            </AppButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import { INPUT_CLASS } from '@/components/contants'
import type { ReminderRule, ReminderRuleInput, ReminderSource } from './types'

const props = defineProps<{
    sources: ReminderSource[]
    rule?: ReminderRule | null
    onCancel: () => void
    onSubmit: (payload: ReminderRuleInput) => Promise<void>
}>()

const { t } = useI18n()
const initial = props.rule
const initialSource = props.sources.find((source) => source.key === initial?.sourceKey) ?? props.sources[0]

const sourceKey = ref(initialSource?.key ?? '')
const anchorKey = ref(initial?.anchorKey ?? initialSource?.anchors[0]?.key ?? '')
const offsetDays = ref<number | string>(initial?.offsetDays ?? 1)
const direction = ref<'before' | 'after'>(initial?.direction ?? 'before')
const recipientKeys = ref<string[]>([...(initial?.recipientKeys ?? initialSource?.defaultRecipientKeys ?? [])])
const statusKeys = ref<string[]>([...(initial?.statusKeys ?? initialSource?.defaultStatusKeys ?? [])])
const enabled = ref(initial?.enabled ?? true)
const showErrors = ref(false)
const saving = ref(false)

const currentSource = computed(() => props.sources.find((source) => source.key === sourceKey.value))

const parsedDays = computed(() => Number(offsetDays.value))
const daysValid = computed(
    () => Number.isInteger(parsedDays.value) && parsedDays.value >= 0 && parsedDays.value <= 365
)

const preview = computed(() => {
    const source = currentSource.value
    if (!source) return ''
    const anchor = source.anchors.find((item) => item.key === anchorKey.value)
    const people = source.recipients
        .filter((item) => recipientKeys.value.includes(item.key))
        .map((item) => t(item.labelKey))
        .join(', ')
    const statuses = source.statuses
        .filter((item) => statusKeys.value.includes(item.key))
        .map((item) => t(item.labelKey))
        .join(', ')
    const count = daysValid.value ? parsedDays.value : 0
    return t('reminders.preview', {
        count,
        dayWord: count === 1 ? t('reminders.day') : t('reminders.day_plural'),
        direction: t(`reminders.directions.${direction.value}`),
        anchor: anchor ? t(anchor.labelKey) : '',
        source: t(source.labelKey),
        people: people || '—',
        statuses: statuses || '—'
    })
})

function applySourceDefaults() {
    const source = currentSource.value
    if (!source) return
    anchorKey.value = source.anchors[0]?.key ?? ''
    recipientKeys.value = [...source.defaultRecipientKeys]
    statusKeys.value = [...source.defaultStatusKeys]
}

function toggle(list: string[], key: string) {
    const index = list.indexOf(key)
    if (index >= 0) list.splice(index, 1)
    else list.push(key)
}

async function submit() {
    showErrors.value = true
    if (!daysValid.value || recipientKeys.value.length === 0 || statusKeys.value.length === 0 || !anchorKey.value) {
        return
    }
    saving.value = true
    try {
        await props.onSubmit({
            sourceKey: sourceKey.value,
            anchorKey: anchorKey.value,
            offsetDays: parsedDays.value,
            direction: parsedDays.value === 0 ? 'before' : direction.value,
            recipientKeys: [...recipientKeys.value],
            statusKeys: [...statusKeys.value],
            enabled: enabled.value
        })
    } finally {
        saving.value = false
    }
}
</script>
