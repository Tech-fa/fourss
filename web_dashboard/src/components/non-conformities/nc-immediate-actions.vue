<template>
    <Can subject="immediate_actions" :actions="['create']">
        <form
            v-if="canEdit"
            class="bg-white border border-neutral-200 rounded-lg p-4 mb-4 flex flex-col gap-3 lg:flex-row lg:items-end"
            test-id="nc-immediate-action-form"
            @submit.prevent="createAction"
        >
            <div class="flex-1">
                <label class="block text-sm text-neutral-600 mb-1" for="nc-ia-description">
                    {{ t('nc.immediateActions.descriptionLabel') }}
                    <span class="text-red-700">*</span>
                </label>
                <AppInput
                    id="nc-ia-description"
                    v-model="description"
                    name="description"
                    hide-icon
                    :placeholder="t('nc.immediateActions.descriptionPlaceholder')"
                    test-id="nc-immediate-action-description"
                />
            </div>
            <div class="lg:w-64">
                <label class="block text-sm text-neutral-600 mb-1">
                    {{ t('nc.immediateActions.assigneeLabel') }}
                    <span class="text-red-700">*</span>
                </label>
                <Select2
                    v-model="assignee"
                    :values="assignees"
                    :display="displayUser"
                    :placeholder="t('nc.immediateActions.assigneePlaceholder')"
                    test-id="nc-immediate-action-assignee"
                />
            </div>
            <div class="lg:w-48">
                <label class="block text-sm text-neutral-600 mb-1" for="nc-ia-due-date">
                    {{ t('nc.immediateActions.dueDateLabel') }}
                </label>
                <AppInput
                    id="nc-ia-due-date"
                    v-model="dueDate"
                    name="dueDate"
                    type="date"
                    hide-icon
                    :placeholder="t('nc.immediateActions.dueDatePlaceholder')"
                    test-id="nc-immediate-action-due-date"
                />
            </div>
            <AppButton
                type="submit"
                buttonStyle="primary"
                :loading="saving"
                test-id="nc-immediate-action-add"
            >
                {{ t('nc.immediateActions.addButton') }}
            </AppButton>
        </form>
    </Can>

    <Table
        :cols="columns"
        :column-labels="columnLabels"
        :rows="rows"
        :entities="actions"
        :page="1"
        :total="actions.length"
        :per-page="Math.max(actions.length, 1)"
        :total-pages="1"
        :entity-name="t('nc.immediateActions.title')"
        :loading="loading"
        subject="immediate_actions"
        :skip-padding="true"
        min-width="960px"
        :hide-edit="() => true"
        :hide-delete="() => true"
        :view-path="(row: { id: string }) => `${props.actionViewPath || '/tasks/immediate-actions'}/${row.id}`"
        :on-next-page="noop"
        :on-previous-page="noop"
        :set-page="noop"
        :on-success="loadActions"
        test-id="nc-immediate-actions-table"
    />
</template>

<script setup lang="ts">
import { computed, h, markRaw, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import AppInput from '../AppInput.vue'
import Can from '../Can.vue'
import Select2 from '../Select2.vue'
import Table from '../Table.vue'
import { createImmediateAction, getAllImmediateActions } from '../common/endpoints'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiPost } from '@/util/api'
import { formatApiErrorMessage, formatDateToDay } from '@/util/util'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'
import { ImmediateActionStatus, type User } from '@/util/interfaces'

