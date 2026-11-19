<template>
    <BreadCrums :crumbs="crumbs" />
    <main id="main-content" class="p-6 space-y-6 max-w-3xl">
        <p v-if="returnPath">
            <AppButton button-style="secondary" type="button" @click="router.push(returnPath)">
                {{ t('integrations.backToChecklist') }}
            </AppButton>
        </p>
        <p v-if="status" class="text-sm text-neutral-600">{{ status }}</p>
        <section v-if="detail" class="space-y-2">
            <p class="text-sm text-neutral-600">{{ detail.status }}</p>
            <p v-if="detail.latestFailure" class="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
                {{ t('integrations.failure') }}: {{ detail.latestFailure.message }}
            </p>
            <iframe v-if="frameHtml" ref="frameRef" class="w-full min-h-96 border border-neutral-200 rounded-lg bg-white" sandbox="allow-scripts allow-popups" :srcdoc="frameHtml"></iframe>
        </section>
        <ol v-if="detail" class="space-y-4">
            <li v-for="(step, index) in detail.steps" :key="step.id" class="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
                <div class="flex items-start justify-between gap-3">
                    <h2 class="font-medium">{{ index + 1 }}. {{ step.title }}</h2>
                    <span v-if="step.done" class="text-sm text-green-700">{{ t('integrations.done') }}</span>
                </div>
                <p class="text-sm text-neutral-700 whitespace-pre-wrap">{{ step.instruction }}</p>
                <a v-if="step.link" :href="step.link.url" target="_blank" rel="noreferrer" class="text-sm text-blue-700 underline">
                    {{ step.link.label }}
                </a>
                <div v-if="step.copyValue" class="flex flex-wrap items-center gap-2">
                    <code class="text-sm bg-neutral-100 rounded px-2 py-1 break-all">{{ step.copyValue }}</code>
                    <AppButton button-style="secondary" type="button" @click="copy(step.copyValue)">{{ t('integrations.copy') }}</AppButton>
                </div>
                <div v-for="key in step.fields" :key="key" class="space-y-1">
                    <Field :field="fieldFor(key)" v-model="draft[key]" />
                </div>
                <div class="flex gap-2">
                    <AppButton v-if="step.fields.length" button-style="primary" type="button" :loading="saving === step.id" @click="saveStep(step)">
                        {{ t('integrations.save') }}
                    </AppButton>
                    <AppButton v-if="step.doneWhen === 'manual' && !step.done" button-style="secondary" type="button" @click="finish(step.id)">
                        {{ t('integrations.markDone') }}
                    </AppButton>
                </div>
            </li>
        </ol>
        <section v-if="detail && detail.otherKeys.length" class="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
            <h2 class="font-medium">{{ t('integrations.other') }}</h2>
            <div v-for="key in detail.otherKeys" :key="key" class="space-y-1">
                <Field :field="fieldFor(key)" v-model="draft[key]" />
            </div>
            <AppButton button-style="primary" type="button" :loading="saving === 'other'" @click="saveOther">{{ t('integrations.save') }}</AppButton>
        </section>
    </main>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import BreadCrums from '@/components/breadCrums.vue'
import { useAuthStore } from '@/stores/auth'
import { callIntegration, markIntegrationStep, readIntegration, saveIntegrationValues, setIntegrationStatus, type IntegrationDetail, type IntegrationField, type IntegrationStep } from './endpoints'
import { integrationFrame, INTEGRATION_FRAME_NAMESPACE } from './frame'
import { INTEGRATIONS_LIST_PATH } from './routes'

