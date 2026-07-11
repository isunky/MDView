<div align="center">
  <img src="src/assets/app-icon.png" alt="MDView logo" width="104" height="104" />
  <h1>MDView</h1>
  <p><strong>Read Markdown. Stay focused.</strong></p>
  <p>轻量、清晰、跨平台的 Markdown 阅读与编辑工具</p>

  <p>
    <a href="https://github.com/isunky/MDView/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/isunky/MDView?style=flat-square&color=0f8f83" /></a>
    <a href="https://github.com/isunky/MDView/actions/workflows/ci.yml"><img alt="CI status" src="https://github.com/isunky/MDView/actions/workflows/ci.yml/badge.svg" /></a>
    <a href="LICENSE"><img alt="Apache-2.0 license" src="https://img.shields.io/github/license/isunky/MDView?style=flat-square" /></a>
    <img alt="Windows and macOS" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-334155?style=flat-square" />
  </p>

  <p>
    <a href="https://github.com/isunky/MDView/releases/latest"><strong>下载 / Download</strong></a>
    · <a href="#中文">中文</a>
    · <a href="#english">English</a>
    · <a href="#开发--development">Development</a>
  </p>

  <p>
    <strong>Version / 版本：</strong>2.0.0
    · <a href="https://www.sunky.net">Sunky</a>
  </p>
</div>

![MDView preview](main2.png)

<p align="center"><sub>专注阅读，也保留恰到好处的编辑能力。Focused reading with practical editing tools.</sub></p>

## 中文

MDView 是一款面向本地 Markdown 文档的轻量桌面应用。它把阅读体验放在首位，同时提供编辑、目录导航、导出和文件关联等常用能力。

- **清晰预览**：支持 GFM 表格、任务列表、代码高亮、Mermaid、内嵌 HTML 和颜色预览。
- **三种视图**：在预览、编辑和分屏模式之间快速切换。
- **长文档导航**：自动提取 `H1` 至 `H3` 生成目录，并跟随当前阅读位置。
- **本地文件体验**：支持最近文件、相对路径图片、本地 Markdown 链接和 `.md` / `.markdown` 文件关联。
- **实用编辑能力**：提供格式工具栏、语法速查、列表续写、缩进和常用快捷键。
- **灵活导出**：可导出独立 HTML、Word `.docx`，也可通过系统打印生成 PDF。

## English

MDView is a lightweight desktop app for local Markdown documents. It prioritizes a calm reading experience while keeping practical editing, navigation, export, and file-association tools close at hand.

- **Clean preview**: GFM tables, task lists, syntax highlighting, Mermaid, inline HTML, and color swatches.
- **Three views**: switch quickly between Preview, Edit, and Split modes.
- **Long-document navigation**: generate an outline from `H1` to `H3` and follow the current reading position.
- **Local-first workflow**: recent files, relative images, local Markdown links, and `.md` / `.markdown` associations.
- **Practical editing**: formatting toolbar, syntax reference, list continuation, indentation, and keyboard shortcuts.
- **Flexible export**: export standalone HTML or Word `.docx`, and create PDF files through system printing.

## 下载 / Download

从 [GitHub Releases](https://github.com/isunky/MDView/releases/latest) 获取最新版本。
Get the latest build from [GitHub Releases](https://github.com/isunky/MDView/releases/latest).

| 平台 / Platform | 包 / Package | 说明 / Notes |
| --- | --- | --- |
| Windows | MSI | 推荐；支持安装、文件关联和应用内更新 / Recommended; installer, file associations, and in-app updates |
| Windows | Portable ZIP | 解压即用，不写入文件关联 / Extract and run; no file associations |
| macOS | DMG | macOS 10.15 或更高版本 / macOS 10.15 or later |

> Windows MSI 和 macOS 构建可能未签名。系统首次启动时可能显示安全确认。
> Windows MSI and macOS builds may be unsigned, so the operating system can show a security prompt on first launch.

<details>
<summary>查看欢迎页 / View welcome screen</summary>
<br />
<img src="main.png" alt="MDView welcome screen" />
</details>

## 快捷键 / Shortcuts

| 操作 / Action | Windows | macOS |
| --- | --- | --- |
| 新建 / New | `Ctrl+N` | `Command+N` |
| 打开 / Open | `Ctrl+O` | `Command+O` |
| 保存 / Save | `Ctrl+S` | `Command+S` |
| 另存为 / Save As | `Ctrl+Shift+S` | `Command+Shift+S` |
| 粗体 / Bold | `Ctrl+B` | `Command+B` |
| 斜体 / Italic | `Ctrl+I` | `Command+I` |
| 插入链接 / Insert link | `Ctrl+K` | `Command+K` |
| 缩进 / 反向缩进 | `Tab` / `Shift+Tab` | `Tab` / `Shift+Tab` |

## 开发 / Development

需要 Node.js、Rust/Cargo，以及对应平台的桌面构建工具链。
Requires Node.js, Rust/Cargo, and the desktop build toolchain for your platform.

```bash
npm ci
npm run desktop:dev
```

质量检查 / Quality checks:

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
```

### 构建 / Packaging

| 目标 / Target | 命令 / Command |
| --- | --- |
| Windows MSI | `npm run desktop:build -- --bundles msi` |
| Windows installers + Portable ZIP | `npm run package:windows` |
| macOS DMG | `npm run desktop:build -- --bundles dmg` |

同步所有版本文件 / Synchronize all version files:

```bash
npm run version:sync -- 2.0.1
```

<details>
<summary><strong>CI、发布与签名 / CI, release, and signing</strong></summary>

GitHub Actions 会执行单元测试、ESLint、前端构建和 Playwright E2E 测试。手动运行 CI 可生成 Windows MSI、Portable ZIP 和 macOS Universal DMG；推送 `v*` Tag 或运行 Release 工作流可创建 GitHub Release。

GitHub Actions runs unit tests, ESLint, frontend builds, and Playwright E2E tests. A manual CI run can build Windows MSI, Portable ZIP, and macOS Universal DMG packages. Push a `v*` tag or run the Release workflow to create a GitHub Release.

可选 Windows 代码签名 Secrets / Optional Windows code-signing secrets:

- `WINDOWS_CERTIFICATE_BASE64`
- `WINDOWS_CERTIFICATE_PASSWORD`
- `WINDOWS_CERTIFICATE_THUMBPRINT`

Tauri 自动更新签名 Secrets / Tauri updater signing secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

</details>

## 技术栈 / Stack

| 层 / Layer | 技术 / Technology |
| --- | --- |
| Desktop | Tauri 2 |
| Frontend | React 19 · TypeScript · Vite |
| Markdown | react-markdown · remark-gfm · rehype-highlight · Mermaid |
| Quality | Vitest · Testing Library · Playwright · ESLint · GitHub Actions |

<details>
<summary><strong>项目信息 / Project information</strong></summary>

| 项目 / Item | 内容 / Value |
| --- | --- |
| 当前版本 | 2.0.0 |
| Version | 2.0.0 |
| 平台 / Platforms | Windows · macOS |
| 作者 / Author | [Sunky](https://www.sunky.net) |
| 许可证 / License | [Apache-2.0](LICENSE) |

</details>

---

<p align="center">
  Built for Markdown readers who value clarity.<br />
  为重视清晰阅读体验的人而设计。
</p>
