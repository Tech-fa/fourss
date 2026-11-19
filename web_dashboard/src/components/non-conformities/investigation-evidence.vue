<template>
    <div class="bg-white border border-neutral-200 rounded-lg p-6" v-if="!loading">
        <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg text-neutral-900">{{ $t('nc.investigation.evidence.title') }}</h3>
        </div>
        <!-- Upload Section -->
        <Can
            subject="investigation_evidence"
            :actions="['create']"
            v-if="canMutateNonConformity(nonConformity)"
        >
            <div class="flex flex-col justify-end md:flex-row md:items-center gap-4 mb-6">
                <input
                    type="file"
                    ref="fileInput"
                    @change="handleFileChange"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    class="hidden"
                    :disabled="uploading"
                    test-id="investigation-evidence-file-input"
                />
                <AppButton
                    buttonStyle="primary"
                    test-id="investigation-evidence-upload-button"
                    @click="() => fileInput?.click()"
                    :disabled="uploading"
                    class="w-full md:w-auto"
                >
                    <i class="fa-solid fa-upload mr-2"></i>
                    {{ uploading ? $t('nc.investigation.evidence.uploading') : $t('nc.investigation.evidence.uploadButton') }}
                </AppButton>
            </div>
        </Can>
        <hr class="my-6 border-neutral-200" />
        <!-- Evidence List -->
        <div v-if="loading" class="flex justify-center py-8">
            <i class="fa-solid fa-spinner fa-spin text-2xl text-neutral-400"></i>
        </div>
        <div v-else>
            <div 
                v-if="evidenceList.length === 0" 
                class="flex flex-col items-center py-8"
                test-id="investigation-evidence-empty-state"
            >
                <i class="fa-regular fa-folder-open text-4xl text-neutral-300 mb-2"></i>
                <p class="text-neutral-500" test-id="investigation-evidence-empty-message">{{ $t('nc.investigation.evidence.noEvidence') }}</p>
            </div>
            <div v-else>
                <Table
                    :cols="[$t('nc.investigation.evidence.tableFile'), $t('nc.investigation.evidence.tableUploadedBy'), $t('nc.investigation.evidence.tableDate')]"
                    :rows="tableRows"
                    :entities="evidenceList"
                    :entityName="$t('nc.investigation.evidence.title')"
                    :subject="'investigation_evidence'"
                    :page="1"
                    :total="evidenceList.length"
                    :perPage="evidenceList.length"
                    :totalPages="1"
                    :onNextPage="() => {}"
                    :onPreviousPage="() => {}"
                    :setPage="() => {}"
                    :onSuccess="() => {}"
                    :hideEdit="() => true"
                    :hideView="() => true"
                    :handleDelete="
                        canMutateNonConformity(nonConformity) ? confirmDeleteEvidence : undefined
                    "
                >
                    <template #extra-field="{ entity }">
                        <Can subject="investigation_evidence" :actions="['read']">
                            <span class="mr-2" />
                            <DownloadButton :file-path="entity.file_url" />
                        </Can>
                    </template>
                </Table>
            </div>
        </div>
    </div>
    <div v-else class="flex items-center justify-center py-12">
        <Spinner />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPost, apiDelete } from '@/util/api'
import { formatDate, formatApiErrorMessage, canMutateNonConformity } from '@/util/util'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import Table from '../Table.vue'
import { useDialog } from '@/stores/dialog'
import ConfirmDialog from '../ConfirmDialog.vue'
import {
    type InvestigationEvidenceResponseDTO,
    type NonConformityResponseDTO
} from '@/util/interfaces'
import Spinner from '../Spinner.vue'
import FileUploader from '../FileUploader.vue'
import DownloadButton from '../download-button.vue'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'

// Locally define the InvestigationEvidenceResponseDTO interface

const props = defineProps<{ investigationId: string; nonConformity: NonConformityResponseDTO }>()

const authStore = useAuthStore()
const toast = useToast()
const dialog = useDialog()
const { t } = useI18n()

const evidenceList = ref<InvestigationEvidenceResponseDTO[]>([])
const loading = ref(true)
const uploading = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const tableRows = computed(() =>
    evidenceList.value.map((evidence) => ({
        [t('nc.investigation.evidence.tableFile')]: getFileName(evidence.file_url),
        [t('nc.investigation.evidence.tableUploadedBy')]:
            `${evidence.uploaded_by?.fname || ''} ${evidence.uploaded_by?.lname || ''}`.trim(),
        [t('nc.investigation.evidence.tableDate')]: formatDate(evidence.uploaded_at),
        id: evidence.id
    }))
)

const fetchEvidence = async () => {
    loading.value = true
    try {
        // Use the correct endpoint for listing evidence by investigation
        const res: any = await apiGet(
            `/non-conformities/investigation-evidence/investigation/${props.investigationId}`,
            authStore
        )
        evidenceList.value = res.data || res || []
    } catch (err: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(err?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.investigation.evidence.fetchError'), 'error')
    } finally {
        loading.value = false
    }
}

const handleFileChange = (e: Event) => {
    const files = (e.target as HTMLInputElement).files
    selectedFile.value = files && files.length > 0 ? files[0] : null
    if (selectedFile.value) {
        uploadEvidence()
    }
}

const uploadEvidence = async () => {
    if (!selectedFile.value) return
    uploading.value = true
    try {
        const formData = new FormData()
        formData.append('investigation_id', props.investigationId)
        formData.append('file', selectedFile.value)
        await apiPost('/non-conformities/investigation-evidence', formData, authStore)
        toast.showToast(t('common.success'), t('nc.investigation.evidence.uploadSuccess'), 'success')
        selectedFile.value = null
        // Reset file input to allow selecting the same file again
        if (fileInput.value) {
            fileInput.value.value = ''
        }
        await fetchEvidence()
    } catch (err: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(err?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.investigation.evidence.uploadError'), 'error')
    } finally {
        uploading.value = false
    }
}

const confirmDeleteEvidence = (row: { id: string }) => {
    dialog.openDialog(ConfirmDialog, {
        message: t('nc.investigation.evidence.deleteConfirm'),
        onConfirm: async () => {
            await deleteEvidence(row.id)
            dialog.closeDialog()
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}

const deleteEvidence = async (id: string) => {
    try {
        await apiDelete(`/non-conformities/investigation-evidence/${id}`, authStore)
        toast.showToast(t('common.success'), t('nc.investigation.evidence.deleteSuccess'), 'success')
        await fetchEvidence()
    } catch (err: any) {
        toast.showToast(t('common.error'), formatApiErrorMessage(err?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.investigation.evidence.deleteError'), 'error')
    }
}

const getFileName = (url: string) => {
    return (url?.split('/')?.pop() || url).split('_').slice(1).join('_')
}

watch(() => props.investigationId, fetchEvidence, { immediate: true })
onMounted(fetchEvidence)
</script>
