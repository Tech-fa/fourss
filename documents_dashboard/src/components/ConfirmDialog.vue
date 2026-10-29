<template>
    <div
        id="modal"
        class="bg-white rounded-lg shadow-lg w-full max-w-md text-start"
        :dir="locale === 'ar' ? 'rtl' : 'ltr'"
    >
        <div id="modal-header" class="p-6 border-b">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <h2 class="text-lg">{{ t('common.confirm_dialog_title') }}</h2>
                </div>
                <button
                    type="button"
                    @click="onCancel"
                    class="text-neutral-400 hover:text-neutral-600"
                    :aria-label="t('common.cancel')"
                >
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
        </div>

        <div id="modal-content" class="p-6">
            <div class="flex items-center gap-4 mb-6">
                <div>
                    <p>{{ message }}</p>
                </div>
            </div>
        </div>
        <div id="modal-footer" class="p-6 border-t bg-neutral-50 rounded-b-lg">
            <div class="flex justify-end gap-3">
                <AppButton @click="onCancel" buttonStyle="secondary" test-id="confirm-dialog-cancel">{{
                    t('common.cancel')
                }}</AppButton>
                <AppButton @click="handleConfirm" buttonStyle="primary" :loading="loading" test-id="confirm-delete-button">
                    {{ t('common.confirm') }}
                </AppButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from './AppButton.vue'

const { t, locale } = useI18n()
const loading = ref(false)

const props = defineProps<{
    message: string
    onConfirm: () => void
    onCancel: () => void
}>()
const handleConfirm = async () => {
    loading.value = true
    await props.onConfirm()
}

</script>
