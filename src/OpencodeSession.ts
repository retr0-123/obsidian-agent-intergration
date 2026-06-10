import { App, Notice } from "obsidian";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { buildOpencodeHelperArgs, getVaultRootPath } from "./platform";
import { HelperStdoutMessage, parseMessage } from "./protocol";
import { OpencodeSessionState } from "./OpencodeSessionState";

export class OpencodeSession {
  readonly state = new OpencodeSessionState();

  private process: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuffer = "";

  constructor(
    private readonly appRef: App,
    private readonly pluginDir: string | undefined,
    private readonly agentCommand: string,
  ) {}

  dispose(): void {
    this.process?.kill();
    this.process = null;

    this.state.close();
  }

  start(): void {
    if (this.process) {
      return;
    }

    const cwd = getVaultRootPath(this.appRef.vault.adapter);
    if (!cwd) {
      this.state.fail("Unable to resolve the vault root directory.");
      new Notice("Unable to resolve the vault root directory.");
      return;
    }

    try {
      const launch = buildOpencodeHelperArgs(cwd, this.pluginDir, process.platform, 0, this.agentCommand);
      if (!launch) {
        throw new Error("Unable to resolve the plugin runtime directory.");
      }

      this.state.helperStarting();
      this.process = spawn(launch.command, launch.args, {
        cwd,
        env: process.env,
        windowsHide: true,
      });

      this.process.stdout.on("data", (data: Buffer) => this.handleHelperStdout(data.toString("utf8")));

      this.process.stderr.on("data", (data: Buffer) => {
        this.state.fail(data.toString("utf8"));
      });

      this.process.on("error", (error) => {
        this.process = null;
        this.state.fail(`Failed to start agent helper: ${error.message}`);
      });

      this.process.on("exit", (code) => {
        this.process = null;
        if (code && code !== 0) {
          this.state.fail(`Agent helper exited with code ${code}.`);
          return;
        }

        this.state.close();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.fail(`Failed to start agent: ${message}`);
      new Notice("Failed to start agent. Confirm the configured command is available in PATH.");
    }
  }

  private handleHelperStdout(chunk: string): void {
    this.stdoutBuffer += chunk;

    for (;;) {
      const newline = this.stdoutBuffer.indexOf("\n");
      if (newline === -1) {
        return;
      }

      const line = this.stdoutBuffer.slice(0, newline);
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);

      const message = parseMessage<HelperStdoutMessage>(line);
      if (!message) {
        continue;
      }

      if (message.type === "ready") {
        this.state.helperReady(message.port);
        continue;
      }

      if (message.type === "error") {
        this.state.fail(message.message);
      }
    }
  }
}
