<template>
    <Form
        :key="formKey"
        @submit="onSubmit"
        :initial-values="initialValues"
        id="add-category-modal"
    >
        <div
            class="bg-white rounded-lg shadow-lg w-[500px] text-start"
            :dir="isRtl ? 'rtl' : 'ltr'"
        >
            <div class="p-6 border-b border-neutral-200 flex justify-between items-center gap-3">
                <h2 class="text-xl flex-1 min-w-0">
                    {{
                        isEditMode
                            ? t('document.settings.document_categories.type_form.title_edit')
                            : t('document.settings.document_categories.type_form.title_add')
                    }}
                </h2>
                <button
                    type="button"
                    class="p-2 hover:bg-neutral-100 rounded-lg"
                    @click="onCancel"
                    test-id="close-category-modal-button"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="p-6 space-y-4">
                <div>
                    <AppInputForm
                        name="documentTypeName"
                        :placeholder="t('document.settings.document_categories.type_form.name_placeholder')"
                        :label="t('document.settings.document_categories.type_form.name_label')"
                        :required="true"
                        :rules="nameRequiredRule"
                        test-id="category-name-input"
                    />
                </div>
                <div>
                    <AppInputForm
                        name="documentTypeCode"
                        :placeholder="t('document.settings.document_categories.type_form.code_placeholder')"
                        :label="t('document.settings.document_categories.type_form.code_label')"
                        :required="true"
                        :rules="codeRequiredRule"
                        test-id="category-code-input"
                    />
                </div>
            </div>
            <div
                class="p-6 border-t border-neutral-200 flex gap-4 justify-end rtl:flex-row-reverse rtl:justify-start"
            >
                <AppButton
                    type="button"
                    button-style="secondary"
                    @click="onCancel"
                    test-id="cancel-category-button"
                >
                    {{ t('common.cancel') }}
                </AppButton>
                <AppButton
                    type="submit"
                    button-style="primary"
                    :loading="loading"
                    test-id="save-category-button"
                >
                    {{
                        isEditMode
                            ? t('document.settings.document_categories.type_form.update')
                            : t('document.settings.document_categories.type_form.save')
                    }}
                </AppButton>
            </div>
        </div>
    </Form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Form } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import AppInputForm from '@/components/AppInputForm.vue'
import { exists } from '@/util/util'

const { t, locale } = useI18n()
const isRtl = computed(() => locale.value === 'ar')

const nameRequiredRule = (v: any) =>
    !exists(v) ? t('document.settings.document_categories.type_form.name_required') : true
const codeRequiredRule = (v: any) =>
    !exists(v) ? t('document.settings.document_categories.type_form.code_required') : true

defineProps<{
    isEditMode: boolean
    initialValues: any
    formKey: number
    loading: boolean
    onSubmit: (values: any) => Promise<void>
    onCancel: () => void
}>()
</script>
