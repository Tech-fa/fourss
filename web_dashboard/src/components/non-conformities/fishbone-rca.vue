<template>
    <main id="main-content" class="w-full bg-neutral-50 space-y-6 p-4">
        <!-- Fishbone Diagram -->

        <!-- Effect at Bottom -->

        <!-- Root Cause Analysis Summary -->
        <div class="w-full mx-auto max-w-6xl">
            <div class="bg-white rounded-lg border border-neutral-200 p-6">
                <h3 class="text-lg font-semibold text-neutral-900 mb-6">
                    {{ t('nc.fishbone.title') }}
                </h3>

                <!-- Problem Statement removed from Fishbone create/update -->

                <div class="w-full mx-auto max-w-6xl mb-6" test-id="rca-fishbone-effect-field">
                    <label for="effect" class="block text-sm font-medium text-neutral-700 mb-2" test-id="rca-fishbone-effect-label"
                        >{{ t('nc.fishbone.effectLabel') }} <span class="text-red-700">*</span></label
                    >
                    <AppTextarea
                        name="effect"
                        :label="t('nc.fishbone.effectLabel')"
                        :placeholder="t('nc.fishbone.effectPlaceholder')"
                        v-model:model="effect"
                        test-id="rca-fishbone-effect-textarea"
                    />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" test-id="rca-fishbone-categories-grid">
                    <div
                        v-for="(category, index) in categories"
                        :key="category.name"
                        class="space-y-3"
                        :test-id="`rca-fishbone-category-${index}`"
                    >
                        <div class="flex items-center space-x-2" test-id="rca-fishbone-category-header">
                            <div class="w-3 h-3 bg-blue-600 rounded-full" :test-id="`rca-fishbone-category-dot-${index}`"></div>
                            <h4 class="font-medium text-neutral-900" :test-id="`rca-fishbone-category-name-${index}`">{{ fishboneCategoryLabel(category.name) }}</h4>
                            <span
                                class="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full"
                                :test-id="`rca-fishbone-category-count-${index}`"
                            >
                                {{ category.causes.length }}
                                {{ category.causes.length === 1 ? t('nc.fishbone.causeSingular') : t('nc.fishbone.causePlural') }}
                            </span>
                        </div>

                        <div v-if="category.causes.length > 0" class="space-y-2" :test-id="`rca-fishbone-category-causes-${index}`">
                            <CauseItem
                                v-for="(cause, causeIndex) in category.causes"
                                :key="`cause-${index}-${causeIndex}`"
                                :cause="cause"
                                :category-index="index"
                                :cause-index="causeIndex"
                                :category-name="categories[index].name"
                                @remove="removeCause"
                                @add-child="addSubCause"
                            />
                        </div>

                        <div v-else class="text-sm text-neutral-400 italic pl-5" :test-id="`rca-fishbone-category-empty-${index}`">
                            {{ t('nc.fishbone.noCausesYet') }}
                        </div>

                        <button
                            @click="showDialog(index)"
                            class="text-sm text-blue-600 hover:text-blue-800 font-medium pl-5 flex items-center space-x-1"
                            :test-id="`rca-fishbone-add-cause-button-${index}`"
                        >
                            <i class="fas fa-plus text-xs"></i>
                            <span>{{ t('nc.fishbone.addCause') }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- <div
            id="diagram-canvas"
            class="relative bg-neutral-50 h-[600px] overflow-auto w-full max-w-6xl mx-auto border border-neutral-200 rounded-lg"
            style="touch-action: none;"
        >
            <svg
                class="absolute inset-0 w-full h-full"
                viewBox="0 0 1000 600"
                :class="isPanning ? 'cursor-grabbing' : 'cursor-grab'"
                @mousedown="onPanStart"
                @mousemove="onPanMove"
                @mouseup="onPanEnd"
                @mouseleave="onPanEnd"
                @wheel.prevent="onWheel"
            >
                <g :transform="`translate(${pan.x}, ${pan.y}) scale(${scale})`"> -->
                <!-- Main spine -->
                <!-- <line x1="50" y1="300" x2="650" y2="300" stroke="#374151" stroke-width="3"></line> -->

                <!-- Problem Statement Box at end of fishbone -->
                <!-- <g id="problem-statement-box"> -->
                    <!-- Background rectangle -->
                    <!-- <rect
                        x="670"
                        y="250"
                        width="280"
                        height="100"
                        fill="white"
                        stroke="#374151"
                        stroke-width="2"
                        rx="8"
                        ry="8"
                    ></rect> -->

                    <!-- Arrow pointing to the box -->
                    <!-- <polygon points="650,300 670,290 670,310" fill="#374151"></polygon> -->

                    <!-- Problem Statement Text -->
                    <!-- <foreignObject x="680" y="260" width="260" height="80">
                        <div class="p-2 text-sm text-neutral-800 leading-tight">
                            <div class="font-semibold text-blue-700 mb-1">Problem Statement:</div>
                            <div class="text-xs">
                                {{
                                    problemStatement.length > 120
                                        ? problemStatement.substring(0, 120) + '...'
                                        : problemStatement
                                }}
                            </div>
                        </div>
                    </foreignObject>
                </g> -->

                <!-- Fishbone branches using FBDiagram component -->
                <!-- <FBDiagram :x="150" :y="300" direction="up" :label="categories[0].name" :causes="categories[0].causes" />
                <FBDiagram :x="300" :y="300" direction="up" :label="categories[1].name" :causes="categories[1].causes" />
                <FBDiagram :x="450" :y="300" direction="up" :label="categories[2].name" :causes="categories[2].causes" />
                <FBDiagram :x="150" :y="300" direction="down" :label="categories[3].name" :causes="categories[3].causes" />
                <FBDiagram :x="300" :y="300" direction="down" :label="categories[4].name" :causes="categories[4].causes" />
                <FBDiagram :x="450" :y="300" direction="down" :label="categories[5].name" :causes="categories[5].causes" />
                </g>
            </svg>
        </div> -->
        <div class="flex justify-end max-w-6xl mx-auto" test-id="rca-fishbone-actions">
            <AppButton
                buttonStyle="primary"
                @click="saveFishbone"
                :loading="isLoading"
                :disabled="isLoading"
                test-id="rca-fishbone-save-button"
            >
                {{ localFishboneId ? t('nc.fishbone.updateFishbone') : t('nc.fishbone.saveFishbone') }}
            </AppButton>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDialog } from '@/stores/dialog'
