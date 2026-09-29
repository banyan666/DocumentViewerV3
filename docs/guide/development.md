# 开发与发布

## 目录

```text
document-viewer/
├─ src/                    # 组件、类型与格式渲染逻辑
├─ examples/               # Vite + Vue 3 示例站
├─ docs/                   # VitePress 文档站
├─ scripts/                # 发布产物校验
├─ vite.config.ts          # 示例站构建配置
└─ vite.lib.config.ts      # npm 组件构建配置
```

## 常用命令

```bash
pnpm dev              # 启动示例站
pnpm docs:dev         # 启动 VitePress 文档
pnpm type-check       # 检查 TypeScript 与 Vue 类型
pnpm build            # 构建 npm 组件包
pnpm build:examples   # 构建示例站
pnpm docs:build       # 构建文档站
pnpm verify           # 执行完整发布校验
pnpm pack:check       # 检查 npm 包内容
```

## 构建产物

`pnpm build` 输出 `document-viewer-vue3/`：

```text
document-viewer-vue3/
├─ document-viewer-vue3.js       # ESM
├─ document-viewer-vue3.umd.cjs  # UMD
├─ style.css                     # 组件样式
├─ chunks/                       # 按格式拆分的渲染逻辑
└─ types/                        # TypeScript 声明
```

Vue 保持为 peer dependency，组件包不会重复打入 Vue 运行时。

## 发布 npm

发布前先补齐 `package.json` 中的作者、仓库和主页等项目元数据，然后执行：

```bash
pnpm verify
pnpm pack:check
npm login
npm publish --access public
```

`prepublishOnly` 会再次运行完整验证，确保组件、示例、文档和公开入口都可以正常构建。
