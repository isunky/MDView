<p align="center">
  <img src="src/assets/app-icon.png" alt="MDView logo" width="112" height="112" />
</p>

<h1 align="center">MDView</h1>

<p align="center">
  A lightweight Markdown desktop viewer and source editor built with React, Vite, and Tauri.
  <br />
  轻量级 Markdown 桌面查看与源码编辑工具，基于 React、Vite 和 Tauri 构建。
</p>

<p align="center">
  <a href="#中文">中文</a>
  ·
  <a href="#english">English</a>
</p>

<p align="center">
  <strong>Version / 版本：</strong>1.4.0
  ·
  <strong>Author / 作者：</strong>Sunky
  ·
  <a href="https://www.sunky.net">www.sunky.net</a>
</p>

![MDView screenshot](main.png)

---

## 中文

MDView 是一个轻量、清爽的 Markdown 桌面应用，适合快速打开、阅读和轻量编辑 `.md` / `.markdown` 文件。它采用预览优先的界面布局，同时保留源码编辑、目录导航和保存能力，当前版本主要面向 Windows 桌面环境。

### 亮点

- **预览优先**：打开文档后优先进入阅读视图，减少干扰。
- **目录导航**：自动提取 `H1` 到 `H3` 标题，支持点击跳转。
- **源码编辑**：内置 Markdown 源码编辑区，支持编辑、保存和另存为。
- **状态清晰**：显示已保存 / 未保存状态，降低误操作风险。
- **GFM 支持**：支持表格、任务列表、代码高亮等 GitHub Flavored Markdown 能力。
- **桌面集成**：基于 Tauri 2，支持 Windows MSI 打包和 Markdown 文件关联配置。
- **中文友好**：已优化 Windows 中文字体回退，提升中文阅读清晰度。
- **双语界面**：根据系统语言默认显示中文或英文，并支持在界面内切换。

### 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面壳 | Tauri 2 |
| 前端 | React 19, TypeScript, Vite |
| Markdown | react-markdown, remark-gfm, rehype-highlight, highlight.js |
| 测试与质量 | Vitest, Testing Library, Playwright, ESLint, GitHub Actions |

### 快速开始

安装依赖：

```bash
npm install
```

运行 Web 预览：

```bash
npm run dev
```

运行桌面开发模式：

```bash
npm run desktop:dev
```

桌面开发和打包需要本机安装 Rust/Cargo。Windows 上还需要 Visual Studio Build Tools，并包含 C++ 构建工具。

### 常用命令

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
npm run version:sync -- 1.4.1
```

### Windows 打包

生成默认 Tauri 安装包：

```bash
npm run desktop:build
```

仅生成 MSI：

```bash
npm run desktop:build -- --bundles msi
```

如果当前终端没有加载 Visual Studio C++ 构建环境，可在 Windows 上使用：

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set PATH=%USERPROFILE%\.cargo\bin;%PATH%
npm run desktop:build -- --bundles msi
```

MSI 输出目录：

```text
src-tauri/target/release/bundle/msi/
```

### CI、发布与签名

项目包含 GitHub Actions 工作流：

- PR / 主分支推送：自动运行单元测试、lint、前端构建、Web E2E，并构建 Windows MSI artifact。
- 推送 `v*` 标签：自动构建 MSI，并上传到 GitHub Releases。

Windows 安装包支持可选签名。如需在 CI 中签名 MSI，请在 GitHub Secrets 中配置：

- `WINDOWS_CERTIFICATE_BASE64`
- `WINDOWS_CERTIFICATE_PASSWORD`
- `WINDOWS_CERTIFICATE_THUMBPRINT`

未配置证书时，工作流会继续生成未签名 MSI。

### 图标资源

当前应用图标来自新的 `MD` 扁平视觉设计：

- 前端展示图标：`src/assets/app-icon.png`
- Tauri 源图：`src-tauri/app-icon.png`
- 平台图标集：`src-tauri/icons/`

如需重新生成平台图标，可使用：

```bash
npx tauri icon src-tauri/app-icon.png
```

