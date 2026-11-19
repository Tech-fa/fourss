<template>
    <div class="bg-white border border-neutral-200 rounded-lg p-6" test-id="ca-timeline-section">
        <h3 class="text-lg text-neutral-900 mb-4" test-id="ca-timeline-title">
            {{ $t('nc.ca.detail.timelineTitle') }}
        </h3>

        <div v-if="timelineEvents.length > 0" class="space-y-4" test-id="ca-timeline-events-list">
            <div
                v-for="event in timelineEvents"
                :key="event.id"
                class="flex items-start space-x-3"
                :test-id="`ca-timeline-event-${event.id}`"
            >
                <div class="shrink-0 mt-1">
                    <div
                        :class="['w-3 h-3 rounded-full', getEventColor(event.type)]"
                        :test-id="`ca-timeline-event-dot-${event.id}`"
                    ></div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <p
                            class="text-sm text-neutral-900"
                            :test-id="`ca-timeline-event-title-${event.id}`"
                        >
                            <i :class="getEventIcon(event.type)" class="mr-2"></i>
                            {{ event.title }}
                        </p>
                        <span
                            class="text-xs text-neutral-500"
                            dir="ltr"
                            :test-id="`ca-timeline-event-timestamp-${event.id}`"
                        >
                            {{ formatLocalDate(event.timestamp) }}
                        </span>
                    </div>
                    <p
                        v-if="event.description"
                        class="text-xs text-neutral-600 mt-1"
                        :test-id="`ca-timeline-event-description-${event.id}`"
                    >
                        {{ event.description }}
                    </p>
                    <p
                        v-if="event.performer"
                        class="text-xs text-neutral-500 mt-1"
                        :test-id="`ca-timeline-event-performer-${event.id}`"
                    >
                        {{ $t('nc.timeline.by') }} {{ event.performer }}
                    </p>
                </div>
            </div>
        </div>

        <div v-else class="text-center py-8" test-id="ca-timeline-empty-state">
            <i class="fa-solid fa-clock text-4xl text-neutral-300 mb-4"></i>
            <p class="text-neutral-600">{{ $t('nc.timeline.noEvents') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatLocalDate } from '@/util/util'
import {
    type CorrectiveAction,
    NCCorrectiveActionStatus
} from '@/util/interfaces'

type CaTimelineEventType =
    | 'corrective_action'
    | 'corrective_action_applied'
    | 'corrective_action_rejected'
    | 'corrective_action_verified'
    | 'corrective_action_closed'

interface TimelineEvent {
    id: string
    type: CaTimelineEventType
    title: string
    description?: string
    performer?: string
    timestamp: number
}

const props = defineProps<{
    correctiveAction: CorrectiveAction
}>()

const { t } = useI18n()

const userName = (user?: { fname?: string; lname?: string } | null) => {
    if (!user) return undefined
    const name = `${user.fname || ''} ${user.lname || ''}`.trim()
    return name || undefined
}

const timelineEvents = computed(() => {
    const ca = props.correctiveAction
    if (!ca) return []

    const events: TimelineEvent[] = []
    const createdAt = +(ca.createdAt || 0)
    const title = ca.title || ca.description

    if (createdAt) {
        events.push({
            id: `corrective-action-${ca.id}`,
            type: 'corrective_action',
            title: t('nc.timeline.correctiveActionCreated'),
            description: title,
            performer: userName(ca.createdBy),
            timestamp: createdAt
        })
    }

    if (ca.appliedAt) {
        events.push({
            id: `corrective-action-applied-${ca.id}`,
            type: 'corrective_action_applied',
            title: t('nc.timeline.correctiveActionApplied'),
            description: t('nc.timeline.caApplied', { title }),
            performer: userName(ca.assignedTo),
            timestamp: +ca.appliedAt
        })
    }

    if (ca.rejectionExplanation) {
        const rejectedTimestamp = ca.appliedAt ? +ca.appliedAt + 1000 : Date.now()
        events.push({
            id: `corrective-action-rejected-${ca.id}`,
            type: 'corrective_action_rejected',
            title: t('nc.timeline.correctiveActionRejected'),
            description: t('nc.timeline.actionRejected', { reason: ca.rejectionExplanation }),
            performer: userName(ca.createdBy),
            timestamp: rejectedTimestamp
        })
    }

    if (ca.verifiedAt) {
        events.push({
            id: `corrective-action-verified-${ca.id}`,
            type: 'corrective_action_verified',
            title: t('nc.timeline.correctiveActionVerified'),
            description: t('nc.timeline.caVerified', { title }),
            performer: userName(ca.verifiedBy),
            timestamp: +ca.verifiedAt
        })
    }

    if (ca.closedAt && ca.status === NCCorrectiveActionStatus.CLOSED) {
        events.push({
            id: `corrective-action-closed-${ca.id}`,
            type: 'corrective_action_closed',
            title: t('nc.timeline.correctiveActionClosed'),
            description: t('nc.timeline.caClosed', { title }),
            performer: userName(ca.createdBy) || userName(ca.assignedTo),
            timestamp: +ca.closedAt
        })
    }

    return events.sort((a, b) => b.timestamp - a.timestamp)
})

const getEventColor = (type: CaTimelineEventType) => {
    switch (type) {
        case 'corrective_action':
            return 'bg-orange-500'
        case 'corrective_action_applied':
            return 'bg-blue-500'
        case 'corrective_action_rejected':
            return 'bg-red-500'
        case 'corrective_action_verified':
            return 'bg-emerald-500'
        case 'corrective_action_closed':
            return 'bg-amber-500'
        default:
            return 'bg-neutral-400'
    }
}

const getEventIcon = (type: CaTimelineEventType) => {
    switch (type) {
        case 'corrective_action':
            return 'fa-solid fa-tools'
        case 'corrective_action_applied':
            return 'fa-solid fa-check'
        case 'corrective_action_rejected':
            return 'fa-solid fa-times-circle'
        case 'corrective_action_verified':
            return 'fa-solid fa-list-check'
        case 'corrective_action_closed':
            return 'fa-solid fa-check-double'
        default:
            return 'fa-solid fa-circle'
    }
}
</script>
