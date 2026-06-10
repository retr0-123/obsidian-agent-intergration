# Obsidian Agent Integration

[中文](#中文) | [English](#english)

Repository: <https://github.com/retr0-123/obsidian-agent-intergration>

> Note: the repository name currently uses `intergration` to match the configured GitHub URL.

## English

Obsidian Agent Integration is a desktop-only Obsidian plugin that runs a configurable terminal-based agent inside an Obsidian view. It was originally built for `opencode`, but the current implementation can run other terminal agents such as `codex`, `claude`, or any CLI/TUI program available in your `PATH`.

### Current Features

- Run a terminal agent inside Obsidian using xterm.
- Default agent command: `opencode.cmd`.
- Configurable agent display name.
- Configurable agent command.
- Default working directory: the vault root.
- Default open location: right sidebar.
- Optional open locations:
  - left sidebar
  - right sidebar
  - split right of the active pane
  - new tab
- Windows-friendly launch path using `cmd.exe`, avoiding PowerShell execution policy issues.
- Separate helper process for `node-pty`, so native terminal bindings are not loaded in the Obsidian renderer.
- WebSocket bridge between the Obsidian view and the helper process.
- Helper prewarming for faster opening.
- The pty starts only after the view reports a valid terminal size, reducing broken TUI layouts.
- The terminal does not steal editor focus on open; it focuses only when clicked.

### Requirements

This project is currently optimized for Windows desktop usage.

Required:

- Obsidian desktop app.
- Windows 11 x64 is the tested target.
- Node.js installed and `node.exe` available in `PATH`.
- The agent command available in `PATH`.
- For the default setup, `opencode.cmd` must be available in `PATH`.

Not currently targeted:

- Obsidian mobile.
- Cross-platform release packaging.
- Marketplace-ready distribution.

### Installation From Source

Clone the repository:

```bash
git clone https://github.com/retr0-123/obsidian-agent-intergration.git
cd obsidian-agent-intergration
```

Install dependencies:

```bash
npm install
```

Build the plugin package:

```bash
npm run dist
```

Copy the generated folder:

```text
dist/opencode-obsidian
```

to your vault:

```text
<your-vault>/.obsidian/plugins/opencode-obsidian
```

Then restart Obsidian and enable the plugin in Community plugins.

### Settings

Open the plugin settings in Obsidian.

- `Agent name`
  - Display name shown in Obsidian.
  - Example: `opencode`, `Codex`, `Claude`.

- `Agent command`
  - Command executed in the vault root.
  - Example: `opencode.cmd`, `codex`, `claude`.
  - Restart Obsidian after changing this value.

- `Open location`
  - Controls where the agent view opens.

### Development

Useful commands:

```bash
npm test -- --run
npx tsc -noEmit -skipLibCheck
npm run dist
npm audit --omit=dev
```

The slim distribution is written to:

```text
dist/opencode-obsidian
```

Developer handoff notes are available at:

```text
docs/developer/HANDOFF.md
```

### Architecture Summary

Runtime chain:

```text
Obsidian ItemView
  -> xterm
  -> WebSocket ws://127.0.0.1:<helper-port>
  -> helper Node process
  -> node-pty
  -> configured agent command
```

Important implementation notes:

- `node-pty` is loaded only in the helper process.
- The helper waits for the first valid terminal size before spawning the pty.
- Terminal output is not replayed into a fresh xterm because ANSI/TUI output cannot reliably reconstruct an interactive screen.
- Closing the view closes the active WebSocket and kills the current pty, while the helper process remains ready.

---

## 中文

Obsidian Agent Integration 是一个仅面向 Obsidian 桌面端的插件，可以在 Obsidian 视图中运行一个可配置的终端 agent。它最初是为 `opencode` 写的，但现在已经抽象成了通用的终端 agent runner，可以运行 `codex`、`claude` 或其它能在终端里正常工作的 CLI/TUI 程序。

### 现有功能

- 在 Obsidian 内通过 xterm 运行终端 agent。
- 默认 agent 命令：`opencode.cmd`。
- 可配置 agent 显示名称。
- 可配置 agent 启动命令。
- 默认工作目录：当前 vault 根目录。
- 默认打开位置：右侧边栏。
- 可选打开位置：
  - 左侧边栏
  - 右侧边栏
  - 当前 pane 右侧分屏
  - 新标签页
- Windows 友好的启动方式：使用 `cmd.exe`，避免 PowerShell 执行策略拦截。
- `node-pty` 放在独立 helper 进程中加载，不在 Obsidian renderer 中加载 native 模块。
- Obsidian view 和 helper 之间通过本地 WebSocket 通信。
- helper 会在插件加载时预热，提高打开速度。
- pty 会等到 view 报告有效终端尺寸后再启动，减少 TUI 布局错乱。
- 打开 agent 窗口时不会抢走笔记编辑器光标；只有点击终端区域时才聚焦终端。

### 安装要求

当前项目主要针对 Windows 桌面环境优化。

必需条件：

- Obsidian 桌面版。
- 已测试目标：Windows 11 x64。
- 已安装 Node.js，并且 `node.exe` 在 `PATH` 中。
- 你要运行的 agent 命令在 `PATH` 中。
- 默认配置下，`opencode.cmd` 必须在 `PATH` 中。

当前不重点支持：

- Obsidian 移动端。
- 跨平台发布包。
- Obsidian 插件市场级别的通用发布。

### 从源码安装

克隆仓库：

```bash
git clone https://github.com/retr0-123/obsidian-agent-intergration.git
cd obsidian-agent-intergration
```

安装依赖：

```bash
npm install
```

构建插件包：

```bash
npm run dist
```

复制生成目录：

```text
dist/opencode-obsidian
```

到你的 vault：

```text
<your-vault>/.obsidian/plugins/opencode-obsidian
```

然后重启 Obsidian，并在第三方插件设置中启用该插件。

### 设置项

在 Obsidian 插件设置中可以配置：

- `Agent name`
  - Obsidian 中显示的名称。
  - 示例：`opencode`、`Codex`、`Claude`。

- `Agent command`
  - 在 vault 根目录下执行的命令。
  - 示例：`opencode.cmd`、`codex`、`claude`。
  - 修改后需要重启 Obsidian。

- `Open location`
  - 控制 agent view 打开的位置。

### 开发

常用命令：

```bash
npm test -- --run
npx tsc -noEmit -skipLibCheck
npm run dist
npm audit --omit=dev
```

精简后的插件包会生成到：

```text
dist/opencode-obsidian
```

给二次开发者的 handoff 文档在：

```text
docs/developer/HANDOFF.md
```

### 架构概览

运行链路：

```text
Obsidian ItemView
  -> xterm
  -> WebSocket ws://127.0.0.1:<helper-port>
  -> helper Node process
  -> node-pty
  -> configured agent command
```

关键实现注意点：

- `node-pty` 只在 helper 进程中加载。
- helper 会等待第一个有效终端尺寸后再启动 pty。
- 不会把终端输出缓存后重放进新的 xterm，因为 ANSI/TUI 输出无法可靠还原交互式屏幕状态。
- 关闭 view 会关闭当前 WebSocket 并杀掉当前 pty，但 helper 进程会保留以便下次快速打开。
