<div align="center">
  <img src="src/assets/app-icon.png" alt="MDView logo" width="96" height="96" />
  <h1>MDView</h1>
  <p><strong>面向 AI 时代的轻量 Markdown 阅读器。</strong><br />A lightweight Markdown reader for the AI era.</p>
  <p>美观易读 · 打开轻快 · 免费无广告<br />Beautifully readable · Quick to open · Free and ad-free</p>
  <p>
    <a href="https://github.com/isunky/MDView/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/isunky/MDView?style=flat-square&color=0f8f83" /></a>
    <a href="LICENSE"><img alt="GPL-3.0 license" src="https://img.shields.io/github/license/isunky/MDView?style=flat-square" /></a>
    <img alt="Windows, macOS, and Edge" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Edge-334155?style=flat-square" />
  </p>
  <p>
    <a href="https://github.com/isunky/MDView/releases/latest"><strong>下载 / Download</strong></a>
    · <a href="#中文">中文</a>
    · <a href="#english">English</a>
    · <a href="#ai-build">AI 辅助编译 / Build with AI</a>
  </p>
  <p><strong>Version / 版本：</strong>3.4.0 · <a href="https://www.sunky.net">Sunky</a></p>
</div>

## 界面预览 / Preview

<table>
  <tr>
    <td width="50%" align="center">
      <a href="main2.png"><img src="main2.png" alt="MDView 阅读工作区与目录导航 / Reading workspace and outline" width="100%" /></a>
      <br /><sub>阅读工作区 / Reading workspace</sub>
    </td>
    <td width="50%" align="center">
      <a href="main.png"><img src="main.png" alt="MDView 欢迎页与最近文件 / Welcome screen and recent files" width="100%" /></a>
      <br /><sub>欢迎页 / Welcome screen</sub>
    </td>
  </tr>
</table>

## 中文

**让 AI 生成的内容，也有舒适的阅读体验。**

MDView 是一款轻量、美观、免费无广告的 Markdown 阅读器。将 AI 生成的方案、笔记或技术说明保存为 Markdown 文件，即可在清晰的排版中阅读，用目录浏览长文，查看其中的图表与公式。打开轻快，无需注册，也适合你已有的本地文档。

阅读是核心，编辑与转换随手可用：需要时修改几处内容，或导出一份排版整洁的文档，与他人分享。

**舒适阅读，自由排版**

明暗主题与细致的文字排版，让内容清晰呈现。字体、字号、行距和正文宽度均可调整；Windows 和 macOS 还可直接选择电脑中已安装的字体，找到适合自己的阅读方式。

**长篇文档，定位自如**

可折叠的多级目录支持章节跳转与当前位置高亮。再次打开文件，恢复阅读进度、缩放和视图设置，接着上次往下读。

**图表、公式与配色，一目了然**

直接预览 Mermaid 图表、LaTeX 公式、表格和高亮代码。支持的颜色值旁会显示对应色块，查看设计规范与配色方案更直观。

**阅读为主，随手可改**

切换源码编辑，或在同步分屏中边写边看。图片可粘贴、拖入或批量插入，表格与公式也有快捷入口；查找替换、撤销重做和草稿恢复，让日常修改更省心。

**Word 转入，精致导出**

导入 Word 即可转换为 Markdown 草稿，编辑后保存为 `.md` 文件。也可导出排版美观的 Word、独立 HTML，或通过系统打印生成 PDF，让整理好的内容便于分享与交付。

## English

**Give AI-generated content a better place to be read.**

MDView is a lightweight, thoughtfully designed Markdown reader, free and ad-free. Save AI-generated plans, notes, or technical explanations as Markdown files, then read them with clear typography, section navigation, diagrams, and formulas. It opens quickly, needs no account, and works just as well with your existing local documents.

Reading comes first. Editing and conversion are close at hand when you need to revise a passage or share a neatly formatted document.

**A polished reading experience**

Light and dark themes pair with carefully styled text. Adjust the font, size, line spacing, and page width; on Windows and macOS, you can also choose any installed font for comfortable reading.

**Pick up where you left off**

