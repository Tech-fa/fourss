<template>
    <div class="flex gap-1">
        <IconTooltipButton
            v-if="showAdd"
            buttonStyle="primary"
            class="flex items-center gap-2"
            :test-id="addTestId"
            :text="resolvedAddText"
            iconClass="fa-solid fa-plus text-xs"
            :href="href"
            target="_blank"
            customClass="!w-4 !h-4"
            :loading="addLoading"
            :disabled="addDisabled"
            @click="handleAdd"
        />
        
        <IconTooltipButton
            v-if="showReload"
            buttonStyle="secondary"
            class="flex items-center gap-2"
            customClass="!w-4 !h-4"
            :test-id="reloadTestId"
            :text="resolvedReloadText"
            iconClass="fa-solid fa-refresh text-xs"
            :loading="reloadLoading"
            :disabled="reloadDisabled"
            @click="handleReload"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconTooltipButton from './IconTooltipButton.vue'

const props = withDefaults(
    defineProps<{
        href?: string
        addText?: string
        reloadText?: string
        showAdd?: boolean
        showReload?: boolean
        addLoading?: boolean
        reloadLoading?: boolean
        addDisabled?: boolean
        reloadDisabled?: boolean
        addTestId?: string
        reloadTestId?: string
    }>(),
    {
        showAdd: true,
        showReload: true,
        addLoading: false,
        reloadLoading: false,
        addDisabled: false,
        reloadDisabled: false
    }
)

const emit = defineEmits<{
    add: []
    reload: []
}>()

const { t } = useI18n()

const resolvedAddText = computed(() => props.addText ?? t('common.add'))
const resolvedReloadText = computed(() => props.reloadText ?? t('common.reload'))

const handleAdd = () => {
    if (props.href) return
    emit('add')
}

const handleReload = () => {
    emit('reload')
}
</script>
