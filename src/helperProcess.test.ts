import { describe, expect, it } from "vitest";
import { terminatePtyProcess } from "./helperProcess";

class TestPty {
  killedWith: Array<NodeJS.Signals | undefined> = [];

  constructor(readonly pid: number) {}

  kill(signal?: NodeJS.Signals): void {
    this.killedWith.push(signal);
  }
}

describe("helper process cleanup", () => {
  it("uses taskkill to terminate the Windows process tree", () => {
    const child = new TestPty(1234);
    const taskkillPids: number[] = [];

    terminatePtyProcess(child, "win32", (pid) => {
      taskkillPids.push(pid);
    });

    expect(taskkillPids).toEqual([1234]);
    expect(child.killedWith).toEqual([]);
  });

  it("falls back to node-pty kill when Windows taskkill fails", () => {
    const child = new TestPty(1234);

    terminatePtyProcess(child, "win32", () => {
      throw new Error("taskkill missing");
    });

    expect(child.killedWith).toEqual([undefined]);
  });

  it("signals the Unix process group before killing the PTY", () => {
    const child = new TestPty(1234);
    const processGroups: Array<{ pid: number; signal: NodeJS.Signals }> = [];

    terminatePtyProcess(child, "linux", undefined, (pid, signal) => {
      processGroups.push({ pid, signal });
    });

    expect(processGroups).toEqual([{ pid: 1234, signal: "SIGHUP" }]);
    expect(child.killedWith).toEqual(["SIGHUP"]);
  });
});
