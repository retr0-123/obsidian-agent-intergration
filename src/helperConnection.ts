export interface HelperConnectionChild {
  kill(signal?: NodeJS.Signals): unknown;
}

export interface HelperConnectionSocket {
  close(): void;
}

export interface HelperConnectionState<TSocket extends HelperConnectionSocket, TChild extends HelperConnectionChild> {
  child: TChild | null;
  socket: TSocket | null;
}

export type TerminateHelperChild<TChild extends HelperConnectionChild> = (child: TChild) => void;

export function createHelperConnectionState<
  TSocket extends HelperConnectionSocket,
  TChild extends HelperConnectionChild,
>(): HelperConnectionState<TSocket, TChild> {
  return {
    child: null,
    socket: null,
  };
}

export function replaceHelperSocket<TSocket extends HelperConnectionSocket, TChild extends HelperConnectionChild>(
  state: HelperConnectionState<TSocket, TChild>,
  nextSocket: TSocket,
  terminateChild: TerminateHelperChild<TChild> = defaultTerminateChild,
): void {
  if (state.socket === nextSocket) {
    return;
  }

  if (state.child) {
    terminateChild(state.child);
  }
  state.child = null;
  state.socket?.close();
  state.socket = nextSocket;
}

export function closeHelperSocket<TSocket extends HelperConnectionSocket, TChild extends HelperConnectionChild>(
  state: HelperConnectionState<TSocket, TChild>,
  closedSocket: TSocket,
  terminateChild: TerminateHelperChild<TChild> = defaultTerminateChild,
): boolean {
  if (state.socket !== closedSocket) {
    return false;
  }

  if (state.child) {
    terminateChild(state.child);
  }
  state.child = null;
  state.socket = null;
  return true;
}

export function isHelperSocketActive<TSocket extends HelperConnectionSocket, TChild extends HelperConnectionChild>(
  state: HelperConnectionState<TSocket, TChild>,
  socket: TSocket,
): boolean {
  return state.socket === socket;
}

function defaultTerminateChild<TChild extends HelperConnectionChild>(child: TChild): void {
  child.kill();
}
