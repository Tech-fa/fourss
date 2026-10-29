<template>
    <div
        class="bg-white rounded-lg w-[500px] shadow-lg"
        :test-id="`change-request-${mode}-modal`"
    >
        <Form @submit="handleSubmit" :initial-values="formData">
            <div class="p-6 border-b border-neutral-200">
                <h2 class="text-lg" :test-id="`change-request-${mode}-modal-title`">
                    {{
                        mode === 'approve'
                            ? t('document.change_requests.dialog.approve_modal_title')
                            : t('document.change_requests.dialog.reject_modal_title')
                    }}
                </h2>
            </div>

            <div class="p-6 space-y-4">
                <AppTextareaForm
                    name="reviewComment"
                    :label="
                        mode === 'approve'
                            ? t('document.change_requests.dialog.review_comment_optional')
                            : t('document.change_requests.dialog.review_comment_required')
                    "
                    :placeholder="
                        mode === 'approve'
                            ? t('document.change_requests.dialog.approve_comment_placeholder')
                            : t('document.change_requests.dialog.reject_comment_placeholder')
                    "
                    :rules="commentRule"
                    :required="mode === 'reject'"
                    :testID="`change-request-${mode}-comment`"
                />
            </div>

            <div class="p-6 border-t border-neutral-200 flex justify-end gap-3">
                <AppButton
                    type="button"
                    buttonStyle="secondary"
                    @click="onClose"
                    :disabled="loading"
                >
                    {{ t('common.cancel') }}
                </AppButton>
                <AppButton
                    type="submit"
                    :buttonStyle="mode === 'approve' ? 'success' : 'warning'"
                    :loading="loading"
                    :test-id="`change-request-${mode}-submit`"
                >
                    <i
                        :class="
                            mode === 'approve'
                                ? 'fa-solid fa-check me-2'
                                : 'fa-solid fa-ban me-2'
                        "
                    ></i>
                    {{
                        mode === 'approve'
                            ? t('document.change_requests.dialog.approve')
                            : t('document.change_requests.dialog.reject')
                    }}
                </AppButton>
            </div>
        </Form>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Form } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import AppTextareaForm from '@/components/AppTextareaForm.vue'
import AppButton from '../AppButton.vue'

const { t } = useI18n()

const props = defineProps<{
    mode: 'approve' | 'reject'
    onSubmit: (comment: string) => Promise<void> | void
    onClose: () => void
}>()

const loading = ref(false)

const formData = {
    reviewComment: ''
}

const commentRule = (v: string | undefined) => {
    if (props.mode === 'reject' && !v?.trim()) {
        return t('document.change_requests.dialog.toast_reject_reason_required')
    }
    return true
}

const handleSubmit = async (values: { reviewComment?: string }) => {
    loading.value = true
    try {
        await props.onSubmit(values.reviewComment?.trim() || '')
    } finally {
        loading.value = false
    }
}
</script>
