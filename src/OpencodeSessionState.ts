export type OpencodeSessionPhase =
  | "idle"
  | "helper-starting"
  | "helper-ready"
  | "failed"
  | "closed";

export interface OpencodeSessionSnapshot {
  detail: string;
  phase: OpencodeSessionPhase;
  port: number | null;
}

export type OpencodeSessionListener = (snapshot: OpencodeSessionSnapshot) => void;

export class OpencodeSessionState {
  private listeners = new Set<OpencodeSessionListener>();
  private snapshot: OpencodeSessionSnapshot = {
    detail: "Preparing opencode session.",
    phase: "idle",
    port: null,
  };

  close(detail = "Opencode session closed."): void {
    this.setSnapshot({
      ...this.snapshot,
      detail,
      phase: "closed",
      port: null,
    });
  }

  fail(detail: string): void {
    this.setSnapshot({
      ...this.snapshot,
      detail,
      phase: "failed",
      port: null,
    });
  }

  getSnapshot(): OpencodeSessionSnapshot {
    return this.snapshot;
  }

  helperReady(port: number): void {
    this.setSnapshot({
      ...this.snapshot,
      detail: `Helper listening on 127.0.0.1:${port}.`,
      phase: "helper-ready",
      port,
    });
  }

  helperStarting(): void {
    this.setSnapshot({
      ...this.snapshot,
      detail: "Prewarming opencode helper.",
      phase: "helper-starting",
      port: null,
    });
  }

  subscribe(listener: OpencodeSessionListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private setSnapshot(snapshot: OpencodeSessionSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