const Field = defineComponent({
    props: { field: { type: Object, required: true }, modelValue: { type: String, default: '' } },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        const { t } = useI18n()
        const field = props.field as IntegrationField
        return () =>
            h('label', { class: 'block space-y-1' }, [
                h('span', { class: 'text-sm font-medium text-neutral-800' }, field.label),
                h('span', { class: 'block text-sm text-neutral-600' }, field.description),
                field.secret && field.filled
                    ? h('span', { class: 'block text-xs text-neutral-500' }, t('integrations.keepSecret'))
                    : null,
                h(AppInput, {
                    hideIcon: true,
                    type: field.secret ? 'password' : 'text',
                    modelValue: props.modelValue,
                    'onUpdate:modelValue': (value: string) => emit('update:modelValue', value)
                })
            ])
    }
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const returnPath = computed(() => {
    const from = route.query?.from
    const value = Array.isArray(from) ? from[0] : from
    return typeof value === 'string' && value.startsWith('/check/audits') ? value : ''
})
const auth = useAuthStore()
const detail = ref<IntegrationDetail | null>(null)
const frameRef = ref<HTMLIFrameElement | null>(null)
const draft = ref<Record<string, string>>({})
const status = ref('')
const saving = ref('')
const frameHtml = computed(() =>
    detail.value && (detail.value.pageHtml || detail.value.pageJs)
        ? integrationFrame(detail.value.pageHtml || '', detail.value.pageJs || '')
        : ''
)
const crumbs = computed(() => [
    { name: t('integrations.back'), path: INTEGRATIONS_LIST_PATH, icon: 'fa-solid fa-plug' },
    { name: detail.value?.name || t('integrations.detailTitle'), path: route.path, icon: '' }
])

function fieldFor(key: string): IntegrationField {
    return (
        detail.value?.inputs.find((field) => field.key === key) || {
            key,
            label: key,
            description: '',
            required: false,
            secret: false,
            filled: false
        }
    )
}

function fillDraft(next: IntegrationDetail) {
    const values: Record<string, string> = {}
    for (const field of next.inputs) values[field.key] = field.secret ? '' : field.value || ''
    draft.value = values
}

async function load() {
    try {
        const next = await readIntegration(String(route.params.id), auth)
        detail.value = next
        fillDraft(next)
        status.value = ''
    } catch {
        status.value = t('integrations.loadError')
    }
}

async function saveStep(step: IntegrationStep) {
    const values: Record<string, string> = {}
    for (const key of step.fields) values[key] = draft.value[key] || ''
    saving.value = step.id
    try {
        const next = await saveIntegrationValues(detail.value!.id, values, step.id, auth)
        detail.value = next
        fillDraft(next)
        status.value = t('integrations.saved')
    } catch {
        status.value = t('integrations.saveError')
    } finally {
        saving.value = ''
    }
}

async function saveOther() {
    if (!detail.value) return
    const values: Record<string, string> = {}
    for (const key of detail.value.otherKeys) values[key] = draft.value[key] || ''
    saving.value = 'other'
    try {
        const next = await saveIntegrationValues(detail.value.id, values, undefined, auth)
        detail.value = next
        fillDraft(next)
        status.value = t('integrations.saved')
    } catch {
        status.value = t('integrations.saveError')
    } finally {
        saving.value = ''
    }
}

async function finish(stepId: string) {
    if (!detail.value) return
    try {
        const next = await markIntegrationStep(detail.value.id, stepId, auth)
        detail.value = next
        fillDraft(next)
    } catch {
        status.value = t('integrations.saveError')
    }
}

async function copy(value: string) {
    await navigator.clipboard.writeText(value)
    status.value = t('integrations.copied')
}

function postToFrame(message: Record<string, unknown>) {
    frameRef.value?.contentWindow?.postMessage({ namespace: INTEGRATION_FRAME_NAMESPACE, ...message }, '*')
}

async function onFrameMessage(event: MessageEvent) {
    if (event.origin !== 'null' || event.source !== frameRef.value?.contentWindow) return
    const data = event.data || {}
    if (data.namespace !== INTEGRATION_FRAME_NAMESPACE || data.type !== 'call' || !detail.value) return
    try {
        let value: unknown = null
        if (data.method === 'api') {
            value = await callIntegration(
                detail.value.id,
                String(data.payload?.path || '/'),
                String(data.payload?.method || 'POST'),
                data.payload?.body,
                auth
            )
        } else if (data.method === 'open') {
            const url = new URL(String(data.payload?.url || ''))
            if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('That address cannot be opened.')
            window.open(url.toString(), '_blank', 'noopener')
            value = { opened: true }
        } else if (data.method === 'setStatus') {
            const next = await setIntegrationStatus(detail.value.id, String(data.payload?.text || ''), auth)
            detail.value = { ...detail.value, status: next.status }
            value = { status: next.status }
        }
        postToFrame({ type: 'result', id: data.id, ok: true, value })
    } catch (error) {
        const message = error instanceof Error ? error.message : t('integrations.saveError')
        postToFrame({ type: 'result', id: data.id, ok: false, error: message })
    }
}

onMounted(() => {
    window.addEventListener('message', onFrameMessage)
    return load()
})
onUnmounted(() => window.removeEventListener('message', onFrameMessage))
</script>
