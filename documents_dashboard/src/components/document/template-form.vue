<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs" />

        <main class="p-6">
            <div class="max-w-5xl mx-auto">
                <div class="mb-8 text-start" :dir="isRtl ? 'rtl' : 'ltr'">
                    <h1 class="text-2xl font-semibold text-neutral-900">
                        {{
                            isEditing
                                ? t('document.settings.document_templates.template_form.page_title_edit')
                                : t('document.settings.document_templates.template_form.page_title_create')
                        }}
                    </h1>
                    <p class="mt-1 text-sm text-neutral-500">
                        {{
                            isEditing
                                ? t('document.settings.document_templates.template_form.page_subtitle_edit')
                                : t('document.settings.document_templates.template_form.page_subtitle_create')
                        }}
                    </p>
                </div>

                <div class="bg-white border border-neutral-200 rounded-lg shadow-sm text-start"
                    :dir="isRtl ? 'rtl' : 'ltr'">
                    <Form @submit="handleSubmit" class="p-6 space-y-6" v-if="!pageLoading">
                        <AppInputForm name="title"
                            :label="t('document.settings.document_templates.template_form.field_title_label')"
                            :placeholder="t('document.settings.document_templates.template_form.field_title_placeholder')
                                " :required="true" :value="form.title" :rules="titleRequiredRule"
                            test-id="template-title-input" />

                        <AppInputForm name="description"
                            :label="t('document.settings.document_templates.template_form.field_description_label')"
                            type="textarea" :placeholder="t(
                                'document.settings.document_templates.template_form.field_description_placeholder'
                            )
                                " :required="true" :value="form.description" :rules="descriptionRequiredRule"
                            test-id="template-description-input" />

                        <div>
                            <label class="block text-sm font-medium text-neutral-700 mb-2">
                                {{ t('document.settings.document_templates.template_form.field_content_label') }}
                                <span class="text-red-500">*</span>
                            </label>
                            <div class="w-full border border-neutral-200 rounded-lg overflow-visible h-[1200px] pb-20 template-content-rich-text"
                                :class="contentError ? 'border-red-400' : ''">
                                <SuperDocEditor ref="superdocRef" :key="editorContentKey" :document="superdocSource"
                                    :user="superdocUser" show-open-docx @docx-selected="openDocxInSuperdoc" />
                            </div>
                            <p v-if="contentError" class="mt-1 text-xs text-red-500">
                                {{ t('document.settings.document_templates.template_form.field_content_required') }}
                            </p>
                        </div>

                        <div
                            class="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3 rtl:flex-row-reverse rtl:justify-start">
                            <AppButton type="button" button-style="secondary"
                                @click="router.push('/plan/documents/settings?tab=2')" test-id="template-cancel-button">
                                {{ t('common.cancel') }}
                            </AppButton>
                            <AppButton type="submit" button-style="primary" :loading="loading"
                                test-id="template-save-button">
                                {{
                                    isEditing
                                        ? t('document.settings.document_templates.template_form.update_template')
                                        : t('document.settings.document_templates.template_form.save_template')
                                }}
                            </AppButton>
                        </div>
                    </Form>

                    <div v-if="pageLoading" class="flex items-center justify-center p-16">
                        <Spinner width="5" />
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Form } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import AppInputForm from '@/components/AppInputForm.vue'
import BreadCrums from '@/components/breadCrums.vue'
import { apiGet, apiPostFormData, apiPut } from '@/util/api'
import { formatApiErrorMessage, getSuperdocUserFromAuth } from '@/util/util'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import type { DocumentTemplate } from '@/util/interfaces'
import Spinner from '../Spinner.vue'
import SuperDocEditor from '../SuperDocEditor.vue'
const superdocRef = ref<InstanceType<typeof SuperDocEditor> | null>(null)
const superdocUser = computed(() => getSuperdocUserFromAuth(authStore.state.userDetails))
const superdocSource = ref<File | Blob | string | null>(null)
const editorContentKey = ref(0)
function openDocxInSuperdoc(file: File) {
    superdocSource.value = file
    editorContentKey.value += 1
}

const { t, locale } = useI18n()
const isRtl = computed(() => locale.value === 'ar')

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const pageLoading = ref(false)
const contentError = ref(false)

