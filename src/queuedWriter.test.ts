import { EventEmitter } from "events";
import { describe, expect, it } from "vitest";
import { QueuedWriter } from "./queuedWriter";

class FakeWritable extends EventEmitter {
  public chunks: string[] = [];
  public blockNextWrite = false;

  write(chunk: string): boolean {
    this.chunks.push(chunk);

    if (this.blockNextWrite) {
      this.blockNextWrite = false;
      return false;
    }

    return true;
  }
}

describe("QueuedWriter", () => {
  it("writes chunks in order", () => {
    const stream = new FakeWritable();
    const writer = new QueuedWriter(stream);

    writer.write("a");
    writer.write("b");

    expect(stream.chunks).toEqual(["a", "b"]);
  });

  it("waits for drain when the stream applies backpressure", () => {
    const stream = new FakeWritable();
    const writer = new QueuedWriter(stream);
    stream.blockNextWrite = true;

    writer.write("a");
    writer.write("b");

    expect(stream.chunks).toEqual(["a"]);

    stream.emit("drain");

    expect(stream.chunks).toEqual(["a", "b"]);
  });

  it("drops later chunks after the stream errors", () => {
    const stream = new FakeWritable();
    const writer = new QueuedWriter(stream);

    stream.emit("error", new Error("EPIPE"));
    writer.write("a");

    expect(stream.chunks).toEqual([]);
  });
});
