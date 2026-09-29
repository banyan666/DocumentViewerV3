import { defineConfig } from 'vitepress'

const base = process.env.VITEPRESS_BASE || '/'

export default defineConfig({
  base,
  lang: 'zh-CN',
  title: 'document-viewer-vue3',
  description: '面向 Vue 3 的 Word、Excel、PDF 与 PowerPoint 浏览器预览组件。',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#f5f7fb' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}mark.svg` }],
  ],
  vite: {
    server: {
      host: '127.0.0.1',
      port: 5175,
      strictPort: true,
    },
  },
  themeConfig: {
    logo: '/mark.svg',
    siteTitle: 'document-viewer-vue3',
    nav: [
      { text: '指南', link: '/guide/introduction' },
      { text: '格式支持', link: '/guide/formats' },
      { text: '组件 API', link: '/api/component' },
      { text: '示例', link: '/guide/examples' },
    ],
    sidebar: [
      {
        text: '开始使用',
        items: [
          { text: '组件介绍', link: '/guide/introduction' },
          { text: '安装与接入', link: '/guide/getting-started' },
          { text: '格式支持', link: '/guide/formats' },
          { text: '示例项目', link: '/guide/examples' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'DocumentViewer', link: '/api/component' },
          { text: '选项与类型', link: '/api/options' },
        ],
      },
      {
        text: '项目维护',
        items: [
          { text: '开发与发布', link: '/guide/development' },
        ],
      },
    ],
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                noResultsText: '没有找到相关内容',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },
    outline: {
      level: [2, 3],
      label: '本页内容',
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },
    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    },
    footer: {
      message: '在浏览器中完成文档读取与预览',
      copyright: 'Released under the MIT License',
    },
  },
})
