工作区已恢复干净（临时复现测试已删除）。以下是完整审查报告。

---

# MDView v3.4.2 项目审查报告

审查对象：`main` 分支 @ `78d0e89`（工作区 `d:\AICode\MDView`）
本机实跑验证（全部通过）：

| 验证项 | 命令 | 结果 |
| --- | --- | --- |
| 单元/组件测试 | `npm test` | 49 文件 / **234 用例通过** |
| Lint | `npm run lint` | **0 告警** |
| 生产构建 | `npm run build`（tsc + vite + bundle:check） | 通过，启动分块 **470.6 KB / 550 KB 预算** |
| Rust 单测 | `cargo test --lib` | **21 通过 / 0 失败** |
| 依赖漏洞 | `npm audit --omit=dev` | **0 vulnerabilities** |
| 复现实验 | 临时竞态测试（已删除） | **复现成功（见 A1）** |

## 一、总体评价

工程质量仍属良好：安全 Markdown 渲染（`rehype-sanitize` 白名单 + CSP）、Rust 侧无 `unsafe` + 原子写 + SHA-256 乐观并发、版本治理闭环、平台抽象干净、双语文档与结构化 TODO 齐备。测试/lint/构建/Rust 单测/依赖审计全绿。

但**上一轮审查（`docs/project-review.md`，v3.3.0）列出的 P0 四项与 P1 两项，在 v3.4.2 中逐条复核后全部仍然存在**，其中 A1 我已用可执行测试实证复现（会把 B 文档内容写进 A 文件，属数据丢失级）。此外发现两个新的工程性缺口：**CI 从不编译/测试 Rust 代码**、**TypeScript `strict` 未开启**。

## 二、高优先级（建议下个版本前）

### A1【已实证复现·数据丢失】在途保存被跨文档复用，B 的内容会写入 A 的文件

- 位置：`src/hooks/useDocumentController.ts:328-332`（复用 `saveOperationRef`）、`:334-346`（保存开始时捕获 `markdownDocument`）、`:387-397`（排队与 finally）、`src/domain/documentState.ts:62-76`（`markDocumentSaved` 无条件改写 `path/title`）；`loadFile`（`:110-122`）**不重置** `saveOperationRef/isSaving`。
- 复现路径（测试已跑通）：
  1. 打开 `A.md` 并编辑 → 保存（`saveMarkdownFile` 挂起，`isSaving=true`）
  2. 保存在途时打开 `B.md`（Open 菜单项只受 `!nativeFilesEnabled` 约束，可点）
  3. 按 `Ctrl+S` 保存 B → `saveDocument` 直接返回 A 的在途 Promise，**B 未落盘且无任何提示**（`useFileShortcuts` 收到 `true`，还弹出"已保存"toast）
  4. A 的保存完成后回调执行 `markDocumentSaved(current=B, path='/tmp/a.md', …)` → **B 文档被改写为 A 的路径/标题**
  5. `isSaving` 复位后再保存 → `saveMarkdownFile('/tmp/a.md', '# B')`
- 实测断言输出：
  ```
  received: { savedPath: '/tmp/a.md', savedContent: '# B' }
  expected: { savedPath: '/tmp/b.md', savedContent: '# B' }
  ```
- 现有测试 `keeps edits made during an in-flight save marked as unsaved`（`src/App.document.test.tsx:127`）只覆盖同文档场景，跨文档场景无覆盖。
- 建议修复：`saveDocument` 内为每次保存记录文档身份（`sessionIdRef.current` + `path`），`await` 返回后与 `documentRef.current` 比对，不一致则丢弃结果；`loadFile`/`handleNewDocument` 中清空 `saveOperationRef` 与 `isSaving`；`runSave` 改为在**执行时**从 `documentRef.current` 读取 path/content（而非闭包捕获），避免排队期间用户继续编辑导致保存旧内容；补一条"保存中切文档再保存"的回归测试。

### A2【仍未修复】`read_remote_image_file` SSRF：无内网/回环过滤，重定向不复检

