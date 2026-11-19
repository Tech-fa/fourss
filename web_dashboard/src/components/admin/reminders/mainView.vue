<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs" />
        <div class="p-4">
            <div class="mb-2">
                <h1 class="text-lg">{{ t('reminders.title') }}</h1>
                <p class="text-sm text-neutral-600">{{ t('reminders.subtitle') }}</p>
            </div>
            <Table
                :skip-padding="true"
                :cols="columns"
                :column-labels="columnLabels"
                :rows="tableRows"
                :entities="filteredRules"
                :page="1"
                :total="filteredRules.length"
                :per-page="filteredRules.length || 10"
                :total-pages="1"
                :loading="loading"
                :search-loading="false"
                :search-placeholder="t('reminders.search')"
                :on-search="onSearch"
                :on-next-page="noop"
                :on-previous-page="noop"
                :set-page="noop"
                :on-success="load"
                :entity-name="t('reminders.entity')"
                subject="reminders"
                :hide-view="hideView"
                :on-edit="openEdit"
                :handle-delete="confirmDelete"
            >
                <template #extra-search>
                    <Can subject="reminders" :actions="['create']">
                        <AppButton buttonStyle="primary" test-id="add-reminder-button" @click="openCreate">
                            <i class="fa-solid fa-plus mr-2"></i>
                            {{ t('reminders.add') }}
                        </AppButton>
                    </Can>
                </template>
            </Table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import BreadCrums from '@/components/breadCrums.vue'
import Can from '@/components/Can.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import Table from '@/components/Table.vue'
import { useAuthStore } from '@/stores/auth'
import { useDialog } from '@/stores/dialog'
import { useToast } from '@/stores/notification'
import { apiDelete, apiGet, apiPost, apiPut } from '@/util/api'
import ReminderRuleDialog from './reminder-rule-dialog.vue'
import type { ReminderRule, ReminderRuleInput, ReminderSource } from './types'

const { t } = useI18n()
const authStore = useAuthStore()
const dialog = useDialog()
const toast = useToast()

const sources = ref<ReminderSource[]>([])
const rules = ref<ReminderRule[]>([])
const loading = ref(true)
const searchQuery = ref('')

const crumbs = computed(() => [
    {
        name: t('reminders.title'),
        path: '/admin/reminders',
        icon: 'fa-solid fa-bell'
    }
])

const columns = ['when', 'people', 'statuses', 'enabled']
const columnLabels = computed(() => ({
    when: t('reminders.col_when'),
    people: t('reminders.col_people'),
    statuses: t('reminders.col_statuses'),
    enabled: t('reminders.col_enabled')
}))

const filteredRules = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return rules.value
    return rules.value.filter((rule) => {
        const haystack = [
            sentence(rule),
            labels(rule, 'recipients', rule.recipientKeys),
            labels(rule, 'statuses', rule.statusKeys)
        ]
            .join(' ')
            .toLowerCase()
        return haystack.includes(query)
    })
})

const tableRows = computed(() =>
    filteredRules.value.map((rule) => ({
        id: rule.id,
        when: sentence(rule),
        people: labels(rule, 'recipients', rule.recipientKeys),
        statuses: labels(rule, 'statuses', rule.statusKeys),
        enabled: rule.enabled ? t('reminders.enabled') : t('reminders.disabled')
    }))
)

function sourceFor(rule: ReminderRule) {
    return sources.value.find((source) => source.key === rule.sourceKey)
}

function labels(rule: ReminderRule, field: 'recipients' | 'statuses', keys: string[]) {
    const source = sourceFor(rule)
    if (!source) return keys.join(', ')
    return source[field]
        .filter((item) => keys.includes(item.key))
        .map((item) => t(item.labelKey))
        .join(', ')
}

function sentence(rule: ReminderRule) {
    const source = sourceFor(rule)
    const anchor = source?.anchors.find((item) => item.key === rule.anchorKey)
    return t('reminders.summary', {
        count: rule.offsetDays,
        dayWord: rule.offsetDays === 1 ? t('reminders.day') : t('reminders.day_plural'),
        direction: t(`reminders.directions.${rule.direction}`),
        anchor: anchor ? t(anchor.labelKey) : rule.anchorKey,
        source: source ? t(source.labelKey) : rule.sourceKey
    })
}

function errorText(error: any, fallback: string) {
    const message = error?.response?.data?.message
    if (Array.isArray(message)) return message.join(' ')
    if (typeof message === 'string') return message
    return fallback
}

async function load() {
    try {
        loading.value = true
        const [catalog, listed] = await Promise.all([
            apiGet<{ sources: ReminderSource[] }>('reminders/catalog', authStore),
            apiGet<ReminderRule[]>('reminders/rules', authStore)
        ])
        sources.value = catalog.sources ?? []
        rules.value = listed ?? []
    } catch (error) {
        toast.showToast(t('common.error'), errorText(error, t('reminders.toast_load_failed')), 'error')
    } finally {
        loading.value = false
    }
}

function onSearch(value: string) {
    searchQuery.value = value
}

function hideView() {
    return true
}

function noop() {}

function openCreate() {
    dialog.openDialog(ReminderRuleDialog, {
        sources: sources.value,
        onCancel: dialog.closeDialog,
        onSubmit: async (payload: ReminderRuleInput) => {
            try {
                await apiPost('reminders/rules', payload, authStore)
                toast.showToast(t('common.success'), t('reminders.toast_created'), 'success')
                dialog.closeDialog()
                await load()
            } catch (error) {
                toast.showToast(t('common.error'), errorText(error, t('reminders.toast_save_failed')), 'error')
                throw error
            }
        }
    })
}

function openEdit(rule: ReminderRule) {
    dialog.openDialog(ReminderRuleDialog, {
        sources: sources.value,
        rule,
        onCancel: dialog.closeDialog,
        onSubmit: async (payload: ReminderRuleInput) => {
            try {
                await apiPut(`reminders/rules/${rule.id}`, payload, authStore)
                toast.showToast(t('common.success'), t('reminders.toast_updated'), 'success')
                dialog.closeDialog()
                await load()
            } catch (error) {
                toast.showToast(t('common.error'), errorText(error, t('reminders.toast_save_failed')), 'error')
                throw error
            }
        }
    })
}

function confirmDelete(rule: ReminderRule) {
    dialog.openDialog(ConfirmDialog, {
        message: t('reminders.delete_confirm'),
        onCancel: dialog.closeDialog,
        onConfirm: async () => {
            try {
                await apiDelete(`reminders/rules/${rule.id}`, authStore)
                toast.showToast(t('common.success'), t('reminders.toast_deleted'), 'success')
                dialog.closeDialog()
                await load()
            } catch (error) {
                toast.showToast(t('common.error'), errorText(error, t('reminders.toast_delete_failed')), 'error')
            }
        }
    })
}

onMounted(load)
</script>
