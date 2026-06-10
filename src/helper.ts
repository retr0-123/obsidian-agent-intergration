import { WebSocket, WebSocketServer } from "ws";
import { acceptInitialResize, createHelperStartupState } from "./helperStartup";
import { buildAgentLaunch } from "./platform";
import { ClientMessage, encodeMessage, parseMessage } from "./protocol";
import { TerminalDimensions, normalizeTerminalDimensions } from "./terminalLayout";

interface PtyProcess {
  kill(): void;
  onData(callback: (data: string) => void): void;
  resize(cols: number, rows: number): void;
  write(data: string): void;
}

interface NodePty {
  spawn(shell: string, args: string[], options: ReturnType<typeof buildAgentLaunch>["options"]): PtyProcess;
}

const cwd = process.argv[2];
const nodePtyPath = process.argv[3];
const requestedPort = Number(process.argv[4] || "0");
const agentCommand = process.argv[5] || "opencode.cmd";

if (!cwd || !nodePtyPath || Number.isNaN(requestedPort) || !agentCommand.trim()) {
  writeControl({ type: "error", message: "Missing helper arguments. Expected vault root, node-pty path, port, and agent command." });
  process.exit(1);
}

let child: PtyProcess | null = null;
let pty: NodePty | null = null;
let socket: WebSocket | null = null;

try {
  pty = require(nodePtyPath) as NodePty;

  const server = new WebSocketServer({
    host: "127.0.0.1",
    port: requestedPort,
  });

  server.on("listening", () => {
    const address = server.address();
    if (address && typeof address === "object") {
      writeControl({ type: "ready", port: address.port });
    }
  });

  server.on("connection", (connectedSocket) => {
    if (socket && socket.readyState === socket.OPEN) {
      connectedSocket.close();
      return;
    }

    socket = connectedSocket;
    const startup = createHelperStartupState();
    socket.send(JSON.stringify({ type: "status", message: "Waiting for terminal size...\r\n" }));

    socket.on("message", (raw) => {
      const message = parseMessage<ClientMessage>(raw.toString());
      if (!message) {
        return;
      }

      if (message.type === "input") {
        if (!child) {
          return;
        }

        child.write(message.data || "");
        return;
      }

      if (message.type === "resize") {
        const dimensions = normalizeTerminalDimensions(message);
        if (!dimensions) {
          return;
        }

        if (!child) {
          const initialDimensions = acceptInitialResize(startup, dimensions);
          if (initialDimensions) {
            connectedSocket.send(JSON.stringify({ type: "status", message: `Starting ${agentCommand}...\r\n` }));
            startPty(connectedSocket, initialDimensions);
          }
          return;
        }

        child.resize(dimensions.cols, dimensions.rows);
      }
    });

    socket.on("close", () => {
      child?.kill();
      child = null;
      socket = null;
    });
  });

  process.on("exit", () => child?.kill());
  process.on("SIGTERM", () => {
    child?.kill();
    server.close();
    process.exit(0);
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  writeControl({ type: "error", message: `Failed to start helper: ${message}` });
  process.exit(1);
}

function startPty(activeSocket: WebSocket, dimensions: TerminalDimensions): void {
  if (child) {
    return;
  }

  try {
    if (!pty) {
      throw new Error("node-pty did not load.");
    }

    const launch = buildAgentLaunch(cwd, agentCommand);
    child = pty.spawn(launch.shell, launch.args, {
      ...launch.options,
      cols: dimensions.cols,
      rows: dimensions.rows,
    });

    child.onData((data) => {
      if (activeSocket.readyState === activeSocket.OPEN) {
        activeSocket.send(JSON.stringify({ type: "output", data }));
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (activeSocket.readyState === activeSocket.OPEN) {
      activeSocket.send(JSON.stringify({ type: "error", message: `Failed to start ${agentCommand}: ${message}` }));
    }
    process.exit(1);
  }
}

function writeControl(message: object): void {
  process.stdout.write(encodeMessage(message));
}
