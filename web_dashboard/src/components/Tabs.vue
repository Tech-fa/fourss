<template>
    <div class="flex gap-4 border-b border-neutral-200 mb-6">
        <button
            v-for="(tab, index) in tabs"
            :key="index"
            type="button"
            :disabled="isTabDisabled(index)"
            @click="!isTabDisabled(index) && $emit('update:modelValue', index)"
            class="px-4 py-2"
            :class="[
                isTabDisabled(index)
                    ? 'text-primary/30 cursor-not-allowed'
                    : modelValue === index
                      ? 'border-b-2 border-primary text-primary font-bold'
                      : 'text-primary/70 hover:text-primary font-bold'
            ]"
            :test-id="testIds && testIds[index] ? testIds[index] : undefined"
        >
            {{ tab }}
        </button>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    tabs: string[]
    modelValue: number
    testIds?: string[]
    disabledTabs?: number[]
}>()

defineEmits<{
    (e: 'update:modelValue', value: number): void
}>()

const isTabDisabled = (index: number) => props.disabledTabs?.includes(index) ?? false
</script>
