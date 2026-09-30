<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { loadDocumentRenderer } from '../engines'
import {
  getDocumentExtension,
  getDocumentKind,
  isSupportedDocumentName,
} from '../formats'
import type {
  DocumentLoadContext,
  DocumentProgress,
  DocumentRendererController,
  DocumentViewerInstance,
  DocumentViewerProps,
  DocumentZoomState,
} from '../types'

defineOptions({ name: 'DocumentViewer' })

const props = withDefaults(defineProps<DocumentViewerProps>(), {
  height: '100%',
  strict: true,
  emptyText: '选择一个文档或图片文件开始预览',
  errorText: '文档加载失败，请检查文件是否受损',
})

const emit = defineEmits<{
  'load-start': [context: DocumentLoadContext]
  'load-complete': [context: DocumentLoadContext]
  'unload-start': [context: DocumentLoadContext]
  'unload-complete': [context: DocumentLoadContext]
  progress: [progress: DocumentProgress]
  'zoom-change': [state: DocumentZoomState]
  error: [message: string]
}>()

const scrollContainer = ref<HTMLDivElement | null>(null)
const renderRoot = ref<HTMLDivElement | null>(null)
const status = ref<'empty' | 'loading' | 'ready' | 'error' | 'unsupported'>('empty')
const errorMessage = ref('')
const progress = ref<DocumentProgress>({ current: 0, total: 1 })
const pageCount = ref(0)
const zoom = ref(1)
const rotation = ref(0)

let mounted = false
let loadSequence = 0
let abortController: AbortController | null = null
let rendererController: DocumentRendererController | null = null
let activeContext: DocumentLoadContext | null = null
let sourceBuffer: ArrayBuffer | null = null

const sourceName = computed(() => {
  if (props.file?.name) return props.file.name
  if (props.filename) return props.filename
  if (!props.url) return ''
  try {
    const baseUrl = typeof window === 'undefined' ? 'http://localhost/' : window.location.href
    return decodeURIComponent(new URL(props.url, baseUrl).pathname.split('/').pop() || '')
  } catch {
    return props.url
  }
})

const extension = computed(() => getDocumentExtension(sourceName.value))
const kind = computed(() => getDocumentKind(extension.value))
const hasSource = computed(() => Boolean(props.file || props.url))
const isSupported = computed(() => !props.strict || isSupportedDocumentName(sourceName.value))
const normalizedHeight = computed(() => (
  typeof props.height === 'number' ? `${props.height}px` : props.height
))
const theme = computed(() => props.options?.theme ?? 'light')
const showToolbar = computed(() => props.options?.toolbar !== false)
const minZoom = computed(() => Math.max(0.25, props.options?.minZoom ?? 0.5))
const maxZoom = computed(() => Math.max(minZoom.value, props.options?.maxZoom ?? 2.5))
const progressPercent = computed(() => {
  if (!progress.value.total) return 0
  return Math.min(100, Math.round(progress.value.current / progress.value.total * 100))
})
const stateMessage = computed(() => {
  if (status.value === 'error') return errorMessage.value
  if (status.value === 'unsupported') {
    return extension.value
      ? `暂不支持 .${extension.value}；请选择受支持的文档或图片格式。`
      : '无法识别文件类型，请通过 filename 属性提供扩展名。'
  }
  return props.emptyText
})

const createLoadContext = (byteLength?: number): DocumentLoadContext | null => {
  if (!kind.value) return null
  return {
    filename: sourceName.value,
    extension: extension.value,
    kind: kind.value,
    byteLength,
  }
}

async function destroyActive(reason: 'replace' | 'destroy' = 'replace') {
  abortController?.abort(reason)
  abortController = null
  const previous = activeContext
  if (previous) emit('unload-start', previous)
  await rendererController?.destroy()
  rendererController = null
  sourceBuffer = null
  activeContext = null
  renderRoot.value?.replaceChildren()
  if (previous) emit('unload-complete', previous)
}

