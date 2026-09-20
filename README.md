<div align="center">
  <img src="src/assets/app-icon.png" alt="MDView logo" width="104" height="104" />
  <h1>MDView</h1>
  <p><strong>打开 Markdown，专注阅读，随手编辑。</strong></p>
  <p>Read Markdown comfortably. Make quick edits. Keep your files local.</p>

  <p>
    <a href="https://github.com/isunky/MDView/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/isunky/MDView?style=flat-square&color=0f8f83" /></a>
    <a href="https://github.com/isunky/MDView/actions/workflows/ci.yml"><img alt="CI status" src="https://github.com/isunky/MDView/actions/workflows/ci.yml/badge.svg" /></a>
    <a href="LICENSE"><img alt="GPL-3.0 license" src="https://img.shields.io/github/license/isunky/MDView?style=flat-square" /></a>
    <img alt="Windows, macOS, and Edge" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Edge-334155?style=flat-square" />
  </p>

  <p>
    <a href="https://github.com/isunky/MDView/releases/latest"><strong>下载 / Download</strong></a>
    · <a href="#中文">中文</a>
    · <a href="#english">English</a>
    · <a href="#macos-build">Mac 源码编译 / Build for Mac</a>
  </p>

  <p>
    <strong>Version / 版本：</strong>3.4.0
    · <a href="https://www.sunky.net">Sunky</a>
  </p>
</div>

## 界面预览 / Interface Preview

<table>
  <tr>
    <td width="50%" align="center"><strong>阅读工作区 / Reading workspace</strong></td>
    <td width="50%" align="center"><strong>欢迎页 / Welcome screen</strong></td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href="main2.png">
        <img src="main2.png" alt="MDView 阅读工作区，展示 Markdown 预览与目录导航" width="100%" />
      </a>
    </td>
    <td width="50%" valign="top">
      <a href="main.png">
        <img src="main.png" alt="MDView 欢迎页，展示打开文件与最近文件入口" width="100%" />
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <sub>目录导航、沉浸预览与长文档阅读<br />Outline navigation, focused preview, and long-document reading</sub>
    </td>
    <td align="center">
      <sub>快速打开、新建和继续最近文档<br />Open, create, or continue recent documents</sub>
    </td>
  </tr>
</table>

<p align="center"><sub>点击截图查看原图 · Click either screenshot to view it at full size.</sub></p>

## 中文

MDView 让本地 Markdown 文件像普通文档一样方便阅读。打开笔记、项目说明或长篇资料，用目录快速找到内容；需要修改时，切到编辑或分屏视图，边写边看效果。文档保存在自己的电脑上，不需要注册账号。

- **长文档也好读**：可折叠目录支持一至五级标题、点击跳转与当前章节高亮。调整目录宽度、阅读缩放和视图后，再次打开同一文件可以继续上次的阅读现场。
- **按自己的习惯阅读**：浅色、深色或跟随系统，自由调整字体、字号、行距和正文宽度。表格、任务列表、代码、Mermaid 图表与 LaTeX 公式都能直接预览。
- **修改几处，也很顺手**：在源码编辑器中快速插入标题、列表、表格和公式，使用查找替换、撤销重做与语法参考；分屏时可同步滚动正文和预览。未保存内容提供本地草稿备份与恢复。
- **图片和文档连得起来**：批量选择、粘贴或拖入图片，自动保存到文档旁的 `assets` 文件夹并插入引用；支持相对路径图片、本地 Markdown 链接和最近文件列表。
- **方便交换和分享**：导出 Word、独立 HTML，或通过系统打印生成 PDF。也可将 Word `.docx` 导入为 Markdown 草稿，转换在本机完成；首次使用需要准备 Python 和转换组件，下载这些组件需要联网。

第一次使用：从下方选择适合你的版本，打开一个 `.md` 文件即可开始阅读。Windows 安装版可关联 Markdown 文件，之后双击文件就能打开 MDView。

## English

MDView makes local Markdown files comfortable to read. Open notes, project documentation, or a long reference, then use the outline to find what you need. Switch to Edit or Split view to make changes and see the result. Your documents stay on your computer, with no account required.

