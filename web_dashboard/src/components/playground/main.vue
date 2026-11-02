<template>
    <main id="main-content" class="p-6 space-y-6">
        <header class="flex flex-wrap items-center justify-between gap-3">
            <h1 class="text-xl font-semibold text-neutral-900">{{ t('playground.page.title') }}</h1>
            <label class="text-sm text-neutral-600 flex items-center gap-2">
                {{ t('playground.page.team') }}
                <select v-model.number="teamId" class="border border-neutral-300 rounded px-2 py-1">
                    <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.name }}</option>
                </select>
            </label>
        </header>

        <section v-if="!open" class="grid gap-6 lg:grid-cols-2">
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
                        <AppButton buttonStyle="secondary" @click="openPlayground(item.id)">{{ t('playground.page.open') }}</AppButton>
                    </li>
                </ul>
            </div>
            <div class="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
                <h2 class="font-medium">{{ t('playground.page.drafts') }}</h2>
                <p v-if="!drafts.length" class="text-sm text-neutral-500">{{ t('playground.page.emptyDrafts') }}</p>
                <ul v-else class="space-y-2">
                    <li v-for="item in drafts" :key="item.id" class="flex items-center justify-between gap-3">
                        <span>{{ item.name }}</span>
                        <AppButton buttonStyle="secondary" @click="openPlayground(item.id)">{{ t('playground.page.open') }}</AppButton>
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

        <section v-else class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
                <AppButton buttonStyle="void" @click="closePlayground">{{ t('playground.page.back') }}</AppButton>
                <h2 class="font-medium text-lg">{{ open.name }}</h2>
                <span class="text-sm text-neutral-500">{{ open.enabled ? t('playground.page.on') : t('playground.page.off') }}</span>
                <Can subject="playgrounds" :actions="['update']">
                    <AppButton buttonStyle="primary" @click="publish">{{ t('playground.page.publish') }}</AppButton>
                    <AppButton buttonStyle="secondary" @click="toggleEnabled">
                        {{ open.enabled ? t('playground.page.turnOff') : t('playground.page.turnOn') }}
                    </AppButton>
                </Can>
            </div>
            <p v-if="!open.enabled" class="text-sm text-amber-700">{{ t('playground.page.turnedOff') }}</p>
            <p v-if="status" class="text-sm text-neutral-600">{{ status }}</p>
            <iframe
                :key="frameKey"
                ref="frameRef"
                class="w-full min-h-[520px] border border-neutral-200 rounded-lg bg-white"
                sandbox="allow-scripts allow-forms"
                referrerpolicy="no-referrer"
                :srcdoc="bootstrap"
                :title="open.name"
            />
        </section>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import Can from '@/components/Can.vue'
import { useAuthStore } from '@/stores/auth'
import { formatApiErrorMessage } from '@/util/util'
import {
    createPlayground,
    createPlaygroundRecord,
    deletePlaygroundRecord,
    getPlayground,
    listPlaygroundTargets,
    listPlaygrounds,
    listPublishedPlaygrounds,
    publishPlayground,
    putPlaygroundSource,
    resolvePlaygroundTarget,
    setPlaygroundEnabled,
    type PlaygroundDetail,
    type PlaygroundSummary,
    type PublishedPlayground
} from './endpoints'
import { IFRAME_BOOTSTRAP, PLAYGROUND_FRAME_NAMESPACE } from './iframe-bootstrap'
import { readFrameMessage, type FrameCall } from './host-bridge'

const { t } = useI18n()
const authStore = useAuthStore()
const route = useRoute()
const bootstrap = IFRAME_BOOTSTRAP
const teams = computed(() => authStore.state.userDetails.teams || [])
const teamId = ref<number>(teams.value[0]?.id || 0)
const published = ref<PublishedPlayground[]>([])
const all = ref<PlaygroundSummary[]>([])
const open = ref<PlaygroundDetail | null>(null)
const draftName = ref('')
const status = ref('')
const frameRef = ref<HTMLIFrameElement | null>(null)
const frameReady = ref(false)

const drafts = computed(() => all.value.filter((item) => item.lastPublishedAt == null))
const frameKey = computed(() => `${open.value?.id || ''}:${open.value?.revision || 0}:${open.value?.enabled}`)
const documentId = computed(() => {
    const raw = route.query.documentId
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] || '' : ''
})

