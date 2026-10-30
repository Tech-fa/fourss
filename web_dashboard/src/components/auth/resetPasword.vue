<template>
    <div
        id="password-reset-code-page"
        class="min-h-screen bg-neutral-50 flex items-center justify-center p-4"
    >
        <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div id="reset-code-header" class="text-center mb-8">
                <div class="flex justify-center mb-4">
                    <i class="fa-solid fa-shield-halved text-4xl text-neutral-700"></i>
                </div>
                <h1 class="text-2xl text-neutral-900">{{ $t('resetPassword.title') }}</h1>
                <p class="text-neutral-500 mt-2">{{ $t('resetPassword.subtitle') }}</p>
            </div>

            <form @submit.prevent="handleSubmit" id="reset-code-form" class="space-y-6">
                <div class="space-y-2">
                    <label for="verification-code" class="block text-sm text-neutral-700">
                        {{ $t('resetPassword.verificationCode') }}
                    </label>
                    <div class="flex gap-2 justify-between" v-if="!code">
                        <input
                            v-model="digits[0]"
                            type="text"
                            maxlength="1"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            ref="input1"
                            class="w-12 h-12 text-center border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-400 focus:border-transparent text-xl"
                            @input="moveToNext($event, 1)"
                            @keydown="handleBackspace($event, 0)"
                        />
                        <input
                            v-model="digits[1]"
                            type="text"
                            maxlength="1"
                            inputmode="numeric"
                            ref="input2"
                            class="w-12 h-12 text-center border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-400 focus:border-transparent text-xl"
                            @input="moveToNext($event, 2)"
                            @keydown="handleBackspace($event, 1)"
                        />
                        <input
                            v-model="digits[2]"
                            type="text"
                            maxlength="1"
                            inputmode="numeric"
                            ref="input3"
                            class="w-12 h-12 text-center border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-400 focus:border-transparent text-xl"
                            @input="moveToNext($event, 3)"
                            @keydown="handleBackspace($event, 2)"
                        />
                        <input
                            v-model="digits[3]"
                            type="text"
                            maxlength="1"
                            inputmode="numeric"
                            ref="input4"
                            class="w-12 h-12 text-center border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-400 focus:border-transparent text-xl"
                            @input="moveToNext($event, 4)"
                            @keydown="handleBackspace($event, 3)"
                        />
                        <input
                            v-model="digits[4]"
                            type="text"
                            maxlength="1"
                            inputmode="numeric"
                            ref="input5"
                            class="w-12 h-12 text-center border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-400 focus:border-transparent text-xl"
                            @input="moveToNext($event, 5)"
                            @keydown="handleBackspace($event, 4)"
                        />
                        <input
                            v-model="digits[5]"
                            type="text"
                            maxlength="1"
                            inputmode="numeric"
                            ref="input6"
                            class="w-12 h-12 text-center border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-400 focus:border-transparent text-xl"
                            @input="moveToNext($event, 6)"
                            @keydown="handleBackspace($event, 5)"
                        />
                    </div>
                </div>

                <div class="space-y-2">
                    <label for="new-password" class="block text-sm text-neutral-700">
                        {{ $t('resetPassword.newPassword') }}
                    </label>
                    <div class="relative">
                        <i
                            class="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                        ></i>
                        <AppInput
                            type="password"
                            v-model="newPassword"
                            id="new-password"
                            :placeholder="$t('resetPassword.newPasswordPlaceholder')"
                        />
                    </div>
                </div>

                <div class="space-y-2">
                    <label for="confirm-password" class="block text-sm text-neutral-700">
                        {{ $t('resetPassword.confirmPassword') }}
                    </label>
                    <div class="relative">
                        <i
                            class="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                        ></i>
                        <AppInput
                            type="password"
                            v-model="confirmPassword"
                            id="confirm-password"
                            :placeholder="$t('resetPassword.confirmPasswordPlaceholder')"
                            :class="
                                confirmPassword && newPassword && newPassword !== confirmPassword
                                    ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                                    : confirmPassword &&
                                        newPassword &&
                                        newPassword === confirmPassword
                                      ? 'border-green-300 focus:border-green-400 focus:ring-green-400'
                                      : ''
                            "
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    class="w-full bg-neutral-900 text-white py-2 px-4 rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center"
                >
                    <Spinner v-if="loading" />
                    <span v-else>{{ $t('resetPassword.resetButton') }}</span>
                </button>
            </form>

            <div class="mt-6 justify-center flex items-center gap-2">
                <p class="text-sm text-neutral-600 relative mr-2">
                    {{ $t('resetPassword.didntReceive') }}
                    <span
                        class="text-neutral-900 hover:underline cursor-pointer"
                        @click="resendCode"
                        >{{ $t('resetPassword.resendCode') }}</span
                    >
                </p>
                <Spinner v-if="loadingResend" width="0.5" />
            </div>

            <div id="password-requirements" class="mt-6">
                <div class="bg-neutral-100 border border-neutral-200 rounded-lg p-4">
                    <p class="text-sm text-neutral-700 mb-2">{{ $t('resetPassword.requirements') }}</p>
                    <ul class="text-sm text-neutral-600 space-y-1">
                        <li class="flex items-center">
                            <XMarkIcon v-if="newPassword.length < 8" class="w-4 h-4 mr-2 text-red-500" />
                            <CheckCircleIcon v-else class="w-4 h-4 mr-2 text-green-600" />
                            <span :class="newPassword.length >= 8 ? 'text-green-600' : 'text-neutral-600'">
                                {{ $t('resetPassword.req8chars') }}
                            </span>
                        </li>
                        <li class="flex items-center">
                            <XMarkIcon v-if="!newPassword.match(/[A-Z]/)" class="w-4 h-4 mr-2 text-red-500" />
                            <CheckCircleIcon v-else class="w-4 h-4 mr-2 text-green-600" />
                            <span :class="newPassword.match(/[A-Z]/) ? 'text-green-600' : 'text-neutral-600'">
                                {{ $t('resetPassword.reqUppercase') }}
                            </span>
                        </li>
                        <li class="flex items-center">
                            <XMarkIcon v-if="!newPassword.match(/[0-9]/)" class="w-4 h-4 mr-2 text-red-500" />
                            <CheckCircleIcon v-else class="w-4 h-4 mr-2 text-green-600" />
                            <span :class="newPassword.match(/[0-9]/) ? 'text-green-600' : 'text-neutral-600'">
                                {{ $t('resetPassword.reqNumber') }}
                            </span>
                        </li>
                        <li class="flex items-center">
                            <XMarkIcon v-if="!newPassword.match(/[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/)" class="w-4 h-4 mr-2 text-red-500" />
                            <CheckCircleIcon v-else class="w-4 h-4 mr-2 text-green-600" />
                            <span :class="newPassword.match(/[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/) ? 'text-green-600' : 'text-neutral-600'">
                                {{ $t('resetPassword.reqSpecial') }}
                            </span>
                        </li>
                        <li v-if="confirmPassword && newPassword" class="flex items-center mt-2">
                            <XMarkIcon v-if="newPassword !== confirmPassword" class="w-4 h-4 mr-2 text-red-500" />
                            <CheckCircleIcon v-else class="w-4 h-4 mr-2 text-green-600" />
                            <span :class="newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'">
                                {{ $t('resetPassword.passwordsMatch') }}
                            </span>
                        </li>
                    </ul>
                </div>
            </div>

            <div id="support-section" class="mt-8 pt-6 border-t border-neutral-200">
                <div class="text-center">
                    <p class="text-sm text-neutral-500">{{ $t('resetPassword.needHelp') }}</p>
                    <div class="mt-2 flex items-center justify-center gap-3 flex-wrap">
                        <span class="text-sm text-neutral-700 hover:underline cursor-pointer">
                            {{ $t('resetPassword.contactSupport') }}
                        </span>
                        <span class="text-sm text-neutral-700 hover:underline cursor-pointer">
                            {{ $t('resetPassword.faq') }}
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
import { apiGetPublic, apiPostPublic } from '@/util/api'
import { useRouter, useRoute } from 'vue-router'
import Spinner from '../Spinner.vue'
import { XMarkIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/stores/notification'
import { useI18n } from 'vue-i18n'
import { formatApiErrorMessage } from '@/util/util'
import { AUTH_ERROR_I18N_PREFIX } from './routes'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const code = route.query.code
const toast = useToast()

const newPassword = ref('')
const confirmPassword = ref('')
const digits = ref(['', '', '', '', '', ''])
const input1 = ref(null)
const input2 = ref(null)
const input3 = ref(null)
const input4 = ref(null)
const input5 = ref(null)
const input6 = ref(null)
const inputRefs: {
    [key: string]: any
} = {
    input1,
    input2,
    input3,
    input4,
    input5,
    input6
}
const moveToNext = (event: any, index: number) => {
    if (event.target.value.length === 1) {
        const nextInput = inputRefs[`input${index + 1}`]
        if (nextInput) {
            nextInput.value.focus()
        }
    }
}
const handleBackspace = (event: any, index: number) => {
    if (event.key === 'Backspace' && !event.target.value) {
        const prevInput = inputRefs[`input${index}`]
        if (prevInput) {
            prevInput.value.focus()
        }
    }
}
const loading = ref(false)
const loadingResend = ref(false)
const email = ref(window.localStorage.getItem('reset_email'))

function verificationCode() {
    const fromLink = Array.isArray(code) ? code[0] : code
    if (typeof fromLink === 'string' && fromLink.trim()) {
        return fromLink.trim()
    }
    return digits.value.join('').trim()
}
onMounted(() => {
    if (!window.localStorage.getItem('reset_email')) {
        router.push('/login')
    } else {
        window.localStorage.removeItem('reset_email')
    }
})

const handleSubmit = () => {
    // Check if passwords are provided
    if (!newPassword.value) {
        toast.showToast(t('common.error'), t('resetPassword.errNoPassword'), 'error')
        return
    }

    if (!confirmPassword.value) {
        toast.showToast(t('common.error'), t('resetPassword.errNoConfirm'), 'error')
        return
    }

    if (newPassword.value !== confirmPassword.value) {
        toast.showToast(t('common.error'), t('resetPassword.errMismatch'), 'error')
        return
    }

    if (newPassword.value.length < 8) {
        toast.showToast(t('common.error'), t('resetPassword.errTooShort'), 'error')
        return
    }

    if (!newPassword.value.match(/[A-Z]/)) {
        toast.showToast(t('common.error'), t('resetPassword.errNoUppercase'), 'error')
        return
    }

    if (!newPassword.value.match(/[0-9]/)) {
        toast.showToast(t('common.error'), t('resetPassword.errNoNumber'), 'error')
        return
    }

    if (!newPassword.value.match(/[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/)) {
        toast.showToast(t('common.error'), t('resetPassword.errNoSpecial'), 'error')
        return
    }

    const resetCode = verificationCode()
    if (!resetCode) {
        toast.showToast(t('common.error'), t('resetPassword.errNoCode'), 'error')
        return
    }

    loading.value = true
    apiPostPublic(`/auth/password/reset?code=${encodeURIComponent(resetCode)}`, {
        password: newPassword.value,
        confirmPassword: confirmPassword.value,
        email: email.value
    })
        .then((res) => {
            toast.showToast(t('common.success'), t('resetPassword.successMsg'), 'success')
            router.push('/login')
        })
        .catch((err: any) => {
            loading.value = false
            const msg =
                formatApiErrorMessage(err?.response?.data, t, AUTH_ERROR_I18N_PREFIX) ||
                err.response?.data?.message ||
                t('resetPassword.genericError')
            toast.showToast(t('common.error'), msg, 'error')
        })
        .finally(() => {
            loading.value = false
        })
}

const resendCode = () => {
    loadingResend.value = true
    apiGetPublic(`/auth/code?email=${email.value}`)
        .then((res) => {
            console.log(res)
        })
        .catch((err: any) => {
            const msg =
                formatApiErrorMessage(err?.response?.data, t, AUTH_ERROR_I18N_PREFIX) ||
                t('resetPassword.resendFailed')
            toast.showToast(t('common.error'), msg, 'error')
        })
        .finally(() => {
            loadingResend.value = false
        })
}
</script>
