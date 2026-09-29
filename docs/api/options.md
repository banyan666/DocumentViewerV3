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

## DocumentLoadContext

```ts
interface DocumentLoadContext {
  filename: string
  extension: string
  kind: 'word' | 'spreadsheet' | 'pdf' | 'presentation'
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