- 位置：`src-tauri/src/lib.rs:450-507`（`461-464` 仅 `Policy::limited(5)`，无 `is_loopback/is_private/is_link_local` 判断，无自定义 redirect 回调）。
- 可达路径：远程图片只在**导出**链路被请求 —— `src/domain/exportPreview.ts:89-93` ← `src/hooks/useDocumentExport.ts:32-36`（HTML/PDF 导出）。恶意文档写 `![](https://attacker/x.png)` → 攻击者 302 到 `127.0.0.1`/`169.254.169.254`/`10.x` → 内容以 base64 内嵌进导出文件（内网数据外带），非图片响应也会产生盲 SSRF 副作用。
- 建议：在 `redirect` 回调与首次请求前解析主机 IP，拒绝 loopback/私网/链路本地/元数据段；生产 CSP 的 `img-src https:` 也可一并收敛（当前预览可直接向任意外域发图，存在 IP/行为泄露）。

### A3【仍未修复】`open_markdown_file_at_path` 仍是"扩展名即授权"，并顺带授权整个目录

- 位置：`src-tauri/src/lib.rs:223-237`（未授权则 `approve_and_persist_markdown_file` 无条件批准并持久化）、`:100-146`、`:148-166`、`read_authorized_markdown_file:669-679`（读取成功即 `activate_document_root`）。
- 影响：任意 `.md` 路径只要被前端调用一次（例：恶意文档里的 `[x](C:\Users\me\secret.md)` 被点击 → `openMarkdownLinkFile` → `openMarkdownFileAtPath`）就会被**永久**加入 `approved-markdown-files.json`；同时该文件父目录成为 active root，于是同目录内任意图片可读、任意 `.md` 可写（`save_markdown_file` 只校验目录 + 扩展名）。
- 建议：只在"OS 传入路径"或"已活动根目录内"自动放行；其余路径改为显式用户确认，且**不要把链接点击产生的授权持久化**。

### A4【仍未修复】`file://` 等协议链接触发顶层原生导航，本地文件内容泄露

- 位置：`src/domain/markdownSanitize.ts:77-81`（`href` 白名单含 `file`）+ `src/components/MarkdownPreview.tsx:154-176`（`handleClick` 只对锚点/本地 md/http(s) 做 `preventDefault`）+ `:194-198`（`transformMarkdownUrl` 放行 `file://`）+ `src-tauri/tauri.conf.json:26`（CSP 无 `navigate-to`）。
- 影响：不受信 Markdown 里 `<a href="file:///C:/Users/x/Documents/notes.html">` 被点击后，WebView 顶层导航到该本地文件并渲染（信息泄露）；CSP `script-src 'self'` 只约束原文档，**新加载文档不带该策略**，若 Tauri IPC 桥在导航后仍被注入，影响会从"泄露"升级为"可调用命令"（建议在 WebView2 上实测确认）。
- 建议：非 http(s)/非本地 md 的 href 一律 `preventDefault`；`href` 白名单去掉 `file`；更稳妥的是在 Rust 侧用 `WebviewWindowBuilder::on_navigation` 只允许应用自身源。

### A5【仍未修复】全应用无错误边界

- `ErrorBoundary|componentDidCatch` 在 `src/` 内零命中（仅 `docs/` 与打包产物）。预览链路（rehype-raw / Mermaid / KaTeX / 搜索高亮）任一渲染异常都会卸载整棵 React 树 → 白屏，只能靠草稿恢复。
- 建议：至少包住 `LazyMarkdownPreview`（降级为"预览渲染失败，显示源码"）与编辑器。

### A6【仍未修复】启动初始化无 `catch`，一次失败即让"双击打开文件"整会话失效

