# MDView

MDView is a lightweight cross-platform desktop app for viewing Markdown files and making simple source edits.

## Features

- Preview-first Markdown reading experience.
- Plain text source editing with unsaved-change state.
- Open, save, and save-as for `.md` and `.markdown` files in the desktop app.
- GitHub Flavored Markdown tables, task lists, and code highlighting.
- Tauri bundle configuration for Windows and macOS installers.
- File association configuration for `.md` and `.markdown` documents.

## Development

Install JavaScript dependencies:

```bash
npm install
```

Run the web UI only:

```bash
npm run dev
```

Run tests, linting, and frontend build:

```bash
npm test
npm run lint
npm run build
```

## Desktop App

Tauri requires Rust/Cargo on the machine building or running the desktop shell.

After installing the Tauri prerequisites, run:

```bash
npm run desktop:dev
```

Build installers and app bundles:

```bash
npm run desktop:build
```

On Windows, the bundle target can produce installer formats such as NSIS/MSI. On macOS, it can produce `.app`/DMG bundles. The current Tauri config registers Markdown file associations through `bundle.fileAssociations`.
