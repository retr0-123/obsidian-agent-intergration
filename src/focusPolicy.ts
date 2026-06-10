export type TerminalFocusCause = "socket-open" | "fit" | "user-pointer";

export function shouldFocusTerminal(cause: TerminalFocusCause): boolean {
  return cause === "user-pointer";
}
