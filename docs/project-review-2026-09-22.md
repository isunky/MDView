# MDView v3.4.2 项目审查报告

日期：2026-09-22 · 审查对象：`main` 分支 @ `78d0e89` · 工作区：`D:\AICode\MDView`
上一轮报告：`docs/project-review.md`（v3.3.0，2026-07-08）

## 审查方法与本机验证

- 逐文件阅读：`src/`（App、hooks、domain、platform、components、edge）、`src-tauri/src`（lib.rs、fs_utils、image_utils、docx_import、file_watcher、startup、distribution）、`scripts/`、`.github/workflows/`、`edge/`、`tsconfig*`、`vite*.config.ts`。
- 本机实跑（全部通过）：

| 验证项 | 命令 | 结果 |
| --- | --- | --- |
| 单元 / 组件测试 | `npm test` | 49 文件 / **234 用例通过**，无 skip/todo |
| Lint | `npm run lint` | **0 告警** |
| 生产构建 | `npm run build` | `tsc -b` + vite + bundle:check 通过，启动分块 **470.6 KB / 550 KB 预算** |
| Rust 单测 | `cargo test --lib` | **21 通过 / 0 失败** |
| 依赖漏洞 | `npm audit --omit=dev` | **0 vulnerabilities** |
| 竞态复现实验 | 临时测试（已删除） | **复现成功，见 [A1](#a1已实证复现数据丢失在途保存被跨文档复用b-的内容会写入-a-的文件)** |

- 复现实验仅用于取证：新增 `src/App.review-repro.test.tsx` → 运行取得失败断言 → 删除文件。审查结束时 `git status` 干净，未对仓库做持久改动。

## 总体评价

**工程质量良好，可继续迭代；但上一轮 P0 全部未修复，且存在 1 个已实证复现的数据丢失缺陷。**

- 得分项：XSS 纵深防御（白名单 sanitize + 二次 URL 过滤 + 非空 CSP + Mermaid 渲染后 SVG 清洗 + KaTeX `trust:false`）；Rust 侧零 `unsafe`、原子写、SHA-256 乐观并发、受策略门禁的自定义文件命令；更新链签名与清单校验；版本治理闭环（9 处版本 + 三个 CI 入口）；平台抽象与竞态防御成体系；双语文档与结构化 TODO。
- 风险项：`docs/project-review.md`（v3.3.0）列出的 **P0 四项（S1/H1/H2/H3）与 P1 两项（H4/H5）在 v3.4.2 中逐条复核后依然存在**，其中 S1 已实证复现为数据丢失。
- 新增工程缺口：**CI 从不编译或测试 Rust**（安全关键逻辑无 CI 覆盖）；**TypeScript `strict` 未开启**。
- 趋势提示：启动分块由 461.2 KB（v3.3.0 复核值）升至 470.6 KB，距 550 KB 预算余量仅 79 KB（约 14%）。

## 一、高优先级（P0，建议下个版本前处理）

### A1【已实证复现·数据丢失】在途保存被跨文档复用，B 的内容会写入 A 的文件

- 位置
  - `src/hooks/useDocumentController.ts:328-332`：`existingOperation && !forceSaveAs` 时直接返回在途保存，**不校验文档身份**。
  - `src/hooks/useDocumentController.ts:334-346`：`path` / `content` 从闭包捕获。
  - `src/hooks/useDocumentController.ts:350-369`：保存完成后 `markDocumentSaved(current, savedPath, contentToSave, …)`。
  - `src/hooks/useDocumentController.ts:387-397`：排队与 `finally` 清理。
  - `src/hooks/useDocumentController.ts:110-122`（`loadFile`）：**不重置** `saveOperationRef` 与 `isSaving`。
  - `src/domain/documentState.ts:62-76`：`markDocumentSaved` 无条件改写 `title`/`path`。
- 复现路径（已用测试跑通）
  1. 打开 `A.md` 并编辑，触发保存（`saveMarkdownFile` 挂起，`isSaving = true`）。
  2. 保存在途时通过 File → Open Markdown File 打开 `B.md`（该菜单项只受 `!nativeFilesEnabled` 约束，可点击）。
  3. 按 `Ctrl+S` 保存 B：`saveDocument` 返回 A 的在途 Promise，**B 未落盘且无任何提示**；`useFileShortcuts` 收到 `true`，还会弹出"已保存"提示（`src/hooks/useFileShortcuts.ts:52-56`）。
  4. A 的保存完成后回调把 A 的 `path`/`title` 应用到"当前文档 = B"。
  5. `isSaving` 复位后再保存 → `saveMarkdownFile('/tmp/a.md', '# B')`，**B 的内容覆盖 A 的文件**。
- 实测断言输出

  ```
  received: { savedPath: '/tmp/a.md', savedContent: '# B' }
  expected: { savedPath: '/tmp/b.md', savedContent: '# B' }
  ```

- 覆盖缺口：`src/App.document.test.tsx:127` 的 `keeps edits made during an in-flight save marked as unsaved` 只覆盖同文档场景；跨文档场景无任何用例。
- 修复建议
  1. 保存开始时记录文档身份（`sessionIdRef.current` + `path`），`await` 返回后与 `documentRef.current` 比对，不一致则丢弃结果、不改写文档状态。
  2. `loadFile` / `handleNewDocument` / `handleImportedDocument` 中清空 `saveOperationRef` 与 `isSaving`。
  3. `runSave` 改为在**执行时**从 `documentRef.current` 读取 `path` / `content`，避免排队期间用户继续编辑导致保存旧内容。
  4. 普通 Save 遇到"属于其他文档的在途保存"时，应排队执行本文档保存（参考现有 `forceSaveAs` 分支），而不是静默复用。
  5. 补一条"A 保存中切到 B 再保存"的竞态回归测试，并断言 `saveMarkdownFile` 收到的是 B 的路径与内容。

### A2【仍未修复】`read_remote_image_file` SSRF：无内网/回环过滤，重定向不复检

- 位置：`src-tauri/src/lib.rs:450-507`，尤其 `:460-464` —— 仅 `Policy::limited(5)`，没有任何 `is_loopback` / `is_private` / `is_link_local` / 元数据段判断，也没有自定义重定向回调。
- 可达路径：远程图片只在**导出**链路被请求 —— `src/hooks/useDocumentExport.ts:32-36` → `src/domain/exportPreview.ts:89-93` → `src/platform/fileAccess.ts:172-178`。即：`![](https://attacker/x.png)` 只有在用户执行 HTML/PDF 导出时才触发。
- 影响：攻击者 302 跳转到 `127.0.0.1` / `10.x` / `192.168.x` / `169.254.169.254`，若响应为 `image/*` 则以 base64 内嵌进导出文件（内网数据外带）；非图片响应也会产生盲 SSRF 副作用。
- 附带项：生产 CSP `img-src 'self' data: blob: https:`（`src-tauri/tauri.conf.json:26`）允许预览直接向任意外域请求图片，存在 IP / 阅读行为泄露面。
- 修复建议：在首次请求与每次重定向后解析主机 IP，拒绝 loopback / 私网 / 链路本地 / 元数据段（`reqwest` redirect 回调中判断）；或收紧为受信域名白名单；同时评估是否将 `img-src https:` 收敛为显式白名单或改为经策略过滤的代理读取。

### A3【仍未修复】`open_markdown_file_at_path` 仍是"扩展名即授权"，并顺带授权整个目录

- 位置
  - `src-tauri/src/lib.rs:223-237`：`ensure_markdown_path` 通过后，只要 `!is_authorized` 就 `approve_and_persist_markdown_file` —— **无条件批准并写入 `approved-markdown-files.json`**。
  - `src-tauri/src/lib.rs:100-146`：授权集合与 `active_document_roots` 的加载/写入。
  - `src-tauri/src/lib.rs:148-166`：`is_authorized`，父目录内任意路径均视为已授权。
  - `src-tauri/src/lib.rs:669-679`：读取成功即 `activate_document_root`（把该文件父目录设为活动根）。
- 影响
  - 任意 `.md` 路径只要被前端调用一次即被**永久**授权。触发点包括：恶意文档中的 `[x](C:\Users\me\secret.md)` 被点击（`src/hooks/useDocumentController.ts:314-326` → `openMarkdownFileAtPath`）、recent files 条目、草稿恢复路径。
  - 由于 `activate_document_root`，同目录内**任意图片可读**（`read_image_file`）、**任意 `.md` 可写**（`save_markdown_file` 仅校验扩展名 + 目录前缀），"按用户同意授权"退化为"扩展名门禁 + 目录级授权"。
- 修复建议
  - 仅对 OS 传入路径（启动参数 / 文件关联）或已活动根目录内的路径自动放行；其余路径要求显式用户确认。
  - 文档内链接跳转产生的授权**不要持久化**（会话级即可），并限制 `activate_document_root` 的作用范围（图片只读即可，不应顺带获得同目录 `.md` 写权限）。

### A4【仍未修复】`file://` 等协议链接触发顶层原生导航，本地文件内容泄露

- 位置
  - `src/domain/markdownSanitize.ts:77-81`：`href` 协议白名单仍含 `file`。
  - `src/components/MarkdownPreview.tsx:154-176`：`handleClick` 只对"同文档锚点 / 本地 md 资源 / http(s)"调用 `preventDefault`，其余（含 `file:`、未知协议）走原生导航。
  - `src/components/MarkdownPreview.tsx:194-198`：`transformMarkdownUrl` 显式放行 `file://`。
  - `src-tauri/tauri.conf.json:26`：CSP 无 `navigate-to`，`default-src 'self'` 不约束顶层导航。
- 影响：不受信 Markdown 中 `<a href="file:///C:/Users/x/Documents/notes.html">` 被点击后，WebView 顶层导航到该本地文件并渲染其内容（`.html/.txt/.json` 等信息泄露）。原文档的 `script-src 'self'` 不作用于新加载文档；若 Tauri IPC 桥在导航后仍被注入，影响可能从"信息泄露"升级为"可调用命令"（**建议在 WebView2 上实测确认**）。
- 修复建议
  1. 点击层：非"同文档锚点 / 本地 md / http(s)"的 href 一律 `preventDefault`。
  2. 白名单：`href` 协议去掉 `file`（`img` 的本地文件读取走 `read_image_file` 已有独立通道）。
  3. 兜底：Rust 侧 `WebviewWindowBuilder::on_navigation` 只允许应用自身源；CSP 增加 `navigate-to 'self'`。

### A5【仍未修复】全应用无错误边界

- 证据：`ErrorBoundary` / `componentDidCatch` 在 `src/` 内零命中（仅出现在 `docs/` 与打包产物中）。
- 影响：预览链路（`rehype-raw` / Mermaid / KaTeX / 搜索高亮 / 颜色预览）任一渲染异常都会卸载整棵 React 树 → 白屏，只能靠草稿备份恢复。`LocalMarkdownImage`、`MermaidDiagram` 内部各自 `try/catch`，但顶部渲染器与 KaTeX 异常无人接住。
- 修复建议：至少用错误边界包住 `LazyMarkdownPreview`（`src/components/lazyMarkdownPreview.ts`）与 `MarkdownEditor`，降级为"预览渲染失败，显示源码"并给出重试入口。

### A6【仍未修复】启动初始化无 `catch`，一次失败即让"双击打开文件"整会话失效

- 位置：`src/hooks/useDocumentController.ts:144-177`。
- 问题：`try { await fileAccess.readStartupMarkdownFile() } finally { setIsStartupResolved(true) }` **没有 catch**，其后的 `await fileAccess.listenForOpenedFiles(...)` 位于 `try/finally` 之外。一旦 `readStartupMarkdownFile` reject（文件被删 / 无权限 → Rust 侧 `fs::read_to_string` 报错，见 `src-tauri/src/lib.rs:224-237`、`:669-679`）：
  - `void initialize()` 产生**未处理 Promise 拒绝**；
  - `listenForOpenedFiles` **永不注册** → 本会话内系统双击打开文件全部失效，且无任何用户反馈。
- 附带（开发专用）：`take_opened_files` 是消费式 `drain`（`src-tauri/src/lib.rs:189-196`）。StrictMode 双挂载下第一次挂载已取走路径并因 `disposed` 立刻为 true 而丢弃（`if (!disposed && startupFile)`），第二次挂载取到空数组 → **开发模式下启动文件永远打不开**（`npm run dev` / E2E 会踩到）。
- 修复建议：为初始化加 `catch` 并在失败时 `setStatusMessage`；监听注册移出"依赖启动文件成功"的路径（`finally` 中执行）；`take_opened_files` 改为非消费式或提供"重新取回"命令。

<!-- REVIEW-END -->


