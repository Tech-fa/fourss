<template>
    <div class="bg-white rounded-lg shadow-lg w-[450px] p-0 h-[700px] overflow-y-auto" test-id="upload-report-modal">
        <div class="border-b border-neutral-200 px-6 py-5 flex items-center justify-between" test-id="upload-report-modal-header">
            <div class="text-lg" test-id="upload-report-modal-title">{{ t('audit.upload_report.modal_title') }}</div>
            <button @click="handleCancel" class="text-neutral-500 hover:text-neutral-900 text-xl" test-id="upload-report-modal-close-button">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        
        <Form @submit="handleSubmit" class="px-6 py-6 space-y-6" test-id="upload-report-form">
            <div test-id="upload-report-title-field">
                <AppInputForm
                    name="title"
                    :label="t('audit.upload_report.title_label')"
                    :value="formData.title"
                    :placeholder="t('audit.upload_report.title_placeholder')"
                    :rules="(v: any) => (!v ? t('audit.upload_report.title_required') : true)"
                    required
                />
            </div>
            
            <div test-id="upload-report-date-field">
                <AppInputForm
                    name="originalDate"
                    :label="t('audit.upload_report.original_date_label')"
                    type="date"
                    :value="formData.originalDate"
                    :placeholder="t('audit.upload_report.original_date_placeholder')"
                />
            </div>
            
            <div test-id="upload-report-file-field">
                <label class="block text-sm text-neutral-700 mb-2" test-id="upload-report-file-label">
                    {{ t('audit.upload_report.file_label') }} <span class="text-red-500">*</span>
                </label>
                <FileUploader
                    v-model="selectedFile"
                    accept=".pdf,.docx,.doc"
                    inputId="audit-report-file"
                    test-id="upload-report-file-uploader"
                />
            </div>
            
            <div test-id="upload-report-description-field">
                <AppTextareaForm
                    name="description"
                    :label="t('audit.upload_report.description_label')"
                    :value="formData.description"
                    :placeholder="t('audit.upload_report.description_placeholder')"
                    rows="3"
                />
            </div>
            
            <div class="flex items-center justify-end gap-3 pt-4" test-id="upload-report-actions">
                <AppButton
                    type="button"
                    buttonStyle="secondary"
                    @click="handleCancel"
                    test-id="upload-report-cancel-button"
                >
                    {{ t('audit.upload_report.cancel') }}
                </AppButton>
                <AppButton
                    type="submit"
                    buttonStyle="primary"
                    :loading="loading"
                    :disabled="!selectedFile"
                    test-id="upload-report-save-button"
                >
                    <template v-if="!loading">
                        <i class="fa-solid fa-upload mr-2"></i>
                        {{ t('audit.upload_report.submit') }}
                    </template>
                    <template v-else>
                        {{ t('audit.upload_report.uploading') }}
                    </template>
                </AppButton>
            </div>
        </Form>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form } from 'vee-validate';
import AppInputForm from '../AppInputForm.vue';
import AppTextareaForm from '../AppTextareaForm.vue';
import AppButton from '../AppButton.vue';
import FileUploader from '../FileUploader.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/stores/notification';
import { apiPost } from '@/util/api';
import { AuditReportType } from '@/util/interfaces';
import { formatApiErrorMessage } from '@/util/util';

const props = defineProps<{
    auditInstanceId: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>();

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false);
const selectedFile = ref<File | null>(null);

const formData = reactive({
    title: undefined,
    originalDate: undefined,
    description: undefined,
});

const handleCancel = () => {
    if (props.onCancel) {
        props.onCancel();
    }
};

const handleSubmit = async (values: any) => {
    if (!selectedFile.value) {
        toast.showToast(t('common.error'), t('audit.upload_report.toast_no_file'), 'error')
        return;
    }
    
    if (!values.title?.trim()) {
        toast.showToast(t('common.error'), t('audit.upload_report.toast_invalid_title'), 'error')
        return;
    }
    
    loading.value = true;
    
    try {
        // Create FormData for file upload
        const uploadFormData = new FormData();
        
        // Append the file
        uploadFormData.append('file', selectedFile.value);
        
        // Append other form data
        uploadFormData.append('title', values.title);
        uploadFormData.append('type', AuditReportType.UPLOADED);
        
        if (values.description) {
            uploadFormData.append('description', values.description);
        }
        
        if (values.originalDate) {
            uploadFormData.append('originalDate', new Date(values.originalDate).getTime().toString());
        }
        
        // Send FormData to the backend
        await apiPost(`/audits/instances/${props.auditInstanceId}/reports`, uploadFormData, authStore);
        
        if (props.onSuccess) {
            props.onSuccess();
        }
    } catch (error: any) {
        console.error('Error uploading report:', error);
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error.response?.data, t, 'errors.audit') || t('audit.upload_report.toast_upload_failed'),
            'error'
        )
    } finally {
        loading.value = false;
    }
};
</script>
