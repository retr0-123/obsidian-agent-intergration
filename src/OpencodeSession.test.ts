import { describe, expect, it } from "vitest";
import { OpencodeSessionState } from "./OpencodeSessionState";

describe("OpencodeSessionState", () => {
  it("stores helper readiness without replaying terminal output", () => {
    const state = new OpencodeSessionState();
    const events: string[] = [];

    state.subscribe((snapshot) => {
      events.push(snapshot.phase);
    });

    state.helperStarting();
    state.helperReady(49152);

    const snapshot = state.getSnapshot();

    expect(snapshot).toMatchObject({
      phase: "helper-ready",
      port: 49152,
    });
    expect(snapshot).not.toHaveProperty("output");
    expect(events).toEqual(["idle", "helper-starting", "helper-ready"]);
  });

  it("keeps startup failures visible for late subscribers", () => {
    const state = new OpencodeSessionState();

    state.fail("node.exe is missing");

    const replayed: string[] = [];
    state.subscribe((snapshot) => {
      replayed.push(`${snapshot.phase}:${snapshot.detail}`);
    });

    expect(replayed).toEqual(["failed:node.exe is missing"]);
  });
});
