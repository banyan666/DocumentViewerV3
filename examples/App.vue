<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  DOCUMENT_VIEWER_ACCEPT,
  DocumentViewer,
  getDocumentExtension,
  isSupportedDocumentName,
} from '../src'
import type { DocumentProgress, DocumentViewerTheme } from '../src'

const selectedFile = ref<File>()
const urlDraft = ref('')
const activeUrl = ref('')
const status = ref('等待选择文件')
const statusTone = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const isDragging = ref(false)
const theme = ref<DocumentViewerTheme>('light')
const showToolbar = ref(true)
const progress = ref(0)
const themes = ['light', 'dark', 'system'] as const
const docsBaseUrl = import.meta.env.VITE_DOCS_URL
  || (import.meta.env.DEV ? 'http://127.0.0.1:5175/' : './docs/')
const gettingStartedUrl = `${docsBaseUrl}guide/getting-started.html`

const formats = [
  { key: 'W', label: 'Word', extensions: 'DOC / DOCX', detail: '分页、表格、图片与样式', tone: 'word' },
  { key: 'X', label: 'Excel', extensions: 'XLS / XLSX', detail: '多工作表与单元格内容', tone: 'sheet' },
  { key: 'P', label: 'PDF', extensions: 'PDF', detail: '逐页 Canvas 清晰渲染', tone: 'pdf' },
  { key: 'S', label: 'PowerPoint', extensions: 'PPTX', detail: '文本、图片与基础形状', tone: 'slide' },
  { key: 'I', label: 'Image', extensions: 'PNG / JPG / TIFF', detail: '旋转、灯箱与多页 TIFF', tone: 'image' },
] as const

const currentName = computed(() => {
  if (selectedFile.value) return selectedFile.value.name
  if (!activeUrl.value) return '未选择文件'
  try {
    return decodeURIComponent(new URL(activeUrl.value).pathname.split('/').pop() || activeUrl.value)
  } catch {
    return activeUrl.value
  }
})

const currentExtension = computed(() => getDocumentExtension(currentName.value).toUpperCase() || 'FILE')
const currentSize = computed(() => {
  const bytes = selectedFile.value?.size
  if (!bytes) return activeUrl.value ? '远程文档' : '本地优先'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
})

function openFile(file?: File) {
  if (!file) return
  if (!isSupportedDocumentName(file.name)) {
    status.value = '不支持此文件格式'
    statusTone.value = 'error'
    return
  }
  selectedFile.value = file
  activeUrl.value = ''
  urlDraft.value = ''
  status.value = '正在读取本地文件'
  statusTone.value = 'loading'
  progress.value = 0
}

function chooseFile(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  openFile(input.files?.[0])
  input.value = ''
}

function dropFile(event: DragEvent) {
  isDragging.value = false
  openFile(event.dataTransfer?.files[0])
}

function openUrl() {
  const nextUrl = urlDraft.value.trim()
  if (!nextUrl) return
  if (!isSupportedDocumentName(nextUrl)) {
    status.value = 'URL 需要包含受支持的扩展名'
    statusTone.value = 'error'
    return
  }
  selectedFile.value = undefined
  activeUrl.value = nextUrl
  status.value = '正在获取远程文件'
  statusTone.value = 'loading'
  progress.value = 0
}

function updateProgress(value: DocumentProgress) {
  progress.value = value.total ? Math.round(value.current / value.total * 100) : 0
  if (value.label) status.value = value.label
}

