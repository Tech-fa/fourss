<template>
    <div class="w-full" v-if="!useSearch" :dir="selectDir">
        <div class="relative" id="select2-dropdown">
            <button
                type="button"
                :class="`${INPUT_CLASS}  ring-0 text-start ps-4 pe-12`"
                @click="toggleDropdown"
            >
                <span
                    :class="`${model ? 'font-medium' : 'font-normal text-neutral-500'} block truncate text-start`"
                >
                    {{ model ? getDisplayLabel(model) : placeholder }}
                </span>
                <span class="absolute inset-y-0 inset-e-0 flex items-center pe-2">
                    <button
                        v-if="model && optional"
                        @click.stop="clearSelection"
                        class="flex items-center px-2"
                    >
                        <XMarkIcon
                            class="h-5 w-5 text-gray-400 hover:text-gray-500"
                            aria-hidden="true"
                        />
                    </button>
                    <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
            </button>

            <transition
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="isOpen && sortedValues.length > 0"
                    class="z-50 absolute mt-1 w-full overflow-auto rounded-md dark:bg-gray-900 bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"
                    :style="{
                        height: dropdownHeight || 'auto',
                        maxHeight: dropdownHeight || '15rem'
                    }"
                >
                    <ul>
                        <li
                            v-for="value in sortedValues"
                            :key="`${locale}-${getDisplayLabel(value)}`"
                            @click="selectOption(value)"
                            @keydown.enter="selectOption(value)"
                            tabindex="0"
                            class="relative cursor-default select-none py-2 ps-6 pe-4"
                            :class="{
                                'dark:bg-gray-600 bg-gray-200 dark:text-gray-100 text-black':
                                    hoveredOption === getDisplayLabel(value),
                                'dark:text-gray-100 text-black ': hoveredOption !== getDisplayLabel(value)
                            }"
                            @mouseover="hoveredOption = getDisplayLabel(value)"
                            @mouseleave="hoveredOption = null"
                            :test-id="'select-option'"
                        >
                            <span
                                class="block truncate text-start"
                                :class="{
                                    'font-medium': getDisplayLabel(model) === getDisplayLabel(value),
                                    'font-normal': getDisplayLabel(model) !== getDisplayLabel(value)
                                }"
                            >
                                {{ getDisplayLabel(value) }}
                            </span>
                            <span
                                v-if="getDisplayLabel(model) === getDisplayLabel(value)"
                                class="absolute inset-y-0 inset-s-0 flex items-center ps-2"
                                :class="{
                                    'dark:text-white text-black': hoveredOption === getDisplayLabel(value),
                                    'text-teal-600': hoveredOption !== getDisplayLabel(value)
                                }"
                            >
                                <CheckIcon class="h-3 w-3" aria-hidden="true" />
                            </span>
                        </li>
                    </ul>
                </div>
                <div
                    v-else-if="sortedValues.length === 0 && isOpen"
                    class="z-50 absolute mt-1 w-full overflow-auto rounded-md dark:bg-gray-900 bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"
                    :style="{
                        height: dropdownHeight || 'auto',
                        maxHeight: dropdownHeight || '15rem'
                    }"
                >
                    <div class="flex items-center justify-center h-full">
                        <div class="text-gray-500">{{ t('common.no_options_available') }}</div>
                    </div>
                </div>
            </transition>
        </div>
    </div>
    <SearcheableSelect
        v-else
        v-model="model"
        :values="values"
        :display="getDisplayLabel"
        :placeholder="placeholder"
        :optional="optional"
        :sortBy="sortBy"
        :maxHeight="dropdownHeight ? parseInt(dropdownHeight) : undefined"
    />
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isLocaleRtl } from '@/util/util'

const { t, locale } = useI18n()

const selectDir = computed(() => (isLocaleRtl(locale.value) ? 'rtl' : 'ltr'))

const props = defineProps<{
    values: any[]
    placeholder: string
    display: Function
    optional?: boolean
    dropdownHeight?: string
    sortBy?: string | null
}>()
const model = defineModel<any>()

import { ChevronUpDownIcon, XMarkIcon } from '@heroicons/vue/20/solid'
import { INPUT_CLASS } from './contants'
import { CheckIcon } from '@heroicons/vue/24/outline'
import SearcheableSelect from './SearcheableSelect.vue'
import { sortValuesByAttributeWithEmptyIdFirst, sortValuesByDisplayWithEmptyIdFirst } from '@/util/util'

const isOpen = ref(false)
const hoveredOption = ref(null)

const useSearch = computed(() => props.values.length > 15)

const getDisplayLabel = (value: any) => {
    void locale.value
    return props.display(value)
}

const sortedValues = computed(() => {
    void locale.value
    if (props.sortBy) {
        return sortValuesByAttributeWithEmptyIdFirst(props.values, props.sortBy)
    }
    return sortValuesByDisplayWithEmptyIdFirst(props.values, getDisplayLabel)
})

const toggleDropdown = () => {
    isOpen.value = !isOpen.value
}

const selectOption = (option: any) => {
    model.value = option
    isOpen.value = false
}

const clearSelection = (event: Event) => {
    event.stopPropagation()
    model.value = null
}

// Close dropdown when clicking outside
const clickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('#select2-dropdown')) {
        isOpen.value = false
    }
}

const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        isOpen.value = false
    }
}

// Lifecycle hooks
onMounted(() => {
    document.addEventListener('click', clickOutside)
    document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
    document.removeEventListener('click', clickOutside)
    document.removeEventListener('keydown', handleKeyDown)
})
</script>
