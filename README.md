# MDView

MDView 是一个轻量级的跨平台 Markdown 桌面查看与简单编辑工具，基于 React、Vite 和 Tauri 构建。当前版本重点支持 Windows 桌面环境，并预留 macOS 打包配置。

## 主要功能

- Markdown 预览优先的阅读体验。
- 左侧目录栏，自动提取 `H1-H3` 标题并支持点击跳转。
- Markdown 源文本编辑，支持未保存状态提示。
- 打开、保存、另存为 `.md` / `.markdown` 文件。
- 支持 GitHub Flavored Markdown：表格、任务列表、代码高亮等。
- About 信息弹窗，展示版本、作者和网站信息。
- Tauri 文件关联配置，后续可关联 `.md` / `.markdown` 文件直接打开。
- Windows MSI 安装包打包配置。

## 技术栈

- React 19
- TypeScript
- Vite
- Tauri 2
- react-markdown
- remark-gfm
- rehype-highlight
- Vitest
- ESLint

## 开发环境

安装前端依赖：

```bash
npm install
```

仅运行 Web UI：

```bash
npm run dev
```

运行桌面开发模式：

```bash
npm run desktop:dev
```

Tauri 桌面模式需要本机安装 Rust/Cargo 以及对应平台的构建工具。

## 验证命令

```bash
npm test
npm run lint
npm run build
```

## Windows 打包

普通 Tauri 打包：

```bash
npm run desktop:build
```

仅打包 MSI：

```bash
npx tauri build --bundles msi
```

在 Windows 上，如果需要使用 Visual Studio Build Tools 环境，可使用：

```cmd
set PATH=%USERPROFILE%\.cargo\bin;%PATH%
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
npx tauri build --bundles msi
```

MSI 默认输出目录：

```text
src-tauri/target/release/bundle/msi/
```

## macOS 打包说明

项目已包含 macOS bundle 配置，但 `.app` / DMG 需要在 macOS 环境或 macOS CI Runner 中构建。Windows 环境无法直接生成可用的 macOS 安装包，因为缺少 Apple SDK 和原生 macOS 链接工具链。

## 文件关联

Tauri 配置中已声明 `.md` 和 `.markdown` 文件关联：

```json
"fileAssociations": [
  {
    "ext": ["md", "markdown"],
    "name": "Markdown Document",
    "description": "Markdown text document",
    "mimeType": "text/markdown",
    "role": "Editor",
    "rank": "Default"
  }
]
```

安装包安装后，系统可根据平台行为注册 Markdown 文件关联。

## 项目信息

- 应用名称：MDView
- 当前版本：0.1.0
- 作者：Sunky
- 网站：www.sunky.net

