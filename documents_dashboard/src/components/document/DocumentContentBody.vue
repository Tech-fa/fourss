<template>
    <div v-if="renderedPageImages.length" class="view-doc-rendered-pages">
        <img
            v-for="(pageImage, index) in renderedPageImages"
            :key="`${renderKey}-${index}`"
            :src="pageImage"
            class="view-doc-rendered-page"
            :alt="`Document page ${index + 1}`"
        />
    </div>
    <div v-else class="flex justify-center py-12">
        <Spinner width="5" />
    </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { renderDocumentContentPreviewImages } from '@/util/pdf-export'
import Spinner from '../Spinner.vue'

const props = defineProps<{
    content: string | null
}>()

const renderedPageImages = ref<string[]>([])
const renderKey = ref(0)
let renderRequestId = 0

async function renderPreviewImages() {
    const requestId = ++renderRequestId
    renderedPageImages.value = []

    const trimmed = props.content?.trim()
    if (!trimmed) return

    try {
        const images = await renderDocumentContentPreviewImages(trimmed)
        if (requestId !== renderRequestId) return
        renderedPageImages.value = images
        renderKey.value += 1
    } catch (err) {
        console.error(err)
        if (requestId === renderRequestId) {
            renderedPageImages.value = []
        }
    }
}

onBeforeUnmount(() => {
    renderRequestId++
})

watch(
    () => props.content,
    () => {
        nextTick(() => renderPreviewImages())
    },
    { immediate: true },
)
</script>

<style scoped>
.view-doc-rendered-pages {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    gap: 16px;
    margin-bottom: 10px;
    margin-top: 10px;
    padding: 10px;
}

.view-doc-rendered-page {
    width: 794px;
    max-width: 100%;
    min-height: 1123px;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
</style>
