import { describe, expect, it } from "vitest";
import { initialStartupStatus, reduceStartupStatus } from "./startupStatus";

describe("startup status", () => {
  it("keeps startup progress visible until terminal output arrives", () => {
    let status = initialStartupStatus();

    status = reduceStartupStatus(status, { type: "helper-starting" });
    expect(status.visible).toBe(true);
    expect(status.detail).toBe("Preparing the background agent session.");

    status = reduceStartupStatus(status, { type: "helper-ready", port: 49152 });
    expect(status.visible).toBe(true);
    expect(status.detail).toBe("Helper listening on 127.0.0.1:49152.");

    status = reduceStartupStatus(status, { type: "socket-open" });
    expect(status.visible).toBe(true);
    expect(status.detail).toBe("Connected to helper. Waiting for agent output.");

    status = reduceStartupStatus(status, { type: "output" });
    expect(status.visible).toBe(false);
  });

  it("shows connection failures outside the terminal surface", () => {
    const status = reduceStartupStatus(initialStartupStatus(), { type: "socket-error" });

    expect(status.visible).toBe(true);
    expect(status.title).toBe("Connection failed");
    expect(status.detail).toBe("The helper socket could not be reached.");
  });
});
