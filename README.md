# Quill Markdown

English · [简体中文](README.zh-CN.md)

A small, local-first Markdown editor for macOS. Write in source, see the result live — no account, no cloud, no subscriptions.

> **Status: early development (M1).** Core editing works and the macOS app has been built and run, but the feature set is intentionally small. Feedback and contributions are welcome.

## Why another Markdown editor?

Quill Markdown is built around a few deliberate choices:

- **Small footprint.** Built with [Tauri](https://tauri.app/) instead of Electron, it uses the system WebView. The DMG installer is only a few megabytes.
- **Local-first.** Your `.md` files on disk are the single source of truth. No database, no account, no telemetry. Close the app and your writing is just a pile of plain text files you can take anywhere.
- **Safe saves.** Edits are autosaved with a short debounce via write-to-temporary-then-rename, so a crash cannot leave a truncated file. `Cmd+S` forces an immediate save.
- **Simple, not bloated.** It is a source editor with a live preview — not a WYSIWYG clone of Typora. That trade-off keeps the codebase small and the editor predictable.

## Features (M1)

- Open a folder and browse its `.md` files in a collapsible sidebar tree
- Multiple tabs — one editable buffer per file
- CodeMirror 6 source editor with GFM syntax highlighting
- markdown-it live preview with GFM support (tables, task lists, strikethrough, autolinks)
- Paste an image → it is copied into `_assets/` next to the document and referenced with a relative path
- Debounced autosave + atomic rename + `Cmd+S` force save, with an unsaved-changes indicator
- Light / dark themes with manual switching and persistence
- Welcome page with recently opened files

Not included (for now): math rendering, table editing aids, spellcheck, version history, global search, plugins, and single-pane WYSIWYG editing.

## Getting started

### Prerequisites

- macOS (Apple Silicon; the app is currently built for `aarch64`)
- [Xcode command line tools](https://developer.apple.com/xcode/features/): `xcode-select --install`
- [Rust](https://www.rust-lang.org/tools/install) (via `rustup`)
- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/)

### Build and run

```bash
git clone <your-repo-url> quill-markdown
cd quill-markdown
pnpm install

pnpm tauri dev     # development build with hot reload
pnpm tauri build   # produces the .app and .dmg under src-tauri/target/release/bundle/
```

The frontend alone can be built with `pnpm build` (output in `dist/`), which is useful for quick type-checks without the Rust toolchain.

> **Tip for macOS DMG builds:** if Tauri's DMG bundling fails with an AppleScript / Finder automation permission error, grant your terminal "Control Finder" under *System Settings → Privacy & Security → Automation*, or convert the intermediate image yourself:
> ```bash
> cd src-tauri/target/release/bundle
> hdiutil convert "macos/rw."*.dmg -format UDZO -o "dmg/Quill Markdown_0.1.0_aarch64.dmg"
> ```

## Project layout

```
.
├── src/                  # React frontend (TypeScript)
│   ├── App.tsx           # app shell: tabs, sidebar, autosave, theme
│   ├── Editor.tsx        # CodeMirror 6 source editor
│   ├── Preview.tsx       # live preview panel
│   └── render.ts         # markdown-it rendering + image resolution
├── src-tauri/            # Rust / Tauri backend
│   └── src/lib.rs        # file I/O, atomic saves, assets, app state
├── scripts/
│   └── generate_icons.py # regenerates the app icons (needs Pillow)
└── LICENSE               # Apache-2.0
```

## Data and privacy

- There is no account, sync, or network communication — ever.
- Application state (recent files, theme, last folder) is stored locally in the app config directory as `state.json`. Delete that file to reset the app.
- Images you paste are stored as regular files under `_assets/` next to the document. Nothing leaves your machine.

## Contributing

Issues and pull requests are welcome. Before opening a PR:

1. Keep the scope small — this project's main value is staying minimal.
2. Run `pnpm build` and `cargo check` (inside `src-tauri/`) before submitting.
3. Keep changes focused and explain the reasoning in your pull request.

## Roadmap ideas (not committed)

- Export to HTML / PDF
- Multi-window support
- Global search across the open folder
- Version history for buffers

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full text.
