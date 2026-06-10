import { describe, expect, it } from "vitest";
import { shouldFocusTerminal } from "./focusPolicy";

describe("terminal focus policy", () => {
  it("does not steal focus during connection or layout updates", () => {
    expect(shouldFocusTerminal("socket-open")).toBe(false);
    expect(shouldFocusTerminal("fit")).toBe(false);
  });

  it("focuses the terminal only after direct user pointer input", () => {
    expect(shouldFocusTerminal("user-pointer")).toBe(true);
  });
});
