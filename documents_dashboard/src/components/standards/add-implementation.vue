<template>
    <Breadcrumb :crumbs="breadcrumbCrumbs" />

    <main id="main-content" class="p-6">
        <div class="max-w-3xl mx-auto bg-white border border-neutral-200 rounded-lg">
            <div class="p-6 border-b border-neutral-200">
                <h2 class="text-lg font-semibold text-neutral-900">{{ t('implementations.form.title') }}</h2>
                <p class="mt-1 text-sm text-neutral-500">{{ t('implementations.form.subtitle') }}</p>
            </div>

            <div v-if="loading" class="flex justify-center p-16">
                <Spinner width="3" />
            </div>

            <form v-else class="p-6 space-y-6" @submit.prevent="submit">
                <div>
                    <label class="block text-sm font-medium text-neutral-700 mb-2">
                        {{ t('implementations.form.select_standard') }}
                        <span class="text-red-700">*</span>
                    </label>
                    <Select2
                        v-if="availableStandards.length"
                        v-model="selected"
                        :values="availableStandards"
                        :display="displayStandard"
                        :placeholder="t('implementations.form.placeholder_standard')"
                        test-id="standard-select"
                    />
                    <p v-else class="text-sm text-neutral-500">
                        {{ t('implementations.form.no_standards_available') }}
                    </p>
                </div>

                <div v-if="selected" class="border border-neutral-200 rounded-lg p-4">
                    <h3 class="font-medium text-neutral-900">{{ t('implementations.form.preview') }}</h3>
                    <p class="mt-1 text-sm text-neutral-600">{{ selected.description }}</p>
                    <p class="mt-3 text-sm font-medium text-neutral-700">
                        {{
                            t('implementations.documents.required_count', {
                                count: selected.requiredDocuments.length
                            })
                        }}
                    </p>
                    <ul class="mt-2 space-y-2">
                        <li
                            v-for="document in selected.requiredDocuments"
                            :key="document.key"
                            class="text-sm text-neutral-700"
                        >
                            <span class="font-medium">{{ document.clause }}</span>
                            {{ document.title }}
                            <span class="text-neutral-500">
                                ({{ kindLabel(document.kind) }})
                            </span>
                        </li>
                    </ul>
                </div>

                <div class="flex justify-end gap-3 pt-2">
                    <AppButton type="button" buttonStyle="secondary" href="/plan/standards">
                        {{ t('common.cancel') }}
                    </AppButton>
                    <AppButton
                        type="submit"
                        buttonStyle="primary"
                        :loading="saving"
                        :disabled="!selected"
                        test-id="create-implementation-button"
                    >
                        {{ t('implementations.form.submit') }}
                    </AppButton>
                </div>
            </form>
        </div>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Breadcrumb from '../breadCrums.vue'
import AppButton from '../AppButton.vue'
import Select2 from '../Select2.vue'
import Spinner from '../Spinner.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiGet, apiPost } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'
import type { StandardCatalogItem, StandardImplementation } from '@/util/interfaces'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const standards = ref<StandardCatalogItem[]>([])
const selected = ref<StandardCatalogItem | null>(null)

const breadcrumbCrumbs = computed(() => [
    {
        name: t('nav.standards'),
        path: '/plan/standards',
        icon: 'fa-solid fa-certificate'
    },
    {
        name: t('implementations.form.title'),
        path: '',
        icon: 'fa-solid fa-plus'
    }
])

const availableStandards = computed(() =>
    standards.value.filter((standard) => !standard.implementation)
)

const displayStandard = (standard?: StandardCatalogItem) => standard?.name ?? ''

const kindLabel = (kind: string) =>
    kind === 'retain'
        ? t('implementations.documents.kind_retain')
        : t('implementations.documents.kind_maintain')

const fetchStandards = async () => {
    loading.value = true
    try {
        const catalog = await apiGet<StandardCatalogItem[]>('/standards', authStore)
        standards.value = catalog
        const preset = route.query.standard as string | undefined
        selected.value =
            availableStandards.value.find((standard) => standard.key === preset) ??
            availableStandards.value[0] ??
            null
    } catch (error: any) {
        if (authStore.state.isLoggedIn) {
            const raw = formatApiErrorMessage(error.response?.data, t, 'errors.standard')
            toast.showToast(
                t('common.error'),
                raw || t('implementations.form.toast_fetch_failed'),
                'error'
            )
        }
    } finally {
        loading.value = false
    }
}

const submit = async () => {
    if (!selected.value) return
    saving.value = true
    try {
        const created = await apiPost<StandardImplementation>(
            '/standards/implementations',
            { standardKey: selected.value.key },
            authStore
        )
        toast.showToast(t('common.success'), t('implementations.form.toast_created'), 'success')
        router.push(`/plan/standards/${created.id}`)
    } catch (error: any) {
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.standard')
        toast.showToast(
            t('common.error'),
            raw || t('implementations.form.toast_create_failed'),
            'error'
        )
    } finally {
        saving.value = false
    }
}

onMounted(fetchStandards)
</script>