- 位置：`src/hooks/useDocumentController.ts:144-177`。`try { await readStartupMarkdownFile() } finally { … }` 之后才 `await listenForOpenedFiles(...)`：一旦 `readStartupMarkdownFile` reject（文件被删/无权限 → Rust 侧 `fs::read_to_string` 报错），异常在 `finally` 之后继续向外抛出，`void initialize()` 产生**未处理拒绝**，且 `listenForOpenedFiles` **永不注册**，用户无任何提示。
- 附带（Dev 专用）：`take_opened_files` 是消费式 `drain`（`src-tauri/src/lib.rs:189-196`），StrictMode 双挂载下第一次挂载已取走路径，但 `disposed` 立刻为 true，`if (!disposed && startupFile)` 判定失败 → **开发模式下启动文件永远打不开**（`npm run dev`/E2E 会踩到）。
- 建议：`try/catch` 包裹并在失败时提示；监听注册移出依赖启动文件成功的路径；`take_opened_files` 改为非消费式或增加"重新取回"命令。

## 三、中等优先级

| 编号 | 问题 | 位置 / 证据 | 建议 |
| --- | --- | --- | --- |
| B1 | **CI 从不编译或测试 Rust**：quality job（ubuntu）只跑 version:check/test/lint/build/edge 打包/E2E；`cargo` 仅出现在 `build_installers=true` 的 Windows/macOS 打包任务里，且**无 `cargo test`、无 `cargo clippy`**。而安全关键逻辑（`FileAccessPolicy`、原子写、SSRF）全在 Rust 侧 | `.github/workflows/_pipeline.yml:42-89`、`:120`、`:332` | 在 quality job 增加 `cargo test --manifest-path src-tauri/Cargo.toml`（可选 `clippy -D warnings`）；Rust 工具链改为 `rust-toolchain.toml` 固定版本，而非 `@stable` |
| B2 | **TypeScript `strict` 未开启**（`strictNullChecks`/`noImplicitAny` 均为 false），仅开了 `noUnusedLocals/Parameters` | `tsconfig.app.json`、`tsconfig.node.json` 均无 `strict` 字段 | 按目录分步开启（先 `strictNullChecks`），CI 门禁保证不回退 |
| B3 | **长文档交互性能**：`getCursorPosition` 每次光标移动都 `slice+split+Array.from` 整个前缀（O(n) 且分配大数组），并在 `App` 每次 selection 变化时重算 + 重渲染未 memo 的 `AppToolbar`/编辑器 | `src/domain/documentStatistics.ts:25-35`、`src/App.tsx:433-436,454-496,596-620` | 增量维护 line/column（或按行缓存）；`AppToolbar` 用 `memo` + 稳定回调，光标位置节流 |
| B4 | **Mermaid / 本地图片无缓存**（TODO P1 未完成）：每次预览重渲染都重新 `mermaid.render` 与重新读取本地图片 Data URL | `src/domain/mermaidRenderer.ts:16-34`、`src/components/preview/LocalMarkdownImage.tsx:21-30` | 按源码+主题做 LRU（Mermaid SVG）、按规范化路径+文件时间戳做 LRU（图片 Data URL），并补命中/失效/淘汰测试 |
| B5 | **数学管线触发过宽**：任意未转义 `$` 即加载 `remark-math`+`rehype-katex`+KaTeX CSS（约 260 KB） | `src/components/MarkdownPreview.tsx:38-49,82`、`src/domain/markdownMath.ts` | 收紧启发式（要求配对 `$…$`/`$$…$$` 且含 `\` 或 `^{}` 等特征） |
| B6 | **Edge 扩展权限与状态治理**：清单仍申请 `tabs`（`chrome.tabs.create` 不需要）；只读图片读取却申请 **readwrite** 权限；`registerHandle` 每次生成新 IDB 记录（同文件重复累积、无上限）；`decodeURIComponent` 无容错（文件名含 `%` 抛 URIError）；后台静默 `catch` 可能让上次残留的导入被下一次打开工作区时消费 | `edge/public/manifest.json`、`src/edge/edgeFileAccess.ts:108,155-172,200-210`、`edge/background.ts:40-51` | 删除 `tabs`；读图片用 `mode:'read'`；按文件名去重/加容量淘汰；`decodeURIComponent` 加 try/catch；后台失败时清空 `mdviewImportedPage` |
| B7 | **i18n/a11y 硬编码英文**：`aria-label="Markdown preview"`、`aria-label="Document status"`，以及 `getErrorMessage` 的英文兜底（中文界面下报英文） | `src/components/MarkdownPreview.tsx:127,200-211`、`src/components/EditorStatusBar.tsx:31`、`src/App.tsx:720-722` | 全部走 `i18n`；`defaultPreviewLabels` 与 zh/en 合并 |
| B8 | **生产包内置 E2E 注入钩子**：`window.__MDVIEW_E2E_FILE_ACCESS__`（可替换整个文件访问实现）会随桌面安装包发布 | `src/main.tsx:15-19,36` | 用构建期常量（`import.meta.env.DEV` 或专用 `e2e` 模式）裁剪 |
| B9 | **偏好/会话存储分散**（TODO P2 未完成）：草稿、最近文件、目录、阅读设置、阅读现场、分屏开关各自解析 JSON/版本/异常，无统一迁移 | `src/domain/{documentDraft,recentFiles,outlinePreferences,readingPreferences,readingSessions,splitScrollPreferences}.ts` | 引入带 schema 版本的统一存储封装，写入失败/损坏时统一降级 |
| B10 | **`bundle:check` 只按 chunk 文件名 token 判定懒加载**：若有人把预览改成静态引入，产物仍名 `index-*.js`，只要总大小 < 550 KB 就会**静默通过** | `scripts/check-startup-bundle.mjs:8-32` | 增加"产物中不得出现 `mermaid`/`remark-parse` 等标志字符串"或基于构建元数据的断言；当前余量仅 79 KB（470.6/550），建议同步调预算并监控趋势 |

## 四、低优先级 / 清理项

- **React 状态更新器内含副作用**：`setMarkdownDocument(current => { …; setStatusMessage(…) })`（`useDocumentController.ts:436-452`）、`setExternalFileState(state => { … setStatusMessage(…) })`（`:206-210`）。StrictMode 下更新器可能被调用两次，副作用语义不保证。
- **`retryFailedImages` 先清空失败列表再导入**（`src/hooks/useImageInsertion.ts:173-181`）：若此刻 `importingRef` 为真而提前 return，重试列表被清空且未重试。
- **`checkCurrentFile` 空 catch 吞掉一切**（`:212-214`），包含授权/权限错误，用户看不到原因。
- **`useAppUpdater`**：`distribution` 初始为 `'unsupported'`，用户点"检查更新"会先失败一次（`src/hooks/useAppUpdater.ts:33,60-65`）；建议先 await `getDistribution()`。
- **原生 `window.confirm`** 用于放弃未保存更改/重载磁盘版本（`useDocumentController.ts:81`、`App.tsx:516`），与其它自绘对话框风格不一致。
- **`navigator.platform`（已废弃）** 用于平台判定：`src/platform/keyboardShortcuts.ts:23`、`systemFonts.ts:27`、`tauriWindowFrame.ts:40-41`。
- **Edge `withStore`**：若 `action(store)` 同步抛错，Promise 永不落定（`edgeFileAccess.ts:181-194`）。
- **DOCX 工具链**：`check_packages` 用字符串拼接 Python 代码并手工转义路径（`docx_import.rs:487-496`，脆弱）；`can_install_python()` 每次状态查询都 spawn `winget --version`（`:534-549`，应缓存）；`pip install` 固定版本但**无 `--require-hashes`**（`:260-274`，供应链加固空间）；转换完成后 `work_dir` 清理在异常分支上依赖 `_ =` 忽略错误。
- **导出非原子写**：`export_html_file_dialog:368`、`export_docx_file_dialog:391` 直接 `fs::write`，中断会留半截文件（Markdown 保存已用 `atomic_write_file`，导出可复用）。
- **`sync-version.mjs`** 对 `tauri.conf.json` 用非全局正则替换首个 `"version"`（`scripts/sync-version.mjs:38-45`），依赖当前文件结构；但 `check-version.mjs` 会二次校验 9 处版本，风险可控。
- **`save_markdown_file` 存在 TOCTOU 窗口**：读取校验与写入之间文件可被替换（版本号只防前端陈旧编辑）。
- **每次读取远程图片都新建 `reqwest::Client`**（无连接复用）。

## 五、做得好的地方

1. **XSS 纵深防御经源码核对**：`rehype-sanitize` 严格白名单（strip `script/svg/iframe/object/form` 等）+ `urlTransform` 二次过滤 + 非空 CSP（`script-src 'self'`、`object-src/frame-src/base-uri 'none'`）+ Mermaid `securityLevel:'strict'`、`htmlLabels:false` 且渲染后 SVG 再白名单清洗（`sanitizeMermaidSvg`）+ KaTeX `trust:false`。
2. **Rust 侧工程与安全**：零 `unsafe`；自建受策略门禁的文件命令（未引入 `tauri-plugin-fs`）；`atomic_write_file`（临时文件 + `sync_all` + 权限继承 + 失败清理 + 单测）；SHA-256 版本号乐观并发；对外部文件变化做"父目录监听 + 目标过滤 + 事件合并 + 聚焦兜底降级"。
3. **更新链安全**：HTTPS endpoint + minisign 公钥内嵌、私钥仅 CI secrets；manifest 生成脚本强制 GitHub 域名、校验 `.sig` 与 MSI 匹配并有单测；安装版走签名更新、便携版降级 Releases；安装前阻止未保存文档。
4. **版本治理闭环**：`version:check` 覆盖 9 处（含 README 三处、Cargo.lock、Edge manifest），CI/Release/Edge 三入口门禁，Release 强制 tag == 版本。
5. **架构与竞态防御**：平台抽象（`FileAccess`/`AppUpdateClient`/`WindowFrame` + 入口注入）边界干净；`documentRef` 回读、revision 校验、`requestId` 取消、外部监控串行化；i18n 类型由 `en` 派生（`Translation = (typeof translations)['en']`），zh 缺键会在使用处编译报错；启动分块从 630 KB 降到 470.6 KB 并有预算门禁。
6. **交付物质量**：双语 README、带状态与验收标准的 TODO 路线图、`docs/project-review.md` 历史可追溯；`npm audit --omit=dev` 0 漏洞；Rust 21 个单测全通过。

## 六、建议执行顺序

**P0（下个版本前，A1 优先，均有低成本方案）**
1. A1 保存身份校验 + `loadFile` 重置在途保存 + 跨文档竞态回归测试（唯一可复现的数据丢失缺陷）
2. A3 `open_markdown_file_at_path` 不再无条件批准/持久化，且链接点击不授权
3. A2 SSRF 私网/回环过滤 + 重定向复检（同时收敛 `img-src`）
4. A4 `file://` 点击层 `preventDefault` + 去白名单 + Rust `on_navigation` 兜底

**P1（近期）**
5. A5 预览/编辑器错误边界；A6 初始化 `catch` + `take_opened_files` 改为非消费式
6. B1 CI 增加 `cargo test`（+clippy）与 Rust 工具链固定；B2 分步开启 TS `strict`
7. B8 裁剪 E2E 注入钩子；B7 i18n/a11y 硬编码清理

**P2（体验与性能）**
8. B4 LRU 缓存（Mermaid/本地图片）+ B3 光标定位与重渲染优化，并补长文档基准（对应 TODO 的 P1/P3 条目）
9. B6 Edge 权限收敛与 IDB 治理；B9 统一存储封装；B10 收紧 bundle 断言并跟踪 470.6 KB 趋势

---

**说明**：为验证 A1，我新增了一个临时测试 `src/App.review-repro.test.tsx` 并运行（失败断言即证据），随后已删除；当前 `git status` 干净，未对仓库做任何持久改动。如果你希望，我可以把这份报告写入 `docs/review-2026-09-22.md`，或直接按 P0 顺序开始修复（A1 建议优先）。