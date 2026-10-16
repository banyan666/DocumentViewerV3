# 选项与类型

## DocumentViewerOptions

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `toolbar` | `boolean` | `true` | 显示内置工具栏 |
| `theme` | `'light' \| 'dark' \| 'system'` | `'light'` | 组件界面主题 |
| `initialZoom` | `number` | `1` | 初始缩放比例 |
| `minZoom` | `number` | `0.5` | 最小缩放比例，最低不会小于 `0.25` |
| `maxZoom` | `number` | `2.5` | 最大缩放比例 |
| `spreadsheetMaxRows` | `number` | 渲染器默认值 | 每张工作表最多渲染行数 |
| `spreadsheetMaxColumns` | `number` | 渲染器默认值 | 每张工作表最多渲染列数 |
| `fetchOptions` | `RequestInit` | — | 远程 URL 的 `fetch` 配置 |

```vue
<DocumentViewer
  url="https://api.example.com/document/100"
  filename="report.pdf"
  :options="{
    theme: 'system',
    initialZoom: 0.9,
    minZoom: 0.6,
    maxZoom: 2,
    fetchOptions: {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    },
  }"
/>
```

## 页面间距

Word、旧版 DOC、PDF、PowerPoint 和图片使用统一的外层边距与页间距，渲染器周围背景保持透明。可通过 CSS 变量调整：

```css
.document-viewer {
  --document-viewer-page-padding: 24px;
  --document-viewer-page-gap: 32px;
}
```

Word 和 PDF 每页均为独立的纸张容器，保留页边距，页间留出空隙。`pageCount` 与实际生成的纸张数量一致。

Word 优先使用文件中的自动分页标记和显式分页符；未保存分页标记或正文超出纸张时，会按纸张尺寸继续分页。浏览器字体和桌面排版引擎存在差异，复杂表格、浮动对象等可能导致分页位置与 WPS / Word 不完全相同。PDF 则保留文件定义的原始页数和每页尺寸。

## DocumentLoadContext

```ts
interface DocumentLoadContext {
  filename: string
  extension: string
  kind: 'word' | 'spreadsheet' | 'pdf' | 'presentation' | 'image'
  byteLength?: number
  pageCount?: number
}
```

## DocumentProgress

```ts
interface DocumentProgress {
  current: number
  total: number
  label?: string
}
```

## DocumentZoomState

```ts
interface DocumentZoomState {
  scale: number
  percent: number
}
```

全部公开类型均可从包入口直接导入：

```ts
import type {
  DocumentLoadContext,
  DocumentProgress,
  DocumentViewerInstance,
  DocumentViewerOptions,
  DocumentViewerProps,
  DocumentViewerTheme,
  DocumentZoomState,
} from 'document-viewer-vue3'
```
