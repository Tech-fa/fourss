<template>
    <!-- Global notification live region, render this permanently at the end of the document -->
    <div
        aria-live="assertive"
        class="pointer-events-none fixed inset-0 flex px-4 py-6 items-start sm:p-6 z-50"
    >
        <div class="flex w-full flex-col space-y-4 items-end">
            <!-- Notification panel, dynamically insert this into the live region when it needs to be displayed -->
            <transition
                enter-active-class="transform ease-out duration-300 transition"
                enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
                enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
                leave-active-class="transition ease-in duration-100"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="model"
                    :class="[
                        'relative pointer-events-auto  text-white xl:w-[700px] lg:w-[600px] md:w-[500px] w-[250px]   overflow-hidden rounded-lg  shadow-lg ring-1 ring-black ring-opacity-5 z-big',
                        status === 'success'
                            ? 'bg-green-600'
                            : status === 'error'
                              ? 'bg-red-600'
                              : 'bg-blue-600'
                    ]"
                    :test-id="testId || `toast-${status}`"
                >
                    <div class="p-4">
                        <div class="flex items-start gap-3">
                            <div class="shrink-0">
                                <CheckCircleIcon
                                    class="h-6 w-6"
                                    aria-hidden="true"
                                    v-if="status === 'success'"
                                />
                                <ExclamationCircleIcon
                                    class="h-6 w-6 text-white"
                                    aria-hidden="true"
                                    v-else
                                />
                            </div>
                            <div class="min-w-0 flex-1 pt-0.5">
                                <p class="text-sm font-medium">{{ title }}</p>
                                <p class="mt-1 text-sm">
                                    {{ message }}
                                </p>
                            </div>
                            <button
                                type="button"
                                @click="model = false"
                                class="inline-flex shrink-0 rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                <span class="sr-only">Close</span>
                                <XMarkIcon class="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            </transition>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { CheckCircleIcon } from '@heroicons/vue/24/outline'
import { XMarkIcon } from '@heroicons/vue/20/solid'
import { ExclamationCircleIcon } from '@heroicons/vue/24/solid'
const props = defineProps<{
    title: string
    message?: string
    status: 'success' | 'error' | 'info'
    timeOut?: number
    testId?: string
}>()
const model = defineModel<any>()
const timeOut = ref(false)
watch(model, () => {
    if (model.value && !timeOut.value) {
        timeOut.value = true
        setTimeout(() => {
            model.value = false
            timeOut.value = false
        }, props.timeOut || 5000)
    }
})
</script>
