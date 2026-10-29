<template>
  <div class="superdoc-editor">
    <input
      v-if="showOpenDocx && !hideToolbar"
      ref="docxFileInputRef"
      type="file"
      class="hidden"
      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      test-id="document-open-docx-input"
      @change="onDocxFileInputChange"
    />
    <div v-if="showToolbarChrome()" id="toolbar" ref="toolbarRef" :class="{ 'sd-highlight-toolbar': isHighlightToolbarMode() }" />
    <div
      v-if="!hideToolbar && pageNumberNoticeText"
      class="sd-hf-context-banner sd-page-number-notice"
      role="alert"
      test-id="document-page-number-notice"
    >
      {{ pageNumberNoticeText }}
    </div>
    <div
      v-if="!hideToolbar && headerFooterBannerText"
      class="sd-hf-context-banner"
      role="status"
      test-id="document-header-footer-context-banner"
    >
      {{ headerFooterBannerText }}
    </div>
    <div
      v-if="aiPromptOpen"
      class="sd-ai-write-panel"
      role="dialog"
      aria-labelledby="sd-ai-write-title"
      test-id="document-ai-write-panel"
    >
      <label id="sd-ai-write-title" class="sd-ai-write-label" for="sd-ai-write-prompt">
        {{ labels.aiWrite }}
      </label>
      <textarea
        id="sd-ai-write-prompt"
        ref="aiPromptInputRef"
        v-model="aiPromptText"
        class="sd-ai-write-input"
        rows="3"
        :placeholder="labels.aiWritePromptPlaceholder"
        :disabled="aiWriting"
        test-id="document-ai-write-prompt"
        @keydown="onAiPromptKeydown"
      />
      <p v-if="aiPromptError" class="sd-ai-write-error" role="alert" test-id="document-ai-write-error">
        {{ aiPromptError }}
      </p>
      <div class="sd-ai-write-actions">
        <button
          type="button"
          class="sd-ai-write-btn"
          :disabled="aiWriting"
          test-id="document-ai-write-cancel"
          @click="closeAiPrompt"
        >
          {{ labels.aiWriteCancel }}
        </button>
        <button
          type="button"
          class="sd-ai-write-btn sd-ai-write-btn-primary"
          :disabled="aiWriting"
          test-id="document-ai-write-generate"
          @click="submitAiPrompt"
        >
          {{ aiWriting ? labels.aiWriteGenerating : labels.aiWriteGenerate }}
        </button>
      </div>
    </div>
    <div id="editor" ref="editorRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { BlankDOCX, SuperDoc } from 'superdoc'
import { attachAutoParagraphDirection, wireAutoParagraphDirection } from './utils/autoParagraphDirection'
import {
  attachPageNumberKeyboardEscape,
  canInsertPageNumber,
  insertInlinePageNumber,
  insertManagedPageNumber,
  type PageNumberInsertOption,
  wirePageNumberKeyboardEscape,
} from './utils/pageNumber'
import { SUPERDOC_FONT_CONFIGS } from './utils/superdoc-fonts'
import {
  findBlockScrollPos,
  findCanonicalNodeIdInDoc,
  getActiveEditorFromSuperdoc,
  getBlockTargetFromPointer as resolveBlockTargetFromPointer,
  getNodeIdFromPointer as resolveNodeIdFromPointer,
  getPresentationEditorFromSuperdoc,
  resolveStableNodeIdFromDom,
} from './utils/blockNodeId'
import {
  applyTextHighlight,
  getHighlightSignature,
  hasHighlightableSelection,
  HIGHLIGHT_SWATCHES,
  wireHighlightOnlyGuard,
} from './utils/highlightOnly'
import {
  DOCX_MIME,
  type SuperDocAiWriteRequest,
  type SuperDocAiWriteResult,
  type SuperDocDocumentSource,
  type SuperDocLabels,
  type SuperDocUser,  
} from './types/messages'
import {
  AI_WRITE_OUTPUT_FORMAT,
  AI_WRITE_OUTPUT_INSTRUCTIONS,
  getDocumentPlainText,
  getSelectedText,
  insertAiContent,
} from './utils/aiWrite'
import {
  prepareDocxWithOlePreviews,
  restoreOleObjectsInDocx,
  type OleRestoreEntry,
} from './utils/ole-object-preserve'

const OPEN_DOCX_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true"><path d="M64 464c-8.8 0-16-7.2-16-16V64c0-8.8 7.2-16 16-16H224v80c0 17.7 14.3 32 32 32h80V304H272c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16H384v80c0 8.8-7.2 16-16 16H64zM384 263.4L280.4 159.8c-4.2-4.2-10.3-6.6-16.4-6.6H256V64c0-8.8 7.2-16 16-16h32V160c0 17.7 14.3 32 32 32h112V263.4zM155.7 250.2L132.4 350.3c-1.7 7.3-8.2 12.4-15.7 12.4s-14-5.1-15.7-12.4L78.3 250.2c-2.4-10.2 3.8-20.5 14-22.9s20.5 3.8 22.9 14l4.8 20.2 4.8-20.2c2.4-10.2 12.7-16.4 22.9-14s16.4 12.7 14 22.9zm112 0l-23.3 100.1c-1.7 7.3-8.2 12.4-15.7 12.4s-14-5.1-15.7-12.4L190.3 250.2c-2.4-10.2 3.8-20.5 14-22.9s20.5 3.8 22.9 14l4.8 20.2 4.8-20.2c2.4-10.2 12.7-16.4 22.9-14s16.4 12.7 14 22.9z"/></svg>'

const DIFFERENT_FIRST_PAGE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true"><path d="M64 464c-8.8 0-16-7.2-16-16V64c0-8.8 7.2-16 16-16H224v80c0 17.7 14.3 32 32 32h80V304H272c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16H384V128H320c-17.7 0-32-14.3-32-32V0H64zm224 48v32H64V112h224zM96 160h32v32H96v-32zm48 0h96v32H144v-32zM96 224h192v32H96V224zm0 64h192v32H96V288zm0 64h128v32H96V352z"/></svg>'

const PAGE_BREAK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true"><path d="M64 464c-8.8 0-16-7.2-16-16V64c0-8.8 7.2-16 16-16H224v80c0 17.7 14.3 32 32 32h80V304H272c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16H384v80c0 8.8-7.2 16-16 16H64zM384 263.4L280.4 159.8c-4.2-4.2-10.3-6.6-16.4-6.6H256V64c0-8.8 7.2-16 16-16h32V160c0 17.7 14.3 32 32 32h112V263.4z"/><path fill="none" stroke="currentColor" stroke-width="32" stroke-dasharray="40 24" d="M48 256h288"/></svg>'

const PAGE_NUMBER_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true"><path d="M64 464c-8.8 0-16-7.2-16-16V64c0-8.8 7.2-16 16-16H224v80c0 17.7 14.3 32 32 32h80V448c0 8.8-7.2 16-16 16H64zM384 263.4L280.4 159.8c-4.2-4.2-10.3-6.6-16.4-6.6H256V64c0-8.8 7.2-16 16-16h32V160c0 17.7 14.3 32 32 32h112V263.4zM128 352h32v32H128v-32zm64 0h128v32H192v-32zM128 288h32v32H128v-32zm64 0h96v32H192v-32z"/></svg>'