import AddCauseModal from './AddCauseModal.vue'
import AppTextarea from '../AppTextarea.vue'
import AppButton from '../AppButton.vue'
import type { FishboneCategoryDto, FishboneResponseDTO, FishboneCauseDto } from '@/util/interfaces'
import { createFishbone, updateFishbone, getRcaCeCategories, NON_CONFORMITY_ERROR_I18N_PREFIX } from './endpoints'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/notification'
import { formatApiErrorMessage } from '@/util/util'

// Dialog service
const dialog = useDialog()
const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const FISHBONE_CATEGORY_I18N: Record<string, string> = {
    Manpower: 'nc.fishbone.categories.manpower',
    Method: 'nc.fishbone.categories.method',
    Machine: 'nc.fishbone.categories.machine',
    Material: 'nc.fishbone.categories.material',
    Measurement: 'nc.fishbone.categories.measurement',
    Environment: 'nc.fishbone.categories.environment'
}

function fishboneCategoryLabel(name: string) {
    const key = FISHBONE_CATEGORY_I18N[name]
    return key ? t(key) : name
}

const props = defineProps<{
    fishbone?: FishboneResponseDTO
    ncId: string
    onSave: Function
}>()

// Local state tracking for fishbone ID
const localFishboneId = ref(props.fishbone?.id)

// Problem statement is removed from Fishbone create/update UI and payload
const effect = ref(props.fishbone?.effectStatement || '')

// Categories with dynamic causes - properly typed
const categories = ref<FishboneCategoryDto[]>(props.fishbone?.categories || [
    { name: 'Manpower', causes: [] },
    { name: 'Method', causes: [] },
    { name: 'Machine', causes: [] },
    { name: 'Material', causes: [] },
    { name: 'Measurement', causes: [] },
    { name: 'Environment', causes: [] }
])

onMounted(async () => {
    try {
        const resp = await getRcaCeCategories(props.ncId, authStore)
        const data = (resp || []) as Array<{ name: string; causes: FishboneCauseDto[] }>
        if (Array.isArray(data) && data.length) {
            const byName: Record<string, FishboneCauseDto[]> = {}
            for (const c of data) byName[c.name] = c.causes || []
            categories.value = categories.value.map((c) => ({
                name: c.name,
                causes: byName[c.name] || []
            }))
        }
    } catch (e) {
        // Ignore fetch errors; fallback to defaults
    }
})

const isLoading = ref(false)

// Simple pan state for SVG group
const pan = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const isPanning = ref(false)
let startPoint: { x: number; y: number } | null = null
let startPan: { x: number; y: number } | null = null

// Zoom state
const scale = ref(1)
const MIN_SCALE = 0.5
const MAX_SCALE = 2.5
const SCALE_STEP = 0.1

function getMousePosition(evt: MouseEvent): { x: number; y: number } {
    const svg = (evt.currentTarget as SVGSVGElement)
    const rect = svg.getBoundingClientRect()
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top }
}

