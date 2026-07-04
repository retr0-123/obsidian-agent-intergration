import { describe, expect, it } from "vitest";
import { closeHelperSocket, createHelperConnectionState, isHelperSocketActive, replaceHelperSocket } from "./helperConnection";

class TestSocket {
  closeCount = 0;

  close(): void {
    this.closeCount += 1;
  }
}

class TestChild {
  killCount = 0;

  kill(): void {
    this.killCount += 1;
  }
}

describe("helper connection lifecycle", () => {
  it("replaces a stale socket without letting its close event tear down the new session", () => {
    const state = createHelperConnectionState<TestSocket, TestChild>();
    const oldSocket = new TestSocket();
    const newSocket = new TestSocket();
    const oldChild = new TestChild();
    const newChild = new TestChild();
    const terminatedChildren: TestChild[] = [];
    const terminateChild = (child: TestChild) => {
      terminatedChildren.push(child);
      child.kill();
    };

    replaceHelperSocket(state, oldSocket);
    state.child = oldChild;

    replaceHelperSocket(state, newSocket, terminateChild);

    expect(oldSocket.closeCount).toBe(1);
    expect(oldChild.killCount).toBe(1);
    expect(terminatedChildren).toEqual([oldChild]);
    expect(state).toMatchObject({
      child: null,
      socket: newSocket,
    });

    state.child = newChild;

    expect(closeHelperSocket(state, oldSocket)).toBe(false);
    expect(isHelperSocketActive(state, oldSocket)).toBe(false);
    expect(isHelperSocketActive(state, newSocket)).toBe(true);
    expect(newChild.killCount).toBe(0);
    expect(state.socket).toBe(newSocket);

    expect(closeHelperSocket(state, newSocket, terminateChild)).toBe(true);
    expect(newChild.killCount).toBe(1);
    expect(terminatedChildren).toEqual([oldChild, newChild]);
    expect(state).toMatchObject({
      child: null,
      socket: null,
    });
  });
});
