<template>
    <div id="login-page" class="login-page fixed inset-0 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <div class="login-page__background fixed inset-0 bg-cover bg-center bg-no-repeat" :style="backgroundStyle"
            aria-hidden="true" />
        <div class="login-page__overlay fixed inset-0" aria-hidden="true" />

        <div class="relative z-10 w-full max-w-[520px] max-h-full overflow-y-auto">
            <div class="login-card relative bg-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                <img src="@/assets/img/4ss-logo.png?url" alt="4SS. See, Shape, Secure, Sustain."
                    class="login-card__logo absolute top-6 left-8 sm:top-8 sm:left-10 w-14 h-14" />
                <div class="absolute top-6 right-8 sm:top-8 sm:right-10 flex items-center gap-1 text-sm font-semibold">
                    <Select2 :placeholder="t('common.language')" v-model="selectedLocale" :values="localeOptions"
                        :display="(lang: any) => lang.label" />
                </div>

                <div class="px-8 pt-24 pb-8 sm:px-10 sm:pt-28 sm:pb-10">
                    <div id="login-header" class="mb-8">

                        <p class="text-black mt-1.5  font-bold text-xl">
                            {{ $t('auth.login.subtitle') }}
                        </p>
                    </div>

                    <Form @submit="handleLogin" id="login-form" class="space-y-5">
                        <div class="space-y-2">
                            <div class="relative">
                                <i
                                    class="fa-regular fa-envelope absolute left-3 sm:top-[40px] top-[40px] z-10 text-neutral-400 sm:text-base text-sm"></i>
                                <AppInputForm name="username" :label="$t('auth.login.emailLabel')"
                                    test-id="login-page-email" :placeholder="$t('auth.login.emailPlaceholder')"
                                    :rules="emailRules" :required="true" :show-icon="true" />
                            </div>
                        </div>

                        <div class="space-y-2">
                            <div class="relative">
                                <i
                                    class="fa-solid fa-lock absolute left-3 sm:top-[40px] top-[40px] z-10 text-neutral-400 sm:text-base text-sm"></i>
                                <AppInputForm name="password" :label="$t('auth.login.passwordLabel')"
                                    test-id="login-page-password" :placeholder="$t('auth.login.passwordPlaceholder')"
                                    :rules="passwordRules" :required="true" :show-icon="true" type="password" />
                            </div>
                        </div>

                        <div class="flex items-center justify-end pt-1">
                            <span
                                class="text-sm text-neutral-600 hover:text-neutral-900 cursor-pointer transition-colors"
                                @click="router.push('/forgot-password')">
                                {{ $t('auth.login.forgotPassword') }}
                            </span>
                        </div>

                        <AppButton type="submit" :loading="loading" button-style="primary" full-width
                            test-id="login-page-login-button">
                            <span>{{ $t('auth.login.signIn') }}</span>
                        </AppButton>
                    </Form>

                    <div class="mt-8 pt-6 border-t border-neutral-100 text-center">
                        <nav class="flex justify-center gap-4 text-xs text-neutral-600">
                            <RouterLink
                                :to="{ name: 'TermsAndConditions' }"
                                class="underline-offset-4 hover:text-neutral-900 hover:underline"
                            >
                                {{ t('legal.termsLink') }}
                            </RouterLink>
                            <RouterLink
                                :to="{ name: 'PrivacyPolicy' }"
                                class="underline-offset-4 hover:text-neutral-900 hover:underline"
                            >
                                {{ t('legal.privacyLink') }}
                            </RouterLink>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.login-page {
    height: 100dvh;
}

.login-page__overlay {
    background:
        linear-gradient(135deg,
            rgba(15, 23, 42, 0.82) 0%,
            rgba(30, 41, 59, 0.72) 45%,
            rgba(15, 23, 42, 0.88) 100%);
    -webkit-backdrop-filter: blur(3px);
    backdrop-filter: blur(3px);
}

.login-card {
    box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, 0.35),
        0 0 0 1px rgba(255, 255, 255, 0.08);
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import axios from 'axios'
import { apiPostPublic } from '@/util/api'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useToast } from '@/stores/notification'
import { Form } from 'vee-validate'
import AppInputForm from '@/components/AppInputForm.vue'
import { exists, isEmail, formatApiErrorMessage } from '@/util/util'
import { AUTH_ERROR_I18N_PREFIX } from './routes'
import AppButton from '../AppButton.vue'
import { useI18n } from 'vue-i18n'
import { LOCALE_OPTIONS, type AppLocale } from '@/i18n'
import Select2 from '../Select2.vue'
import { watch } from 'vue'
import { getFirstSectionDashboardRoute } from './section-map'

const { t } = useI18n()
const localeOptions = LOCALE_OPTIONS
const toast = useToast()

const backgroundImage = computed(
    () => new URL('@/assets/img/login-bg/bg-5.jpg', import.meta.url).href
)

const backgroundStyle = computed(() => ({
    backgroundImage: `url(${backgroundImage.value})`
}))

const emailRules = (v: any) => (!exists(v) || !isEmail(v) ? t('auth.login.emailInvalid') : true)
const passwordRules = (v: any) => (!exists(v) ? t('auth.login.passwordRequired') : true)

const loading = ref(false)
const router = useRouter()
const authStore = useAuthStore()
const selectedLocale = ref<{ value: AppLocale; label: string }>(LOCALE_OPTIONS.find(lang => lang.value === authStore.locale) || LOCALE_OPTIONS[0])

watch(selectedLocale, () => {
    authStore.setLocale(selectedLocale.value.value)
})

const handleLogin = async (values: any) => {
    try {
        loading.value = true
        const response = await apiPostPublic<{
            access_token: string
            user: any
        }>('/auth/login', {
            username: values.username,
            password: values.password,
            locale: selectedLocale.value.value
        })
        authStore.setLoginState(`Bearer ${response.access_token}`, response.user)
        if (router.currentRoute.value.query.redirect) {
            router.push(`${router.currentRoute.value.query.redirect}`)
        } else {
            router.push(getFirstSectionDashboardRoute(response.user.permissions) ?? '/')
        }
    } catch (error: any) {
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, AUTH_ERROR_I18N_PREFIX) ||
            error.response?.data?.message ||
            error.message,
            'error'
        )
    } finally {
        loading.value = false
    }
}

watch(selectedLocale, () => {
    authStore.setLocale(selectedLocale.value.value)
})

const handleIncidentReport = async () => {
    try {
        loading.value = true
        const response = await axios.post('/api/incidents/report')

        if (response.data.redirectUrl) {
            window.location.href = response.data.redirectUrl
        }
    } catch (error) {
        console.error('Incident report error:', error)
        alert('Failed to start incident report. Please try again.')
    } finally {
        loading.value = false
    }
}
</script>
