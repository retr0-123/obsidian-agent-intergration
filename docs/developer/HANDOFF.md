# opencode-obsidian Handoff

Last updated: 2026-06-10

This repository contains an Obsidian plugin for running a terminal-based agent
inside an Obsidian view. It started as an opencode-only plugin, but the current
implementation is a configurable terminal agent runner. The default agent is
still opencode.

## Current Behavior

- Opens a terminal agent view in Obsidian, defaulting to the right sidebar.
- Uses the vault root as the agent working directory.
- Defaults to:
  - Agent name: `opencode`
  - Agent command: `opencode.cmd`
- The settings tab allows changing:
  - `Agent name`
  - `Agent command`
  - `Open location`
- Agent command examples:
  - `opencode.cmd`
  - `codex`
  - `claude`
- Changing agent settings requires restarting Obsidian, because the helper is
  prewarmed during plugin load.

## Architecture

The runtime chain is:

```text
Obsidian ItemView
  -> xterm
  -> WebSocket ws://127.0.0.1:<helper-port>
  -> helper Node process
  -> node-pty
  -> configured agent command
```

Important design constraints:

- `node-pty` must not be loaded in the Obsidian renderer bundle. Native module
  loading in Electron renderer caused failures on Windows.
- `node-pty` is loaded only in `helper.js`, which runs in a separate system
  Node process.
- The helper is prewarmed on plugin load, including loading `node-pty`.
- The actual pty/agent process is created only when the view connects and sends
  the first valid terminal size.
- The helper waits for the first valid `cols`/`rows` before spawning the pty.
  This prevents opencode or another TUI agent from rendering at the default
  `80x24` size and then producing broken layout until a manual pane resize.
- The view does not replay terminal output. Replaying ANSI/TUI output into a
  fresh xterm breaks layout and input semantics.
- The pty lifetime is bound to the active WebSocket connection. Closing the
  view closes the socket and kills the current pty, while keeping the helper
  process ready for the next open.
- Opening or resizing the agent view must not steal editor focus. The terminal
  focuses only after direct user pointer input inside the terminal.

## Key Files

- `main.ts`
  - Plugin entrypoint.
  - Loads settings.
  - Creates and prewarms `OpencodeSession`.
  - Registers the view, ribbon command, command palette entry, and settings tab.

- `src/OpencodeSession.ts`
  - Owns the helper process lifecycle.
  - Starts `node.exe helper.js ...` on plugin load.
  - Parses helper stdout control messages.
  - Stores helper readiness in `OpencodeSessionState`.

- `src/OpencodeSessionState.ts`
  - Pure state object for helper readiness/failure/closed state.
  - Intentionally does not store terminal output.

- `src/OpencodeView.ts`
  - Owns xterm and the live WebSocket connection to the helper.
  - Sends input and resize messages.
  - Writes output directly to xterm.
  - Does not own the helper process.
  - Does not auto-focus xterm on open/socket/resize.

- `src/helper.ts`
  - Runs in the separate Node helper process.
  - Loads `node-pty`.
  - Hosts the local WebSocket server.
  - Waits for initial terminal size before spawning the configured agent.
  - Spawns the configured command through `buildAgentLaunch`.

- `src/platform.ts`
  - Builds shell launch config.
  - Windows uses `cmd.exe /d /k <agent command>`.
  - Non-Windows uses `$SHELL -lc <agent command>`.
  - Builds helper launch args.

- `src/settings.ts`
  - Defines defaults and normalization.
  - Defaults to `agentCommand: "opencode.cmd"` and `agentName: "opencode"`.

- `src/OpencodeSettingTab.ts`
  - Exposes agent name, agent command, and open location.
  - Warns that restart is required after agent setting changes.

- `src/helperStartup.ts`
  - Pure helper startup sizing logic.
  - Ensures pty startup waits for a valid initial terminal size.

- `src/focusPolicy.ts`
  - Pure focus policy.
  - Only direct pointer input should focus the terminal.

- `src/startupStatus.ts`
  - Startup/status overlay state shown before agent output arrives.

- `src/terminalLayout.ts`
  - Guards against zero/invalid terminal dimensions.
  - Prevents `node-pty.resize` errors from hidden panes or tab switches.

- `scripts/build-dist.mjs`
  - Builds the slim Windows x64 plugin package into `dist/opencode-obsidian`.
  - Copies only the needed `node-pty` runtime files and `ws`.

## Build and Verification

Use these commands after any code change:

```bash
npm test -- --run
npx tsc -noEmit -skipLibCheck
npm run dist
npm audit --omit=dev
```

Expected current state:

- 10 test files
- 42 tests
- `dist/opencode-obsidian` around `3.2M`
- `npm audit --omit=dev` reports 0 vulnerabilities

For the final Windows install, replace the entire target directory:

```text
<vault>/.obsidian/plugins/opencode-obsidian
```

with:

```text
dist/opencode-obsidian
```

Then restart Obsidian.

## Windows Assumptions

This project is currently optimized for a Windows 11 x64 desktop environment.

Required on Windows:

- `node.exe` available in `PATH`
- The configured agent command available in `PATH`
- For default opencode mode, `opencode.cmd` available in `PATH`

The Windows command path uses `cmd.exe`, not PowerShell. This avoids
PowerShell execution policy failures such as blocked `.ps1` wrappers.

## Known Pitfalls and Past Fixes

- Do not load `node-pty` in the Obsidian renderer.
  - It caused native module and Worker-related failures in Electron.

- Do not use PowerShell to launch opencode on Windows.
  - PowerShell execution policy can block `opencode.ps1`.
  - Use `cmd.exe /d /k opencode.cmd`.

- Do not replay cached TUI output into a fresh xterm.
  - This broke input, resize, and screen layout.
  - TUI output must stay live between the active pty and the active xterm.

- Do not spawn the pty before receiving the real terminal size.
  - Starting at `80x24` caused layout corruption until manual pane resize.

- Do not call `terminal.focus()` during open/socket/fit.
  - It steals focus from the Obsidian editor.
  - Only user pointer input should focus the terminal.

- Do not call `node-pty.resize` with zero, negative, `NaN`, or hidden-pane
  dimensions.
  - Use `normalizeTerminalDimensions` and `canFitTerminalElement`.

- If the agent output looks wrong after an edit, first inspect whether the pty
  was started with the real terminal dimensions and whether resize messages are
  being sent after layout changes.

## Code Review Graph

At the time of this handoff, this directory is not a git repository and has no
`.code-review-graph` directory. The code-review-graph MCP tool reports:

```text
repo_root does not look like a project root
```

Use direct source reads and `rg` unless a future maintainer initializes a git
repo or builds a code-review graph.

## Extension Notes

The current implementation supports one configured agent command. It does not
yet implement multi-profile agent switching. If that is added later, avoid
running multiple ptys through the same helper socket unless the protocol is
extended deliberately.

Reasonable next step for multi-agent support:

- Add a list of agent profiles to settings.
- Add an active profile setting.
- Restart the helper when the active profile changes and no view is active.
- Keep the one-pty-per-active-view invariant unless there is a clear reason to
  support concurrent agents.

Keep the plugin small. It is not currently a marketplace-ready general terminal
manager.
