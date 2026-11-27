# Quill Markdown

[English](README.md) · 简体中文

一款小巧、本地优先的 macOS Markdown 编辑器。在干净的渲染页面里直接写作，也可以切换到源码 + 实时预览。无账号、无云端、无订阅。

## 为什么选择 Quill Markdown？

- **为写作而生。** 默认单栏所见即所得，让你专注于内容。格式就在写作的地方完成——右键即可加粗、斜体、高亮、列表、链接、插入表格，常用快捷键也直接可用。
- **文件属于你。** 磁盘上的 `.md` 文件是唯一的事实来源。没有数据库、没有账号、没有遥测。你的作品始终是纯文本，可以随身带走。
- **小而快。** 基于 [Tauri](https://tauri.app/) 和系统自带的 WebView，而不是打包一个浏览器。安装包体积只有 Electron 应用的一小部分。
- **安全保存。** 每次编辑都会序列化回 Markdown，并通过「写临时文件再重命名」的方式短暂防抖自动保存，即使崩溃也不会留下截断的文件。`Cmd+S` 可强制立即保存。
- **笔记互联。** 用 `[[双向链接]]` 连接文档，并通过反链面板发现哪些页面引用了当前文档。

## 功能

- 默认所见即所得编辑，可切换到源码 + 实时预览模式作为补充
- 右键格式菜单：加粗、斜体、删除线、下划线、行内代码、高亮、横线、引用、列表，以及可交互的表格行列选择器
- `[[文件名]]` 双向链接，点击跳转；侧栏提供反向链接面板
- 打开文件夹，在可折叠侧栏树中浏览 `.md` 文件；多标签页，一个文件一个标签
- 粘贴图片 → 自动复制到文档旁的 `_assets/` 目录，并以相对路径引用
- 欢迎页展示最近打开的文件，支持删除单条和清空全部
- 亮色 / 暗色主题，手动切换并记忆选择
- 源码预览支持 GFM 渲染（表格、任务列表、删除线、自动链接）

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

### 安装未签名的构建

只有当 CI 配置了签名 secrets 时，Release 里的 DMG 才会经过公证。如果 macOS 提示应用「已损坏，无法打开」，应用本身没有问题——是 Gatekeeper 拦截了未签名的下载。把应用复制到 `/Applications` 后，移除隔离属性即可：

```bash
xattr -cr "/Applications/Quill Markdown.app"
```

这需要每次安装手动执行一次。

## 项目结构

```
.
├── src/                  # React 前端（TypeScript）
│   ├── App.tsx           # 应用外壳：标签、侧栏、自动保存、主题、反链
│   ├── WysiwygEditor.tsx # 单栏所见即所得编辑器（TipTap）
│   ├── ContextMenu.tsx   # 右键格式菜单
│   ├── Editor.tsx        # CodeMirror 6 源码编辑器
│   ├── Preview.tsx       # 实时预览面板
│   ├── wiki.ts           # 双向链接解析 / 反链索引
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

## 路线图

- 导出为 HTML / PDF
- 多窗口支持
- 在打开的文件夹中全局搜索
- 缓冲区版本历史

## 许可证

基于 Apache License 2.0 授权。完整正文见 [LICENSE](LICENSE)。