const isCopyMode = computed(() => route.path.includes('/copy'))
const isEditing = computed(() => !!route.params.id && !isCopyMode.value)

const form = ref({
    title: undefined as string | undefined,
    description: undefined as string | undefined,
})

const titleRequiredRule = (v: any) =>
    !v?.trim()
        ? t('document.settings.document_templates.template_form.field_title_required')
        : true

const descriptionRequiredRule = (v: any) =>
    !v?.trim()
        ? t('document.settings.document_templates.template_form.field_description_required')
        : true

const crumbs = computed(() => [
    {
        name: t('nav.documents'),
        path: '/plan/documents',
        icon: 'fa-solid fa-file-lines text-neutral-700 text-2xl'
    },
    {
        name: t('document.main.settings'),
        path: '/plan/documents/settings?tab=2',
        icon: 'fa-solid fa-gear text-neutral-700 text-2xl'
    },
    {
        name: isEditing.value
            ? t('document.settings.document_templates.template_form.breadcrumb_edit')
            : isCopyMode.value
                ? t('document.settings.document_templates.template_form.breadcrumb_copy')
                : t('document.settings.document_templates.template_form.breadcrumb_add'),
        path: '',
        icon: 'fa-solid fa-file-contract text-neutral-700 text-2xl'
    }
])

const loadTemplate = async () => {
    pageLoading.value = true
    try {
        const template = await apiGet<DocumentTemplate>(
            `/documents/templates/${route.params.id}`,
            authStore
        )
        form.value = {
            title: template.title,
            description: template.description,
        }
        superdocSource.value = template.content ?? null
    } catch (error: any) {
        console.error('Error loading template:', error)
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.settings.document_templates.template_form.toast_load_failed'),
            'error'
        )
        router.push('/plan/documents/settings?tab=2')
    } finally {
        pageLoading.value = false
    }
}

const loadTemplateForCopy = async () => {
    pageLoading.value = true
    try {
        const template = await apiGet<DocumentTemplate>(
            `/documents/templates/${route.params.id}`,
            authStore
        )
        superdocSource.value = template.content ?? null
        form.value = {
            title: undefined,
            description: undefined,
        }
    } catch (error: any) {
        console.error('Error loading template for copy:', error)
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.settings.document_templates.template_form.toast_load_failed'),
            'error'
        )
        router.push('/plan/documents/settings?tab=2')
    } finally {
        pageLoading.value = false
    }
}

const handleSubmit = async (values: any) => {
    if (!superdocRef.value || await superdocRef.value.isEmpty()) {
        contentError.value = true
        return
    }
    contentError.value = false

    if (loading.value) return
    loading.value = true

    try {
        const docxFile =
            await superdocRef.value.exportDocx(
                `${values.title}.docx`
            )
        const formData = new FormData()

        formData.append('title', values.title)
        formData.append('description', values.description)
        formData.append('file', docxFile)

        if (isEditing.value) {
            await apiPut(`/documents/templates/${route.params.id}`, formData, authStore)
            toast.showToast(
                t('common.success'),
                t('document.settings.document_templates.template_form.toast_updated'),
                'success'
            )
        } else {
            await apiPostFormData('/documents/templates', formData, authStore)
            toast.showToast(
                t('common.success'),
                t('document.settings.document_templates.template_form.toast_created'),
                'success'
            )
        }

        router.push('/plan/documents/settings?tab=2')
    } catch (error: any) {
        console.error('Error saving template:', error)
        const apiMsg = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            apiMsg || t('document.settings.document_templates.template_form.toast_save_failed'),
            'error'
        )
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    if (isEditing.value) {
        loadTemplate()
    } else if (isCopyMode.value && route.params.id) {
        loadTemplateForCopy()
    }
})
</script>

<style scoped>
.template-content-rich-text:deep(.rich-text),
.template-content-rich-text:deep(.quill-editor),
.template-content-rich-text:deep(.ql-container),
.template-content-rich-text:deep(.ql-editor) {
    width: 100%;
    max-width: none;
    overflow: visible;
}

.template-content-rich-text:deep(.ql-editor) {
    min-height: 200px;
}

.template-content-rich-text:deep(.ql-container) {
    border: none;
}
</style>
