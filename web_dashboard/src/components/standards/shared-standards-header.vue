<template>
    <header class="border-b bg-primary">
        <div class="h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <img src="@/assets/img/4ss-logo.png?url" alt="" class="h-9 w-9 shrink-0" />
                <span class="text-opposite font-bold">4SS</span>
            </div>
            <div class="w-36 shrink-0">
                <Select2
                    v-model="selectedLocale"
                    :values="localeOptions"
                    :display="(lang: { label?: string }) => lang?.label ?? ''"
                    :placeholder="t('common.language')"
                />
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Select2 from '../Select2.vue'
import { LOCALE_OPTIONS, type AppLocale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()
const localeOptions = LOCALE_OPTIONS
const selectedLocale = ref<{ value: AppLocale; label: string }>(
    LOCALE_OPTIONS.find((lang) => lang.value === authStore.locale) || LOCALE_OPTIONS[0]
)

watch(selectedLocale, () => {
    if (selectedLocale.value?.value) authStore.setLocale(selectedLocale.value.value)
})
</script>
