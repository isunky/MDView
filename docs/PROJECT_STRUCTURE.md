# Project Structure / 工程目录

The repository keeps application code, platform adapters, native code, build tooling, and documentation assets in separate areas. Keep feature tests beside the implementation they verify; keep end-to-end scenarios under `tests/e2e/`.

仓库按职责划分应用代码、平台适配、原生代码、构建工具和文档资源。单元/组件测试与被测实现放在一起；端到端场景统一放在 `tests/e2e/`。

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Application composition and view-level orchestration |
| `src/components/shell/` | Application toolbar, window controls, shared shell UI |
| `src/components/workspace/` | Welcome workspace, outline, split-view controls, document notices |
| `src/components/editor/` | Markdown editor, editor toolbar, search, status and image-import UI |
| `src/components/preview/` | Markdown preview, lazy loading, syntax styles and preview renderers |
| `src/components/dialogs/` | About, import, recovery, reading, syntax, math and update dialogs |
| `src/domain/` | Framework-independent document, Markdown, editing and export logic |
| `src/hooks/` | React state and orchestration built on domain/platform interfaces |
| `src/platform/` | Browser, Tauri and unsupported-platform adapters and contracts |
| `src/workers/` | Background work for CPU-intensive document processing |
| `src/edge/` and `edge/` | Edge extension integration code and extension-specific manifest/assets |
| `src-tauri/` | Rust commands, native capabilities, installers, icons and bundled resources |
| `scripts/` | Version checks, packaging, artifact generation and build helpers |
| `tests/e2e/` | Playwright end-to-end tests |
| `docs/assets/` | Documentation media, including README screenshots |
| `docs/reviews/` | Dated, versioned historical review snapshots |

## Placement Rules / 归属约定

- Put UI in the matching `components` feature folder; keep pure parsing and transformation logic in `domain`.
- Put React lifecycle and feature orchestration in `hooks`; isolate operating-system or browser APIs behind `platform` adapters.
- Keep native Rust implementation in `src-tauri`; do not mirror frontend business logic there unless a native boundary requires it.
- Add a colocated test when changing a module. Use `tests/e2e/` only for workflows that need the integrated application surface.
- Keep root-level files for conventional project entry points and tool configuration. Preserve `build-windows.cmd` as a root convenience entry point; it delegates to `scripts/build-windows.ps1`.
- Keep generated output (`dist/`, `dist-edge/`, `test-results/`, `node_modules/`, and `src-tauri/target/`) out of source folders and version control.
