import { describe, expect, it } from "vitest";
import { acceptInitialResize, createHelperStartupState } from "./helperStartup";

describe("helper startup sizing", () => {
  it("waits for the first valid terminal size before starting the pty", () => {
    const state = createHelperStartupState();

    expect(acceptInitialResize(state, undefined)).toBeNull();
    expect(acceptInitialResize(state, { cols: 0, rows: 24 })).toBeNull();
    expect(state.started).toBe(false);

    expect(acceptInitialResize(state, { cols: 132.8, rows: 37.2 })).toEqual({
      cols: 132,
      rows: 37,
    });
    expect(state).toEqual({
      dimensions: { cols: 132, rows: 37 },
      started: true,
    });
  });

  it("ignores later startup attempts after the pty has started", () => {
    const state = createHelperStartupState();

    expect(acceptInitialResize(state, { cols: 120, rows: 30 })).toEqual({
      cols: 120,
      rows: 30,
    });
    expect(acceptInitialResize(state, { cols: 140, rows: 40 })).toBeNull();
    expect(state.dimensions).toEqual({ cols: 120, rows: 30 });
  });
});
