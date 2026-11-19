<template>
    <div class="relative w-full text-start" :dir="selectDir" id="searcheable-api-select2-dropdown">
        <div>
            <MagnifyingGlassIcon
                class="w-4 h-4 absolute top-2.5 start-1.5 dark:text-white text-black"
            />
            <input
                type="text"
                :placeholder="placeholder"
                :value="model ? getDisplayLabel(model) : query.trim() || undefined"
                :class="`${INPUT_CLASS} ps-10 text-black`"
                @input="(e) => updateQuery((e.target as HTMLInputElement).value)"
                @blur="query = ''"
                @focus="isOpen = true"
            />
            <button
                type="button"
                class="absolute inset-y-0 end-0 flex items-center rounded-e-md px-2 focus:outline-none"
                @click="toggleDropdown"
            >
                <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
            </button>
        </div>

        <div
            v-if="isOpen"
            class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md dark:bg-gray-800 bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50"
        >
            <div
                v-if="results.length === 0"
                class="relative cursor-default select-none px-4 py-2 dark:text-gray-100 text-gray-700"
            >
                {{ $t('common.search_nothing_found') }}
            </div>

            <ul>
                <li
                    v-for="result in sortedResults"
                    :key="`${locale}-${result.id}`"
                    @click="selectOption(result)"
                    @keydown.enter="selectOption(result)"
                    tabindex="0"
                    class="relative cursor-default select-none py-2 ps-6 pe-4"
                    :test-id="'searcheable-api-select-option'"
                    :class="{
                        'dark:bg-gray-600 bg-gray-200 dark:text-gray-100 text-black': 
                            hoveredOption === result.id,
                        'dark:text-gray-100 text-black': hoveredOption !== result.id
                    }"
                    @mouseover="hoveredOption = result.id"
                    @mouseleave="hoveredOption = null"
                >
                    <span
                        class="block truncate text-start"
                        :class="{
                            'font-medium': model?.id === result.id,
                            'font-normal': model?.id !== result.id
                        }"
                    >
                        {{ getDisplayLabel(result) }}
                    </span>
                    <span
                        v-if="model?.id === result.id"
                        class="absolute inset-y-0 start-0 flex items-center ps-2"
                        :class="{
                            'dark:text-white text-black': hoveredOption === result.id,
                            'text-teal-600': hoveredOption !== result.id
                        }"
                    >
                        <CheckIcon class="h-3 w-3" aria-hidden="true" />
                    </span>
                </li>
            </ul>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
    results: { [key: string]: any }[]
    placeholder: string
    display: Function
    changeQuery: Function
    extraAction?: Function
    externalSelect?: boolean
}>()

import { MagnifyingGlassIcon, CheckIcon } from '@heroicons/vue/20/solid'
import { ChevronUpDownIcon } from '@heroicons/vue/24/outline'
import { INPUT_CLASS } from './contants'
import { sortValuesByDisplayWithEmptyIdFirst } from '@/util/util'
import { useI18n } from 'vue-i18n'
import { isLocaleRtl } from '@/util/util'
const { t, locale } = useI18n()

const selectDir = computed(() => (isLocaleRtl(locale.value) ? 'rtl' : 'ltr'))

const query = ref('')
const isOpen = ref(false)
const hoveredOption = ref<string | number | null>(null)
const model = defineModel<any>()

const updateQuery = (value: string) => {
    query.value = value
}

const getDisplayLabel = (value: any) => {
    void locale.value
    return props.display(value)
}

const sortedResults = computed(() => {
    void locale.value
    return sortValuesByDisplayWithEmptyIdFirst(props.results, getDisplayLabel)
})

const toggleDropdown = () => {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
        query.value = ' ' // Trigger value change to load results
    }
}

const selectOption = (result: any) => {
    if (props.externalSelect) {
        props.extraAction?.(result)
        isOpen.value = false
        return
    }
    model.value = result
    isOpen.value = false
    query.value = ''
    props.extraAction?.(result)
}

// Close dropdown when clicking outside
const clickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('#searcheable-api-select2-dropdown')) {
        isOpen.value = false
    }
}

// Lifecycle hooks
onMounted(() => {
    document.addEventListener('click', clickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', clickOutside)
})

watch(query, () => props.changeQuery(query.value))
</script>
