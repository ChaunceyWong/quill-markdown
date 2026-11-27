# Quill Markdown

English · [简体中文](README.zh-CN.md)

A small, local-first Markdown editor for macOS. Write in a clean, rendered page — or switch to source with a live preview. No account, no cloud, no subscriptions.

## Why Quill Markdown?

- **Built for writing.** A single-pane, WYSIWYG view keeps your document in focus. Formatting happens where you write — right-click for bold, italics, highlights, lists, links, tables, and more — while common shortcuts just work.
- **Your files, your rules.** `.md` files on disk are the single source of truth. No database, no account, no telemetry. Your writing stays plain text that you can take anywhere.
- **Small and fast.** Built with [Tauri](https://tauri.app/) on the system WebView instead of bundling a browser. The installer is a fraction of the size of an Electron app.
- **Safe saves.** Every edit is serialized back to Markdown and autosaved with a short debounce via write-to-temporary-then-rename, so a crash cannot leave a truncated file. `Cmd+S` forces an immediate save.
- **Connected notes.** Link documents with `[[wiki links]]` and discover what references the current page through the backlink panel.

## Features

- WYSIWYG editing by default, with a switchable source + live-preview mode as a fallback
- Right-click formatting menu: bold, italic, strikethrough, underline, inline code, highlight, horizontal rule, quotes, lists, and an interactive table-size picker
- `[[filename]]` wiki links with clickable navigation and a backlink panel in the sidebar
- Open a folder and browse `.md` files in a collapsible sidebar tree; multiple tabs, one file per tab
- Paste images → automatically copied into `_assets/` next to the document and referenced with a relative path
- Recent files on the welcome page, with per-item removal and clear-all
- Light / dark themes with manual switching and persistence
- GFM rendering (tables, task lists, strikethrough, autolinks) in the source preview

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

The frontend alone can be built with `pnpm build` (output in `dist/`), which is useful for a quick type-check without the Rust toolchain.

> **Tip for macOS DMG builds:** if Tauri's DMG bundling fails with an AppleScript / Finder automation permission error, grant your terminal "Control Finder" under *System Settings → Privacy & Security → Automation*, or convert the intermediate image yourself:
> ```bash
> cd src-tauri/target/release/bundle
> hdiutil convert "macos/rw."*.dmg -format UDZO -o "dmg/Quill Markdown_0.1.0_aarch64.dmg"
> ```

### Installing an unsigned build

Release DMGs are only notarized when the signing secrets are configured in CI. If macOS says the app "is damaged and can't be opened", the app is fine — Gatekeeper is blocking an unsigned download. Remove the quarantine flag after copying the app to `/Applications`:

```bash
xattr -cr "/Applications/Quill Markdown.app"
```

This is a manual, per-install step. The proper fix is code signing + notarization with an Apple Developer ID; the CI workflow supports it via the `MACOS_CERT_P12`, `MACOS_CERT_PASSWORD`, `MACOS_SIGN_IDENTITY`, `APPLE_ID`, `APPLE_TEAM_ID` and `APPLE_APP_PASSWORD` secrets.

## Project layout

```
.
├── src/                  # React frontend (TypeScript)
│   ├── App.tsx           # app shell: tabs, sidebar, autosave, theme, backlinks
│   ├── WysiwygEditor.tsx # single-pane WYSIWYG editor (TipTap)
│   ├── ContextMenu.tsx   # right-click formatting menu
│   ├── Editor.tsx        # CodeMirror 6 source editor
│   ├── Preview.tsx       # live preview panel
│   ├── wiki.ts           # wiki link parsing / backlink index
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

## Roadmap

- Export to HTML / PDF
- Multi-window support
- Global search across the open folder
- Version history for buffers

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full text.
