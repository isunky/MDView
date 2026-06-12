# MDView

[中文](#中文) | [English](#english)

## 中文

MDView 是一个轻量级的跨平台 Markdown 桌面查看与简单编辑工具，基于 React、Vite 和 Tauri 构建。当前版本重点支持 Windows 桌面环境，并预留 macOS 打包配置。

### 主要功能

- Markdown 预览优先的阅读体验。
- 左侧目录栏，自动提取 `H1-H3` 标题并支持点击跳转。
- Markdown 源文本编辑，支持未保存状态提示。
- 打开、保存、另存为 `.md` / `.markdown` 文件。
- 支持 GitHub Flavored Markdown：表格、任务列表、代码高亮等。
- About 信息弹窗，展示版本、作者和网站信息。
- Tauri 文件关联配置，后续可关联 `.md` / `.markdown` 文件直接打开。
- Windows MSI 安装包打包配置。

### 技术栈

- React 19
- TypeScript
- Vite
- Tauri 2
- react-markdown
- remark-gfm
- rehype-highlight
- Vitest
- ESLint

### 开发环境

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

### 验证命令

```bash
npm test
npm run lint
npm run build
```

### Windows 打包

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

### macOS 打包说明

项目已包含 macOS bundle 配置，但 `.app` / DMG 需要在 macOS 环境或 macOS CI Runner 中构建。Windows 环境无法直接生成可用的 macOS 安装包，因为缺少 Apple SDK 和原生 macOS 链接工具链。

### 文件关联

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

### 项目信息

- 应用名称：MDView
- 当前版本：0.1.0
- 作者：Sunky
- 网站：www.sunky.net

## English

MDView is a lightweight cross-platform desktop app for viewing Markdown files and making simple source edits. It is built with React, Vite, and Tauri. The current version focuses on Windows desktop usage and keeps macOS bundle configuration ready for future builds.

### Features

- Preview-first Markdown reading experience.
- Left-side document outline generated from `H1-H3` headings with click-to-jump navigation.
- Plain text Markdown source editing with unsaved-change state.
- Open, save, and save-as for `.md` and `.markdown` files.
- GitHub Flavored Markdown support, including tables, task lists, and code highlighting.
- About dialog with version, author, and website information.
- Tauri file association configuration for opening `.md` and `.markdown` documents directly.
- Windows MSI installer packaging configuration.

### Tech Stack

- React 19
- TypeScript
- Vite
- Tauri 2
- react-markdown
- remark-gfm
- rehype-highlight
- Vitest
- ESLint

### Development

Install frontend dependencies:

```bash
npm install
```

Run the web UI only:

```bash
npm run dev
```

Run the desktop app in development mode:

```bash
npm run desktop:dev
```

Tauri desktop mode requires Rust/Cargo and the platform-specific build tools installed on the build machine.

### Verification

```bash
npm test
npm run lint
npm run build
```

### Windows Packaging

Build with the default Tauri bundle configuration:

```bash
npm run desktop:build
```

Build MSI only:

```bash
npx tauri build --bundles msi
```

On Windows, when the Visual Studio Build Tools environment is required, use:

```cmd
set PATH=%USERPROFILE%\.cargo\bin;%PATH%
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
npx tauri build --bundles msi
```

Default MSI output directory:

```text
src-tauri/target/release/bundle/msi/
```

### macOS Packaging

The project includes macOS bundle configuration, but `.app` / DMG builds must be produced on macOS or a macOS CI runner. A Windows environment cannot directly produce usable macOS installers because it lacks the Apple SDK and native macOS linker toolchain.

### File Associations

The Tauri configuration declares `.md` and `.markdown` file associations:

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

After installation, the operating system can register Markdown file associations according to platform behavior.

### Project Info

- App name: MDView
- Version: 0.1.0
- Author: Sunky
- Website: www.sunky.net

