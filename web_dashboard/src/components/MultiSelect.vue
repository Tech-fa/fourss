<template>
    <div class="w-full text-start" :dir="selectDir">
        <div class="w-full flex flex-row flex-wrap">
            <div
                class="p-1 rounded-xl dark:bg-gray-700 bg-gray-300 flex flex-row my-1 text-xs dark:text-gray-100 me-1"
                v-for="select in model"
                :key="select.id ?? display(select)"
            >
                {{ display(select) }}
                <XMarkIcon class="w-3 ms-3 shrink-0 cursor-pointer" @click="remove(select)" />
            </div>
        </div>
        <div class="relative" id="multi-select-dropdown">
            <div>
                <button
                    type="button"
                    :class="`${INPUT_CLASS} text-start ps-4 pe-10`"
                    @click="toggleDropdown"
                >
                    <span class="block truncate text-neutral-500 font-normal">{{ placeholder }}</span>
                    <span class="absolute inset-y-0 end-0 flex items-center pe-2 pointer-events-none">
                        <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                </button>
            </div>
            <transition
                leave="transition ease-in duration-100"
                leave-from="opacity-100"
                leave-to="opacity-0"
            >
                <div
                    v-if="isOpen"
                    class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md dark:bg-gray-900 bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50"
                >
                    <div
                        v-if="filteredValues.length === 0"
                        class="relative cursor-default select-none px-4 py-2 dark:text-gray-100 text-gray-900 text-start"
                    >
                        {{ $t('common.search_nothing_found') }}
                    </div>

                    <ul>
                        <li
                            v-for="result in filteredValues"
                            :key="result.id"
                            @click="handleSelect(result)"
                            @keydown.enter="handleSelect(result)"
                            tabindex="0"
                            class="hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer relative select-none py-2 ps-4 pe-4 dark:text-gray-100 text-gray-900"
                        >
                            <span class="block truncate font-medium text-start">
                                {{ display(result) }}
                            </span>
                        </li>
                    </ul>
                </div>
            </transition>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/20/solid'
import { INPUT_CLASS } from './contants'
import { ChevronUpDownIcon } from '@heroicons/vue/24/outline'
import { useI18n } from 'vue-i18n'
import { isLocaleRtl } from '@/util/util'

const { locale } = useI18n()

const selectDir = computed(() => (isLocaleRtl(locale.value) ? 'rtl' : 'ltr'))

const model = defineModel<any>()
const props = defineProps<{
    results: { [key: string]: any }[]
    placeholder: string
    display: Function
}>()

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

const clickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('#multi-select-dropdown')) {
        isOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', clickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', clickOutside)
})

const filteredValues = computed(() =>
    props.results.filter(
        (v) => !model.value.map((m: any) => props.display(m)).includes(props.display(v))
    )
)
</script>