const AI_WRITE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true"><path d="M234.7 42.7L197 56.8c-3 1.1-5 4-5 7.2s2 6.1 5 7.2l37.7 14.1L248.8 123c1.1 3 4 5 7.2 5s6.1-2 7.2-5l14.1-37.7L315 71.2c3-1.1 5-4 5-7.2s-2-6.1-5-7.2L277.3 42.7 263.2 5c-1.1-3-4-5-7.2-5s-6.1 2-7.2 5L234.7 42.7zM46.1 395.4c-18.7 18.7-18.7 49.1 0 67.9l34.6 34.6c18.7 18.7 49.1 18.7 67.9 0L397.5 248.1c-28.2-23.2-52.5-47.6-75.7-75.8L46.1 395.4zM484.6 25.9C462 3.3 426.2 3.3 403.6 25.9L366.3 63.2c28.2 23.2 52.5 47.6 75.8 75.8l37.2-37.2c22.6-22.6 22.6-58.4 0-81C479.3 20.8 479.3 20.8 484.6 25.9z"/></svg>'

const PAGE_NUMBER_INSERT_OPTIONS: PageNumberInsertOption[] = ['custom', 'left', 'center', 'right']

const props = withDefaults(
  defineProps<{
    document?: SuperDocDocumentSource
    user?: SuperDocUser
    documentMode?: string
    role?: string
    hideToolbar?: boolean
    showOpenDocx?: boolean
    showDifferentFirstPage?: boolean
    showPageBreak?: boolean
    showPageNumber?: boolean
    trackChangesVisible?: boolean
    canComment?: boolean
    showHighlightToolbar?: boolean
    showAiWrite?: boolean
    generateAiContent?: (request: SuperDocAiWriteRequest) => Promise<SuperDocAiWriteResult>
    labels: SuperDocLabels
  }>(),
  {
    document: null,
    user: undefined,
    documentMode: 'editing',
    role: 'editor',
    hideToolbar: false,
    showOpenDocx: false,
    showDifferentFirstPage: true,
    showPageBreak: true,
    showPageNumber: true,
    trackChangesVisible: false,
    canComment: false,
    showHighlightToolbar: false,
    showAiWrite: false,
  },
)

const emit = defineEmits<{
  ready: []
  update: []
  docxSelected: [file: File]
  commentSelected: [commentId: string]
  commentSaved: [payload: { type: string; commentId?: string }]
  highlightSaved: []
  copyCommentLinkRequest: [commentId: string]
  copyNodeLinkRequest: [payload: { nodeId: string; offset?: number }]
}>()

const toolbarRef = ref<HTMLElement | null>(null)
const editorRef = ref<HTMLElement | null>(null)
const docxFileInputRef = ref<HTMLInputElement | null>(null)
const aiPromptInputRef = ref<HTMLTextAreaElement | null>(null)
const differentFirstPageEnabled = ref(false)
const hfSurface = ref('body')
const hfVariant = ref<string | null>(null)
const pageNumberNoticeText = ref('')
const isReady = ref(false)
const aiPromptOpen = ref(false)
const aiPromptText = ref('')
const aiPromptError = ref('')
const aiWriting = ref(false)
let aiWriteSelection = ''
let aiWriteDocumentContext = ''

let superdoc: any = null
let oleRestoreEntries: OleRestoreEntry[] = []
let headerFooterEditor: any = null
let disconnectAutoDirection: (() => void) | null = null
let disconnectPageNumberKeyboard: (() => void) | null = null
let marginControlsGroup: HTMLElement | null = null
let pageNumberNoticeTimeout: ReturnType<typeof setTimeout> | null = null
let removePageNumberDropdownGuard: (() => void) | null = null
let commentCopyLinkObserver: MutationObserver | null = null
let nodeContextMenuEl: HTMLElement | null = null
let activeContextMenuNodeId: string | null = null
let activeContextMenuNodeOffset: number | null = null
let removeNodeContextMenuListeners: (() => void) | null = null
let lastHighlightSignature = ''

const COMMENT_COPY_LINK_ATTR = 'data-superdoc-copy-link-wired'
const COMMENT_COPY_LINK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 0 640 640"><!--!Font Awesome Free v7.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path d="M451.5 160C434.9 160 418.8 164.5 404.7 172.7C388.9 156.7 370.5 143.3 350.2 133.2C378.4 109.2 414.3 96 451.5 96C537.9 96 608 166 608 252.5C608 294 591.5 333.8 562.2 363.1L491.1 434.2C461.8 463.5 422 480 380.5 480C294.1 480 224 410 224 323.5C224 322 224 320.5 224.1 319C224.6 301.3 239.3 287.4 257 287.9C274.7 288.4 288.6 303.1 288.1 320.8C288.1 321.7 288.1 322.6 288.1 323.4C288.1 374.5 329.5 415.9 380.6 415.9C405.1 415.9 428.6 406.2 446 388.8L517.1 317.7C534.4 300.4 544.2 276.8 544.2 252.3C544.2 201.2 502.8 159.8 451.7 159.8zM307.2 237.3C305.3 236.5 303.4 235.4 301.7 234.2C289.1 227.7 274.7 224 259.6 224C235.1 224 211.6 233.7 194.2 251.1L123.1 322.2C105.8 339.5 96 363.1 96 387.6C96 438.7 137.4 480.1 188.5 480.1C205 480.1 221.1 475.7 235.2 467.5C251 483.5 269.4 496.9 289.8 507C261.6 530.9 225.8 544.2 188.5 544.2C102.1 544.2 32 474.2 32 387.7C32 346.2 48.5 306.4 77.8 277.1L148.9 206C178.2 176.7 218 160.2 259.5 160.2C346.1 160.2 416 230.8 416 317.1C416 318.4 416 319.7 416 321C415.6 338.7 400.9 352.6 383.2 352.2C365.5 351.8 351.6 337.1 352 319.4C352 318.6 352 317.9 352 317.1C352 283.4 334 253.8 307.2 237.5z"/></svg>'

const PX_PER_INCH = 96
const DEFAULT_MARGIN_INCHES = 1

const marginControlRefs: Record<string, { slider: HTMLInputElement | null; value: HTMLElement | null }> = {
  left: { slider: null, value: null },
  right: { slider: null, value: null },
}

function parseMarginInches(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const match = value.trim().match(/^([\d.]+)\s*(in|px)?$/i)
  if (!match) return null

  const amount = Number.parseFloat(match[1])
  if (!Number.isFinite(amount)) return null

  const unit = (match[2] || 'in').toLowerCase()
  return unit === 'px' ? amount / PX_PER_INCH : amount
}

function normalizePageMargins(pageMargins: Record<string, unknown> = {}) {
  const normalized: Record<string, number> = {}
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const parsed = parseMarginInches(pageMargins[side])
    if (parsed != null) normalized[side] = parsed
  }
  return normalized
}

function inchesToPx(inches: number) {
  return Math.round(inches * PX_PER_INCH)
}

function pxToInches(px: number) {
  return px / PX_PER_INCH
}

function getCurrentPageMargins() {
  const pageMargins = getActiveEditor()?.getPageStyles?.()?.pageMargins ?? {}
  return {
    top: pageMargins.top ?? DEFAULT_MARGIN_INCHES,
    right: pageMargins.right ?? DEFAULT_MARGIN_INCHES,
    bottom: pageMargins.bottom ?? DEFAULT_MARGIN_INCHES,
    left: pageMargins.left ?? DEFAULT_MARGIN_INCHES,
  }
}

function getPageStyles() {
  return getActiveEditor()?.getPageStyles?.() ?? {}
}

function syncMarginControls() {
  const margins = getCurrentPageMargins()
  for (const side of ['left', 'right'] as const) {
    const refs = marginControlRefs[side]
    if (!refs.slider || !refs.value) continue
    const px = inchesToPx(margins[side])
    refs.slider.value = String(px)
    refs.value.textContent = `${px}px`
  }
}