const props = defineProps<{
    nonConformityId: string
    canEdit: boolean
    actionViewPath?: string
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const description = ref('')
const dueDate = ref('')
const assignee = ref<User | null>(null)
const assignees = ref<User[]>([])
const actions = ref<ImmediateActionRow[]>([])

type ImmediateActionRow = {
    id: string
    description: string
    assignedTo?: { fname?: string; lname?: string }
    dueDate?: number | string | null
    status?: string
    createdAt?: number | string
}

const columns = ['description', 'assignee', 'dueDate', 'status']
const noop = () => {}

const columnLabels = computed(() => ({
    description: t('nc.immediateActions.tableDescription'),
    assignee: t('nc.immediateActions.tableAssignee'),
    dueDate: t('nc.immediateActions.tableDueDate'),
    status: t('nc.immediateActions.tableStatus')
}))

const displayUser = (user?: User | null) =>
    user ? `${user.fname || ''} ${user.lname || ''}`.trim() || user.email || '' : ''

const statusLabel = (status?: string) => {
    const key = `nc.immediateActions.status.${status || 'open'}`
    const label = t(key)
    return label === key ? status || '' : label
}

const statusClass = (status?: string) => {
    switch (status) {
        case ImmediateActionStatus.OPEN:
            return 'bg-blue-100 text-blue-800'
        case ImmediateActionStatus.READY_FOR_VERIFICATION:
            return 'bg-amber-100 text-amber-900'
        case ImmediateActionStatus.VERIFIED:
            return 'bg-green-100 text-green-800'
        case ImmediateActionStatus.REJECTED:
            return 'bg-red-100 text-red-800'
        default:
            return 'bg-neutral-100 text-neutral-800'
    }
}

const statusPill = (status?: string) =>
    markRaw({
        setup() {
            return () =>
                h(
                    'span',
                    {
                        class: `inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusClass(status)}`,
                        'test-id': 'nc-immediate-action-status'
                    },
                    statusLabel(status)
                )
        }
    })

const rows = computed(() =>
    actions.value.map((action) => ({
        id: action.id,
        description: action.description,
        assignee: displayUser(action.assignedTo as User) || t('nc.immediateActions.unassigned'),
        dueDate: action.dueDate ? formatDateToDay(Number(action.dueDate)) : '',
        status: statusPill(action.status)
    }))
)

const loadAssignees = async () => {
    const users = await apiPost<User[]>(
        '/permissions/users/access',
        {
            subject: 'immediate_actions',
            combination: [{ subject: 'non_conformities' }]
        },
        authStore
    )
    assignees.value = users || []
    if (!assignee.value && assignees.value.length === 1) {
        assignee.value = assignees.value[0]
    }
}

const loadActions = async () => {
    loading.value = true
    try {
        const response = await getAllImmediateActions(
            'non-conformities',
            props.nonConformityId,
            authStore
        )
        actions.value = (response as ImmediateActionRow[]) || []
    } catch (error: any) {
        actions.value = []
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) ||
                t('nc.immediateActions.loadError'),
            'error'
        )
    } finally {
        loading.value = false
    }
}

const dueDateMillis = (value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) return undefined
    return Date.UTC(year, month - 1, day)
}

const createAction = async () => {
    const text = description.value.trim()
    if (!text) {
        toast.showToast(t('common.validationError'), t('nc.immediateActions.descriptionRequired'), 'error')
        return
    }
    if (!assignee.value?.id) {
        toast.showToast(t('common.validationError'), t('nc.immediateActions.assigneeRequired'), 'error')
        return
    }
    saving.value = true
    try {
        await createImmediateAction(
            {
                description: text,
                assigned_to_id: assignee.value.id,
                ...(dueDate.value ? { due_date: dueDateMillis(dueDate.value) } : {})
            },
            authStore,
            'non-conformities',
            props.nonConformityId
        )
        toast.showToast(t('common.success'), t('nc.immediateActions.saveSuccess'), 'success')
        description.value = ''
        dueDate.value = ''
        if (assignees.value.length !== 1) assignee.value = null
        await loadActions()
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) ||
                t('nc.immediateActions.saveError'),
            'error'
        )
    } finally {
        saving.value = false
    }
}

onMounted(async () => {
    try {
        await Promise.all([loadAssignees(), loadActions()])
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) ||
                t('nc.immediateActions.loadUsersError'),
            'error'
        )
    }
})
</script>
