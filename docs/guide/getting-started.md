# 安装与接入

## 环境要求

- Node.js 20.19 或更高版本
- Vue 3.3 或更高版本
- Vite、Webpack 等支持 ESM 和动态导入的现代构建工具

## 安装

::: code-group

```bash [pnpm]
pnpm add document-viewer-vue3
```

```bash [npm]
npm install document-viewer-vue3
```

```bash [yarn]
yarn add document-viewer-vue3
```

:::

## 局部使用

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
    accept=".doc,.docx,.xls,.xlsx,.pdf,.pptx,.png,.jpg,.webp,.tiff,.heic"
    @change="chooseFile"
  >
  <DocumentViewer
    :file="file"
    height="720px"
    :options="{ toolbar: true, theme: 'light' }"
  />
</template>
```

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

注册后即可在任意模板中使用：

```vue
<DocumentViewer :file="selectedFile" height="720px" />
```

需要自定义全局组件名时：

```ts
app.use(DocumentViewer, { componentName: 'OfficePreview' })
```

## 预览远程文档

URL 自带扩展名：

```vue
<DocumentViewer
  url="https://cdn.example.com/reports/quarterly.pdf"
  height="720px"
/>
```

URL 不包含扩展名时提供 `filename`：

```vue
<DocumentViewer
  url="https://api.example.com/files/download?id=100"
  filename="quarterly.pdf"
  height="720px"
/>
```

::: warning 跨域要求
远程文件由浏览器直接请求。文件服务需要返回正确的 CORS 响应头；带鉴权请求可通过 `options.fetchOptions` 传入请求配置。
:::

## 监听状态

```vue
<DocumentViewer
  :file="file"
  @load-start="loading = true"
  @progress="progress = $event"
  @load-complete="loading = false"
  @error="message = $event"
/>
```

继续阅读 [DocumentViewer API](/api/component) 查看全部属性、事件和实例方法。
