export interface StartupStatus {
  detail: string;
  title: string;
  visible: boolean;
}

export type StartupEvent =
  | { type: "helper-starting" }
  | { type: "helper-ready"; port: number }
  | { type: "socket-open" }
  | { type: "socket-error" }
  | { type: "socket-close" }
  | { message?: string; type: "pty-status" }
  | { type: "output" }
  | { message: string; type: "error" };

export function reduceStartupStatus(status: StartupStatus, event: StartupEvent): StartupStatus {
  if (event.type === "output") {
    return {
      ...status,
      visible: false,
    };
  }

  if (event.type === "helper-starting") {
    return {
      detail: "Preparing the background agent session.",
      title: "Connecting to agent",
      visible: true,
    };
  }

  if (event.type === "helper-ready") {
    return {
      detail: `Helper listening on 127.0.0.1:${event.port}.`,
      title: "Connecting to helper",
      visible: true,
    };
  }

  if (event.type === "socket-open") {
    return {
      detail: "Connected to helper. Waiting for agent output.",
      title: "Waiting for agent",
      visible: true,
    };
  }

  if (event.type === "pty-status") {
    return {
      detail: event.message || "The terminal process is starting.",
      title: "Waiting for agent",
      visible: true,
    };
  }

  if (event.type === "socket-error") {
    return {
      detail: "The helper socket could not be reached.",
      title: "Connection failed",
      visible: true,
    };
  }

  if (event.type === "socket-close") {
    return {
      detail: "The helper connection closed before opencode produced output.",
      title: "Connection closed",
      visible: true,
    };
  }

  return {
    detail: event.message,
    title: "Failed to start agent",
    visible: true,
  };
}

export function initialStartupStatus(): StartupStatus {
  return {
    detail: "Attaching to the background agent session.",
    title: "Connecting to agent",
    visible: true,
  };
}
