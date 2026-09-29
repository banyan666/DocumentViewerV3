# 格式支持

## 格式清单

| 文档类型 | 扩展名 | 主要能力 |
| --- | --- | --- |
| Word | `.doc` `.dot` `.docx` `.docm` `.dotx` `.dotm` | 文本、段落、分页、表格、图片与常见样式 |
| Excel | `.xls` `.xlsx` `.xlsm` `.xlsb` `.xlt` `.xltx` `.xltm` | 多工作表、单元格内容与基础格式 |
| PDF | `.pdf` | 多页 Canvas 渲染 |
| PowerPoint | `.pptx` `.pptm` `.potx` `.potm` `.ppsx` `.ppsm` | 幻灯片文本、图片与基础形状 |

## Word

新旧 Word 格式均可直接读取。复杂域、宏、嵌入对象或依赖桌面排版引擎的高级效果，可能与 Microsoft Word 中的显示存在差异。

## Excel

组件按工作表展示表格数据。通过 `spreadsheetMaxRows` 与 `spreadsheetMaxColumns` 可以限制单个工作表的渲染范围，避免超大工作簿一次创建过多 DOM 节点。

```vue
<DocumentViewer
  :file="file"
  :options="{
    spreadsheetMaxRows: 2000,
    spreadsheetMaxColumns: 200,
  }"
/>
```

## PDF

PDF 页面以 Canvas 渲染，支持多页浏览和组件级缩放。加密文件、损坏文件或使用特殊字体的文档可能需要额外处理。

## PowerPoint

支持 OpenXML 系列演示文稿的文本、图片和基础形状预览。动画、视频、音频、SmartArt 与部分复杂图表不等同于桌面 PowerPoint 播放效果。

::: info 关于 `.ppt`
旧版二进制 `.ppt` 不在当前支持清单中。请先转换为 `.pptx`，或在业务系统的文件入库流程中统一保存为 OpenXML 格式。
:::

## 格式判断工具

组件包提供格式常量和判断函数：

```ts
import {
  DOCUMENT_VIEWER_ACCEPT,
  DOCUMENT_VIEWER_EXTENSIONS,
  getDocumentExtension,
  getDocumentKind,
  isSupportedDocumentName,
} from 'document-viewer-vue3'
```

`DOCUMENT_VIEWER_ACCEPT` 可直接用于文件输入框的 `accept` 属性。
