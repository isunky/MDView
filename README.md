<div align="center">
  <img src="src/assets/app-icon.png" alt="MDView logo" width="96" height="96" />
  <h1>MDView</h1>
  <p><strong>为阅读而设计的 Markdown 工具。</strong><br />A Markdown app built for reading.</p>
  <p>
    <a href="https://github.com/isunky/MDView/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/isunky/MDView?style=flat-square&color=0f8f83" /></a>
    <a href="LICENSE"><img alt="GPL-3.0 license" src="https://img.shields.io/github/license/isunky/MDView?style=flat-square" /></a>
    <img alt="Windows, macOS, and Edge" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Edge-334155?style=flat-square" />
  </p>
  <p>
    <a href="https://github.com/isunky/MDView/releases/latest"><strong>下载 / Download</strong></a>
    · <a href="#中文">中文</a>
    · <a href="#english">English</a>
    · <a href="#macos-build">Mac 编译 / Build for Mac</a>
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

从一份 README 到一篇长文档，MDView 让你打开就能读，需要时也能直接修改。它以阅读为中心，将目录导航、清晰排版和实用编辑放在同一个窗口。无需账号，文件始终由你自己管理。

**长文档，读得有条理**

用可折叠目录浏览结构，点击标题直达正文。章节高亮跟随阅读位置，再次打开时接着上次读。明暗主题、字体与页面宽度都可以按习惯调整。

**图表与公式，随正文一起呈现**

从代码片段、表格到 Mermaid 流程图、LaTeX 公式，在同一篇文档中直接查看。阅读技术说明或项目方案时，文字和图示连贯呈现。

**看到哪里，改到哪里**

随时切换源码编辑，或在分屏中对照预览修改，两侧同步滚动。粘贴图片即可插入，表格和公式也有快捷入口；查找替换与草稿恢复照顾日常编辑。

**用 Markdown 写，用需要的格式交付**

将 Word 导入为 Markdown 继续整理，再导出为 Word、独立 HTML，或通过系统打印生成 PDF。保留便于维护的文本，也方便与使用不同工具的人协作。

## English

From a README to a lengthy technical document, MDView opens your Markdown for reading and keeps editing close at hand. Navigation, typography, and practical editing tools share one window. No account required; you manage your own files.

**Find your place in long documents**

Explore a collapsible outline and jump straight to a section. The current heading stays highlighted as you scroll, and reopening a file brings you back to where you left off. Adjust the theme, font, and page width to suit your reading habits.

**Read diagrams and formulas in context**

View code, tables, Mermaid diagrams, and LaTeX formulas alongside the text they explain. Technical notes and project documentation stay readable in a single view.

**Edit as you read**

Switch to source editing or compare your changes with a synchronized split preview. Paste images directly and insert tables or formulas from the toolbar. Find and replace and draft recovery support everyday revisions.

**Write in Markdown. Share in the format you need.**

Import a Word document to continue working in Markdown, then export to Word or standalone HTML, or print to PDF. Keep an editable text source while sharing documents with people who use different tools.

## 下载与安装 / Installation

从 [GitHub Releases](https://github.com/isunky/MDView/releases/latest) 选择适合的版本。 / Choose a package from GitHub Releases.

| 平台 / Platform | 推荐方式 / Recommended option |
| --- | --- |
| Windows | **MSI**：安装、文件关联与更新检查 / Installer, file associations, and update checks |
| Windows 绿色版 / Portable | **ZIP**：解压后运行 / Extract and run |
| macOS | **[本机源码编译 / Local build](#macos-build)**：推荐使用 AI 编程工具辅助 / AI-assisted build recommended |
| Microsoft Edge | **Extension ZIP**：解压后加载 / Extract and load unpacked |

**Windows：**需要预先安装 [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)，MDView 不附带或下载运行时。MSI 安装界面为英文，应用支持中英文。

**macOS：**预编译 Universal DMG 支持 Intel 与 Apple Silicon（macOS 10.15+），但仅有 ad-hoc 签名，尚未完成 Developer ID 签名与 Apple 公证，可能被系统拦截。建议下载源码，在自己的 Mac 上编译。

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

## Mac 源码编译 / Build for Mac

**推荐使用 AI 编程工具辅助编译。** 从 [Releases](https://github.com/isunky/MDView/releases/latest) 下载所需版本的 **Source code (zip)** 并解压，在 Mac 上用支持本地终端的 AI 编程工具打开项目目录，然后发送：

> 请在这台 Mac 上编译 MDView。先检查 Node.js 24、Rust/Cargo stable 和 Xcode Command Line Tools，说明缺失依赖并协助安装；按照项目配置执行 npm ci 和 npm run desktop:build -- --bundles dmg。遇到构建错误请定位原因，修复后重试。完成后确认 DMG 已生成，提供完整路径和安装步骤。沿用项目的 ad-hoc 签名配置，不关闭系统安全机制。

**AI-assisted builds are recommended.** Download and extract a release's **Source code (zip)**, open the project in an AI coding tool with local terminal access on your Mac, and use this prompt:

> Build MDView on this Mac. Check Node.js 24, stable Rust/Cargo, and Xcode Command Line Tools; explain missing dependencies and help install them. Follow the project configuration to run npm ci and npm run desktop:build -- --bundles dmg. Diagnose build failures, fix them, and retry. Confirm the DMG exists and provide its full path and installation steps. Keep the project's ad-hoc signing configuration and leave system security protections enabled.

首次准备依赖需要联网。默认产物位于 `src-tauri/target/release/bundle/dmg/`，打开 DMG 后将 MDView 拖入“应用程序”。本地编译不等于 Apple 公证，也不保证消除所有安全提示。

Initial dependency setup requires internet access. Find the DMG in `src-tauri/target/release/bundle/dmg/`, open it, and drag MDView into Applications. A local build is not Apple-notarized and may still show security prompts.

<details>
<summary>手动编译 / Manual build</summary>

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
