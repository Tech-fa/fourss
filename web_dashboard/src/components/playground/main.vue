<template>
    <BreadCrums :crumbs="crumbs">
        <div class="flex items-center gap-2 text-sm text-neutral-600">
            <label>{{ t('playground.page.team') }}</label>
            <div class="w-56">
                <Select2
                    v-model="team"
                    :values="teams"
                    :display="teamName"
                    :placeholder="t('playground.page.team')"
                />
            </div>
        </div>
    </BreadCrums>
    <main id="main-content" class="p-6 space-y-6">
        <p v-if="status" class="text-sm text-neutral-600">{{ status }}</p>

        <section class="grid gap-6 lg:grid-cols-2">
            <div class="bg-white border border-neutral-200 rounded-lg p-4">
                <h2 class="font-medium mb-3">{{ t('playground.page.published') }}</h2>
                <p v-if="!published.length" class="text-sm text-neutral-500">{{ t('playground.page.emptyPublished') }}</p>
                <ul v-else class="space-y-2">
                    <li v-for="item in published" :key="item.id" class="flex items-center justify-between gap-3 border border-neutral-100 rounded px-3 py-2">
                        <div>
                            <p class="font-medium">{{ item.name }}</p>
                            <p class="text-xs text-neutral-500">
                                {{ item.enabled ? t('playground.page.on') : t('playground.page.off') }}
                                <span v-if="item.publisher"> · {{ item.publisher.name || item.publisher.fname }}</span>
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <AppButton buttonStyle="secondary" @click="openPlayground(item.id)">{{ t('playground.page.open') }}</AppButton>
                            <Can subject="playgrounds" :actions="['delete']">
                                <AppButton buttonStyle="void" :warn-before="t('playground.page.deleteConfirm')" @click="removePlayground(item.id)">
                                    {{ t('playground.page.delete') }}
                                </AppButton>
                            </Can>
                        </div>
                    </li>
                </ul>
            </div>
            <div class="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
                <h2 class="font-medium">{{ t('playground.page.drafts') }}</h2>
                <p v-if="!drafts.length" class="text-sm text-neutral-500">{{ t('playground.page.emptyDrafts') }}</p>
                <ul v-else class="space-y-2">
                    <li v-for="item in drafts" :key="item.id" class="flex items-center justify-between gap-3">
                        <span>{{ item.name }}</span>
                        <div class="flex items-center gap-2">
                            <AppButton buttonStyle="secondary" @click="openPlayground(item.id)">{{ t('playground.page.open') }}</AppButton>
                            <Can subject="playgrounds" :actions="['delete']">
                                <AppButton buttonStyle="void" :warn-before="t('playground.page.deleteConfirm')" @click="removePlayground(item.id)">
                                    {{ t('playground.page.delete') }}
                                </AppButton>
                            </Can>
                        </div>
                    </li>
                </ul>
                <Can subject="playgrounds" :actions="['create']">
                    <div class="flex gap-2">
                        <AppInput v-model="draftName" type="text" :placeholder="t('playground.page.name')" />
                        <AppButton buttonStyle="primary" @click="createDraft">{{ t('playground.page.create') }}</AppButton>
                    </div>
                </Can>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BreadCrums from '@/components/breadCrums.vue'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import Select2 from '@/components/Select2.vue'
import Can from '@/components/Can.vue'
import { useAuthStore } from '@/stores/auth'
import { playgroundFiles, type PlaygroundAgentInput, type PlaygroundFiles } from '@/agent/playground-program'
import {
    createPlayground,
    deletePlayground,
    getPlayground,
    listPlaygrounds,
    listPublishedPlaygrounds,
    putPlaygroundFile,
    type PlaygroundSummary,
    type PublishedPlayground
} from './endpoints'
import { playgroundErrorMessage } from './playground-error'
import { PLAYGROUND_LIST_PATH, playgroundPath } from './routes'

type Team = { id: number; name: string }

