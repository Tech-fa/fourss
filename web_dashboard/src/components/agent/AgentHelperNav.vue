<template>
    <div
        class="flex w-full min-w-0 items-center gap-x-1  text-sm font-semibold text-black"
        test-id="agent-helper-nav"
    >
        <button type="button" class="flex min-w-0 flex-1 items-center gap-x-4 text-start" @click="openModal">
            <i class="fa-solid fa-link text-lg text-primary"></i>
            <span class="truncate">Agent helper</span>
        </button>
        <button
            type="button"
            role="switch"
            class="relative h-6 w-11 shrink-0 rounded-full"
            :class="state.enabled ? 'bg-primary' : 'bg-neutral-300'"
            :aria-checked="state.enabled"
            aria-label="Agent helper"
            test-id="agent-helper-toggle"
            @click="onSwitch"
        >
            <span class="sr-only">{{ state.enabled ? 'On' : 'Off' }}</span>
            <span
                class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                :class="state.enabled ? 'end-0.5' : 'start-0.5'"
            />
        </button>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useDialog } from '@/stores/dialog'
import AgentHelperDialog from './AgentHelperDialog.vue'
import { agentHelperState, setAgentHelperEnabled, subscribeAgentHelper, type AgentHelperState } from '@/agent/helper-client'

const dialog = useDialog()
const state = ref<AgentHelperState>(agentHelperState())
let unsubscribe = () => {}

onMounted(() => {
    unsubscribe = subscribeAgentHelper((next) => {
        state.value = next
    })
})

onUnmounted(() => {
    unsubscribe()
})

function openModal() {
    dialog.openDialog(AgentHelperDialog, {
        onClose: () => dialog.closeDialog()
    })
}

async function onSwitch() {
    if (state.value.enabled) {
        await setAgentHelperEnabled(false)
        return
    }
    openModal()
}
</script>