function updatePageStyle({ pageMargins }: { pageMargins?: Record<string, unknown> } = {}) {
  const editor = getActiveEditor()
  if (!editor?.updatePageStyle) return false

  const current = getCurrentPageMargins()
  const next = pageMargins ? { ...current, ...normalizePageMargins(pageMargins) } : current

  editor.updatePageStyle({ pageMargins: next })
  syncMarginControls()
  emit('update')
  return true
}

function setPageMargin(side: string, inches: number) {
  return updatePageStyle({ pageMargins: { [side]: inches } })
}

function makeMarginControl(
  side: string,
  label: string,
  initialPx: number,
  onInput: (inches: number) => void,
) {
  const wrap = document.createElement('span')
  wrap.className = 'doc-margin-ctrl'

  const lbl = document.createElement('span')
  lbl.className = 'doc-margin-label'
  lbl.textContent = label

  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = '10'
  slider.max = '192'
  slider.value = String(initialPx)
  slider.className = 'doc-margin-slider'
  slider.title = side === 'left' ? 'Left page margin' : 'Right page margin'
  slider.setAttribute('test-id', `document-margin-${side}`)

  const val = document.createElement('span')
  val.className = 'doc-margin-val'
  val.textContent = `${initialPx}px`

  slider.addEventListener('input', () => {
    const px = Number(slider.value)
    onInput(pxToInches(px))
    val.textContent = `${px}px`
  })

  wrap.appendChild(lbl)
  wrap.appendChild(slider)
  wrap.appendChild(val)

  return { wrap, slider, val }
}

function injectMarginControls() {
  if (props.hideToolbar || !toolbarRef.value || marginControlsGroup) return

  const toolbarEl = toolbarRef.value.querySelector('.superdoc-toolbar')
  if (!toolbarEl) return

  const margins = getCurrentPageMargins()
  const group = document.createElement('span')
  group.className = 'button-group doc-margin-group'

  const leftCtrl = makeMarginControl('left', 'L', inchesToPx(margins.left), (inches) =>
    setPageMargin('left', inches),
  )
  const rightCtrl = makeMarginControl('right', 'R', inchesToPx(margins.right), (inches) =>
    setPageMargin('right', inches),
  )

  marginControlRefs.left = { slider: leftCtrl.slider, value: leftCtrl.val }
  marginControlRefs.right = { slider: rightCtrl.slider, value: rightCtrl.val }

  group.appendChild(leftCtrl.wrap)
  group.appendChild(rightCtrl.wrap)
  toolbarEl.appendChild(group)
  marginControlsGroup = group
}

function removeMarginControls() {
  marginControlsGroup?.remove()
  marginControlsGroup = null
  marginControlRefs.left = { slider: null, value: null }
  marginControlRefs.right = { slider: null, value: null }
}


function isHeaderFooterEditor(editor: any) {
  return Boolean(editor?.options?.isHeaderOrFooter)
}

function getHeaderFooterEditor() {
  const bodyEditor = getActiveEditor()
  const presentationEditor = bodyEditor?.presentationEditor
  const resolved = presentationEditor?.getActiveEditor?.()
  if (isHeaderFooterEditor(resolved)) {
    headerFooterEditor = resolved
    return resolved
  }
  headerFooterEditor = null
  return null
}

function refreshHeaderFooterContextFromPresentation() {
  const bodyEditor = getActiveEditor()
  const presentationEditor = bodyEditor?.presentationEditor
  const resolved = presentationEditor?.getActiveEditor?.()
  if (!isHeaderFooterEditor(resolved)) {
    headerFooterEditor = null
    return
  }

  headerFooterEditor = resolved
  const headerFooterType = resolved.options?.headerFooterType
  if (headerFooterType === 'header' || headerFooterType === 'footer') {
    hfSurface.value = headerFooterType
  }
}

function isPageNumberToolbarAvailable() {
  if (!canMutateDocument()) return false
  return Boolean(getActiveEditor())
}

function isInHeaderFooterContext() {
  refreshHeaderFooterContextFromPresentation()
  return canInsertPageNumber(getHeaderFooterEditor(), canMutateDocument())
}

function closePageNumberDropdown() {
  const item = superdoc?.toolbar?.getToolbarItemByName?.('pageNumber')
  if (item?.expand) item.expand.value = false
}

function wirePageNumberDropdownGuard() {
  removePageNumberDropdownGuard?.()
  removePageNumberDropdownGuard = null

  if (props.hideToolbar || !props.showPageNumber || !toolbarRef.value) return

  const onToolbarCapture = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (!target.closest('[data-item="btn-pageNumber"]')) return
    if (!target.closest('.toolbar-dropdown-trigger')) return
    if (isInHeaderFooterContext()) return

    event.preventDefault()
    event.stopImmediatePropagation()
    closePageNumberDropdown()
    showPageNumberNotice(props.labels.pageNumberNeedsHeaderFooter)
  }

  toolbarRef.value.addEventListener('click', onToolbarCapture, true)
  removePageNumberDropdownGuard = () => {
    toolbarRef.value?.removeEventListener('click', onToolbarCapture, true)
  }
}

function syncPageNumberToolbar() {
  const item = superdoc?.toolbar?.getToolbarItemByName?.('pageNumber')
  if (!item) return
  item.setDisabled(!isPageNumberToolbarAvailable())
}

function showPageNumberNotice(message: string) {
  pageNumberNoticeText.value = message
  if (pageNumberNoticeTimeout) clearTimeout(pageNumberNoticeTimeout)
  pageNumberNoticeTimeout = setTimeout(() => {
    pageNumberNoticeText.value = ''
    pageNumberNoticeTimeout = null
  }, 6000)
}

function clearPageNumberNotice() {
  if (pageNumberNoticeTimeout) {
    clearTimeout(pageNumberNoticeTimeout)
    pageNumberNoticeTimeout = null
  }
  pageNumberNoticeText.value = ''
}

function isBlockedFirstPagePageNumberContext() {
  return (
    props.showDifferentFirstPage &&
    differentFirstPageEnabled.value &&
    hfVariant.value === 'first' &&
    (hfSurface.value === 'header' || hfSurface.value === 'footer')
  )
}

function isPageNumberInsertOption(value: unknown): value is PageNumberInsertOption {
  return typeof value === 'string' && PAGE_NUMBER_INSERT_OPTIONS.includes(value as PageNumberInsertOption)
}

function insertPageNumber(option: PageNumberInsertOption) {
  if (!canMutateDocument()) return

  if (!isInHeaderFooterContext()) {
    showPageNumberNotice(props.labels.pageNumberNeedsHeaderFooter)
    return
  }

  const editor = getHeaderFooterEditor()
  if (!editor) return

  if (isBlockedFirstPagePageNumberContext()) {
    showPageNumberNotice(props.labels.pageNumberWrongFirstPageVariant)
    return
  }

  clearPageNumberNotice()

  editor.view?.focus?.()
  const inserted =
    option === 'custom'
      ? insertInlinePageNumber(editor)
      : insertManagedPageNumber(editor, option)
  if (!inserted) {
    showPageNumberNotice(props.labels.pageNumberInsertFailed)
    return
  }

  emit('update')
}

function handlePageNumberToolbarCommand({ argument }: { argument?: unknown }) {
  if (!isPageNumberInsertOption(argument)) return
  insertPageNumber(argument)
}

