<template>
    <TransitionRoot appear :show="modelValue" as="template">
        <Dialog
            as="div"
            @close="modelValue = false"
            class="relative z-50"
            title=""
            :is-open="modelValue"
            @change="() => {}"
            :content="content"
            :bind-properties="bindProperties"
        >
            <TransitionChild
                as="template"
                enter="duration-300 ease-out"
                enter-from="opacity-0"
                enter-to="opacity-100"
                leave="duration-200 ease-in"
                leave-from="opacity-100"
                leave-to="opacity-0"
            >
                <div class="fixed inset-0 bg-black/25" />
            </TransitionChild>

            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center text-center">
                    <TransitionChild
                        as="template"
                        enter="duration-300 ease-out"
                        enter-from="opacity-0 scale-95"
                        enter-to="opacity-100 scale-100"
                        leave="duration-200 ease-in"
                        leave-from="opacity-100 scale-100"
                        leave-to="opacity-0 scale-95"
                    >
                        <DialogPanel
                            class="w-auto transform overflow-hidden rounded-md bg-white text-left align-middle shadow-xl transition-all"
                        >
                            <component :is="content" v-bind="bindProperties"></component>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>
<script setup lang="ts">
import { type Component, watch } from 'vue'
import { TransitionRoot, TransitionChild, Dialog, DialogPanel } from '@headlessui/vue'
defineProps<{
    content: Component
    bindProperties: { [key: string]: any }
}>()
const modelValue = defineModel<any>()
</script>