- **Navigate long documents**: a collapsible outline supports heading levels one through five, section jumps, and current-section highlighting. Reopen a file to restore its reading position, zoom, view, and outline preferences.
- **Read your way**: choose light, dark, or system appearance and adjust the font, size, line spacing, and page width. Preview tables, task lists, code, Mermaid diagrams, and LaTeX formulas.
- **Make quick edits**: insert headings, lists, tables, and formulas in the source editor, with find and replace, undo and redo, and a syntax reference. Split view can scroll the editor and preview together. Local draft backups help recover unsaved work.
- **Keep images and files connected**: select, paste, or drop images to save them in an `assets` folder beside your document and insert their references. Relative image paths, local Markdown links, and recent files are supported.
- **Share in familiar formats**: export Word or standalone HTML, or create a PDF through system printing. Import Word `.docx` files as Markdown drafts using a local converter; initial setup requires Python and conversion components, which need internet access to download.

To get started, choose a version below and open a `.md` file. The Windows installer can associate Markdown files with MDView so you can open them with a double-click.

### 数学公式 / Math formulas

行内公式使用 `$...$`，独立公式块使用单独成行的 `$$`。编辑模式可点击 `Σ` 打开公式面板，通过模板、LaTeX 输入和实时预览快速插入或修改公式。需要原样显示美元符号时请写为 `\$`。

Use `$...$` for inline math and `$$` on separate lines for display math. In Edit mode, click `Σ` to insert or update a formula with templates and a live LaTeX preview. Escape a literal dollar sign as `\$`.

## 下载 / Download

