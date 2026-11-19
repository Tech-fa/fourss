<template>
  <div class="bg-white rounded-lg w-[600px]">
    <div class="p-6 border-b border-neutral-200 sticky top-0 bg-white z-10">
      <div class="flex items-center justify-between">
        <h3 class="text-lg text-neutral-900" test-id="nc-custom-field-title">
          {{ isEditMode ? $t('nc.customField.editTitle') : $t('nc.customField.addTitle') }}
        </h3>
        <button type="button" @click="props.onCancel" class="text-neutral-400 hover:text-neutral-600" test-id="nc-close-custom-field-button">
          <i class="fa-solid fa-times text-xl"></i>
        </button>
      </div>
    </div>

    <div class="p-6 space-y-6 max-h-[60vh] min-h-[250px] overflow-y-hidden">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-neutral-700 mb-2" test-id="nc-field-name-label">{{ $t('nc.customField.fieldNameLabel') }} <span class="text-red-700">*</span></label>
          <div :class="`flex ${(!customFieldForm.label || (customFieldForm.label && props.existingFields && props.existingFields.some(existingField => existingField.toLowerCase() === customFieldForm.label.toLowerCase()))) && showValidationErrors ? 'ring-1 ring-red-500 rounded-md' : ''}`" test-id="nc-field-name-input-container">
            <AppInput 
              v-model="customFieldForm.label"
              :placeholder="$t('nc.customField.fieldNamePlaceholder')"
              hide-icon
              test-id="nc-field-name-input"
            />
          </div>
          <div v-if="!customFieldForm.label && showValidationErrors" class="text-red-600 text-xs mt-1" test-id="nc-field-name-error">
            {{ $t('nc.customField.fieldNameRequired') }}
          </div>
          <div v-else-if="customFieldForm.label && showValidationErrors && props.existingFields && props.existingFields.some(existingField => existingField.toLowerCase() === customFieldForm.label.toLowerCase())" class="text-red-600 text-xs mt-1" test-id="nc-duplicate-field-name-error">
            {{ $t('nc.customField.fieldNameDuplicate') }}
          </div>
        </div>
        <div>
          <label class="block text-sm text-neutral-700 mb-2" test-id="nc-field-type-label">{{ $t('nc.customField.fieldTypeLabel') }} <span class="text-red-700">*</span></label>
          <div :class="`flex ${!customFieldForm.fieldType && showValidationErrors ? 'ring-1 ring-red-500 rounded-md' : ''}`" test-id="nc-field-type-select-container">
            <Select2
              v-model="customFieldForm.fieldType"
              :values="fieldTypes"
              :placeholder="$t('nc.customField.fieldTypePlaceholder')"
              :display="(type: any) => type?.name"
              dropdown-height="150px"
              test-id="nc-field-type-select"
            />
          </div>
          <div v-if="!customFieldForm.fieldType && showValidationErrors" class="text-red-600 text-xs mt-1" test-id="nc-field-type-error">
            {{ $t('nc.customField.fieldTypeRequired') }}
          </div>
        </div>
      </div>

      <div>
        <ToggleSwitch
          v-model="customFieldForm.isRequired"
          :label="$t('nc.customField.requiredToggle')"
          active-color="bg-blue-600"
          test-id="nc-required-field-toggle"
        />
      </div>

      <!-- Field Options Configuration -->
      <div v-if="selectedFieldType === 'dropdown' || selectedFieldType === 'multiSelect'">
        <label class="block text-sm text-neutral-700 mb-2">{{ $t('nc.customField.fieldOptions') }} <span class="text-red-700">*</span></label>
        <div class="flex gap-2 mb-2">
          <AppInput 
            v-model="newOption"
            :placeholder="$t('nc.customField.optionPlaceholder')"
            hide-icon
            @keyup.enter="addOption"
          />
          <AppButton 
            button-style="secondary" 
            @click="addOption"
            :disabled="!newOption"
          >
            {{ $t('nc.customField.addOption') }}
          </AppButton>
        </div>
        <div v-if="customFieldForm.options.length === 0 && showValidationErrors" class="text-red-600 text-xs mb-2">
          {{ $t('nc.customField.optionsRequired') }}
        </div>
        <div class="flex flex-wrap gap-2" test-id="nc-field-options-container">
          <span
            v-for="(option, index) in customFieldForm.options"
            :key="index"
            class="px-2 py-1 bg-neutral-100 border border-neutral-200 rounded text-sm flex items-center gap-1"
          >
            <span>{{ option }}</span>
            <button
              @click="removeOption(index)"
              class="text-red-600 hover:text-red-800"
              test-id="nc-field-option-remove-button"
            >
              <i class="fa-solid fa-times"></i>
            </button>
          </span>
        </div>
      </div>

      <!-- File Upload Configuration -->
      <div v-if="selectedFieldType === 'fileUpload'">
        <label class="block text-sm text-neutral-700 mb-2">{{ $t('nc.customField.acceptedFileTypes') }}</label>
        <div class="flex gap-2 mb-2">
          <AppInput 
            v-model="newFileType"
            :placeholder="$t('nc.customField.fileTypePlaceholder')"
            hide-icon
            @keyup.enter="addFileType"
          />
          <AppButton 
            button-style="secondary" 
            @click="addFileType"
            :disabled="!newFileType"
          >
            {{ $t('nc.customField.addFileType') }}
          </AppButton>
        </div>
        <div
          v-if="customFieldForm.acceptedFiles.length === 0 && showValidationErrors"
          class="text-red-600 text-xs mb-2"
          test-id="nc-file-type-error"
        >
          {{ $t('nc.customField.fileTypesRequired') }}
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(fileType, index) in customFieldForm.acceptedFiles"
            :key="index"
            class="px-2 py-1 bg-neutral-100 border border-neutral-200 rounded text-sm flex items-center gap-1"
          >
            <span>{{ fileType }}</span>
            <button @click="removeFileType(index)" class="text-red-600 hover:text-red-800">
              <i class="fa-solid fa-times"></i>
            </button>
          </span>
        </div>
      </div>
    </div>

    <div class="p-6 border-t border-neutral-200 flex justify-end gap-3 sticky bottom-0 bg-white z-10">
      <AppButton
        button-style="secondary"
        @click="props.onCancel"
        test-id="nc-custom-field-cancel-button"
      >
        {{ $t('nc.customField.cancel') }}
      </AppButton>
      <AppButton
        button-style="primary"
        @click="saveField"
      >
        <i class="fa-solid fa-plus me-2" v-if="!isEditMode"></i>
        <i class="fa-solid fa-save me-2" v-else></i>
        {{ isEditMode ? $t('nc.customField.updateField') : $t('nc.customField.addField') }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import AppButton from '../AppButton.vue'
import AppInput from '../AppInput.vue'
import Select2 from '../Select2.vue'
import ToggleSwitch from '../ToggleSwitch.vue'
import { useI18n } from 'vue-i18n'
import type { CustomFieldType } from '@/util/interfaces'

const { t } = useI18n()

interface CustomFieldFormType {
  label: string
  fieldType: { value: string; name: string } | undefined
  isRequired: boolean
  options: string[]
  acceptedFiles: string[]
}

const props = defineProps<{
  isEditMode: boolean
  initialValues?: {
    label?: string
    fieldType?: CustomFieldType
    isRequired?: boolean
    options?: string[]
    acceptedFiles?: string[]
  }
  existingFields?: string[]
  onSave: (field: {
    label: string
    fieldType: CustomFieldType
    isRequired: boolean
    options?: string[]
    acceptedFiles?: string[]
  }) => void
  onCancel: () => void
}>()

// Field type options
const fieldTypes = ref([
  { value: 'text', name: 'Text' },
  { value: 'number', name: 'Number' },
  { value: 'date', name: 'Date' },
  { value: 'dropdown', name: 'Dropdown' },
  { value: 'multiSelect', name: 'Multi Select' },
  { value: 'fileUpload', name: 'File Upload' },
])

// Form state
const customFieldForm = reactive<CustomFieldFormType>({
  label: '',
  fieldType: undefined,
  isRequired: false,
  options: [],
  acceptedFiles: []
})

// Helper states
const newOption = ref('')
const newFileType = ref('')
const showValidationErrors = ref(false)

// Computed properties
const selectedFieldType = computed(() => {
  return customFieldForm.fieldType?.value || ''
})

// Watch for prop changes to populate form
watch(() => props.initialValues, (newData) => {
  if (newData) {
    customFieldForm.label = newData.label || ''
    customFieldForm.fieldType = newData.fieldType ? 
      fieldTypes.value.find(ft => ft.value === newData.fieldType) : 
      undefined
    customFieldForm.isRequired = newData.isRequired || false
    customFieldForm.options = [...(newData.options || [])]
    customFieldForm.acceptedFiles = [...(newData.acceptedFiles || [])]
  } else {
    // Reset form for new field
    customFieldForm.label = ''
    customFieldForm.fieldType = undefined
    customFieldForm.isRequired = false
    customFieldForm.options = []
    customFieldForm.acceptedFiles = []
  }
  
  // Reset validation errors
  showValidationErrors.value = false
  
  // Reset temp inputs
  newOption.value = ''
  newFileType.value = ''
}, { deep: true, immediate: true })

// Reset validation errors when required fields change
watch(
    () => [customFieldForm.label, customFieldForm.fieldType, customFieldForm.options],
    () => {
        if (showValidationErrors.value) {
            showValidationErrors.value = false
        }
    }
)

// Form methods
const validateForm = () => {
  let isValid = true
  
  if (!customFieldForm.label) {
    isValid = false
  }
  
  if (!customFieldForm.fieldType) {
    isValid = false
  }
  
  // Check for duplicate field names
  if (customFieldForm.label && props.existingFields) {
    const isDuplicate = props.existingFields.some(existingField => 
      existingField.toLowerCase() === customFieldForm.label.toLowerCase()
    )
    if (isDuplicate) {
      isValid = false
    }
  }
  
  if ((selectedFieldType.value === 'dropdown' || selectedFieldType.value === 'multiSelect') && 
      customFieldForm.options.length === 0) {
    isValid = false
  }

  if (selectedFieldType.value === 'fileUpload' && customFieldForm.acceptedFiles.length === 0) {
    isValid = false
  }
  
  return isValid
}

const saveField = () => {
  showValidationErrors.value = true
  
  if (!validateForm()) return
  
  const fieldData = {
    label: customFieldForm.label,
    fieldType: customFieldForm.fieldType!.value as CustomFieldType,
    isRequired: customFieldForm.isRequired,
    options: (selectedFieldType.value === 'dropdown' || selectedFieldType.value === 'multiSelect') 
      ? [...customFieldForm.options] 
      : undefined,
    acceptedFiles: selectedFieldType.value === 'fileUpload' 
      ? [...customFieldForm.acceptedFiles] 
      : undefined
  }
  
  props.onSave(fieldData)
}

// Option management
const addOption = () => {
  if (!newOption.value) return
  
  if (!customFieldForm.options.includes(newOption.value)) {
    customFieldForm.options.push(newOption.value)
  }
  newOption.value = ''
}

const removeOption = (index: number) => {
  customFieldForm.options.splice(index, 1)
}

// File type management
const addFileType = () => {
  if (!newFileType.value) return
  
  if (!customFieldForm.acceptedFiles.includes(newFileType.value)) {
    customFieldForm.acceptedFiles.push(newFileType.value)
  }
  newFileType.value = ''
}

const removeFileType = (index: number) => {
  customFieldForm.acceptedFiles.splice(index, 1)
}
</script>
