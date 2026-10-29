<template>
    <div class="flex items-center justify-center z-50" @click.self="onCancel">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 class="text-xl font-bold mb-4">
                {{ t('document.upload_version.title', { n: version?.versionNumber }) }}
            </h2>

            <div class="mb-4">
                <p class="text-sm text-neutral-600 mb-4">
                    {{ t('document.upload_version.description', { n: version?.versionNumber }) }}
                </p>

                <FileUploader v-model="file" inputId="version-file-upload" :accept="'*/*'" />
                <div class="my-4">
                    <AppInput
                        v-model="changes"
                        :placeholder="t('document.upload_version.changes_placeholder')"
                        :disabled="loading"
                        :hide-icon="true"
                    />
                </div>
            </div>

            <div class="flex gap-2 justify-end">
                <AppButton buttonStyle="secondary" @click="onCancel" :disabled="loading">
                    {{ t('common.cancel') }}
                </AppButton>
                <AppButton
                    buttonStyle="primary"
                    @click="handleUpload"
                    :loading="loading"
                    :disabled="!file || loading"
                    test-id="upload-version-file-button"
                >
                    {{ t('document.upload_version.upload') }}
                </AppButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import FileUploader from '../FileUploader.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiPostFormData } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'
import AppInput from '../AppInput.vue'

const { t } = useI18n()

const props = defineProps<{
    version: {
        id: number
        versionNumber: number
        changes?: string
    }
    documentId: string
    onConfirm: () => void
    onCancel: () => void
}>()

const authStore = useAuthStore()
const toast = useToast()
const file = ref<File | null>(null)
const loading = ref(false)
const changes = ref<string>('')
const handleUpload = async () => {
    if (!file.value) {
        toast.showToast(t('common.error'), t('document.upload_version.toast_select_file'), 'error')
        return
    }

    loading.value = true
    try {
        const formData = new FormData()
        formData.append('file', file.value)
        formData.append('changes', changes.value)

        await apiPostFormData(
            `/documents/${props.documentId}/versions/${props.version.id}/upload-file`,
            formData,
            authStore
        )

        props.onConfirm()
    } catch (error: any) {
        console.error('Error uploading file:', error)
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(t('common.error'), raw || t('document.upload_version.toast_failed'), 'error')
    } finally {
        loading.value = false
    }
}
</script>
