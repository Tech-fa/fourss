<template>
  <Teleport to="body">
    <div class="sd-diagram-backdrop" role="presentation" @keydown="onKeydown">
      <div
        ref="dialogRef"
        class="sd-diagram-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sd-diagram-title"
        tabindex="-1"
        test-id="document-diagram-dialog"
      >
        <header class="sd-diagram-header">
          <h2 id="sd-diagram-title" class="sd-diagram-title">
            {{ editing ? t('document.form.diagram_edit_title') : t('document.form.diagram_title') }}
          </h2>
          <button
            type="button"
            class="sd-diagram-icon-btn"
            :aria-label="t('document.form.diagram_close')"
            test-id="document-diagram-close"
            @click="emit('close')"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div class="sd-diagram-kinds" role="tablist">
          <button
            type="button"
            role="tab"
            class="sd-diagram-kind"
            :class="{ 'sd-diagram-kind-active': diagram.kind === 'org' }"
            :aria-selected="diagram.kind === 'org'"
            test-id="document-diagram-org"
            @click="setKind('org')"
          >
            {{ t('document.form.diagram_org') }}
          </button>
          <button
            type="button"
            role="tab"
            class="sd-diagram-kind"
            :class="{ 'sd-diagram-kind-active': diagram.kind === 'process' }"
            :aria-selected="diagram.kind === 'process'"
            test-id="document-diagram-process"
            @click="setKind('process')"
          >
            {{ t('document.form.diagram_process') }}
          </button>
        </div>

        <p class="sd-diagram-hint">
          {{ connectMode ? t('document.form.diagram_connect_hint') : hint }}
        </p>

        <div class="sd-diagram-toolbar">
          <button
            v-if="diagram.kind === 'org'"
            type="button"
            class="sd-diagram-btn"
            test-id="document-diagram-add-person"
            @click="addNode('person')"
          >
            {{ t('document.form.diagram_add_person') }}
          </button>
          <template v-else>
            <button type="button" class="sd-diagram-btn" test-id="document-diagram-add-step" @click="addNode('step')">
              {{ t('document.form.diagram_add_step') }}
            </button>
            <button
              type="button"
              class="sd-diagram-btn"
              test-id="document-diagram-add-decision"
              @click="addNode('decision')"
            >
              {{ t('document.form.diagram_add_decision') }}
            </button>
            <button
              type="button"
              class="sd-diagram-btn"
              test-id="document-diagram-add-terminator"
              @click="addNode('terminator')"
            >
              {{ t('document.form.diagram_add_terminator') }}
            </button>
          </template>
          <button
            type="button"
            class="sd-diagram-btn"
            :class="{ 'sd-diagram-btn-active': connectMode }"
            :aria-pressed="connectMode"
            test-id="document-diagram-connect"
            @click="toggleConnect"
          >
            {{ t('document.form.diagram_connect') }}
          </button>
          <button type="button" class="sd-diagram-btn" test-id="document-diagram-arrange" @click="arrange">
            {{ t('document.form.diagram_arrange') }}
          </button>
          <button
            type="button"
            class="sd-diagram-btn"
            :disabled="!selectedNode && !selectedEdge"
            test-id="document-diagram-delete"
            @click="removeSelected"
          >
            {{ t('document.form.diagram_delete') }}
          </button>
        </div>

        <div class="sd-diagram-body">
          <div class="sd-diagram-canvas" test-id="document-diagram-canvas">
            <svg
              ref="svgRef"
              :width="canvasSize.width"
              :height="canvasSize.height"
              :viewBox="`0 0 ${canvasSize.width} ${canvasSize.height}`"
              @pointerdown="onCanvasPointerDown"
            >
              <defs>
                <marker
                  id="sd-diagram-editor-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
                </marker>
              </defs>
              <rect :width="canvasSize.width" :height="canvasSize.height" fill="#f8fafc" />
              <g v-for="edge in diagram.edges" :key="edge.id">
                <template v-if="routeFor(edge)">
                  <path
                    :d="routeFor(edge)!.d"
                    fill="none"
                    stroke="transparent"
                    stroke-width="14"
                    @pointerdown="onEdgePointerDown(edge, $event)"
                  />
                  <path
                    :d="routeFor(edge)!.d"
                    fill="none"
                    :stroke="selectedEdgeId === edge.id ? '#1d4ed8' : '#334155'"
                    :stroke-width="selectedEdgeId === edge.id ? 2.5 : 1.5"
                    marker-end="url(#sd-diagram-editor-arrow)"
                    pointer-events="none"
                  />
                  <g v-if="edge.label.trim()" pointer-events="none">
                    <rect
                      :x="routeFor(edge)!.labelX - edge.label.length * 3.6 - 6"
                      :y="routeFor(edge)!.labelY - 10"
                      :width="edge.label.length * 7.2 + 12"
                      height="16"
                      rx="3"
                      fill="#ffffff"
                    />
                    <text
                      :x="routeFor(edge)!.labelX"
                      :y="routeFor(edge)!.labelY"
                      text-anchor="middle"
                      dominant-baseline="middle"
                      class="sd-diagram-edge-label"
                    >
                      {{ edge.label }}
                    </text>
                  </g>
                </template>
              </g>
              <g
                v-for="node in diagram.nodes"
                :key="node.id"
                class="sd-diagram-node"
                role="button"
                tabindex="0"
                :aria-label="node.label"
                :aria-pressed="selectedNodeId === node.id"
                :test-id="`document-diagram-node-${node.id}`"
                @pointerdown="onNodePointerDown(node, $event)"
                @dblclick.stop="focusLabel"
              >
                <polygon
                  v-if="node.kind === 'decision'"
                  :points="diamondPoints(node)"
                  fill="#ffffff"
                  :stroke="nodeStroke(node)"
                  stroke-width="1.5"
                />
                <template v-else>
                  <rect
                    :x="node.x"
                    :y="node.y"
                    :width="nodeBox(node).w"
                    :height="nodeBox(node).h"
                    :rx="node.kind === 'terminator' ? nodeBox(node).h / 2 : 8"
                    :fill="node.kind === 'terminator' ? '#0f172a' : '#ffffff'"
                    :stroke="nodeStroke(node)"
                    stroke-width="1.5"
                  />
                  <rect
                    v-if="node.kind === 'person'"
                    :x="node.x + 1"
                    :y="node.y + 10"
                    width="4"
                    :height="nodeBox(node).h - 20"
                    fill="#1d4ed8"
                  />
                </template>
                <text
                  v-for="(text, index) in nodeTexts(node)"
                  :key="`${node.id}-${index}`"
                  :x="text.x"
                  :y="text.y"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  :font-size="text.size"
                  :font-weight="text.weight"
                  :fill="text.fill"
                  class="sd-diagram-node-text"
                >
                  {{ text.text }}
                </text>
              </g>
            </svg>
          </div>

          <aside class="sd-diagram-inspector">
            <template v-if="selectedNode">
              <label class="sd-diagram-field" for="sd-diagram-label">
                {{ selectedNode.kind === 'person' ? t('document.form.diagram_name') : t('document.form.diagram_label') }}
              </label>
              <input
                id="sd-diagram-label"
                ref="labelInputRef"
                v-model="selectedNode.label"
                class="sd-diagram-input"
                type="text"
                test-id="document-diagram-label"
              />
              <template v-if="selectedNode.kind === 'person'">
                <label class="sd-diagram-field" for="sd-diagram-role">{{ t('document.form.diagram_role') }}</label>
                <input
                  id="sd-diagram-role"
                  v-model="selectedNode.subtitle"
                  class="sd-diagram-input"
                  type="text"
                  test-id="document-diagram-role"
                />
              </template>
            </template>
            <template v-else-if="selectedEdge">
              <label class="sd-diagram-field" for="sd-diagram-edge-label">
                {{ t('document.form.diagram_connector_label') }}
              </label>
              <input
                id="sd-diagram-edge-label"
                v-model="selectedEdge.label"
                class="sd-diagram-input"
                type="text"
                test-id="document-diagram-edge-label"
              />
            </template>
            <p v-else class="sd-diagram-empty">{{ t('document.form.diagram_empty_selection') }}</p>
          </aside>
        </div>

        <footer class="sd-diagram-footer">
          <p v-if="error" class="sd-diagram-error" role="alert" test-id="document-diagram-error">{{ error }}</p>
          <div class="sd-diagram-actions">
            <button type="button" class="sd-diagram-btn" test-id="document-diagram-cancel" @click="emit('close')">
              {{ t('document.form.diagram_cancel') }}
            </button>
            <button
              type="button"
              class="sd-diagram-btn sd-diagram-btn-primary"
              :disabled="inserting || diagram.nodes.length === 0"
              test-id="document-diagram-insert"
              @click="insert"
            >
              {{ editing ? t('document.form.diagram_update') : t('document.form.diagram_insert') }}
            </button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DiagramImage } from './diagram-image'
