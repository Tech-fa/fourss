<template>
    <BreadCrums :crumbs="crumbs">
        <div class="flex flex-wrap items-center gap-2">
            <span v-if="open" class="text-sm text-opposite">{{ open.enabled ? t('playground.page.on') : t('playground.page.off') }}</span>
            <Can v-if="open" subject="playgrounds" :actions="['update']">
                <AppButton buttonStyle="primary" @click="publish">{{ t('playground.page.publish') }}</AppButton>
                <AppButton buttonStyle="secondary" @click="toggleEnabled">
                    {{ open.enabled ? t('playground.page.turnOff') : t('playground.page.turnOn') }}
                </AppButton>
            </Can>
            <Can v-if="open" subject="playgrounds" :actions="['delete']">
                <AppButton buttonStyle="secondary" :warn-before="t('playground.page.deleteConfirm')" @click="removePlayground">
                    {{ t('playground.page.delete') }}
                </AppButton>
            </Can>
        </div>
    </BreadCrums>
    <main id="main-content" class="p-6 space-y-4">
        <p v-if="open && !open.enabled" class="text-sm text-amber-700">{{ t('playground.page.turnedOff') }}</p>
        <p v-if="status" class="text-sm text-neutral-600">{{ status }}</p>
        <iframe
            v-if="open"
            :key="frameKey"
            ref="frameRef"
            class="w-full h-screen border border-neutral-200 rounded-lg bg-white"
            sandbox="allow-scripts allow-forms"
            referrerpolicy="no-referrer"
            :srcdoc="frameDoc"
            :title="open.name"
        />
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BreadCrums from '@/components/breadCrums.vue'
import AppButton from '@/components/AppButton.vue'
import Can from '@/components/Can.vue'
import { useAuthStore } from '@/stores/auth'
import { playgroundFiles, type PlaygroundAgentInput, type PlaygroundFiles } from '@/agent/playground-program'
import {
    callPlaygroundApi,
    fetchPlaygroundPath,
    deletePlayground,
    getPlayground,
    getPlaygroundApp,
    publishPlayground,
    putPlaygroundFile,
    runPlaygroundSql,
    setPlaygroundEnabled,
    type PlaygroundDetail,
    type PlaygroundFileName
} from './endpoints'
import { playgroundFrame, PLAYGROUND_FRAME_NAMESPACE } from './iframe-bootstrap'
import { frameFile, readFrameMessage, type FrameCall } from './host-bridge'
import { playgroundErrorMessage } from './playground-error'
import { PLAYGROUND_LIST_PATH } from './routes'

const { t } = useI18n()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const open = ref<PlaygroundDetail | null>(null)
const crumbs = computed(() => [
    {
        name: t('playground.page.title'),
        path: { path: PLAYGROUND_LIST_PATH, query: route.query },
        icon: 'fa-solid fa-flask'
    },
    {
        name: open.value?.name || t('playground.page.title'),
        path: '',
        icon: ''
    }
])
const status = ref('')
const frameRef = ref<HTMLIFrameElement | null>(null)
const savedFiles = ref<Record<PlaygroundFileName, string>>({ 'index.html': '', 'app.js': '', 'server.js': '' })
const preview = ref(0)
const frameDoc = computed(() =>
    playgroundFrame(
        savedFiles.value['index.html'],
        savedFiles.value['app.js'],
        Boolean(open.value?.enabled),
        t('playground.page.turnedOff')
    )
)
const frameKey = computed(() => `${open.value?.id || ''}:${open.value?.enabled}:${preview.value}`)

function playgroundId() {
    const raw = route.params.id
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] || '' : ''
}

function back() {
    return router.push({ path: PLAYGROUND_LIST_PATH, query: route.query })
}

async function loadPlayground() {
    const id = playgroundId()
    if (!id) throw new Error('Playground not found')
    const detail = await getPlayground(id, authStore)
    if (playgroundId() !== id) return
    open.value = detail
    const app = await getPlaygroundApp(id, authStore)
    if (playgroundId() !== id) return
    savedFiles.value = app
    preview.value += 1
    status.value = ''
}

