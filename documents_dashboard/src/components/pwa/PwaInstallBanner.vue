<template>
    <div
        v-if="visible"
        class="fixed inset-x-0 bottom-0 z-alot px-4"
        :style="{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }"
        test-id="pwa-install-banner"
    >
        <div
            class="mx-auto flex max-w-lg flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4"
        >
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-black">{{ t('common.pwa_install_title') }}</p>
                    <p class="mt-1 text-sm text-neutral-600">
                        {{
                            iosHint
                                ? t('common.pwa_ios_message')
                                : t('common.pwa_install_message')
                        }}
                    </p>
                </div>
                <button
                    type="button"
                    class="inline-flex shrink-0 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
                    :aria-label="t('common.pwa_dismiss')"
                    test-id="pwa-install-dismiss"
                    @click="dismiss"
                >
                    <XMarkIcon class="h-5 w-5" aria-hidden="true" />
                </button>
            </div>
            <div class="flex flex-wrap items-center justify-end gap-2">
                <AppButton button-style="secondary" test-id="pwa-install-later" @click="dismiss">
                    {{ t('common.pwa_dismiss') }}
                </AppButton>
                <AppButton
                    v-if="deferredPrompt"
                    button-style="primary"
                    test-id="pwa-install-action"
                    @click="install"
                >
                    {{ t('common.pwa_install_action') }}
                </AppButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { XMarkIcon } from '@heroicons/vue/20/solid'
import AppButton from '@/components/AppButton.vue'
import {
    dismissPwaInstall,
    isIosSafari,
    isPwaInstallDismissed,
    isStandaloneDisplay,
    type BeforeInstallPromptEvent
} from '@/util/pwa'

const { t } = useI18n()
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const iosHint = ref(false)
const visible = ref(false)

const refreshVisibility = () => {
    if (isStandaloneDisplay() || isPwaInstallDismissed()) {
        visible.value = false
        return
    }
    visible.value = Boolean(deferredPrompt.value) || iosHint.value
}

const onBeforeInstallPrompt = (event: Event) => {
    event.preventDefault()
    deferredPrompt.value = event as BeforeInstallPromptEvent
    refreshVisibility()
}

const onAppInstalled = () => {
    deferredPrompt.value = null
    visible.value = false
}

const dismiss = () => {
    dismissPwaInstall()
    visible.value = false
}

const install = async () => {
    const promptEvent = deferredPrompt.value
    if (!promptEvent) {
        return
    }
    await promptEvent.prompt()
    deferredPrompt.value = null
    refreshVisibility()
}

onMounted(() => {
    iosHint.value = isIosSafari()
    refreshVisibility()
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
})

onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
})
</script>
