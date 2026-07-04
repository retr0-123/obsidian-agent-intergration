import { WebSocket, WebSocketServer } from "ws";
import { closeHelperSocket, createHelperConnectionState, isHelperSocketActive, replaceHelperSocket } from "./helperConnection";
import { terminatePtyProcess } from "./helperProcess";
import { acceptInitialResize, createHelperStartupState } from "./helperStartup";
import { buildAgentLaunch } from "./platform";
import { ClientMessage, encodeMessage, parseMessage } from "./protocol";
import { TerminalDimensions, normalizeTerminalDimensions } from "./terminalLayout";

interface PtyProcess {
  kill(signal?: NodeJS.Signals): void;
  onData(callback: (data: string) => void): void;
  pid: number;
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

const connection = createHelperConnectionState<WebSocket, PtyProcess>();
let pty: NodePty | null = null;

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
    replaceHelperSocket(connection, connectedSocket, terminatePtyProcess);
    const startup = createHelperStartupState();
    connectedSocket.send(JSON.stringify({ type: "status", message: "Waiting for terminal size...\r\n" }));

    connectedSocket.on("message", (raw) => {
      if (!isHelperSocketActive(connection, connectedSocket)) {
        return;
      }

      const message = parseMessage<ClientMessage>(raw.toString());
      if (!message) {
        return;
      }

      if (message.type === "input") {
        if (!connection.child) {
          return;
        }

        connection.child.write(message.data || "");
        return;
      }

      if (message.type === "terminate") {
        if (connection.child) {
          terminatePtyProcess(connection.child);
          connection.child = null;
        }
        return;
      }

      if (message.type === "resize") {
        const dimensions = normalizeTerminalDimensions(message);
        if (!dimensions) {
          return;
        }

        if (!connection.child) {
          const initialDimensions = acceptInitialResize(startup, dimensions);
          if (initialDimensions) {
            connectedSocket.send(JSON.stringify({ type: "status", message: `Starting ${agentCommand}...\r\n` }));
            startPty(connectedSocket, initialDimensions);
          }
          return;
        }

        connection.child.resize(dimensions.cols, dimensions.rows);
      }
    });

    connectedSocket.on("close", () => {
      closeHelperSocket(connection, connectedSocket, terminatePtyProcess);
    });
  });

  process.on("exit", () => {
    if (connection.child) {
      terminatePtyProcess(connection.child);
    }
  });
  process.on("SIGTERM", () => {
    if (connection.child) {
      terminatePtyProcess(connection.child);
      connection.child = null;
    }
    server.close();
    process.exit(0);
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  writeControl({ type: "error", message: `Failed to start helper: ${message}` });
  process.exit(1);
}

function startPty(activeSocket: WebSocket, dimensions: TerminalDimensions): void {
  if (connection.child || !isHelperSocketActive(connection, activeSocket)) {
    return;
  }

  try {
    if (!pty) {
      throw new Error("node-pty did not load.");
    }

    const launch = buildAgentLaunch(cwd, agentCommand);
    connection.child = pty.spawn(launch.shell, launch.args, {
      ...launch.options,
      cols: dimensions.cols,
      rows: dimensions.rows,
    });

    connection.child.onData((data) => {
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
