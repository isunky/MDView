<div align="center">
  <img src="src/assets/app-icon.png" alt="MDView logo" width="96" height="96" />
  <h1>MDView</h1>
  <p><strong>面向 AI 场景的轻量 Markdown 阅读器。</strong><br />A lightweight Markdown reader for AI workflows.</p>
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
  <p><strong>Version / 版本：</strong>3.7.1 · <a href="https://www.sunky.net">Sunky</a></p>
</div>

## 界面预览 / Preview

<table>
  <tr>
    <td width="50%" align="center">
      <a href="docs/assets/screenshots/main2.png"><img src="docs/assets/screenshots/main2.png" alt="MDView 阅读工作区与目录导航 / Reading workspace and outline" width="100%" /></a>
      <br /><sub>阅读工作区 / Reading workspace</sub>
    </td>
    <td width="50%" align="center">
      <a href="docs/assets/screenshots/main.png"><img src="docs/assets/screenshots/main.png" alt="MDView 欢迎页与最近文件 / Welcome screen and recent files" width="100%" /></a>
      <br /><sub>欢迎页 / Welcome screen</sub>
    </td>
  </tr>
</table>

## 中文

**让每一份 Markdown，都更适合阅读。**

MDView 是一款面向 AI 场景的轻量 Markdown 阅读器，也适合阅读笔记、项目文档和技术资料。它打开轻快、界面简洁，免费无广告，无需注册账号。无论内容来自 AI 还是本地已有文件，都可以用舒适的排版阅读，必要时直接编辑、转换和分享。

### 专注阅读，也照顾你的习惯

打开 `.md` 或 `.markdown` 文件，即可在阅读视图中查看清晰排版的正文、表格、任务列表和代码。浅色、深色与跟随系统主题适应不同环境；字体、字号、行距、正文宽度和缩放均可调整，桌面版还支持选择电脑中已安装的字体。

长文档可以通过左侧目录快速跳转，当前章节随正文滚动高亮；目录可关闭、调整宽度并选择显示层级。重新打开文件时，MDView 会恢复阅读位置、视图和相关阅读设置。需要参考文档时，还可将桌面窗口置顶，切换到其他应用后继续查看。

### 图表、公式和图片，不必离开文档

Mermaid 图表、LaTeX 数学公式、语法高亮代码和常见 Markdown 表格可直接预览；支持的颜色值旁会显示色块，阅读设计规范或配色方案时更直观。文档中的本地图片和相对路径 Markdown 链接也可以直接查看或打开。

图片与 Mermaid 图表可在独立预览中按文档顺序浏览，支持缩放、拖动、适应窗口和前后切换。普通图片可按原格式保存，Mermaid 图表可保存为完整 PNG，不受当前缩放位置影响。

### 阅读为主，修改也顺手

需要调整内容时，切换到源码编辑或分屏视图即可；分屏支持双向同步滚动，拖动分隔线可调整两侧宽度。编辑工具栏提供标题、列表、链接、表格、图片和公式等快捷入口，也可通过粘贴、拖放或批量选择插入图片。

查找支持匹配数量和前后跳转，编辑时可替换或全部替换；撤销重做、常用快捷键和内置 Markdown 语法参考，方便处理日常修改。状态栏显示字数、字符数、光标位置和预计阅读时长，保存状态也始终可见。

### 本地文件，更安心

文档保存在自己的设备上。最近文件列表支持重新打开、定位所在文件夹、移除记录或临时隐藏文件名与路径；文件在外部发生变化时，MDView 会提示处理，避免无意覆盖。未保存的修改有本地草稿备份，重新启动时可以选择恢复；恢复后仍需主动保存到文件。

### 从 Word 导入，也能整洁导出

将 Word `.docx` 导入为 Markdown 草稿，编辑后另存为 `.md`；原 Word 文件不会被修改。转换在本机进行，首次使用需准备 Python 和转换组件，下载组件时需要联网。

整理完成后，可导出排版整洁的 Word、独立 HTML，或通过系统打印生成 PDF。不同格式的能力会在导出前说明：例如导出 Word 时，Mermaid 图表保留为代码。HTML 和 Word 导出后可直接打开文件或所在文件夹。

更多产品设计背景可阅读[《给 Markdown 一个好读的家：我为什么做了 MDView》](docs/articles/MDView-wechat-intro.zh-CN.md)。

## English

**Give every Markdown document a better place to be read.**

MDView is a lightweight Markdown reader designed for AI workflows and equally at home with notes, project documentation, and technical references. It opens quickly, has a clean interface, and is free and ad-free with no account required. Read your local files comfortably, then edit, convert, or share them when needed.

