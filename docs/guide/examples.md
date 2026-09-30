# 示例项目

仓库中的 `examples/` 是一个完整的 Vite + Vue 3 示例站，包含本地文件拖放、远程 URL、主题切换、工具栏开关、加载进度，以及真实文档和图片预览。

## 启动示例

```bash
pnpm install
pnpm dev
```

浏览器访问 `http://127.0.0.1:5174`。

## 构建示例

```bash
pnpm build:examples
```

构建产物输出到 `dist-examples/`，可以作为静态站点部署。

## 示例覆盖内容

- 使用 `DOCUMENT_VIEWER_ACCEPT` 配置文件选择器
- 在拖放区域接收本地 `File`
- 校验远程 URL 的文档扩展名
- 控制 `theme` 和 `toolbar` 选项
- 监听 `load-start`、`progress`、`load-complete` 与 `error`
- 组合组件状态和业务页面状态

## 启动文档站

```bash
pnpm docs:dev
```

文档站默认运行在 `http://127.0.0.1:5175`。执行 `pnpm docs:build` 可以生成静态文档产物。
