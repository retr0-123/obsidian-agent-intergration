import { ItemView, WorkspaceLeaf } from "obsidian";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { shouldFocusTerminal } from "./focusPolicy";
import { OpencodeSession } from "./OpencodeSession";
import { OpencodeSessionSnapshot } from "./OpencodeSessionState";
import { parseMessage, ServerMessage } from "./protocol";
import { initialStartupStatus, reduceStartupStatus, StartupStatus } from "./startupStatus";
import {
  canFitTerminalElement,
  estimateTerminalDimensions,
  normalizeTerminalDimensions,
  writeTerminalAndScheduleFit,
} from "./terminalLayout";

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
  private terminalContainer: HTMLElement | null = null;
  private unsubscribeSession: (() => void) | null = null;
  private fitRetryCount = 0;
  private pendingFitRetry: number | null = null;

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
    this.terminalContainer = container;
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
      if (!entry || !canFitTerminalElement(container)) {
        return;
      }

      this.scheduleFit();
    });
    this.resizeObserver.observe(container);

    this.terminal.onData((data) => {
      this.sendToHelper({ type: "input", data });
    });

    this.session.start();
    this.unsubscribeSession = this.session.state.subscribe((snapshot) => {
      this.applySessionSnapshot(snapshot);
    });
  }

  async onClose(): Promise<void> {
    this.unsubscribeSession?.();
    this.unsubscribeSession = null;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendToHelper({ type: "terminate" });
    }
    this.socket?.close();
    this.socket = null;

    if (this.pendingFit !== null) {
      window.cancelAnimationFrame(this.pendingFit);
      this.pendingFit = null;
    }

    this.terminal?.dispose();
    this.terminal = null;
    this.fitAddon = null;
    this.terminalContainer = null;
    this.statusEl = null;
    this.statusTitleEl = null;
    this.statusDetailEl = null;

    if (this.pendingFitRetry !== null) {
      window.clearTimeout(this.pendingFitRetry);
      this.pendingFitRetry = null;
    }
  }

  private fitTerminal(): void {
    const container = this.terminalContainer;
    if (!container || !canFitTerminalElement(container)) {
      this.retryFitIfSocketOpen();
      return;
    }

    const fitAddon = this.fitAddon;
    if (!fitAddon) {
      this.retryFitIfSocketOpen();
      return;
    }

    let dimensions = normalizeTerminalDimensions(fitAddon.proposeDimensions());
    try {
      fitAddon.fit();
      dimensions = normalizeTerminalDimensions(fitAddon.proposeDimensions()) || dimensions;
    } catch {
      dimensions = dimensions || estimateTerminalDimensions(container);
    }

    dimensions = dimensions || estimateTerminalDimensions(container);

    if (dimensions) {
      this.fitRetryCount = 0;
      this.sendToHelper({
        type: "resize",
        cols: dimensions.cols,
        rows: dimensions.rows,
      });
      return;
    }

    this.retryFitIfSocketOpen();
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

  private retryFitIfSocketOpen(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || this.fitRetryCount >= 120 || this.pendingFitRetry !== null) {
      return;
    }

    this.fitRetryCount += 1;
    this.pendingFitRetry = window.setTimeout(() => {
      this.pendingFitRetry = null;
      this.scheduleFit();
    }, 50);
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
      this.fitRetryCount = 0;
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
        writeTerminalAndScheduleFit(this.terminal, message.data, () => this.scheduleFit());
        return;
      }

      if (message.type === "error") {
        this.startupStatus = reduceStartupStatus(this.startupStatus, { message: message.message, type: "error" });
        this.renderStartupStatus();
        writeTerminalAndScheduleFit(this.terminal, `${message.message}\r\n`, () => this.scheduleFit());
        return;
      }

      if (message.type === "status") {
        this.startupStatus = reduceStartupStatus(this.startupStatus, { message: message.message, type: "pty-status" });
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