A collapsible outline lets you jump between sections and highlights your current heading. Reopen a file to restore its reading position, zoom, and view settings.

**Diagrams, formulas, and colors in context**

Preview Mermaid diagrams, LaTeX formulas, tables, and highlighted code. Color swatches appear beside supported color values, making palettes and design specifications easier to read.

**Built for reading, ready for quick edits**

Switch to source editing or write alongside a synchronized preview. Paste, drop, or batch-insert images, with quick tools for tables and formulas. Find and replace, undo and redo, and draft recovery support everyday revisions.

**From Word to Markdown, and back to polished documents**

Import Word as a Markdown draft, then edit and save it as a `.md` file. Export neatly formatted Word documents or standalone HTML, or print to PDF for sharing and delivery.

## 下载与安装 / Installation

从 [GitHub Releases](https://github.com/isunky/MDView/releases/latest) 选择适合的版本。 / Choose a package from GitHub Releases.

| 平台 / Platform | 推荐方式 / Recommended option |
| --- | --- |
| Windows | **MSI**：安装、文件关联与更新检查 / Installer, file associations, and update checks |
| Windows 绿色版 / Portable | **ZIP**：解压后运行 / Extract and run |
| macOS | **[本机源码编译 / Local build](#macos-build)**：推荐使用 AI 编程工具辅助 / AI-assisted build recommended |
| Microsoft Edge | **Extension ZIP**：解压后加载 / Extract and load unpacked |

**Windows：**需要预先安装 [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)，MDView 不附带或下载运行时。MSI 安装界面为英文，应用支持中英文。

**macOS：**因发布包尚未完成 Apple 签名与公证，建议在自己的 Mac 上[通过 AI 辅助编译](#ai-build)。本地构建仍可能出现系统安全提示。

<details>
<summary>English installation notes</summary>

Windows requires WebView2 Runtime to be installed separately; MDView does not bundle or download it. The MSI uses an English installer; the app supports Chinese and English.

The macOS Universal DMG supports Intel and Apple Silicon on macOS 10.15+. It uses ad-hoc signing without Developer ID signing or Apple notarization and may be blocked by macOS. We recommend building from source on your own Mac.

</details>

<details>
<summary>Edge 扩展与 Windows 部署 / Edge and Windows deployment</summary>

**Edge：**在 `edge://extensions` 开启开发人员模式，选择“加载解压缩的扩展”，选中解压后含 `manifest.json` 的文件夹。

**Edge:** enable Developer mode at `edge://extensions`, choose **Load unpacked**, and select the extracted folder containing `manifest.json`.

**Windows：**MSI 默认关联 `.md` 和 `.markdown`，安装时可取消。静默安装时可通过以下参数禁用关联，请替换为实际 MSI 文件名。

**Windows:** Markdown associations are enabled by default and can be deselected. To disable them during unattended installation, replace the example filename below with your MSI:

```powershell
msiexec /i MDView_x64.msi ASSOCIATE_MARKDOWN_FILES=0 /qn
```

签名状态以各版本发布说明为准；详见[代码签名政策](CODE_SIGNING_POLICY.md)。 / See each release's signing status and the [code signing policy](CODE_SIGNING_POLICY.md).

</details>

<a id="macos-build"></a>
<a id="ai-build"></a>

## 用 AI 帮你编译 / Build with AI

无需先熟悉编译命令，让能操作本地终端的 AI 编程工具协助完成：

1. 从 [Releases](https://github.com/isunky/MDView/releases/latest) 下载 **Source code (zip)** 并解压。
2. 用 AI 编程工具打开解压后的项目文件夹。Mac 版本需在 Mac 上编译，Windows 版本需在 Windows 上编译。
3. 发送下方对应的提示词，按提示完成必要的环境安装，等待 AI 给出安装包位置。

首次准备环境与下载依赖需要联网。

**Mac 提示词**

```text
请帮我将当前文件夹中的 MDView 源码编译为这台 Mac 可安装的版本。

先阅读项目构建说明，检查本机环境，说明缺失的依赖并协助安装。
使用项目现有构建配置生成适合这台 Mac 的 DMG 安装包。
遇到错误请定位原因、做必要修复并重试，保留我的已有修改。
沿用本地签名配置，不关闭系统安全机制，不上传或发布产物。
完成后确认安装包已生成，告诉我完整路径和安装方法；如未成功，请说明具体阻塞原因。
```

**Windows 提示词**

```text
请帮我将当前文件夹中的 MDView 源码编译为 Windows 安装版和绿色版。

先阅读项目构建说明，检查本机环境，说明缺失的依赖并协助安装。
优先使用项目现有的一键打包入口，生成 MSI、Portable ZIP 和校验文件。
遇到错误请定位原因、做必要修复并重试，保留我的已有修改。
使用本地打包配置，不要求发布签名密钥，不上传或发布产物。
完成后确认文件已生成，告诉我完整路径和使用方法，并检查运行所需的 WebView2 是否可用。
如未成功，请说明具体阻塞原因。
```

<details>
<summary>English instructions and ready-to-use prompts</summary>

Download a release's **Source code (zip)** and extract it. Open the project folder in an AI coding tool with local terminal access, then send the appropriate prompt below. Build on the target platform: macOS on a Mac, Windows on Windows. Initial setup requires internet access; follow any dependency installation steps the tool presents.

**macOS**

```text
Build the MDView source in this folder into an installable app for this Mac.

Read the project's build instructions, check the environment, and help install missing prerequisites.
Use the existing build configuration to create a DMG for this Mac's architecture.
Diagnose failures, make necessary fixes, and retry while preserving my existing changes.
Keep local signing settings and system security protections. Do not upload or publish artifacts.
Verify the DMG exists, then provide its full path and installation steps.
If the build cannot finish, explain the specific blocker.
```

**Windows**

```text
Build the MDView source in this folder into Windows installer and portable packages.

Read the project's build instructions, check the environment, and help install missing prerequisites.
Use the existing one-step packaging entry point to create an MSI, Portable ZIP, and checksums.
Diagnose failures, make necessary fixes, and retry while preserving my existing changes.
Use local build settings without release signing keys. Do not upload or publish artifacts.
Verify the files exist, provide their full paths and usage steps, and check WebView2 availability.
If the build cannot finish, explain the specific blocker.
```

</details>

<details>
<summary>Mac 环境、手动命令与签名 / Mac prerequisites, commands, and signing</summary>

准备 [Node.js 24](https://nodejs.org/en/download)、[Rust/Cargo stable](https://rustup.rs/) 和 Xcode Command Line Tools；详见 [Tauri 环境要求](https://v2.tauri.app/start/prerequisites/)。

Install Node.js 24, stable Rust/Cargo, and Xcode Command Line Tools. See the Tauri prerequisites linked above.

```bash
# 仅在缺少 Apple 编译工具时执行 / Only if Apple's build tools are missing
xcode-select --install

# 在解压后的源码目录执行 / Run from the extracted source directory
npm ci
npm run desktop:build -- --bundles dmg
```

默认构建当前 Mac 架构的版本。签名机制参见 [Tauri macOS 签名说明](https://v2.tauri.app/distribute/sign/macos/)。

The default build targets your Mac's architecture. See the Tauri macOS signing guide above for signing details.

默认产物位于 `src-tauri/target/release/bundle/dmg/`，打开 DMG 后将 MDView 拖入“应用程序”。本地构建使用 ad-hoc 签名，不等于 Apple 公证，也不保证消除所有安全提示。

Find the DMG in `src-tauri/target/release/bundle/dmg/`, open it, and drag MDView into Applications. Local builds use ad-hoc signing, are not Apple-notarized, and may still show security prompts.

</details>

## 使用参考 / Reference

<details>
<summary>常用快捷键 / Keyboard shortcuts</summary>

| 操作 / Action | Windows | macOS |
| --- | --- | --- |
| 新建 / New | `Ctrl+N` | `Command+N` |
| 打开 / Open | `Ctrl+O` | `Command+O` |
| 保存 / Save | `Ctrl+S` | `Command+S` |
| 另存为 / Save As | `Ctrl+Shift+S` | `Command+Shift+S` |
| 查找 / Find | `Ctrl+F` | `Command+F` |
| 撤销 / Undo | `Ctrl+Z` | `Command+Z` |
| 重做 / Redo | `Ctrl+Y` / `Ctrl+Shift+Z` | `Command+Shift+Z` |
| 粗体 / Bold | `Ctrl+B` | `Command+B` |
| 斜体 / Italic | `Ctrl+I` | `Command+I` |
| 插入链接 / Insert link | `Ctrl+K` | `Command+K` |
| 缩进 / 反向缩进 / Indent / Outdent | `Tab` / `Shift+Tab` | `Tab` / `Shift+Tab` |

</details>

<details>
<summary>Word 导入 / Word import</summary>

Word 转换在本机完成。首次使用需要 Python 和转换组件，下载组件需要联网。

Word conversion runs locally. Initial setup requires Python and conversion components, with internet access for downloads.

</details>

<details>
<summary>数学公式 / Math formulas</summary>

使用 `$...$` 插入行内公式，单独成行的 `$$` 包裹公式块。编辑时点击 `Σ` 可使用公式模板与实时预览；普通美元符号写为 `\$`。

Use `$...$` for inline math and `$$` on separate lines for display math. Click `Σ` for templates and a live preview. Escape a literal dollar sign as `\$`.

</details>

<details>
<summary>开发与打包 / Development and packaging</summary>

技术栈 / Stack：Tauri 2 · React 19 · TypeScript · Vite。

准备 Node.js 24、Rust/Cargo 和[对应平台构建工具](https://v2.tauri.app/start/prerequisites/)，在源码目录运行： / Install Node.js 24, Rust/Cargo, and platform build tools, then run from the source directory:

```bash
npm ci
npm run desktop:dev
```

| 目标 / Target | 命令 / Command |
| --- | --- |
| Windows MSI | `npm run desktop:build -- --bundles msi` |
| Windows MSI + Portable ZIP + SHA-256 | `npm run package:windows` |
| macOS DMG | `npm run desktop:build -- --bundles dmg` |
| Edge ZIP | `npm run edge:package` |

验证命令 / Verification：`npm test` · `npm run lint` · `npm run build` · `npm run test:e2e`。

版本管理 / Versioning：`npm run version:sync -- <major.minor.patch>`，然后 / then `npm run version:check`。

</details>

<details>
<summary>CI、发布与签名 / CI, releases, and signing</summary>

普通推送与 PR 执行质量检查；手动运行 CI 额外生成桌面安装包。推送 `v*` Tag 或运行 Release 工作流可发布 GitHub Release。

Pushes and PRs run quality checks; manual CI runs also build desktop installers. A `v*` tag or the Release workflow publishes a GitHub Release.

| 集成 / Integration | 配置 / Configuration |
| --- | --- |
| Windows SignPath | Secret: `SIGNPATH_API_TOKEN`；Variable: `SIGNPATH_ORGANIZATION_ID` |
| Tauri updater | Secrets: `TAURI_SIGNING_PRIVATE_KEY`、`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` |
| Edge Add-ons | Secret: `EDGE_ADDONS_API_KEY`；Variables: `EDGE_ADDONS_CLIENT_ID`、`EDGE_ADDONS_PRODUCT_ID` |

SignPath 签名仅用于 Release，需完成配置与审批；Edge 首次发布需在 Microsoft Partner Center 创建产品。macOS Developer ID 签名与公证尚未配置。

SignPath signing applies to releases after configuration and approval. Create the initial Edge product in Microsoft Partner Center. macOS Developer ID signing and notarization are not yet configured.

</details>

## 项目信息 / Project

| 项目 / Item | 内容 / Value |
| --- | --- |
| 当前版本 | 3.4.0 |
| Version | 3.4.0 |
| 作者 / Author | [Sunky](https://www.sunky.net) |
| 许可证 / License | [GPL-3.0](LICENSE) |

第三方依赖保留原许可证。 / Third-party dependencies retain their original licenses.
