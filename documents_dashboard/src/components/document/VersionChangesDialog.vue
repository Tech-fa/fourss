<template>
    <div class="bg-white rounded-lg shadow-lg w-[500px]">
        <div class="p-6 border-b">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-code-compare text-neutral-700 text-xl"></i>
                    <h2 class="text-lg font-semibold">
                        {{ t('document.version_changes.title', { n: props.version?.versionNumber }) }}
                    </h2>
                </div>
                <button
                    type="button"
                    @click="handleCancel"
                    class="text-neutral-400 hover:text-neutral-600"
                    :aria-label="t('document.version_changes.close_aria')"
                >
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
        </div>

        <div class="p-6">
            <div class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-neutral-700 mb-2">{{
                        t('document.version_changes.label_created')
                    }}</label>
                    <p class="text-neutral-900">{{
                        props.version?.createdAt ? formatLocalDate(props.version.createdAt) : ''
                    }}</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-neutral-700 mb-2">{{
                        t('document.version_changes.label_changes')
                    }}</label>
                    <div v-if="props.version?.changes" class="bg-neutral-50 p-4 rounded-lg">
                        <p class="whitespace-pre-wrap text-sm text-neutral-900">{{ props.version.changes }}</p>
                    </div>
                    <div v-else class="bg-neutral-50 p-4 rounded-lg text-center text-neutral-500">
                        <i class="fa-solid fa-info-circle mr-2"></i>
                        {{ t('document.version_changes.no_changes') }}
                    </div>
                </div>
            </div>
        </div>

        <div class="p-6 border-t bg-neutral-50 flex justify-end gap-3">
            <AppButton type="button" buttonStyle="secondary" @click="handleCancel">
                {{ t('document.version_changes.close') }}
            </AppButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import type { Document } from '@/util/interfaces'
import { formatLocalDate } from '@/util/util'

interface Props {
    version: Document['versions'][number] | null
    onCancel?: () => void
}

const props = defineProps<Props>()
const { t } = useI18n()

const handleCancel = () => {
    if (props.onCancel) {
        props.onCancel()
    }
}
</script>