const headerFooterBannerText = computed(() => {
  if (!props.showDifferentFirstPage || !differentFirstPageEnabled.value) return ''

  if (hfSurface.value === 'header' && hfVariant.value === 'first') {
    return props.labels.editingFirstPageHeader
  }
  if (hfSurface.value === 'footer' && hfVariant.value === 'first') {
    return props.labels.editingFirstPageFooter
  }
  if (hfSurface.value === 'header') {
    return props.labels.editingOtherPagesHeader
  }
  if (hfSurface.value === 'footer') {
    return props.labels.editingOtherPagesFooter
  }
  return props.labels.differentFirstPageActive
})

function isDocxSource(documentSource?: SuperDocDocumentSource) {
  if (!documentSource) return false

  if (documentSource instanceof File) {
    return documentSource.type === DOCX_MIME || documentSource.name.toLowerCase().endsWith('.docx')
  }

  if (documentSource instanceof Blob) {
    return !documentSource.type || documentSource.type === DOCX_MIME
  }

  if (typeof documentSource === 'string') {
    if (documentSource.startsWith('data:application/vnd.openxmlformats-officedocument')) return true
    if (/\.docx(?:$|[?#])/i.test(documentSource)) return true
    return false
  }

  return false
}

function resolveDocument(documentSource?: SuperDocDocumentSource): SuperDocDocumentSource {
  return isDocxSource(documentSource) && documentSource != null ? documentSource : BlankDOCX
}

function onDocxFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('docxSelected', file)
  }
  input.value = ''
}

function isHighlightToolbarMode() {
  return props.showHighlightToolbar
}

function showToolbarChrome() {
  return !props.hideToolbar && !isHighlightToolbarMode()
}

function effectiveDocumentMode() {
  return isHighlightToolbarMode() ? 'editing' : props.documentMode
}

function effectiveRole() {
  return isHighlightToolbarMode() ? 'editor' : props.role
}

function canMutateDocument() {
  if (isHighlightToolbarMode()) return false
  return props.documentMode === 'editing' && props.role !== 'viewer'
}

function isAiWriteAvailable() {
  return Boolean(props.showAiWrite && props.generateAiContent && canMutateDocument() && showToolbarChrome())
}

function openAiPrompt() {
  if (!isAiWriteAvailable() || aiWriting.value) return
  const editor = getActiveEditor()
  aiWriteSelection = getSelectedText(editor)
  aiWriteDocumentContext = getDocumentPlainText(editor)
  aiPromptError.value = ''
  aiPromptOpen.value = true
  nextTick(() => aiPromptInputRef.value?.focus())
}

function closeAiPrompt() {
  if (aiWriting.value) return
  aiPromptOpen.value = false
  aiPromptError.value = ''
}

function onAiPromptKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeAiPrompt()
    return
  }
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    void submitAiPrompt()
  }
}

async function submitAiPrompt() {
  const prompt = aiPromptText.value.trim()
  if (!prompt) {
    aiPromptError.value = props.labels.aiWriteEmptyPrompt
    return
  }
  if (!props.generateAiContent || aiWriting.value || !canMutateDocument()) return

  aiWriting.value = true
  aiPromptError.value = ''
  try {
    const result = await props.generateAiContent({
      prompt,
      outputFormat: AI_WRITE_OUTPUT_FORMAT,
      outputInstructions: AI_WRITE_OUTPUT_INSTRUCTIONS,
      documentContext: aiWriteDocumentContext || undefined,
      selection: aiWriteSelection || undefined,
    })
    const inserted = insertAiContent(
      getActiveEditor(),
      result.content,
      result.contentType || AI_WRITE_OUTPUT_FORMAT,
    )
    if (!inserted) {
      aiPromptError.value = props.labels.aiWriteInsertFailed
      return
    }
    aiPromptText.value = ''
    aiPromptOpen.value = false
    emit('update')
  } catch (error) {
    aiPromptError.value = error instanceof Error && error.message
      ? error.message
      : props.labels.aiWriteError
  } finally {
    aiWriting.value = false
  }
}

function isViewReviewMode() {
  return props.documentMode === 'viewing' && !isHighlightToolbarMode()
}

function commentsAreEnabled() {
  return props.canComment && (props.documentMode === 'viewing' || isHighlightToolbarMode())
}

function getPresentationEditor() {
  return getPresentationEditorFromSuperdoc(superdoc)
}

function getActiveEditor() {
  return getActiveEditorFromSuperdoc(superdoc) as any
}

function getNodeIdFromElement(el: Element): string | null {
  return resolveStableNodeIdFromDom(el, getActiveEditor())
}

function getNodeIdFromPointer(clientX: number, clientY: number): string | null {
  return resolveNodeIdFromPointer(
    clientX,
    clientY,
    getActiveEditor(),
    getPresentationEditor()
  )
}

function getBlockTargetAtPointer(clientX: number, clientY: number) {
  return resolveBlockTargetFromPointer(
    clientX,
    clientY,
    getActiveEditor(),
    getPresentationEditor()
  )
}

function notifyHighlightSaved() {
  if (!isHighlightToolbarMode() || !isReady.value) return

  const signature = getHighlightSignature(getActiveEditor())
  if (signature === lastHighlightSignature) return
  lastHighlightSignature = signature
  emit('highlightSaved')
}

function applyContextMenuHighlight(color: string | null): boolean {
  if (!applyTextHighlight(getActiveEditor(), color)) return false
  nextTick(() => notifyHighlightSaved())
  return true
}

function getFirstSection(editor: any) {
  const list = editor.doc.sections.list()
  return list.items?.[0] ?? null
}

function syncHeaderFooterContext() {
  const editor = getActiveEditor()
  if (!editor?.doc) {
    differentFirstPageEnabled.value = false
    return
  }

  const section = getFirstSection(editor)
  differentFirstPageEnabled.value = Boolean(section?.titlePage)
}

function attachHighlightOnlyGuard(editor: unknown) {
  if (!isHighlightToolbarMode()) return
  wireHighlightOnlyGuard(editor as Parameters<typeof wireHighlightOnlyGuard>[0])
}

function handleEditorReady() {
  syncHeaderFooterContext()
  syncDifferentFirstPageToolbar()
  syncPageBreakToolbar()
  syncPageNumberToolbar()
  superdoc?.toolbar?.updateToolbarState?.()
  nextTick(() => {
    injectMarginControls()
    syncMarginControls()
    wirePageNumberDropdownGuard()
    wireCommentCopyLinkButtons()
  })
  isReady.value = true
  lastHighlightSignature = getHighlightSignature(getActiveEditor())
  emit('ready')
}

function syncEditorChrome() {
  syncHeaderFooterContext()
  syncDifferentFirstPageToolbar()
  syncPageBreakToolbar()
  syncPageNumberToolbar()
  superdoc?.toolbar?.updateToolbarState?.()
  nextTick(() => {
    injectMarginControls()
    syncMarginControls()
    wirePageNumberDropdownGuard()
    wireCommentCopyLinkButtons()
  })
}

function handleEditorUpdate(params: any) {
  if (params?.surface) {
    hfSurface.value = params.surface
    if (params.surface === 'body') {
      hfVariant.value = null
      headerFooterEditor = null
    } else if (params.sectionType !== undefined) {
      hfVariant.value = params.sectionType
    }
    if (params.surface === 'header' || params.surface === 'footer') {
      const hfEditor = params.sourceEditor ?? params.editor
      if (isHeaderFooterEditor(hfEditor)) {
        headerFooterEditor = hfEditor
      }
      if (hfEditor) {
        attachAutoParagraphDirection(hfEditor, { bootstrap: true })
        attachPageNumberKeyboardEscape(hfEditor)
      }
    }
  }

  syncHeaderFooterContext()
  syncDifferentFirstPageToolbar()
  syncPageBreakToolbar()
  syncPageNumberToolbar()
  notifyHighlightSaved()
  emit('update')
}

