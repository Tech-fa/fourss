<template>
    <g>
      <!-- Main branch line (skewed) -->
      <line
        :x1="x"
        :y1="y"
        :x2="branchX"
        :y2="branchY"
        stroke="#111827"
        stroke-width="2"
      />

      <!-- Label for the main branch -->
      <text
        :x="branchX + 6"
        :y="direction === 'up' ? branchY - 6 : branchY + 14"
        font-size="12"
        font-weight="bold"
        fill="#111827"
      >
        {{ label }}
      </text>

      <!-- Causes along the branch -->
      <g v-for="(cause, i) in causes" :key="i">
        <line
          :x1="attachX(i)"
          :y1="attachY(i)"
          :x2="childX(i)"
          :y2="childY(i)"
          stroke="#111827"
          stroke-width="2"
        />
        <text
          :x="childX(i) + 5"
          :y="direction === 'up' ? childY(i) - 4 : childY(i) + 12"
          font-size="12"
          fill="#111827"
        >
          {{ cause.text }}
        </text>

        <!-- Recursively render children from the end of the small bone -->
        <FBDiagram
          v-if="cause.children && cause.children.length"
          :x="childX(i)"
          :y="childY(i)"
          :direction="direction"
          :label="''"
          :causes="cause.children"
          :level="level + 1"
        />
      </g>
    </g>
  </template>
  
  <script setup>
  import { computed } from "vue"
  defineOptions({ name: 'FBDiagram' })
  
  const props = defineProps({
    x: Number,
    y: Number,
    direction: { type: String, default: "up" }, // 'up' or 'down'
    label: String,
    causes: { type: Array, default: () => [] },
    level: { type: Number, default: 0 }
  })
  
  // End point of the main branch: grow with number of direct causes so spacing stays constant
  const SEGMENT_SPACING = 40
  const BASE_MAIN = 80
  const MAX_MAIN = 520
  const ANGLE_RATIO = 0.6 // dy/dx keeps a constant skew angle

  const mainLength = computed(() => {
    const n = props.causes?.length || 0
    return Math.min(MAX_MAIN, BASE_MAIN + n * SEGMENT_SPACING)
  })

  const dx = computed(() => mainLength.value / Math.sqrt(1 + ANGLE_RATIO * ANGLE_RATIO))
  const dy = computed(() => (props.direction === 'up' ? -1 : 1) * ANGLE_RATIO * dx.value)

  const branchX = computed(() => props.x - dx.value)
  const branchY = computed(() => props.y + dy.value)
  const branchLen = computed(() => mainLength.value)

  // Place causes with constant absolute spacing along the branch
  const tAt = (i) => {
    const d = (i + 1) * SEGMENT_SPACING
    const L = branchLen.value || 1
    return Math.min(d / L, 0.98)
  }
  const attachX = (i) => props.x - dx.value * tAt(i)
  const attachY = (i) => props.y + dy.value * tAt(i)

  // Child bone endpoint projects outward roughly perpendicular
  // Make child bones horizontal (parallel to X axis)
  const childX = (i) => attachX(i) - 50
  const childY = (i) => attachY(i)
  </script>
  