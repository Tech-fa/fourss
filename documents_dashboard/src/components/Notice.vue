<template>
    <div
        :class="
            level === 'warning'
                ? 'bg-yellow-500 text-black'
                : level === 'info'
                  ? 'text-neutral-600 bg-blue-50'
                  : 'bg-red-500 text-black'
        "
        class="bg-opacity-50 text-black p-2 rounded-md flex items-center gap-2"
    >
        <ExclamationCircleIcon class="h-6 w-6 text-black shrink-0" aria-hidden="true" />
        <div class="text-sm">
            <I18nT v-if="link && descriptionKey" :keypath="descriptionKey" tag="span">
                <template #link>
                    <a
                        :href="link.href"
                        :target="link.target ?? '_blank'"
                        rel="noopener noreferrer"
                        class="underline font-medium hover:opacity-80"
                    >
                        {{ linkLabel }}
                    </a>
                </template>
            </I18nT>
            <span v-else>{{ description }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, I18nT } from 'vue-i18n'
import { ExclamationCircleIcon } from '@heroicons/vue/24/outline'

export type NoticeLink = {
    href: string
    labelKey: string
    target?: string
}

const props = defineProps<{
    description?: string
    descriptionKey?: string
    link?: NoticeLink
    level: 'info' | 'warning' | 'error'
}>()

const { t } = useI18n()

const linkLabel = computed(() => (props.link ? t(props.link.labelKey) : ''))
</script>