function syncDifferentFirstPageToolbar() {
  const item = superdoc?.toolbar?.getToolbarItemByName?.('differentFirstPage')
  if (!item) return

  const editor = getActiveEditor()
  if (!editor?.doc) {
    item.active.value = false
    item.setDisabled(!canMutateDocument())
    return
  }

  const section = getFirstSection(editor)
  item.active.value = Boolean(section?.titlePage)
  item.setDisabled(!canMutateDocument())
}

function syncPageBreakToolbar() {
  const item = superdoc?.toolbar?.getToolbarItemByName?.('pageBreak')
  if (!item) return

  const editor = getActiveEditor()
  item.setDisabled(!canMutateDocument() || !editor?.commands?.insertPageBreak)
}

function isAtDocumentContentStart(editor: any) {
  const { $from } = editor.state.selection
  if ($from.index(0) !== 0) return false

  const blockStart = $from.start(1)
  const cursorPos = $from.pos
  const textBefore = editor.state.doc.textBetween(blockStart, cursorPos, '', '\ufffc')
  if (textBefore.replace(/\u200b/g, '').length > 0) return false

  let hasBreakBefore = false
  editor.state.doc.nodesBetween(blockStart, cursorPos, (node: any) => {
    if (node.type.name === 'hardBreak' || node.type.name === 'lineBreak') {
      hasBreakBefore = true
      return false
    }
    return undefined
  })
  return !hasBreakBefore
}

function safeEditorCommand(fn: () => unknown) {
  try {
    return fn() === true
  } catch {
    return false
  }
}

function splitAfterPageBreakLikeEnter(editor: any) {
  const attempts = [
    () => editor.commands?.splitRunToParagraph?.(),
    () => editor.commands?.createParagraphNear?.(),
    () => editor.commands?.liftEmptyBlock?.(),
    () => editor.commands?.splitBlock?.(),
  ]
  for (const attempt of attempts) {
    if (safeEditorCommand(attempt)) return true
  }
  return false
}

function focusEditor(editor: any) {
  editor.view?.focus?.()
  editor.presentationEditor?.focus?.()
}

function insertLeadingPageBreak(editor: any) {
  const ZWSP = '\u200b'

  const inserted = editor.chain
    ? safeEditorCommand(() => editor.chain().insertContent(ZWSP).insertPageBreak().run())
    : safeEditorCommand(() => editor.commands.insertContent?.(ZWSP)) &&
      safeEditorCommand(() => editor.commands.insertPageBreak())

  if (!inserted) return false

  safeEditorCommand(() => splitAfterPageBreakLikeEnter(editor))
  focusEditor(editor)
  return true
}

function insertPageBreak() {
  if (!canMutateDocument()) return

  const editor = getActiveEditor()
  if (!editor?.commands?.insertPageBreak) return

  const atDocumentStart = isAtDocumentContentStart(editor)
  const inserted = atDocumentStart ? insertLeadingPageBreak(editor) : editor.commands.insertPageBreak()
  if (!inserted) return

  emit('update')
}

function ensureFirstPageHeaderFooterParts(editor: any, sectionAddress: unknown) {
  for (const headerFooterKind of ['header', 'footer']) {
    const slot = {
      kind: 'headerFooterSlot',
      section: sectionAddress,
      headerFooterKind,
      variant: 'first',
    }
    const existing = editor.doc.headerFooters.resolve({ target: slot })
    if (existing.status !== 'none') continue

    const created = editor.doc.headerFooters.parts.create({
      kind: headerFooterKind,
    })
    if (!created?.success) continue

    editor.doc.headerFooters.refs.set({
      target: slot,
      refId: created.refId,
    })
  }
}

function toggleDifferentFirstPage() {
  if (!canMutateDocument()) return

  const editor = getActiveEditor()
  if (!editor?.doc) return

  const section = getFirstSection(editor)
  if (!section?.address) return

  const enabling = !section.titlePage
  const result = editor.doc.sections.setTitlePage({
    target: section.address,
    enabled: enabling,
  })
  if (!result?.success) return

  if (enabling) {
    ensureFirstPageHeaderFooterParts(editor, section.address)
  }

  syncHeaderFooterContext()
  syncDifferentFirstPageToolbar()
  superdoc?.toolbar?.updateToolbarState?.()
  emit('update')
}

function buildToolbarConfig() {
  const config: {
    hideButtons: boolean
    responsiveToContainer: boolean
    excludeItems: string[]
    fonts: typeof SUPERDOC_FONT_CONFIGS
    groups?: Record<string, string[]>
    customButtons?: Record<string, unknown>[]
  } = {
    hideButtons: false,
    responsiveToContainer: true,
    excludeItems: ['documentMode'],
    fonts: SUPERDOC_FONT_CONFIGS,
  }

  if (isHighlightToolbarMode()) {
    return {
      ...config,
      hideButtons: false,
      responsiveToContainer: false,
      groups: {
        left: ['highlight'],
        center: [],
        right: [],
      },
    }
  }

  if (props.hideToolbar) {
    return config
  }

  const customButtons: Record<string, unknown>[] = []

  if (props.showOpenDocx) {
    customButtons.push({
      type: 'button',
      name: 'openDocx',
      group: 'left',
      icon: OPEN_DOCX_ICON,
      tooltip: props.labels.openDocxFile,
      allowWithoutEditor: true,
      restoreEditorFocus: false,
      command: () => docxFileInputRef.value?.click(),
      attributes: {
        ariaLabel: props.labels.openDocxFile,
        'test-id': 'document-open-docx-button',
      },
    })
  }

  if (props.showDifferentFirstPage) {
    customButtons.push({
      type: 'button',
      name: 'differentFirstPage',
      group: 'left',
      icon: DIFFERENT_FIRST_PAGE_ICON,
      tooltip: props.labels.differentFirstPage,
      allowWithoutEditor: false,
      restoreEditorFocus: false,
      active: false,
      command: () => toggleDifferentFirstPage(),
      attributes: {
        ariaLabel: props.labels.differentFirstPage,
        'test-id': 'document-different-first-page-button',
      },
    })
  }

  if (props.showPageBreak) {
    customButtons.push({
      type: 'button',
      name: 'pageBreak',
      group: 'left',
      icon: PAGE_BREAK_ICON,
      tooltip: props.labels.pageBreak,
      allowWithoutEditor: false,
      restoreEditorFocus: true,
      command: () => insertPageBreak(),
      attributes: {
        ariaLabel: props.labels.pageBreak,
        'test-id': 'document-page-break-button',
      },
    })
  }

  if (props.showPageNumber) {
    customButtons.push({
      type: 'dropdown',
      name: 'pageNumber',
      group: 'left',
      icon: PAGE_NUMBER_ICON,
      tooltip: props.labels.pageNumber,
      allowWithoutEditor: false,
      restoreEditorFocus: false,
      hasCaret: true,
      dropdownValueKey: 'key',
      command: handlePageNumberToolbarCommand,
      options: [
        {
          label: props.labels.pageNumberAtCursor,
          key: 'custom',
          props: { 'data-item': 'btn-pageNumber-option-custom', 'test-id': 'document-page-number-custom' },
        },
        {
          label: props.labels.pageNumberLeft,
          key: 'left',
          props: { 'data-item': 'btn-pageNumber-option-left', 'test-id': 'document-page-number-left' },
        },
        {
          label: props.labels.pageNumberCenter,
          key: 'center',
          props: { 'data-item': 'btn-pageNumber-option-center', 'test-id': 'document-page-number-center' },
        },
        {
          label: props.labels.pageNumberRight,
          key: 'right',
          props: { 'data-item': 'btn-pageNumber-option-right', 'test-id': 'document-page-number-right' },
        },
      ],
      attributes: {
        ariaLabel: props.labels.pageNumber,
        'test-id': 'document-page-number-button',
      },
    })
  }

  if (props.showAiWrite) {
    customButtons.push({
      type: 'button',
      name: 'aiWrite',
      group: 'left',
      icon: AI_WRITE_ICON,
      tooltip: props.labels.aiWrite,
      allowWithoutEditor: false,
      restoreEditorFocus: false,
      command: () => openAiPrompt(),
      attributes: {
        ariaLabel: props.labels.aiWrite,
        'test-id': 'document-ai-write-button',
      },
    })
  }

  if (customButtons.length > 0) {
    config.customButtons = customButtons
  }

  return config
}

