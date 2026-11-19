<template>
    <div class="bg-white rounded-lg w-[500px] shadow-lg" test-id="cause-effect-modal">
        <Form @submit="handleSubmit">
            <div class="p-6 border-b border-neutral-200">
                <h2 class="text-lg" test-id="cause-effect-modal-title">{{ modalTitle }}</h2>
            </div>

            <div class="p-6 space-y-4">
                <div class="flex gap-4">
                    <div class="flex-1" test-id="cause-effect-name-field">
                        <AppInputForm
                            name="label"
                            :label="fieldLabel"
                            type="text"
                            :value="props.existingValue"
                            :placeholder="namePlaceholder"
                            :rules="(v: any) => (!v ? t('nc.causeEffect.fieldRequired') : true)"
                            :required="true"
                            testID="cause-effect-name-input"
                        />
                    </div>
                    <div v-if="!props.hideDisplayOrder" class="w-32">
                        <label class="block mb-2 text-sm">{{ t('nc.causeEffect.displayOrder') }}</label>
                        <AppInput
                            name="displayOrder"
                            :label="t('nc.causeEffect.displayOrder')"
                            type="number"
                            v-model="displayOrder"
                        />
                    </div>
                </div>
            </div>

            <div class="p-6 border-t border-neutral-200 flex justify-end gap-3" test-id="cause-effect-modal-actions">
                <AppButton buttonStyle="secondary" type="button" @click="props.onClose" test-id="cause-effect-modal-cancel-button">
                    {{ t('common.cancel') }}
                </AppButton>

                <AppButton buttonStyle="primary" type="submit" :loading="submitLoading" test-id="cause-effect-modal-submit-button">
                    {{ submitLabel }}
                </AppButton>
            </div>
        </Form>
    </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form } from 'vee-validate'
import AppInputForm from '@/components/AppInputForm.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '../AppButton.vue'

const { t } = useI18n()

const props = defineProps<{
    formType: 'Effect' | 'Cause'
    onSubmit: (values: any) => Promise<void>
    onClose: () => void
    hideDisplayOrder?: boolean
    existingValue?: string
}>()

const displayOrder = ref(1)
const submitLoading = ref(false)

const formTypeLabel = computed(() =>
    props.formType === 'Effect' ? t('nc.causeEffect.typeEffect') : t('nc.causeEffect.typeCause')
)

const modalTitle = computed(() =>
    props.existingValue
        ? t('nc.causeEffect.modalTitleEdit', { type: formTypeLabel.value })
        : t('nc.causeEffect.modalTitleAdd', { type: formTypeLabel.value })
)

const fieldLabel = computed(() =>
    props.formType === 'Effect' ? t('nc.causeEffect.labelName') : t('nc.causeEffect.labelText')
)

const namePlaceholder = computed(() =>
    props.formType === 'Effect'
        ? t('nc.causeEffect.placeholderEffect')
        : t('nc.causeEffect.placeholderCause')
)

const submitLabel = computed(() =>
    props.existingValue
        ? t('nc.causeEffect.submitUpdate', { type: formTypeLabel.value })
        : t('nc.causeEffect.submitCreate', { type: formTypeLabel.value })
)

const handleSubmit = async (values: any) => {
    submitLoading.value = true
    const data = {
        label: values.label
    }
    try {
        await props.onSubmit(data)
    } finally {
        submitLoading.value = false
    }
}
</script>