async function readSource(signal: AbortSignal) {
  if (props.file) return props.file.arrayBuffer()
  if (!props.url) throw new Error('没有可读取的文档来源。')
  const response = await fetch(props.url, {
    ...props.options?.fetchOptions,
    signal,
  })
  if (!response.ok) throw new Error(`文档请求失败：HTTP ${response.status}`)
  return response.arrayBuffer()
}

async function reload() {
  if (!mounted) return
  const sequence = ++loadSequence
  await destroyActive()
  pageCount.value = 0
  rotation.value = 0
  errorMessage.value = ''
  progress.value = { current: 0, total: 1 }

  if (!hasSource.value) {
    status.value = 'empty'
    return
  }
  if (!isSupported.value || !kind.value) {
    status.value = 'unsupported'
    return
  }

  await nextTick()
  const target = renderRoot.value
  const context = createLoadContext()
  if (!target || !context) return

  const controller = new AbortController()
  abortController = controller
  status.value = 'loading'
  emit('load-start', context)

  try {
    const buffer = await readSource(controller.signal)
    if (controller.signal.aborted || sequence !== loadSequence) return
    const renderer = await loadDocumentRenderer(context.kind)
    if (controller.signal.aborted || sequence !== loadSequence) return

    const instance = await renderer({
      container: target,
      buffer,
      extension: context.extension,
      filename: context.filename,
      signal: controller.signal,
      options: props.options ?? {},
      onProgress(nextProgress) {
        progress.value = nextProgress
        emit('progress', nextProgress)
      },
    })
    if (controller.signal.aborted || sequence !== loadSequence) {
      await instance.destroy()
      return
    }

    rendererController = instance
    sourceBuffer = buffer
    pageCount.value = instance.pageCount ?? 0
    activeContext = {
      ...context,
      byteLength: buffer.byteLength,
      pageCount: instance.pageCount,
    }
    status.value = 'ready'
    emit('load-complete', activeContext)
  } catch (error) {
    if (controller.signal.aborted || sequence !== loadSequence) return
    console.error('[document-viewer-vue3] 文档解析失败：', error)
    const message = props.errorText
    errorMessage.value = message
    status.value = 'error'
    emit('error', message)
  }
}

function getZoomState(): DocumentZoomState {
  return { scale: zoom.value, percent: Math.round(zoom.value * 100) }
}

function setZoom(scale: number) {
  zoom.value = Math.min(maxZoom.value, Math.max(minZoom.value, Number(scale.toFixed(2))))
  const next = getZoomState()
  emit('zoom-change', next)
  return next
}

const zoomIn = () => setZoom(zoom.value + 0.1)
const zoomOut = () => setZoom(zoom.value - 0.1)
const resetZoom = () => setZoom(props.options?.initialZoom ?? 1)

function getRotation() {
  return rendererController?.getRotation?.() ?? rotation.value
}

function setRotation(value: number) {
  const normalized = ((Math.round(value / 90) * 90) % 360 + 360) % 360
  rotation.value = rendererController?.setRotation?.(normalized) ?? normalized
  return rotation.value
}

function rotateLeft() {
  rotation.value = rendererController?.rotateLeft?.() ?? setRotation(rotation.value - 90)
  return rotation.value
}

function rotateRight() {
  rotation.value = rendererController?.rotateRight?.() ?? setRotation(rotation.value + 90)
  return rotation.value
}