### macOS 说明

项目保留了 macOS bundle 配置，但 `.app` / DMG 需要在 macOS 或 macOS CI Runner 上构建。Windows 环境缺少 Apple SDK 和 macOS 原生链接工具链，无法直接生成可用的 macOS 安装包。

### 项目信息

| 项目 | 内容 |
| --- | --- |
| 应用名称 | MDView |
| 当前版本 | 1.4.0 |
| 作者 | Sunky |
| 网站 | [www.sunky.net](https://www.sunky.net) |
| 许可证 | GPL-3.0 |

---

## English

MDView is a small, focused Markdown desktop app for opening, reading, and lightly editing `.md` / `.markdown` files. It is preview-first by default, but keeps source editing, document outline navigation, and save workflows close at hand. The current release is primarily tuned for Windows desktop usage.

### Highlights

- **Preview-first reading**: opens documents in a clean reading layout.
- **Document outline**: extracts `H1` to `H3` headings with click-to-jump navigation.
- **Source editing**: includes a plain Markdown source editor with save and save-as support.
- **Clear state**: shows saved / unsaved document status.
- **GFM support**: renders tables, task lists, highlighted code blocks, and other GitHub Flavored Markdown features.
- **Desktop packaging**: built on Tauri 2 with Windows MSI packaging and Markdown file association configuration.
- **Chinese-friendly typography**: Windows font fallback has been tuned for clearer Chinese text rendering.
- **Bilingual interface**: defaults to Chinese or English from the system language and can be switched in the UI.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri 2 |
| Frontend | React 19, TypeScript, Vite |
| Markdown | react-markdown, remark-gfm, rehype-highlight, highlight.js |
| Testing and quality | Vitest, Testing Library, Playwright, ESLint, GitHub Actions |

### Getting Started

Install dependencies:

```bash
npm install
```

Run the web preview:

```bash
npm run dev
```

Run the desktop app in development mode:

```bash
npm run desktop:dev
```

Desktop development and packaging require Rust/Cargo. On Windows, Visual Studio Build Tools with the C++ toolchain is also required.

### Common Commands

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
npm run version:sync -- 1.4.1
```

### Windows Packaging

Build with the default Tauri bundle configuration:

```bash
npm run desktop:build
```

Build MSI only:

```bash
npm run desktop:build -- --bundles msi
```

If the current terminal has not loaded the Visual Studio C++ build environment, use:

```cmd
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set PATH=%USERPROFILE%\.cargo\bin;%PATH%
npm run desktop:build -- --bundles msi
```

Default MSI output directory:

```text
src-tauri/target/release/bundle/msi/
```

### CI, Release, and Signing

The repository includes GitHub Actions workflows:

- Pull requests and main branch pushes run unit tests, lint, frontend build, Web E2E, and produce a Windows MSI artifact.
- Pushing a `v*` tag builds the MSI and uploads it to GitHub Releases.

Windows installers support optional signing. To sign MSI builds in CI, configure these GitHub Secrets:

- `WINDOWS_CERTIFICATE_BASE64`
- `WINDOWS_CERTIFICATE_PASSWORD`
- `WINDOWS_CERTIFICATE_THUMBPRINT`

If no certificate secrets are configured, the workflows still produce unsigned MSI builds.

### Icon Assets

The app now uses the new flat `MD` logo design:

- Frontend icon: `src/assets/app-icon.png`
- Tauri source icon: `src-tauri/app-icon.png`
- Platform icon set: `src-tauri/icons/`

To regenerate platform icons:

```bash
npx tauri icon src-tauri/app-icon.png
```

### macOS Notes

The project keeps macOS bundle configuration in place, but `.app` / DMG builds must be produced on macOS or a macOS CI runner. Windows cannot produce usable macOS installers directly because it lacks the Apple SDK and native macOS linker toolchain.

### Project Info

| Item | Value |
| --- | --- |
| App name | MDView |
| Version | 1.4.0 |
| Author | Sunky |
| Website | [www.sunky.net](https://www.sunky.net) |
| License | GPL-3.0 |