async function loadLists() {
    if (!teamId.value) return
    const [publishedRows, every] = await Promise.all([
        listPublishedPlaygrounds(teamId.value, authStore),
        listPlaygrounds(teamId.value, authStore)
    ])
    published.value = publishedRows
    all.value = every
}

async function createDraft() {
    if (!draftName.value.trim() || !teamId.value) return
    try {
        const created = await createPlayground({ name: draftName.value.trim(), teamId: teamId.value }, authStore)
        draftName.value = ''
        await loadLists()
        await openPlayground(created.id)
    } catch (error) {
        showError(error)
    }
}

async function openPlayground(id: string) {
    open.value = await getPlayground(id, authStore)
    frameReady.value = false
    status.value = ''
}

function closePlayground() {
    open.value = null
    frameReady.value = false
}

async function publish() {
    if (!open.value) return
    try {
        open.value = await publishPlayground(open.value.id, authStore)
        await loadLists()
    } catch (error) {
        showError(error)
    }
}

async function toggleEnabled() {
    if (!open.value) return
    try {
        open.value = await setPlaygroundEnabled(open.value.id, !open.value.enabled, authStore)
        await loadLists()
    } catch (error) {
        showError(error)
    }
}

function showError(error: unknown) {
    const data = (error as { response?: { data?: unknown } })?.response?.data
    status.value =
        formatApiErrorMessage(data, t, 'errors.playground') ||
        (error instanceof Error ? error.message : '')
}

function pagePayload() {
    return { documentId: documentId.value, enabled: Boolean(open.value?.enabled) }
}

function postToFrame(message: Record<string, unknown>) {
    frameRef.value?.contentWindow?.postMessage({ namespace: PLAYGROUND_FRAME_NAMESPACE, ...message }, '*')
}

function sendSource() {
    if (!open.value || !frameReady.value) return
    postToFrame({ type: 'run', source: open.value.source, page: pagePayload() })
}

async function answer(call: FrameCall) {
    if (!open.value) return
    try {
        let value: unknown = null
        if (call.method === 'fail') {
            status.value = String(call.payload.message || '')
        } else if (call.method === 'get') {
            value = await resolvePlaygroundTarget(
                open.value.id,
                String(call.payload.entityType || ''),
                String(call.payload.entityId || ''),
                authStore
            )
        } else if (call.method === 'list') {
            const query = (call.payload.query || {}) as { limit?: number; cursor?: string }
            value = await listPlaygroundTargets(open.value.id, String(call.payload.entityType || ''), authStore, query)
        } else if (call.method === 'save') {
            value = await createPlaygroundRecord(
                open.value.id,
                { ...call.payload, page: pagePayload() },
                authStore
            )
        } else if (call.method === 'remove') {
            value = await deletePlaygroundRecord(open.value.id, String(call.payload.entityId || ''), authStore)
        }
        postToFrame({ type: 'result', id: call.id, ok: true, value })
    } catch (error) {
        const data = (error as { response?: { data?: unknown } })?.response?.data
        const message =
            formatApiErrorMessage(data, t, 'errors.playground') ||
            (error instanceof Error ? error.message : t('playground.page.turnedOff'))
        status.value = message
        postToFrame({ type: 'result', id: call.id, ok: false, error: message })
    }
}

function onMessage(event: MessageEvent) {
    const frame = frameRef.value?.contentWindow || null
    if (event.origin !== 'null') return
    const parsed = readFrameMessage(event.data, event.source, frame)
    if (!parsed) return
    if ('ready' in parsed) {
        frameReady.value = true
        sendSource()
        return
    }
    void answer(parsed.call)
}

async function applyPlayground(source: string) {
    if (!open.value) throw new Error('The playground is not open.')
    open.value = await putPlaygroundSource(open.value.id, source, authStore)
    frameReady.value = true
    sendSource()
    return { revision: open.value.revision }
}

function installHook() {
    window.__agentApplyPlayground = applyPlayground
}

function removeHook() {
    if (window.__agentApplyPlayground === applyPlayground) delete window.__agentApplyPlayground
}

watch(open, (value) => {
    if (value) installHook()
    else removeHook()
})

watch(teamId, () => {
    closePlayground()
    void loadLists().catch((error) => {
        status.value = error instanceof Error ? error.message : ''
    })
})

watch(frameKey, () => {
    frameReady.value = false
})

onMounted(() => {
    window.addEventListener('message', onMessage)
    void loadLists().catch((error) => showError(error))
})

onUnmounted(() => {
    window.removeEventListener('message', onMessage)
    removeHook()
})
</script>
