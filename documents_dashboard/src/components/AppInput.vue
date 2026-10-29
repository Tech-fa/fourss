<template>
    <input
        v-bind="$attrs"
        v-model="model"
        :dir="inputDir"
        :class="[INPUT_CLASS, props.error ? 'ring-red-500' : '', props.hideIcon ? 'ps-2' : 'ps-10']"
    />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { INPUT_CLASS } from './contants'
import { isLocaleRtl } from '@/util/util'

const { locale } = useI18n()
const inputDir = computed(() => (isLocaleRtl(locale.value) ? 'rtl' : 'ltr'))

const props = defineProps<{
    error?: boolean
    hideIcon?: boolean
    value?: any
}>()
const model = defineModel<any>()
if (props.value !== undefined) {
    model.value = props.value
}
</script>

<style scoped>
.base-input {
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 16px;
    width: 100%;
    box-sizing: border-box;
}

.base-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
}
</style>
