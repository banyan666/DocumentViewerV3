---
layout: home

hero:
  name: document-viewer-vue3
  text: 一个组件，预览常用办公文档
  tagline: 在 Vue 3 应用中直接展示 Word、Excel、PDF 与 PowerPoint。支持本地 File 和远程 URL，无需业务页面关心各格式的加载细节。
  image:
    src: /mark.svg
    alt: document-viewer-vue3
  actions:
    - theme: brand
      text: 开始使用
      link: /guide/getting-started
    - theme: alt
      text: 查看组件 API
      link: /api/component

features:
  - icon: DOC
    title: 常用办公格式
    details: 同一套组件接口覆盖 DOC、DOCX、XLS、XLSX、PDF 与 PPTX 等常用扩展名。
  - icon: WEB
    title: 浏览器端处理
    details: 本地文件直接在浏览器内读取；使用远程地址时遵循标准 fetch 与 CORS 规则。
  - icon: VUE
    title: 为 Vue 3 设计
    details: 同时支持局部导入和插件注册，并提供 TypeScript 类型、事件与实例方法。
  - icon: UI
    title: 自带预览交互
    details: 提供加载状态、缩放、下载、打印、深浅主题与可隐藏工具栏。
  - icon: ZIP
    title: 按格式异步加载
    details: 仅在需要时载入对应渲染器，业务端只保留一个清晰的组件入口。
  - icon: NPM
    title: 可直接发布
    details: 已配置 ESM、UMD、类型声明、样式入口与 npm 发布前完整校验。
---

<div class="format-grid">
  <div class="format-card" style="--format-color:#2563eb"><strong>Word</strong><span>DOC · DOT · DOCX · DOCM · DOTX · DOTM</span></div>
  <div class="format-card" style="--format-color:#14915f"><strong>Excel</strong><span>XLS · XLSX · XLSM · XLSB · XLTX</span></div>
  <div class="format-card" style="--format-color:#e34b45"><strong>PDF</strong><span>PDF · MULTI-PAGE CANVAS</span></div>
  <div class="format-card" style="--format-color:#e87924"><strong>PowerPoint</strong><span>PPTX · PPTM · POTX · PPSX</span></div>
</div>
