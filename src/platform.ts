export type PlatformName = NodeJS.Platform;

export interface LaunchConfig {
  shell: string;
  args: string[];
  options: {
    cwd: string;
    name: string;
    cols: number;
    rows: number;
  };
}

export function getDefaultShell(platform: PlatformName, env: NodeJS.ProcessEnv): string {
  if (platform === "win32") {
    return "cmd.exe";
  }

  return env.SHELL || "bash";
}

export function buildOpencodeLaunch(
  cwd: string,
  platform: PlatformName = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): LaunchConfig {
  return buildAgentLaunch(cwd, platform === "win32" ? "opencode.cmd" : "opencode", platform, env);
}

export function buildAgentLaunch(
  cwd: string,
  command: string,
  platform: PlatformName = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): LaunchConfig {
  const shell = getDefaultShell(platform, env);

  return {
    shell,
    args: platform === "win32" ? ["/d", "/k", command] : ["-lc", command],
    options: {
      cwd,
      name: "xterm-color",
      cols: 80,
      rows: 24,
    },
  };
}

export function getVaultRootPath(adapter: unknown): string | null {
  const basePath = typeof adapter === "object" && adapter !== null && "basePath" in adapter
    ? adapter.basePath
    : null;

  return typeof basePath === "string" && basePath.length > 0
    ? basePath
    : null;
}

export function getPluginRuntimePath(vaultRoot: string, pluginDir: string | undefined, runtimePath: string): string | null {
  if (!pluginDir) {
    return null;
  }

  return [vaultRoot, pluginDir, runtimePath]
    .map((part) => part.replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""))
    .filter((part) => part.length > 0)
    .join("/");
}

export interface HelperLaunchConfig {
  command: string;
  args: string[];
}

export function buildOpencodeHelperArgs(
  vaultRoot: string,
  pluginDir: string | undefined,
  platform: PlatformName = process.platform,
  port = 0,
  agentCommand = "opencode.cmd",
): HelperLaunchConfig | null {
  const helperPath = getPluginRuntimePath(vaultRoot, pluginDir, "helper.js");
  const nodePtyPath = getPluginRuntimePath(vaultRoot, pluginDir, "node_modules/node-pty/lib/index.js");

  if (!helperPath || !nodePtyPath) {
    return null;
  }

  return {
    command: platform === "win32" ? "node.exe" : "node",
    args: [
      helperPath,
      vaultRoot.replace(/\\/g, "/"),
      nodePtyPath,
      String(port),
      agentCommand,
    ],
  };
}
