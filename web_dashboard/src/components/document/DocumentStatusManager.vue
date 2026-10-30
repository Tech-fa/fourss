<template>
    <div class="space-y-4">
        <div>
            <div class="flex flex-col">
                <div class="flex flex-row gap-2 my-2" v-if="currentVersion?.status === 'pending' && isReviewer">
                    <button type="button" class="status-choice-btn status-choice-btn--approve"
                        :class="{ 'is-active': hasReviewed }"
                        @click="!hasReviewed && postAction({ type: 'reviewed' })" :disabled="actionLoading"
                        :aria-pressed="hasReviewed" test-id="ready-for-approval-button">
                        <Spinner v-if="actionLoading" width="0.875" />
                        <template v-else>
                            <i class="fa-solid fa-check" aria-hidden="true"></i>
                            <span>{{ t('document.status_manager.ready_for_approval') }}</span>
                        </template>
                    </button>
                    <button type="button" class="status-choice-btn status-choice-btn--reject"
                        :class="{ 'is-active': hasReviewedRejected }"
                        @click="!hasReviewedRejected && postAction({ type: 'reviewed_rejected' })"
                        :disabled="actionLoading" :aria-pressed="hasReviewedRejected"
                        test-id="request-changes-button">
                        <Spinner v-if="actionLoading" width="0.875" />
                        <template v-else>
                            <i class="fa-solid fa-ban" aria-hidden="true"></i>
                            <span>{{ t('document.status_manager.request_changes') }}</span>
                        </template>
                    </button>
                </div>
                <div class="flex flex-row gap-2 my-2"
                    v-else-if="currentVersion?.status === 'ready_for_approval' && isApprover">
                    <button type="button" class="status-choice-btn status-choice-btn--approve"
                        :class="{ 'is-active': hasApproved }"
                        @click="!hasApproved && postAction({ type: 'approved' })" :disabled="actionLoading"
                        :aria-pressed="hasApproved" test-id="approve-button">
                        <Spinner v-if="actionLoading" width="0.875" />
                        <template v-else>
                            <i class="fa-solid fa-check" aria-hidden="true"></i>
                            <span>{{ t('document.status_manager.approve') }}</span>
                        </template>
                    </button>
                    <button type="button" class="status-choice-btn status-choice-btn--reject"
                        :class="{ 'is-active': hasRejected }"
                        @click="!hasRejected && postAction({ type: 'rejected' })" :disabled="actionLoading"
                        :aria-pressed="hasRejected" test-id="approver-request-changes-button">
                        <Spinner v-if="actionLoading" width="0.875" />
                        <template v-else>
                            <i class="fa-solid fa-ban" aria-hidden="true"></i>
                            <span>{{ t('document.status_manager.request_changes') }}</span>
                        </template>
                    </button>
                </div>
                <Can subject="documents" :actions="['update']">
                    <span class="text-sm text-neutral-500" v-if="currentVersion?.status === 'pending'">
                        <p v-if="canSendForApproval" class="text-sm text-neutral-500 py-2">
                            {{ t('document.status_manager.reviews_complete_hint') }}
                        </p>
                        <AppButton v-if="canSendForApproval" @click="
                            async () =>
                                await postAction({
                                    type: 'ready_for_approval'
                                })
                        " :warn-before="t('document.status_manager.warn_send_for_approval')" buttonStyle="primary"
                            test-id="send-for-approval-button">{{ t('document.status_manager.send_for_approval') }}
                        </AppButton>
                    </span>
                    <!-- Ready for Approval Status Actions -->
                    <span class="text-sm text-neutral-500 flex flex-col gap-2"
                        v-else-if="currentVersion?.status === 'ready_for_approval'">
                        <p v-if="canPublish" class="text-sm text-neutral-500 py-2">
                            {{ t('document.status_manager.approvals_complete_hint') }}
                        </p>
                        <div class="grid grid-cols-2 gap-2 w-full">
                            <AppButton v-if="canPublish" @click="postAction({ type: 'published' })"
                                :loading="actionLoading" :warn-before="t('document.status_manager.warn_publish')"
                                buttonStyle="success" test-id="publish-document-button">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid fa-check text-xs"></i>
                                    <span>{{ t('document.status_manager.publish') }}</span>
                                </div>
                            </AppButton>
                            <AppButton v-if="reviewers.length > 0" @click="
                                async () =>
                                    await postAction({
                                        type: 'send_for_review'
                                    })
                            " :loading="actionLoading" buttonStyle="danger"
                                :warn-before="t('document.status_manager.warn_send_back_to_review')"
                                test-id="send-back-to-review-button">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid fa-ban text-xs"></i>
                                    <span>{{ t('document.status_manager.send_back_to_review') }}</span>
                                </div>
                            </AppButton>
                        </div>
                    </span>
                </Can>

                <!-- Mark Obsolete Button -->
                <Can subject="documents" :actions="['update']">
                    <div>
                        <AppButton v-if="
                            currentVersion?.status === 'published' &&
                            documentData?.versions[documentData?.versions.length - 1]
                                .versionNumber === currentVersion?.versionNumber
                        " buttonStyle="danger" @click="markObsolete"
                            :warn-before="t('document.status_manager.warn_mark_obsolete')"
                            test-id="mark-obsolete-button">
                            <i class="fa-solid fa-ban mr-2"></i>{{ t('document.status_manager.mark_obsolete') }}
                        </AppButton>
                    </div>
                </Can>
            </div>

            <!-- Override Approval Button -->
            <Can subject="documents" :actions="['override_approve']">
                <div class="border-t py-2 mt-2 flex flex-col gap-2 text-start"
                    v-if="showOverrideButton && !canSendForApproval">
                    <span class="text-sm text-neutral-500 mb-2">{{
                        t('document.status_manager.override_hint')
                        }}</span>
                    <AppButton buttonStyle="warning" @click="overrideApprove"
                        :warn-before="t('document.status_manager.warn_override_approval')"
                        test-id="override-approval-button">
                        <i class="fa-solid fa-triangle-exclamation mr-2"></i>
                        {{ t('document.status_manager.override_approval') }}
                    </AppButton>
                </div>
            </Can>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import Spinner from '../Spinner.vue'
