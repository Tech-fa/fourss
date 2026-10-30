<template>
    <div
        id="password-reset-code-page"
        class="min-h-screen bg-neutral-50 flex items-center justify-center p-4"
    >
        <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div id="reset-code-header" class="mb-8">
                <div class="flex justify-end mb-2">
                    <div class="flex items-center gap-1 text-sm font-semibold">
                        <button
                            type="button"
                            @click="authStore.setLocale('en')"
                            :class="[
                                'px-2 py-1 rounded',
                                authStore.locale === 'en'
                                    ? 'bg-black text-white'
                                    : 'text-neutral-600 hover:text-neutral-900'
                            ]"
                        >
                            EN
                        </button>
                        <span class="text-neutral-400">|</span>
                        <button
                            type="button"
                            @click="authStore.setLocale('ar')"
                            :class="[
                                'px-2 py-1 rounded',
                                authStore.locale === 'ar'
                                    ? 'bg-black text-white'
                                    : 'text-neutral-600 hover:text-neutral-900'
                            ]"
                        >
                            ع
                        </button>
                    </div>
                </div>
                <div class="text-center">
                    <div class="flex justify-center mb-4">
                        <i class="fa-solid fa-shield-halved text-4xl text-neutral-700"></i>
                    </div>
                    <h1 class="text-2xl text-neutral-900">{{ $t('activate.title') }}</h1>
                    <p class="text-neutral-500 mt-2">{{ $t('activate.subtitle') }}</p>
                </div>
            </div>

            <form @submit.prevent="handleSubmit" id="reset-code-form" class="space-y-6">
                <div class="space-y-2">
                    <label for="new-password" class="block text-sm text-neutral-700">
                        {{ $t('activate.password') }}
                    </label>
                    <div class="relative">
                        <i
                            class="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                        ></i>
                        <AppInput
                            type="password"
                            v-model="newPassword"
                            id="new-password"
                            :placeholder="$t('activate.passwordPlaceholder')"
                        />
                    </div>
                </div>

                <div class="space-y-2">
                    <label for="confirm-password" class="block text-sm text-neutral-700">
                        {{ $t('activate.confirmPassword') }}
                    </label>
                    <div class="relative">
                        <i
                            class="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                        ></i>
                        <AppInput
                            type="password"
                            v-model="confirmPassword"
                            id="confirm-password"
                            :placeholder="$t('activate.confirmPasswordPlaceholder')"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    class="w-full bg-neutral-900 text-white py-2 px-4 rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center"
                >
                    <Spinner v-if="loading" />
                    <span v-else>{{ $t('activate.activateButton') }}</span>
                </button>
            </form>

            <div id="password-requirements" class="mt-6">
                <div class="bg-neutral-100 border border-neutral-200 rounded-lg p-4">
                    <p class="text-sm text-neutral-700 mb-2">{{ $t('activate.requirements') }}</p>
                    <ul class="text-sm text-neutral-600 space-y-1">
                        <li class="flex items-center">
                            <XMarkIcon v-if="newPassword.length < 8" class="w-4 h-4 mr-2" />
                            <CheckCircleIcon v-else class="w-4 h-4 mr-2 text-green-600" />
                            {{ $t('activate.req8chars') }}
                        </li>
                        <li class="flex items-center">
                            <XMarkIcon v-if="!/[A-Z]/.test(newPassword)" class="w-4 h-4 mr-2" />
                            <CheckCircleIcon v-else class="w-4 h-4 mr-2 text-green-600" />
                            {{ $t('activate.reqUppercase') }}
                        </li>
                        <li class="flex items-center">
                            <XMarkIcon v-if="!/\d/.test(newPassword)" class="w-4 h-4 mr-2" />
                            <CheckCircleIcon v-else class="w-4 h-4 mr-2 text-green-600" />
                            {{ $t('activate.reqNumber') }}
                        </li>
                        <li class="flex items-center">
                            <XMarkIcon v-if="!/[@$!%*?&_-]/.test(newPassword)" class="w-4 h-4 mr-2" />
                            <CheckCircleIcon v-else class="w-4 h-4 mr-2 text-green-600" />
                            {{ $t('activate.reqSpecial') }}
                        </li>
                    </ul>
                </div>
            </div>

            <div id="support-section" class="mt-8 pt-6 border-t border-neutral-200">
                <div class="text-center">
                    <p class="text-sm text-neutral-500">{{ $t('activate.needHelp') }}</p>
                    <div class="mt-2 flex items-center justify-center gap-3 flex-wrap">
                        <span class="text-sm text-neutral-700 hover:underline cursor-pointer">
                            {{ $t('activate.contactSupport') }}
                        </span>
                        <span class="text-sm text-neutral-700 hover:underline cursor-pointer">
                            {{ $t('activate.faq') }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppInput from '../AppInput.vue'
import { apiPostPublic } from '@/util/api'
import { useRouter, useRoute } from 'vue-router'
import Spinner from '../Spinner.vue'
import { XMarkIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import { formatApiErrorMessage } from '@/util/util'
import { AUTH_ERROR_I18N_PREFIX } from './routes'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()

function passwordMeetsBackend(plain: string): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&-_])[A-Za-z\d@$!%*?&-_]{8,}$/.test(plain)
}

function activationErrorMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: unknown } })?.response?.data
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data) as { message?: string }
            return parsed.message || fallback
        } catch {
            return data || fallback
        }
    }
    if (data && typeof data === 'object' && 'message' in data) {
        return String((data as { message: string }).message) || fallback
    }
    return fallback
}

const router = useRouter()
const route = useRoute()
const code = route.query.code
const email = route.query.email
const newPassword = ref('')
const confirmPassword = ref('')

const loading = ref(false)
const toast = useToast()
onMounted(() => {
    if (!code || !email) {
        router.push('/login')
    }
})

const handleSubmit = () => {
    loading.value = true
    if (newPassword.value !== confirmPassword.value) {
        toast.showToast(t('activate.errMismatchTitle'), t('activate.errMismatchMsg'), 'error')
        loading.value = false
        return
    }
    if (!passwordMeetsBackend(newPassword.value)) {
        toast.showToast(t('activate.errRequirementsTitle'), t('activate.errRequirementsMsg'), 'error')
        loading.value = false
        return
    }
    apiPostPublic('/auth/activate', {
        code,
        email,
        password: newPassword.value
    })
        .then(() => {
            toast.showToast(t('activate.successTitle'), t('activate.successMsg'), 'success')
            router.push('/login')
        })
        .catch((err: any) => {
            const fallback = t('activate.failMsg')
            toast.showToast(
                t('activate.failTitle'),
                formatApiErrorMessage(err?.response?.data, t, AUTH_ERROR_I18N_PREFIX) ||
                    activationErrorMessage(err, fallback),
                'error'
            )
        })
        .finally(() => {
            loading.value = false
        })
}
</script>
