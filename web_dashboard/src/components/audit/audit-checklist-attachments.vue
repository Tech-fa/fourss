<template>
    <section class="bg-white border border-neutral-200 rounded-lg" test-id="checklist-attachments">
        <div class="p-4 flex items-center justify-between gap-3 border-b border-neutral-200">
            <div>
                <h3 class="text-lg font-medium text-neutral-900">
                    {{ t('audit.checklist_attachments.title') }}
                </h3>
                <p class="text-xs text-neutral-500 mt-1">
                    {{ t('audit.checklist_attachments.hint') }}
                </p>
            </div>
            <Can subject="audit_checklist_responses" :actions="['create', 'update']">
                <AppButton
                    v-if="!readOnly"
                    button-style="secondary"
                    type="button"
                    :loading="uploading"
                    test-id="add-checklist-attachment"
                    @click="openFilePicker"
                >
                    <span class="flex items-center gap-2">
                        <i class="fa-solid fa-paperclip"></i>
                        {{ t('audit.checklist_attachments.add') }}
                    </span>
                </AppButton>
            </Can>
            <input
                ref="fileInput"
                type="file"
                class="hidden"
                :accept="acceptedTypes"
                test-id="checklist-attachment-input"
                @change="onFileSelected"
            />
        </div>

        <div class="p-4">
            <div v-if="loading" class="flex justify-center py-6">
                <Spinner width="6" />
            </div>
            <div
                v-else-if="attachments.length === 0"
                class="rounded-md bg-neutral-50 px-4 py-6 text-center"
                test-id="checklist-attachments-empty"
            >
                <i class="fa-solid fa-paperclip text-neutral-400 text-xl mb-2"></i>
                <div class="text-sm text-neutral-600">
                    {{ t('audit.checklist_attachments.empty') }}
                </div>
            </div>
            <ul v-else class="flex flex-col gap-2" test-id="checklist-attachments-list">
                <li
                    v-for="attachment in attachments"
                    :key="attachment.id"
                    class="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2"
                    test-id="checklist-attachment-item"
                >
                    <div class="min-w-0">
                        <div class="truncate text-neutral-900">{{ attachment.fileName }}</div>
                        <div class="text-xs text-neutral-500 mt-0.5">
                            {{ attachmentMeta(attachment) }}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <a
                            class="inline-flex items-center gap-1 text-sm px-3 py-1 rounded border border-neutral-300 text-neutral-900 hover:bg-neutral-200 transition"
                            :href="downloadHref(attachment.filePath)"
                            :download="attachment.fileName"
                            target="_blank"
                            rel="noopener"
                            :test-id="`download-attachment-${attachment.id}`"
                        >
                            <i class="fa-solid fa-download"></i>
                            {{ t('audit.checklist_attachments.download') }}
                        </a>
                        <Can subject="audit_checklist_responses" :actions="['delete']">
                            <AppButton
                                v-if="!readOnly"
                                button-style="neutral"
                                type="button"
                                :warn-before="t('audit.checklist_attachments.delete_confirm')"
                                :loading="deletingId === attachment.id"
                                :test-id="`remove-attachment-${attachment.id}`"
                                @click="removeAttachment(attachment)"
                            >
                                <span class="flex items-center gap-2">
                                    <i class="fa-solid fa-trash"></i>
                                    {{ t('audit.checklist_attachments.remove') }}
                                </span>
                            </AppButton>
                        </Can>
                    </div>
                </li>
            </ul>
        </div>
    </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import Spinner from '../Spinner.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiDelete, apiGet, apiPost } from '@/util/api'
import type { AuditInstanceAttachment } from '@/util/interfaces'
import { formatDateToDay, formatApiErrorMessage } from '@/util/util'
import { getRuntimeConfig } from '@/util/runtime-config'

const props = defineProps<{
    auditInstanceId: string
    readOnly?: boolean
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()

const attachments = ref<AuditInstanceAttachment[]>([])
const loading = ref(true)
const uploading = ref(false)
const deletingId = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const acceptedTypes = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.csv'
const maxSizeMb = 10
const forbiddenExtensions = ['exe', 'bat', 'cmd', 'sh', 'js', 'msi', 'com', 'scr', 'pif', 'cpl', 'jar', 'vbs', 'wsf', 'ps1']

const openFilePicker = () => {
    fileInput.value?.click()
}

const downloadHref = (filePath: string) => {
    const base = getRuntimeConfig().apiUrl.replace(/\/$/, '')
    return `${base}/files/${encodeURIComponent(filePath)}`
}

const attachmentMeta = (attachment: AuditInstanceAttachment) => {
    const when = formatDateToDay(attachment.createdAt)
    const name = [attachment.createdBy?.fname, attachment.createdBy?.lname].filter(Boolean).join(' ')
    if (!name) return when
    return t('audit.checklist_attachments.added_by', { name, date: when })
}

const loadAttachments = async () => {
    loading.value = true
    try {
        attachments.value = await apiGet<AuditInstanceAttachment[]>(
            `/audits/instances/${props.auditInstanceId}/attachments`,
            authStore
        )
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.checklist_attachments.toast_load_failed'),
            'error'
        )
    } finally {
        loading.value = false
    }
}

const onFileSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file || props.readOnly) return

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension && forbiddenExtensions.includes(extension)) {
        toast.showToast(t('common.error'), t('common.file_uploader.toast_forbidden_type'), 'error')
        return
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
        toast.showToast(
            t('common.error'),
            t('common.file_uploader.toast_file_too_large', { size: maxSizeMb }),
            'error'
        )
        return
    }

    uploading.value = true
    try {
        const formData = new FormData()
        formData.append('file', file)
        const created = await apiPost<AuditInstanceAttachment>(
            `/audits/instances/${props.auditInstanceId}/attachments`,
            formData,
            authStore
        )
        attachments.value = [created, ...attachments.value]
        toast.showToast(t('common.success'), t('audit.checklist_attachments.toast_uploaded'), 'success')
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.checklist_attachments.toast_upload_failed'),
            'error'
        )
    } finally {
        uploading.value = false
    }
}

const removeAttachment = async (attachment: AuditInstanceAttachment) => {
    deletingId.value = attachment.id
    try {
        await apiDelete(
            `/audits/instances/${props.auditInstanceId}/attachments/${attachment.id}`,
            authStore
        )
        attachments.value = attachments.value.filter((item) => item.id !== attachment.id)
        toast.showToast(t('common.success'), t('audit.checklist_attachments.toast_removed'), 'success')
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.checklist_attachments.toast_remove_failed'),
            'error'
        )
    } finally {
        deletingId.value = null
    }
}

onMounted(loadAttachments)
</script>
