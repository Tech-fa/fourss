<template>
    <div id="root" class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crums" />
        <main id="main-content" class="p-4 sm:p-6 lg:p-8">
            <div id="activity-type-form" class="max-w-3xl mx-auto bg-white rounded-lg shadow-sm">
                <div class="p-6 border-b">
                    <div class="flex items-center gap-4">
                        <div>
                            <h2 class="text-lg">
                                {{ isEditing ? t('audit.activity_type_form.title_edit') : t('audit.activity_type_form.title_add') }}
                            </h2>
                            <p class="text-neutral-500">
                                {{
                                    isEditing
                                        ? t('audit.activity_type_form.subtitle_edit')
                                        : t('audit.activity_type_form.subtitle_add')
                                }}
                            </p>
                        </div>
                    </div>
                </div>

                <Form @submit="submitForm" class="p-6 space-y-6" v-if="!loading" test-id="activity-form">
                    <div class="space-y-4">
                        <AppInputForm
                            v-if="!isEditing || (isEditing && activityType?.name)"
                            :value="activityType?.name"
                            name="name"
                            :label="t('audit.activity_type_form.type_name_label')"
                            type="text"
                            :placeholder="t('audit.activity_type_form.type_name_placeholder')"
                            :required="true"
                            :rules="(v: any) => (!v ? t('audit.activity_type_form.type_name_required') : true)"
                            test-id="type-name-input"
                        />
                    </div>

                    <div class="space-y-4">
                        <AppTextareaForm
                            :value="activityType?.description"
                            name="description"
                            :label="t('common.Description')"
                            :placeholder="t('audit.activity_type_form.description_placeholder')"
                            test-id="type-description-input"
                        />
                    </div>

                    <div class="p-6 border-t bg-neutral-50 flex items-center justify-end gap-4">
                        <Can :actions="['create','update']" subject="audit_activity_types">
                        <AppButton buttonStyle="secondary" type="button" @click="cancel" test-id="cancel-button">
                            {{ t('common.cancel') }}
                        </AppButton>
                        <AppButton buttonStyle="primary" type="submit" :loading="isSubmitting" test-id="save-changes-button">
                                {{ t('common.save_changes') }}
                            </AppButton>
                        </Can>
                    </div>
                </Form>
                <div v-else>
                    <div class="flex items-center justify-center h-full">
                        <Spinner width="5" />
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form } from 'vee-validate'
import { useRouter, useRoute } from 'vue-router'
import AppInputForm from '@/components/AppInputForm.vue'
import AppTextareaForm from '@/components/AppTextareaForm.vue'
import AppButton from '@/components/AppButton.vue'
import { apiGet, apiPost, apiPut } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import BreadCrums from '@/components/breadCrums.vue'
import Spinner from '@/components/Spinner.vue'
import Can from '@/components/Can.vue'
import { formatApiErrorMessage } from '@/util/util'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const { t, locale } = useI18n()

const isSubmitting = ref(false)
const loading = ref(true)
const activityType = ref<any>(null)
const isEditing = !!route.params.id

const crums = computed(() => {
    void locale.value
    return [
        {
            name: t('nav.audit'),
            path: '/check/audits',
            icon: 'fa-solid fa-chart-line text-neutral-700 text-2xl'
        },
        {
            name: t('common.settings'),
            path: '/check/audits/settings',
            icon: 'fa-solid fa-gear text-neutral-700 text-2xl'
        },
        {
            name: isEditing ? t('audit.activity_type_form.breadcrumb_edit') : t('audit.activity_type_form.breadcrumb_add'),
            path: '',
            icon: ''
        }
    ]
})

onMounted(async () => {
    try {
        if (isEditing) {
            const existingActivityType = await apiGet<any>(
                `/audits/activity-types/${route.params.id}`,
                authStore
            )
            activityType.value = existingActivityType
        }
        loading.value = false
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                t('audit.activity_type_form.toast_save_error_body_create'),
            'error'
        )
    }
})

const submitForm = async (values: any) => {
    isSubmitting.value = true

    try {
        const data = {
            name: values.name?.trim() || '',
            description: values.description?.trim() || '',
        }

        if (isEditing) {
            await apiPut(`/audits/activity-types/${route.params.id}`, data, authStore)
            toast.showToast(
                t('audit.activity_type_form.toast_updated'),
                t('audit.activity_type_form.toast_updated'),
                'success'
            )
        } else {
            await apiPost('/audits/activity-types', data, authStore)
            toast.showToast(
                t('audit.activity_type_form.toast_created'),
                t('audit.activity_type_form.toast_created'),
                'success'
            )
        }
        router.push('/check/audits/settings')
    } catch (error: any) {
        toast.showToast(
            isEditing ? t('audit.activity_type_form.toast_save_error_updating') : t('audit.activity_type_form.toast_save_error_creating'),
            formatApiErrorMessage(error?.response?.data, t, 'errors.audit') ||
                (isEditing
                    ? t('audit.activity_type_form.toast_save_error_body_update')
                    : t('audit.activity_type_form.toast_save_error_body_create')),
            'error'
        )
    } finally {
        isSubmitting.value = false
    }
}

const cancel = () => {
    router.push('/check/audits/settings')
}
</script>
