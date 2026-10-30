<template>
    <header id="header" class="border-b bg-primary h-16">
        <div class="px-4 xl:pe-8 ps-12 pe-2 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <nav aria-label="Breadcrumb" class="flex items-center space-x-4">
                    <ol role="list" class="flex items-center ">
                        <template v-for="(crumb, index) in crumbs" :key="index">
                            <li v-if="crumbs.length === 1" :test-id="crumb['test-id']">
                                <div class="flex items-center">
                                    <span class="ms-4 text-sm font-medium text-opposite flex items-center gap-2">
                                        <i :class="crumb.icon" class="text-opposite text-lg"></i>
                                        <h1 class="md:text-lg text-sm">{{ crumb.name }}</h1>
                                    </span>
                                </div>
                            </li>
                            <li v-else-if="index < crumbs.length - 1" :test-id="crumb['test-id']">
                                <div class="flex items-center">
                                    <span @click="router.push(crumb.path)"
                                        class="ms-4 text-sm font-medium text-opposite hover:text-opposite flex items-center gap-2 cursor-pointer">
                                        <i :class="crumb.icon" class="text-opposite text-lg"></i>
                                        <h1 class="md:text-lg text-sm">{{ crumb.name }}</h1>
                                    </span>
                                    <ChevronRightIcon class="h-5 w-5 flex-shrink-0 text-opposite ms-4 rtl:rotate-180"
                                        aria-hidden="true" />
                                </div>
                            </li>

                            <li v-else :test-id="crumb['test-id']">
                                <div class="flex items-center">
                                    <span class="ms-4 text-sm font-medium text-opposite  flex items-center gap-2 ">
                                        <span v-if="crumb.icon" class="flex items-center">
                                            <i :class="crumb.icon" class="text-opposite text-lg"></i>
                                        </span>
                                        <h1 class="md:text-lg text-sm">{{ crumb.name }}</h1>
                                    </span>
                                </div>
                            </li>
                        </template>
                    </ol>
                </nav>
            </div>
            <slot></slot>
        </div>
    </header>
</template>
<script setup>
import { useRouter } from 'vue-router'
import { ChevronRightIcon } from '@heroicons/vue/24/outline'
const router = useRouter()

const props = defineProps({
    crumbs: {
        type: Array,
        required: true
    }
})
</script>
