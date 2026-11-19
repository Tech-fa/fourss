<template>
    <div class="bg-white rounded-lg w-[500px] shadow-lg" test-id="reject-evidence-modal">
        <Form
            @submit="handleSubmit"
            id="reject-evidence-modal"
            :initial-values="formData"
        >
            <div class="p-6 border-b border-neutral-200">
                <h2 class="text-lg" test-id="reject-evidence-modal-title">{{ $t('nc.rejectEvidence.title') }}</h2>
            </div>
            
            <div class="p-6 space-y-4">
                <div test-id="reject-evidence-reason-field">
                    <AppTextareaForm
                        name="rejectionReason"
                        :label="$t('nc.rejectEvidence.reasonLabel')"
                        :placeholder="$t('nc.rejectEvidence.reasonPlaceholder')"
                        :rules="(v: any) => !v || v.trim() === '' ? $t('nc.rejectEvidence.reasonRequired') : true"
                        :required="true"
                    />
                </div>
            </div>
            
            <div class="p-6 border-t border-neutral-200 flex justify-end gap-3">
                <AppButton
                    buttonStyle="secondary"
                    type="button"
                    @click="props.onClose"
                >
                    {{ $t('nc.rejectEvidence.cancel') }}
                </AppButton>
                
                <AppButton
                    buttonStyle="primary"
                    type="submit"
                    test-id="reject-evidence-submit-button"
                    :loading="loading"
                >
                    {{ loading ? $t('nc.rejectEvidence.rejecting') : $t('nc.rejectEvidence.rejectButton') }}
                </AppButton>
            </div>
        </Form>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Form } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import AppTextareaForm from '@/components/AppTextareaForm.vue'
import AppButton from '../AppButton.vue'

const { t } = useI18n()

const props = defineProps<{
    loading?: boolean
    onSubmit: (reason: string) => Promise<void>
    onClose: () => void
    initialData?: any
}>()

const formData = ref<any>({
    rejectionReason: props.initialData?.rejectionReason || ''
})

watch(() => props.initialData, (newData) => {
    if (newData) {
        formData.value = { ...newData }
    }
}, { immediate: true })

const handleSubmit = async (values: any) => {
    const data = {
        rejectionReason: values.rejectionReason
    }
    await props.onSubmit(data.rejectionReason)
}
</script>
