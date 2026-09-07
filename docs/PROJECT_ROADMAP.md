# MDView Project Roadmap

> Updated: 2026-09-07  
> Product direction: a local-first Markdown reader for opening, reading, lightly editing, and reliably delivering Markdown documents.

## Product Positioning

MDView should remain focused on one complete workflow:

```text
Open or import locally -> Read comfortably -> Make light edits -> Export reliably
```

The product is particularly suited to AI-generated documents, project proposals, technical material, and Chinese business documents. It should not become a full IDE, note-taking platform, cloud collaboration product, or built-in AI chat client.

## Current Priorities

### 1. Reliable Document Delivery

This is the highest-priority product investment. PDF and DOCX export must preserve document meaning and provide predictable formatting.

- Establish a shared export style model for headings, body text, lists, tables, code blocks, images, formulas, page margins, headers, and footers.
- Keep two restrained export presets:
  - **Reading**: close to the in-app preview, suitable for README files, technical notes, diagrams, and code.
  - **Formal Chinese**: SimHei headings, SimSun body text, body text at fourth-size Chinese font, heading sizes up to third-size Chinese font, and two-character first-line indentation.
- Correct ordered-list starts, nesting, indentation, and page-break behavior.
- Preserve local images, tables, formulas, and Mermaid diagrams where supported; show a clear warning when conversion cannot preserve an item.
- Make export states visible: preparing, printing, completed, failed, and retryable.

**Definition of done:** a typical Chinese proposal with long paragraphs, nested lists, tables, images, formulas, and multiple pages exports without silent content loss.

### 2. Reading Stability for Large Documents

Improve the reading experience before adding large new workflow features.

- Add bounded caching and invalidation for Mermaid output and local images.
- Establish representative long-document fixtures and measure preview, scrolling, image loading, and outline synchronization performance.
- Consolidate local preference, draft, and reading-state storage behind versioned migration and error handling.
- Continue improving external-file refresh and conflict handling with a simple comparison view when the same file changes outside MDView.

**Definition of done:** large documents remain responsive, cached resources do not grow without limit, and upgrades do not silently lose user preferences or recoverable drafts.

### 3. Lightweight Multi-Document Reading

After export and stability work are reliable, make it easier to read a collection of related documents.

- Add folder-based Markdown navigation and fast file search.
- Add quick open for recent files, folder files, and Markdown links.
- Add document-to-document navigation without repeatedly opening a file picker.
- Consider tabs only after per-document draft recovery, reading positions, and close behavior are stable.

The first folder workspace should be read-oriented. File deletion, Git integration, and complex project management are intentionally out of scope.

### 4. Document Quality Checks

Add a quiet preflight check that helps users deliver complete documents.

- Detect missing local images and broken Markdown links.
- Detect invalid heading anchors and unsupported export resources.
- Surface issues before export or from a small status entry, rather than interrupting ordinary reading.
- Provide direct actions where possible, such as revealing the source location or retrying a failed resource.

This is especially valuable for AI-generated Markdown, where links and referenced assets are often incomplete.

### 5. Distribution and Release Confidence

Keep Windows as the primary desktop delivery target while maintaining the Edge extension and macOS build paths.

- Show both application version and build/commit identity in About and diagnostics so local builds are distinguishable.
- Maintain release artifacts, update metadata, and installation diagnostics.
- Add native desktop smoke checks for file associations and export flows; Web E2E mocks do not cover native WebView or system-print behavior.
- Pursue macOS Developer ID signing and notarization only when the required certificate and account budget are available.

## Suggested Delivery Sequence

| Milestone | Scope | Outcome |
| --- | --- | --- |
| Export consistency | Shared rules, formal Chinese preset, lists, resources, feedback | Documents can be handed to others with confidence |
| Resource and performance foundation | Cache boundaries, long-document measurements, storage migration | Reading remains fast and state remains reliable |
| Quality preflight | Missing-resource and broken-link checks | Fewer incomplete exports and broken documents |
| Folder reading | File tree, quick open, inter-document navigation | Better handling of project document collections |
| Native release hardening | Desktop smoke checks and clearer diagnostics | Fewer platform-specific surprises after release |

## Deliberately Deferred

- Built-in AI chat, model selection, API-key management, or paid AI service integration.
- Cloud synchronization, account systems, and multi-user collaboration.
- Plugin marketplace, knowledge graph, or bidirectional-link system.
- A large set of themes or highly granular formatting controls.
- Heavy runtime dependencies introduced only to support rare file formats.

## Engineering Principles

- Prefer local-first behavior and transparent file operations.
- Keep the interface quiet: advanced capability should be discoverable without becoming permanent visual noise.
- Make exports explicit about what was preserved, degraded, or skipped.
- Measure long-document behavior before optimizing it.
- Add dependencies only when they improve a core reading, editing, or delivery workflow.
- Keep README accurate as a product overview and TODO actionable; maintain this file as the source of product direction.
