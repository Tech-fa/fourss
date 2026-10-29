<template>
    <button
        type="button"
        :class="[
            'text-left rounded-lg border p-4 transition-colors w-full',
            selected
                ? 'border-neutral-700 ring-2 ring-neutral-400 bg-neutral-50'
                : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
        ]"
        @click="$emit('select')"
    >
        <h3 class="font-medium text-neutral-900">
            {{ title }}
        </h3>
    </button>
</template>

<script setup lang="ts">
defineProps<{
    title: string
    selected: boolean
}>()

defineEmits<{
    select: []
}>()
</script>
