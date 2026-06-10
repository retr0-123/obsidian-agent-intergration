import { describe, expect, it } from "vitest";
import {
  buildAgentLaunch,
  buildOpencodeLaunch,
  buildOpencodeHelperArgs,
  getDefaultShell,
  getPluginRuntimePath,
  getVaultRootPath,
} from "./platform";

describe("getDefaultShell", () => {
  it("uses cmd.exe on Windows to avoid PowerShell script policy", () => {
    expect(getDefaultShell("win32", {})).toBe("cmd.exe");
  });

  it("uses SHELL on non-Windows systems", () => {
    expect(getDefaultShell("linux", { SHELL: "/bin/zsh" })).toBe("/bin/zsh");
  });

  it("falls back to bash on non-Windows systems without SHELL", () => {
    expect(getDefaultShell("linux", {})).toBe("bash");
  });
});

describe("buildOpencodeLaunch", () => {
  it("runs opencode.cmd through cmd.exe in the vault root on Windows", () => {
    expect(buildOpencodeLaunch("C:\\Vault", "win32", {})).toEqual({
      shell: "cmd.exe",
      args: ["/d", "/k", "opencode.cmd"],
      options: {
        cwd: "C:\\Vault",
        name: "xterm-color",
        cols: 80,
        rows: 24,
      },
    });
  });

  it("runs opencode through the user shell in the vault root on Linux", () => {
    expect(buildOpencodeLaunch("/home/me/Vault", "linux", { SHELL: "/bin/zsh" })).toEqual({
      shell: "/bin/zsh",
      args: ["-lc", "opencode"],
      options: {
        cwd: "/home/me/Vault",
        name: "xterm-color",
        cols: 80,
        rows: 24,
      },
    });
  });
});

describe("buildAgentLaunch", () => {
  it("runs a configured command through cmd.exe in the vault root on Windows", () => {
    expect(buildAgentLaunch("C:\\Vault", "codex", "win32", {})).toEqual({
      shell: "cmd.exe",
      args: ["/d", "/k", "codex"],
      options: {
        cwd: "C:\\Vault",
        name: "xterm-color",
        cols: 80,
        rows: 24,
      },
    });
  });

  it("runs a configured command through the user shell on Linux", () => {
    expect(buildAgentLaunch("/vault", "claude --continue", "linux", { SHELL: "/bin/zsh" })).toEqual({
      shell: "/bin/zsh",
      args: ["-lc", "claude --continue"],
      options: {
        cwd: "/vault",
        name: "xterm-color",
        cols: 80,
        rows: 24,
      },
    });
  });
});

describe("getVaultRootPath", () => {
  it("returns the adapter basePath when available", () => {
    expect(getVaultRootPath({ basePath: "C:\\Vault" })).toBe("C:\\Vault");
  });

  it("returns null when the adapter has no basePath", () => {
    expect(getVaultRootPath({})).toBeNull();
  });
});

describe("getPluginRuntimePath", () => {
  it("resolves a runtime file inside the vault plugin directory", () => {
    expect(getPluginRuntimePath("C:\\Vault", ".obsidian/plugins/opencode-obsidian", "node_modules/node-pty/lib/index.js")).toBe(
      "C:/Vault/.obsidian/plugins/opencode-obsidian/node_modules/node-pty/lib/index.js",
    );
  });

  it("returns null when the plugin directory is unavailable", () => {
    expect(getPluginRuntimePath("C:\\Vault", undefined, "node_modules/node-pty/lib/index.js")).toBeNull();
  });
});

describe("buildOpencodeHelperArgs", () => {
  it("passes helper, vault root, and node-pty path to a child Node process", () => {
    expect(buildOpencodeHelperArgs("C:\\Vault", ".obsidian/plugins/opencode-obsidian", "win32")).toEqual({
      command: "node.exe",
      args: [
        "C:/Vault/.obsidian/plugins/opencode-obsidian/helper.js",
        "C:/Vault",
        "C:/Vault/.obsidian/plugins/opencode-obsidian/node_modules/node-pty/lib/index.js",
        "0",
        "opencode.cmd",
      ],
    });
  });

  it("passes a configured agent command to the helper", () => {
    const args = buildOpencodeHelperArgs("C:\\Vault", ".obsidian/plugins/opencode-obsidian", "win32", 0, "codex")?.args;
    expect(args?.[args.length - 1]).toBe("codex");
  });

  it("uses node on non-Windows systems", () => {
    expect(buildOpencodeHelperArgs("/vault", ".obsidian/plugins/opencode-obsidian", "linux")?.command).toBe("node");
  });

  it("returns null when the plugin directory is unavailable", () => {
    expect(buildOpencodeHelperArgs("C:\\Vault", undefined)).toBeNull();
  });
});
