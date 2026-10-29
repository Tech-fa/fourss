<template>
    <div :class="iconOnly ? 'inline-flex' : ''">
        <div
            v-if="currentFile && !modelValue"
            class="flex items-center p-3 border border-neutral-200 rounded-md bg-neutral-50 mb-3"
            test-id="current-file"
        >
            <i class="fa-regular fa-file-pdf text-neutral-500"></i>
            <span class="ml-2 break-all">{{ t('common.file_uploader.current_file') }} {{ currentFile }}</span>
            <span
                v-if="downloadUrl"
                @click="() => downloadFile()"
                class="ml-2 text-blue-500 hover:text-blue-700 cursor-pointer"
                test-id="file-download-icon"
            >
                <i class="fa-solid fa-download"></i>
            </span>
        </div>
        <div v-if="files.length > 0">
            <div v-for="file in files" :key="file" class="my-2 bg-neutral-50 rounded-md p-2 flex items-center">
                <i class="fa-regular fa-file-pdf text-neutral-500"></i>
                <span
                    @click="() => downloadFile(file)"
                    class="ml-2 text-blue-500 hover:text-blue-700 cursor-pointer"
                >
                    {{
                        file
                            .split('_')
                            .filter((_, index) => index !== 0)
                            .reduce((acc, curr) => acc + ' ' + curr)
                    }}
                    <i class="fa-solid fa-download"></i>
                </span>
            </div>
        </div>
        <div
            v-if="modelValue && !iconOnly"
            class="flex items-center border border-neutral-200 rounded-md bg-neutral-50"
            :class="compact ? 'p-2 text-sm' : 'p-3'"
        >
            <i class="fa-regular fa-file-pdf text-neutral-500"></i>
            <span class="ml-2 truncate">{{ t('common.file_uploader.new_file') }} {{ modelValue.name }}</span>
            <button
                v-if="showTrash"
                type="button"
                @click="removeFile"
                class="ml-auto text-neutral-500 hover:text-neutral-700"
            >
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        <div
            class="mt-3 border-2 border-dashed border-neutral-200 rounded-lg p-6 text-center"
            v-if="!readonly && !compact && !iconOnly"
        >
            <i class="fa-solid fa-cloud-arrow-up text-4xl text-neutral-400 mb-2"></i>
            <p class="text-sm text-neutral-500">{{ t('common.file_uploader.dropzone_title') }}</p>
            <input
                type="file"
                @change="handleFileUpload"
                class="hidden"
                :id="inputId"
                :accept="accept"
                :multiple="false"
                test-id="file-input"
            />
            <label
                :for="inputId"
                class="mt-2 px-4 py-2 border border-neutral-200 rounded-md hover:bg-neutral-50 cursor-pointer inline-block"
            >
                {{ t('common.file_uploader.browse') }}
            </label>
            <p class="text-sm text-neutral-500">
                {{
                    t('common.file_uploader.acceptable_types', {
                        types: accept == '*/*' ? t('common.file_uploader.all_types') : accept
                    })
                }}
            </p>
        </div>
        <div v-else-if="!readonly && iconOnly" class="inline-flex">
            <input
                type="file"
                @change="handleFileUpload"
                class="hidden"
                :id="inputId"
                :accept="accept"
                :multiple="false"
                test-id="file-input"
            />
            <label
                :for="inputId"
                class="text-primary hover:text-primary/70 cursor-pointer inline-flex"
                :title="browseTitle || t('common.file_uploader.browse')"
                :aria-label="browseTitle || t('common.file_uploader.browse')"
            >
                <i class="fa-solid fa-cloud-arrow-up"></i>
            </label>
        </div>
        <div v-else-if="!readonly" class="mt-1">
            <input
                type="file"
                @change="handleFileUpload"
                class="hidden"
                :id="inputId"
                :accept="accept"
                :multiple="false"
                test-id="file-input"
            />
            <label
                :for="inputId"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-200 rounded-md hover:bg-neutral-50 cursor-pointer"
            >
                <i class="fa-solid fa-cloud-arrow-up"></i>
                {{ t('common.file_uploader.browse') }}
            </label>
        </div>
    </div>
</template>

<script setup lang="ts">
import { apiGet } from '@/util/api'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()

const props = defineProps({
    modelValue: {
        type: Object as () => File | null,
        default: null
    },
    currentFile: {
        type: String,
        default: ''
    },
    files: {
        type: Array as () => string[],
        default: () => []
    },
    downloadUrl: {
        type: String,
        default: ''
    },
    accept: {
        type: String,
        default: '.pdf,.doc,.docx,.xls,.xlsx'
    },
    inputId: {
        type: String,
        default: 'file-upload'
    },
    readonly: {
        type: Boolean,
        default: false
    },
    maxSizeMB: {
        type: Number,
        default: 10
    },
    showTrash: {
        type: Boolean,
        default: true
    },
    compact: {
        type: Boolean,
        default: false
    },
    iconOnly: {
        type: Boolean,
        default: false
    },
    browseTitle: {
        type: String,
        default: ''
    }
})

const emit = defineEmits(['update:modelValue'])

const getMaxFileSize = () => props.maxSizeMB * 1024 * 1024
const FORBIDDEN_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'js', 'msi', 'com', 'scr', 'pif', 'cpl', 'jar', 'vbs', 'wsf', 'ps1']

const handleFileUpload = (event: Event) => {
    const input = event.target as HTMLInputElement
    if (input.files && input.files[0]) {
        const file = input.files[0]

        // File size check
        const maxSize = getMaxFileSize()
        if (file.size > maxSize) {
            toast.showToast(
                t('common.error'),
                t('common.file_uploader.toast_file_too_large', { size: props.maxSizeMB }),
                'error'
            )
            input.value = ''
            emit('update:modelValue', null)
            return
        }

        // File extension/type check
        const allowed = props.accept
            .split(',')
            .map(ext => ext.replace('.', '').toLowerCase().trim())
            .filter(Boolean)
        const ext = file.name.split('.').pop()?.toLowerCase()

        // Forbidden extension check (move before allowed check)
        if (ext && FORBIDDEN_EXTENSIONS.includes(ext)) {
            toast.showToast(
                t('common.error'),
                t('common.file_uploader.toast_forbidden_type'),
                'error'
            )
            input.value = ''
            emit('update:modelValue', null)
            return
        }

        if (!ext || (props.accept !== '*/*' && !allowed.includes(ext))) {
            toast.showToast(
                t('common.error'),
                t('common.file_uploader.toast_invalid_type', { list: allowed.join(', ') }),
                'error'
            )
            input.value = ''
            emit('update:modelValue', null)
            return
        }
        emit('update:modelValue', file)
    }
}

const removeFile = () => {
    emit('update:modelValue', null)
    // Reset file input
    const fileInput = document.querySelector(`input[id="${props.inputId}"]`) as HTMLInputElement
    if (fileInput) fileInput.value = ''
}

const downloadFile = async (file?: string) => {
    try {
        const response = await apiGet<string>(
            `/files/${encodeURIComponent(file || props.downloadUrl)}`,
            authStore
        )

        const link = document.createElement('a')
        link.href = response
        document.body.appendChild(link)
        link.target = '_blank'
        link.click()
        document.body.removeChild(link)
    } catch (error) {
        console.error('Error downloading document:', error)
        toast.showToast(t('common.error'), t('common.file_uploader.toast_download_failed'), 'error')
    }
}
</script>
