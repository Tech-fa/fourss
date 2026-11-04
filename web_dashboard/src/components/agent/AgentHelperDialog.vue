<template>
    <div
        class="w-[32rem] max-w-[calc(100vw-2rem)] bg-white text-start"
        :dir="locale === 'ar' ? 'rtl' : 'ltr'"
        test-id="agent-helper-dialog"
    >
        <div class="flex items-center justify-between border-b p-6">
            <h2 class="text-lg">Agent helper</h2>
            <button
                type="button"
                class="text-neutral-400 hover:text-neutral-600"
                aria-label="Close"
                @click="onClose"
            >
                <i class="fa-solid fa-xmark text-xl"></i>
            </button>
        </div>

        <div class="space-y-4 p-6">
            <div class="rounded-md border border-red-300 bg-red-50 p-3 text-red-950" role="alert" test-id="agent-helper-warning">
                <p class="text-sm font-semibold">Warning</p>
                <p class="mt-1 text-sm leading-6">
                    An agent can open pages and fill fields in this tab. It can also read the login token in this
                    browser and call the API as you. It cannot click submit or save in this tab. You confirm those
                    yourself. Closing this tab turns the helper off.
                </p>
            </div>
            <p class="text-sm leading-6 text-neutral-700">
                Turn it on, then copy the text below into Cursor or Claude Code. That text tells the agent to ask this
                tab for the OpenAPI document and the login token, and to stop so you can confirm.
            </p>
            <p class="text-sm text-neutral-800" aria-live="polite">{{ statusText }}</p>
            <div v-if="handoff" class="space-y-2">
                <label class="block text-sm font-semibold text-neutral-800" for="agent-helper-handoff">
                    Pass this to the agent
                </label>
                <textarea
                    id="agent-helper-handoff"
                    class="h-40 w-full resize-y rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm leading-6 text-neutral-800"
                    dir="ltr"
                    readonly
                    spellcheck="false"
                    :value="handoff"
                    test-id="agent-helper-handoff"
                    @focus="selectHandoff"
                />
            </div>
        </div>

        <div class="flex justify-end gap-3 rounded-b-lg border-t bg-neutral-50 p-6">
            <AppButton button-style="secondary" type="button" test-id="agent-helper-close" @click="onClose">
                Close
            </AppButton>
            <AppButton
                v-if="!state.enabled"
                button-style="primary"
                type="button"
                :loading="turningOn"
                test-id="agent-helper-turn-on"
                @click="turnOn"
            >
                Turn on
            </AppButton>
            <AppButton
                v-else
                button-style="secondary"
                type="button"
                test-id="agent-helper-turn-off"
                @click="turnOff"
            >
                Turn off
            </AppButton>
            <AppButton
                v-if="handoff"
                button-style="primary"
                type="button"
                test-id="agent-helper-copy"
                @click="copyHandoff"
            >
                {{ copied ? 'Copied' : 'Copy for the agent' }}
            </AppButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import { agentHandoff } from '@/agent/confirmation'
import { agentHelperState, setAgentHelperEnabled, subscribeAgentHelper, type AgentHelperState } from '@/agent/helper-client'

defineProps<{
    onClose: () => void
}>()

const { locale } = useI18n()
const state = ref<AgentHelperState>(agentHelperState())
const turningOn = ref(false)
const copied = ref(false)
const handoff = computed(() => (state.value.mcpUrl ? agentHandoff(state.value.mcpUrl) : ''))
let unsubscribe = () => {}
let copiedTimer = 0

onMounted(() => {
    unsubscribe = subscribeAgentHelper((next) => {
        state.value = next
    })
})

onUnmounted(() => {
    unsubscribe()
    window.clearTimeout(copiedTimer)
})

const statusText = computed(() => {
    if (state.value.message) return state.value.message
    if (state.value.status === 'connecting') return 'Connecting to this dev server.'
    if (state.value.status === 'connected') return 'This tab is listening.'
    return 'The helper is off.'
})

async function turnOn() {
    turningOn.value = true
    try {
        await setAgentHelperEnabled(true)
    } finally {
        turningOn.value = false
    }
}

async function turnOff() {
    await setAgentHelperEnabled(false)
}

function selectHandoff(event: FocusEvent) {
    const input = event.target
    if (input instanceof HTMLTextAreaElement) input.select()
}

async function copyHandoff() {
    if (!handoff.value) return
    try {
        await navigator.clipboard.writeText(handoff.value)
        copied.value = true
        window.clearTimeout(copiedTimer)
        copiedTimer = window.setTimeout(() => {
            copied.value = false
        }, 2000)
    } catch {
        copied.value = false
    }
}
</script>