import type { Document, DocumentVersion } from '@/util/interfaces'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()

interface Props {
    documentData: Document | undefined
    actionLoading: boolean
    reviewers: Array<{
        fname: string
        lname: string
        id: string
        action: string | null
        time: string | null
        createdDate: number
        actionMessage: string
        order?: number
    }>
    approvers: Array<{
        fname: string
        lname: string
        id: string
        action: string | null
        time: string | null
        actionMessage: string
        createdDate: number
        order?: number
    }>
    currentVersion?: DocumentVersion
}

interface Emits {
    (e: 'postAction', action: { type: string; comment?: string; versionNumber?: number }): void
    (e: 'markObsolete'): void
    (e: 'overrideApprove'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const authStore = useAuthStore()

function userCanActAtOrder(
    members: Array<{ id: string; action: string | null; order?: number }>,
    userId: string,
    completedAction: string
) {
    const actor = members.find((member) => member.id === userId)
    if (!actor) return false
    const actorOrder = actor.order ?? 1
    return !members.some(
        (member) => (member.order ?? 1) < actorOrder && member.action !== completedAction
    )
}

const isReviewer = computed(() => {
    const userId = authStore.state.userDetails.id
    if (!props.reviewers.some((reviewer) => reviewer.id === userId)) return false
    const strategy = props.documentData?.approvalStrategy
    if (!strategy?.allowOrdering || strategy.allReviewers) return true
    return userCanActAtOrder(props.reviewers, userId, 'reviewed')
})

const isApprover = computed(() => {
    const userId = authStore.state.userDetails.id
    if (!props.approvers.some((approver) => approver.id === userId)) return false
    const strategy = props.documentData?.approvalStrategy
    if (!strategy?.allowOrdering || strategy.allApprovers) return true
    return userCanActAtOrder(props.approvers, userId, 'approved')
})

const canSendForApproval = computed(() => {
    return (
        props.reviewers.filter((reviewer) => reviewer.action === 'reviewed').length >=
        (props.documentData?.approvalStrategy?.requiredReviews || 0) &&
        !props.reviewers.some((reviewer) => reviewer.action === 'reviewed_rejected')
    )
})

const canPublish = computed(() => {
    return (
        props.approvers.filter((approver) => approver.action === 'approved').length >=
        (props.documentData?.approvalStrategy?.requiredApprovals || 0) &&
        !props.approvers.some((approver) => approver.action === 'rejected')
    )
})

const showOverrideButton = computed(() => {
    return (
        !['published', 'obsolete'].includes(props.currentVersion?.status || '') &&
        (authStore.state.userDetails.teams || []).map((team) => team.id).includes(props.documentData?.team?.id || 0)
    )
})

const postAction = (action: {
    type: string
    comment?: string
    versionNumber?: number
}) => {
    emit('postAction', action)
}

const markObsolete = () => {
    emit('markObsolete')
}

const overrideApprove = () => {
    emit('overrideApprove')
}

const hasRejected = computed(() => {
    const currentVersion = props.documentData?.versions.find(
        (v) => v.versionNumber === props.currentVersion?.versionNumber
    )
    return props.documentData?.contributors
        .filter((c) => c.version === currentVersion?.versionNumber)
        .filter((contributor) => contributor.user?.id === authStore.state.userDetails.id)
        .some((contributor) => contributor.actions.some((action) => action.type === 'rejected'))
})
const hasReviewed = computed(() => {
    const currentVersion = props.documentData?.versions.find(
        (v) => v.versionNumber === props.currentVersion?.versionNumber
    )
    return props.documentData?.contributors
        .filter((c) => c.version === currentVersion?.versionNumber)
        .filter((contributor) => contributor.user?.id === authStore.state.userDetails.id)
        .some((contributor) => contributor.actions.some((action) => action.type === 'reviewed'))
})

const hasReviewedRejected = computed(() => {
    const currentVersion = props.documentData?.versions.find(
        (v) => v.versionNumber === props.currentVersion?.versionNumber
    )
    return props.documentData?.contributors
        .filter((c) => c.version === currentVersion?.versionNumber)
        .filter((contributor) => contributor.user?.id === authStore.state.userDetails.id)
        .some((contributor) =>
            contributor.actions.some((action) => action.type === 'reviewed_rejected')
        )
})
const hasApproved = computed(() => {
    const currentVersion = props.documentData?.versions.find(
        (v) => v.versionNumber === props.currentVersion?.versionNumber
    )
    return props.documentData?.contributors
        .filter((c) => c.version === currentVersion?.versionNumber)
        .filter((contributor) => contributor.user?.id === authStore.state.userDetails.id)
        .some((contributor) => contributor.actions.some((action) => action.type === 'approved'))
})
</script>

<style scoped>
.status-choice-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    min-height: 1.5rem;
    padding: 0.125rem 0.5rem;
    border-radius: 2px;
    border: 1px solid #d2d2d7;
    background: #fff;
    color: #1d1d1f;
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 1.2;
    cursor: pointer;
    transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
}

.status-choice-btn i {
    font-size: 0.625rem;
}

.status-choice-btn:hover:not(:disabled):not(.is-active) {
    background: #f5f5f7;
}

.status-choice-btn:active:not(:disabled) {
    transform: scale(0.98);
}

.status-choice-btn--approve.is-active {
    background: #34c759;
    border-color: #34c759;
    color: #fff;
}

.status-choice-btn--reject.is-active {
    background: #ff3b30;
    border-color: #ff3b30;
    color: #fff;
}

.status-choice-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
