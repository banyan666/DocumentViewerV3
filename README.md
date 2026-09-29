# document-viewer-vue3

面向 Vue 3 的浏览器端文档预览组件。使用一个组件统一展示 Word、Excel、PDF 与 PowerPoint，支持本地 `File` 和远程 URL，并提供加载进度、缩放、下载、打印和主题控制。

[在线示例](https://banyan666.github.io/DocumentViewerV3/) · [使用文档](https://banyan666.github.io/DocumentViewerV3/docs/)

## 特性

- 常用格式统一入口：DOC / DOCX、XLS / XLSX、PDF、PPTX
- 本地文件直接在浏览器中读取，不要求服务端转换
- Word、Excel、PDF、PowerPoint 渲染器按需加载
- 支持 ESM、UMD、TypeScript 类型声明与独立样式入口
- 提供深浅主题、工具栏、缩放范围和表格渲染限制
- 包含完整示例项目与 VitePress 中文文档

## 格式支持

| 类型 | 扩展名 | 预览内容 |
| --- | --- | --- |
| Word | `.doc` `.dot` `.docx` `.docm` `.dotx` `.dotm` | 文本、分页、表格、图片与常见样式 |
| Excel | `.xls` `.xlsx` `.xlsm` `.xlsb` `.xlt` `.xltx` `.xltm` | 多工作表、单元格内容与基础格式 |
| PDF | `.pdf` | 多页 Canvas 渲染 |
| PowerPoint | `.pptx` `.pptm` `.potx` `.potm` `.ppsx` `.ppsm` | 文本、图片与基础形状 |

远程 URL 由浏览器直接读取，需要目标服务器允许 CORS。旧版二进制 `.ppt` 暂不支持，建议转换为 `.pptx`。

## 安装

```bash
pnpm add document-viewer-vue3
```

## 快速开始

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { DocumentViewer } from 'document-viewer-vue3'
import 'document-viewer-vue3/style.css'

const file = ref<File>()

function chooseFile(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  file.value = input.files?.[0]
}
</script>

<template>
  <input
    type="file"
    accept=".doc,.docx,.xls,.xlsx,.pdf,.pptx"
    @change="chooseFile"
  >
  <DocumentViewer
    :file="file"
    height="720px"
    :options="{ theme: 'light', toolbar: true }"
    @load-complete="console.log('预览完成')"
    @error="console.error"
  />
</template>
```

预览远程文档：

```vue
<DocumentViewer
  url="https://api.example.com/files/download?id=100"
  filename="report.pdf"
  height="720px"
/>
```

URL 本身不含扩展名时，需要使用 `filename` 帮助组件识别格式。

## 全局注册

```ts
import { createApp } from 'vue'
import DocumentViewer from 'document-viewer-vue3'
import 'document-viewer-vue3/style.css'
import App from './App.vue'

createApp(App)
  .use(DocumentViewer)
  .mount('#app')
```

也可以自定义全局组件名：

```ts
app.use(DocumentViewer, { componentName: 'OfficePreview' })
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `file` | `File` | — | 本地文件，与 URL 同时存在时优先 |
| `url` | `string` | — | 允许浏览器跨域读取的远程地址 |
| `filename` | `string` | — | URL 不含扩展名时用于格式识别 |
| `height` | `string \| number` | `'100%'` | 预览区域高度 |
| `strict` | `boolean` | `true` | 是否拒绝支持清单以外的扩展名 |
| `emptyText` | `string` | 内置提示 | 空状态文字 |
| `options` | `DocumentViewerOptions` | `{}` | 工具栏、主题、缩放和渲染限制 |

`DocumentViewerOptions`：

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `toolbar` | `boolean` | `true` | 显示内置工具栏 |
| `theme` | `'light' \| 'dark' \| 'system'` | `'light'` | 组件主题 |
| `initialZoom` | `number` | `1` | 初始缩放比例 |
| `minZoom` | `number` | `0.5` | 最小缩放比例 |
| `maxZoom` | `number` | `2.5` | 最大缩放比例 |
| `spreadsheetMaxRows` | `number` | — | 每个工作表最多渲染行数 |
| `spreadsheetMaxColumns` | `number` | — | 每个工作表最多渲染列数 |
| `fetchOptions` | `RequestInit` | — | 远程文档的请求配置 |

## 事件与实例方法

事件：

- `load-start` / `load-complete`
- `unload-start` / `unload-complete`
- `progress`
- `zoom-change`
- `error`

模板 `ref` 暴露的方法：

- `reload()` / `destroy()`
- `zoomIn()` / `zoomOut()` / `resetZoom()` / `setZoom()`
- `getZoomState()`
- `downloadOriginalFile()`
- `print()`
- `getScrollContainer()`

## 示例与文档

```bash
pnpm install
pnpm dev              # 示例站：http://127.0.0.1:5174
pnpm docs:dev         # VitePress：http://127.0.0.1:5175
```

项目结构：

```text
document-viewer/
├─ src/          # 组件实现
├─ examples/     # Vite + Vue 3 示例站
├─ docs/         # VitePress 文档站
└─ scripts/      # 构建与发布校验
```

## 构建与发布

```bash
pnpm type-check       # 类型检查
pnpm build            # 构建 npm 组件包
pnpm build:examples   # 构建示例站
pnpm build:pages      # 构建 GitHub Pages 站点
pnpm docs:build       # 构建文档站
pnpm verify           # 完整验证
pnpm pack:check       # 检查 npm 发布内容
```

组件产物输出到 `document-viewer-vue3/`，示例站输出到 `dist-examples/`。确认 `package.json` 的作者、仓库和主页信息后，可执行：

```bash
npm publish --access public
```

## License

MIT。第三方软件的版权与许可证信息见 `THIRD_PARTY_NOTICES.md`。
