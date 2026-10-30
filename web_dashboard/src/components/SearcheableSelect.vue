<template>
    <div class="w-full text-start" :dir="selectDir">
        <div class="relative" id="searcheable-select-dropdown">
            <input
                type="text"
                :class="`${INPUT_CLASS} ps-2 pe-10 shadow-[0_0_10px_0_rgba(0,0,0,0.1)] ring-0`"
                :placeholder="placeholder"
                :value="model ? getDisplayLabel(model) : ''"
                @input="(e) => query = (e.target as HTMLInputElement).value"
                @focus="isOpen = true"
            />
            <button
                type="button"
                class="absolute inset-y-0 inset-e-0 flex items-center pe-2"
                @click="isOpen = !isOpen"
            >
                <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
            </button>

            <transition
                leave="transition ease-in duration-100"
                leave-from="opacity-100"
                leave-to="opacity-0"
                @after-leave="query = ''"
            >
                <div
                    v-if="isOpen"
                    :class="[
                        'z-50 absolute mt-1 w-full overflow-auto rounded-md dark:bg-gray-900 bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm',
                        props.maxHeight
                            ? `max-h-${props.maxHeight} overflow-y-auto`
                            : 'max-h-60'
                    ]"
                    :style="{
                        height: dropdownHeight || 'auto',
                        maxHeight: dropdownHeight || '15rem'
                    }"
                >
                    <div
                        v-if="filteredValues.length === 0"
                        class="relative cursor-default select-none px-4 py-2 dark:text-gray-100 text-gray-900"
                    >
                        {{ $t('common.search_nothing_found') }}
                    </div>

                    <ul>
                        <li
                            v-for="value in filteredValues"
                            :key="`${locale}-${getDisplayLabel(value)}`"
                            @click="selectOption(value)"
                            @keydown.enter="selectOption(value)"
                            @mouseover="hoveredOption = value.id"
                            @mouseleave="hoveredOption = null"
                            tabindex="0"
                            class="relative cursor-default select-none py-2 ps-6 pe-4"
                            :class="{
                                'dark:bg-gray-600 bg-gray-200 dark:text-gray-100 text-black':
                                    hoveredOption === value.id,
                                'dark:text-gray-100 text-black': hoveredOption !== value.id
                            }"
                            test-id="searcheable-select-option"
                        >
                            <span
                                class="block truncate text-start"
                                :class="{
                                    'font-medium': model?.id === value.id,
                                    'font-normal': model?.id !== value.id
                                }"
                            >
                                {{ getDisplayLabel(value) }}
                            </span>
                            <span
                                v-if="model?.id === value.id"
                                class="absolute inset-y-0 inset-s-0 flex items-center ps-2"
                                :class="{
                                    'dark:text-white text-black': hoveredOption === value.id,
                                    'text-teal-600': hoveredOption !== value.id
                                }"
                            >
                                <CheckIcon class="h-3 w-3" aria-hidden="true" />
                            </span>
                        </li>
                    </ul>
                </div>
            </transition>
        </div>
    </div>
</template>
<script setup lang="ts">
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/20/solid'
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { INPUT_CLASS } from './contants'
import { sortValuesByAttributeWithEmptyIdFirst, sortValuesByDisplayWithEmptyIdFirst } from '@/util/util'
import { useI18n } from 'vue-i18n'
import { isLocaleRtl } from '@/util/util'
const { t, locale } = useI18n()

const selectDir = computed(() => (isLocaleRtl(locale.value) ? 'rtl' : 'ltr'))

const model = defineModel<any>()
const props = defineProps<{
    values: any[]
    placeholder?: string
    display: Function
    addedAction?: Function
    maxHeight?: number
    dropdownHeight?: number
    sortBy?: string | null
}>()

watch(model, () => {
    if (props.addedAction) {
        props.addedAction()
    }
})

const query = ref('')
const isOpen = ref(false)
const hoveredOption = ref<string | number | null>(null)

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

const selectOption = (value: any) => {
    model.value = value
    isOpen.value = false
    if (props.addedAction) {
        props.addedAction()
    }
}

// Close dropdown when clicking outside
const clickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('#searcheable-select-dropdown')) {
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

const filteredValues = computed(() => {
    void locale.value
    return query.value === ''
        ? sortedValues.value
        : sortedValues.value.filter((v) =>
              getDisplayLabel(v)
                  .toLowerCase()
                  .replace(/\s+/g, '')
                  .includes(query.value.toLowerCase().replace(/\s+/g, ''))
          )
})
</script>
