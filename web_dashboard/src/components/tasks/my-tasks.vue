<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs" />

        <main id="main-content" class="flex-1 p-6">
            <div class="mb-6">
                <h2 class="text-3xl text-neutral-900">{{ t('tasks.title') }}</h2>
                <p class="mt-1 text-neutral-600">{{ t('tasks.subtitle') }}</p>
            </div>

            <div class="mb-4">
                <div
                    class="inline-flex rounded-md border border-neutral-200 bg-white p-1"
                    role="group"
                    :aria-label="t('tasks.filters.label')"
                >
                    <button
                        v-for="filter in filterOptions"
                        :key="filter.id"
                        type="button"
                        class="rounded px-3 py-1.5 text-sm"
                        :class="
                            dueFilter === filter.id
                                ? 'bg-neutral-900 text-white'
                                : 'text-neutral-700 hover:bg-neutral-100'
                        "
                        :aria-pressed="dueFilter === filter.id"
                        :test-id="`my-tasks-filter-${filter.id}`"
                        @click="setFilter(filter.id)"
                    >
                        {{ filter.label }}
                    </button>
                </div>
                <p class="mt-2 text-sm text-neutral-500">
                    {{ t('tasks.dueSoonWindow', { days: DAYS_SOON }) }}
                </p>
            </div>

            <div
                v-if="loading"
                class="flex justify-center py-16"
                role="status"
                test-id="my-immediate-action-tasks"
            >
                <Spinner width="2.5" />
            </div>

            <p
                v-else-if="actions.length === 0"
                class="rounded-md border border-dashed border-neutral-300 bg-white px-4 py-10 text-center text-sm text-neutral-600"
                role="status"
                test-id="my-immediate-action-tasks"
            >
                {{ dueFilter === 'all' ? t('tasks.empty') : t('tasks.emptyFiltered') }}
            </p>

            <ul
                v-else
                class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
                test-id="my-immediate-action-tasks"
            >
                <li v-for="action in actions" :key="action.id">
                    <router-link
                        :to="action.route || `/tasks/immediate-actions/${action.id}`"
                        class="relative flex h-full flex-col rounded-lg border bg-white p-4 ps-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                        :class="toneFor(action.urgency).card"
                        :test-id="`my-task-${action.id}`"
                    >
                        <span
                            class="absolute inset-y-0 start-0 w-1"
                            :class="toneFor(action.urgency).bar"
                            aria-hidden="true"
                        />
                        <div class="flex items-start justify-between gap-3">
                            <h3 class="text-base font-medium text-neutral-900 line-clamp-3">
                                {{ action.title }}
                            </h3>
                            <span
                                class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                                :class="toneFor(action.urgency).badge"
                            >
                                {{ urgencyLabel(action.urgency) }}
                            </span>
                        </div>
                        <dl class="mt-4 space-y-1 text-sm">
                            <div class="flex gap-2">
                                <dt class="text-neutral-500">{{ t('tasks.tableStatus') }}</dt>
                                <dd class="text-neutral-900">
                                    {{ statusLabel(action.status) || t('immediateActions.notApplicable') }}
                                </dd>
                            </div>
                            <div class="flex gap-2">
                                <dt class="text-neutral-500">{{ t('tasks.tableDueDate') }}</dt>
                                <dd class="text-neutral-900">
                                    {{
                                        action.dueDate
                                            ? formatDateToDay(Number(action.dueDate))
                                            : t('tasks.noDueDate')
                                    }}
                                </dd>
                            </div>
                        </dl>
                    </router-link>
                </li>
            </ul>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BreadCrums from '../breadCrums.vue'
