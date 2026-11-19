<template>
    <div class="bg-white rounded-lg shadow-lg w-[500px] p-0 max-h-[80vh] overflow-y-auto" test-id="report-details-modal">
        <div class="border-b border-neutral-200 px-6 py-5 flex items-center justify-between" test-id="report-details-header">
            <div class="text-lg font-medium" test-id="report-details-title">{{ t('audit.report_details.modal_title') }}</div>
            <button @click="handleClose" class="text-neutral-500 hover:text-neutral-900 text-xl" test-id="report-details-close-button">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        
        <div class="px-6 py-6 space-y-6" test-id="report-details-content">
            <!-- Report Title -->
            <div test-id="report-details-title-field">
                <label class="block text-sm font-medium text-neutral-700 mb-2">{{ t('audit.report_details.report_title') }}</label>
                <div class="text-neutral-900 text-base" test-id="report-details-title-value">{{ report.title }}</div>
            </div>
            
            <!-- Report Type -->
            <div test-id="report-details-type-field">
                <label class="block text-sm font-medium text-neutral-700 mb-2">{{ t('audit.report_details.report_type') }}</label>
                <div class="flex items-center gap-2">
                    <span 
                        :class="[
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            report.type === 'GENERATED' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                        ]"
                        test-id="report-details-type-value"
                    >
                        <i 
                            :class="[
                                'mr-1.5',
                                report.type === 'GENERATED' 
                                    ? 'fa-solid fa-file-lines' 
                                    : 'fa-solid fa-upload'
                            ]"
                        ></i>
                        {{
                            report.type === 'GENERATED'
                                ? t('audit.report_details.type_generated')
                                : t('audit.report_details.type_uploaded')
                        }}
                    </span>
                </div>
            </div>
            
            <!-- Description -->
            <div v-if="report.description" test-id="report-details-description-field">
                <label class="block text-sm font-medium text-neutral-700 mb-2">{{ t('audit.report_details.description') }}</label>
                <div class="text-neutral-900 text-sm leading-relaxed bg-neutral-50 p-3 rounded" test-id="report-details-description-value">
                    {{ report.description }}
                </div>
            </div>
            
            <!-- Notes -->
            <div v-if="report.notes" test-id="report-details-notes-field">
                <label class="block text-sm font-medium text-neutral-700 mb-2">{{ t('audit.report_details.notes') }}</label>
                <div class="text-neutral-900 text-sm leading-relaxed bg-neutral-50 p-3 rounded" test-id="report-details-notes-value">
                    {{ report.notes }}
                </div>
            </div>
            
            <!-- Original Date (for uploaded reports) -->
            <div v-if="report.originalDate" test-id="report-details-original-date-field">
                <label class="block text-sm font-medium text-neutral-700 mb-2">{{ t('audit.report_details.original_date') }}</label>
                <div class="text-neutral-900 text-sm" test-id="report-details-original-date-value">
                    {{ formatDate(report.originalDate) }}
                </div>
            </div>
            
            <!-- File Information -->
            <div v-if="report.filePath" test-id="report-details-file-field">
                <label class="block text-sm font-medium text-neutral-700 mb-2">{{ t('audit.report_details.file') }}</label>
                <div class="flex items-center justify-between bg-neutral-50 p-3 rounded" test-id="report-details-file-info">
                    <div class="flex items-center gap-2" test-id="report-details-file-name">
                        <i class="fa-solid fa-file-pdf text-red-500"></i>
                        <span class="text-sm text-neutral-700">
                            {{ getFileName(report.filePath) }}
                        </span>
                    </div>
                    <DownloadButton :filePath="report.filePath" />
                </div>
            </div>
            
            <!-- Created Information -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4" test-id="report-details-created-info">
                <div test-id="report-details-created-by-field">
                    <label class="block text-sm font-medium text-neutral-700 mb-2">{{ t('audit.report_details.created_by') }}</label>
                    <div class="text-neutral-900 text-sm" test-id="report-details-created-by-value">
                        {{ report.createdBy.fname }} {{ report.createdBy.lname }}
                    </div>
                </div>
                <div test-id="report-details-created-date-field">
                    <label class="block text-sm font-medium text-neutral-700 mb-2">{{ t('audit.report_details.created_date') }}</label>
                    <div class="text-neutral-900 text-sm" test-id="report-details-created-date-value">
                        {{ formatDateWithTime(report.createdAt) }}
                    </div>
                </div>
            </div>
            
            <!-- Updated Date -->
            <div v-if="report.updatedAt !== report.createdAt" test-id="report-details-updated-date-field">
                <label class="block text-sm font-medium text-neutral-700 mb-2">{{ t('audit.report_details.last_updated') }}</label>
                <div class="text-neutral-900 text-sm" test-id="report-details-updated-date-value">
                    {{ formatDateWithTime(report.updatedAt) }}
                </div>
            </div>
        </div>
        
        <div class="border-t border-neutral-200 px-6 py-4 flex justify-end" test-id="report-details-actions">
            <AppButton
                type="button"
                buttonStyle="secondary"
                @click="handleClose"
                test-id="report-details-close-button-action"
            >
                {{ t('audit.report_details.close') }}
            </AppButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import AppButton from '../AppButton.vue'
import DownloadButton from '../download-button.vue'
import type { AuditReport } from '@/util/interfaces'
import { formatDateToDay, formatDate as formatDateWithTime } from '@/util/util'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
    report: AuditReport
    onClose?: () => void
}>()

const handleClose = () => {
    if (props.onClose) {
        props.onClose();
    }
};

const formatDate = (timestamp: number): string => {
    return formatDateToDay(timestamp);
};

const getFileName = (filePath: string): string => {
    if (!filePath) return t('audit.report_details.unknown_file')
    
    // Extract filename from path, handling both forward and backward slashes
    const parts = filePath.split(/[/\\]/);
    const fileName = parts[parts.length - 1];
    
    // Remove UUID prefix if present (format: uuid_filename)
    const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}_/i;
    return fileName.replace(uuidRegex, '');
};
</script> 