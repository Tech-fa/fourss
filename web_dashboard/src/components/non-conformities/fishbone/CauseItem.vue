<template>
    <div class="space-y-2">
        <div class="flex items-start gap-2 group" :test-id="`rca-fishbone-cause-item-${categoryIndex}-${causeIndex}`">
            <div class="w-1.5 h-1.5 bg-neutral-400 rounded-full mt-2 flex-shrink-0"></div>
            <span class="text-sm text-neutral-700 leading-relaxed" :test-id="`rca-fishbone-cause-text-${categoryIndex}-${causeIndex}`">{{ cause.text }}</span>
            <div class="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    class="text-blue-600 hover:text-blue-800 text-xs"
                    title="Add sub-cause"
                    @click="openAddChildDialog"
                    :test-id="`rca-fishbone-add-subcause-button-${categoryIndex}-${causeIndex}`"
                >
                    <i class="fas fa-plus"></i>
                </button>
                <button
                    class="text-red-500 hover:text-red-700 text-xs"
                    title="Remove cause"
                    @click="emitRemove"
                    :test-id="`rca-fishbone-remove-cause-button-${categoryIndex}-${causeIndex}`"
                >
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>

        <div v-if="cause.children && cause.children.length" class="pl-4 border-l border-neutral-200 ml-2">
            <CauseItem
                v-for="(child, idx) in cause.children"
                :key="`child-${idx}`"
                :cause="child"
                :category-index="categoryIndex"
                :cause-index="idx"
                :category-name="categoryName"
                :path="[...nodePath, idx]"
                @remove="$emit('remove', $event)"
                @add-child="$emit('add-child', $event)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDialog } from '@/stores/dialog'
import AddCauseModal from '../AddCauseModal.vue'
import type { FishboneCauseDto } from '@/util/interfaces'

const props = defineProps<{
    cause: FishboneCauseDto
    categoryIndex: number
    causeIndex: number
    categoryName: string
    path?: number[]
}>()

const emit = defineEmits<{
    (e: 'remove', payload: { categoryIndex: number; path: number[] }): void
    (e: 'add-child', payload: { categoryIndex: number; path: number[]; text: string }): void
}>()

const dialog = useDialog()

const nodePath = computed<number[]>(() => (props.path && props.path.length ? props.path : [props.causeIndex]))

function emitRemove() {
    emit('remove', { categoryIndex: props.categoryIndex, path: nodePath.value })
}

function openAddChildDialog() {
    dialog.openDialog(AddCauseModal, {
        categoryName: `${props.categoryName} (sub-cause)`,
        onConfirm: (text: string) => {
            emit('add-child', { categoryIndex: props.categoryIndex, path: nodePath.value, text })
            dialog.closeDialog()
        },
        onCancel: () => dialog.closeDialog(),
    })
}
</script>


