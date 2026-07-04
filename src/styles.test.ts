import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("terminal styles", () => {
  it("does not override xterm textarea cursor positioning", () => {
    const styles = readFileSync("src/styles.css", "utf8");

    expect(styles).not.toMatch(/\.xterm-helper-textarea[\s\S]*?\bleft\s*:\s*0\b/);
    expect(styles).not.toMatch(/\.xterm-helper-textarea[\s\S]*?\btop\s*:\s*0\b/);
  });

  it("does not override xterm screen width", () => {
    const styles = readFileSync("src/styles.css", "utf8");

    expect(styles).not.toMatch(/\.xterm-screen[\s\S]*?\bwidth\s*:\s*100%/);
  });
});
