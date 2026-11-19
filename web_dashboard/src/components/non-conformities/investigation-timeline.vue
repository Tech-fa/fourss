<template>
    <div class="bg-white border border-neutral-200 rounded-lg p-6" test-id="timeline-section">
        <h3 class="text-lg text-neutral-900 mb-4" test-id="timeline-title">{{ $t('nc.timeline.title') }}</h3>

        <div v-if="loading" class="flex justify-center py-8" test-id="timeline-loading">
            <Spinner />
        </div>

        <div v-else-if="timelineEvents.length > 0" class="space-y-4" test-id="timeline-events-list">
            <div v-for="event in timelineEvents" :key="event.id" class="flex items-start space-x-3" :test-id="`timeline-event-${event.id}`">
                <div class="flex-shrink-0 mt-1">
                    <div :class="['w-3 h-3 rounded-full', getEventColor(event.type)]" :test-id="`timeline-event-dot-${event.id}`"></div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <p class="text-sm text-neutral-900" :test-id="`timeline-event-title-${event.id}`">
                            <i :class="getEventIcon(event.type)" class="mr-2"></i>
                            {{ event.title }}
                        </p>
                        <span
                            class="text-xs text-neutral-500"
                            dir="ltr"
                            :test-id="`timeline-event-timestamp-${event.id}`"
                        >
                            {{ formatLocalDate(event.timestamp) }}
                        </span>
                    </div>
                    <p v-if="event.description" class="text-xs text-neutral-600 mt-1" :test-id="`timeline-event-description-${event.id}`">
                        {{ event.description }}
                    </p>
                    <p v-if="event.performer" class="text-xs text-neutral-500 mt-1" :test-id="`timeline-event-performer-${event.id}`">
                        {{ $t('nc.timeline.by') }} {{ event.performer }}
                    </p>
                </div>
            </div>
        </div>

        <div v-else class="text-center py-8" test-id="timeline-empty-state">
            <i class="fa-solid fa-clock text-4xl text-neutral-300 mb-4"></i>
            <p class="text-neutral-600">{{ $t('nc.timeline.noEvents') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import { formatLocalDate, formatApiErrorMessage, formatNcProblemStatement, formatDateToDay } from '@/util/util'
import { getAllInvestigations, getAllRootCauseAnalyses, getAllCorrectiveActions, NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'
import type {
    NonConformityResponseDTO,
    InvestigationResponseDTO,
    RootCauseAnalysisResponseDTO,
    ImmediateActionResponseDTO
} from '@/util/interfaces'
import Spinner from '../Spinner.vue'
import { getAllImmediateActions } from '../common/endpoints'

interface TimelineEvent {
    id: string
    type:
        | 'nc_created'
        | 'nc_closed'
        | 'nc_due_date_amended'
        | 'investigation'
        | 'rca'
        | 'immediate_action' // created
        | 'immediate_action_performed'
        | 'immediate_action_applied'
        | 'immediate_action_rejected'
        | 'immediate_action_verified'
        | 'immediate_action_closed'
        | 'corrective_action'
        | 'corrective_action_applied'
        | 'corrective_action_rejected'
        | 'corrective_action_closed'
        | 'corrective_action_verified'
    title: string
    description?: string
    performer?: string
    timestamp: number
}

const props = defineProps<{
    nonConformity: NonConformityResponseDTO
}>()

const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()

// State
const loading = ref(true)
const timelineEvents = ref<TimelineEvent[]>([])
const lastFetchTime = ref(0)
const isRefreshing = ref(false)

// Methods
const fetchTimelineData = async (force: boolean = false) => {
    if (!props.nonConformity) return

    // Prevent duplicate calls within 500ms unless forced
    const now = Date.now()
    if (!force && now - lastFetchTime.value < 500) {
        return
    }

    // Prevent multiple simultaneous calls
    if (isRefreshing.value) return

    try {
        isRefreshing.value = true
        loading.value = true
        lastFetchTime.value = now
        const events: TimelineEvent[] = []

        // Add NC creation event
        const ncTimestamp = +props.nonConformity.createdAt

        events.push({
            id: `nc-${props.nonConformity.id}`,
            type: 'nc_created',
            title: t('nc.timeline.ncCreated'),
            description: formatNcProblemStatement(props.nonConformity, t),
            performer: `${props.nonConformity?.createdBy?.fname} ${props.nonConformity?.createdBy?.lname}`,
            timestamp: ncTimestamp
        })

        // Add NC closed event if it's closed
        if (props.nonConformity.status === 'CLOSED') {
            events.push({
                id: `nc-closed-${props.nonConformity.id}`,
                type: 'nc_closed',
                title: t('nc.timeline.ncClosed'),
                description: t('nc.timeline.ncClosedDesc'),
                performer: undefined, // We don't know who closed it from the current data
                timestamp: Date.now() // We don't have the actual close timestamp, so use current time
            })
        }

        const amendments = props.nonConformity.dueDateAmendments || []
        amendments.forEach((amendment) => {
            const amendedBy = amendment.amendedBy
                ? `${amendment.amendedBy.fname || ''} ${amendment.amendedBy.lname || ''}`.trim()
                : undefined
            events.push({
                id: `nc-due-date-amended-${amendment.id}`,
                type: 'nc_due_date_amended',
                title: t('nc.timeline.dueDateAmended'),
                description: t('nc.timeline.dueDateAmendedDesc', {
                    previous: formatDateToDay(amendment.previousDueDate),
                    next: formatDateToDay(amendment.newDueDate)
                }),
                performer: amendedBy,
                timestamp: Number(amendment.amendedAt)
            })
        })

        // Fetch and add investigations
        try {
            const investigationsResponse = (await getAllInvestigations(
                props.nonConformity.id,
                authStore
            )) as any
            const investigations = investigationsResponse.data || investigationsResponse || []

            if (Array.isArray(investigations)) {
                investigations.forEach((investigation: any) => {
                    const timestamp =
                        typeof investigation.created_at === 'string'
                            ? parseInt(investigation.created_at)
                            : investigation.created_at

                    events.push({
                        id: `investigation-${investigation.id}`,
                        type: 'investigation',
                        title: t('nc.timeline.investigationLedTo', { action: getActionText(investigation?.action || 'none') }),
                        description: investigation.root_ca
                            ? `Linked to RCA: ${investigation.root_ca.problem_statement}`
                            : undefined,
                        timestamp: timestamp
                    })
                })
            }
        } catch (error) {
            console.error('Error fetching investigations:', error)
        }

        // Fetch and add root cause analyses
        try {
            const rcaResponse = (await getAllRootCauseAnalyses(
                props.nonConformity.id,
                authStore
            )) as any
            const rcas = rcaResponse.data || rcaResponse || []

            if (Array.isArray(rcas)) {
                rcas.forEach((rca: any) => {
                    const timestamp = rca.created_at
                    const finalTimestamp =
                        typeof timestamp === 'string' ? parseInt(timestamp) : timestamp

                    events.push({
                        id: `rca-${rca.id}`,
                        type: 'rca',
                        title: t('nc.timeline.rcaTitle', { method: getMethodText(rca.method) }),
                        description: rca.problem_statement,
                        performer: rca.performed_by && rca.performed_by.length > 0
                            ? rca.performed_by.map((u: any) => `${u.fname} ${u.lname}`).join(', ')
                            : undefined,
                        timestamp: finalTimestamp
                    })
                })
            }
        } catch (error) {
            console.error('Error fetching RCAs:', error)
        }

        // Fetch and add immediate actions
        try {
            const immediateActionsResponse = (await getAllImmediateActions(
                'non-conformities',
                props.nonConformity.id,
                authStore
            )) as ImmediateActionResponseDTO[]
            const immediateActions = immediateActionsResponse || []

            immediateActions.forEach((action: ImmediateActionResponseDTO) => {
                const timestamp = +action.createdAt // Ensure it's a number

                // Add creation event
                events.push({
                        id: `immediate-action-${action.id}`,
                        type: 'immediate_action',
                        title: t('nc.timeline.immediateActionCreated'),
                    description: action.action || action.description,
                    performer: `${action.createdBy?.fname} ${action.createdBy?.lname}`,
                    timestamp: timestamp
                })

                // Add performed event if status is IN_PROGRESS, APPLIED, or CLOSED
                // (performed means the assignee clicked "Perform" button, changing status from OPEN to IN_PROGRESS)
                if (action.status === 'ready_for_verification' || action.status === 'verified' || action.status === 'rejected') {
                    // Determine the performed timestamp:
                    // - If there's a rejection, it means it was performed again after rejection, so use timestamp after rejection
                    // - Otherwise, use createdAt + 1 second for the first perform
                    let performedTimestamp: number
                    if (action.rejectionExplanation) {
                        // If rejected, the perform happened after rejection
                        // Use appliedAt + 2000 (after applied + rejection) or current time if no appliedAt
                        performedTimestamp = action.appliedAt 
                            ? +action.appliedAt + 2000 
                            : (action.verifiedAt ? +action.verifiedAt + 2000 : Date.now())
                    } else {
                        // First time performing, use createdAt + 1 second
                        performedTimestamp = timestamp + 1000
                    }
                    events.push({
                        id: `immediate-action-performed-${action.id}`,
                        type: 'immediate_action_performed',
                        title: t('nc.timeline.immediateActionPerformed'),
                        description: t('nc.timeline.actionStarted', { action: action.action || action.description }),
                        performer: action.assignedTo
                            ? `${action.assignedTo.fname} ${action.assignedTo.lname}`
                            : undefined,
                        timestamp: performedTimestamp
                    })
                }

                // Add applied event if appliedAt exists
                if (action.appliedAt) {
                    // If there's a rejection, check if this is a re-apply after rejection
                    // The appliedAt timestamp should be after the rejection
                    let appliedTimestamp = +action.appliedAt
                    
                    // If there's a rejection and the status is applied/verified/closed,
                    // it means it was applied again after rejection, so ensure timestamp is after rejection
                    if (action.rejectionExplanation && (action.status === 'ready_for_verification' || action.status === 'verified')) {
                        // Ensure applied timestamp is after rejection timestamp
                        const rejectionTimestamp = action.appliedAt 
                            ? +action.appliedAt + 1000 
                            : (action.verifiedAt ? +action.verifiedAt + 1000 : Date.now())
                        // Use the later of appliedAt or rejectionTimestamp + 1000
                        appliedTimestamp = Math.max(appliedTimestamp, rejectionTimestamp + 1000)
                    }
                    
                    events.push({
                        id: `immediate-action-applied-${action.id}`,
                        type: 'immediate_action_applied',
                        title: t('nc.timeline.immediateActionApplied'),
                        description: t('nc.timeline.actionApplied', { action: action.action || action.description }),
                        performer: action.assignedTo
                            ? `${action.assignedTo.fname} ${action.assignedTo.lname}`
                            : undefined,
                        timestamp: appliedTimestamp
                    })
                }

                // Add rejected event if rejectionExplanation exists
                // (rejection happens after applied, so we use appliedAt + 1 second if available)
                if (action.rejectionExplanation) {
                    const rejectedTimestamp = action.appliedAt 
                        ? +action.appliedAt + 1000 
                        : (action.verifiedAt ? +action.verifiedAt + 1000 : Date.now())
                    events.push({
                        id: `immediate-action-rejected-${action.id}`,
                        type: 'immediate_action_rejected',
                        title: t('nc.timeline.immediateActionRejected'),
                        description: t('nc.timeline.actionRejected', { reason: action.rejectionExplanation }),
                        performer: action.createdBy
                            ? `${action.createdBy.fname} ${action.createdBy.lname}`
                            : undefined,
                        timestamp: rejectedTimestamp
                    })
                }

                // Add verified event if verifiedAt exists
                if (action.verifiedAt) {
                    events.push({
                        id: `immediate-action-verified-${action.id}`,
                        type: 'immediate_action_verified',
                        title: t('nc.timeline.immediateActionVerified'),
                        description: t('nc.timeline.actionVerified', { action: action.action || action.description }),
                        performer: action.verifiedBy
                            ? `${action.verifiedBy.fname} ${action.verifiedBy.lname}`
                            : undefined,
                        timestamp: +action.verifiedAt
                    })
                }

                // Add closed event if closedAt exists
                if (action.closedAt) {
                    events.push({
                        id: `immediate-action-closed-${action.id}`,
                        type: 'immediate_action_closed',
                        title: t('nc.timeline.immediateActionClosed'),
                        description: t('nc.timeline.actionCompleted', { action: action.action || action.description }),
                        performer: action.assignedTo
                            ? `${action.assignedTo.fname} ${action.assignedTo.lname}`
                            : undefined,
                        timestamp: +action.closedAt
                    })
                }
            })
        } catch (error) {
            console.error('Error fetching immediate actions:', error)
        }

        // Fetch and add corrective actions
        try {
            const correctiveActionsResponse = (await getAllCorrectiveActions(
                props.nonConformity.id,
                authStore
            )) as any
            const correctiveActions =
                correctiveActionsResponse.data || correctiveActionsResponse || []

            if (Array.isArray(correctiveActions)) {
                correctiveActions.forEach((ca: any) => {
                    const timestamp = +ca.createdAt

                    // Add creation event
                    events.push({
                        id: `corrective-action-${ca.id}`,
                        type: 'corrective_action',
                        title: t('nc.timeline.correctiveActionCreated'),
                        description: ca.title || ca.description || ca.action,
                        performer: ca.createdBy
                            ? `${ca.createdBy.fname} ${ca.createdBy.lname}`
                            : undefined,
                        timestamp: timestamp
                    })

                    // Add applied event if appliedAt exists
                    if (ca.appliedAt) {
                        events.push({
                            id: `corrective-action-applied-${ca.id}`,
                            type: 'corrective_action_applied',
                            title: t('nc.timeline.correctiveActionApplied'),
                            description: t('nc.timeline.caApplied', { title: ca.title || ca.description || ca.action }),
                            performer: ca.assignedTo
                                ? `${ca.assignedTo.fname || ca.assignedTo.firstName} ${ca.assignedTo.lname || ca.assignedTo.lastName}`
                                : undefined,
                            timestamp: +ca.appliedAt
                        })
                    }

                    // Add rejected event if rejectionExplanation exists
                    if (ca.rejectionExplanation) {
                        const rejectedTimestamp = ca.appliedAt
                            ? +ca.appliedAt + 1000
                            : Date.now()
                        events.push({
                            id: `corrective-action-rejected-${ca.id}`,
                            type: 'corrective_action_rejected',
                            title: t('nc.timeline.correctiveActionRejected'),
                            description: t('nc.timeline.actionRejected', { reason: ca.rejectionExplanation }),
                            performer: ca.createdBy
                                ? `${ca.createdBy.fname} ${ca.createdBy.lname}`
                                : undefined,
                            timestamp: rejectedTimestamp
                        })
                    }

                    // Add verified event if verifiedAt exists
                    if (ca.verifiedAt) {
                        events.push({
                            id: `corrective-action-verified-${ca.id}`,
                            type: 'corrective_action_verified',
                            title: t('nc.timeline.correctiveActionVerified'),
                            description: t('nc.timeline.caVerified', { title: ca.title || ca.description || ca.action }),
                            performer: ca.verifiedBy
                                ? `${ca.verifiedBy.fname} ${ca.verifiedBy.lname}`
                                : undefined,
                            timestamp: +ca.verifiedAt
                        })
                    }

                    // Add closed event if closedAt exists (only when status is CLOSED)
                    if (ca.closedAt && ca.status === 'CLOSED') {
                        events.push({
                            id: `corrective-action-closed-${ca.id}`,
                            type: 'corrective_action_closed',
                            title: t('nc.timeline.correctiveActionClosed'),
                            description: t('nc.timeline.caClosed', { title: ca.title || ca.description || ca.action }),
                            performer: ca.assignedTo
                                ? `${ca.assignedTo.fname || ca.assignedTo.firstName} ${ca.assignedTo.lname || ca.assignedTo.lastName}`
                                : undefined,
                            timestamp: +ca.closedAt
                        })
                    }
                })
            }
        } catch (error) {
            console.error('Error fetching corrective actions:', error)
        }

        // Sort events by timestamp (newest first)
        events.sort((a, b) => b.timestamp - a.timestamp)
        timelineEvents.value = events
    } catch (error: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.timeline.fetchError'), 'error')
    } finally {
        loading.value = false
        isRefreshing.value = false
    }
}

const getEventColor = (type: string) => {
    switch (type) {
        case 'nc_created':
            return 'bg-red-500'
        case 'nc_closed':
            return 'bg-gray-500'
        case 'nc_due_date_amended':
            return 'bg-amber-500'
        case 'investigation':
            return 'bg-blue-500'
        case 'rca':
            return 'bg-green-500'
        case 'immediate_action':
            return 'bg-yellow-500'
        case 'immediate_action_performed':
            return 'bg-orange-500'
        case 'immediate_action_applied':
            return 'bg-blue-500'
        case 'immediate_action_rejected':
            return 'bg-red-500'
        case 'immediate_action_verified':
            return 'bg-indigo-500'
        case 'immediate_action_closed':
            return 'bg-purple-500'
        case 'corrective_action':
            return 'bg-orange-500'
        case 'corrective_action_applied':
            return 'bg-blue-500'
        case 'corrective_action_rejected':
            return 'bg-red-500'
        case 'corrective_action_closed':
            return 'bg-amber-500'
        case 'corrective_action_verified':
            return 'bg-emerald-500'
        default:
            return 'bg-neutral-400'
    }
}

const getEventIcon = (type: string) => {
    switch (type) {
        case 'nc_created':
            return 'fa-solid fa-exclamation-triangle'
        case 'nc_closed':
            return 'fa-solid fa-check-circle'
        case 'nc_due_date_amended':
            return 'fa-solid fa-calendar-days'
        case 'investigation':
            return 'fa-solid fa-search'
        case 'rca':
            return 'fa-solid fa-project-diagram'
        case 'immediate_action':
            return 'fa-solid fa-bolt'
        case 'immediate_action_performed':
            return 'fa-solid fa-play-circle'
        case 'immediate_action_applied':
            return 'fa-solid fa-check'
        case 'immediate_action_rejected':
            return 'fa-solid fa-times-circle'
        case 'immediate_action_verified':
            return 'fa-solid fa-list-check'
        case 'immediate_action_closed':
            return 'fa-solid fa-check-double'
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

const getActionText = (action: string) => {
    switch (action) {
        case 'none': return t('nc.investigation.actionNone')
        case 'close': return t('nc.investigation.actionClose')
        case 'openCA': return t('nc.investigation.actionOpenCA')
        case 'openRCA': return t('nc.investigation.actionOpenRCA')
        default: return action
    }
}

const getMethodText = (method: string) => {
    switch (method) {
        case 'FiveWhys': return t('nc.rca.methodFiveWhys')
        case 'Fishbone': return t('nc.rca.methodFishbone')
        case 'CauseEffect': return t('nc.rca.methodCauseEffect')
        default: return method
    }
}

// Expose refresh method to parent component
const refreshTimeline = () => {
    fetchTimelineData(true) // Force refresh when called explicitly
}

// Expose methods so parent can call them
defineExpose({
    refreshTimeline
})

onMounted(() => {
    // Only fetch if we haven't already fetched from the watcher
    if (props.nonConformity) {
        fetchTimelineData()
    }
})
</script>
