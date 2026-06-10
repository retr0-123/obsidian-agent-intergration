import { describe, expect, it } from "vitest";
import {
  canFitTerminalElement,
  normalizeTerminalDimensions,
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
});