async function exportDocx(fileName = 'document.docx') {
  if (!superdoc) throw new Error('SuperDoc not initialized')
  const blobs = await superdoc.exportEditorsToDOCX({ commentsType: 'external' })
  const blob = Array.isArray(blobs) ? blobs[0] : blobs
  if (!blob) throw new Error('SuperDoc export produced no document')
  const restored = await restoreOleObjectsInDocx(blob, oleRestoreEntries)
  const safeName = fileName.toLowerCase().endsWith('.docx') ? fileName : `${fileName}.docx`
  return new File([restored], safeName, { type: DOCX_MIME })
}

function isEmpty() {
  if (!superdoc) return true
  const html = superdoc.getHTML?.() ?? []
  const text = (Array.isArray(html) ? html.join('') : String(html))
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\u200b/g, '')
    .trim()
  return text.length === 0
}

function insertContent(content: string, contentType: SuperDocAiWriteResult['contentType'] = 'markdown') {
  const inserted = insertAiContent(getActiveEditor(), content, contentType)
  if (inserted) emit('update')
  return inserted
}

let lastSelectedCommentId = ''

function selectComment(commentId: string | null | undefined) {
  const id = commentId?.trim()
  if (!id || id === lastSelectedCommentId) return
  lastSelectedCommentId = id
  emit('commentSelected', id)
}

async function scrollToComment(commentId: string): Promise<boolean> {
  if (!superdoc || !commentId.trim()) return false
  for (let i = 0; i < 20; i++) {
    if (superdoc.scrollToComment(commentId)) return true
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

async function scrollToElement(nodeId: string, offset?: number): Promise<boolean> {
  if (!superdoc || !nodeId.trim()) return false

  const editor = getActiveEditor()
  const targetId =
    (editor ? findCanonicalNodeIdInDoc(editor, nodeId.trim()) : null) ?? nodeId.trim()
  const normalizedOffset =
    typeof offset === 'number' && Number.isFinite(offset) && offset > 0
      ? Math.floor(offset)
      : undefined

  for (let i = 0; i < 40; i++) {
    const presentationEditor = getPresentationEditor()
    const activeEditor = getActiveEditor()
    if (presentationEditor?.scrollToPositionAsync && activeEditor) {
      const pos = findBlockScrollPos(activeEditor, targetId, normalizedOffset)
      if (
        pos != null &&
        (await presentationEditor.scrollToPositionAsync(pos, {
          behavior: 'auto',
          block: 'center',
        }))
      ) {
        return true
      }
    }

    if (!normalizedOffset && (await superdoc.scrollToElement(targetId))) return true

    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

function ensureNodeContextMenuShell(): HTMLElement {
  if (nodeContextMenuEl) return nodeContextMenuEl

  const menu = document.createElement('div')
  menu.setAttribute('role', 'menu')
  menu.style.cssText =
    'position:fixed;z-index:1000;display:none;min-width:190px;padding:4px;background:#ffffff;' +
    'border:1px solid #e2e8f0;border-radius:0.5rem;box-shadow:0 4px 12px rgba(15,23,42,0.15);font-family:inherit;'
  document.body.appendChild(menu)
  nodeContextMenuEl = menu
  return menu
}

const CONTEXT_MENU_BUTTON_STYLE =
  'display:flex;align-items:center;gap:0.5rem;width:100%;padding:0.5rem 0.625rem;border:0;' +
  'background:transparent;border-radius:0.375rem;cursor:pointer;font-size:0.8125rem;color:#334155;text-align:left;'

function createContextMenuButton(label: string, onClick: () => void, iconHtml = '') {
  const button = document.createElement('button')
  button.type = 'button'
  button.style.cssText = CONTEXT_MENU_BUTTON_STYLE
  button.addEventListener('mouseenter', () => {
    button.style.background = '#f1f5f9'
  })
  button.addEventListener('mouseleave', () => {
    button.style.background = 'transparent'
  })
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    event.preventDefault()
    onClick()
  })

  if (iconHtml) {
    const icon = document.createElement('span')
    icon.style.cssText = 'display:inline-flex;flex-shrink:0;color:#64748b;'
    icon.innerHTML = iconHtml
    button.appendChild(icon)
  }

  const text = document.createElement('span')
  text.textContent = label
  button.appendChild(text)
  return button
}

function createContextMenuDivider() {
  const divider = document.createElement('div')
  divider.style.cssText = 'height:1px;background:#e2e8f0;margin:4px 0;'
  return divider
}

function populateNodeContextMenu(options: { showCopyLink: boolean; showHighlight: boolean }) {
  const menu = ensureNodeContextMenuShell()
  menu.replaceChildren()

  if (options.showHighlight) {
    const heading = document.createElement('div')
    heading.textContent = props.labels.highlightText
    heading.style.cssText = 'padding:0.375rem 0.625rem 0.25rem;font-size:0.75rem;font-weight:600;color:#64748b;'
    menu.appendChild(heading)

    const grid = document.createElement('div')
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1.75rem);gap:0.375rem;padding:0.25rem 0.625rem 0.5rem;'
    for (const swatch of HIGHLIGHT_SWATCHES) {
      const button = document.createElement('button')
      button.type = 'button'
      button.title = swatch.label
      button.setAttribute('aria-label', swatch.label)
      button.style.cssText =
        `width:1.75rem;height:1.75rem;border:1px solid #cbd5e1;border-radius:0.375rem;background:${swatch.color};cursor:pointer;`
      button.addEventListener('click', (event) => {
        event.stopPropagation()
        event.preventDefault()
        if (applyContextMenuHighlight(swatch.color)) emit('update')
        hideNodeContextMenu()
      })
      grid.appendChild(button)
    }
    menu.appendChild(grid)

    menu.appendChild(
      createContextMenuButton(props.labels.removeHighlight, () => {
        if (applyContextMenuHighlight(null)) emit('update')
        hideNodeContextMenu()
      })
    )
  }

  if (options.showCopyLink && activeContextMenuNodeId) {
    if (options.showHighlight) menu.appendChild(createContextMenuDivider())
    menu.appendChild(
      createContextMenuButton(
        props.labels.copyParagraphLink,
        () => {
          emit('copyNodeLinkRequest', {
            nodeId: activeContextMenuNodeId!,
            offset: activeContextMenuNodeOffset ?? undefined,
          })
          hideNodeContextMenu()
        },
        COMMENT_COPY_LINK_ICON
      )
    )
  }
}

function hideNodeContextMenu() {
  if (nodeContextMenuEl) nodeContextMenuEl.style.display = 'none'
  activeContextMenuNodeId = null
  activeContextMenuNodeOffset = null
}

function showNodeContextMenu(
  x: number,
  y: number,
  options: { showCopyLink: boolean; showHighlight: boolean },
  nodeId: string | null = null,
  offset = 0
) {
  activeContextMenuNodeId = nodeId
  activeContextMenuNodeOffset = offset > 0 ? offset : null
  populateNodeContextMenu(options)

  const menu = ensureNodeContextMenuShell()
  menu.style.left = '0px'
  menu.style.top = '0px'
  menu.style.display = 'block'
  const rect = menu.getBoundingClientRect()
  const maxX = Math.max(4, window.innerWidth - rect.width - 4)
  const maxY = Math.max(4, window.innerHeight - rect.height - 4)
  menu.style.left = `${Math.min(Math.max(4, x), maxX)}px`
  menu.style.top = `${Math.min(Math.max(4, y), maxY)}px`
}

function onEditorContextMenu(event: MouseEvent) {
  const root = editorRef.value
  if (!root) return

  const target = event.target
  if (!(target instanceof Node) || !root.contains(target)) return

  const pointerTarget = getBlockTargetAtPointer(event.clientX, event.clientY)
  const nodeId =
    pointerTarget?.nodeId ??
    (target instanceof Element ? getNodeIdFromElement(target) : null)
  const showHighlight = isHighlightToolbarMode() && hasHighlightableSelection(getActiveEditor())
  const showCopyLink = Boolean(nodeId)

  if (!showHighlight && !showCopyLink) {
    hideNodeContextMenu()
    return
  }

  event.preventDefault()
  event.stopPropagation()
  showNodeContextMenu(
    event.clientX,
    event.clientY,
    { showCopyLink, showHighlight },
    nodeId,
    pointerTarget?.offset ?? 0
  )
}

function onNodeContextMenuOutsideClick(event: MouseEvent) {
  if (!nodeContextMenuEl || nodeContextMenuEl.style.display === 'none') return
  const target = event.target
  if (target instanceof Node && nodeContextMenuEl.contains(target)) return
  hideNodeContextMenu()
}

function onNodeContextMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') hideNodeContextMenu()
}