function resetSource() {
  selectedFile.value = undefined
  activeUrl.value = ''
  urlDraft.value = ''
  status.value = '等待选择文件'
  statusTone.value = 'idle'
  progress.value = 0
}
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <a class="brand" href="#top" aria-label="document-viewer-vue3 首页">
        <span class="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span><strong>document-viewer-vue3</strong><small>Vue 3 document surface</small></span>
      </a>
      <nav aria-label="页面导航">
        <a href="#formats">格式</a>
        <a href="#playground">在线示例</a>
        <a href="#usage">接入代码</a>
        <a class="nav-docs" :href="docsBaseUrl">阅读文档 <span>↗</span></a>
      </nav>
    </header>

    <main id="top">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow"><span /> 浏览器端文档与图片预览组件</p>
          <h1>让文档预览<br><em>留在你的界面里。</em></h1>
          <p class="hero-lead">
            为 Vue 3 应用提供统一的 Word、Excel、PDF、PowerPoint 与图片预览体验。
            文件在浏览器中读取，组件负责加载、渲染、缩放、旋转、打印与下载。
          </p>
          <div class="hero-actions">
            <a class="primary-action" href="#playground">立即体验 <span>↓</span></a>
            <code>pnpm add document-viewer-vue3</code>
          </div>
          <dl class="hero-facts">
            <div><dt>5</dt><dd>文件家族</dd></div>
            <div><dt>0</dt><dd>服务端转换</dd></div>
            <div><dt>1</dt><dd>Vue 组件入口</dd></div>
          </dl>
        </div>

        <div class="document-stage" aria-label="支持的文档类型示意">
          <div class="stage-grid" />
          <article class="paper paper-back">
            <span class="paper-type">XLSX</span>
            <div class="sheet-cells"><i v-for="cell in 24" :key="cell" /></div>
          </article>
          <article class="paper paper-middle">
            <span class="paper-type">PDF</span>
            <i class="paper-title" /><i class="paper-line wide" /><i class="paper-line" />
            <div class="paper-chart"><i /><i /><i /><i /><i /></div>
          </article>
          <article class="paper paper-front">
            <header><span>DOCX</span><small>PROJECT BRIEF</small></header>
            <h2>Document<br>workspace</h2>
            <i class="paper-line wide" /><i class="paper-line" /><i class="paper-line short" />
            <footer><span>Vue 3</span><strong>01</strong></footer>
          </article>
          <div class="stage-note"><span>LOCAL</span> Document bytes stay in the browser</div>
        </div>
      </section>

      <section id="formats" class="format-ledger">
        <article v-for="format in formats" :key="format.label" :data-tone="format.tone">
          <span class="format-key">{{ format.key }}</span>
          <div><strong>{{ format.label }}</strong><small>{{ format.extensions }}</small></div>
          <p>{{ format.detail }}</p>
          <span class="format-arrow">↗</span>
        </article>
      </section>

      <section id="playground" class="playground-section">
        <header class="section-heading">
          <div><p class="section-kicker">Interactive workspace</p><h2>把你的文件放进来。</h2></div>
          <p>选择本地文件，或输入允许跨域访问的 URL。示例不会上传本地文件。</p>
        </header>

        <div class="workbench">
          <aside class="control-deck">
            <div class="deck-heading">
              <span>INPUT / 01</span>
              <button v-if="selectedFile || activeUrl" type="button" @click="resetSource">清空</button>
            </div>
            <label
              class="drop-zone"
              :class="{ 'is-dragging': isDragging }"
              for="document-input"
              @dragenter.prevent="isDragging = true"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="dropFile"
            >
              <input id="document-input" type="file" :accept="DOCUMENT_VIEWER_ACCEPT" @change="chooseFile">
              <span class="upload-symbol" aria-hidden="true"><i>↑</i></span>
              <strong>选择本地文件</strong>
              <small>点击选择，或拖放到这里</small>
              <em>{{ DOCUMENT_VIEWER_ACCEPT.replaceAll(',', '  ') }}</em>
            </label>
            <div class="source-divider"><span>或使用 URL</span></div>
            <form class="url-control" @submit.prevent="openUrl">
              <label for="document-url">文件地址</label>
              <div>
                <input id="document-url" v-model="urlDraft" type="url" placeholder="https://example.com/report.pdf" autocomplete="url">
                <button type="submit" aria-label="打开远程文件">→</button>
              </div>
              <small>远程服务器需要允许浏览器跨域读取。</small>
            </form>
            <div class="deck-heading option-heading"><span>DISPLAY / 02</span></div>
            <fieldset class="theme-control">
              <legend>预览主题</legend>
              <label v-for="item in themes" :key="item">
                <input v-model="theme" type="radio" name="theme" :value="item">
                <span>{{ item === 'light' ? '浅色' : item === 'dark' ? '深色' : '系统' }}</span>
              </label>
            </fieldset>
            <label class="switch-row">
              <span><strong>内置工具栏</strong><small>显示缩放、下载与打印操作</small></span>
              <input v-model="showToolbar" type="checkbox"><i />
            </label>
          </aside>

          <div class="preview-console">
            <header class="console-bar">
              <div class="file-identity">
                <span>{{ currentExtension }}</span>
                <div><strong>{{ currentName }}</strong><small>{{ currentSize }}</small></div>
              </div>
              <div class="render-status" :data-tone="statusTone">
                <i /><span>{{ status }}</span><em v-if="statusTone === 'loading'">{{ progress }}%</em>
              </div>
            </header>
            <div class="viewer-shell" :data-theme="theme">
              <div class="format-tabs" aria-hidden="true">
                <i data-tone="word">W</i><i data-tone="sheet">X</i><i data-tone="pdf">P</i><i data-tone="slide">S</i><i data-tone="image">I</i>
              </div>
              <DocumentViewer
                :file="selectedFile"
                :url="activeUrl || undefined"
                :filename="currentName"
                height="clamp(560px, 72vh, 820px)"
                :options="{
                  theme,
                  toolbar: showToolbar,
                  spreadsheetMaxRows: 2000,
                  spreadsheetMaxColumns: 200,
                }"
                @load-start="status = '正在解析文档'; statusTone = 'loading'"
                @progress="updateProgress"
                @load-complete="status = '预览就绪'; statusTone = 'ready'; progress = 100"
                @error="status = $event; statusTone = 'error'"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="usage" class="usage-section">
        <div class="usage-copy">
          <p class="section-kicker">Three lines to preview</p>
          <h2>把复杂格式留给组件。</h2>
          <p>Vue 只需要接收一个本地 <code>File</code> 或远程 URL。渲染器按文档类型异步加载，不要求业务页面了解格式内部结构。</p>
          <a :href="gettingStartedUrl">查看完整接入指南 <span>→</span></a>
        </div>
        <div class="code-window">
          <header><span /><span /><span /><small>DocumentPreview.vue</small></header>
          <pre><code><span class="code-muted">&lt;script setup lang="ts"&gt;</span>
<span class="code-keyword">import</span> { ref } <span class="code-keyword">from</span> <span class="code-string">'vue'</span>
<span class="code-keyword">import</span> { DocumentViewer } <span class="code-keyword">from</span> <span class="code-string">'document-viewer-vue3'</span>
<span class="code-keyword">import</span> <span class="code-string">'document-viewer-vue3/style.css'</span>

<span class="code-keyword">const</span> file = ref&lt;File&gt;()
<span class="code-muted">&lt;/script&gt;</span>

<span class="code-muted">&lt;template&gt;</span>
  <span class="code-tag">&lt;DocumentViewer</span> <span class="code-attr">:file</span>=<span class="code-string">"file"</span> <span class="code-attr">height</span>=<span class="code-string">"720px"</span> <span class="code-tag">/&gt;</span>
<span class="code-muted">&lt;/template&gt;</span></code></pre>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div><span class="brand-mini">DV</span><strong>document-viewer-vue3</strong></div>
      <p>Word · Excel · PDF · PowerPoint · Image / Vue 3</p>
      <a href="#top">回到顶部 ↑</a>
    </footer>
  </div>
</template>