import { svgToPng } from './diagram-image'
import {
  addDiagramNode,
  arrangeDiagram,
  connectDiagramNodes,
  contentBounds,
  diamondPoints,
  edgeRoute,
  nodeBox,
  nodeTexts,
  removeDiagramSelection,
  renderDiagramSvg,
  starterOrgChart,
  starterProcessFlow,
  type Diagram,
  type DiagramEdge,
  type DiagramKind,
  type DiagramNode,
  type DiagramNodeKind,
} from './diagram-model'

const props = withDefaults(
  defineProps<{
    insertImage: (image: DiagramImage) => boolean
    initialDiagram?: Diagram | null
    editing?: boolean
  }>(),
  {
    initialDiagram: null,
    editing: false,
  }
)

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const dialogRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const labelInputRef = ref<HTMLInputElement | null>(null)
const diagram = ref<Diagram>(startingDiagram())
const selectedNodeId = ref<string | null>(diagram.value.nodes[0]?.id ?? null)
const selectedEdgeId = ref<string | null>(null)
const connectMode = ref(false)
const connectFrom = ref<string | null>(null)
const inserting = ref(false)
const error = ref('')
const dirty = ref(false)
let ignoreDirty = false
let drag: { id: string; dx: number; dy: number } | null = null

watch(
  diagram,
  () => {
    if (!ignoreDirty) dirty.value = true
  },
  { deep: true }
)