import Spinner from '../Spinner.vue'
import { apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { formatApiErrorMessage, formatDateToDay } from '@/util/util'
import type { UserLinkedRecordsResponse } from '@/util/interfaces'
import { USER_TASK_ERROR_I18N_PREFIX } from './routes'

/** Days ahead that count as due soon. Sent to the tasks API as days_soon. */
const DAYS_SOON = 3

type DueFilter = 'all' | 'due_soon' | 'overdue'
type TaskUrgency = 'overdue' | 'due_soon' | 'scheduled' | null

type ImmediateActionTask = {
    id: string
    title: string
    status?: string | null
    dueDate?: number | null
    route: string | null
    urgency: TaskUrgency
}

const { t, te } = useI18n()
const authStore = useAuthStore()
const toast = useToast()
const loading = ref(true)
const dueFilter = ref<DueFilter>('all')
const actions = ref<ImmediateActionTask[]>([])
let requestId = 0

const crumbs = computed(() => [
    {
        name: t('tasks.breadcrumb'),
        path: '/tasks',
        icon: 'fa-solid fa-list-check'
    }
])

const filterOptions = computed(() => [
    { id: 'all' as const, label: t('tasks.filters.all') },
    { id: 'due_soon' as const, label: t('tasks.filters.dueSoon') },
    { id: 'overdue' as const, label: t('tasks.filters.overdue') }
])

const urgencyRank: Record<string, number> = {
    overdue: 0,
    due_soon: 1,
    scheduled: 2
}

const toneFor = (urgency: TaskUrgency) => {
    if (urgency === 'overdue') {
        return {
            card: 'border-red-200 hover:border-red-300',
            bar: 'bg-red-600',
            badge: 'bg-red-100 text-red-800'
        }
    }
    if (urgency === 'due_soon') {
        return {
            card: 'border-amber-200 hover:border-amber-300',
            bar: 'bg-amber-500',
            badge: 'bg-amber-100 text-amber-900'
        }
    }
    if (urgency === 'scheduled') {
        return {
            card: 'border-emerald-200 hover:border-emerald-300',
            bar: 'bg-emerald-600',
            badge: 'bg-emerald-100 text-emerald-800'
        }
    }
    return {
        card: 'border-neutral-200 hover:border-neutral-300',
        bar: 'bg-neutral-300',
        badge: 'bg-neutral-100 text-neutral-700'
    }
}

const statusLabel = (status?: string | null) => {
    if (!status) return ''
    const key = `immediateActions.status.${status}`
    return te(key) ? t(key) : status
}

const urgencyLabel = (urgency: TaskUrgency) => {
    if (urgency === 'overdue') return t('tasks.urgency.overdue')
    if (urgency === 'due_soon') return t('tasks.urgency.dueSoon')
    if (urgency === 'scheduled') return t('tasks.urgency.scheduled')
    return t('tasks.urgency.none')
}

const setFilter = (filter: DueFilter) => {
    if (dueFilter.value === filter) return
    dueFilter.value = filter
    loadTasks()
}

const loadTasks = async () => {
    const id = ++requestId
    loading.value = true
    try {
        const params: { days_soon: number; due?: 'due_soon' | 'overdue' } = {
            days_soon: DAYS_SOON
        }
        if (dueFilter.value !== 'all') params.due = dueFilter.value
        const response = await apiGet<UserLinkedRecordsResponse>(
            '/users/myTasks',
            authStore,
            params
        )
        if (id !== requestId) return
        const group = response.groups?.find((item) => item.type === 'immediate_actions')
        const tasks = (group?.items || []).map((item) => ({
            id: item.id,
            title: item.title,
            status: item.status,
            dueDate: item.dueDate,
            route: item.route,
            urgency: item.urgency ?? null
        }))
        tasks.sort((a, b) => {
            const rank = (urgencyRank[a.urgency || ''] ?? 3) - (urgencyRank[b.urgency || ''] ?? 3)
            if (rank !== 0) return rank
            const due =
                (a.dueDate ?? Number.MAX_SAFE_INTEGER) - (b.dueDate ?? Number.MAX_SAFE_INTEGER)
            if (due !== 0) return due
            return a.title.localeCompare(b.title)
        })
        actions.value = tasks
    } catch (error: any) {
        if (id !== requestId) return
        actions.value = []
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, USER_TASK_ERROR_I18N_PREFIX) ||
                t('tasks.loadError'),
            'error'
        )
    } finally {
        if (id === requestId) loading.value = false
    }
}

onMounted(loadTasks)
</script>
