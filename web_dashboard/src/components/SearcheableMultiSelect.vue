<template>
    <div class="w-full text-start" :dir="selectDir">
        <div class="w-full flex flex-row flex-wrap">
            <div
                class="p-1 rounded-xl dark:bg-gray-700 bg-gray-300 flex flex-row my-1 text-xs dark:text-gray-100 me-1"
                v-for="select in model"
                :key="`${locale}-${select.id}`"
            >
                {{ getDisplayLabel(select) }}
                <span
                    :test-id="`remove-${select.id}`"
                    @click="remove(select)"
                    class="cursor-pointer"
                >
                    <XMarkIcon class="w-3 ms-3" />
                </span>
            </div>
        </div>
        <div class="relative" id="searcheable-multi-select-dropdown">
            <div>
                <MagnifyingGlassIcon
                    class="w-4 h-4 absolute top-[25%] start-2 dark:text-gray-100 text-gray-600"
                />
                <input
                    type="text"
                    :placeholder="placeholder"
                    :class="`${INPUT_CLASS} ps-10 pe-4`"
                    @input="(e) => (query = (e.target as HTMLInputElement).value)"
                    @focus="isOpen = true"
                />
                <button
                    type="button"
                    class="absolute inset-y-0 end-0 flex items-center pe-2"
                    @click="toggleDropdown"
                >
                    <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </button>
            </div>
            <transition
                leave="transition ease-in duration-100"
                leave-from="opacity-100"
                leave-to="opacity-0"
                @after-leave="query = ''"
            >
                <div
                    v-if="isOpen"
                    class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md dark:bg-gray-900 bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50"
                >
                    <div
                        v-if="filteredValues.length === 0"
                        class="relative cursor-default select-none px-4 py-2 dark:text-gray-100 text-gray-900"
                    >
                    {{ $t('common.search_nothing_found') }}
                    </div>

                    <ul test-id="options-list">
                        <li
                            v-for="result in filteredValues"
                            :key="`${locale}-${result.id}`"
                            @click="handleSelect(result)"
                            @keydown.enter="handleSelect(result)"
                            tabindex="0"
                            class="hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer relative cursor-default select-none py-2 ps-10 pe-4 dark:text-gray-100 text-gray-900"
                        >
                            <span class="block truncate font-medium text-start">
                                {{ getDisplayLabel(result) }}
                            </span>
                        </li>
                    </ul>
                </div>
            </transition>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'

import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/vue/20/solid'
import { INPUT_CLASS } from './contants'
import { ChevronUpDownIcon } from '@heroicons/vue/24/outline'
import { sortValuesByDisplayWithEmptyIdFirst } from '@/util/util'
import { useI18n } from 'vue-i18n'
import { isLocaleRtl } from '@/util/util'
const { t, locale } = useI18n()

const selectDir = computed(() => (isLocaleRtl(locale.value) ? 'rtl' : 'ltr'))

const model = defineModel<any>()
const props = defineProps<{
    results: { [key: string]: any }[]
    placeholder: string
    display: Function
}>()

const query = ref('')
const isOpen = ref(false)

const toggleDropdown = () => {
    isOpen.value = !isOpen.value
}

const remove = (select: any) => {
    model.value = model.value.filter((v: any) => v !== select)
}

const handleSelect = (result: any) => {
    if (!model.value.includes(result)) {
        model.value.push(result)
    }
    isOpen.value = false
}

// Close dropdown when clicking outside
const clickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('#searcheable-multi-select-dropdown')) {
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

const getDisplayLabel = (value: any) => {
    void locale.value
    return props.display(value)
}

const sortedResults = computed(() => {
    void locale.value
    return sortValuesByDisplayWithEmptyIdFirst(props.results, getDisplayLabel)
})

const filteredValues = computed(() => {
    void locale.value
    return query.value === ''
        ? sortedResults.value.filter((v) => !model.value.includes(v))
        : sortedResults.value
              .filter((v) =>
                  getDisplayLabel(v)
                      .toLowerCase()
                      .replace(/\s+/g, '')
                      .includes(query.value.toLowerCase().replace(/\s+/g, ''))
              )
              .filter((v) => !model.value.includes(v))
})
</script>
