<template>
    <div
        class="bg-transparent shadow-none max-h-[90vh] flex flex-col w-[min(90vw,64rem)] max-w-5xl"
    >
        <div class="p-6 border-b border-neutral-200 flex-shrink-0">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-neutral-900">{{ t('document.template_modal.title') }}</h2>
                <button
                    type="button"
                    @click="onCancel"
                    class="text-neutral-400 hover:text-neutral-600 p-1"
                    :aria-label="t('document.template_modal.close')"
                >
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
                <div class="relative flex-1">
                    <i
                        class="fa-solid fa-search absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                    ></i>
                    <AppInput
                        v-model="searchQuery"
                        type="text"
                        :placeholder="t('document.template_modal.search_placeholder')"
                        hide-icon
                        class="!ps-10"
                        :test-id="'template-modal-search'"
                        @input="onSearchInput"
                    />
                </div>
                <div class="w-full sm:w-48">
                    <Select2
                        v-model="selectedFilterType"
                        :values="typeFilterOptions"
                        :display="(opt: SelectOption) => opt?.label || ''"
                        :placeholder="t('document.settings.document_templates.select_type_placeholder')"
                        :optional="true"
                        test-id="template-modal-type-select"
                        @update:modelValue="onFilterTypeChange"
                    />
                </div>
            </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6 min-h-0">
            <div v-if="loading" class="flex items-center justify-center py-12">
                <Spinner width="5" />
            </div>
            <div v-else-if="!templates.length" class="text-center py-12 text-neutral-500">
                {{ t('document.template_modal.empty') }}
            </div>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <TemplateCard
                    v-for="template in templates"
                    :key="template.id"
                    :title="template.title"
                    :selected="selectedId === template.id"
                    @select="selectedId = template.id"
                />
            </div>

            <div
                v-if="totalCount > 0 && !loading"
                class="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200"
            >
                <span class="text-sm text-neutral-600">
                    {{
                        t('document.template_modal.range', {
                            start: (currentPage - 1) * perPage + 1,
                            end: Math.min(currentPage * perPage, totalCount),
                            total: totalCount
                        })
                    }}
                </span>
                <div class="flex gap-2">
                    <AppButton
                        type="button"
                        buttonStyle="secondary"
                        :class="currentPage <= 1 ? '!bg-neutral-200 text-neutral-500 cursor-not-allowed' : ''"
                        :disabled="currentPage <= 1 || selecting"
                        test-id="template-modal-prev"
                        @click="currentPage = Math.max(1, currentPage - 1); fetchTemplates()"
                    >
                        {{ t('document.template_modal.previous') }}
                    </AppButton>
                    <AppButton
                        type="button"
                        buttonStyle="secondary"
                        :class="currentPage >= totalPages ? '!bg-neutral-200 text-neutral-500 cursor-not-allowed' : ''"
                        :disabled="currentPage >= totalPages || selecting"
                        test-id="template-modal-next"
                        @click="currentPage = Math.min(totalPages, currentPage + 1); fetchTemplates()"
                    >
                        {{ t('document.template_modal.next') }}
                    </AppButton>
                </div>
            </div>
        </div>

        <div class="p-6 border-t border-neutral-200 flex-shrink-0 flex justify-end gap-3">
            <AppButton type="button" buttonStyle="secondary" :disabled="selecting" @click="onCancel" test-id="template-modal-cancel">
                {{ t('document.template_modal.cancel') }}
            </AppButton>
            <AppButton
                type="button"
                buttonStyle="primary"
                :disabled="!selectedId || selecting"
                :loading="selecting"
                test-id="template-modal-select"
                @click="handleSelectTemplate"
            >
                {{ t('document.template_modal.select') }}
            </AppButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGet } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { DocumentTemplateType } from '@/util/interfaces'
import type { SelectOption } from '@/util/interfaces'
import AppButton from '../AppButton.vue'
import AppInput from '../AppInput.vue'
import Select2 from '../Select2.vue'
import Spinner from '../Spinner.vue'
import TemplateCard from './template-card.vue'

export interface DocumentTemplateListItem {
    id: string
    title: string
    description: string
    isDefault: boolean
    createdAt: number
}

const props = defineProps<{
    onSelect: (content: string, templateId: string) => void
    onCancel: () => void
}>()

const { t, locale } = useI18n()
const authStore = useAuthStore()
const toast = useToast()

const typeFilterOptions = computed<SelectOption[]>(() => {
    void locale.value
    return [
        { value: DocumentTemplateType.DEFAULT, label: t('document.settings.document_templates.type_value_default') },
        { value: DocumentTemplateType.CUSTOM, label: t('document.settings.document_templates.type_value_custom') }
    ]
})

const searchQuery = ref('')
const selectedFilterType = ref<SelectOption | null>(null)
const templates = ref<DocumentTemplateListItem[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const perPage = 10
const totalPages = ref(1)
const loading = ref(false)
const selecting = ref(false)
const selectedId = ref<string | null>(null)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const fetchTemplates = async () => {
    try {
        loading.value = true
        const params: Record<string, string | number | boolean> = {
            page: currentPage.value,
            perPage,
            searchTitleOnly: true,
        }
        if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
        if (selectedFilterType.value?.value === 'default') params.isDefault = 'true'
        else if (selectedFilterType.value?.value === 'custom') params.isDefault = 'false'

        const response = await apiGet<{ data: DocumentTemplateListItem[]; totalCount: number }>(
            '/documents/templates',
            authStore,
            params
        )
        templates.value = response.data || []
        totalCount.value = response.totalCount ?? 0
        totalPages.value = Math.ceil(totalCount.value / perPage) || 1
        selectedId.value = null
    } catch (error: any) {
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            raw || t('document.template_modal.toast_load_list_failed'),
            'error'
        )
        templates.value = []
        totalCount.value = 0
    } finally {
        loading.value = false
    }
}

const onSearchInput = () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        currentPage.value = 1
        fetchTemplates()
    }, 300)
}

const onFilterTypeChange = () => {
    currentPage.value = 1
    fetchTemplates()
}

const handleSelectTemplate = async () => {
    if (!selectedId.value || selecting.value) return
    try {
        selecting.value = true
        const template = await apiGet<{ content: string }>(
            `/documents/templates/${selectedId.value}`,
            authStore
        )
        const content = template?.content ?? ''
        props.onSelect(content, selectedId.value)
    } catch (error: any) {
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            raw || t('document.template_modal.toast_load_content_failed'),
            'error'
        )
    } finally {
        selecting.value = false
    }
}

onMounted(() => {
    fetchTemplates()
})
</script>