async function removePlayground() {
    if (!open.value) return
    const id = open.value.id
    try {
        await deletePlayground(id, authStore)
        if (playgroundId() !== id) return
        await back()
    } catch (error) {
        if (open.value?.id === id) status.value = playgroundErrorMessage(error, t)
    }
}

async function publish() {
    if (!open.value) return
    const id = open.value.id
    try {
        const saved = await publishPlayground(id, authStore)
        if (open.value?.id === id) {
            open.value = saved
            status.value = ''
        }
    } catch (error) {
        if (open.value?.id === id) status.value = playgroundErrorMessage(error, t)
    }
}

async function toggleEnabled() {
    if (!open.value) return
    const id = open.value.id
    try {
        const saved = await setPlaygroundEnabled(id, !open.value.enabled, authStore)
        if (open.value?.id === id) {
            open.value = saved
            status.value = ''
        }
    } catch (error) {
        if (open.value?.id === id) status.value = playgroundErrorMessage(error, t)
    }
}

function postToFrame(message: Record<string, unknown>) {
    frameRef.value?.contentWindow?.postMessage({ namespace: PLAYGROUND_FRAME_NAMESPACE, ...message }, '*')
}

async function answer(call: FrameCall) {
    if (!open.value) return
    try {
        let value: unknown = null
        const id = open.value.id
        if (call.method === 'sql') {
            value = await runPlaygroundSql(id, String(call.payload.statement || ''), call.payload.params as unknown[], authStore)
        } else if (call.method === 'fetch') {
            value = await fetchPlaygroundPath(
                id,
                String(call.payload.path || ''),
                typeof call.payload.method === 'string' ? call.payload.method : undefined,
                call.payload.body,
                authStore
            )
        } else if (call.method === 'api') {
            value = await callPlaygroundApi(
                id,
                {
                    path: String(call.payload.path || '/'),
                    method: typeof call.payload.method === 'string' ? call.payload.method : 'GET',
                    body: call.payload.body,
                    file: frameFile(call.payload.file)
                },
                authStore
            )
        }
        postToFrame({ type: 'result', id: call.id, ok: true, value })
    } catch (error) {
        const message = playgroundErrorMessage(error, t, t('playground.page.turnedOff'))
        status.value = message
        postToFrame({ type: 'result', id: call.id, ok: false, error: message })
    }
}

function onMessage(event: MessageEvent) {
    const frame = frameRef.value?.contentWindow || null
    if (event.origin !== 'null') return
    const parsed = readFrameMessage(event.data, event.source, frame)
    if (!parsed) return
    if ('ready' in parsed) return
    void answer(parsed.call)
}

async function applyPlayground(input: string | PlaygroundAgentInput) {
    const request: PlaygroundAgentInput = typeof input === 'string' ? { source: input } : input
    try {
        const files = playgroundFiles(request)
        if (!open.value) await loadPlayground()
        if (!open.value) throw new Error('The playground is not open.')
        const id = open.value.id
        await storeFiles(id, files)
        if (playgroundId() !== id) return { id, name: open.value?.name || '', revision: open.value?.revision || 0 }
        const detail = await getPlayground(id, authStore)
        if (playgroundId() !== id || !open.value) return { id, name: detail.name, revision: detail.revision }
        open.value = detail
        status.value = ''
        return { id: open.value.id, name: open.value.name, revision: open.value.revision }
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
    const app = await getPlaygroundApp(id, authStore)
    if (playgroundId() !== id) return
    savedFiles.value = app
    preview.value += 1
}

function installHook() {
    window.__agentApplyPlayground = applyPlayground
}

function removeHook() {
    if (window.__agentApplyPlayground === applyPlayground) delete window.__agentApplyPlayground
}

installHook()

watch(
    () => route.params.id,
    () => {
        const id = playgroundId()
        void loadPlayground().catch((error) => {
            if (playgroundId() !== id) return
            open.value = null
            status.value = playgroundErrorMessage(error, t)
        })
    },
    { immediate: true }
)

onMounted(() => {
    window.addEventListener('message', onMessage)
    installHook()
})

onUnmounted(() => {
    window.removeEventListener('message', onMessage)
    removeHook()
})
</script>
