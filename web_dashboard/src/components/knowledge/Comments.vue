<template>
    <div id="comments" class="bg-white rounded-lg border border-neutral-200 p-6">
        <h3 class="text-xl mb-4">{{ t('comments.heading', { count: commentsCount || 0 }) }}</h3>
        <div v-if="!readonly" class="mb-6">
            <textarea
                :placeholder="t('comments.placeholder')"
                v-model="commentText"
                class="w-full p-4 border border-neutral-300 rounded-lg mb-2"
                test-id="comment-input"
            ></textarea>
            <AppButton
                buttonStyle="primary"
                @click="handlePostComment"
                :loading="loading"
                :disabled="loading"
                test-id="post-comment-button"
            >
                {{ t('comments.post') }}
            </AppButton>
        </div>

        <div class="space-y-4">
            <div
                class="border-b border-neutral-200 pb-4"
                v-for="comment in comments"
                :key="comment.id"
                :test-id="`comment-item-${comment.id}`"
            >
                <div class="flex items-start gap-3">
                    <MemberIcon
                        :member="{
                            fname: comment?.fname,
                            lname: comment?.lname,
                            image: '',
                            index: 0
                        }"
                    />
                    <div class="flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span>{{ comment?.fname }} {{ comment?.lname }}</span>
                            <span class="text-sm text-neutral-500">{{
                                formatDate(comment?.createdDate)
                            }}</span>
                            <span
                                v-if="comment?.type === 'rejection'"
                                class="inline-flex px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs"
                                test-id="comment-rejection-badge"
                            >
                                {{ t('comments.rejectionBadge') }}
                            </span>
                        </div>
                        <p
                            class="mt-1"
                            :class="
                                comment?.type === 'rejection'
                                    ? 'text-red-800'
                                    : 'text-neutral-600'
                            "
                        >
                            {{ comment?.comment }}
                        </p>
                        <button
                            v-if="canDeleteComment(comment)"
                            @click="$emit('onDelete', comment.id)"
                            class="text-red-500 hover:text-red-700 text-sm mt-2"
                            :title="t('comments.delete_comment_title')"
                            :test-id="`comment-delete-${comment.id}`"
                        >
                            <i class="fa-solid fa-trash"></i> {{ t('comments.delete') }}
                        </button>
                    </div>
                </div>
            </div>
            <div
                v-if="!comments?.length"
                class="text-neutral-500 italic text-sm"
                test-id="comments-empty-state"
            >
                {{ t('comments.empty') }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import MemberIcon from '../memberIcon.vue'
import { formatLocalDate } from '@/util/util'

const { t } = useI18n()

type CommentItem = {
    id: number | string
    fname: string
    lname: string
    comment: string
    createdDate: number
    type?: string
    canDelete?: boolean
}

const props = defineProps<{
    commentsCount?: number
    comments?: CommentItem[]
    loading?: boolean
    readonly?: boolean
}>()

const emit = defineEmits<{
    (e: 'postComment', comment: string): void
    (e: 'onDelete', commentId: number | string): void
}>()

const commentText = ref('')

const canDeleteComment = (comment: CommentItem) => {
    if (props.readonly) return false
    if (comment.type === 'rejection') return false
    if (comment.canDelete === false) return false
    return true
}

const handlePostComment = () => {
    if (commentText.value) {
        emit('postComment', commentText.value)
        commentText.value = ''
    }
}

const formatDate = (timestamp: number | string) => {
    if (!timestamp) return ''

    const numericTimestamp = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp

    if (isNaN(numericTimestamp)) {
        console.error('Invalid timestamp:', timestamp)
        return t('document.view.invalid_date')
    }

    return formatLocalDate(numericTimestamp)
}
</script>
