<template>
    <div class="bg-white rounded-lg shadow-lg w-full max-w-xl" test-id="create-new-version-modal">
        <div class="p-6 border-b flex items-center justify-between" test-id="create-new-version-header">
            <div class="flex items-center gap-3" test-id="create-new-version-title">
                <i class="fa-solid fa-file-circle-plus text-neutral-700 text-xl"></i>
                <h2 class="text-lg font-semibold">{{ t('document.create_version.title') }}</h2>
            </div>
            <button
                type="button"
                @click="handleCancel"
                class="text-neutral-400 hover:text-neutral-600"
                :aria-label="t('document.create_version.close_aria')"
                test-id="create-new-version-close-button"
            >
                <i class="fa-solid fa-xmark text-xl"></i>
            </button>
        </div>

        <form class="p-6 space-y-6" @submit.prevent="handleSubmit" test-id="create-new-version-form">
            <div class="space-y-2" test-id="upload-file-section">
                <label class="block text-sm font-medium text-neutral-700" test-id="upload-file-label">{{
                    t('document.create_version.upload_label')
                }}</label>
                <FileUploader
                    v-model="file"
                    inputId="create-version-file"
                    :maxSizeMB="15"
                    :accept="'*/*'"
                />
                <p class="text-xs text-neutral-500" test-id="upload-file-info">
                    {{ t('document.create_version.upload_hint') }}
                </p>
            </div>

            <div class="space-y-2" test-id="summary-of-changes-section">
                <label
                    class="block text-sm font-medium text-neutral-700"
                    for="change-summary"
                    test-id="summary-of-changes-label"
                >
                    {{ t('document.create_version.changes_label') }}
                </label>
                <AppInput
                    id="change-summary"
                    :hide-icon="true"
                    v-model="changes"
                    :placeholder="t('document.create_version.changes_placeholder')"
                    :disabled="loading"
                    test-id="summary-of-changes-input"
                />
            </div>

            <div class="space-y-4" test-id="create-new-version-expiry">
                <ToggleSwitch
                    v-model="neverExpires"
                    :label="neverExpires ? t('document.form.never_expires') : t('document.form.expires')"
                    active-color="bg-blue-600"
                    test-id="create-version-never-expires-toggle"
                    @update:modelValue="onNeverExpiresChange"
                />
                <div v-if="!neverExpires">
                    <label class="block text-sm mb-1">{{ t('document.form.valid_until') }}</label>
                    <AppInput
                        name="dueDate"
                        :label="t('document.form.due_date')"
                        type="date"
                        :placeholder="t('document.form.due_date_placeholder')"
                        v-model="dueDate"
                        :hide-icon="true"
                        :disabled="loading"
                        test-id="create-version-due-date-input"
                    />
                </div>
            </div>

            <div class="border-t pt-4 flex justify-end gap-3" test-id="create-new-version-actions">
                <AppButton
                    type="button"
                    buttonStyle="secondary"
                    @click="handleCancel"
                    :disabled="loading"
                    test-id="create-new-version-cancel-button"
                >
                    {{ t('common.cancel') }}
                </AppButton>
                <AppButton
                    type="submit"
                    buttonStyle="primary"
                    :disabled="!file || loading"
                    :loading="loading"
                    test-id="create-new-version-submit-button"
                >
                    <template v-if="!loading">
                        <i class="fa-solid fa-floppy-disk mr-2"></i>
                        {{ t('document.create_version.submit') }}
                    </template>
                    <template v-else>
                        {{ t('document.create_version.submitting') }}
                    </template>
                </AppButton>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import FileUploader from '../FileUploader.vue'
import AppInput from '../AppInput.vue'
import ToggleSwitch from '../ToggleSwitch.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiPostFormData } from '@/util/api'
import { appendDocumentDueDate, documentDueDateFormState, formatApiErrorMessage } from '@/util/util'

const { t } = useI18n()

const props = defineProps<{
    documentId: string
    dueDate?: number | string | null
    onConfirm: () => void
    onCancel: () => void
}>()

const authStore = useAuthStore()
const toast = useToast()

const initialDueDate = documentDueDateFormState(props.dueDate)
const file = ref<File | null>(null)
const changes = ref('')
const loading = ref(false)
const neverExpires = ref(initialDueDate.neverExpires)
const dueDate = ref(initialDueDate.dueDate)

const onNeverExpiresChange = (value: boolean) => {
    if (value) dueDate.value = ''
}

const handleCancel = () => {
    if (!loading.value) {
        props.onCancel()
    }
}

const handleSubmit = async () => {
    if (!file.value) {
        toast.showToast(t('common.error'), t('document.create_version.toast_select_file'), 'error')
        return
    }

    loading.value = true
    try {
        const formData = new FormData()
        formData.append('file', file.value)
        if (changes.value.trim()) {
            formData.append('changes', changes.value.trim())
        }
        appendDocumentDueDate(formData, dueDate.value, neverExpires.value)

        await apiPostFormData(`/documents/${props.documentId}/versions`, formData, authStore)
        props.onConfirm()
    } catch (error: any) {
        console.error('Failed to create document version', error)
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            raw || t('document.create_version.toast_create_failed'),
            'error'
        )
    } finally {
        loading.value = false
    }
}
</script>
