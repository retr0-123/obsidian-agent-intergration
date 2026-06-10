export type OpenLocation = "left" | "right" | "split" | "tab";

export interface OpencodeSettings {
  agentCommand: string;
  agentName: string;
  openLocation: OpenLocation;
}

export const DEFAULT_SETTINGS: OpencodeSettings = {
  agentCommand: "opencode.cmd",
  agentName: "opencode",
  openLocation: "right",
};

const OPEN_LOCATIONS: ReadonlySet<string> = new Set(["left", "right", "split", "tab"]);

export function normalizeOpenLocation(value: unknown): OpenLocation {
  return typeof value === "string" && OPEN_LOCATIONS.has(value)
    ? value as OpenLocation
    : DEFAULT_SETTINGS.openLocation;
}

export function normalizeNonEmptyString(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeSettings(data: unknown): OpencodeSettings {
  const saved = typeof data === "object" && data !== null
    ? data as Partial<OpencodeSettings>
    : {};

  return {
    agentCommand: normalizeNonEmptyString(saved.agentCommand, DEFAULT_SETTINGS.agentCommand),
    agentName: normalizeNonEmptyString(saved.agentName, DEFAULT_SETTINGS.agentName),
    openLocation: normalizeOpenLocation(saved.openLocation),
  };
}
