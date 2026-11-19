<template>
    <BreadCrums :crumbs="crumbs" />
    <main id="main-content" class="p-6 space-y-6">
        <form class="flex flex-wrap items-end gap-3" @submit.prevent="create">
            <label class="flex flex-col gap-1 text-sm text-neutral-700">
                {{ t('integrations.name') }}
                <AppInput v-model="name" hide-icon :placeholder="t('integrations.name')" />
            </label>
            <AppButton button-style="primary" type="button" :loading="creating" @click="create">{{ t('integrations.create') }}</AppButton>
        </form>
        <p v-if="status" class="text-sm text-neutral-600">{{ status }}</p>
        <p v-if="!loading && !rows.length" class="text-sm text-neutral-500">{{ t('integrations.empty') }}</p>
        <Table
            v-if="rows.length"
            :cols="['Name', 'Status']"
            :column-labels="columnLabels"
            :rows="tableRows"
            :entities="rows"
            :page="1"
            :total="rows.length"
            :per-page="Math.max(rows.length, 1)"
            :total-pages="1"
            :entity-name="t('integrations.entityName')"
            :loading="loading"
            subject="integrations"
            :hide-edit="() => true"
            :hide-delete="() => true"
            :view-path="(row) => integrationPath(row.id)"
            :on-next-page="noop"
            :on-previous-page="noop"
            :set-page="noop"
            :on-success="load"
            skip-padding
        />
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import BreadCrums from '@/components/breadCrums.vue'
import Table from '@/components/Table.vue'
import { useAuthStore } from '@/stores/auth'
import { createIntegration, listIntegrations, type IntegrationSummary } from './endpoints'
import { INTEGRATIONS_LIST_PATH, integrationPath } from './routes'

const { t } = useI18n()
const auth = useAuthStore()
const rows = ref<IntegrationSummary[]>([])
const name = ref('')
const status = ref('')
const loading = ref(false)
const creating = ref(false)
const crumbs = computed(() => [
    { name: t('integrations.listTitle'), path: INTEGRATIONS_LIST_PATH, icon: 'fa-solid fa-plug' }
])
const columnLabels = computed(() => ({
    Name: t('integrations.name'),
    Status: t('integrations.status')
}))
const tableRows = computed(() => rows.value.map((row) => ({ id: row.id, Name: row.name, Status: row.status })))

function noop() {}

async function load() {
    loading.value = true
    try {
        rows.value = await listIntegrations(auth)
        status.value = ''
    } catch {
        status.value = t('integrations.listError')
    } finally {
        loading.value = false
    }
}

async function create() {
    const next = name.value.trim()
    if (!next) return
    creating.value = true
    try {
        await createIntegration(next, auth)
        name.value = ''
        await load()
    } catch {
        status.value = t('integrations.saveError')
    } finally {
        creating.value = false
    }
}

onMounted(load)
</script>
