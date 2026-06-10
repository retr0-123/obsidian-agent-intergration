import { describe, expect, it } from "vitest";
import { encodeMessage, parseMessage } from "./protocol";

describe("protocol", () => {
  it("encodes newline-delimited JSON for helper stdout", () => {
    expect(encodeMessage({ type: "ready", port: 1234 })).toBe("{\"type\":\"ready\",\"port\":1234}\n");
  });

  it("returns null for malformed messages", () => {
    expect(parseMessage("{bad")).toBeNull();
  });

  it("parses status messages", () => {
    expect(parseMessage("{\"type\":\"status\",\"message\":\"Starting\"}")).toEqual({
      type: "status",
      message: "Starting",
    });
  });
});