const selectedNode = computed(() => diagram.value.nodes.find((node) => node.id === selectedNodeId.value) ?? null)
const selectedEdge = computed(() => diagram.value.edges.find((edge) => edge.id === selectedEdgeId.value) ?? null)
const hint = computed(() =>
  diagram.value.kind === 'org' ? t('document.form.diagram_hint_org') : t('document.form.diagram_hint_process')
)
const canvasSize = computed(() => {
  const bounds = contentBounds(diagram.value, 0)
  return {
    width: Math.max(980, Math.ceil(bounds.x + bounds.width + 120)),
    height: Math.max(560, Math.ceil(bounds.y + bounds.height + 120)),
  }
})

function startingDiagram(): Diagram {
  if (props.initialDiagram?.nodes?.length) {
    return JSON.parse(JSON.stringify(props.initialDiagram)) as Diagram
  }
  return starterOrgChart(orgCopy())
}

function orgCopy() {
  return {
    director: t('document.form.diagram_starter_director'),
    directorRole: t('document.form.diagram_starter_director_role'),
    operations: t('document.form.diagram_starter_operations'),
    operationsRole: t('document.form.diagram_starter_operations_role'),
    quality: t('document.form.diagram_starter_quality'),
    qualityRole: t('document.form.diagram_starter_quality_role'),
  }
}

function processCopy() {
  return {
    start: t('document.form.diagram_starter_start'),
    work: t('document.form.diagram_starter_work'),
    decision: t('document.form.diagram_starter_decision'),
    finish: t('document.form.diagram_starter_finish'),
    revise: t('document.form.diagram_starter_revise'),
    yes: t('document.form.diagram_yes'),
    no: t('document.form.diagram_no'),
  }
}

function setKind(kind: DiagramKind) {
  if (diagram.value.kind === kind) return
  if (dirty.value && !window.confirm(t('document.form.diagram_replace_confirm'))) return
  ignoreDirty = true
  diagram.value = kind === 'org' ? starterOrgChart(orgCopy()) : starterProcessFlow(processCopy())
  dirty.value = false
  selectedNodeId.value = diagram.value.nodes[0]?.id ?? null
  selectedEdgeId.value = null
  connectFrom.value = null
  connectMode.value = false
  error.value = ''
  nextTick(() => {
    ignoreDirty = false
  })
}

