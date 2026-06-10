import { TerminalDimensions, normalizeTerminalDimensions } from "./terminalLayout";

export interface HelperStartupState {
  dimensions: TerminalDimensions | null;
  started: boolean;
}

export function createHelperStartupState(): HelperStartupState {
  return {
    dimensions: null,
    started: false,
  };
}

export function acceptInitialResize(
  state: HelperStartupState,
  dimensions: TerminalDimensions | undefined,
): TerminalDimensions | null {
  if (state.started) {
    return null;
  }

  const normalized = normalizeTerminalDimensions(dimensions);
  if (!normalized) {
    return null;
  }

  state.dimensions = normalized;
  state.started = true;
  return normalized;
}