function downloadOriginalFile() {
  if (!sourceBuffer) return
  const blob = new Blob([sourceBuffer], {
    type: props.file?.type || 'application/octet-stream',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = sourceName.value || 'document'
  anchor.click()
  URL.revokeObjectURL(url)
}

function print() {
  window.print()
}

const publicApi: DocumentViewerInstance = {
  reload,
  destroy: () => destroyActive('destroy'),
  zoomIn,
  zoomOut,
  resetZoom,
  setZoom,
  getZoomState,
  rotateLeft,
  rotateRight,
  setRotation,
  getRotation,
  downloadOriginalFile,
  print,
  getScrollContainer: () => scrollContainer.value,
}

defineExpose(publicApi)

watch(
  () => [props.file, props.url, props.filename] as const,
  () => void reload(),
  { flush: 'post' },
)

watch(
  () => props.options?.initialZoom,
  value => setZoom(value ?? 1),
)

onMounted(() => {
  mounted = true
  zoom.value = Math.min(maxZoom.value, Math.max(minZoom.value, props.options?.initialZoom ?? 1))
  void reload()
})

onBeforeUnmount(() => {
  mounted = false
  loadSequence += 1
  void destroyActive('destroy')
})
</script>

<template>
  <section
    class="document-viewer"
    :data-theme="theme"
    :data-state="status"
    :style="{
      '--document-viewer-height': normalizedHeight,
      '--document-viewer-zoom': zoom,
    }"
    aria-label="文档预览"
  >
    <header v-if="showToolbar && hasSource && isSupported" class="document-viewer__toolbar">
      <slot name="toolbar-start" :zoom="getZoomState()" :status="status" />
      <div class="document-viewer__identity">
        <span>{{ extension.toUpperCase() }}</span>
        <strong :title="sourceName">{{ sourceName }}</strong>
        <small v-if="pageCount">{{ pageCount }} {{ kind === 'spreadsheet' ? '个工作表' : '页' }}</small>
      </div>
      <div class="document-viewer__actions">
        <button v-if="kind === 'image'" type="button" title="向左旋转" aria-label="向左旋转" :disabled="status !== 'ready'" @click="rotateLeft">↺</button>
        <button v-if="kind === 'image'" type="button" class="document-viewer__rotation" title="重置图片旋转" aria-label="重置图片旋转" :disabled="status !== 'ready'" @click="setRotation(0)">
          {{ rotation }}°
        </button>
        <button v-if="kind === 'image'" type="button" title="向右旋转" aria-label="向右旋转" :disabled="status !== 'ready'" @click="rotateRight">↻</button>
        <span v-if="kind === 'image'" class="document-viewer__separator" />
        <button type="button" title="缩小" :disabled="status !== 'ready'" @click="zoomOut">−</button>
        <button type="button" class="document-viewer__zoom" title="重置缩放" :disabled="status !== 'ready'" @click="resetZoom">
          {{ Math.round(zoom * 100) }}%
        </button>
        <button type="button" title="放大" :disabled="status !== 'ready'" @click="zoomIn">＋</button>
        <span class="document-viewer__separator" />
        <button type="button" title="下载原文件" :disabled="status !== 'ready'" @click="downloadOriginalFile">↓</button>
        <button type="button" title="打印" :disabled="status !== 'ready'" @click="print">⎙</button>
      </div>
      <slot name="toolbar-end" :zoom="getZoomState()" :status="status" />
    </header>

    <div v-if="status === 'empty' || status === 'unsupported' || status === 'error'" class="document-viewer__state" :class="{ 'is-error': status !== 'empty' }" :role="status === 'empty' ? 'status' : 'alert'">
      <span class="document-viewer__file-mark" aria-hidden="true">{{ status === 'empty' ? 'FILE' : '!' }}</span>
      <p>{{ stateMessage }}</p>
      <button v-if="status === 'error'" type="button" @click="reload">重新加载</button>
    </div>

    <div v-show="status === 'loading' || status === 'ready'" ref="scrollContainer" class="document-viewer__viewport">
      <div ref="renderRoot" class="document-viewer__content" />
    </div>

    <div v-if="status === 'loading'" class="document-viewer__loading" role="status" aria-live="polite">
      <span class="document-viewer__spinner" />
      <div>
        <strong>{{ progress.label || '正在读取文档' }}</strong>
        <span><i :style="{ width: `${progressPercent}%` }" /></span>
      </div>
    </div>
  </section>
</template>
