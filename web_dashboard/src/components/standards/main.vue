<template>
    <Breadcrumb :crumbs="breadcrumbCrumbs">
        <Can subject="standards" :actions="['create']">
            <AppButton
                buttonStyle="primary"
                class="flex items-center gap-2"
                href="/plan/standards/add"
                test-id="add-standard-implementation-button"
            >
                <i class="fa-solid fa-plus"></i>
                {{ t('implementations.main.add_button') }}
            </AppButton>
        </Can>
    </Breadcrumb>

    <main id="main-content" class="p-6">
        <div v-if="loading" class="flex justify-center py-16">
            <Spinner width="3" />
        </div>

        <template v-else>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
                <div class="bg-white border border-neutral-200 rounded-lg p-4">
                    <p class="text-sm text-neutral-500">{{ t('implementations.main.stats.active') }}</p>
                    <p class="mt-1 text-2xl font-semibold text-neutral-900">{{ activeCount }}</p>
                </div>
                <div class="bg-white border border-neutral-200 rounded-lg p-4">
                    <p class="text-sm text-neutral-500">{{ t('implementations.main.stats.available') }}</p>
                    <p class="mt-1 text-2xl font-semibold text-neutral-900">{{ availableCount }}</p>
                </div>
                <div class="bg-white border border-neutral-200 rounded-lg p-4">
                    <p class="text-sm text-neutral-500">{{ t('implementations.main.stats.documents') }}</p>
                    <p class="mt-1 text-2xl font-semibold text-neutral-900">
                        {{ implementedDocuments }} / {{ totalDocuments }}
                    </p>
                </div>
            </div>

            <section class="mb-8">
                <h2 class="text-lg font-semibold text-neutral-900 mb-3">
                    {{ t('implementations.documents.catalog_title') }}
                </h2>
                <div class="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-200">
                    <div
                        v-for="standard in standards"
                        :key="standard.key"
                        class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        :test-id="`standard-card-${standard.key}`"
                    >
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <h3 class="font-medium text-neutral-900">{{ standard.name }}</h3>
                                <span class="text-xs text-neutral-500">{{ standard.family }}</span>
                            </div>
                            <p class="mt-1 text-sm text-neutral-600">{{ standard.description }}</p>
                            <p class="mt-2 text-sm text-neutral-500">
                                {{
                                    t('implementations.documents.required_count', {
                                        count: standard.requiredDocuments.length
                                    })
                                }}
                            </p>
                        </div>
                        <div class="flex shrink-0 items-center gap-2">
                            <AppButton
                                v-if="standard.implementation"
                                buttonStyle="secondary"
                                :href="`/plan/standards/${standard.implementation.id}`"
                                :test-id="`continue-standard-${standard.key}`"
                            >
                                {{ t('implementations.documents.continue') }}
                            </AppButton>
                            <Can v-else subject="standards" :actions="['create']">
                                <AppButton
                                    buttonStyle="primary"
                                    :loading="creatingKey === standard.key"
                                    :test-id="`implement-standard-${standard.key}`"
                                    @click="implementStandard(standard.key)"
                                >
                                    {{ t('implementations.documents.implement') }}
                                </AppButton>
                            </Can>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h2 class="text-lg font-semibold text-neutral-900 mb-3">
                    {{ t('implementations.main.active_title') }}
                </h2>
                <div
                    v-if="implementations.length === 0"
                    class="bg-white border border-neutral-200 rounded-lg p-8 text-center text-neutral-500"
                    role="status"
                >
                    {{ t('implementations.main.empty') }}
                </div>
                <Table
                    v-else
                    :cols="columns"
                    :rows="rows"
                    :entities="implementations"
                    :total-pages="1"
                    :page="1"
                    :total="implementations.length"
                    :per-page="implementations.length"
                    :entity-name="t('implementations.view.title')"
                    :loading="false"
                    subject="standards"
                    :hide-edit="() => true"
                    :hide-view="() => true"
                    :hide-delete="() => true"
                    :on-next-page="noop"
                    :on-previous-page="noop"
                    :set-page="noop"
                    :on-success="fetchPage"
                    :map-status-style="mapStatusStyle"
                    :skip-padding="true"
                >
                    <template #extra-field="{ entity }">
                        <Can subject="standards" :actions="['read']">
                            <AppButton
                                type="button"
                                button-style="void"
                                :href="`/plan/standards/${entity.id}`"
                                :test-id="`view-implementation-${entity.id}`"
                            >
                                <i class="fa-solid fa-eye"></i>
                            </AppButton>
                        </Can>
                    </template>
                </Table>
            </section>
        </template>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Breadcrumb from '../breadCrums.vue'