从 [GitHub Releases](https://github.com/isunky/MDView/releases/latest) 获取最新版本。
Get the latest build from [GitHub Releases](https://github.com/isunky/MDView/releases/latest).

| 平台 / Platform | 包 / Package | 说明 / Notes |
| --- | --- | --- |
| Windows | MSI | 日常使用推荐；可关联文件并检查更新，安装界面为英文 / Recommended for everyday use; file associations and update checks, with an English installer |
| Windows | Portable ZIP | 解压即用，不写入文件关联 / Extract and run; no file associations |
| macOS | 源码编译 / Build from source（推荐 / Recommended） | 因签名与公证尚未完善，建议在自己的 Mac 上编译；[查看步骤 / Instructions](#macos-build) |
| macOS | Universal DMG | 供尝试，支持 Intel 与 Apple Silicon，macOS 10.15+；首次打开可能被系统拦截 / Optional prebuilt package for Intel and Apple Silicon, macOS 10.15+; macOS may block first launch |
| Microsoft Edge | Extension ZIP | 解压后在 `edge://extensions` 开启开发人员模式，选择“加载解压缩的扩展”并选中含 `manifest.json` 的文件夹 / Extract, enable Developer mode at `edge://extensions`, then load the folder containing `manifest.json` |

Windows MSI 安装时可选择是否关联 `.md` 和 `.markdown`，默认开启。静默部署可传入 `ASSOCIATE_MARKDOWN_FILES=0` 禁用关联：

```powershell
msiexec /i MDView_x64.msi ASSOCIATE_MARKDOWN_FILES=0 /qn
```

The Windows MSI lets you opt out of `.md` and `.markdown` associations, which are enabled by default. For unattended deployment, pass `ASSOCIATE_MARKDOWN_FILES=0` as shown above.

Windows MSI 和 Portable ZIP 不内嵌、下载或安装 WebView2。运行 MDView 前，请确保系统已经安装 [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)；应用界面仍会根据系统语言显示中文或英文。

The Windows MSI and Portable ZIP do not bundle, download, or install WebView2. Before running MDView, ensure that [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) is installed. The app UI still follows the system language and supports both Chinese and English.

> 从首个 SignPath 审批后的发布版本开始，Windows MSI 与 Portable ZIP 中的 `MDView.exe` 会进行 Authenticode 签名。历史版本、本地构建和未完成审批的构建仍可能未签名；新签名版本也需要逐步建立 SmartScreen 声誉。
> Starting with the first SignPath-approved release, the Windows MSI and `MDView.exe` in the Portable ZIP are Authenticode-signed. Historical, local, and not-yet-approved builds may remain unsigned; newly signed versions also need time to establish SmartScreen reputation.

> **Mac 用户建议优先下载源码，在自己的 Mac 上编译。** 当前发布包仅使用 ad-hoc 签名，尚未配置 Apple Developer ID 签名与公证，下载的 DMG 仍可能被系统拦截。已有构建环境的用户可按[源码编译步骤](#macos-build)生成自用版本；本地编译不等于通过 Apple 公证，也不能保证消除所有安全提示。
>
> **For Mac users, we recommend downloading the source and building on your own Mac.** Release packages use ad-hoc signing without Apple Developer ID signing or notarization, so macOS may still block the downloaded DMG. Follow the [build instructions](#macos-build) for a personal build. Building locally does not notarize the app or guarantee that every security prompt disappears.

签名政策与发布审批流程见 [CODE_SIGNING_POLICY.md](CODE_SIGNING_POLICY.md)。
See [CODE_SIGNING_POLICY.md](CODE_SIGNING_POLICY.md) for the signing policy and release approval process.

## 快捷键 / Shortcuts

| 操作 / Action | Windows | macOS |
| --- | --- | --- |
| 新建 / New | `Ctrl+N` | `Command+N` |
| 打开 / Open | `Ctrl+O` | `Command+O` |
| 保存 / Save | `Ctrl+S` | `Command+S` |
| 另存为 / Save As | `Ctrl+Shift+S` | `Command+Shift+S` |
| 查找 / Find | `Ctrl+F` | `Command+F` |
| 撤销 / Undo | `Ctrl+Z` | `Command+Z` |
| 重做 / Redo | `Ctrl+Y` 或 `Ctrl+Shift+Z` | `Command+Shift+Z` |
| 粗体 / Bold | `Ctrl+B` | `Command+B` |
| 斜体 / Italic | `Ctrl+I` | `Command+I` |
| 插入链接 / Insert link | `Ctrl+K` | `Command+K` |
| 缩进 / 反向缩进 | `Tab` / `Shift+Tab` | `Tab` / `Shift+Tab` |

## 源码编译与开发 / Build from source and development

以下内容适合希望自行编译或参与开发的用户。Windows 用户通常直接下载 MSI 即可；macOS 用户建议先阅读下面的本机编译说明。
This section is for building or contributing to MDView. Windows users can usually use the MSI directly; Mac users should read the local build instructions below.

<a id="macos-build"></a>

### 在 Mac 上自行编译 / Build on your Mac

由于官方发布包尚未完成 Developer ID 签名与 Apple 公证，**目前更推荐 Mac 用户自行下载源码编译**。需要一台 Mac、[Node.js 24](https://nodejs.org/en/download)、[Rust/Cargo（stable）](https://rustup.rs/) 和 Xcode Command Line Tools。环境准备可参考 [Tauri 官方说明](https://v2.tauri.app/start/prerequisites/)。首次安装依赖和构建需要联网。

Until release packages have Developer ID signing and Apple notarization, **building from source on your own Mac is the recommended option**. Install Node.js 24, stable Rust/Cargo, and Xcode Command Line Tools using the links above. Initial dependency installation and compilation require internet access.

1. 在终端运行以下命令安装 Apple 编译工具；已安装则跳过。Install Apple's command-line tools, if needed:

   ```bash
   xcode-select --install
   ```

2. 下载源码。在 [Releases](https://github.com/isunky/MDView/releases/latest) 选择所需版本的 **Source code (zip)** 并解压，在终端进入该目录；也可用以下命令获取最新开发代码。Download and extract a release's **Source code (zip)** and open its directory in Terminal, or clone the latest development code:

   ```bash
   git clone https://github.com/isunky/MDView.git
   cd MDView
   ```

3. 安装依赖并生成 DMG。Install dependencies and build:

   ```bash
   npm ci
   npm run desktop:build -- --bundles dmg
   ```

构建完成后，在 `src-tauri/target/release/bundle/dmg/` 打开生成的 `.dmg`，将 MDView 拖入“应用程序”。默认生成适合当前 Mac 架构的版本；自用不需要构建 Universal 包。

Open the generated `.dmg` in `src-tauri/target/release/bundle/dmg/` and drag MDView into Applications. The default build targets your Mac's architecture; a Universal build is unnecessary for personal use.

本地构建使用项目配置中的 ad-hoc 签名，无需提供付费 Apple Developer 证书。若向其他人分发，仍需另行处理签名和公证；详见 [Tauri macOS 签名说明](https://v2.tauri.app/distribute/sign/macos/)。

Local builds use the project's ad-hoc signing configuration without a paid Apple Developer certificate. Distribution to other users still requires considering signing and notarization; see the Tauri macOS signing guide above.

### 开发与验证 / Develop and verify

需要 Node.js 24、Rust/Cargo，以及对应平台的[桌面构建工具链](https://v2.tauri.app/start/prerequisites/)。在源码目录运行：
Requires Node.js 24, Rust/Cargo, and your platform's desktop build tools. From the source directory:

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
npm run edge:package
```

### 构建 / Packaging

| 目标 / Target | 命令 / Command |
| --- | --- |
| Windows MSI | `npm run desktop:build -- --bundles msi` |
| Windows MSI + Portable ZIP + checksums | `npm run package:windows` |
| macOS DMG | `npm run desktop:build -- --bundles dmg` (ad-hoc signed by default) |
| Edge extension ZIP | `npm run edge:package` |

同步所有版本文件 / Synchronize all version files:

```bash
npm run version:sync -- 2.0.1
npm run version:check
```

<details>
<summary><strong>CI、发布与签名 / CI, release, and signing</strong></summary>

GitHub Actions 会执行单元测试、ESLint、前端构建和 Playwright E2E 测试。手动运行 CI 可生成 Windows MSI、Portable ZIP 和 macOS Universal DMG；推送 `v*` Tag 或运行 Release 工作流可创建 GitHub Release。

GitHub Actions runs unit tests, ESLint, frontend builds, and Playwright E2E tests. A manual CI run can build Windows MSI, Portable ZIP, and macOS Universal DMG packages. Push a `v*` tag or run the Release workflow to create a GitHub Release.

Edge 扩展使用 MV3，仅在点击扩展图标或页面右键菜单时读取当前页面；本地文件通过浏览器文件选择器授权，最近文件只保存浏览器持久化的文件句柄。首次发布必须在 Microsoft Partner Center 手动创建产品；之后可配置 `EDGE_ADDONS_API_KEY` Secret 以及 `EDGE_ADDONS_CLIENT_ID`、`EDGE_ADDONS_PRODUCT_ID` Variables，让 `v*` tag 自动上传并提交更新。

The Edge extension uses MV3 and reads a page only after an action-button or context-menu command. Local files use browser-granted file handles, and recent files retain only those browser-persisted handles. The first product must be created manually in Microsoft Partner Center; afterwards configure the `EDGE_ADDONS_API_KEY` secret plus `EDGE_ADDONS_CLIENT_ID` and `EDGE_ADDONS_PRODUCT_ID` variables to upload and submit updates from `v*` tags.

Windows 发布签名 / Windows release signing:

- 申请并配置 [SignPath Foundation](https://signpath.org/) 后，在 GitHub Actions Secrets 中设置 `SIGNPATH_API_TOKEN`。
- 在 GitHub Actions Variables 中设置 `SIGNPATH_ORGANIZATION_ID`。
- 仅 Release 工作流请求 SignPath 签名；普通 CI 构建保持未签名。
- After configuring [SignPath Foundation](https://signpath.org/), set `SIGNPATH_API_TOKEN` in GitHub Actions Secrets and `SIGNPATH_ORGANIZATION_ID` in GitHub Actions Variables. Only the Release workflow requests signing; regular CI builds remain unsigned.

Tauri 自动更新签名 Secrets / Tauri updater signing secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

macOS 签名状态 / macOS signing status:

- 当前构建仅使用 ad-hoc 签名，不能保证下载的应用通过 macOS 安全检查；建议自用时按上面的步骤在本机编译。
- Apple Developer ID 签名、公证和 stapling 尚未配置；取得付费 Apple Developer Program 凭据后，再将其接入 Release 工作流。
- Current builds use ad-hoc signing, which does not guarantee downloaded apps pass macOS security checks; local builds are recommended for personal use.
- Developer ID signing, notarization, and stapling will be added after paid Apple Developer Program credentials are available.

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
| 当前版本 | 3.4.0 |
| Version | 3.4.0 |
| 平台 / Platforms | Windows · macOS · Microsoft Edge extension |
| 作者 / Author | [Sunky](https://www.sunky.net) |
| 许可证 / License | [GPL-3.0](LICENSE)（项目自有代码 / Project code；第三方依赖遵循各自原许可证 / third-party dependencies retain their original licenses） |

</details>

---

<p align="center">
  Built for Markdown readers who value clarity.<br />
  为重视清晰阅读体验的人而设计。
</p>