function addNode(kind: DiagramNodeKind) {
  const selected = selectedNode.value
  const children = selected ? diagram.value.edges.filter((edge) => edge.from === selected.id).length : 0
  const label =
    kind === 'person'
      ? t('document.form.diagram_new_person')
      : kind === 'decision'
        ? t('document.form.diagram_new_decision')
        : kind === 'terminator'
          ? t('document.form.diagram_new_terminator')
          : t('document.form.diagram_new_step')
  const connectLabel =
    diagram.value.kind === 'process' && selected?.kind === 'decision'
      ? children === 0
        ? t('document.form.diagram_yes')
        : t('document.form.diagram_no')
      : ''
  const next = addDiagramNode(diagram.value, kind, label, selected?.id ?? null, connectLabel)
  diagram.value = next
  selectedNodeId.value = next.nodes[next.nodes.length - 1]?.id ?? null
  selectedEdgeId.value = null
  focusLabel()
}

function toggleConnect() {
  connectMode.value = !connectMode.value
  connectFrom.value = null
}

function arrange() {
  diagram.value = arrangeDiagram(diagram.value)
}

function removeSelected() {
  diagram.value = removeDiagramSelection(diagram.value, selectedNodeId.value, selectedEdgeId.value)
  selectedNodeId.value = null
  selectedEdgeId.value = null
  connectFrom.value = null
}

function routeFor(edge: DiagramEdge) {
  const from = diagram.value.nodes.find((node) => node.id === edge.from)
  const to = diagram.value.nodes.find((node) => node.id === edge.to)
  if (!from || !to) return null
  return edgeRoute(from, to, diagram.value.kind === 'org' ? 'vertical' : 'auto')
}

function nodeStroke(node: DiagramNode) {
  if (selectedNodeId.value === node.id || connectFrom.value === node.id) return '#1d4ed8'
  if (node.kind === 'terminator') return '#0f172a'
  return '#64748b'
}

function focusLabel() {
  nextTick(() => labelInputRef.value?.focus())
}

function svgPoint(event: PointerEvent) {
  const svg = svgRef.value
  if (!svg || typeof svg.createSVGPoint !== 'function' || typeof svg.getScreenCTM !== 'function') {
    return { x: event.offsetX, y: event.offsetY }
  }
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  const matrix = svg.getScreenCTM()
  if (!matrix) return { x: event.offsetX, y: event.offsetY }
  const mapped = point.matrixTransform(matrix.inverse())
  return { x: mapped.x, y: mapped.y }
}

function handleConnect(nodeId: string) {
  if (!connectFrom.value) {
    connectFrom.value = nodeId
    selectedNodeId.value = nodeId
    return
  }
  if (connectFrom.value !== nodeId) {
    diagram.value = connectDiagramNodes(diagram.value, connectFrom.value, nodeId)
  }
  connectFrom.value = null
  connectMode.value = false
  selectedNodeId.value = nodeId
}

function onNodePointerDown(node: DiagramNode, event: PointerEvent) {
  if (event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()
  selectedEdgeId.value = null
  selectedNodeId.value = node.id
  if (connectMode.value) {
    handleConnect(node.id)
    return
  }
  const point = svgPoint(event)
  drag = { id: node.id, dx: point.x - node.x, dy: point.y - node.y }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(event: PointerEvent) {
  if (!drag) return
  const node = diagram.value.nodes.find((item) => item.id === drag?.id)
  if (!node) return
  const point = svgPoint(event)
  node.x = Math.max(16, Math.round(point.x - drag.dx))
  node.y = Math.max(16, Math.round(point.y - drag.dy))
}

function onPointerUp() {
  drag = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

function onEdgePointerDown(edge: DiagramEdge, event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  if (connectMode.value) return
  selectedNodeId.value = null
  selectedEdgeId.value = edge.id
}

function onCanvasPointerDown() {
  if (drag) return
  selectedNodeId.value = null
  selectedEdgeId.value = null
  connectFrom.value = null
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (connectMode.value) {
      connectMode.value = false
      connectFrom.value = null
      return
    }
    emit('close')
    return
  }
  if (event.key !== 'Delete' && event.key !== 'Backspace') return
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  if (!selectedNodeId.value && !selectedEdgeId.value) return
  event.preventDefault()
  removeSelected()
}

async function insert() {
  if (inserting.value || diagram.value.nodes.length === 0) return
  inserting.value = true
  error.value = ''
  try {
    const rendered = renderDiagramSvg(diagram.value)
    const src = await svgToPng(rendered.svg, rendered.width, rendered.height)
    const alt = diagram.value.kind === 'org' ? t('document.form.diagram_org') : t('document.form.diagram_process')
    const inserted = props.insertImage({
      src,
      width: rendered.width,
      height: rendered.height,
      alt,
      diagram: JSON.parse(JSON.stringify(diagram.value)) as Diagram,
    })
    if (!inserted) {
      error.value = t('document.form.diagram_insert_failed')
      return
    }
    emit('close')
  } catch {
    error.value = t('document.form.diagram_insert_failed')
  } finally {
    inserting.value = false
  }
}

onMounted(() => {
  dialogRef.value?.focus()
})

onUnmounted(() => {
  onPointerUp()
})
</script>

<style scoped>
.sd-diagram-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
}

.sd-diagram-dialog {
  display: flex;
  flex-direction: column;
  width: min(1040px, 100%);
  height: min(720px, 100%);
  overflow: hidden;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.24);
  outline: none;
}

