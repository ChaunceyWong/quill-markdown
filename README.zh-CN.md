# Quill Markdown

[English](README.md) · 简体中文

一款小巧、本地优先的 macOS Markdown 编辑器。写源码，实时看效果 —— 无账号、无云端、无订阅。

> **状态：早期开发阶段（M1）。** 核心编辑功能已可用，macOS 应用也已成功构建并运行，但功能集刻意保持精简。欢迎反馈与贡献。

## 为什么再做一款 Markdown 编辑器？

Quill Markdown 建立在几个刻意的选择之上：

- **体积小巧。** 基于 [Tauri](https://tauri.app/) 而非 Electron，使用系统自带的 WebView，DMG 安装包只有几 MB。
- **本地优先。** 磁盘上的 `.md` 文件是唯一的事实来源。没有数据库、没有账号、没有遥测。关闭应用后，你的作品就是一堆可以随身携带的纯文本文件。
- **安全保存。** 编辑内容经过短暂防抖后自动保存，采用「写临时文件再重命名」的方式，即使崩溃也不会留下截断的文件。`Cmd+S` 可强制立即保存。
- **简单，不臃肿。** 它是带实时预览的源码编辑器，不是 Typora 那种单栏所见即所得的克隆品。这个取舍让代码库保持精简、编辑行为可预期。

## 功能（M1）

- 打开文件夹，在可折叠的侧栏树中浏览 `.md` 文件
- 多标签页 —— 每个文件对应一个可编辑的缓冲区
- CodeMirror 6 源码编辑器，支持 GFM 语法高亮
- markdown-it 实时预览，支持 GFM（表格、任务列表、删除线、自动链接）
- 粘贴图片 → 自动复制到文档旁的 `_assets/` 目录，并以相对路径引用
- 防抖自动保存 + 原子重命名 + `Cmd+S` 强制保存，带未保存改动提示
- 亮色 / 暗色主题，手动切换并记忆选择
- 欢迎页展示最近打开的文件

暂不包含：数学公式渲染、表格编辑辅助、拼写检查、版本历史、全局搜索、插件系统，以及单栏所见即所得编辑。

## 快速开始

### 前置条件

- macOS（Apple Silicon；当前应用按 `aarch64` 构建）
- [Xcode 命令行工具](https://developer.apple.com/xcode/features/)：`xcode-select --install`
- [Rust](https://www.rust-lang.org/tools/install)（通过 `rustup` 安装）
- [Node.js](https://nodejs.org/) 和 [pnpm](https://pnpm.io/)

### 构建与运行

```bash
git clone <your-repo-url> quill-markdown
cd quill-markdown
pnpm install

pnpm tauri dev     # 开发模式，支持热重载
pnpm tauri build   # 在 src-tauri/target/release/bundle/ 下生成 .app 和 .dmg
```

也可以只用 `pnpm build` 构建前端（输出到 `dist/`），这样无需 Rust 工具链即可快速做类型检查。

> **macOS DMG 构建提示：** 如果 Tauri 打包 DMG 时遇到 AppleScript / Finder 自动化权限错误，请在*系统设置 → 隐私与安全性 → 自动化*中为你的终端授予「控制 Finder」权限，或者自行转换中间映像：
> ```bash
> cd src-tauri/target/release/bundle
> hdiutil convert "macos/rw."*.dmg -format UDZO -o "dmg/Quill Markdown_0.1.0_aarch64.dmg"
> ```

## 项目结构

```
.
├── src/                  # React 前端（TypeScript）
│   ├── App.tsx           # 应用外壳：标签、侧栏、自动保存、主题
│   ├── Editor.tsx        # CodeMirror 6 源码编辑器
│   ├── Preview.tsx       # 实时预览面板
│   └── render.ts         # markdown-it 渲染 + 图片路径解析
├── src-tauri/            # Rust / Tauri 后端
│   └── src/lib.rs        # 文件读写、原子保存、资源文件、应用状态
├── scripts/
│   └── generate_icons.py # 重新生成应用图标（需要 Pillow）
└── LICENSE               # Apache-2.0
```

## 数据与隐私

- 没有账号、没有同步、没有任何网络通信 —— 永远不会有。
- 应用状态（最近文件、主题、上次打开的文件夹）以 `state.json` 形式存储在本地应用配置目录。删除该文件即可重置应用。
- 你粘贴的图片会以普通文件形式存放在文档旁的 `_assets/` 目录下。任何内容都不会离开你的设备。

## 参与贡献

欢迎 Issue 和 Pull Request。提交 PR 前请注意：

1. 保持改动范围小 —— 这个项目最大的价值就是精简。
2. 提交前运行 `pnpm build` 和 `cargo check`（在 `src-tauri/` 目录下）。
3. 让改动聚焦，并在 PR 中说明你的理由。

## 路线图想法（尚未承诺）

- 导出为 HTML / PDF
- 多窗口支持
- 在打开的文件夹中全局搜索
- 缓冲区版本历史

## 许可证

基于 Apache License 2.0 授权。完整正文见 [LICENSE](LICENSE)。