function onPanStart(evt: MouseEvent) {
    isPanning.value = true
    startPoint = getMousePosition(evt)
    startPan = { ...pan.value }
}
function onPanMove(evt: MouseEvent) {
    if (!isPanning.value || !startPoint || !startPan) return
    const p = getMousePosition(evt)
    pan.value = { x: startPan.x + (p.x - startPoint.x), y: startPan.y + (p.y - startPoint.y) }
}
function onPanEnd() {
    isPanning.value = false
    startPoint = null
    startPan = null
}

function onWheel(evt: WheelEvent) {
    const delta = Math.sign(evt.deltaY)
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale.value - delta * SCALE_STEP))

    // Zoom towards cursor: adjust pan so the point under the cursor stays put
    const svg = evt.currentTarget as SVGSVGElement
    const rect = svg.getBoundingClientRect()
    const cursor = { x: evt.clientX - rect.left, y: evt.clientY - rect.top }

    const prevScale = scale.value
    if (newScale !== prevScale) {
        const k = newScale / prevScale
        pan.value = {
            x: cursor.x - k * (cursor.x - pan.value.x),
            y: cursor.y - k * (cursor.y - pan.value.y)
        }
        scale.value = newScale
    }
}

// Show dialog method using dialog service
function showDialog(categoryIndex: number) {
    const categoryName = categories.value[categoryIndex].name

    dialog.openDialog(AddCauseModal, {
        categoryName: fishboneCategoryLabel(categoryName),
        onConfirm: (cause: string) => {
            addCause(categoryIndex, cause)
            dialog.closeDialog()
        },
        onCancel: () => {
            dialog.closeDialog()
        }
    })
}
const saveFishbone = async () => {
    try {
        isLoading.value = true
        if (!effect.value) {
            toast.showToast(t('common.error'), t('nc.fishbone.effectRequired'), 'error')
            isLoading.value = false
            return
        }
        
        // Check if at least one category has at least one cause
        const hasAtLeastOneCause = categories.value.some(
            (category) => category.causes && category.causes.length > 0
        )
        
        if (!hasAtLeastOneCause) {
            toast.showToast(t('common.error'), t('nc.fishbone.causeRequired'), 'error')
            isLoading.value = false
            return
        }

        const fishboneData = {
            effectStatement: effect.value,
            categories: categories.value
        }

        let response
        // Check if fishbone already exists using local state
        if (localFishboneId.value) {
            response = await updateFishbone(localFishboneId.value, fishboneData, authStore)
            toast.showToast(t('common.success'), t('nc.fishbone.updateSuccess'), 'success')
        } else {
            // Create new fishbone
            response = await createFishbone(props.ncId, fishboneData, authStore)
            toast.showToast(t('common.success'), t('nc.fishbone.createSuccess'), 'success')
            if (response) {
                localFishboneId.value = (response as FishboneResponseDTO).id
            }
        }
        props.onSave()
    } catch (error: any) {
        console.error('Error saving fishbone:', error)
        toast.showToast(
            t('common.error'),
            formatApiErrorMessage(error?.response?.data, t, NON_CONFORMITY_ERROR_I18N_PREFIX) ||
                error.message ||
                t('nc.fishbone.saveError'),
            'error'
        )
    } finally {
        isLoading.value = false
    }
}

// Add cause function (root cause within a category)
function addCause(categoryIndex: number, cause: string) {
    const text = cause.trim()
    if (text) {
        const newCause: FishboneCauseDto = { text }
        categories.value[categoryIndex].causes.push(newCause)
    }
}

// Remove cause function (handles root-level only from this view)
function removeCause(payload: { categoryIndex: number; path: number[] }) {
    const { categoryIndex, path } = payload
    if (path.length === 1) {
        categories.value[categoryIndex].causes.splice(path[0], 1)
        return
    }
    // Remove nested cause
    const parentPath = path.slice(0, -1)
    const removeIndex = path[path.length - 1]
    const parent = findCauseByPath(categories.value[categoryIndex].causes, parentPath)
    if (parent && parent.children) parent.children.splice(removeIndex, 1)
}

function addSubCause(payload: { categoryIndex: number; path: number[]; text: string }) {
    const { categoryIndex, path, text } = payload
    const trimmed = text.trim()
    if (!trimmed) return
    const parent = path.length === 0
        ? null
        : findCauseByPath(categories.value[categoryIndex].causes, path)
    if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push({ text: trimmed })
    } else {
        categories.value[categoryIndex].causes.push({ text: trimmed })
    }
}

function findCauseByPath(list: FishboneCauseDto[], path: number[]): FishboneCauseDto | null {
    let node: FishboneCauseDto | null = null
    let currentList: FishboneCauseDto[] = list
    for (let i = 0; i < path.length; i++) {
        const idx = path[i]
        node = currentList[idx]
        if (!node) return null
        currentList = node.children || (node.children = [])
    }
    return node
}
import CauseItem from './fishbone/CauseItem.vue'
import FBDiagram from './fishbone/FBDiagram.vue'
</script>
