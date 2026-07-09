# Preview Scroll Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Markdown preview scrolling responsive while synchronizing the active outline heading.

**Architecture:** Move heading-position lookup into a focused module that builds a cached position index and resolves the active heading with binary search. Keep the heavy Markdown preview subtree stable when only outline state changes by memoizing the preview component and stabilizing its callback props.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Tauri/Vite.

---

### Task 1: Cached heading position lookup

**Files:**
- Create: `src/domain/outlineScroll.ts`
- Create: `src/domain/outlineScroll.test.ts`
- Modify: `src/App.tsx`

- [ ] Write tests proving active heading lookup handles the first heading, boundaries, and a large sorted position index.
- [ ] Run `npm test -- --run src/domain/outlineScroll.test.ts` and confirm it fails because the module is missing.
- [ ] Implement a sorted heading-position index and binary-search active lookup.
- [ ] Run the focused test and confirm it passes.
- [ ] Replace per-frame `getBoundingClientRect()` traversal with cached positions, recomputed after content, zoom, resize, and preview layout changes.
- [ ] Add the scroll listener with `{ passive: true }` and avoid state updates when the active id is unchanged.

### Task 2: Isolate Markdown preview rendering

**Files:**
- Modify: `src/components/MarkdownPreview.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/MarkdownPreview.test.tsx`

- [ ] Add a render-count regression test proving unrelated parent state does not re-render `MarkdownPreview`.
- [ ] Run the focused test and confirm it fails before memoization.
- [ ] Export a memoized `MarkdownPreview` while retaining the existing props contract.
- [ ] Stabilize preview callback props in `App`.
- [ ] Run focused component and App tests.

### Task 3: Verification

**Files:**
- Modify only files required by failures found during verification.

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Inspect the diff to ensure the change remains limited to preview scrolling performance.
