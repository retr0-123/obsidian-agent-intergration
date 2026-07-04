import { describe, expect, it } from "vitest";
import {
  canFitTerminalElement,
  chooseTerminalDimensions,
  estimateTerminalDimensions,
  normalizeTerminalDimensions,
  writeTerminalAndScheduleFit,
} from "./terminalLayout";

function elementLike(width: number, height: number, connected = true): HTMLElement {
  return {
    isConnected: connected,
    offsetHeight: height,
    offsetWidth: width,
  } as HTMLElement;
}

describe("terminal layout", () => {
  it("does not fit detached or zero-sized elements", () => {
    expect(canFitTerminalElement(elementLike(80, 24, false))).toBe(false);
    expect(canFitTerminalElement(elementLike(0, 24))).toBe(false);
    expect(canFitTerminalElement(elementLike(80, 0))).toBe(false);
  });

  it("fits visible positive-sized elements", () => {
    expect(canFitTerminalElement(elementLike(80, 24))).toBe(true);
  });

  it("normalizes dimensions to positive integer terminal sizes", () => {
    expect(normalizeTerminalDimensions({ cols: 80.9, rows: 24.2 })).toEqual({ cols: 80, rows: 24 });
  });

  it("rejects invalid dimensions", () => {
    expect(normalizeTerminalDimensions(undefined)).toBeNull();
    expect(normalizeTerminalDimensions({ cols: 0, rows: 24 })).toBeNull();
    expect(normalizeTerminalDimensions({ cols: 80, rows: Number.NaN })).toBeNull();
  });

  it("uses only terminal-reported dimensions for resize messages", () => {
    expect(chooseTerminalDimensions(undefined, undefined)).toBeNull();
    expect(chooseTerminalDimensions({ cols: 80.8, rows: 24.2 }, undefined)).toEqual({ cols: 80, rows: 24 });
    expect(chooseTerminalDimensions({ cols: 80, rows: 24 }, { cols: 100.9, rows: 30.1 })).toEqual({
      cols: 100,
      rows: 30,
    });
  });

  it("estimates terminal dimensions from visible element pixels", () => {
    expect(estimateTerminalDimensions(elementLike(900, 360))).toEqual({
      cols: 100,
      rows: 20,
    });
    expect(estimateTerminalDimensions(elementLike(0, 360))).toBeNull();
  });

  it("schedules fitting only after terminal output has been written", () => {
    let writeCallback: (() => void) | undefined;
    const writes: string[] = [];
    let fitCount = 0;

    const terminal = {
      write(data: string, callback?: () => void) {
        writes.push(data);
        writeCallback = callback;
      },
    };

    writeTerminalAndScheduleFit(terminal, "agent output", () => {
      fitCount += 1;
    });

    expect(writes).toEqual(["agent output"]);
    expect(fitCount).toBe(0);

    writeCallback?.();

    expect(fitCount).toBe(1);
  });

  it("ignores output when no terminal is available", () => {
    let fitCount = 0;

    writeTerminalAndScheduleFit(null, "agent output", () => {
      fitCount += 1;
    });

    expect(fitCount).toBe(0);
  });
});
