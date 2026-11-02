<template>
    <div class="bg-white rounded-lg shadow-lg w-[32rem] max-w-[calc(100vw-2rem)]" test-id="share-implementation-modal">
        <div class="p-6 border-b border-neutral-200">
            <h2 class="text-lg">{{ t('implementations.share.title') }}</h2>
            <p class="mt-1 text-sm text-neutral-500">
                {{ t('implementations.share.description') }}
            </p>
            <p v-if="standardName" class="mt-2 text-sm font-medium text-neutral-800">
                {{ standardName }}
            </p>
        </div>

        <form class="p-6 space-y-4" @submit.prevent="submit">
            <div v-if="!previewLink">
                <label class="block text-sm text-neutral-700 mb-1" for="share-implementation-email">
                    {{ t('implementations.share.email') }}
                </label>
                <AppInput
                    id="share-implementation-email"
                    v-model="email"
                    type="email"
                    autocomplete="email"
                    hide-icon
                    :error="emailInvalid"
                    :placeholder="t('implementations.share.email_placeholder')"
                    test-id="share-implementation-email"
                />
                <p v-if="emailInvalid" class="mt-1 text-sm text-red-600">
                    {{ t('implementations.share.email_invalid') }}
                </p>
            </div>

            <div v-else class="space-y-2" test-id="share-implementation-preview">
                <p class="text-sm text-neutral-600">{{ t('implementations.share.dev_link') }}</p>
                <a :href="previewLink" class="inline-flex text-sm text-primary hover:text-primary/70" rel="noreferrer">
                    {{ t('implementations.share.dev_open') }}
                </a>
                <input
                    readonly
                    :value="previewLink"
                    class="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-700"
                    @focus="($event.target as HTMLInputElement).select()"
                />
            </div>

            <div class="flex justify-end gap-3">
                <AppButton buttonStyle="secondary" type="button" :disabled="sending" @click="onCancel">
                    {{ previewLink ? t('implementations.share.close') : t('implementations.share.cancel') }}
                </AppButton>
                <AppButton
                    v-if="!previewLink"
                    buttonStyle="primary"
                    type="submit"
                    test-id="share-implementation-submit"
                    :loading="sending"
                    :disabled="sending"
                >
                    {{ t('implementations.share.submit') }}
                </AppButton>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import AppInput from '../AppInput.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { apiPost } from '@/util/api'
import { formatApiErrorMessage, isEmail } from '@/util/util'
import type { CreateImplementationShareResult } from '@/util/interfaces'

const props = defineProps<{
    implementationId: string
    standardName: string
    onCancel: () => void
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()
const email = ref('')
const emailInvalid = ref(false)
const sending = ref(false)
const previewLink = ref('')

async function submit() {
    const recipient = email.value.trim()
    emailInvalid.value = !isEmail(recipient)
    if (emailInvalid.value || sending.value) return
    sending.value = true
    try {
        const result = await apiPost<CreateImplementationShareResult>(
            `/standards/implementations/${props.implementationId}/shares`,
            { email: recipient },
            authStore
        )
        if (result.previewLink) {
            previewLink.value = result.previewLink
            return
        }
        toast.showToast(t('common.success'), t('implementations.share.toast_sent'), 'success')
        props.onCancel()
    } catch (error: unknown) {
        const raw = formatApiErrorMessage(
            (error as { response?: { data?: unknown } })?.response?.data,
            t,
            'errors.standard'
        )
        toast.showToast(t('common.error'), raw || t('implementations.share.toast_failed'), 'error')
    } finally {
        sending.value = false
    }
}
</script>
