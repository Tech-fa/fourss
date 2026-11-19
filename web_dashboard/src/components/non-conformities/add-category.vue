<template>
    <BreadCrums :crumbs="crumbs" />
    <main v-if="!loadingEntity" id="main-content" class="flex-1 p-6">
        <div id="category-selection" class="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg text-neutral-900 mb-4" test-id="nc-category-title">{{ isEdit ? $t('nc.category.form.editTitle') : $t('nc.category.form.createTitle') }}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div test-id="nc-category-name-field">
                    <label class="block text-sm text-neutral-700 mb-2">{{ $t('nc.category.form.nameLabel') }} <span class="text-red-700">*</span></label>
                    <div :class="`flex ${!categoryForm.name && showValidationErrors ? 'ring-1 ring-red-500 rounded-md' : ''}`" test-id="nc-category-name-input-container">
                        <AppInput 
                            v-model="categoryForm.name" 
                            :hide-icon="true"
                            :placeholder="$t('nc.category.form.namePlaceholder')"
                            test-id="nc-category-name-input"
                        />
                    </div>
                    <div v-if="!categoryForm.name && showValidationErrors" class="text-red-600 text-xs mt-1" test-id="nc-category-name-error">
                        {{ $t('nc.category.form.nameRequired') }}
                    </div>
                </div>
           
            </div>
        </div>

        <!-- Custom Fields Configuration -->
        <div id="custom-fields-section" class="bg-white border border-neutral-200 rounded-lg">
            <div class="px-6 py-4 border-b border-neutral-200">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg text-neutral-900" test-id="nc-custom-fields-header">{{ $t('nc.category.form.customFieldsTitle') }}</h3>
                    <div class="flex items-center space-x-4">
                        <AppButton
                            button-style="primary"
                            @click="openAddFieldModal"
                            test-id="nc-add-custom-field-button"
                        >
                            <i class="fa-solid fa-plus mr-2"></i>
                            {{ $t('nc.category.form.addFieldButton') }}
                        </AppButton>
                    </div>
                </div>
            </div>

            <!-- Existing Custom Fields -->
            <div id="existing-fields" class="p-6">
                <h4 class="text-md text-neutral-900 mb-4" test-id="nc-custom-fields-title">{{ $t('nc.category.form.existingFieldsTitle') }}</h4>
                
                <div v-if="customFields.length === 0" class="text-center py-8 text-neutral-500" test-id="nc-no-custom-fields-message">
                    {{ $t('nc.category.form.noFields') }}
                </div>

                <div v-if="hasDuplicateFieldNames" class="bg-yellow-100 border border-yellow-200 text-yellow-800 px-4 py-3 rounded relative mb-4" role="alert" test-id="nc-duplicate-custom-fields-warning">
                    <strong class="font-bold">Warning!</strong>
                    <span class="block sm:inline"> {{ $t('nc.category.form.duplicateWarning') }}</span>
                </div>

                <div v-for="(field, index) in customFields" :key="index" 
                     class="border border-neutral-200 rounded-lg p-4 mb-4">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center space-x-3">
                            <i class="fa-solid fa-grip-vertical text-neutral-400"></i>
                            <div>
                                <h5 class="text-neutral-900">{{ field.label }}</h5>
                                <p class="text-sm text-neutral-600">
                                    {{ getFieldTypeDisplay(field.fieldType) }} • {{ field.isRequired ? $t('nc.category.form.required') : $t('nc.category.form.optional') }}
                                </p>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button 
                                @click="editCustomField(index)" 
                                class="p-2 text-neutral-600 hover:text-neutral-900"
                            >
                                <i class="fa-solid fa-edit"></i>
                            </button>
                            <button 
                                @click="removeCustomField(index)" 
                                class="p-2 text-red-600 hover:text-red-800"
                            >
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div v-if="field.options && field.options.length > 0" class="bg-neutral-50 p-3 rounded">
                        <p class="text-sm text-neutral-700 mb-2">{{ $t('nc.category.form.fieldOptions') }}</p>
                        <div class="flex flex-wrap gap-2">
                            <span
                                v-for="option in field.options"
                                :key="option"
                                class="px-2 py-1 bg-white border border-neutral-200 rounded text-xs"
                            >
                                {{ option }}
                            </span>
                        </div>
                    </div>
                    
                    <div v-if="field.acceptedFiles && field.acceptedFiles.length > 0" class="bg-neutral-50 p-3 rounded">
                        <p class="text-sm text-neutral-700 mb-2">{{ $t('nc.category.form.acceptedFiles') }}</p>
                        <div class="flex flex-wrap gap-2">
                            <span
                                v-for="fileType in field.acceptedFiles"
                                :key="fileType"
                                class="px-2 py-1 bg-white border border-neutral-200 rounded text-xs"
                            >
                                {{ fileType }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Save Actions -->
            <div class="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
                <div class="flex justify-end space-x-3">
                    <AppButton
                        button-style="secondary"
                        @click="cancelForm"
                    >
                        {{ $t('nc.category.form.cancel') }}
                    </AppButton>
                    <AppButton
                        button-style="primary"
                        @click="saveCategory"
                        :loading="loading"
                        test-id="save-nc-category-button"
                    >
                        <i class="fa-solid fa-save mr-2"></i>
                        {{ isEdit ? $t('nc.category.form.updateCategory') : $t('nc.category.form.saveCategory') }}
                    </AppButton>
                </div>
            </div>
        </div>
    </main>
    <div v-else class="flex justify-center items-center h-full p-8">
        <div class="text-center">
            <Spinner width="5" />
        </div>
    </div>


</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDialog } from '@/stores/dialog'
import { apiGet, apiPost, apiPut } from '@/util/api'
import BreadCrums from '../breadCrums.vue'
import AppButton from '../AppButton.vue'
import AppInput from '../AppInput.vue'
import Select2 from '../Select2.vue'
import ToggleSwitch from '../ToggleSwitch.vue'
import AddCustomFieldModal from './add-custom-field.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { 
    NonConformityCategory, 
    CreateCategoryDto, 
    CreateCategoryCustomFieldDto, 
    CustomFieldType,
    CreateCategoryWithCustomFieldsDto,
    UpdateCategoryWithCustomFieldsDto,
    CustomFieldFormType
} from '@/util/interfaces'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import Spinner from '../Spinner.vue'
import { formatApiErrorMessage } from '@/util/util'
import { NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const dialog = useDialog()
const toast = useToast()
const { t } = useI18n()

const id = route.params.id as string
const isEdit = !!id
const loadingEntity = ref(!!id)
const showValidationErrors = ref(false)

const crumbs = computed(() => [
    {
        name: t('nc.breadcrumbs.nonConformities'),
        path: '/act/non-conformities',
        icon: 'fa-solid fa-exclamation-triangle'
    },
    {
        name: t('nc.breadcrumbs.settings'),
        path: '/act/non-conformities/settings',
        icon: 'fa-solid fa-gear'
    },
    { 
        name: isEdit ? t('nc.breadcrumbs.editCategory') : t('nc.breadcrumbs.addCategory'), 
        path: isEdit ? `/act/non-conformities/add-category/${id}` : '/act/non-conformities/add-category', 
        icon: isEdit ? 'fa-solid fa-edit' : 'fa-solid fa-plus' 
    }
])

// Form state
const categoryForm = reactive<CreateCategoryDto>({
    name: '',
    parentId: undefined
})

// Selected parent category for Select2 component
const selectedParentCategory = ref<NonConformityCategory | undefined>(undefined)

const categoryErrors = reactive({
    name: ''
})

// Loading and data states
const loading = ref(false)
const parentCategories = ref<NonConformityCategory[]>([])
const customFields = ref<Omit<CreateCategoryCustomFieldDto, 'categoryId'>[]>([])

// Field type options
const fieldTypes = ref([
    { value: 'text', name: 'Text' },
    { value: 'number', name: 'Number' },
    { value: 'date', name: 'Date' },
    { value: 'dropdown', name: 'Dropdown' },
    { value: 'multiSelect', name: 'Multi Select' },
    { value: 'fileUpload', name: 'File Upload' },
    { value: 'checkbox', name: 'Checkbox' }
])

// Computed properties
const hasDuplicateFieldNames = computed(() => {
    const fieldNames = customFields.value.map(field => field.label.toLowerCase())
    const uniqueFieldNames = new Set(fieldNames)
    return fieldNames.length !== uniqueFieldNames.size
})

// Modal methods
const openAddFieldModal = () => {
    dialog.openDialog(AddCustomFieldModal, {
        isEditMode: false,
        initialValues: undefined,
        existingFields: customFields.value.map(field => field.label),
        onSave: async (fieldData: {
            label: string
            fieldType: CustomFieldType
            isRequired: boolean
            options?: string[]
            acceptedFiles?: string[]
        }) => {
            // Check for duplicate field names
            const isDuplicate = customFields.value.some(field => 
                field.label.toLowerCase() === fieldData.label.toLowerCase()
            )
            
            if (isDuplicate) {
                toast.showToast(t('common.error'), t('nc.category.form.duplicateFieldNameError'), 'error')
                return
            }
            
            // Add new field
            customFields.value.push({
                label: fieldData.label,
                fieldType: fieldData.fieldType,
                isRequired: fieldData.isRequired,
                options: fieldData.options || [],
                acceptedFiles: fieldData.acceptedFiles || []
            })
            
            // Close modal
            dialog.closeDialog()
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}

const editCustomField = (index: number) => {
    const field = customFields.value[index]
    
    dialog.openDialog(AddCustomFieldModal, {
        isEditMode: true,
        initialValues: {
            label: field.label,
            fieldType: field.fieldType,
            isRequired: field.isRequired || false,
            options: [...(field.options || [])],
            acceptedFiles: [...(field.acceptedFiles || [])]
        },
        existingFields: customFields.value
            .filter((_, i) => i !== index) // Exclude current field from duplicate check
            .map(field => field.label),
        onSave: async (fieldData: {
            label: string
            fieldType: CustomFieldType
            isRequired: boolean
            options?: string[]
            acceptedFiles?: string[]
        }) => {
            // Check for duplicate field names (excluding current field)
            const isDuplicate = customFields.value.some((field, i) => 
                i !== index && field.label.toLowerCase() === fieldData.label.toLowerCase()
            )
            
            if (isDuplicate) {
                toast.showToast(t('common.error'), t('nc.category.form.duplicateFieldNameError'), 'error')
                return
            }
            
            // Update existing field
            customFields.value[index] = {
                label: fieldData.label,
                fieldType: fieldData.fieldType,
                isRequired: fieldData.isRequired,
                options: fieldData.options || [],
                acceptedFiles: fieldData.acceptedFiles || []
            }
            
            // Close modal
            dialog.closeDialog()
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}

const removeCustomField = (index: number) => {
    const field = customFields.value[index]

    dialog.openDialog(ConfirmDialog, {
        message: t('nc.category.form.deleteCustomFieldConfirm', { name: field.label }),
        onConfirm: async () => {
            customFields.value.splice(index, 1)
            dialog.closeDialog()
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}

const fetchParentCategories = async () => {
    try {
        parentCategories.value = await apiGet<NonConformityCategory[]>('/non-conformities/categories', authStore)
    } catch (error) {
        console.error('Error fetching parent categories:', error)
    }
}

const fetchCategory = async () => {
    if (!isEdit) return
    try {
        const response = await apiGet<NonConformityCategory>(`/non-conformities/categories/${id}`, authStore)
        
        // Populate category form
        categoryForm.name = response.name
        // Set selectedParentCategory to the actual parent category object for Select2 component
        selectedParentCategory.value = response.parentId ? parentCategories.value.find(cat => cat.id === response.parentId) : undefined
        
        // Populate custom fields
        if (response.customFields) {
            customFields.value = response.customFields.map(field => ({
                label: field.label,
                fieldType: field.fieldType,
                isRequired: field.isRequired,
                options: field.options || [],
                acceptedFiles: field.acceptedFiles || []
            }))
        }
        
        loadingEntity.value = false
    } catch (error) {
        console.error('Error fetching category:', error)
        // Handle error (show toast notification)
        router.push('/act/non-conformities/settings')
    }
}

// Load initial data
onMounted(async () => {
    await fetchParentCategories()
    if (isEdit) {
        await fetchCategory()
    } else {
        loadingEntity.value = false
    }
})

// Helper functions
const getFieldTypeDisplay = (fieldType: string) => {
    const type = fieldTypes.value.find(ft => ft.value === fieldType)
    return type?.name || fieldType
}

const validateForm = () => {
    categoryErrors.name = ''
    
    if (!categoryForm.name) {
        categoryErrors.name = 'Category name is required'
        return false
    }
    
    return true
}

const saveCategory = async () => {
    showValidationErrors.value = true
    
    if (!validateForm()) return
    
    // Check for duplicate field names
    const fieldNames = customFields.value.map(field => field.label.toLowerCase())
    const uniqueFieldNames = new Set(fieldNames)
    
    if (fieldNames.length !== uniqueFieldNames.size) {
        toast.showToast(t('common.error'), t('nc.category.form.duplicateFieldError'), 'error')
        return
    }
    
    loading.value = true
    
    try {
        if (isEdit) {
            const categoryData: UpdateCategoryWithCustomFieldsDto = {
                name: categoryForm.name,
                parentId: selectedParentCategory.value?.id || undefined,
                customFields: customFields.value
            }
            
            await apiPut(`/non-conformities/categories/${id}`, categoryData, authStore)
            toast.showToast(t('common.success'), t('nc.category.form.updateSuccess'), 'success')
        } else {
            const categoryData: CreateCategoryWithCustomFieldsDto = {
                name: categoryForm.name,
                parentId: selectedParentCategory.value?.id || undefined,
                customFields: customFields.value
            }
            
            await apiPost('/non-conformities/categories', categoryData, authStore)
            toast.showToast(t('common.success'), t('nc.category.form.saveSuccess'), 'success')
        }
        
        router.push('/act/non-conformities/settings')
        
    } catch (error: any) {
        console.error('Error saving category:', error)
        toast.showToast(t('common.error'), formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) || t('nc.category.form.saveError'), 'error')
    } finally {
        loading.value = false
    }
}

const cancelForm = () => {
    router.push('/act/non-conformities/settings')
}

// Reset validation errors when required fields change
watch(
    () => categoryForm.name,
    () => {
        if (showValidationErrors.value) {
            showValidationErrors.value = false
        }
    }
)
</script>
