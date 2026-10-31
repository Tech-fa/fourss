<template>
    <main class="min-h-dvh bg-neutral-50 text-neutral-800">
        <header class="border-b border-neutral-200 bg-white">
            <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
                <RouterLink to="/login" class="flex items-center gap-3" :aria-label="t('legal.backToLogin')">
                    <img src="@/assets/img/4ss-logo.png?url" alt="" class="h-10 w-10" />
                    <span class="text-lg font-bold text-neutral-900">4SS</span>
                </RouterLink>
                <div class="flex items-center gap-3">
                    <label for="legal-language" class="text-sm text-neutral-600">
                        {{ t('legal.language') }}
                    </label>
                    <select
                        id="legal-language"
                        v-model="locale"
                        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    >
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                    </select>
                </div>
            </div>
        </header>

        <article class="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
            <p class="text-sm font-semibold uppercase tracking-wide text-neutral-500">4SS</p>
            <h1 class="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                {{ document.title }}
            </h1>
            <p class="mt-3 text-sm text-neutral-600">{{ document.effectiveDate }}</p>

            <div class="mt-8 space-y-4 text-base leading-7 text-neutral-700">
                <p v-for="paragraph in document.introduction" :key="paragraph">{{ paragraph }}</p>
            </div>

            <section
                v-for="section in document.sections"
                :key="section.title"
                class="mt-10 border-t border-neutral-200 pt-8"
            >
                <h2 class="text-xl font-bold text-neutral-900">{{ section.title }}</h2>
                <div class="mt-4 space-y-4 leading-7 text-neutral-700">
                    <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
                    <ul v-if="section.items" class="list-disc space-y-2 pl-6">
                        <li v-for="item in section.items" :key="item">{{ item }}</li>
                    </ul>
                </div>
            </section>

            <nav class="mt-12 flex flex-wrap gap-x-5 gap-y-3 border-t border-neutral-200 pt-6 text-sm font-medium">
                <RouterLink
                    :to="{ name: 'TermsAndConditions' }"
                    class="text-neutral-800 underline-offset-4 hover:underline"
                >
                    {{ t('legal.termsLink') }}
                </RouterLink>
                <RouterLink
                    :to="{ name: 'PrivacyPolicy' }"
                    class="text-neutral-800 underline-offset-4 hover:underline"
                >
                    {{ t('legal.privacyLink') }}
                </RouterLink>
                <a class="text-neutral-800 underline-offset-4 hover:underline" href="mailto:afawaz@4sshub.com">
                    afawaz@4sshub.com
                </a>
            </nav>
        </article>
    </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { legalContent, type LegalDocumentType } from './legal-content'

const props = defineProps<{
    documentType: LegalDocumentType
}>()

const { t, locale: appLocale } = useI18n()
const locale = ref<'en' | 'fr'>(appLocale.value === 'fr' ? 'fr' : 'en')

watch(locale, (value) => {
    appLocale.value = value
})

const document = computed(() => legalContent[locale.value][props.documentType])
</script>
