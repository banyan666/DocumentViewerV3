# DocumentViewer

## Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `file` | `File` | — | 本地文件，与 `url` 同时传入时优先 |
| `url` | `string` | — | 可由浏览器跨域读取的远程地址 |
| `filename` | `string` | — | URL 不含扩展名时用于格式识别 |
| `height` | `string \| number` | `'100%'` | 预览区域高度；数字按像素处理 |
| `strict` | `boolean` | `true` | 是否拒绝支持清单之外的扩展名 |
| `emptyText` | `string` | 内置提示 | 未传入文档时的空状态文字 |
| `options` | `DocumentViewerOptions` | `{}` | 工具栏、主题、缩放和渲染限制 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `load-start` | `DocumentLoadContext` | 开始读取文档 |
| `progress` | `DocumentProgress` | 解析或渲染进度变化 |
| `load-complete` | `DocumentLoadContext` | 文档可预览 |
| `unload-start` | `DocumentLoadContext` | 开始卸载当前文档 |
| `unload-complete` | `DocumentLoadContext` | 当前文档完成卸载 |
| `zoom-change` | `DocumentZoomState` | 缩放比例改变 |
| `error` | `string` | 文档加载或渲染失败 |

```vue
<DocumentViewer
  :file="file"
  @load-complete="({ filename, pageCount }) => console.log(filename, pageCount)"
  @error="message => console.error(message)"
/>
```

## 实例方法

通过模板 `ref` 获取 `DocumentViewerInstance`：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { DocumentViewer } from 'document-viewer-vue3'
import type { DocumentViewerInstance } from 'document-viewer-vue3'

const viewer = ref<DocumentViewerInstance>()
</script>

<template>
  <DocumentViewer ref="viewer" :file="file" />
  <button @click="viewer?.zoomIn()">放大</button>
  <button @click="viewer?.resetZoom()">重置</button>
</template>
```

| 方法 | 返回值 | 说明 |
| --- | --- | --- |
| `reload()` | `Promise<void>` | 重新读取并渲染当前来源 |
| `destroy()` | `Promise<void>` | 销毁当前渲染内容 |
| `zoomIn()` | `DocumentZoomState` | 放大一级 |
| `zoomOut()` | `DocumentZoomState` | 缩小一级 |
| `resetZoom()` | `DocumentZoomState` | 回到初始缩放比例 |
| `setZoom(scale)` | `DocumentZoomState` | 设置缩放比例 |
| `getZoomState()` | `DocumentZoomState` | 读取当前缩放状态 |
| `downloadOriginalFile()` | `void` | 下载当前文档原始数据 |
| `print()` | `void` | 调用浏览器打印 |
| `getScrollContainer()` | `HTMLDivElement \| null` | 获取预览滚动容器 |

## 插槽

| 插槽 | 插槽参数 | 说明 |
| --- | --- | --- |
| `toolbar-start` | `zoom`, `status` | 插入工具栏起始区域 |
| `toolbar-end` | `zoom`, `status` | 插入工具栏结束区域 |
