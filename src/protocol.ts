export interface HelperReadyMessage {
  port: number;
  type: "ready";
}

export interface HelperErrorMessage {
  message: string;
  type: "error";
}

export interface InputMessage {
  data?: string;
  type: "input";
}

export interface OutputMessage {
  data: string;
  type: "output";
}

export interface StatusMessage {
  message: string;
  type: "status";
}

export interface ResizeMessage {
  cols: number;
  rows: number;
  type: "resize";
}

export interface TerminateMessage {
  type: "terminate";
}

export type ClientMessage = InputMessage | ResizeMessage | TerminateMessage;
export type HelperStdoutMessage = HelperReadyMessage | HelperErrorMessage;
export type ServerMessage = HelperErrorMessage | OutputMessage | StatusMessage;

export function encodeMessage(message: object): string {
  return `${JSON.stringify(message)}\n`;
}

export function parseMessage<T>(message: string): T | null {
  try {
    return JSON.parse(message) as T;
  } catch {
    return null;
  }
}
