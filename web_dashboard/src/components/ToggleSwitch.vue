<template>
    <div class="flex items-center">
        <label class="inline-flex items-center cursor-pointer">
            <div class="relative">
                <input
                    type="checkbox"
                    class="sr-only"
                    :checked="modelValue"
                    @change="updateValue($event)"
                />
                <div
                    class="w-10 h-5 rounded-full transition-colors duration-200 ease-in-out"
                    :class="[modelValue ? activeColor : inactiveColor]"
                ></div>
                <div
                    class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out transform"
                    :class="{ 'translate-x-5': modelValue }"
                ></div>
            </div>
            <span v-if="label" class="ml-2 text-sm">{{ label }}</span>
        </label>
    </div>
</template>

<script setup lang="ts">
    
const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    label: {
        type: String,
        default: ''
    },
    activeColor: {
        type: String,
        default: 'bg-blue-600'
    },
    inactiveColor: {
        type: String,
        default: 'bg-neutral-200'
    }
})

const emit = defineEmits(['update:modelValue'])

const updateValue = (event: Event) => {
    const target = event.target as HTMLInputElement
    emit('update:modelValue', target.checked)
}
</script>