function wireNodeContextMenu() {
  document.addEventListener('contextmenu', onEditorContextMenu, true)
  document.addEventListener('mousedown', onNodeContextMenuOutsideClick, true)
  document.addEventListener('keydown', onNodeContextMenuKeydown, true)
  window.addEventListener('scroll', hideNodeContextMenu, true)
  window.addEventListener('resize', hideNodeContextMenu)

  removeNodeContextMenuListeners = () => {
    document.removeEventListener('contextmenu', onEditorContextMenu, true)
    document.removeEventListener('mousedown', onNodeContextMenuOutsideClick, true)
    document.removeEventListener('keydown', onNodeContextMenuKeydown, true)
    window.removeEventListener('scroll', hideNodeContextMenu, true)
    window.removeEventListener('resize', hideNodeContextMenu)
  }
}

function disconnectNodeContextMenu() {
  removeNodeContextMenuListeners?.()
  removeNodeContextMenuListeners = null
  nodeContextMenuEl?.remove()
  nodeContextMenuEl = null
  activeContextMenuNodeId = null
}

function hasComments(): boolean {
  if (!superdoc) return false

  const editor = getActiveEditor() as {
    doc?: { comments?: { list?: () => unknown[] } }
  } | null

  try {
    const list = editor?.doc?.comments?.list?.()
    if (Array.isArray(list) && list.length > 0) return true
  } catch {
    // Fall through to DOM check.
  }

  const root = document.getElementById('editor')
  if (!root) return false

  return Boolean(
    root.querySelector(
      '[data-comment-thread-id], [data-comment-id], [data-comment-ids], .superdoc-comment-highlight',
    ),
  )
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element)) return
  const el = target.closest('[data-comment-thread-id], [data-comment-id], .superdoc-comment-highlight')
  if (!el) return
  const id =
    el.getAttribute('data-comment-thread-id')?.trim() ||
    el.getAttribute('data-comment-id')?.trim() ||
    el.getAttribute('data-comment-ids')?.split(',')[0]?.trim() ||
    el.getAttribute('data-comment-imported-ids')?.split(',')[0]?.trim()
  if (id) selectComment(id)
}

defineExpose({
  exportDocx,
  isEmpty,
  isReady,
  insertContent,
  getPageStyles,
  updatePageStyle,
  setPageMargin,
  scrollToComment,
  scrollToElement,
  hasComments,
})

function getCommentIdFromDialog(dialog: Element): string | null {
  const threadId = dialog.getAttribute('data-comment-thread-id')?.trim()
  if (threadId && threadId !== 'pending') return threadId

  const instanceId = dialog.getAttribute('data-comment-instance-id')?.trim()
  if (instanceId && instanceId !== 'pending') return instanceId

  const host = dialog.closest('[data-comment-thread-id], [data-comment-id]')
  const hostThreadId = host?.getAttribute('data-comment-thread-id')?.trim()
  if (hostThreadId && hostThreadId !== 'pending') return hostThreadId

  const hostCommentId = host?.getAttribute('data-comment-id')?.trim()
  if (hostCommentId && hostCommentId !== 'pending') return hostCommentId

  return null
}

function injectCommentCopyLinkButton(dialog: HTMLElement) {
  if (dialog.hasAttribute(COMMENT_COPY_LINK_ATTR)) return

  const commentId = getCommentIdFromDialog(dialog)
  if (!commentId) return

  const header = dialog.querySelector('.comment-header')
  if (!header) return

  dialog.setAttribute(COMMENT_COPY_LINK_ATTR, 'true')

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'superdoc-comment-copy-link-btn'
  button.title = props.labels.copyCommentLink
  button.setAttribute('aria-label', props.labels.copyCommentLink)
  button.innerHTML = COMMENT_COPY_LINK_ICON
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    event.preventDefault()
    emit('copyCommentLinkRequest', commentId)
  })

  const overflowMenu = header.querySelector('.overflow-menu')
  if (overflowMenu) {
    header.insertBefore(button, overflowMenu)
  } else {
    header.appendChild(button)
  }
}

function syncCommentCopyLinkButtons() {
  if (!commentsAreEnabled() || !editorRef.value) return
  editorRef.value
    .querySelectorAll('.comments-dialog')
    .forEach((dialog) => injectCommentCopyLinkButton(dialog as HTMLElement))
}

function wireCommentCopyLinkButtons() {
  if (!commentsAreEnabled() || !editorRef.value) return

  syncCommentCopyLinkButtons()
  commentCopyLinkObserver?.disconnect()
  commentCopyLinkObserver = new MutationObserver(() => syncCommentCopyLinkButtons())
  commentCopyLinkObserver.observe(editorRef.value, { childList: true, subtree: true })
}

function disconnectCommentCopyLinkButtons() {
  commentCopyLinkObserver?.disconnect()
  commentCopyLinkObserver = null
}