const { t } = useI18n()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const teams = computed(() => authStore.state.userDetails.teams || [])
const team = ref<Team | null>(null)
const teamId = computed(() => team.value?.id || 0)
const published = ref<PublishedPlayground[]>([])
const all = ref<PlaygroundSummary[]>([])
const draftName = ref('')
const status = ref('')

const drafts = computed(() => all.value.filter((item) => item.lastPublishedAt == null))
const crumbs = computed(() => [
    {
        name: t('playground.page.title'),
        path: PLAYGROUND_LIST_PATH,
        icon: 'fa-solid fa-flask'
    }
])

function teamName(value: Team | null) {
    return value?.name || ''
}

function openPlayground(id: string) {
    return router.push({ path: playgroundPath(id), query: route.query })
}

async function loadLists() {
    if (!teamId.value) return
    const [publishedRows, every] = await Promise.all([
        listPublishedPlaygrounds(teamId.value, authStore),
        listPlaygrounds(teamId.value, authStore)
    ])
    published.value = publishedRows
    all.value = every
    status.value = ''
}

async function removePlayground(id: string) {
    try {
        await deletePlayground(id, authStore)
        await loadLists()
    } catch (error) {
        status.value = playgroundErrorMessage(error, t)
    }
}

async function createDraft() {
    if (!draftName.value.trim() || !teamId.value) return
    try {
        const created = await createPlayground({ name: draftName.value.trim(), teamId: teamId.value }, authStore)
        draftName.value = ''
        status.value = ''
        await openPlayground(created.id)
    } catch (error) {
        status.value = playgroundErrorMessage(error, t)
    }
}

async function ensurePlayground(name: string) {
    const trimmed = name.trim() || 'Playground'
    if (trimmed.length > 255) throw new Error('The playground name is too long.')
    await loadLists()
    const existing = all.value.find((item) => item.name === trimmed)
    if (existing) return existing.id
    if (!teamId.value) throw new Error('Choose a team on the Playground page first.')
    const created = await createPlayground({ name: trimmed, teamId: teamId.value }, authStore)
    return created.id
}

async function applyPlayground(input: string | PlaygroundAgentInput) {
    const request: PlaygroundAgentInput = typeof input === 'string' ? { source: input } : input
    try {
        const files = playgroundFiles(request)
        const id = await ensurePlayground(request.name || '')
        await storeFiles(id, files)
        const saved = await getPlayground(id, authStore)
        await openPlayground(saved.id)
        return { id: saved.id, name: saved.name, revision: saved.revision }
    } catch (error) {
        const message = playgroundErrorMessage(error, t, 'The playground could not be saved.')
        status.value = message
        throw new Error(message)
    }
}

async function storeFiles(id: string, files: PlaygroundFiles) {
    const writes: Array<Promise<unknown>> = []
    if (files.indexHtml !== undefined) writes.push(putPlaygroundFile(id, 'index.html', files.indexHtml, authStore))
    if (files.appJs !== undefined) writes.push(putPlaygroundFile(id, 'app.js', files.appJs, authStore))
    if (files.serverJs !== undefined) writes.push(putPlaygroundFile(id, 'server.js', files.serverJs, authStore))
    await Promise.all(writes)
}

function installHook() {
    window.__agentApplyPlayground = applyPlayground
}

function removeHook() {
    if (window.__agentApplyPlayground === applyPlayground) delete window.__agentApplyPlayground
}

installHook()

watch(
    teams,
    (rows) => {
        if (team.value && rows.some((row) => row.id === team.value?.id)) return
        team.value = rows[0] ?? null
    },
    { immediate: true }
)

watch(teamId, () => {
    void loadLists().catch((error) => {
        status.value = playgroundErrorMessage(error, t)
    })
})

onMounted(() => {
    installHook()
    void loadLists().catch((error) => {
        status.value = playgroundErrorMessage(error, t)
    })
})

onUnmounted(removeHook)
</script>