.sd-diagram-header,
.sd-diagram-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
}

.sd-diagram-header {
  border-bottom: 1px solid #e2e8f0;
}

.sd-diagram-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.sd-diagram-icon-btn {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #334155;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.sd-diagram-icon-btn:hover {
  background: #f1f5f9;
}

.sd-diagram-kinds,
.sd-diagram-toolbar,
.sd-diagram-hint {
  padding: 0 16px;
}

.sd-diagram-kinds {
  display: flex;
  gap: 8px;
  padding-top: 12px;
}

.sd-diagram-kind,
.sd-diagram-btn {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #334155;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.sd-diagram-kind {
  padding: 6px 10px;
}

.sd-diagram-kind-active,
.sd-diagram-btn-active {
  border-color: #0f172a;
  background: #0f172a;
  color: #ffffff;
}

.sd-diagram-hint {
  margin: 10px 0 0;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.4;
}

.sd-diagram-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 10px;
  padding-bottom: 10px;
}

.sd-diagram-btn {
  padding: 6px 10px;
}

.sd-diagram-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.sd-diagram-btn-primary {
  border-color: #0f172a;
  background: #0f172a;
  color: #ffffff;
}

.sd-diagram-body {
  display: flex;
  flex: 1;
  min-height: 0;
  border-top: 1px solid #e2e8f0;
}

.sd-diagram-canvas {
  flex: 1;
  min-width: 0;
  overflow: auto;
  background: #f8fafc;
}

.sd-diagram-node {
  cursor: grab;
}

.sd-diagram-node-text,
.sd-diagram-edge-label {
  font-family: Arial, 'Noto Sans Arabic', Cairo, Helvetica, sans-serif;
  pointer-events: none;
  user-select: none;
}

.sd-diagram-edge-label {
  font-size: 11px;
  fill: #334155;
}

.sd-diagram-inspector {
  width: 240px;
  flex-shrink: 0;
  padding: 16px;
  border-left: 1px solid #e2e8f0;
  background: #ffffff;
}

.sd-diagram-field {
  display: block;
  margin-bottom: 6px;
  color: #334155;
  font-size: 0.75rem;
  font-weight: 600;
}

.sd-diagram-field + .sd-diagram-input {
  margin-bottom: 12px;
}

.sd-diagram-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 12px;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #0f172a;
  font: inherit;
  font-size: 0.8125rem;
}

.sd-diagram-input:focus {
  outline: 2px solid #0f172a;
  outline-offset: 1px;
}

.sd-diagram-empty {
  margin: 0;
  color: #64748b;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.sd-diagram-footer {
  border-top: 1px solid #e2e8f0;
}

.sd-diagram-error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.75rem;
}

.sd-diagram-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

@media (max-width: 800px) {
  .sd-diagram-backdrop {
    padding: 12px;
  }

  .sd-diagram-body {
    flex-direction: column;
  }

  .sd-diagram-inspector {
    width: 100%;
    border-left: 0;
    border-top: 1px solid #e2e8f0;
  }

  .sd-diagram-canvas {
    min-height: 280px;
  }
}
</style>
