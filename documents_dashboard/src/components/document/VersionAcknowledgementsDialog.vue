<template>
    <div class="bg-white rounded-lg shadow-lg w-[500px]">
        <div class="p-6 border-b">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-check-double text-neutral-700 text-xl"></i>
                    <h2 class="text-lg font-semibold">
                        {{ t('document.version_acknowledgements.title', { n: props.versionNumber }) }}
                    </h2>
                </div>
                <button
                    type="button"
                    @click="handleCancel"
                    class="text-neutral-400 hover:text-neutral-600"
                    :aria-label="t('document.version_acknowledgements.close_aria')"
                >
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
        </div>

        <div class="p-6 max-h-[400px] overflow-y-auto">
            <div v-if="props.acknowledgements.length" class="space-y-2">
                <div
                    v-for="(acknowledgement, index) in props.acknowledgements"
                    :key="acknowledgement.userId"
                    class="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-neutral-50"
                    :test-id="`version-acknowledgement-item-${acknowledgement.userId}`"
                >
                    <div class="flex items-center gap-2">
                        <MemberIcon
                            :member="{
                                fname: acknowledgement.fname || '',
                                lname: acknowledgement.lname || '',
                                image: '',
                                index
                            }"
                        />
                        <span class="text-sm font-medium">
                            {{ acknowledgement.fname }} {{ acknowledgement.lname }}
                        </span>
                    </div>
                    <span
                        :class="[
                            'text-xs px-2 py-1 rounded-full font-medium shrink-0',
                            acknowledgement.acknowledgedAt
                                ? 'text-green-600 bg-green-50'
                                : 'text-gray-600 bg-gray-50'
                        ]"
                        :test-id="`version-acknowledgement-status-${acknowledgement.userId}`"
                    >
                        {{
                            acknowledgement.acknowledgedAt
                                ? t('document.version_acknowledgements.acknowledged_at', {
                                      time: formatLocalDate(acknowledgement.acknowledgedAt)
                                  })
                                : t('document.version_acknowledgements.not_acknowledged')
                        }}
                    </span>
                </div>
            </div>
            <div v-else class="bg-neutral-50 p-4 rounded-lg text-center text-neutral-500">
                <i class="fa-solid fa-info-circle mr-2"></i>
                {{ t('document.version_acknowledgements.no_acknowledgers') }}
            </div>
        </div>

        <div class="p-6 border-t bg-neutral-50 flex justify-end gap-3">
            <AppButton type="button" buttonStyle="secondary" @click="handleCancel">
                {{ t('document.version_acknowledgements.close') }}
            </AppButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '../AppButton.vue'
import MemberIcon from '@/components/memberIcon.vue'
import { formatLocalDate } from '@/util/util'

export interface VersionAcknowledgement {
    fname: string
    lname: string
    userId: string
    acknowledgedAt: number | null
}

interface Props {
    versionNumber: number
    acknowledgements: VersionAcknowledgement[]
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
