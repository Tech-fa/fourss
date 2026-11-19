<template>
    <div id="modal" class="bg-white rounded-lg shadow-lg  w-[400px]">
        <div id="modal-header" class="p-6 border-b">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <h2 class="text-lg font-semibold">{{ $t('nc.addCause.title', { category: categoryName }) }}</h2>
                </div>
                <button @click="onCancel" class="text-neutral-400 hover:text-neutral-600">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
        </div>

        <div id="modal-content" class="p-6">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-neutral-700 mb-2">
                        {{ $t('nc.addCause.causeLabel') }}
                    </label>
                    <input
                        v-model="causeText"
                        type="text"
                        class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        :placeholder="$t('nc.addCause.causePlaceholder')"
                        @keyup.enter="handleAdd"
                        ref="causeInput"
                        test-id="add-cause-modal-input"
                    />
                </div>
            </div>
        </div>

        <div id="modal-footer" class="p-6 border-t bg-neutral-50 rounded-b-lg">
            <div class="flex justify-end gap-3">
                <AppButton @click="onCancel" buttonStyle="secondary">
                    {{ $t('nc.addCause.cancel') }}
                </AppButton>
                <AppButton 
                    @click="handleAdd" 
                    buttonStyle="primary" 
                    :loading="loading"
                    :disabled="!causeText.trim()"
                    test-id="add-cause-modal-submit-button"
                >
                    {{ $t('nc.addCause.addButton') }}
                </AppButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'

const { t } = useI18n()

const props = defineProps<{
    categoryName: string
    loading?: boolean
    onConfirm: (cause: string) => void
    onCancel: () => void
}>()

const causeText = ref('')
const causeInput = ref<HTMLInputElement>()

const handleAdd = () => {
    const cause = causeText.value.trim()
    if (cause) {
        props.onConfirm(cause)
    }
}

// Auto focus the input when modal opens
onMounted(() => {
    setTimeout(() => {
        causeInput.value?.focus()
    }, 100)
})
</script> 