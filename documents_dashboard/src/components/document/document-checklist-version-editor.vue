<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs">
           
        </BreadCrums>

        <div v-if="isLoading" class="flex items-center justify-center py-32">
            <Spinner width="8" />
        </div>

        <main v-else class="p-6 max-w-4xl mx-auto" test-id="document-checklist-version-editor">
            <div class="bg-white border border-neutral-200 rounded-lg p-6 space-y-6">
                <div>
                    <h1 class="text-lg font-medium text-neutral-900">{{ pageTitle }}</h1>
                    <p v-if="pageSubtitle" class="text-sm text-neutral-500 mt-1">
                        {{ pageSubtitle }}
                    </p>
                </div>

                <div class="space-y-2" v-if="!isFillPending">
                    <label class="block text-sm font-medium text-neutral-700" for="checklist-changes">
                        {{ t('document.create_version.changes_label') }}
                    </label>
                    <AppInput
                        id="checklist-changes"
                        v-model="changes"
                        :hide-icon="true"
                        :placeholder="t('document.create_version.changes_placeholder')"
                        :disabled="isSubmitting"
                        test-id="checklist-version-changes-input"
                    />
                </div>

                <div class="space-y-4" v-if="!isFillPending" test-id="checklist-version-expiry">
                    <ToggleSwitch
                        v-model="neverExpires"
                        :label="neverExpires ? t('document.form.never_expires') : t('document.form.expires')"
                        active-color="bg-blue-600"
                        test-id="checklist-version-never-expires-toggle"
                        @update:modelValue="onNeverExpiresChange"
                    />
                    <div v-if="!neverExpires">
                        <label class="block text-sm mb-1">{{ t('document.form.valid_until') }}</label>
                        <AppInput
                            name="dueDate"
                            :label="t('document.form.due_date')"
                            type="date"
                            :placeholder="t('document.form.due_date_placeholder')"
                            v-model="dueDate"
                            :hide-icon="true"
                            :disabled="isSubmitting"
                            test-id="checklist-version-due-date-input"
                        />
                    </div>
                </div>

                <DocumentChecklistBuilder
                    ref="checklistBuilderRef"
                    v-model="checklistQuestions"
                    :show-validation-errors="showValidationErrors"
                />
                <div class="flex gap-2">
                    <AppButton
                        type="button"
                        buttonStyle="secondary"
                        :disabled="isSubmitting"
                        test-id="checklist-version-cancel-button"
                        @click="handleCancel"
                    >
                        {{ t('document.form.cancel') }}
                    </AppButton>
                    <AppButton
                        type="button"
                        buttonStyle="primary"
                        :loading="isSubmitting"
                        test-id="checklist-version-save-button"
                        @click="handleSubmit"
                    >
                        {{ submitLabel }}
                    </AppButton>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BreadCrums from '@/components/breadCrums.vue'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import Spinner from '@/components/Spinner.vue'
import DocumentChecklistBuilder from './DocumentChecklistBuilder.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiGet, apiPostFormData, apiPut } from '@/util/api'
import { appendDocumentDueDate, documentDueDateFormState, formatApiErrorMessage } from '@/util/util'
import type {
    Document,
    DocumentChecklistQuestion,
    DocumentVersion
} from '@/util/interfaces'
import { ContentType, DocumentStatus } from '@/util/interfaces'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const documentId = ref(route.params.id as string)
const redirect = (route.query.redirect as string) || `/plan/documents/${documentId.value}`
const fillPendingVersionId = ref<number | null>(null)
const fromVersionId = ref<number | null>(null)

const isLoading = ref(true)
const isSubmitting = ref(false)
const showValidationErrors = ref(false)
const documentTitle = ref('')
const changes = ref('')
const checklistQuestions = ref<DocumentChecklistQuestion[]>([])
const checklistBuilderRef = ref<InstanceType<typeof DocumentChecklistBuilder> | null>(null)
const fetchedDocument = ref<Document | null>(null)
const neverExpires = ref(true)
const dueDate = ref('')

const isFillPending = computed(() => fillPendingVersionId.value != null)

const onNeverExpiresChange = (value: boolean) => {
    if (value) dueDate.value = ''
}

const pageTitle = computed(() =>
    isFillPending.value
        ? t('document.checklist_version.edit_title')
        : t('document.checklist_version.new_title')
)

const pageSubtitle = computed(() => {
    if (!documentTitle.value) return ''
    if (isFillPending.value) {
        return t('document.checklist_version.edit_subtitle', { title: documentTitle.value })
    }
    return t('document.checklist_version.new_subtitle', { title: documentTitle.value })
})

const submitLabel = computed(() =>
    isFillPending.value
        ? t('document.form.submit_save_content')
        : t('document.form.submit_create_version')
)

