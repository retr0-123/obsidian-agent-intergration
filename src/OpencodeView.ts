import { ItemView, WorkspaceLeaf } from "obsidian";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { shouldFocusTerminal } from "./focusPolicy";
import { OpencodeSession } from "./OpencodeSession";
import { OpencodeSessionSnapshot } from "./OpencodeSessionState";
import { parseMessage, ServerMessage } from "./protocol";
import { initialStartupStatus, reduceStartupStatus, StartupStatus } from "./startupStatus";
import { canFitTerminalElement, normalizeTerminalDimensions } from "./terminalLayout";

export const VIEW_TYPE_OPENCODE = "opencode-view";

export class OpencodeView extends ItemView {
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private pendingFit: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private socket: WebSocket | null = null;
  private statusDetailEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private statusTitleEl: HTMLElement | null = null;
  private startupStatus: StartupStatus = initialStartupStatus();
  private unsubscribeSession: (() => void) | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly session: OpencodeSession,
    private readonly agentName: string,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_OPENCODE;
  }

  getDisplayText(): string {
    return this.agentName;
  }

  getIcon(): string {
    return "terminal";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("opencode-view");

    const container = this.contentEl.createDiv({ cls: "opencode-terminal" });
    this.statusEl = this.contentEl.createDiv({ cls: "opencode-startup-status" });
    this.statusTitleEl = this.statusEl.createDiv({ cls: "opencode-startup-title" });
    this.statusDetailEl = this.statusEl.createDiv({ cls: "opencode-startup-detail" });
    this.renderStartupStatus();

    this.terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "Consolas, 'Cascadia Mono', 'Courier New', monospace",
      theme: {
        background: "#111111",
      },
    });
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(container);
    this.registerDomEvent(container, "mousedown", () => {
      if (shouldFocusTerminal("user-pointer")) {
        this.terminal?.focus();
      }
    });
    this.scheduleFit();

    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !canFitTerminalElement(this.contentEl)) {
        return;
      }

      this.scheduleFit();
    });
    this.resizeObserver.observe(container);

    this.terminal.onData((data) => {
      this.sendToHelper({ type: "input", data });
    });

    this.unsubscribeSession = this.session.state.subscribe((snapshot) => {
      this.applySessionSnapshot(snapshot);
    });
  }

  async onClose(): Promise<void> {
    this.unsubscribeSession?.();
    this.unsubscribeSession = null;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.socket?.close();
    this.socket = null;

    if (this.pendingFit !== null) {
      window.cancelAnimationFrame(this.pendingFit);
      this.pendingFit = null;
    }

    this.terminal?.dispose();
    this.terminal = null;
    this.fitAddon = null;
    this.statusEl = null;
    this.statusTitleEl = null;
    this.statusDetailEl = null;
  }

  private fitTerminal(): void {
    if (!canFitTerminalElement(this.contentEl)) {
      return;
    }

    const fitAddon = this.fitAddon;
    if (!fitAddon) {
      return;
    }

    fitAddon.fit();
    const dimensions = normalizeTerminalDimensions(fitAddon.proposeDimensions());

    if (dimensions) {
      this.sendToHelper({
        type: "resize",
        cols: dimensions.cols,
        rows: dimensions.rows,
      });
    }
  }

  private scheduleFit(): void {
    if (this.pendingFit !== null) {
      return;
    }

    this.pendingFit = window.requestAnimationFrame(() => {
      this.pendingFit = null;
      this.fitTerminal();
    });
  }

  private applySessionSnapshot(snapshot: OpencodeSessionSnapshot): void {
    if (snapshot.phase === "helper-starting") {
      this.startupStatus = reduceStartupStatus(this.startupStatus, { type: "helper-starting" });
    } else if (snapshot.phase === "helper-ready" && snapshot.port !== null) {
      this.startupStatus = reduceStartupStatus(this.startupStatus, { port: snapshot.port, type: "helper-ready" });
      this.connectSocket(snapshot.port);
    } else if (snapshot.phase === "failed") {
      this.startupStatus = reduceStartupStatus(this.startupStatus, { message: snapshot.detail, type: "error" });
    } else if (snapshot.phase === "closed") {
      this.startupStatus = reduceStartupStatus(this.startupStatus, { type: "socket-close" });
    }

    this.renderStartupStatus();
    this.scheduleFit();
  }

  private connectSocket(port: number): void {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      return;
    }

    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    this.socket = socket;

    socket.onopen = () => {
      this.startupStatus = reduceStartupStatus(this.startupStatus, { type: "socket-open" });
      this.renderStartupStatus();
      this.fitTerminal();
    };

    socket.onmessage = (event) => {
      const raw = typeof event.data === "string" ? event.data : "";
      const message = parseMessage<ServerMessage>(raw);
      if (!message) {
        return;
      }

      if (message.type === "output") {
        this.startupStatus = reduceStartupStatus(this.startupStatus, { type: "output" });
        this.renderStartupStatus();
        this.terminal?.write(message.data);
        this.scheduleFit();
        return;
      }

      if (message.type === "error") {
        this.startupStatus = reduceStartupStatus(this.startupStatus, { message: message.message, type: "error" });
        this.renderStartupStatus();
        this.terminal?.writeln(message.message);
        return;
      }

      if (message.type === "status") {
        this.startupStatus = reduceStartupStatus(this.startupStatus, { type: "pty-starting" });
        this.renderStartupStatus();
        this.scheduleFit();
      }
    };

    socket.onerror = () => {
      this.startupStatus = reduceStartupStatus(this.startupStatus, { type: "socket-error" });
      this.renderStartupStatus();
    };

    socket.onclose = () => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = null;
      if (this.startupStatus.visible) {
        this.startupStatus = reduceStartupStatus(this.startupStatus, { type: "socket-close" });
        this.renderStartupStatus();
      }
    };
  }

  private sendToHelper(message: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch {
      this.startupStatus = reduceStartupStatus(this.startupStatus, {
        message: "Failed to send data to the opencode helper.",
        type: "error",
      });
      this.renderStartupStatus();
    }
  }

  private renderStartupStatus(): void {
    if (!this.statusEl || !this.statusTitleEl || !this.statusDetailEl) {
      return;
    }

    this.statusEl.toggleClass("is-hidden", !this.startupStatus.visible);
    this.statusTitleEl.setText(this.startupStatus.title);
    this.statusDetailEl.setText(this.startupStatus.detail);
  }
}