onMounted(async () => {
  const commentsEnabled = commentsAreEnabled()
  if (commentsEnabled) {
    document.addEventListener('click', onDocumentClick, true)
  }
  wireNodeContextMenu()

  const resolved: SuperDocDocumentSource = resolveDocument(props.document) ?? null
  let documentSource: SuperDocDocumentSource = resolved
  oleRestoreEntries = []
  if (isDocxSource(resolved) && resolved) {
    try {
      const prepared = await prepareDocxWithOlePreviews(resolved)
      documentSource = prepared.document
      oleRestoreEntries = prepared.entries
      if (prepared.replacedCount > 0) {
        console.info(
          `[superdoc-editor] Prepared ${prepared.replacedCount} OLE/Visio object(s) as image previews for rendering`,
        )
      }
    } catch (error) {
      console.warn('[superdoc-editor] OLE preview preparation failed; loading original document', error)
      documentSource = resolved
      oleRestoreEntries = []
    }
  }

  superdoc = new SuperDoc({
    selector: '#editor',
    ...(showToolbarChrome() ? { toolbar: '#toolbar' } : {}),
    document: documentSource as any,
    documentMode: effectiveDocumentMode() as any,
    role: effectiveRole() as any,
    contained: true,
    rulers: showToolbarChrome() && !isHighlightToolbarMode(),
    user: props.user,
    comments: { visible: commentsEnabled },
    ...(isViewReviewMode() ? { allowSelectionInViewMode: true } : {}),
    ...(isHighlightToolbarMode() ? { disableContextMenu: true } : {}),
    modules: {
      toolbar: buildToolbarConfig() as any,
      ...(commentsEnabled
        ? {
            comments: {
              displayMode: 'inline',
              permissionResolver: ({ permission, defaultDecision }) => {
                if (permission.startsWith('comment.')) {
                  return props.canComment ? defaultDecision : false
                }
                return defaultDecision
              },
            },
          }
        : { comments: false }),
      ...(props.trackChangesVisible ? { trackChanges: { visible: true } } : {}),
    },
    onReady: () => {
      attachHighlightOnlyGuard(getActiveEditor())
      handleEditorReady()
    },
    onEditorCreate: ({ editor }: { editor?: unknown }) => {
      attachHighlightOnlyGuard(editor)
      syncEditorChrome()
    },
    onEditorUpdate: handleEditorUpdate,
    ...(commentsEnabled
      ? {
          onCommentsUpdate: (params) => {
            if ('activeCommentId' in params) {
              selectComment((params as { activeCommentId?: string | null }).activeCommentId)
            }
            if (params.type === 'add' || params.type === 'update') {
              const comment = params.comment as { commentId?: string; importedId?: string } | undefined
              emit('commentSaved', {
                type: params.type,
                commentId: comment?.commentId ?? comment?.importedId,
              })
            }
            nextTick(() => syncCommentCopyLinkButtons())
          },
        }
      : {}),
  })
  disconnectAutoDirection = wireAutoParagraphDirection(superdoc)
  disconnectPageNumberKeyboard = wirePageNumberKeyboardEscape(superdoc)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick, true)
  disconnectAutoDirection?.()
  disconnectAutoDirection = null
  disconnectPageNumberKeyboard?.()
  disconnectPageNumberKeyboard = null
  disconnectCommentCopyLinkButtons()
  disconnectNodeContextMenu()
  removeMarginControls()
  removePageNumberDropdownGuard?.()
  removePageNumberDropdownGuard = null
  clearPageNumberNotice()
  headerFooterEditor = null
  oleRestoreEntries = []
  aiPromptOpen.value = false
  aiWriting.value = false
  superdoc?.destroy()
  superdoc = null
})
</script>

<style scoped>
.hidden {
  display: none;
}

.superdoc-editor {
  --bg: #ffffff;
  --border: #e2e8f0;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
  overflow: auto;
  margin-top:40px
}

#toolbar.sd-highlight-toolbar {
  flex-shrink: 0;
  width: 100%;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

#toolbar.sd-highlight-toolbar :deep(.superdoc-toolbar) {
  justify-content: flex-start;
  min-height: 2.5rem;
  padding: 0.25rem 0.5rem;
}

#toolbar {
  position: sticky;
  top: 0;
  z-index: 50;
  flex-shrink: 0;
  width: 100%;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  overflow: visible;
}

#toolbar :deep(.superdoc-toolbar) {
  background: var(--bg);
  width: 100%;
  flex-wrap: wrap;
  justify-content: flex-start;
  row-gap: 4px;
  column-gap: 4px;
}

#toolbar :deep(.button-group),
#toolbar :deep(.superdoc-toolbar-group-side) {
  flex-wrap: wrap;
}

#toolbar :deep(.doc-margin-group) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
  border-left: 1px solid var(--border);
}

#toolbar :deep(.doc-margin-ctrl) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

#toolbar :deep(.doc-margin-label) {
  font-size: 10px;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
}

#toolbar :deep(.doc-margin-slider) {
  width: 72px;
  accent-color: #000;
  cursor: pointer;
  vertical-align: middle;
}

#toolbar :deep(.doc-margin-val) {
  font-size: 10px;
  font-weight: 600;
  color: #111827;
  min-width: 30px;
  white-space: nowrap;
}

.sd-hf-context-banner {
  flex-shrink: 0;
  width: 100%;
  padding: 6px 12px;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #334155;
  background: #f1f5f9;
  border-bottom: 1px solid var(--border);
}

.sd-ai-write-panel {
  flex-shrink: 0;
  width: 90%;
  padding: 10px 12px 12px;
  margin:20px;
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
}

.sd-ai-write-label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #334155;
}

.sd-ai-write-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.4;
  resize: vertical;
}

.sd-ai-write-input:focus {
  outline: 2px solid #0f172a;
  outline-offset: 1px;
}

.sd-ai-write-input:disabled {
  color: #64748b;
  background: #f1f5f9;
}

.sd-ai-write-error {
  margin: 8px 0 0;
  font-size: 0.75rem;
  color: #b91c1c;
}

.sd-ai-write-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.sd-ai-write-btn {
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  background: #ffffff;
  color: #334155;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.sd-ai-write-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.sd-ai-write-btn-primary {
  border-color: #0f172a;
  background: #0f172a;
  color: #ffffff;
}

#editor {
  flex: 1;
  min-height: 0;
  overflow: visible;
  margin-inline: auto;
  align-self: center;
  position: relative;
  z-index: 1;
}

#editor :deep(.superdoc__document) {
  display: flex;
  justify-content: center;
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
}

#editor :deep(.superdoc__sub-document) {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: auto;
}

#editor :deep(.super-editor-container) {
  width: auto;
  max-width: 100%;
  margin-inline: auto;
}

#editor :deep(.super-editor),
#editor :deep(.presentation-editor) {
  width: auto !important;
  max-width: 100%;
  min-height: 0;
  margin-inline: auto;
}

#editor :deep(.presentation-editor__viewport) {
  min-height: 0;
}

#editor :deep(.presentation-editor__viewport),
#editor :deep(.presentation-editor__pages),
#editor :deep(.superdoc-layout) {
  margin-inline: auto;
}

#editor :deep(.superdoc-layout) {
  width: fit-content;
  max-width: 100%;
  unicode-bidi: plaintext;
}

#editor :deep([dir='rtl']),
#editor :deep(.sd-header-footer[dir='rtl']),
#editor :deep(.sd-header-footer [dir='rtl']) {
  direction: rtl;
  unicode-bidi: plaintext;
}

#editor :deep([dir='ltr']) {
  direction: ltr;
}

#editor :deep(.superdoc__comments-layer),
#editor :deep(.comments-layer) {
  z-index: 60 !important;
}

#editor :deep(.superdoc__tools) {
  right: auto !important;
  left: 0px !important;
  z-index: 100 !important;
}

@media (max-width: 768px) {
  #editor :deep(.superdoc__tools) {
    left: 0 !important;
  }
}

#editor :deep(.superdoc__compact-comment-popover),
#editor :deep(.floating-comment),
#editor :deep(.floating-comments),
#editor :deep(.comment) {
  z-index: 70 !important;
}

#editor :deep(.comment-header) {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
}

#editor :deep(.superdoc-comment-copy-link-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: auto;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

#editor :deep(.superdoc-comment-copy-link-btn:hover) {
  background: #f1f5f9;
  color: #334155;
}

#editor :deep(.superdoc--with-sidebar .superdoc__document),
#editor :deep(.superdoc--with-sidebar .superdoc__sub-document) {
  width: 100% !important;
  max-width: 100% !important;
}
</style>
