import { EventEmitter } from "events";

interface WritableLike extends EventEmitter {
  write(chunk: string): boolean;
}

export class QueuedWriter {
  private closed = false;
  private queue: string[] = [];
  private waitingForDrain = false;

  constructor(private readonly stream: WritableLike) {
    this.stream.once("error", () => {
      this.closed = true;
      this.queue = [];
    });
  }

  write(chunk: string): void {
    if (this.closed) {
      return;
    }

    this.queue.push(chunk);
    this.flush();
  }

  private flush(): void {
    if (this.closed || this.waitingForDrain) {
      return;
    }

    while (this.queue.length > 0) {
      const chunk = this.queue.shift();
      if (chunk === undefined) {
        return;
      }

      const canContinue = this.stream.write(chunk);
      if (!canContinue) {
        this.waitingForDrain = true;
        this.stream.once("drain", () => {
          this.waitingForDrain = false;
          this.flush();
        });
        return;
      }
    }
  }
}
