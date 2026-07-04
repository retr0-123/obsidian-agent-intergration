import { execFileSync } from "child_process";

export interface TerminablePtyProcess {
  kill(signal?: NodeJS.Signals): unknown;
  pid?: number;
}

export type RunTaskkill = (pid: number) => void;
export type KillProcessGroup = (pid: number, signal: NodeJS.Signals) => void;

export function terminatePtyProcess(
  child: TerminablePtyProcess,
  platform: NodeJS.Platform = process.platform,
  runTaskkill: RunTaskkill = runWindowsTaskkill,
  killProcessGroup: KillProcessGroup = killUnixProcessGroup,
): void {
  if (platform === "win32") {
    if (isValidPid(child.pid)) {
      try {
        runTaskkill(child.pid);
        return;
      } catch {
        // Fall through to node-pty's own cleanup when taskkill is unavailable.
      }
    }

    killPty(child);
    return;
  }

  if (isValidPid(child.pid)) {
    try {
      killProcessGroup(child.pid, "SIGHUP");
    } catch {
      // Some PTY implementations do not expose the child as a process group.
    }
  }

  killPty(child, "SIGHUP");
}

function runWindowsTaskkill(pid: number): void {
  execFileSync("taskkill", ["/pid", String(pid), "/t", "/f"], {
    stdio: "ignore",
    windowsHide: true,
  });
}

function killUnixProcessGroup(pid: number, signal: NodeJS.Signals): void {
  process.kill(-pid, signal);
}

function killPty(child: TerminablePtyProcess, signal?: NodeJS.Signals): void {
  try {
    child.kill(signal);
  } catch {
    try {
      child.kill();
    } catch {
      // The process may already be gone.
    }
  }
}

function isValidPid(pid: number | undefined): pid is number {
  return typeof pid === "number" && Number.isInteger(pid) && pid > 0;
}
