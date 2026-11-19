<template>
    <span
        @click="handleDownload"
        :class="[
            'inline-flex items-center gap-1 text-sm px-3 py-1 rounded border border-neutral-300 text-neutral-900 hover:bg-neutral-200 transition cursor-pointer',
            { 'opacity-50 cursor-not-allowed': loading || !canDownload }
        ]"
        :title="downloadTitle"
        test-id="download-button"
    >
        <span v-if="!loading">
            <i class="fa-solid fa-download"></i>
            {{ label }}
        </span>
        <span v-else>
            <Spinner />
        </span>
    </span>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import JSZip from 'jszip'
import { apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import Spinner from './Spinner.vue'

const props = defineProps<{
    filePath?: string
    filePaths?: string[]
    fileName?: string
    zipFileName?: string
    label?: string
}>()

const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()
const loading = ref(false)

const paths = computed(() => {
    if (props.filePaths?.length) {
        return props.filePaths.filter((path) => typeof path === 'string' && path.length > 0)
    }
    return props.filePath ? [props.filePath] : []
})

const canDownload = computed(() => paths.value.length > 0)

const label = computed(() => props.label ?? t('common.download'))

const downloadTitle = computed(() => {
    if (!canDownload.value) {
        return t('common.file_uploader.no_file_available')
    }
    if (paths.value.length > 1) {
        return t('common.download_all_files', { count: paths.value.length })
    }
    return t('common.download_file')
})

const getDisplayFileName = (path: string, index: number) => {
    const segments = path.split('/').pop() || `file-${index}`
    const parts = segments.split('_')
    return parts.length > 1 ? parts.slice(1).join('_') : segments
}

const downloadSingleFile = async (path: string) => {
    const response = await apiGet<string>(`/files/${encodeURIComponent(path)}`, authStore)
    const link = document.createElement('a')
    link.href = response
    link.download = props.fileName || getDisplayFileName(path, 0)
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

const downloadMultipleFiles = async (files: string[]) => {
    const signedUrls = await Promise.all(
        files.map((file) => apiGet<string>(`/files/${encodeURIComponent(file)}`, authStore))
    )

    const zip = new JSZip()
    await Promise.all(
        signedUrls.map(async (url, index) => {
            const response = await fetch(url)
            const blob = await response.blob()
            zip.file(getDisplayFileName(files[index], index), blob)
        })
    )

    const content = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(content)
    link.download = props.zipFileName || 'evidence-files.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
}

const handleDownload = async () => {
    if (!canDownload.value || loading.value) return

    try {
        loading.value = true
        const files = paths.value
        if (files.length === 1) {
            await downloadSingleFile(files[0])
        } else {
            await downloadMultipleFiles(files)
        }
    } catch (error) {
        console.error('Error downloading file:', error)
        toast.showToast(t('common.error'), t('common.downloadError'), 'error')
    } finally {
        loading.value = false
    }
}
</script>