import AppButton from '../AppButton.vue'
import Can from '../Can.vue'
import Spinner from '../Spinner.vue'
import Table from '../Table.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiGet, apiPost } from '@/util/api'
import { formatApiErrorMessage } from '@/util/util'
import type { StandardCatalogItem, StandardImplementation } from '@/util/interfaces'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(true)
const creatingKey = ref<string | null>(null)
const standards = ref<StandardCatalogItem[]>([])
const implementations = ref<StandardImplementation[]>([])

const breadcrumbCrumbs = computed(() => [
    {
        name: t('nav.standards'),
        path: '/plan/standards',
        icon: 'fa-solid fa-certificate'
    }
])

const activeCount = computed(() => implementations.value.length)
const availableCount = computed(
    () => standards.value.filter((standard) => !standard.implementation).length
)
const implementedDocuments = computed(() =>
    implementations.value.reduce((sum, item) => sum + item.completedCount, 0)
)
const totalDocuments = computed(() =>
    implementations.value.reduce((sum, item) => sum + item.totalCount, 0)
)

const columns = computed(() => [
    t('implementations.documents.col_status'),
    t('implementations.form.select_standard'),
    t('implementations.documents.col_progress'),
    t('implementations.documents.col_linked')
])

const implementationStatusLabel = (status: string) =>
    status === 'completed'
        ? t('implementations.documents.implementation_status_completed')
        : t('implementations.documents.implementation_status_in_progress')

const rows = computed(() => {
    const statusCol = t('implementations.documents.col_status')
    const standardCol = t('implementations.form.select_standard')
    const progressCol = t('implementations.documents.col_progress')
    const linkedCol = t('implementations.documents.col_linked')
    return implementations.value.map((item) => ({
        id: item.id,
        [statusCol]: implementationStatusLabel(item.status),
        [standardCol]: item.standardName,
        [progressCol]: t('implementations.documents.progress', {
            completed: item.completedCount,
            total: item.totalCount
        }),
        [linkedCol]: item.documents.filter((document) => document.linkedDocument).length
    }))
})

const noop = () => undefined

const mapStatusStyle = (status: string) => {
    if (
        status === t('implementations.documents.implementation_status_completed') ||
        status === 'completed'
    ) {
        return 'bg-green-100 text-green-800'
    }
    return 'bg-yellow-100 text-yellow-800'
}

const implementStandard = async (standardKey: string) => {
    if (creatingKey.value) return
    creatingKey.value = standardKey
    try {
        const created = await apiPost<StandardImplementation>(
            '/standards/implementations',
            { standardKey },
            authStore
        )
        toast.showToast(t('common.success'), t('implementations.form.toast_created'), 'success')
        await router.push(`/plan/standards/${created.id}`)
    } catch (error: any) {
        const raw = formatApiErrorMessage(error.response?.data, t, 'errors.standard')
        toast.showToast(
            t('common.error'),
            raw || t('implementations.form.toast_create_failed'),
            'error'
        )
    } finally {
        creatingKey.value = null
    }
}

const fetchPage = async () => {
    loading.value = true
    try {
        const [catalog, list] = await Promise.all([
            apiGet<StandardCatalogItem[]>('/standards', authStore),
            apiGet<StandardImplementation[]>('/standards/implementations', authStore)
        ])
        standards.value = catalog
        implementations.value = list
    } catch (error: any) {
        if (authStore.state.isLoggedIn) {
            const raw = formatApiErrorMessage(error.response?.data, t, 'errors.standard')
            toast.showToast(
                t('common.error'),
                raw || t('implementations.main.toast_fetch_failed'),
                'error'
            )
        }
    } finally {
        loading.value = false
    }
}

onMounted(fetchPage)
</script>
