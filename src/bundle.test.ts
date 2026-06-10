import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("node-pty runtime packaging", () => {
  it("does not load node-pty from the Obsidian renderer bundle", () => {
    const bundle = readFileSync("main.js", "utf8");

    expect(bundle).not.toContain('require("node-pty")');
    expect(bundle).not.toContain("loadNativeModule");
  });

  it("loads node-pty only from the helper process bundle", () => {
    const helper = readFileSync("helper.js", "utf8");

    expect(helper).toContain("require(nodePtyPath)");
    expect(helper).toContain('require("ws")');
    expect(helper).not.toContain("node_modules/node-pty/lib/utils.js");
  });

  it("keeps the Windows node-pty prebuild available in node_modules", () => {
    expect(existsSync("node_modules/node-pty/prebuilds/win32-x64/conpty.node")).toBe(true);
  });
});
