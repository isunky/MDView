<p align="center">
  <img src="src/assets/app-icon.png" alt="MDView logo" width="112" height="112" />
</p>

<h1 align="center">MDView</h1>

<p align="center">
  A lightweight cross-platform Markdown viewer and editor for Windows and macOS.
  <br />
  适用于 Windows 和 macOS 的轻量级 Markdown 查看与编辑工具。
</p>

<p align="center">
  <a href="#中文">中文</a>
  ·
  <a href="#english">English</a>
</p>

<p align="center">
  <strong>Version / 版本：</strong>2.0.0
  ·
  <strong>Author / 作者：</strong>Sunky
  ·
  <a href="https://www.sunky.net">www.sunky.net</a>
</p>

![MDView screenshot](main.png)

---

## 中文

MDView 是一款轻量级 Markdown 桌面应用，适合快速打开、阅读和简单编辑 `.md` / `.markdown` 文件。它把“好读”放在第一位，同时保留常用编辑、目录导航、本地资源预览、导出和文件关联能力，适合写说明文档、项目笔记、方案文档和轻量技术资料。

当前已提供 **Windows** 和 **macOS** 版本，可前往 [GitHub Releases](https://github.com/isunky/MDView/releases) 下载。Windows 同时提供 MSI 安装包和绿色版 ZIP。

Windows MSI 安装版可在“应用 > 检查更新”中手动下载并安装正式版更新。绿色版会提示并跳转到 Release 下载新版 ZIP，以保持便携使用方式；macOS 自动更新将在完成 Apple 签名和公证后提供。

### 主要功能

- **顺手的 Markdown 阅读体验**：支持预览、编辑、分屏三种模式，预览区可渲染表格、任务列表、代码高亮、内嵌 HTML、Mermaid 图表和颜色值预览。
- **面向长文档的导航**：自动提取 `H1` 到 `H3` 标题生成左侧目录，支持点击跳转；目录可关闭、重新打开，也可以拖动调整宽度。
- **够用但不复杂的编辑能力**：提供常用格式按钮、Markdown 语法速查、快捷键、Tab 缩进、Shift+Tab 反向缩进和列表自动续写。
- **本地文档和资源处理**：启动时可从欢迎工作区新建、打开或继续最近文件；支持保存、另存为，本地图片可通过相对路径、绝对路径或 `file://` 路径正常显示。
- **链接和文件关联**：Markdown 内的网页链接使用默认浏览器打开；本地 Markdown 链接可在应用内跳转；安装版可关联 `.md` / `.markdown` 文件。
- **导出与跨平台发布**：支持导出独立 HTML、Word `.docx`，并可通过系统打印能力生成 PDF；项目已配置 Windows、macOS 和 GitHub Actions 自动构建发布流程。

### 常用快捷键

| 操作 | Windows | macOS |
| --- | --- | --- |
| 新建 | `Ctrl+N` | `Command+N` |
| 打开 | `Ctrl+O` | `Command+O` |
| 保存 | `Ctrl+S` | `Command+S` |
| 另存为 | `Ctrl+Shift+S` | `Command+Shift+S` |
| 粗体 | `Ctrl+B` | `Command+B` |
| 斜体 | `Ctrl+I` | `Command+I` |
| 插入链接 | `Ctrl+K` | `Command+K` |
| 有序列表 | `Ctrl+Shift+7` | `Command+Shift+7` |
| 无序列表 | `Ctrl+Shift+8` | `Command+Shift+8` |
| 缩进 / 反向缩进 | `Tab` / `Shift+Tab` | `Tab` / `Shift+Tab` |

### 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面外壳 | Tauri 2 |
| 前端 | React 19、TypeScript、Vite |
| Markdown | react-markdown、remark-gfm、rehype-raw、rehype-highlight、highlight.js、Mermaid |
| 测试与质量 | Vitest、Testing Library、Playwright、ESLint、GitHub Actions |

### 快速开始

安装依赖：

```bash
npm install
```

运行 Web 开发预览：

```bash
npm run dev
```

运行桌面开发模式：

```bash
npm run desktop:dev
```

运行测试和构建检查：

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
```

同步应用版本号：

```bash
npm run version:sync -- 1.6.2
```

### Windows 打包

Windows 桌面构建需要 Rust/Cargo、Visual Studio Build Tools 和 C++ 构建工具。

生成默认 Tauri 安装包：

```bash
npm run desktop:build
```

仅生成 MSI：

```bash
npm run desktop:build -- --bundles msi
```

在桌面 release 构建后生成 Windows 绿色版 ZIP：

```bash
npm run portable:windows
```

默认输出目录：

```text
src-tauri/target/release/bundle/msi/
src-tauri/target/release/bundle/portable/
```

绿色版 ZIP 可解压后直接运行，但不会安装 MDView，也不会注册 `.md` / `.markdown` 文件关联。
检查更新时，绿色版只会打开 GitHub Release 下载新版 ZIP，不会转为 MSI 安装版。

### macOS 打包

macOS 安装包需要在 macOS 或 macOS CI Runner 上构建，并提前安装 Node.js、Rust/Cargo 和 Xcode Command Line Tools。

生成 macOS 安装包：

```bash
npm run desktop:build
```

仅生成 DMG：

```bash
npm run desktop:build -- --bundles dmg
```

默认输出目录：

```text
src-tauri/target/release/bundle/macos/
src-tauri/target/release/bundle/dmg/
```

### CI、发布与签名

仓库包含 GitHub Actions 工作流：

- PR 和主分支推送会执行单元测试、lint、前端构建和 Web E2E 测试。
- CI 可手动触发，并会构建 Windows MSI、Windows 绿色版 ZIP 和 macOS Universal DMG。
- 普通 PR 和主分支推送不会生成安装包；CI 与 Release 共用同一套验证和跨平台构建流水线。
- `Release` 工作流可选择 `patch`、`minor` 或 `major` 自动生成下一个版本号。
- 发布流程会同步版本文件、提交版本变更、构建发布产物，并在成功后创建 SemVer Tag 和 GitHub Release。
- 也可以手动推送与项目版本一致的 `v1.2.3` 格式 Tag 来触发发布。
- macOS CI 产物默认未进行 Apple Developer 签名和公证。

自动版本提交需要允许 GitHub Actions 写入仓库内容。如果默认分支启用了保护规则，请允许 `github-actions[bot]` 写入，或为发布流程配置对应规则。

Windows 安装包支持可选签名。需要在 CI 中签名时，请配置：

- `WINDOWS_CERTIFICATE_BASE64`
- `WINDOWS_CERTIFICATE_PASSWORD`
- `WINDOWS_CERTIFICATE_THUMBPRINT`

未配置证书时，工作流仍会生成未签名 MSI。

Windows 自动更新还需要配置以下 Tauri 更新签名密钥。私钥不能提交到仓库，丢失后已发布版本将无法接受后续更新：

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

### 图标资源

- 前端图标：`src/assets/app-icon.png`
- Tauri 源图：`src-tauri/app-icon.png`
- 平台图标集：`src-tauri/icons/`

重新生成平台图标：

```bash
npx tauri icon src-tauri/app-icon.png
```

### 项目信息

| 项目 | 内容 |
| --- | --- |
| 应用名称 | MDView |
| 当前版本 | 2.0.0 |
| 支持平台 | Windows、macOS |
| 作者 | Sunky |
| 网站 | [www.sunky.net](https://www.sunky.net) |
| 许可证 | Apache-2.0 |

---

## English

MDView is a lightweight desktop app for opening, reading, and making small edits to `.md` and `.markdown` files. It keeps the reading view clean, while still giving you source editing, document navigation, local image preview, export, and file association support when you need them.

Current releases are available for **Windows** and **macOS** from [GitHub Releases](https://github.com/isunky/MDView/releases). Windows releases include both an MSI installer and a portable ZIP package.

The Windows MSI installation can manually download and install stable updates through **App > Check for Updates**. The portable package opens the matching GitHub Release so it remains extract-and-run; macOS automatic updates will be enabled after Apple signing and notarization are in place.

### Features

- **Comfortable Markdown reading**: switch between Preview, Edit, and Split modes; render tables, task lists, highlighted code, inline HTML, Mermaid diagrams, and color swatches.
- **Navigation for longer documents**: build an outline from `H1` to `H3` headings with click-to-jump navigation; collapse, reopen, or resize the outline panel.
- **Simple editing tools**: use formatting buttons, a Markdown syntax reference, keyboard shortcuts, Tab indentation, Shift+Tab outdentation, and automatic list continuation.
- **Local file and asset support**: create, open, or resume recent files from the welcome workspace; save or save as, and display local images from relative paths, absolute paths, and `file://` URLs.
- **Links and file associations**: open web links in the default browser; jump between local Markdown documents inside the app; associate `.md` and `.markdown` files in the installer build.
- **Export and release tooling**: export self-contained HTML and Word `.docx`, create PDFs through the system print flow, and build Windows and macOS packages through GitHub Actions.

### Keyboard shortcuts

| Action | Windows | macOS |
| --- | --- | --- |
| New | `Ctrl+N` | `Command+N` |
| Open | `Ctrl+O` | `Command+O` |
| Save | `Ctrl+S` | `Command+S` |
| Save As | `Ctrl+Shift+S` | `Command+Shift+S` |
| Bold | `Ctrl+B` | `Command+B` |
| Italic | `Ctrl+I` | `Command+I` |
| Insert link | `Ctrl+K` | `Command+K` |
| Ordered list | `Ctrl+Shift+7` | `Command+Shift+7` |
| Unordered list | `Ctrl+Shift+8` | `Command+Shift+8` |
| Indent / outdent | `Tab` / `Shift+Tab` | `Tab` / `Shift+Tab` |

### Tech stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri 2 |
| Frontend | React 19, TypeScript, Vite |
| Markdown | react-markdown, remark-gfm, rehype-raw, rehype-highlight, highlight.js, Mermaid |
| Testing and quality | Vitest, Testing Library, Playwright, ESLint, GitHub Actions |

### Getting started

Install dependencies:

```bash
npm install
```

Run the web development preview:

```bash
npm run dev
```

Run the desktop app in development mode:

```bash
npm run desktop:dev
```

Run tests and build checks:

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
```

Synchronize the app version:

```bash
npm run version:sync -- 1.6.2
```

### Windows packaging

Windows desktop builds require Rust/Cargo, Visual Studio Build Tools, and the C++ toolchain.

Build the default Tauri bundles:

```bash
npm run desktop:build
```

Build MSI only:

```bash
npm run desktop:build -- --bundles msi
```

Build the Windows portable ZIP after the desktop release build:

```bash
npm run portable:windows
```

Default output directories:

```text
src-tauri/target/release/bundle/msi/
src-tauri/target/release/bundle/portable/
```

The portable ZIP is extract-and-run only. It does not install MDView or register `.md` / `.markdown` file associations.
When an update is available, it opens the GitHub Release for a newer portable ZIP instead of running the MSI installer.

### macOS packaging

macOS installers must be built on macOS or a macOS CI runner with Node.js, Rust/Cargo, and Xcode Command Line Tools installed.

Build the macOS bundles:

```bash
npm run desktop:build
```

Build DMG only:

```bash
npm run desktop:build -- --bundles dmg
```

Default output directories:

```text
src-tauri/target/release/bundle/macos/
src-tauri/target/release/bundle/dmg/
```

### CI, release, and signing

The repository includes GitHub Actions workflows:

- Pull requests and main branch pushes run unit tests, lint, frontend builds, and Web E2E tests.
- CI can also be started manually, and builds a Windows MSI, Windows portable ZIP, and macOS Universal DMG.
- Regular pull requests and main branch pushes do not build installers; CI and Release share the same verification and cross-platform build pipeline.
- The `Release` workflow can generate the next version with a `patch`, `minor`, or `major` increment.
- The release workflow updates version files, commits the version change, builds release assets, and creates a SemVer Tag and GitHub Release after all builds succeed.
- A matching `v1.2.3` tag can also be pushed manually to trigger a release.
- macOS CI artifacts are unsigned and not notarized by default.

Automatic version commits require GitHub Actions content write access. If the default branch is protected, allow `github-actions[bot]` to write or configure an appropriate release rule.

Windows installers support optional signing. Configure these secrets to sign MSI builds in CI:

- `WINDOWS_CERTIFICATE_BASE64`
- `WINDOWS_CERTIFICATE_PASSWORD`
- `WINDOWS_CERTIFICATE_THUMBPRINT`

Without certificate secrets, the workflow still produces unsigned MSI builds.

Windows automatic updates also require these Tauri updater signing secrets. Never commit the private key; losing it prevents future releases from updating installed copies of MDView:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

### Icon assets

- Frontend icon: `src/assets/app-icon.png`
- Tauri source icon: `src-tauri/app-icon.png`
- Platform icon set: `src-tauri/icons/`

Regenerate platform icons:

```bash
npx tauri icon src-tauri/app-icon.png
```

### Project info

| Item | Value |
| --- | --- |
| App name | MDView |
| Current version | 2.0.0 |
| Supported platforms | Windows, macOS |
| Author | Sunky |
| Website | [www.sunky.net](https://www.sunky.net) |
| License | Apache-2.0 |
