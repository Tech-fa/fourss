<template>
    <textarea
        v-bind="$attrs"
        :value="model"
        :dir="textDir"
        @input="handleInput"
        :class="[`${INPUT_CLASS} ps-2 py-2`, props.error ? 'ring-red-500' : '', 'h-auto']"
        rows="4"
    ></textarea>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { INPUT_CLASS } from './contants'
import { isLocaleRtl } from '@/util/util'

const { locale } = useI18n()
const textDir = computed(() => (isLocaleRtl(locale.value) ? 'rtl' : 'ltr'))

const props = defineProps<{
    error?: boolean
    model?: string
}>()
const emit = defineEmits<{
    (e: 'update:model', value: string): void
}>()

const handleInput = (event: Event) => {
    emit('update:model', (event.target as HTMLTextAreaElement).value)
}
</script>

<style scoped>
.base-textarea {
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 16px;
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
}

.base-textarea:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
}
</style>