const crumbs = computed(() => [
    {
        name: t('nav.documents'),
        path: '/plan/documents',
        icon: 'fa-solid fa-file-lines'
    },
    {
        name: documentTitle.value || t('document.view.breadcrumb_fallback'),
        path: `/plan/documents/${documentId.value}`,
        icon: ''
    },
    {
        name: pageTitle.value,
        path: '',
        icon: ''
    }
])

const mapQuestions = (version?: DocumentVersion | null): DocumentChecklistQuestion[] => {
    const raw = version?.checklist?.questions ?? []
    return raw.map((q: any, index: number) => ({
        question: q.question || q.questionText || '',
        questionType: q.questionType,
        required: !!q.required,
        orderIndex: q.orderIndex ?? index
    }))
}

const handleCancel = () => {
    router.push(redirect)
}

const handleSubmit = async () => {
    showValidationErrors.value = true
    if (!checklistBuilderRef.value?.validate()) {
        toast.showToast(
            t('common.error'),
            t('document.form.validation_checklist'),
            'error'
        )
        return
    }

    const checklistPayload = {
        questions: checklistQuestions.value.map((question, orderIndex) => ({
            question: question.question.trim(),
            questionType: question.questionType,
            required: !!question.required,
            orderIndex
        }))
    }

    isSubmitting.value = true
    try {
        if (isFillPending.value && fillPendingVersionId.value != null) {
            await apiPut(
                `/documents/${documentId.value}/versions/${fillPendingVersionId.value}/checklist`,
                {
                    checklist: checklistPayload,
                    ...(changes.value.trim() ? { changes: changes.value.trim() } : {})
                },
                authStore
            )
            toast.showToast(
                t('common.success'),
                t('document.form.toast_save_version_content_ok'),
                'success'
            )
        } else {
            const formData = new FormData()
            formData.append('checklist', JSON.stringify(checklistPayload))
            if (changes.value.trim()) {
                formData.append('changes', changes.value.trim())
            }
            appendDocumentDueDate(formData, dueDate.value, neverExpires.value)
            await apiPostFormData(
                `/documents/${documentId.value}/versions`,
                formData,
                authStore
            )
            toast.showToast(
                t('common.success'),
                t('document.form.toast_new_version_ok'),
                'success'
            )
        }
        router.push(redirect)
    } catch (error: any) {
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            raw ||
                (isFillPending.value
                    ? t('document.form.toast_save_version_content_failed')
                    : t('document.form.toast_submit_failed_create')),
            'error'
        )
    } finally {
        isSubmitting.value = false
    }
}

onMounted(async () => {
    const rawFill = route.query.fillPendingVersion
    const parsedFill =
        typeof rawFill === 'string' ? Number(rawFill) : Array.isArray(rawFill) ? Number(rawFill[0]) : NaN
    if (!Number.isNaN(parsedFill) && parsedFill > 0) {
        fillPendingVersionId.value = parsedFill
    }

    const rawFrom = route.query.fromVersion
    const parsedFrom =
        typeof rawFrom === 'string' ? Number(rawFrom) : Array.isArray(rawFrom) ? Number(rawFrom[0]) : NaN
    if (!Number.isNaN(parsedFrom) && parsedFrom > 0) {
        fromVersionId.value = parsedFrom
    }

    try {
        const doc = await apiGet<Document>(`/documents/${documentId.value}`, authStore)
        if (doc.contentType !== ContentType.CHECKLIST) {
            router.replace(`/plan/documents/${documentId.value}/new-version`)
            return
        }
        fetchedDocument.value = doc
        documentTitle.value = doc.title || ''
        const expiry = documentDueDateFormState(doc.dueDate)
        neverExpires.value = expiry.neverExpires
        dueDate.value = expiry.dueDate

        if (fillPendingVersionId.value != null) {
            const pending = doc.versions?.find((v) => v.id === fillPendingVersionId.value)
            if (!pending || pending.status !== DocumentStatus.PENDING) {
                toast.showToast(
                    t('common.error'),
                    t('document.form.toast_pending_version_error'),
                    'error'
                )
                router.replace(`/plan/documents/${documentId.value}`)
                return
            }
            checklistQuestions.value = mapQuestions(pending)
            changes.value = pending.changes || ''
        } else {
            const source =
                (fromVersionId.value != null
                    ? doc.versions?.find((v) => v.id === fromVersionId.value)
                    : null) ||
                [...(doc.versions ?? [])]
                    .filter((v) =>
                        [DocumentStatus.PUBLISHED, DocumentStatus.OBSOLETE].includes(v.status)
                    )
                    .sort((a, b) => b.versionNumber - a.versionNumber)[0] ||
                doc.versions?.[doc.versions.length - 1]
            checklistQuestions.value = mapQuestions(source)
        }
    } catch (error: any) {
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.document')
        toast.showToast(
            t('common.error'),
            raw || t('document.view.toast_fetch_failed'),
            'error'
        )
        router.replace('/plan/documents')
    } finally {
        isLoading.value = false
    }
})
</script>
