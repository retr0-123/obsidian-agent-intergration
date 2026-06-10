import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  normalizeOpenLocation,
  normalizeSettings,
} from "./settings";

describe("settings", () => {
  it("defaults to opening on the right", () => {
    expect(DEFAULT_SETTINGS.openLocation).toBe("right");
  });

  it("normalizes unknown open locations to right", () => {
    expect(normalizeOpenLocation("bad")).toBe("right");
  });

  it("preserves supported open locations", () => {
    expect(normalizeOpenLocation("tab")).toBe("tab");
    expect(normalizeOpenLocation("split")).toBe("split");
    expect(normalizeOpenLocation("left")).toBe("left");
    expect(normalizeOpenLocation("right")).toBe("right");
  });

  it("normalizes partial saved settings", () => {
    expect(normalizeSettings({ openLocation: "left" })).toEqual({
      ...DEFAULT_SETTINGS,
      openLocation: "left",
    });
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("normalizes agent settings", () => {
    expect(normalizeSettings({
      agentCommand: " codex ",
      agentName: " Codex ",
      openLocation: "right",
    })).toEqual({
      ...DEFAULT_SETTINGS,
      agentCommand: "codex",
      agentName: "Codex",
      openLocation: "right",
    });
  });

  it("falls back to opencode when agent settings are empty", () => {
    expect(normalizeSettings({
      agentCommand: " ",
      agentName: "",
    })).toEqual(DEFAULT_SETTINGS);
  });
});