### Read your way

Open `.md` and `.markdown` files with clear typography for text, tables, task lists, and code. Choose a light, dark, or system theme, and adjust the font, size, line spacing, page width, and zoom. The desktop app also lets you select fonts installed on your computer.

Navigate long documents with the adjustable outline and follow the highlighted current section as you scroll. Hide the outline or choose its heading depth and width. When you reopen a file, MDView restores its reading position, view, and related reading settings. Pin the desktop window on top to keep a reference visible while working in another app.

### See diagrams, formulas, and images in context

Preview Mermaid diagrams, LaTeX math, syntax-highlighted code, and Markdown tables directly. Supported color values have a matching swatch, making design specifications and palettes easier to scan. Local images and relative Markdown links can be opened from the document.

Open images and Mermaid diagrams in a separate viewer to browse them in document order, zoom, pan, and fit them to the window. Save ordinary images in their original format or export an entire Mermaid diagram as a PNG, independent of the current zoom and pan.

### Read first, edit when needed

Switch to source editing or a split view with synchronized scrolling in both directions. Drag the divider to adjust pane widths. The editor provides shortcuts for headings, lists, links, tables, images, and formulas; images can also be pasted, dropped, or inserted in batches.

Find shows match counts and previous/next navigation; the editor adds replace and replace all. Undo and redo, common keyboard shortcuts, and a built-in Markdown syntax reference make everyday changes easier. The status bar shows word and character counts, cursor position, and estimated reading time, while save status remains visible.

### Keep control of local files

Documents stay on your device. Reopen recent files, reveal their folders, remove entries, or temporarily hide names and paths. MDView warns when a file changes externally to help prevent accidental overwrites. Unsaved work is backed up locally and can be restored on the next launch; restored content still needs to be saved explicitly.

### Import Word and share polished documents

Import a Word `.docx` as a Markdown draft, then edit and save it as `.md` without changing the original. Conversion takes place locally. First-time setup requires Python and conversion components; downloading those components requires internet access.

Export a neatly formatted Word document or standalone HTML, or use system printing to create a PDF. MDView explains format limitations before export: for example, Mermaid diagrams are kept as code in Word. After exporting HTML or Word, you can open the file or its containing folder directly.

## 下载与安装 / Installation

从 [GitHub Releases](https://github.com/isunky/MDView/releases/latest) 选择适合的版本。 / Choose a package from GitHub Releases.

| 平台 / Platform | 推荐方式 / Recommended option |
| --- | --- |
| Windows | **MSI**：安装、文件关联与更新检查 / Installer, file associations, and update checks |
| Windows 绿色版 / Portable | **ZIP**：解压后运行 / Extract and run |
| macOS | **[本机源码编译 / Local build](#macos-build)**：推荐使用 AI 编程工具辅助 / AI-assisted build recommended |
| Microsoft Edge | **Extension ZIP**：解压后加载 / Extract and load unpacked |

**Windows：**需要预先安装 [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)，MDView 不附带或下载运行时。MSI 安装界面为英文；应用支持简体中文、繁体中文、韩语、日语、西班牙语和英语，首次启动跟随系统语言，也可在「应用」菜单中切换并记住选择。

安装版可在「应用」菜单中手动检查更新并安装新版；绿色版可检查更新并前往 Release 页面下载新版 ZIP。MSI 安装时可选择关联 Markdown 文件，之后双击文件即可打开。

**macOS：**因发布包尚未完成 Apple 签名与公证，建议在自己的 Mac 上[通过 AI 辅助编译](#ai-build)。本地构建仍可能出现系统安全提示。

<details>
<summary>English installation notes</summary>

Windows requires WebView2 Runtime to be installed separately; MDView does not bundle or download it. The MSI uses an English installer. The app supports Simplified Chinese, Traditional Chinese, Korean, Japanese, Spanish, and English, follows your system language on first launch, and remembers changes made in the App menu.

Use the App menu to check for updates: the MSI edition can install an available update, while the portable edition opens the Release page to download the new ZIP. The MSI also offers Markdown file association during installation.

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

维护者资料 / Maintainer docs: [`ROADMAP.md`](ROADMAP.md) · [`工程目录说明 / Project structure`](docs/PROJECT_STRUCTURE.md)。

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
| 当前版本 | 3.7.1 |
| Version | 3.7.1 |
| 作者 / Author | [Sunky](https://www.sunky.net) |
| 许可证 / License | [GPL-3.0](LICENSE) |

第三方依赖保留原许可证。 / Third-party dependencies retain their original licenses.
