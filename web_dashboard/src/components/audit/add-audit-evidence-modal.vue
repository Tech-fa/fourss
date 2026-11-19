<template>
  <div class="bg-white rounded-lg shadow-xl w-full max-w-lg min-w-[400px] min-h-[200px]" test-id="evidence-modal">
    <Form @submit="onSubmit">
    <div class="border-b border-neutral-200 px-6 py-4 flex items-center justify-between" test-id="evidence-modal-header">
      <div class="text-lg text-neutral-900" test-id="evidence-modal-title">{{ t('audit.evidence_modal.title') }}</div>
      <button type="button" class="text-neutral-400 hover:text-neutral-900 text-xl px-1" @click="onCancel" test-id="evidence-modal-close-button">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="px-6 py-6 space-y-6">

      <div test-id="evidence-description-field">
        <AppInputForm
          :label="t('audit.evidence_modal.description_label')"
          name="evidenceDescription"
          :placeholder="t('audit.evidence_modal.description_placeholder')"
        />
      </div>

      <div test-id="evidence-source-type-field">
        <label class="block text-sm text-neutral-900 mb-2">{{ t('audit.evidence_modal.source_label') }} <span class="text-red-700">*</span></label>
        <Select2
          v-model="selectedSourceType"
          :values="sourceTypes"
          :display="(val: any) => val?.name || ''"
          :placeholder="t('audit.evidence_modal.source_placeholder')"
          @update:modelValue="handleSourceTypeChange"
          test-id="evidence-source-type-select"
        />
      </div>
      <div id="evidence-upload-block" class="block" v-show="selectedSourceType?.id === AuditFindingEvidenceType.AUDIT_EVIDENCE_FILE" test-id="evidence-upload-block">

        <div 
          v-if="uploadedFiles.length === 0"
          class="w-full px-4 py-2 rounded-lg text-center cursor-pointer bg-neutral-900 text-white hover:bg-neutral-800 transition flex items-center justify-center gap-2"
          @click="triggerFileInput"
          test-id="evidence-choose-file-button"
        >
          <input 
            type="file" 
            multiple 
            class="hidden" 
            ref="fileInput"
            @change="handleFileUpload"
            test-id="evidence-file-input"
          />
          <i class="fa-solid fa-plus"></i>{{ t('audit.evidence_modal.choose_file') }}
        </div>

        <div id="uploaded-file">
            <div v-for="file in uploadedFiles" :key="file.name">
              <div class="flex items-center justify-between rounded border border-neutral-200 bg-neutral-100 px-4 py-2">
                <div>
                  <div class="text-sm text-neutral-900">{{ file.name }}</div>
                </div>
                  <div class="flex items-center gap-4">
                    <button class="text-neutral-400 hover:text-neutral-900" @click="removeFile(file)">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
            </div>
        </div>

      </div>


      <div id="evidence-link-block" class="block" v-show="selectedSourceType?.id === AuditFindingEvidenceType.DOCUMENT">

        <div class="flex items-center gap-3">
          <Select2
            v-if="!selectedDocument"
            v-model="selectedDocument"
            :values="selectedDocumentFiles"
            :display="(val: any) => val?.name || ''"
            :placeholder="t('audit.evidence_modal.select_document')"
          />
        </div>

        <div id="uploaded-documents">
          <div v-if="selectedDocument">
              <div class="flex items-center justify-between rounded border border-neutral-200 bg-neutral-100 px-4 py-2">
                <div>
                  <div class="text-sm text-neutral-900">{{ selectedDocument.name }}</div>
                </div>
                  <div class="flex items-center gap-4">
                    <button class="text-neutral-400 hover:text-neutral-900" @click="selectedDocument = null">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
            </div>
        </div>

      </div>


    </div>
    <div class="border-t border-neutral-200 px-6 py-4 flex justify-end gap-3" test-id="evidence-modal-actions">
      <AppButton buttonStyle="secondary" type="button" @click="onCancel" test-id="evidence-modal-cancel-button">{{ t('audit.evidence_modal.cancel') }}</AppButton>
      <AppButton buttonStyle="primary" type="submit" test-id="evidence-modal-save-button">{{ t('audit.evidence_modal.submit') }}</AppButton>
    </div>
    </Form>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form } from 'vee-validate'
import AppInputForm from '../AppInputForm.vue'
import Select2 from '../Select2.vue'
import { AUDIT_FINDING_EVIDENCE_TYPE_OPTIONS, AuditFindingEvidenceType } from '@/util/interfaces'
import { DocumentStatus } from '@/util/interfaces'
import { apiGet } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import AppButton from '../AppButton.vue'

const { t } = useI18n()

const props = defineProps<{
  onCancel: () => void
  onSave: (data: any, uploadedFiles: any[]) => void
}>()

const authStore = useAuthStore()
const toast = useToast()

const selectedSourceType = ref<any>()
const sourceTypes = ref<any[]>([
    AUDIT_FINDING_EVIDENCE_TYPE_OPTIONS[1], // DOCUMENT
    AUDIT_FINDING_EVIDENCE_TYPE_OPTIONS[2]  // AUDIT_EVIDENCE_FILE
])

const uploadedFiles = ref<any[]>([])

const documents = ref<any[]>([])
const selectedDocumentFiles = ref<any[]>([])
const selectedDocument = ref<any>(null)

const fileInput = ref<HTMLInputElement | null>(null)

const triggerFileInput = () => {
    fileInput.value?.click()
}

const fetchDocuments = async () => {
    try {
        const response = await apiGet<any>(`/documents?status=${DocumentStatus.PUBLISHED}`, authStore)
        
        documents.value = response.data || []
        selectedDocumentFiles.value = documents.value.map((document) => ({
            id: document.id,
            name: document.title || document.name,
            url: document.url
        }))
    } catch (error) {
        console.error('Error fetching documents:', error)
        toast.showToast(t('common.error'), t('audit.evidence_modal.toast_fetch_documents'), 'error')
    }
}

const onCancel = () => {
    props.onCancel()
}

const handleFileUpload = (event: Event) => {
    const input = event.target as HTMLInputElement
    if (input.files) {
      uploadedFiles.value = [...uploadedFiles.value, ...Array.from(input.files)]
    }
}

const removeFile = (file: any) => {
    uploadedFiles.value = uploadedFiles.value.filter((f) => f.name !== file.name)
}


const handleSourceTypeChange = (value: any) => {
    selectedSourceType.value = value
    
    if (value?.id === AuditFindingEvidenceType.DOCUMENT) {
        uploadedFiles.value = []
        fetchDocuments()
    } else if (value?.id === AuditFindingEvidenceType.AUDIT_EVIDENCE_FILE) {
        selectedDocument.value = null
    }
}

const onSubmit = (values: any) => {
  
    if(!selectedSourceType.value) {
        toast.showToast(t('common.error'), t('audit.evidence_modal.toast_source_required'), 'error')
        return
    }
    
    if(selectedSourceType.value?.id === AuditFindingEvidenceType.DOCUMENT) {
        if(!selectedDocument.value) {
            toast.showToast(t('common.error'), t('audit.evidence_modal.toast_select_document'), 'error')
            return
        }
    } else {
        if(uploadedFiles.value.length === 0) {
            toast.showToast(t('common.error'), t('audit.evidence_modal.toast_upload_file'), 'error')
            return
        }
    }

    const data = {
        description: values.evidenceDescription || null,
        sourceType: selectedSourceType.value.id,
        document: {
            id: selectedDocument.value?.id || null,
            name: selectedDocument.value?.name || null
        },
    }
    props.onSave(data, uploadedFiles.value || [])
}
</script>
